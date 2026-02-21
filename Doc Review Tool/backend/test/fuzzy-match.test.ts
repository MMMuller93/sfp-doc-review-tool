import { describe, it, expect } from 'vitest';
import { verifyQuote, verifyQuotes } from '../src/utils/fuzzy-match';

describe('fuzzy-match quote verification', () => {
  const sampleDocument = `
    ARTICLE I - DEFINITIONS
    Section 1.1 "Carried Interest" means twenty percent (20%) of the Net Profits
    of the Partnership allocated to the General Partner pursuant to Section 4.2.

    Section 1.2 "Management Fee" means an annual fee equal to two percent (2%)
    of the aggregate Capital Commitments during the Investment Period and thereafter
    one and one-half percent (1.5%) of the aggregate Funded Commitments.

    ARTICLE II - INDEMNIFICATION
    Section 2.1 The Partnership shall indemnify the General Partner and its
    Affiliates against all losses, claims, damages, liabilities and expenses
    arising out of or in connection with the Partnership's activities, except
    to the extent caused by gross negligence or willful misconduct.

    Section 2.2 The Limited Partners shall not be required to make any additional
    Capital Contributions beyond their respective Capital Commitments.

    ARTICLE III - MOST FAVORED NATION
    Section 3.1 If the General Partner enters into a Side Letter with any other
    Limited Partner that provides for more favorable terms, the Investor shall
    have the right to elect to receive the benefit of such more favorable terms.
  `;

  describe('verifyQuote', () => {
    it('verifies an exact quote from the document', () => {
      const quote = 'twenty percent (20%) of the Net Profits of the Partnership';
      const result = verifyQuote(quote, sampleDocument);

      expect(result.status).toBe('verified');
      expect(result.score).toBeGreaterThan(0.75);
      expect(result.originalQuote).toBe(quote);
    });

    it('verifies a near-exact quote with minor differences', () => {
      // Slightly different from actual text
      const quote = 'an annual fee equal to two percent of the aggregate Capital Commitments';
      const result = verifyQuote(quote, sampleDocument);

      expect(result.status).toBe('verified');
      expect(result.score).toBeGreaterThan(0.75);
    });

    it('rejects a fabricated quote not in the document', () => {
      const quote = 'The General Partner shall receive a performance allocation of thirty percent';
      const result = verifyQuote(quote, sampleDocument);

      expect(result.status).toBe('rejected');
      expect(result.score).toBeLessThan(0.5);
    });

    it('catches a quote with fabricated key terms as rejected', () => {
      // Changes "gross negligence" to "ordinary negligence" — a meaningful fabrication
      const quote = 'indemnify the General Partner against all losses except for ordinary negligence';
      const result = verifyQuote(quote, sampleDocument);

      // Algorithm correctly rejects because the changed terms break n-gram patterns
      expect(result.status).toBe('rejected');
      expect(result.score).toBeLessThan(0.5);
    });

    it('identifies a close paraphrase as review-tier', () => {
      // Close to the real text but reorganized slightly
      const quote = 'the Partnership shall indemnify the General Partner against all losses and damages arising from Partnership activities';
      const result = verifyQuote(quote, sampleDocument);

      // Should score in review or verified range — most words match
      expect(result.score).toBeGreaterThan(0.4);
    });

    it('handles empty quote gracefully', () => {
      const result = verifyQuote('', sampleDocument);
      expect(result.status).toBe('rejected');
      expect(result.score).toBe(0);
    });

    it('handles empty document gracefully', () => {
      const result = verifyQuote('some quote', '');
      expect(result.status).toBe('rejected');
      expect(result.score).toBe(0);
    });

    it('returns match details with all three signals', () => {
      const quote = 'the General Partner enters into a Side Letter with any other Limited Partner';
      const result = verifyQuote(quote, sampleDocument);

      expect(result.matchDetails).toHaveProperty('lcsRatio');
      expect(result.matchDetails).toHaveProperty('contiguity');
      expect(result.matchDetails).toHaveProperty('ngramPrecision');
      expect(result.matchDetails.lcsRatio).toBeGreaterThanOrEqual(0);
      expect(result.matchDetails.lcsRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('verifyQuotes', () => {
    it('verifies multiple quotes and returns a map', () => {
      const quotes = [
        { id: 'issue-001', quote: 'twenty percent (20%) of the Net Profits' },
        { id: 'issue-002', quote: 'This text is completely fabricated and not in the document at all' },
      ];

      const results = verifyQuotes(quotes, sampleDocument);

      expect(results.size).toBe(2);
      expect(results.get('issue-001')?.status).toBe('verified');
      expect(results.get('issue-002')?.status).toBe('rejected');
    });
  });
});
