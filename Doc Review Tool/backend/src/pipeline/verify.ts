import { callLLM, parseJSONResponse, MODELS } from '../services/llm';
import { verifyQuote } from '../utils/fuzzy-match';
import type { Issue, QuoteVerificationStatus, LLMResponse } from '@shared/types';
import type { RawAnalysisResult } from './analyze';

export interface VerifiedAnalysisResult {
  issues: Issue[];
  regulatoryFlags: RawAnalysisResult['regulatoryFlags'];
  assumptions: RawAnalysisResult['assumptions'];
  verificationStats: {
    total: number;
    verified: number;
    review: number;
    rejected: number;
    hallucinated: number;
  };
}

interface VerifyParams {
  rawResult: RawAnalysisResult;
  documentText: string;
  userRole: string;
}

/**
 * Stage 4: Review and verify the analysis output.
 *
 * Two-step process:
 * 1. Algorithmic quote verification (3-tier: VERIFIED/REVIEW/REJECTED)
 * 2. LLM review for REVIEW-tier quotes and hallucination detection (Sonnet 4.6)
 *
 * If >2 issues are flagged as hallucinated, returns a signal to retry Stage 3.
 */
export async function verifyAnalysis(
  params: VerifyParams,
): Promise<{
  result: VerifiedAnalysisResult;
  shouldRetry: boolean;
  response?: LLMResponse;
}> {
  const { rawResult, documentText } = params;

  // Step 1: Algorithmic quote verification
  const issuesWithVerification = rawResult.issues.map((issue) => {
    const quote = issue.targetRef?.quote || '';
    const verification = verifyQuote(quote, documentText);
    return {
      ...issue,
      verificationStatus: verification.status,
      verificationScore: verification.score,
      verificationDetails: verification.matchDetails,
    };
  });

  // Count results
  const stats = {
    total: issuesWithVerification.length,
    verified: issuesWithVerification.filter((i) => i.verificationStatus === 'verified').length,
    review: issuesWithVerification.filter((i) => i.verificationStatus === 'review').length,
    rejected: issuesWithVerification.filter((i) => i.verificationStatus === 'rejected').length,
    hallucinated: 0,
  };

  // Step 2: LLM review for REVIEW-tier and REJECTED quotes
  const needsLLMReview = issuesWithVerification.filter(
    (i) => i.verificationStatus === 'review' || i.verificationStatus === 'rejected',
  );

  let llmResponse: LLMResponse | undefined;

  if (needsLLMReview.length > 0) {
    const reviewResult = await llmReviewIssues(needsLLMReview, documentText);
    llmResponse = reviewResult.response;

    // Apply LLM verdicts
    for (const verdict of reviewResult.verdicts) {
      const issue = issuesWithVerification.find((i) => i.id === verdict.issueId);
      if (!issue) continue;

      if (verdict.isHallucinated) {
        stats.hallucinated++;
        issue.verificationStatus = 'rejected';
      } else if (verdict.correctedQuote) {
        // LLM found the actual quote — re-verify
        const recheck = verifyQuote(verdict.correctedQuote, documentText);
        issue.verificationStatus = recheck.status;
        if (recheck.status === 'verified') {
          issue.targetRef = {
            ...issue.targetRef,
            quote: verdict.correctedQuote,
            locator: verdict.correctedLocator || issue.targetRef.locator,
          };
          stats.review--;
          stats.verified++;
        }
      } else if (verdict.isValid) {
        // LLM confirmed the issue is valid even though quote matching was weak
        issue.verificationStatus = 'review'; // Keep as review, not verified
      }
    }
  }

  // Filter out hallucinated issues
  const validIssues = issuesWithVerification
    .filter((i) => i.verificationStatus !== 'rejected' || !isHallucinated(i))
    .map((i) => ({
      ...i,
      // Clean up internal fields, keep verificationStatus on the Issue
      verificationScore: undefined,
      verificationDetails: undefined,
    })) as Issue[];

  // Should retry Stage 3 if too many hallucinations
  const shouldRetry = stats.hallucinated > 2;

  return {
    result: {
      issues: validIssues,
      regulatoryFlags: rawResult.regulatoryFlags,
      assumptions: rawResult.assumptions,
      verificationStats: stats,
    },
    shouldRetry,
    response: llmResponse,
  };
}

function isHallucinated(issue: {
  verificationStatus: QuoteVerificationStatus;
  verificationScore?: number;
}): boolean {
  return issue.verificationStatus === 'rejected' && (issue.verificationScore ?? 0) < 0.3;
}

interface LLMVerdict {
  issueId: string;
  isHallucinated: boolean;
  isValid: boolean;
  correctedQuote?: string;
  correctedLocator?: string;
  reason: string;
}

async function llmReviewIssues(
  issues: Array<Issue & { verificationStatus: QuoteVerificationStatus }>,
  documentText: string,
): Promise<{ verdicts: LLMVerdict[]; response: LLMResponse }> {
  const systemPrompt = `You are a legal document verification assistant. Your job is to check whether quoted text actually appears in the source document, and whether the issues described are genuine.

For each issue, determine:
1. Does the quoted text (or something very close) actually appear in the document?
2. Is the issue itself a genuine concern, or was it fabricated/hallucinated?

If the quote is wrong but the issue is real, try to find the correct quote from the document.

Respond with valid JSON:

{
  "verdicts": [
    {
      "issueId": "issue-001",
      "isHallucinated": false,
      "isValid": true,
      "correctedQuote": "the actual text from the document if different",
      "correctedLocator": "Section X.X",
      "reason": "Brief explanation"
    }
  ]
}`;

  // Build a concise review request
  const issueDescriptions = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    claimedQuote: issue.targetRef?.quote || 'No quote provided',
    claimedLocator: issue.targetRef?.locator || 'Not specified',
    summary: issue.summary,
  }));

  // Include enough document text for verification (cap at 100K chars)
  const docExcerpt = documentText.length > 100_000
    ? documentText.substring(0, 100_000) + '\n[Document truncated]'
    : documentText;

  const userMessage = `Review these ${issues.length} issues for accuracy. Check each claimed quote against the document.

ISSUES TO VERIFY:
${JSON.stringify(issueDescriptions, null, 2)}

--- SOURCE DOCUMENT ---
${docExcerpt}
---

Return your verdicts as JSON.`;

  const response = await callLLM({
    provider: 'anthropic',
    model: MODELS.SONNET,
    systemPrompt,
    userMessage,
    temperature: 0.0,
    maxTokens: 4096,
    cacheSystemPrompt: true,
    responseFormat: 'json_object',
  });

  const parsed = parseJSONResponse<{ verdicts: LLMVerdict[] }>(response.content, [
    'verdicts',
  ]);

  return {
    verdicts: parsed.verdicts || [],
    response,
  };
}
