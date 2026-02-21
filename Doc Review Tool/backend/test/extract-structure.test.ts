import { describe, it, expect, vi } from 'vitest';
import type { DocumentStructure, DocumentSection, DefinedTerm, CrossReference } from '@shared/types';

// We test the internal pure functions by importing them indirectly.
// Since adjustPageNumbers and mergeStructures are not exported, we test
// extractStructure's output shape and the merging logic via a mock-based approach.

// Mock the LLM service to avoid real API calls
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

import { callLLM, parseJSONResponse } from '../src/services/llm';
import { extractStructure, extractStructureLongDocument } from '../src/pipeline/extract-structure';

const mockCallLLM = vi.mocked(callLLM);
const mockParseJSON = vi.mocked(parseJSONResponse);

function makeMockStructure(overrides: Partial<DocumentStructure> = {}): DocumentStructure {
  return {
    sections: [
      { id: 'art-1', title: 'DEFINITIONS', level: 1, pageStart: 1, pageEnd: 3, content: 'Defines key terms' },
      { id: 'sec-1-1', title: 'Capital Commitment', level: 2, pageStart: 1, pageEnd: 2, content: 'Capital commitment definition' },
    ],
    definedTerms: [
      { term: 'Capital Commitment', definition: 'Total amount agreed to contribute', location: 'Section 1.1' },
    ],
    crossReferences: [
      { from: 'Section 5.2', to: 'Section 3.1', context: 'Fee calculation references investment period' },
    ],
    parties: ['ABC Capital Partners LLC (General Partner)', 'The Fund (Partnership)'],
    dates: [{ label: 'Effective Date', value: 'January 1, 2026' }],
    economics: [{ label: 'Management Fee', value: '2% of Committed Capital' }],
    ...overrides,
  };
}

