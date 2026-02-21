import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { SSEWriter } from '../utils/sse';
import { parseDocument, parsePDFWithPages } from '../services/parser';
import { runPipeline } from '../services/pipeline';
import { checkCrossDocConsistency } from '../pipeline/cross-doc';
import type {
  AnalysisResult,
  UserRole,
  DocumentForComparison,
} from '@shared/types';

const router = express.Router();

// Multer config for multi-file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10, // max 10 documents per suite
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  },
});

interface DocAnalysisSuccess {
  name: string;
  analysis: AnalysisResult;
  status: 'success';
}

interface DocAnalysisError {
  name: string;
  error: string;
  status: 'error';
}

interface MultiDocResult {
  documents: DocAnalysisSuccess[];
  errors: DocAnalysisError[];
  crossDocConsistency: {
    conflicts: Awaited<ReturnType<typeof checkCrossDocConsistency>>['conflicts'];
    comparisons: Awaited<ReturnType<typeof checkCrossDocConsistency>>['comparisons'];
  };
  metadata: {
    totalDocuments: number;
    successfulDocuments: number;
    failedDocuments: number;
    totalTimeMs: number;
    analysisTimestamp: string;
  };
}

/**
 * POST /api/v2/multi-doc/analyze/stream
 * Multi-document analysis with SSE streaming.
 * Accepts an array of files as "documents" and a userRole.
 * Analyzes each document individually, then runs cross-doc consistency.
 */
router.post(
  '/analyze/stream',
  upload.array('documents', 10),
  async (req: Request, res: Response) => {
    // Validate BEFORE constructing SSEWriter so we can still send proper HTTP status
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'At least one document file is required' });
      return;
    }

    const { userRole } = req.body as { userRole?: UserRole };
    if (!userRole || !['gp', 'lp'].includes(userRole)) {
      res.status(400).json({ error: 'userRole (gp or lp) is required' });
      return;
    }

    const sse = new SSEWriter(res);
    const startTime = Date.now();

    try {
      sse.send('progress', {
        phase: 'parsing',
        message: `Parsing ${files.length} document${files.length > 1 ? 's' : ''}...`,
        totalDocuments: files.length,
      });

      // Parse all documents in parallel
      const parsedDocs = await Promise.all(
        files.map(async (file) => {
          const isPDF = file.originalname.toLowerCase().endsWith('.pdf');
          let text: string;
          let pageTexts: string[] | undefined;

          if (isPDF) {
            const result = await parsePDFWithPages(file.buffer);
            text = result.text;
            pageTexts = result.pages;
          } else {
            text = await parseDocument(file.buffer, file.mimetype, file.originalname);
          }

          return {
            name: file.originalname,
            text,
            pageTexts,
          };
        }),
      );

      // Analyze each document individually (in parallel, with graceful failure)
      sse.send('progress', {
        phase: 'individual-analysis',
        message: `Analyzing ${parsedDocs.length} documents...`,
      });

      const settled = await Promise.allSettled(
        parsedDocs.map(async (doc, index) => {
          sse.send('progress', {
            phase: 'individual-analysis',
            document: doc.name,
            documentIndex: index,
            message: `Analyzing ${doc.name}...`,
          });

          const result = await runPipeline({
            documentText: doc.text,
            documentName: doc.name,
            userRole,
            pageTexts: doc.pageTexts,
            // No SSE — we handle progress at the multi-doc level
          });

          sse.send('progress', {
            phase: 'individual-analysis',
            document: doc.name,
            documentIndex: index,
            message: `${doc.name} analysis complete`,
            verdict: result.verdict,
          });

          return { name: doc.name, analysis: result, status: 'success' as const };
        }),
      );

      const analysisResults: DocAnalysisSuccess[] = [];
      const analysisErrors: DocAnalysisError[] = [];

      for (let i = 0; i < settled.length; i++) {
        const s = settled[i];
        if (s.status === 'fulfilled') {
          analysisResults.push(s.value);
        } else {
          const docName = parsedDocs[i].name;
          analysisErrors.push({
            name: docName,
            error: (s.reason as Error).message,
            status: 'error',
          });
          sse.send('progress', {
            phase: 'individual-analysis',
            document: docName,
            documentIndex: i,
            message: `${docName} analysis failed: ${(s.reason as Error).message}`,
          });
        }
      }

      // Cross-document consistency check (only if 2+ successfully analyzed documents)
      let crossDocResult: MultiDocResult['crossDocConsistency'] = {
        conflicts: [],
        comparisons: [],
      };

      const successfulDocs = parsedDocs.filter((_, i) => settled[i].status === 'fulfilled');
      if (successfulDocs.length >= 2) {
        sse.send('progress', {
          phase: 'cross-doc',
          message: 'Checking cross-document consistency...',
        });

        const docsForComparison: DocumentForComparison[] = successfulDocs.map((doc) => ({
          name: doc.name,
          text: doc.text,
        }));

        const crossDoc = await checkCrossDocConsistency({
          documents: docsForComparison,
          userRole,
        });

        crossDocResult = {
          conflicts: crossDoc.conflicts,
          comparisons: crossDoc.comparisons,
        };

        sse.send('progress', {
          phase: 'cross-doc',
          message: `Found ${crossDoc.conflicts.length} cross-document conflict${crossDoc.conflicts.length !== 1 ? 's' : ''}`,
        });
      }

      const finalResult: MultiDocResult = {
        documents: analysisResults,
        errors: analysisErrors,
        crossDocConsistency: crossDocResult,
        metadata: {
          totalDocuments: parsedDocs.length,
          successfulDocuments: analysisResults.length,
          failedDocuments: analysisErrors.length,
          totalTimeMs: Date.now() - startTime,
          analysisTimestamp: new Date().toISOString(),
        },
      };

      sse.send('result', finalResult);
      sse.close();
    } catch (error) {
      console.error('Multi-doc analyze stream error:', error);
      sse.sendError((error as Error).message);
    }
  },
);

