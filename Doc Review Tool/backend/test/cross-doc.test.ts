import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getComparisonPriority } from '../src/pipeline/cross-doc';

// Mock the LLM layer — cross-doc engine calls callLLM internally
vi.mock('../src/services/llm', () => ({
  MODELS: {
    HAIKU: 'claude-haiku-4-5-20251001',
    SONNET: 'claude-sonnet-4-6-20250116',
    OPUS: 'claude-opus-4-6-20250116',
    GPT52: 'gpt-5.2',
  },
  callLLM: vi.fn(),
  parseJSONResponse: vi.fn(),
}));

describe('Phase 5: Cross-Document Consistency', () => {
  describe('getComparisonPriority', () => {
    it('returns empty array for single document', () => {
      const result = getComparisonPriority([{ name: 'LPA.pdf', type: 'lpa' }]);
      expect(result).toHaveLength(0);
    });

    it('returns one pair for two documents', () => {
      const result = getComparisonPriority([
        { name: 'LPA.pdf', type: 'lpa' },
        { name: 'PPM.pdf', type: 'ppm' },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('high'); // LPA vs PPM is high priority
    });

    it('returns 6 pairs for 4 documents', () => {
      const result = getComparisonPriority([
        { name: 'LPA.pdf', type: 'lpa' },
        { name: 'PPM.pdf', type: 'ppm' },
        { name: 'SideLetter.pdf', type: 'side-letter' },
        { name: 'SubDoc.pdf', type: 'sub-doc' },
      ]);
      // 4 choose 2 = 6 pairs
      expect(result).toHaveLength(6);
    });

    it('prioritizes LPA comparisons as high', () => {
      const result = getComparisonPriority([
        { name: 'LPA.pdf', type: 'lpa' },
        { name: 'PPM.pdf', type: 'ppm' },
        { name: 'SideLetter.pdf', type: 'side-letter' },
        { name: 'SubDoc.pdf', type: 'sub-doc' },
      ]);

      // LPA-PPM, LPA-side-letter, LPA-sub-doc should all be high
      const highPriority = result.filter((r) => r.priority === 'high');
      expect(highPriority.length).toBeGreaterThanOrEqual(3);
    });

    it('sorts by priority (high first)', () => {
      const result = getComparisonPriority([
        { name: 'Notice.pdf', type: 'fund-notice' },
        { name: 'LPA.pdf', type: 'lpa' },
        { name: 'PPM.pdf', type: 'ppm' },
      ]);

      // First pair should be high priority (LPA-PPM)
      expect(result[0].priority).toBe('high');
    });

    it('marks non-LPA/non-critical pairs as low priority', () => {
      const result = getComparisonPriority([
        { name: 'Notice.pdf', type: 'fund-notice' },
        { name: 'CapCall.pdf', type: 'capital-call' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].priority).toBe('low');
    });
  });

  describe('checkCrossDocConsistency', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it('returns empty result for single document', async () => {
      // Dynamic import to get the mocked version
      const { checkCrossDocConsistency } = await import('../src/pipeline/cross-doc');

      const result = await checkCrossDocConsistency({
        documents: [{ name: 'LPA.pdf', text: 'test content' }],
        userRole: 'lp',
      });

      expect(result.conflicts).toHaveLength(0);
      expect(result.comparisons).toHaveLength(0);
      expect(result.responses).toHaveLength(0);
    });

    it('generates correct number of pairs for N documents', async () => {
      const { callLLM, parseJSONResponse } = await import('../src/services/llm');

      // Mock LLM to return empty conflicts
      (callLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '{"conflicts":[]}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6',
        latencyMs: 1000,
      });
      (parseJSONResponse as ReturnType<typeof vi.fn>).mockReturnValue({ conflicts: [] });

      const { checkCrossDocConsistency } = await import('../src/pipeline/cross-doc');

      const result = await checkCrossDocConsistency({
        documents: [
          { name: 'Doc1.pdf', text: 'content 1' },
          { name: 'Doc2.pdf', text: 'content 2' },
          { name: 'Doc3.pdf', text: 'content 3' },
        ],
        userRole: 'lp',
      });

      // 3 choose 2 = 3 pairs
      expect(result.comparisons).toHaveLength(3);
      expect(result.responses).toHaveLength(3);
      // callLLM should have been called 3 times (one per pair)
      expect(callLLM).toHaveBeenCalledTimes(3);
    });

    it('merges conflicts across pairs with sequential IDs', async () => {
      const { callLLM, parseJSONResponse } = await import('../src/services/llm');

      (callLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6',
        latencyMs: 1000,
      });

      // First pair: 2 conflicts, second pair: 1 conflict
      let callCount = 0;
      (parseJSONResponse as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            conflicts: [
              {
                id: 'temp-1',
                severity: 'blocker',
                title: 'Fee conflict',
                explanation: 'Different fee rates',
                resolution: 'Align to LPA',
                doc1Ref: { document: 'target', locator: 'Section 1', quote: 'quote 1' },
                doc2Ref: { document: 'reference', locator: 'Section 2', quote: 'quote 2' },
              },
              {
                id: 'temp-2',
                severity: 'minor',
                title: 'Definition mismatch',
                explanation: 'Different definitions',
                resolution: 'Use LPA definition',
                doc1Ref: { document: 'target', locator: 'Section 3', quote: 'quote 3' },
                doc2Ref: { document: 'reference', locator: 'Section 4', quote: 'quote 4' },
              },
            ],
          };
        }
        return {
          conflicts: [
            {
              id: 'temp-3',
              severity: 'major',
              title: 'Carry mismatch',
              explanation: 'Different carry',
              resolution: 'Fix carry',
              doc1Ref: { document: 'target', locator: 'Section 5', quote: 'quote 5' },
              doc2Ref: { document: 'reference', locator: 'Section 6', quote: 'quote 6' },
            },
          ],
        };
      });

      const { checkCrossDocConsistency } = await import('../src/pipeline/cross-doc');

      const result = await checkCrossDocConsistency({
        documents: [
          { name: 'LPA.pdf', text: 'lpa content' },
          { name: 'PPM.pdf', text: 'ppm content' },
          { name: 'SideLetter.pdf', text: 'side letter content' },
        ],
        userRole: 'gp',
      });

      // 3 docs → 3 pairs → first pair returns 2 conflicts, remaining pairs return 1 each = 4 total
      expect(result.conflicts.length).toBeGreaterThanOrEqual(3);
      // IDs should be sequential across all pairs
      expect(result.conflicts[0].id).toBe('conflict-001');
      expect(result.conflicts[1].id).toBe('conflict-002');
      expect(result.conflicts[2].id).toBe('conflict-003');
    });

    it('filters out conflicts without required fields', async () => {
      const { callLLM, parseJSONResponse } = await import('../src/services/llm');

      (callLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6',
        latencyMs: 1000,
      });

      (parseJSONResponse as ReturnType<typeof vi.fn>).mockReturnValue({
        conflicts: [
          {
            id: 'temp',
            severity: 'blocker',
            title: 'Valid conflict',
            explanation: 'Real issue',
            resolution: 'Fix it',
            doc1Ref: { document: 'target', locator: 'S1', quote: 'q1' },
            doc2Ref: { document: 'reference', locator: 'S2', quote: 'q2' },
          },
          {
            // Missing title and explanation — should be filtered
            id: 'bad',
            severity: 'minor',
            doc1Ref: { document: 'target', locator: 'S3', quote: 'q3' },
            doc2Ref: { document: 'reference', locator: 'S4', quote: 'q4' },
          },
        ],
      });

      const { checkCrossDocConsistency } = await import('../src/pipeline/cross-doc');

      const result = await checkCrossDocConsistency({
        documents: [
          { name: 'A.pdf', text: 'a' },
          { name: 'B.pdf', text: 'b' },
        ],
        userRole: 'lp',
      });

      // Only the valid conflict should survive
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].title).toBe('Valid conflict');
    });

    it('uses Sonnet at temp 0.0 for comparison', async () => {
      const { callLLM, parseJSONResponse, MODELS } = await import('../src/services/llm');

      (callLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '{"conflicts":[]}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6',
        latencyMs: 1000,
      });
      (parseJSONResponse as ReturnType<typeof vi.fn>).mockReturnValue({ conflicts: [] });

      const { checkCrossDocConsistency } = await import('../src/pipeline/cross-doc');

      await checkCrossDocConsistency({
        documents: [
          { name: 'A.pdf', text: 'a' },
          { name: 'B.pdf', text: 'b' },
        ],
        userRole: 'lp',
      });

      expect(callLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'anthropic',
          model: MODELS.SONNET,
          temperature: 0.0,
        }),
      );
    });

    it('truncates long documents to 80K chars', async () => {
      const { callLLM, parseJSONResponse } = await import('../src/services/llm');

      (callLLM as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: '{"conflicts":[]}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6',
        latencyMs: 1000,
      });
      (parseJSONResponse as ReturnType<typeof vi.fn>).mockReturnValue({ conflicts: [] });

      const { checkCrossDocConsistency } = await import('../src/pipeline/cross-doc');

      const longText = 'x'.repeat(100_000);

      await checkCrossDocConsistency({
        documents: [
          { name: 'Long.pdf', text: longText },
          { name: 'Short.pdf', text: 'short' },
        ],
        userRole: 'lp',
      });

      // The user message should contain truncation marker
      const callArgs = (callLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.userMessage).toContain('[Document truncated]');
    });
  });
});
