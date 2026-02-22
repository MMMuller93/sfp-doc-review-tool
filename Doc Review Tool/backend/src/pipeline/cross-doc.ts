import { callLLM, parseJSONResponse, MODELS } from '../services/llm';
import type {
  Conflict,
  DocumentForComparison,
  UserRole,
  LLMResponse,
} from '@shared/types';

interface CrossDocParams {
  documents: DocumentForComparison[];
  userRole: UserRole;
}

interface CrossDocResult {
  conflicts: Conflict[];
  comparisons: ComparisonPair[];
  responses: LLMResponse[];
}

interface ComparisonPair {
  doc1Name: string;
  doc2Name: string;
  conflictsFound: number;
}

/**
 * Cross-document consistency check.
 *
 * Takes a set of fund documents and compares them pair-wise to find
 * conflicts, inconsistencies, and discrepancies. Uses Sonnet 4.6
 * at temperature 0.0 for precise, deterministic comparison.
 *
 * For N documents, produces N*(N-1)/2 comparison pairs, run in parallel.
 * Typical fund suite (4 docs) = 6 pairs.
 */
export async function checkCrossDocConsistency(
  params: CrossDocParams,
): Promise<CrossDocResult> {
  const { documents, userRole } = params;

  if (documents.length < 2) {
    return { conflicts: [], comparisons: [], responses: [] };
  }

  // Build pair-wise comparison tasks
  const pairs: Array<{ doc1: DocumentForComparison; doc2: DocumentForComparison }> = [];
  for (let i = 0; i < documents.length; i++) {
    for (let j = i + 1; j < documents.length; j++) {
      pairs.push({ doc1: documents[i], doc2: documents[j] });
    }
  }

  // Run all comparisons in parallel
  const pairResults = await Promise.all(
    pairs.map((pair) => comparePair(pair.doc1, pair.doc2, userRole)),
  );

  // Merge and deduplicate conflicts
  const allConflicts: Conflict[] = [];
  const comparisons: ComparisonPair[] = [];
  const responses: LLMResponse[] = [];
  let conflictIdCounter = 1;

  for (let i = 0; i < pairResults.length; i++) {
    const result = pairResults[i];
    const pair = pairs[i];

    // Re-assign sequential IDs across all pairs (spread-copy to avoid mutating parsed objects)
    for (const conflict of result.conflicts) {
      allConflicts.push({
        ...conflict,
        id: `conflict-${String(conflictIdCounter++).padStart(3, '0')}`,
      });
    }

    comparisons.push({
      doc1Name: pair.doc1.name,
      doc2Name: pair.doc2.name,
      conflictsFound: result.conflicts.length,
    });

    responses.push(result.response);
  }

  return { conflicts: allConflicts, comparisons, responses };
}

/**
 * Compare two documents for conflicts.
 * Truncates each document to 80K chars to stay within context limits.
 */
async function comparePair(
  doc1: DocumentForComparison,
  doc2: DocumentForComparison,
  userRole: UserRole,
): Promise<{ conflicts: Conflict[]; response: LLMResponse }> {
  const systemPrompt = buildComparisonSystemPrompt(userRole);

  const doc1Text = doc1.text.length > 80_000
    ? doc1.text.substring(0, 80_000) + '\n[Document truncated]'
    : doc1.text;

  const doc2Text = doc2.text.length > 80_000
    ? doc2.text.substring(0, 80_000) + '\n[Document truncated]'
    : doc2.text;

  const userMessage = `Compare these two documents for conflicts and inconsistencies.

--- DOCUMENT 1: ${doc1.name} ---
${doc1Text}
--- END DOCUMENT 1 ---

--- DOCUMENT 2: ${doc2.name} ---
${doc2Text}
--- END DOCUMENT 2 ---

Identify every conflict, inconsistency, or discrepancy between these two documents. Return your findings as JSON.`;

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

  const parsed = parseJSONResponse<{ conflicts: Conflict[] }>(response.content, [
    'conflicts',
  ]);

  if (!Array.isArray(parsed.conflicts)) {
    parsed.conflicts = [];
  }

  // Validate and clean conflicts
  const validConflicts = parsed.conflicts.filter(
    (c) => c.title && c.explanation && c.severity,
  );

  return { conflicts: validConflicts, response };
}

