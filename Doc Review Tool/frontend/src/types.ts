// ============================================================================
// Doc Review Tool v2 — Frontend Types
// Synced from shared/types.ts — this is the canonical source of truth
// ============================================================================

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

// === DOCUMENT TYPES (expanded for v2) ===
export type DocumentType =
  | 'side-letter'
  | 'lpa'
  | 'sub-doc'
  | 'co-invest'
  | 'ppm'
  | 'amendment'
  | 'fund-notice'
  | 'capital-call'
  | 'consent'
  | 'advisory-materials'
  | 'distribution-notice'
  | 'other';

// === PREFLIGHT CLASSIFICATION ===
export interface PreflightResult {
  inferredRole: UserRole;
  confidence: Confidence;
  documentType: DocumentType;
  directionality: 'incoming' | 'outgoing' | 'unknown';
  rationale: string;
  complexity?: 'simple' | 'moderate' | 'complex';
}

// === MAIN ANALYSIS OUTPUT ===
export interface ClauseReference {
  document: 'target' | 'reference';
  locator: string;
  quote: string;
}

export interface RedlineChange {
  original: string;
  proposed: string;
  marketJustification: string;
}

export interface SuggestedFix {
  approach: 'soft' | 'hard';
  description: string;
  redline: RedlineChange;
}

export interface Issue {
  id: string;
  risk: RiskLevel;
  topic: IssueTopic;
  title: string;
  summary: string;
  impactAnalysis: string;
  targetRef: ClauseReference;
  referenceRef?: ClauseReference;
  fixes: SuggestedFix[];
  marketContext?: string;
  verificationStatus?: QuoteVerificationStatus;
}

export interface RegulatoryFlag {
  category: 'erisa' | 'ubti-eci' | 'foia' | 'ofac-aml' | 'state-law';
  status: 'clear' | 'flag' | 'needs-review';
  summary: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  verdictRationale: string;
  protectingRole: UserRole;
  keyAction: string;
  criticalIssues: Issue[];
  issues: Issue[];
  regulatoryFlags: RegulatoryFlag[];
  assumptions: string[];
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  analysisTimestamp: string;
  targetDocumentName: string;
  referenceDocumentName?: string;
  modelUsed: string;
  pipelineVersion?: 'v1' | 'v2';
  stageTimings?: Record<string, number>;
  totalTimeMs?: number;
}

// === API REQUEST/RESPONSE TYPES ===
export interface ClassifyRequest {
  documentText: string;
  userRole?: UserRole;
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

// ============================================================================
// v2 NEW TYPES — Pipeline, Structure, Review Modules
// ============================================================================

// === DOCUMENT STRUCTURE (Stage 2 output) ===
export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  pageStart: number;
  pageEnd: number;
  content: string;
}

export interface DefinedTerm {
  term: string;
  definition: string;
  location: string;
}

export interface CrossReference {
  from: string;
  to: string;
  context: string;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  definedTerms: DefinedTerm[];
  crossReferences: CrossReference[];
  parties: string[];
  dates: Array<{ label: string; value: string }>;
  economics: Array<{ label: string; value: string }>;
}

// === PIPELINE TYPES ===
export type PipelineStage =
  | 'classify'
  | 'extract-structure'
  | 'analyze'
  | 'review-verify'
  | 'synthesize';

export type PipelineStageStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';

export interface PipelineStageProgress {
  stage: PipelineStage;
  status: PipelineStageStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PipelineProgress {
  stages: PipelineStageProgress[];
  currentStage: PipelineStage | null;
  overallStatus: 'running' | 'complete' | 'error';
  startedAt: string;
  estimatedTotalMs?: number;
}

// === SSE EVENT TYPES ===
export type SSEEventType = 'progress' | 'stage-complete' | 'result' | 'error' | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: PipelineProgress | AnalysisResult | { message: string } | null;
}

// === QUOTE VERIFICATION (Stage 4) ===
export type QuoteVerificationStatus = 'verified' | 'review' | 'rejected';

export interface QuoteVerification {
  originalQuote: string;
  bestMatch: string;
  score: number;
  status: QuoteVerificationStatus;
  matchDetails: {
    lcsRatio: number;
    contiguity: number;
    ngramPrecision: number;
  };
}

// === REVIEW MODULE TYPES ===
export interface ReviewChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface ReviewModule {
  documentType: DocumentType;
  name: string;
  checklist: ReviewChecklistItem[];
  systemPromptAddendum: string;
}

// === LLM ABSTRACTION ===
export type LLMProvider = 'anthropic' | 'openai' | 'google';

export interface LLMCallConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  cacheControl?: boolean;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  model: string;
  latencyMs: number;
}
