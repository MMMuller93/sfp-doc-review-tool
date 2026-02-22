import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { parseDocument, parsePDFWithPages } from '../services/parser';
import { runPipeline } from '../services/pipeline';
import type { UserRole } from '@shared/types';

const router = express.Router();

// Multer config — mirrors v1 upload.ts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
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
 * POST /api/v2/upload/analyze
 * File upload → parse → v2 pipeline (Classify → Structure → Analyze → Verify → Synthesize).
 * Returns JSON result compatible with the frontend's handleAnalysisComplete.
 */
router.post(
  '/analyze',
  upload.fields([
    { name: 'targetDocument', maxCount: 1 },
    { name: 'referenceDocument', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const { userRole } = req.body as { userRole?: string };
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (!files || !files['targetDocument'] || files['targetDocument'].length === 0) {
        res.status(400).json({
          error: 'Invalid request',
          details: 'targetDocument file is required',
        });
        return;
      }

      const targetFile = files['targetDocument'][0];
      const referenceFile = files['referenceDocument'] ? files['referenceDocument'][0] : null;

      // Parse target document — use parsePDFWithPages for PDFs to enable structure extraction
      console.log(`[v2] Parsing target document: ${targetFile.originalname}`);
      const isPdf =
        targetFile.mimetype === 'application/pdf' ||
        targetFile.originalname.toLowerCase().endsWith('.pdf');

      let targetDocumentText: string;
      let pageTexts: string[] | undefined;

      if (isPdf) {
        const pdfResult = await parsePDFWithPages(targetFile.buffer);
        targetDocumentText = pdfResult.text;
        pageTexts = pdfResult.pages;
        console.log(`[v2] PDF parsed: ${pdfResult.totalPages} pages`);
      } else {
        targetDocumentText = await parseDocument(
          targetFile.buffer,
          targetFile.mimetype,
          targetFile.originalname,
        );
      }

      // Parse reference document if provided
      let referenceDocumentText: string | undefined;
      if (referenceFile) {
        console.log(`[v2] Parsing reference document: ${referenceFile.originalname}`);
        referenceDocumentText = await parseDocument(
          referenceFile.buffer,
          referenceFile.mimetype,
          referenceFile.originalname,
        );
      }

      // Validate userRole — default to 'lp' if not provided (classify stage will infer)
      const validRoles: UserRole[] = ['gp', 'lp'];
      const finalUserRole: UserRole = validRoles.includes(userRole as UserRole)
        ? (userRole as UserRole)
        : 'lp';

      // Run the v2 pipeline
      console.log(`[v2] Running pipeline with role=${finalUserRole}`);
      const analysis = await runPipeline({
        documentText: targetDocumentText,
        documentName: targetFile.originalname,
        userRole: finalUserRole,
        pageTexts,
        referenceDocumentText,
        referenceDocumentName: referenceFile?.originalname,
      });

      // Return in the same shape the frontend expects
      res.json({
        analysis,
        documentTexts: {
          target: targetDocumentText,
          targetName: targetFile.originalname,
          reference: referenceDocumentText,
          referenceName: referenceFile ? referenceFile.originalname : undefined,
        },
      });
    } catch (error) {
      console.error('[v2] Upload/analyze error:', error);

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            error: 'File too large',
            details: 'Maximum file size is 50MB',
          });
          return;
        }
        res.status(400).json({
          error: 'File upload error',
          details: error.message,
        });
        return;
      }

      res.status(500).json({
        error: 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  },
);

export default router;