/**
 * POST /api/v2/multi-doc/analyze
 * Multi-document analysis (non-streaming, returns JSON).
 */
router.post(
  '/analyze',
  upload.array('documents', 10),
  async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const files = req.files as Express.Multer.File[];
      const { userRole } = req.body as { userRole?: UserRole };

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'At least one document file is required' });
        return;
      }

      if (!userRole || !['gp', 'lp'].includes(userRole)) {
        res.status(400).json({ error: 'userRole (gp or lp) is required' });
        return;
      }

      // Parse all documents
      const parsedDocs = await Promise.all(
        files.map(async (file) => {
          const isPDF = file.originalname.toLowerCase().endsWith('.pdf');
          let text: string;
          let pageTexts: string[] | undefined;

          if (isPDF) {
            const result = await parsePDFWithPages(file.buffer);
            text = result.text;
            pageTexts = result.pages;
          } else {
            text = await parseDocument(file.buffer, file.mimetype, file.originalname);
          }

          return { name: file.originalname, text, pageTexts };
        }),
      );

      // Analyze each document (with graceful failure)
      const settled = await Promise.allSettled(
        parsedDocs.map(async (doc) => {
          const result = await runPipeline({
            documentText: doc.text,
            documentName: doc.name,
            userRole,
            pageTexts: doc.pageTexts,
          });
          return { name: doc.name, analysis: result, status: 'success' as const };
        }),
      );

      const analysisResults: DocAnalysisSuccess[] = [];
      const analysisErrors: DocAnalysisError[] = [];

      for (let i = 0; i < settled.length; i++) {
        const s = settled[i];
        if (s.status === 'fulfilled') {
          analysisResults.push(s.value);
        } else {
          analysisErrors.push({
            name: parsedDocs[i].name,
            error: (s.reason as Error).message,
            status: 'error',
          });
        }
      }

      // Cross-doc check (only on successfully analyzed docs)
      let crossDocResult: MultiDocResult['crossDocConsistency'] = {
        conflicts: [],
        comparisons: [],
      };

      const successfulDocs = parsedDocs.filter((_, i) => settled[i].status === 'fulfilled');
      if (successfulDocs.length >= 2) {
        const docsForComparison: DocumentForComparison[] = successfulDocs.map((doc) => ({
          name: doc.name,
          text: doc.text,
        }));

        const crossDoc = await checkCrossDocConsistency({
          documents: docsForComparison,
          userRole,
        });

        crossDocResult = {
          conflicts: crossDoc.conflicts,
          comparisons: crossDoc.comparisons,
        };
      }

      const finalResult: MultiDocResult = {
        documents: analysisResults,
        errors: analysisErrors,
        crossDocConsistency: crossDocResult,
        metadata: {
          totalDocuments: parsedDocs.length,
          successfulDocuments: analysisResults.length,
          failedDocuments: analysisErrors.length,
          totalTimeMs: Date.now() - startTime,
          analysisTimestamp: new Date().toISOString(),
        },
      };

      res.json(finalResult);
    } catch (error) {
      console.error('Multi-doc analyze error:', error);

      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'File too large. Maximum 50MB per file.' });
          return;
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          res.status(400).json({ error: 'Too many files. Maximum 10 documents.' });
          return;
        }
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: (error as Error).message });
    }
  },
);

/**
 * POST /api/v2/multi-doc/consistency
 * Cross-document consistency check only (no individual analysis).
 * Accepts pre-extracted document texts in the request body.
 */
router.post('/consistency', async (req: Request, res: Response) => {
  try {
    const { documents, userRole } = req.body as {
      documents?: DocumentForComparison[];
      userRole?: UserRole;
    };

    if (!documents || !Array.isArray(documents) || documents.length < 2) {
      res.status(400).json({ error: 'At least 2 documents are required' });
      return;
    }

    if (documents.length > 10) {
      res.status(400).json({ error: 'Maximum 10 documents allowed' });
      return;
    }

    if (!userRole || !['gp', 'lp'].includes(userRole)) {
      res.status(400).json({ error: 'userRole (gp or lp) is required' });
      return;
    }

    // Validate document structure with type checks
    for (const doc of documents) {
      if (!doc.name || typeof doc.name !== 'string' || doc.name.length > 512) {
        res.status(400).json({ error: 'Each document must have a valid name (max 512 chars)' });
        return;
      }
      if (!doc.text || typeof doc.text !== 'string') {
        res.status(400).json({ error: 'Each document must have a text field' });
        return;
      }
      if (doc.text.length > 2_000_000) {
        res.status(413).json({ error: `Document "${doc.name}" exceeds maximum text length` });
        return;
      }
    }

    const result = await checkCrossDocConsistency({ documents, userRole });

    res.json({
      conflicts: result.conflicts,
      comparisons: result.comparisons,
    });
  } catch (error) {
    console.error('Consistency check error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
