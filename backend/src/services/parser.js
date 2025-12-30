import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Parse uploaded document and extract text
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type of file
 * @param {string} filename - Original filename
 * @returns {Promise<string>} Extracted text
 */
export async function parseDocument(fileBuffer, mimeType, filename) {
  try {
    // Determine parser based on MIME type or file extension
    if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      return await parsePDF(fileBuffer);
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
    throw new Error(`Failed to parse document: ${error.message}`);
  }
}

/**
 * Parse PDF document
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
async function parsePDF(fileBuffer) {
  try {
    const data = await pdfParse(fileBuffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images');
    }

    // Check page count
    if (data.numpages > 100) {
      console.warn(`Large PDF detected: ${data.numpages} pages. May take longer to process.`);
    }

    return data.text;
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

/**
 * Parse DOCX document
 * @param {Buffer} fileBuffer - DOCX file buffer
 * @returns {Promise<string>} Extracted text
 */
async function parseDOCX(fileBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('DOCX appears to be empty');
    }

    // Log any warnings from mammoth
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX parsing warnings:', result.messages);
    }

    return result.value;
  } catch (error) {
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
}

/**
 * Parse plain text document
 * @param {Buffer} fileBuffer - Text file buffer
 * @returns {string} Extracted text
 */
function parseTXT(fileBuffer) {
  try {
    const text = fileBuffer.toString('utf-8');

    if (!text || text.trim().length === 0) {
      throw new Error('Text file appears to be empty');
    }

    return text;
  } catch (error) {
    throw new Error(`Text file parsing failed: ${error.message}`);
  }
}

/**
 * Get first N pages/characters of document for classification
 * @param {string} documentText - Full document text
 * @param {number} maxChars - Maximum characters to return (default: 5000)
 * @returns {string} Truncated text
 */
export function getDocumentPreview(documentText, maxChars = 5000) {
  if (documentText.length <= maxChars) {
    return documentText;
  }

  // Try to break at a sentence or paragraph boundary
  const truncated = documentText.substring(0, maxChars);
  const lastPeriod = truncated.lastIndexOf('. ');
  const lastNewline = truncated.lastIndexOf('\n\n');

  const breakPoint = Math.max(lastPeriod, lastNewline);

  if (breakPoint > maxChars * 0.8) {
    return truncated.substring(0, breakPoint + 1);
  }

  return truncated;
}
