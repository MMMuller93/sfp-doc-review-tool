import { callLLM, parseJSONResponse, MODELS } from '../services/llm';
import type { PreflightResult, UserRole, DocumentType } from '@shared/types';

const SYSTEM_PROMPT = `You are a document classifier for private fund legal documents. Your job is to quickly identify the document type, likely user perspective, and complexity.

You MUST respond with valid JSON matching this exact schema:

{
  "inferredRole": "gp" | "lp",
  "confidence": "high" | "medium" | "low",
  "documentType": "side-letter" | "lpa" | "sub-doc" | "co-invest" | "ppm" | "amendment" | "fund-notice" | "capital-call" | "consent" | "advisory-materials" | "distribution-notice" | "other",
  "directionality": "incoming" | "outgoing" | "unknown",
  "rationale": "One sentence explaining your classification",
  "complexity": "simple" | "moderate" | "complex"
}

CLASSIFICATION RULES:

Document Type Signals:
- "Side Letter" in title, references to specific investor rights → side-letter
- "Limited Partnership Agreement", "LPA", "Agreement of Limited Partnership" → lpa
- "Subscription Agreement", "Subscription Booklet" → sub-doc
- "Co-Investment", "Co-Invest" in title → co-invest
- "Private Placement Memorandum", "PPM", "Offering Memorandum", "Confidential Memorandum" → ppm
- "Amendment" in title, references to modifying existing agreement → amendment
- "Notice" with fund operations content → fund-notice
- "Capital Call", "Drawdown Notice", "Capital Contribution" → capital-call
- "Consent", "Written Consent", "Consent Solicitation" → consent
- "Advisory Committee", "LPAC" materials → advisory-materials
- "Distribution Notice", "Distribution" → distribution-notice

Role Inference:
- Side letter with requests seeking concessions → LP (outgoing)
- Side letter being reviewed for what to grant → GP (incoming)
- LPA being reviewed → more likely LP (diligence), medium confidence
- Sub docs being reviewed → more likely GP (checking compliance), medium confidence
- Capital call / distribution → GP issuing, LP receiving

Complexity:
- simple: Short documents (<10 pages), single topic, standard terms
- moderate: 10-30 pages, multiple provisions, some non-standard terms
- complex: 30+ pages, nested cross-references, bespoke economics, multiple parties

Return ONLY valid JSON.`;

/**
 * Stage 1: Classify the document.
 * Uses Haiku 4.5 at temperature 0.0 for fast, deterministic classification.
 */
export async function classifyDocument(
  documentPreview: string,
  userRole?: UserRole,
): Promise<{ result: PreflightResult; latencyMs: number }> {
  const userMessage = `Classify this document. Only analyze the text below — do not assume content beyond what is provided.

--- DOCUMENT EXCERPT (first ~5000 chars) ---
${documentPreview.substring(0, 5000)}
---`;

  const response = await callLLM({
    provider: 'anthropic',
    model: MODELS.HAIKU,
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    temperature: 0.0,
    maxTokens: 512,
    cacheSystemPrompt: true,
    responseFormat: 'json_object',
  });

  const parsed = parseJSONResponse<PreflightResult>(response.content);

  // Override with user-selected role if provided
  if (userRole) {
    parsed.inferredRole = userRole;
    parsed.confidence = 'high';
  }

  // Validate document type
  const validTypes: DocumentType[] = [
    'side-letter', 'lpa', 'sub-doc', 'co-invest', 'ppm',
    'amendment', 'fund-notice', 'capital-call', 'consent',
    'advisory-materials', 'distribution-notice', 'other',
  ];
  if (!validTypes.includes(parsed.documentType)) {
    parsed.documentType = 'other';
  }

  return { result: parsed, latencyMs: response.latencyMs };
}
