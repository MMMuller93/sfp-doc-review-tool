import { callLLM, parseJSONResponse, MODELS } from '../services/llm';
import type {
  DocumentStructure,
  DocumentSection,
  DefinedTerm,
  CrossReference,
  LLMResponse,
} from '@shared/types';

const SYSTEM_PROMPT = `You are a legal document structure analyst. Your job is to extract the structural elements of a private fund legal document.

You MUST respond with valid JSON matching this exact schema:

{
  "sections": [
    {
      "id": "art-1",
      "title": "DEFINITIONS",
      "level": 1,
      "pageStart": 1,
      "pageEnd": 3,
      "content": "Brief summary of section content (1-2 sentences)"
    }
  ],
  "definedTerms": [
    {
      "term": "Capital Commitment",
      "definition": "The total amount a Limited Partner has agreed to contribute to the Partnership",
      "location": "Section 1.1"
    }
  ],
  "crossReferences": [
    {
      "from": "Section 5.2",
      "to": "Section 3.1",
      "context": "Management Fee calculation references the Investment Period definition"
    }
  ],
  "parties": ["ABC Capital Partners LLC (General Partner)", "The Fund (Partnership)"],
  "dates": [
    { "label": "Effective Date", "value": "January 1, 2026" },
    { "label": "Investment Period End", "value": "5 years from Final Close" }
  ],
  "economics": [
    { "label": "Management Fee", "value": "2% of Committed Capital during Investment Period, 1.5% thereafter" },
    { "label": "Carried Interest", "value": "20% over 8% preferred return" }
  ]
}

EXTRACTION RULES:

SECTIONS:
- Level 1 = Article/Part (e.g., "ARTICLE I", "PART A")
- Level 2 = Section (e.g., "Section 1.1", "1.1")
- Level 3 = Subsection (e.g., "(a)", "(i)")
- Only extract level 1 and 2 sections (skip subsections to keep output manageable)
- pageStart/pageEnd: estimate from position in document. If page boundaries are marked with form feeds, use those.
- content: brief summary, NOT the full text

DEFINED TERMS:
- Look for capitalized terms in quotes or bold (e.g., "Capital Commitment" means...)
- Look for definition sections (commonly Article I or Section 1)
- Include the full definition text (truncated to 200 chars if very long)
- Extract ALL defined terms — aim for completeness

CROSS-REFERENCES:
- Look for "as defined in Section X", "pursuant to Section Y", "subject to Article Z"
- Only include meaningful cross-references that affect interpretation
- Max 20 cross-references (prioritize most important)

PARTIES:
- Extract all named parties with their roles
- Include GP, LP, Fund, Administrator, Custodian if mentioned

DATES:
- Extract key dates: effective date, investment period, term, extension dates
- Include both fixed dates and formula dates (e.g., "5 years from Final Close")

ECONOMICS:
- Extract all economic terms: fees, carry, preferred return, clawback, hurdle rates
- Include specific percentages and thresholds

Return ONLY valid JSON.`;

interface ExtractStructureParams {
  documentText: string;
  pageTexts?: string[];
  totalPages?: number;
}

/**
 * Stage 2: Extract document structure using Sonnet 4.6.
 * Identifies sections, defined terms, cross-references, parties, dates, and economics.
 * Temperature 0.0 for deterministic extraction.
 */
