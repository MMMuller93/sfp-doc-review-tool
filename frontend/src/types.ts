// === ENUMS ===
export type UserRole = 'gp' | 'lp';

export type Confidence = 'high' | 'medium' | 'low';

export type RiskLevel = 'blocker' | 'negotiate' | 'standard';

export type Verdict = 'safe-to-sign' | 'negotiate' | 'high-risk' | 'do-not-sign';

export type IssueTopic =
  | 'management-fee'
  | 'carried-interest'
  | 'preferred-return'
  | 'clawback'
  | 'fee-offset'
  | 'indemnification'
  | 'exculpation'
  | 'mfn'
  | 'co-invest'
  | 'liquidity'
  | 'transfer-restrictions'
  | 'reporting'
  | 'audit-rights'
  | 'governance'
  | 'lp-advisory-committee'
  | 'key-person'
  | 'gp-removal'
  | 'term-extensions'
  | 'erisa'
  | 'tax'
  | 'confidentiality'
  | 'other';

// === PREFLIGHT CLASSIFICATION ===
export interface PreflightResult {
  inferredRole: UserRole;
  confidence: Confidence;
  documentType: 'side-letter' | 'lpa' | 'sub-doc' | 'co-invest' | 'other';
  directionality: 'incoming' | 'outgoing' | 'unknown';
  rationale: string;  // One sentence explaining the inference
}

// === MAIN ANALYSIS OUTPUT ===
export interface ClauseReference {
  document: 'target' | 'reference';
  locator: string;           // e.g., "Section 4.2", "p.12", "Article VII"
  quote: string;             // Verbatim text, max 250 chars, use [...] for omissions
}

export interface RedlineChange {
  original: string;          // Exact text to remove
  proposed: string;          // Exact text to insert
  marketJustification: string;  // Why this change is reasonable/market
}

export interface SuggestedFix {
  approach: 'soft' | 'hard';  // soft = minor tweak, hard = significant revision
  description: string;        // What this fix accomplishes
  redline: RedlineChange;
}

export interface Issue {
  id: string;                 // Unique identifier, e.g., "issue-001"
  risk: RiskLevel;
  topic: IssueTopic;
  title: string;              // Short headline, e.g., "Uncapped Indemnification"
  summary: string;            // 1-2 sentence explanation of the problem
  impactAnalysis: string;     // Why this matters to the client (GP or LP specific)
  targetRef: ClauseReference; // Required: quote from target document
  referenceRef?: ClauseReference;  // Optional: quote from reference if conflict
  fixes: SuggestedFix[];      // At least one fix required
  marketContext?: string;     // Optional: what's typical in the market
}

export interface RegulatoryFlag {
  category: 'erisa' | 'ubti-eci' | 'foia' | 'ofac-aml' | 'state-law';
  status: 'clear' | 'flag' | 'needs-review';
  summary: string;            // Brief explanation
}

export interface AnalysisResult {
  verdict: Verdict;
  verdictRationale: string;   // 2-3 sentences explaining the verdict
  protectingRole: UserRole;
  keyAction: string;          // Single sentence: what to do next
  criticalIssues: Issue[];    // Max 3, only risk='blocker' issues
  issues: Issue[];            // All other issues, max 10, sorted by risk
  regulatoryFlags: RegulatoryFlag[];
  assumptions: string[];      // What the AI assumed or couldn't verify
  metadata: {
    analysisTimestamp: string;
    targetDocumentName: string;
    referenceDocumentName?: string;
    modelUsed: string;
  };
}

// === API REQUEST/RESPONSE TYPES ===
export interface ClassifyRequest {
  documentText: string;  // First 2-3 pages
  userRole?: UserRole;   // Optional: if user manually selected
}

export interface AnalyzeRequest {
  targetDocumentText: string;
  referenceDocumentText?: string;
  userRole: UserRole;
  targetDocumentName: string;
  referenceDocumentName?: string;
}

export interface APIError {
  error: string;
  details?: string;
}

// === CHAT & CONVERSATION TYPES ===
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationHistory {
  messages: ChatMessage[];
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  conversationHistory: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  conversationHistory: ChatMessage[];
}

// === SESSION STATE TYPES ===
export interface SessionState {
  sessionId: string;
  analysisResult: AnalysisResult | null;
  targetDocumentText: string;
  targetDocumentName: string;
  referenceDocumentText?: string;
  referenceDocumentName?: string;
  conversationHistory: ChatMessage[];
  createdAt: string;
}

// === DRAFTING TYPES ===
export interface DraftRequest {
  sessionId: string;
  prompt: string;
  referenceDocument?: string;
  userRole: UserRole;
  jurisdiction?: string;
}

export interface DraftResponse {
  draftedDocument: string;
  commentary: string;
  downloadUrl?: string;
}

// === CONSISTENCY CHECK TYPES ===
export interface DocumentForComparison {
  name: string;
  text: string;
}

export interface Conflict {
  id: string;
  severity: 'blocker' | 'major' | 'minor';
  title: string;
  doc1Ref: ClauseReference;
  doc2Ref: ClauseReference;
  explanation: string;
  resolution: string;
}

export interface ConsistencyCheckRequest {
  documents: DocumentForComparison[];
  userRole: UserRole;
}

export interface ConsistencyCheckResult {
  conflicts: Conflict[];
}
