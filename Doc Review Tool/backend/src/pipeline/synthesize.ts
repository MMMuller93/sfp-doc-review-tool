import { callLLM, parseJSONResponse, MODELS } from '../services/llm';
import type {
  AnalysisResult,
  UserRole,
  DocumentType,
  Issue,
  RegulatoryFlag,
  LLMResponse,
} from '@shared/types';
import type { VerifiedAnalysisResult } from './verify';

interface SynthesizeParams {
  verifiedResult: VerifiedAnalysisResult;
  documentName: string;
  userRole: UserRole;
  documentType: DocumentType;
  stageTimings: Record<string, number>;
  modelsUsed: string[];
}

interface SynthesisOutput {
  verdict: AnalysisResult['verdict'];
  verdictRationale: string;
  keyAction: string;
  issuePriority: string[]; // ordered issue IDs
}

/**
 * Stage 5: Synthesize the final analysis result.
 * Takes verified issues and produces verdict, prioritization, and action items.
 * Uses Sonnet 4.6 at temperature 0.1.
 */
export async function synthesizeResult(
  params: SynthesizeParams,
): Promise<{ result: AnalysisResult; response: LLMResponse }> {
  const { verifiedResult, userRole, documentType, documentName, stageTimings, modelsUsed } = params;

  // If there are no issues at all, produce a clean result without an LLM call
  if (verifiedResult.issues.length === 0) {
    return {
      result: buildEmptyResult(params),
      response: {
        content: '{}',
        usage: { inputTokens: 0, outputTokens: 0 },
        model: 'none',
        latencyMs: 0,
      },
    };
  }

  const systemPrompt = `You are a legal analysis synthesizer. Your job is to take a set of verified issues from a ${documentType} document review and produce a final verdict with prioritized action items.

You MUST respond with valid JSON:

{
  "verdict": "safe-to-sign" | "negotiate" | "high-risk" | "do-not-sign",
  "verdictRationale": "2-3 sentences explaining the verdict and its implications",
  "keyAction": "Single sentence: the most important next step for the ${userRole.toUpperCase()}",
  "issuePriority": ["issue-001", "issue-003", "issue-002"]
}

VERDICT RULES:
- safe-to-sign: No blockers, ≤2 negotiate items, predominantly standard terms
- negotiate: No blockers but 3+ negotiate items, or significant economic impact
- high-risk: 1-2 blockers that are potentially curable with negotiation
- do-not-sign: 3+ blockers, or uncurable structural issues

PRIORITY RULES:
- Order all issue IDs from most critical to least critical
- Blockers always come first
- Among negotiate items: economic impact > governance > operational
- Among standard items: material impact > informational`;

  const issuesSummary = verifiedResult.issues.map((i) => ({
    id: i.id,
    risk: i.risk,
    topic: i.topic,
    title: i.title,
    summary: i.summary,
    verificationStatus: i.verificationStatus,
  }));

  const userMessage = `Synthesize this ${documentType} analysis for a ${userRole.toUpperCase()}.

VERIFIED ISSUES (${verifiedResult.issues.length}):
${JSON.stringify(issuesSummary, null, 2)}

REGULATORY FLAGS:
${JSON.stringify(verifiedResult.regulatoryFlags, null, 2)}

VERIFICATION STATS:
- Total issues: ${verifiedResult.verificationStats.total}
- Verified quotes: ${verifiedResult.verificationStats.verified}
- Review-tier quotes: ${verifiedResult.verificationStats.review}
- Rejected/hallucinated: ${verifiedResult.verificationStats.rejected}

Return your synthesis as JSON.`;

  const response = await callLLM({
    provider: 'anthropic',
    model: MODELS.SONNET,
    systemPrompt,
    userMessage,
    temperature: 0.1,
    maxTokens: 1024,
    cacheSystemPrompt: true,
  });

  const synthesis = parseJSONResponse<SynthesisOutput>(response.content);

  // Build the final AnalysisResult
  const prioritizedIssues = prioritizeIssues(verifiedResult.issues, synthesis.issuePriority);
  const blockers = prioritizedIssues.filter((i) => i.risk === 'blocker').slice(0, 3);
  const nonBlockers = prioritizedIssues.filter((i) => i.risk !== 'blocker').slice(0, 10);

  const totalTimeMs = Object.values(stageTimings).reduce((sum, t) => sum + t, 0);

  const result: AnalysisResult = {
    verdict: synthesis.verdict,
    verdictRationale: synthesis.verdictRationale,
    protectingRole: userRole,
    keyAction: synthesis.keyAction,
    criticalIssues: blockers,
    issues: nonBlockers,
    regulatoryFlags: verifiedResult.regulatoryFlags,
    assumptions: verifiedResult.assumptions,
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      targetDocumentName: documentName,
      modelUsed: modelsUsed.join(', '),
      pipelineVersion: 'v2',
      stageTimings,
      totalTimeMs,
    },
  };

  return { result, response };
}

function prioritizeIssues(issues: Issue[], priorityOrder: string[]): Issue[] {
  if (!priorityOrder || priorityOrder.length === 0) {
    // Fallback: sort by risk level
    const riskOrder: Record<string, number> = { blocker: 0, negotiate: 1, standard: 2 };
    return [...issues].sort((a, b) => (riskOrder[a.risk] ?? 3) - (riskOrder[b.risk] ?? 3));
  }

  const orderMap = new Map(priorityOrder.map((id, idx) => [id, idx]));
  return [...issues].sort((a, b) => {
    const aOrder = orderMap.get(a.id) ?? 999;
    const bOrder = orderMap.get(b.id) ?? 999;
    return aOrder - bOrder;
  });
}

function buildEmptyResult(params: SynthesizeParams): AnalysisResult {
  const totalTimeMs = Object.values(params.stageTimings).reduce((sum, t) => sum + t, 0);

  return {
    verdict: 'safe-to-sign',
    verdictRationale: 'No significant issues were identified in this document. The terms appear standard and consistent with market practice.',
    protectingRole: params.userRole,
    keyAction: 'Document appears ready for execution. Consider a final manual review of any provisions specific to your situation.',
    criticalIssues: [],
    issues: [],
    regulatoryFlags: params.verifiedResult.regulatoryFlags,
    assumptions: params.verifiedResult.assumptions,
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      targetDocumentName: params.documentName,
      modelUsed: params.modelsUsed.join(', '),
      pipelineVersion: 'v2',
      stageTimings: params.stageTimings,
      totalTimeMs,
    },
  };
}