function buildComparisonSystemPrompt(userRole: UserRole): string {
  const role = userRole === 'gp'
    ? 'GP (General Partner / Fund Manager)'
    : 'LP (Limited Partner / Investor)';

  return `# CROSS-DOCUMENT CONSISTENCY CHECKER

You are a senior legal analyst checking for conflicts between two private fund documents. You are protecting the ${role}.

## WHAT TO CHECK

Compare the two documents for inconsistencies in:

1. **Economic Terms**: Management fee rates, carry percentages, preferred return, hurdle rates, fee offsets, expense allocations — any numerical or formulaic discrepancy
2. **Governance Rights**: GP removal thresholds, LPAC composition/authority, voting rights, consent thresholds — any conflict in who has what power
3. **Key Provisions**: Key person events, term/extensions, transfer restrictions, withdrawal rights — any conflict in how these operate
4. **Definitions**: Defined terms that appear in both documents but mean different things, or terms referenced but not defined
5. **Cross-References**: Document A references "Section X of Document B" — does that section actually say what Document A claims?
6. **Regulatory**: ERISA, tax, AML provisions that conflict between documents
7. **Side Letter Overrides**: If one document is a side letter, check whether its modifications are consistent with what the other document allows

## PRECEDENCE RULES

When documents conflict, note the typical precedence:
- Side letters override the LPA (for that specific LP)
- LPA is the governing document — PPM disclosures should match it
- Sub docs should be consistent with the LPA's subscription provisions
- Amendments supersede the original provisions they modify

## SEVERITY

- **blocker**: Direct contradiction on material terms (different fee rates, conflicting removal thresholds)
- **major**: Significant inconsistency that creates ambiguity (vague cross-references, undefined terms, conflicting procedures)
- **minor**: Immaterial discrepancy (formatting differences, non-substantive language variations)

## OUTPUT FORMAT

Return valid JSON:

{
  "conflicts": [
    {
      "id": "conflict-001",
      "severity": "blocker" | "major" | "minor",
      "title": "Short headline describing the conflict",
      "doc1Ref": {
        "document": "target",
        "locator": "Section X.X or Page Y",
        "quote": "Exact verbatim quote from Document 1, max 250 chars"
      },
      "doc2Ref": {
        "document": "reference",
        "locator": "Section X.X or Page Y",
        "quote": "Exact verbatim quote from Document 2, max 250 chars"
      },
      "explanation": "2-3 sentences explaining the conflict and why it matters",
      "resolution": "Recommended resolution: which document should control, or what language to align"
    }
  ]
}

RULES:
- Every conflict MUST have verbatim quotes from BOTH documents
- NEVER fabricate quotes — if you cannot find supporting text, do not include the conflict
- Focus on substantive conflicts, not formatting differences
- Maximum 15 conflicts per comparison
- If documents are consistent, return { "conflicts": [] }`;
}

/**
 * Determine the recommended comparison priority for a fund suite.
 * Returns document pairs ordered by importance for cross-doc review.
 */
export function getComparisonPriority(
  docNames: Array<{ name: string; type: string }>,
): Array<{ doc1: string; doc2: string; priority: 'high' | 'medium' | 'low' }> {
  const priorities: Array<{ doc1: string; doc2: string; priority: 'high' | 'medium' | 'low' }> = [];

  // High priority: LPA vs everything
  // Medium priority: Side letter vs sub-doc, PPM vs LPA
  // Low priority: Sub-doc vs PPM, etc.
  const HIGH_PAIRS = new Set(['lpa-ppm', 'lpa-side-letter', 'lpa-sub-doc', 'lpa-co-invest']);
  const MEDIUM_PAIRS = new Set(['side-letter-sub-doc', 'ppm-side-letter', 'lpa-amendment']);

  for (let i = 0; i < docNames.length; i++) {
    for (let j = i + 1; j < docNames.length; j++) {
      const types = [docNames[i].type, docNames[j].type].sort();
      const pairKey = `${types[0]}-${types[1]}`;

      let priority: 'high' | 'medium' | 'low' = 'low';
      if (HIGH_PAIRS.has(pairKey)) priority = 'high';
      else if (MEDIUM_PAIRS.has(pairKey)) priority = 'medium';

      priorities.push({
        doc1: docNames[i].name,
        doc2: docNames[j].name,
        priority,
      });
    }
  }

  // Sort by priority
  const order = { high: 0, medium: 1, low: 2 };
  return priorities.sort((a, b) => order[a.priority] - order[b.priority]);
}
