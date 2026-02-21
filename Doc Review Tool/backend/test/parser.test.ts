import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getDocumentPreview, parsePDFWithPages } from '../src/services/parser';

describe('parser utilities', () => {
  describe('getDocumentPreview', () => {
    it('returns full text when under maxChars', () => {
      const text = 'Short document text.';
      expect(getDocumentPreview(text)).toBe(text);
    });

    it('truncates long text at sentence boundary', () => {
      const text = 'A'.repeat(4500) + '. This is the end of a sentence. ' + 'B'.repeat(1000);
      const preview = getDocumentPreview(text, 5000);
      expect(preview.length).toBeLessThanOrEqual(5000);
      expect(preview.endsWith('.')).toBe(true);
    });

    it('truncates at maxChars when no good break point', () => {
      const text = 'A'.repeat(6000);
      const preview = getDocumentPreview(text, 5000);
      expect(preview.length).toBe(5000);
    });

    it('uses default maxChars of 5000', () => {
      const text = 'B'.repeat(10000);
      const preview = getDocumentPreview(text);
      expect(preview.length).toBe(5000);
    });
  });

  describe('parsePDFWithPages', () => {
    it('extracts text from a PDF fixture with per-page output', async () => {
      const fixturePath = join(__dirname, 'fixtures', 'sample.pdf');
      let buffer: Buffer;

      try {
        buffer = readFileSync(fixturePath);
      } catch {
        // If no fixture exists, create a minimal PDF in memory
        // This is a valid minimal 1-page PDF with text "Hello World"
        const minimalPdf = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 44>>stream
BT /F1 24 Tf 100 700 Td (Hello World) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000340 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
434
%%EOF`;
        buffer = Buffer.from(minimalPdf);
      }

      const result = await parsePDFWithPages(buffer);

      expect(result.totalPages).toBeGreaterThan(0);
      expect(result.pages).toBeInstanceOf(Array);
      expect(result.pages.length).toBe(result.totalPages);
      expect(result.text).toBeTruthy();
      // Full text should contain content from pages joined with form feed
      if (result.totalPages > 1) {
        expect(result.text).toContain('\f');
      }
    });

    it('throws on empty PDF buffer', async () => {
      const emptyBuffer = Buffer.from('');
      await expect(parsePDFWithPages(emptyBuffer)).rejects.toThrow();
    });
  });
});
