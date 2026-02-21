import { getDocumentProxy, extractText } from 'unpdf';
import mammoth from 'mammoth';

/**
 * Parse result with per-page text extraction (new in v2).
 */
export interface ParseResultWithPages {
  text: string;
  pages: string[];
  totalPages: number;
}

/**
 * Parse uploaded document and extract text.
 * Returns a single string for backwards compatibility.
 */
export async function parseDocument(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  try {
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      const result = await parsePDFWithPages(fileBuffer);
      return result.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.toLowerCase().endsWith('.docx')
    ) {
      return await parseDOCX(fileBuffer);
    } else if (mimeType === 'text/plain' || filename.toLowerCase().endsWith('.txt')) {
      return parseTXT(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType || 'unknown'} (${filename})`);
    }
  } catch (error) {
    console.error('Document parsing error:', error);
    throw new Error(`Failed to parse document: ${(error as Error).message}`);
  }
}

/**
 * Parse PDF with per-page text extraction using unpdf.
 * Returns both the full text and individual page strings.
 */
export async function parsePDFWithPages(fileBuffer: Buffer): Promise<ParseResultWithPages> {
  try {
    // Wrap Buffer in Uint8Array — documented safe pattern for unpdf
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
    const { totalPages, text: pages } = await extractText(pdf, { mergePages: false });

    if (pages.length === 0 || pages.every((p) => p.trim().length === 0)) {
      throw new Error('PDF appears to be empty or contains only images');
    }

    if (totalPages > 100) {
      console.warn(`Large PDF detected: ${totalPages} pages. May take longer to process.`);
    }

    // Join pages with form feed for full text (preserves page boundaries)
    const fullText = pages.join('\f');

    return {
      text: fullText,
      pages,
      totalPages,
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${(error as Error).message}`);
  }
}

/**
 * Parse DOCX document.
 */
async function parseDOCX(fileBuffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX appears to be empty');
    }

    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX parsing warnings:', result.messages);
    }

    return result.value;
  } catch (error) {
    throw new Error(`DOCX parsing failed: ${(error as Error).message}`);
  }
}

/**
 * Parse plain text document.
 */
function parseTXT(fileBuffer: Buffer): string {
  try {
    const text = fileBuffer.toString('utf-8');

    if (!text || text.trim().length === 0) {
      throw new Error('Text file appears to be empty');
    }

    return text;
  } catch (error) {
    throw new Error(`Text file parsing failed: ${(error as Error).message}`);
  }
}

/**
 * Get first N characters of document for classification.
 */
export function getDocumentPreview(documentText: string, maxChars: number = 5000): string {
  if (documentText.length <= maxChars) {
    return documentText;
  }

  const truncated = documentText.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('. ');
  const lastNewline = truncated.lastIndexOf('\n\n');

  const breakPoint = Math.max(lastPeriod, lastNewline);

  if (breakPoint > maxChars * 0.8) {
    return truncated.substring(0, breakPoint + 1);
  }

  return truncated;
}
