import express from 'express';
import multer from 'multer';
import { parseDocument, getDocumentPreview } from '../services/parser.js';
import { classifyDocument, analyzeDocument } from '../services/gemini.js';

const router = express.Router();

// Configure multer for in-memory file storage (not saved to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOCX, TXT only
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

/**
 * POST /api/upload/analyze
 * Complete workflow: Upload → Parse → Classify (optional) → Analyze
 *
 * Multipart form data fields:
 * - targetDocument: File (required)
 * - referenceDocument: File (optional)
 * - userRole: 'gp' | 'lp' (optional - if not provided, AI will infer)
 *
 * Response:
 * {
 *   classification: PreflightResult,
 *   analysis: AnalysisResult
 * }
 */
router.post(
  '/analyze',
  upload.fields([
    { name: 'targetDocument', maxCount: 1 },
    { name: 'referenceDocument', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { userRole } = req.body;
      const files = req.files;

      // Validate target document
      if (!files || !files.targetDocument || files.targetDocument.length === 0) {
        return res.status(400).json({
          error: 'Invalid request',
          details: 'targetDocument file is required',
        });
      }

      const targetFile = files.targetDocument[0];
      const referenceFile = files.referenceDocument ? files.referenceDocument[0] : null;

      // Parse target document
      console.log(`Parsing target document: ${targetFile.originalname}`);
      const targetDocumentText = await parseDocument(
        targetFile.buffer,
        targetFile.mimetype,
        targetFile.originalname
      );

      // Parse reference document if provided
      let referenceDocumentText = null;
      if (referenceFile) {
        console.log(`Parsing reference document: ${referenceFile.originalname}`);
        referenceDocumentText = await parseDocument(
          referenceFile.buffer,
          referenceFile.mimetype,
          referenceFile.originalname
        );
      }

      // Step 1: Classify document if role not provided
      let classification = null;
      let finalUserRole = userRole;

      if (!finalUserRole || !['gp', 'lp'].includes(finalUserRole)) {
        console.log('Classifying document to infer role...');
        const preview = getDocumentPreview(targetDocumentText);
        classification = await classifyDocument(preview, null);
        finalUserRole = classification.inferredRole;
        console.log(`Inferred role: ${finalUserRole} (confidence: ${classification.confidence})`);
      } else {
        console.log(`Using manually selected role: ${finalUserRole}`);
      }

      // Step 2: Analyze document
      console.log('Analyzing document...');
      const analysis = await analyzeDocument({
        targetDocumentText,
        referenceDocumentText,
        userRole: finalUserRole,
        targetDocumentName: targetFile.originalname,
        referenceDocumentName: referenceFile ? referenceFile.originalname : null,
      });

      // Return both classification and analysis
      res.json({
        classification: classification || {
          inferredRole: finalUserRole,
          confidence: 'high',
          documentType: 'unknown',
          directionality: 'unknown',
          rationale: 'User manually selected role',
        },
        analysis,
      });
    } catch (error) {
      console.error('Upload/analyze route error:', error);

      // Handle multer errors
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File too large',
            details: 'Maximum file size is 50MB',
          });
        }
        return res.status(400).json({
          error: 'File upload error',
          details: error.message,
        });
      }

      res.status(500).json({
        error: 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

export default router;
