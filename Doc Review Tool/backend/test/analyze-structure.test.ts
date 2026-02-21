import { describe, it, expect, vi } from 'vitest';
import type { DocumentStructure, PreflightResult } from '@shared/types';

// Mock the LLM service
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
import { analyzeDocument, analyzeDocumentSectioned } from '../src/pipeline/analyze';

const mockCallLLM = vi.mocked(callLLM);
const mockParseJSON = vi.mocked(parseJSONResponse);

const mockClassification: PreflightResult = {
  inferredRole: 'lp',
  confidence: 'high',
  documentType: 'lpa',
  directionality: 'incoming',
  rationale: 'LPA document',
  complexity: 'moderate',
};

const mockStructure: DocumentStructure = {
  sections: [
    { id: 'art-1', title: 'DEFINITIONS', level: 1, pageStart: 1, pageEnd: 5, content: 'Key terms defined' },
    { id: 'art-2', title: 'MANAGEMENT FEE', level: 1, pageStart: 6, pageEnd: 10, content: 'Fee structure' },
  ],
  definedTerms: [
    { term: 'Capital Commitment', definition: 'Total agreed contribution', location: 'Section 1.1' },
    { term: 'Investment Period', definition: 'Period during which fund may invest', location: 'Section 1.5' },
  ],
  crossReferences: [
    { from: 'Section 5.2', to: 'Section 1.5', context: 'Fee calc references investment period' },
  ],
  parties: ['ABC Capital Partners LLC (General Partner)', 'The Fund (Partnership)'],
  dates: [{ label: 'Effective Date', value: 'January 1, 2026' }],
  economics: [{ label: 'Management Fee', value: '2% of Committed Capital' }],
};

describe('analyze with document structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes structure context in user message when provided', async () => {
    const mockResult = { issues: [], regulatoryFlags: [], assumptions: [] };
    mockCallLLM.mockResolvedValue({
      content: '{}',
      usage: { inputTokens: 1000, outputTokens: 500 },
      model: 'gpt-5.2',
      latencyMs: 3000,
    });
    mockParseJSON.mockReturnValue(mockResult);

    await analyzeDocument({
      documentText: 'ARTICLE I...',
      documentName: 'test-lpa.pdf',
      userRole: 'lp',
      classification: mockClassification,
      documentStructure: mockStructure,
    });

    const callArgs = mockCallLLM.mock.calls[0][0];
    // Structure context should be in the user message
    expect(callArgs.userMessage).toContain('DOCUMENT STRUCTURE (pre-extracted)');
    expect(callArgs.userMessage).toContain('DEFINITIONS');
    expect(callArgs.userMessage).toContain('MANAGEMENT FEE');
    expect(callArgs.userMessage).toContain('"Capital Commitment"');
    expect(callArgs.userMessage).toContain('"Investment Period"');
    expect(callArgs.userMessage).toContain('Section 5.2 → Section 1.5');
    expect(callArgs.userMessage).toContain('ABC Capital Partners LLC');
    expect(callArgs.userMessage).toContain('Effective Date');
    expect(callArgs.userMessage).toContain('2% of Committed Capital');
  });

  it('works without structure (backward compatible)', async () => {
    const mockResult = { issues: [], regulatoryFlags: [], assumptions: [] };
    mockCallLLM.mockResolvedValue({
      content: '{}',
      usage: { inputTokens: 1000, outputTokens: 500 },
      model: 'gpt-5.2',
      latencyMs: 3000,
    });
    mockParseJSON.mockReturnValue(mockResult);

    await analyzeDocument({
      documentText: 'ARTICLE I...',
      documentName: 'test-lpa.pdf',
      userRole: 'lp',
      classification: mockClassification,
      // No documentStructure
    });

    const callArgs = mockCallLLM.mock.calls[0][0];
    expect(callArgs.userMessage).not.toContain('DOCUMENT STRUCTURE');
  });

  describe('analyzeDocumentSectioned', () => {
    it('falls back to single-shot when no structure', async () => {
      const mockResult = { issues: [], regulatoryFlags: [], assumptions: [] };
      mockCallLLM.mockResolvedValue({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'gpt-5.2',
        latencyMs: 1000,
      });
      mockParseJSON.mockReturnValue(mockResult);

      const { result, responses } = await analyzeDocumentSectioned({
        documentText: 'test',
        documentName: 'test.pdf',
        userRole: 'lp',
        classification: mockClassification,
        pageTexts: ['page1'],
        // No documentStructure
      });

      expect(mockCallLLM).toHaveBeenCalledTimes(1);
      expect(responses).toHaveLength(1);
    });

    it('merges regulatory flags keeping most severe', async () => {
      const chunk1Result = {
        issues: [{ id: 'issue-001', risk: 'blocker', topic: 'indemnification', title: 'Broad indemnity', summary: 'Too broad', impactAnalysis: 'Exposure', targetRef: { document: 'target', locator: 'Section 2.1', quote: 'indemnify...' }, fixes: [] }],
        regulatoryFlags: [
          { category: 'erisa', status: 'clear', summary: 'No ERISA issues in chunk 1' },
        ],
        assumptions: ['Assumed US entity'],
      };

      const chunk2Result = {
        issues: [{ id: 'issue-001', risk: 'negotiate', topic: 'management-fee', title: 'High fee', summary: 'Above market', impactAnalysis: 'Cost', targetRef: { document: 'target', locator: 'Section 5.1', quote: 'fee...' }, fixes: [] }],
        regulatoryFlags: [
          { category: 'erisa', status: 'flag', summary: 'ERISA concern in benefits section' },
        ],
        assumptions: ['Assumed US entity'], // Duplicate
      };

      let callCount = 0;
      mockCallLLM.mockImplementation(async () => ({
        content: '{}',
        usage: { inputTokens: 100, outputTokens: 50 },
        model: 'gpt-5.2',
        latencyMs: 1000,
      }));

      mockParseJSON
        .mockReturnValueOnce(chunk1Result as any)
        .mockReturnValueOnce(chunk2Result as any);

      const structureWith2Sections: DocumentStructure = {
        ...mockStructure,
        sections: [
          { id: 'art-1', title: 'INDEMNIFICATION', level: 1, pageStart: 1, pageEnd: 25, content: 'Indemnity' },
          { id: 'art-2', title: 'ECONOMICS', level: 1, pageStart: 26, pageEnd: 60, content: 'Fees' },
        ],
      };

      const pageTexts = Array.from({ length: 60 }, (_, i) => `Page ${i + 1}`);

      const { result } = await analyzeDocumentSectioned({
        documentText: pageTexts.join('\f'),
        documentName: 'test.pdf',
        userRole: 'lp',
        classification: mockClassification,
        documentStructure: structureWith2Sections,
        pageTexts,
      });

      // Issues should be merged with sequential IDs
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].id).toBe('issue-001');
      expect(result.issues[1].id).toBe('issue-002');

      // ERISA flag should keep the more severe 'flag' status
      const erisaFlag = result.regulatoryFlags.find((f) => f.category === 'erisa');
      expect(erisaFlag).toBeDefined();
      expect(erisaFlag!.status).toBe('flag');

      // Assumptions should be deduplicated
      expect(result.assumptions).toHaveLength(1);
      expect(result.assumptions[0]).toBe('Assumed US entity');
    });
  });
});