export async function extractStructure(
  params: ExtractStructureParams,
): Promise<{ result: DocumentStructure; response: LLMResponse }> {
  const { documentText, pageTexts, totalPages } = params;

  // Add page boundary markers if we have per-page text
  let annotatedText = documentText;
  if (pageTexts && pageTexts.length > 1) {
    annotatedText = pageTexts
      .map((page, i) => `--- PAGE ${i + 1} ---\n${page}`)
      .join('\n\n');
  }

  // For very long documents, truncate with a note
  const maxChars = 150_000;
  if (annotatedText.length > maxChars) {
    annotatedText = annotatedText.substring(0, maxChars)
      + `\n\n[Document truncated at ${maxChars} characters. Total pages: ${totalPages || 'unknown'}]`;
  }

  const userMessage = `Extract the structure of this legal document. Identify all sections, defined terms, cross-references, parties, dates, and economics.

${totalPages ? `Document has ${totalPages} pages.` : ''}

--- DOCUMENT ---
${annotatedText}
---

Return your extraction as valid JSON matching the schema in your instructions.`;

  const response = await callLLM({
    provider: 'anthropic',
    model: MODELS.SONNET,
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    temperature: 0.0,
    maxTokens: 8192,
    cacheSystemPrompt: true,
  });

  const parsed = parseJSONResponse<DocumentStructure>(response.content, [
    'sections',
  ]);

  // Ensure arrays exist
  if (!Array.isArray(parsed.sections)) parsed.sections = [];
  if (!Array.isArray(parsed.definedTerms)) parsed.definedTerms = [];
  if (!Array.isArray(parsed.crossReferences)) parsed.crossReferences = [];
  if (!Array.isArray(parsed.parties)) parsed.parties = [];
  if (!Array.isArray(parsed.dates)) parsed.dates = [];
  if (!Array.isArray(parsed.economics)) parsed.economics = [];

  // Assign section IDs if missing
  parsed.sections.forEach((section, i) => {
    if (!section.id) section.id = `sec-${i + 1}`;
  });

  return { result: parsed, response };
}

/**
 * For long documents (50+ pages), extract structure in chunks
 * and merge the results. Each chunk gets its own Sonnet call.
 */
export async function extractStructureLongDocument(
  pageTexts: string[],
): Promise<{ result: DocumentStructure; responses: LLMResponse[] }> {
  const CHUNK_SIZE = 25; // pages per chunk
  const chunks: string[][] = [];

  for (let i = 0; i < pageTexts.length; i += CHUNK_SIZE) {
    chunks.push(pageTexts.slice(i, i + CHUNK_SIZE));
  }

  // Process chunks in parallel
  const chunkResults = await Promise.all(
    chunks.map((chunk, chunkIndex) =>
      extractStructure({
        documentText: chunk.join('\f'),
        pageTexts: chunk,
        totalPages: pageTexts.length,
      }).then(({ result, response }) => ({
        result: adjustPageNumbers(result, chunkIndex * CHUNK_SIZE),
        response,
      })),
    ),
  );

  // Merge all chunk results
  const merged = mergeStructures(chunkResults.map((r) => r.result));
  const responses = chunkResults.map((r) => r.response);

  return { result: merged, responses };
}

/**
 * Adjust page numbers in extracted structure based on chunk offset.
 */
function adjustPageNumbers(structure: DocumentStructure, pageOffset: number): DocumentStructure {
  return {
    ...structure,
    sections: structure.sections.map((s) => ({
      ...s,
      pageStart: s.pageStart + pageOffset,
      pageEnd: s.pageEnd + pageOffset,
    })),
  };
}

/**
 * Merge multiple DocumentStructure results from chunked extraction.
 * Deduplicates defined terms and consolidates sections.
 */
function mergeStructures(structures: DocumentStructure[]): DocumentStructure {
  const allSections: DocumentSection[] = [];
  const termMap = new Map<string, DefinedTerm>();
  const allCrossRefs: CrossReference[] = [];
  const partySet = new Set<string>();
  const dateMap = new Map<string, string>();
  const econMap = new Map<string, string>();

  for (const structure of structures) {
    // Merge sections (no dedup needed — different chunks have different sections)
    allSections.push(...structure.sections);

    // Deduplicate defined terms by term name
    for (const term of structure.definedTerms) {
      const key = term.term.toLowerCase();
      if (!termMap.has(key)) {
        termMap.set(key, term);
      }
    }

    // Accumulate cross-references
    allCrossRefs.push(...structure.crossReferences);

    // Merge parties
    for (const party of structure.parties) {
      partySet.add(party);
    }

    // Merge dates (later chunks may override with more detail)
    for (const date of structure.dates) {
      dateMap.set(date.label, date.value);
    }

    // Merge economics
    for (const econ of structure.economics) {
      econMap.set(econ.label, econ.value);
    }
  }

  // Re-assign section IDs for consistency
  allSections.forEach((section, i) => {
    section.id = `sec-${i + 1}`;
  });

  return {
    sections: allSections,
    definedTerms: Array.from(termMap.values()),
    crossReferences: allCrossRefs.slice(0, 20), // Cap at 20
    parties: Array.from(partySet),
    dates: Array.from(dateMap.entries()).map(([label, value]) => ({ label, value })),
    economics: Array.from(econMap.entries()).map(([label, value]) => ({ label, value })),
  };
}