describe('extract-structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractStructure', () => {
    it('extracts structure from document text', async () => {
      const mockStructure = makeMockStructure();

      mockCallLLM.mockResolvedValue({
        content: JSON.stringify(mockStructure),
        usage: { inputTokens: 1000, outputTokens: 500 },
        model: 'claude-sonnet-4-6-20250116',
        latencyMs: 2000,
      });
      mockParseJSON.mockReturnValue(mockStructure);

      const { result, response } = await extractStructure({
        documentText: 'ARTICLE I - DEFINITIONS\nSection 1.1...',
      });

      expect(result.sections).toHaveLength(2);
      expect(result.definedTerms).toHaveLength(1);
      expect(result.crossReferences).toHaveLength(1);
      expect(result.parties).toHaveLength(2);
      expect(result.dates).toHaveLength(1);
      expect(result.economics).toHaveLength(1);
      expect(response.model).toBe('claude-sonnet-4-6-20250116');
    });

    it('calls LLM with temperature 0.0', async () => {
      const mockStructure = makeMockStructure();
      mockCallLLM.mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6-20250116',
        latencyMs: 1000,
      });
      mockParseJSON.mockReturnValue(mockStructure);

      await extractStructure({ documentText: 'test' });

      expect(mockCallLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.0,
          model: 'claude-sonnet-4-6-20250116',
          provider: 'anthropic',
        }),
      );
    });

    it('uses page boundary markers when pageTexts provided', async () => {
      const mockStructure = makeMockStructure();
      mockCallLLM.mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6-20250116',
        latencyMs: 1000,
      });
      mockParseJSON.mockReturnValue(mockStructure);

      await extractStructure({
        documentText: 'full doc',
        pageTexts: ['page 1 content', 'page 2 content'],
        totalPages: 2,
      });

      const callArgs = mockCallLLM.mock.calls[0][0];
      expect(callArgs.userMessage).toContain('--- PAGE 1 ---');
      expect(callArgs.userMessage).toContain('--- PAGE 2 ---');
      expect(callArgs.userMessage).toContain('2 pages');
    });

    it('truncates very long documents at 150K chars', async () => {
      const longText = 'x'.repeat(200_000);
      const mockStructure = makeMockStructure();
      mockCallLLM.mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6-20250116',
        latencyMs: 1000,
      });
      mockParseJSON.mockReturnValue(mockStructure);

      await extractStructure({ documentText: longText, totalPages: 100 });

      const callArgs = mockCallLLM.mock.calls[0][0];
      expect(callArgs.userMessage).toContain('[Document truncated at 150000 characters');
      expect(callArgs.userMessage.length).toBeLessThan(200_000);
    });

    it('ensures arrays exist even when LLM returns partial data', async () => {
      mockCallLLM.mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6-20250116',
        latencyMs: 1000,
      });
      // Simulate LLM returning partial structure
      mockParseJSON.mockReturnValue({} as any);

      const { result } = await extractStructure({ documentText: 'test' });

      expect(Array.isArray(result.sections)).toBe(true);
      expect(Array.isArray(result.definedTerms)).toBe(true);
      expect(Array.isArray(result.crossReferences)).toBe(true);
      expect(Array.isArray(result.parties)).toBe(true);
      expect(Array.isArray(result.dates)).toBe(true);
      expect(Array.isArray(result.economics)).toBe(true);
    });

    it('assigns section IDs when missing', async () => {
      const noIdSections: DocumentSection[] = [
        { id: '', title: 'ARTICLE I', level: 1, pageStart: 1, pageEnd: 5, content: 'First article' },
        { id: '', title: 'ARTICLE II', level: 1, pageStart: 6, pageEnd: 10, content: 'Second article' },
      ];

      mockCallLLM.mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'claude-sonnet-4-6-20250116',
        latencyMs: 1000,
      });
      mockParseJSON.mockReturnValue({
        sections: noIdSections,
        definedTerms: [],
        crossReferences: [],
        parties: [],
        dates: [],
        economics: [],
      });

      const { result } = await extractStructure({ documentText: 'test' });

      expect(result.sections[0].id).toBe('sec-1');
      expect(result.sections[1].id).toBe('sec-2');
    });
  });

  describe('extractStructureLongDocument', () => {
    it('chunks pages into groups of 25', async () => {
      // Create 60 pages of text
      const pageTexts = Array.from({ length: 60 }, (_, i) => `Page ${i + 1} content`);

      const chunk1Structure = makeMockStructure({
        sections: [
          { id: 'art-1', title: 'DEFINITIONS', level: 1, pageStart: 1, pageEnd: 10, content: 'Definitions' },
        ],
        definedTerms: [{ term: 'Capital Commitment', definition: 'Total commitment', location: 'Section 1.1' }],
      });

      const chunk2Structure = makeMockStructure({
        sections: [
          { id: 'art-5', title: 'MANAGEMENT FEE', level: 1, pageStart: 1, pageEnd: 15, content: 'Fee terms' },
        ],
        definedTerms: [{ term: 'Net Asset Value', definition: 'NAV calculation', location: 'Section 5.1' }],
        parties: ['XYZ Fund LP (Limited Partner)'],
      });

      const chunk3Structure = makeMockStructure({
        sections: [
          { id: 'art-8', title: 'INDEMNIFICATION', level: 1, pageStart: 1, pageEnd: 10, content: 'Indemnity' },
        ],
        definedTerms: [{ term: 'Capital Commitment', definition: 'Duplicate — should dedup', location: 'Section 8.1' }],
      });

      let callCount = 0;
      mockCallLLM.mockImplementation(async () => {
        return {
          content: '{}',
          usage: { inputTokens: 100, outputTokens: 50 },
          model: 'claude-sonnet-4-6-20250116',
          latencyMs: 1000,
        };
      });

      mockParseJSON
        .mockReturnValueOnce(chunk1Structure)
        .mockReturnValueOnce(chunk2Structure)
        .mockReturnValueOnce(chunk3Structure);

      const { result, responses } = await extractStructureLongDocument(pageTexts);

      // Should have made 3 LLM calls (60 pages / 25 per chunk = 3)
      expect(mockCallLLM).toHaveBeenCalledTimes(3);
      expect(responses).toHaveLength(3);

      // Sections should be merged with adjusted page numbers
      expect(result.sections.length).toBeGreaterThanOrEqual(3);

      // Section IDs should be re-assigned sequentially
      result.sections.forEach((s, i) => {
        expect(s.id).toBe(`sec-${i + 1}`);
      });

      // Chunk 2 sections should have page offset of 25
      // (the second chunk's section had pageStart: 1, should become 26)
      const chunk2Section = result.sections.find((s) => s.title === 'MANAGEMENT FEE');
      expect(chunk2Section).toBeDefined();
      expect(chunk2Section!.pageStart).toBe(26); // 1 + 25 offset

      // Chunk 3 sections should have page offset of 50
      const chunk3Section = result.sections.find((s) => s.title === 'INDEMNIFICATION');
      expect(chunk3Section).toBeDefined();
      expect(chunk3Section!.pageStart).toBe(51); // 1 + 50 offset

      // Defined terms should be deduplicated (Capital Commitment appears twice)
      const capitalCommitmentTerms = result.definedTerms.filter(
        (t) => t.term.toLowerCase() === 'capital commitment',
      );
      expect(capitalCommitmentTerms).toHaveLength(1); // Deduped

      // NAV should be present (unique to chunk 2)
      expect(result.definedTerms.find((t) => t.term === 'Net Asset Value')).toBeDefined();

      // Parties should be merged and deduplicated
      expect(result.parties).toContain('XYZ Fund LP (Limited Partner)');
      expect(result.parties).toContain('ABC Capital Partners LLC (General Partner)');

      // Cross-references capped at 20
      expect(result.crossReferences.length).toBeLessThanOrEqual(20);
    });
  });
});
