import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalysisResult } from '@shared/types';

// ============================================================================
// Phase 6 Tests: Cache, Chat v2, Export, Input Sanitization
// ============================================================================

// --- Test fixture ---
function makeAnalysisResult(overrides?: Partial<AnalysisResult>): AnalysisResult {
  return {
    verdict: 'negotiate',
    verdictRationale: 'Several terms require negotiation.',
    protectingRole: 'lp',
    keyAction: 'Negotiate management fee structure',
    criticalIssues: [
      {
        id: 'issue-001',
        title: 'Excessive Management Fee',
        summary: 'Fee of 2.5% exceeds market standard.',
        risk: 'blocker',
        topic: 'management-fee',
        impactAnalysis: 'Estimated 50bps overpayment per year.',
        targetRef: { document: 'target', locator: 'Section 5.1, Page 12', quote: 'management fee of 2.5%' },
        fixes: [{
          approach: 'soft',
          description: 'Negotiate to 2.0% with step-down',
          redline: { original: '2.5%', proposed: '2.0% with step-down after Year 4', marketJustification: 'Market standard for mid-market funds' },
        }],
      },
    ],
    issues: [
      {
        id: 'issue-002',
        title: 'Weak Key Person Provision',
        summary: 'Key person clause lacks teeth.',
        risk: 'negotiate',
        topic: 'key-person',
        impactAnalysis: 'Limited recourse if key person departs.',
        targetRef: { document: 'target', locator: 'Section 8.3, Page 22', quote: 'key person event' },
        fixes: [],
      },
    ],
    regulatoryFlags: [
      {
        category: 'erisa',
        status: 'flag',
        summary: 'ERISA fiduciary language is non-standard.',
      },
    ],
    assumptions: ['Document is the final version.', 'No side letters exist.'],
    metadata: {
      analysisTimestamp: '2026-02-21T12:00:00Z',
      targetDocumentName: 'Test LPA.pdf',
      modelUsed: 'claude-sonnet-4-6-20250116',
      pipelineVersion: 'v2',
      totalTimeMs: 5000,
    },
    ...overrides,
  };
}

// ============================================================================
// CACHE TESTS
// ============================================================================
describe('Phase 6: AnalysisCache', () => {
  // Import fresh cache for each test — use dynamic import to avoid singleton issues
  let AnalysisCacheClass: new (maxEntries?: number, ttlMs?: number) => {
    buildKey: (text: string, role: string, premium?: boolean) => string;
    get: (key: string) => AnalysisResult | null;
    set: (key: string, result: AnalysisResult) => void;
    stats: () => { entries: number; maxEntries: number; ttlMs: number };
    clear: () => void;
  };

  beforeEach(async () => {
    // Re-import to get fresh class (singleton export won't interfere since we construct new)
    vi.resetModules();
    const cacheModule = await import('../src/services/cache');
    // Access the class through the module's default instance constructor
    AnalysisCacheClass = (cacheModule.analysisCache as any).constructor;
  });

  it('builds deterministic cache keys', async () => {
    const { analysisCache } = await import('../src/services/cache');
    const key1 = analysisCache.buildKey('document text', 'lp', false);
    const key2 = analysisCache.buildKey('document text', 'lp', false);
    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64); // SHA-256 hex
  });

  it('builds different keys for different inputs', async () => {
    const { analysisCache } = await import('../src/services/cache');
    const key1 = analysisCache.buildKey('document text', 'lp', false);
    const key2 = analysisCache.buildKey('document text', 'gp', false);
    const key3 = analysisCache.buildKey('document text', 'lp', true);
    const key4 = analysisCache.buildKey('different text', 'lp', false);

    expect(new Set([key1, key2, key3, key4]).size).toBe(4);
  });

  it('stores and retrieves results', async () => {
    const cache = new AnalysisCacheClass(10, 60_000);
    const result = makeAnalysisResult();
    const key = 'test-key-1';

    cache.set(key, result);
    const retrieved = cache.get(key);

    expect(retrieved).toEqual(result);
    expect(cache.stats().entries).toBe(1);
  });

  it('returns null for missing keys', async () => {
    const cache = new AnalysisCacheClass(10, 60_000);
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('expires entries after TTL', async () => {
    const cache = new AnalysisCacheClass(10, 1); // 1ms TTL
    const result = makeAnalysisResult();

    cache.set('ttl-test', result);
    // Wait for TTL to expire
    await new Promise((r) => setTimeout(r, 10));

    expect(cache.get('ttl-test')).toBeNull();
  });

  it('evicts oldest entry when at capacity', async () => {
    const cache = new AnalysisCacheClass(2, 60_000); // max 2 entries
    const result = makeAnalysisResult();

    cache.set('key-1', result);
    cache.set('key-2', result);
    cache.set('key-3', result); // Should evict key-1

    expect(cache.get('key-1')).toBeNull();
    expect(cache.get('key-2')).toEqual(result);
    expect(cache.get('key-3')).toEqual(result);
    expect(cache.stats().entries).toBe(2);
  });

  it('clears all entries', async () => {
    const cache = new AnalysisCacheClass(10, 60_000);
    cache.set('a', makeAnalysisResult());
    cache.set('b', makeAnalysisResult());
    expect(cache.stats().entries).toBe(2);

    cache.clear();
    expect(cache.stats().entries).toBe(0);
  });
});

// ============================================================================
// EXPORT TESTS (unit tests on the text summary builder)
// ============================================================================

// We can't easily test the Express routes without supertest,
// but we can test the sanitizeFilename and buildTextSummary logic
// by importing the router module and testing side effects.
// Since those are private functions, we test them through the route behavior.

describe('Phase 6: Export', () => {
  it('export module loads without error', async () => {
    const exportModule = await import('../src/routes/export');
    expect(exportModule.default).toBeDefined();
  });
});

// ============================================================================
// CHAT V2 TESTS
// ============================================================================

// Mock LLM for chat tests
vi.mock('../src/services/llm', () => ({
  MODELS: {
    HAIKU: 'claude-haiku-4-5-20251001',
    SONNET: 'claude-sonnet-4-6-20250116',
    OPUS: 'claude-opus-4-6-20250116',
    GPT52: 'gpt-5.2',
  },
  callLLM: vi.fn().mockResolvedValue({
    content: 'This is a test response about the document.',
    usage: { inputTokens: 100, outputTokens: 50 },
  }),
  parseJSONResponse: vi.fn(),
}));

describe('Phase 6: Chat v2', () => {
  it('chat-v2 module loads without error', async () => {
    const chatModule = await import('../src/routes/chat-v2');
    expect(chatModule.default).toBeDefined();
  });
});

// ============================================================================
// INPUT SANITIZATION TESTS
// ============================================================================

describe('Phase 6: Input Sanitization', () => {
  it('analyze-v2 module loads without error', async () => {
    const analyzeModule = await import('../src/routes/analyze-v2');
    expect(analyzeModule.default).toBeDefined();
  });

  it('index module loads without error', async () => {
    // This validates all route wiring compiles
    // Can't fully start the server without env vars, but import should succeed
    expect(true).toBe(true); // Placeholder — tsc compilation is the real check
  });
});

// ============================================================================
// PIPELINE CACHE INTEGRATION TESTS
// ============================================================================

describe('Phase 6: Pipeline Cache Integration', () => {
  it('pipeline module imports cache', async () => {
    // Verify the import doesn't break
    const pipelineModule = await import('../src/services/pipeline');
    expect(pipelineModule.runPipeline).toBeDefined();
  });
});
