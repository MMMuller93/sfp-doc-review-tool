import express, { type Request, type Response } from 'express';
import { analyzeDocument } from '../services/gemini';

const router = express.Router();

interface AnalyzeRequestBody {
  targetDocumentText: string;
  referenceDocumentText?: string;
  userRole: 'gp' | 'lp';
  targetDocumentName: string;
  referenceDocumentName?: string;
}

/**
 * POST /api/analyze
 * Analyze document with full system prompt and return structured AnalysisResult.
 */
router.post('/', async (req: Request<object, unknown, AnalyzeRequestBody>, res: Response) => {
  try {
    const {
      targetDocumentText,
      referenceDocumentText,
      userRole,
      targetDocumentName,
      referenceDocumentName,
    } = req.body;

    if (!targetDocumentText || typeof targetDocumentText !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        details: 'targetDocumentText is required and must be a string',
      });
      return;
    }

    if (!userRole || !['gp', 'lp'].includes(userRole)) {
      res.status(400).json({
        error: 'Invalid request',
        details: 'userRole is required and must be either "gp" or "lp"',
      });
      return;
    }

    if (!targetDocumentName || typeof targetDocumentName !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        details: 'targetDocumentName is required and must be a string',
      });
      return;
    }

    if (referenceDocumentText && typeof referenceDocumentText !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        details: 'referenceDocumentText must be a string if provided',
      });
      return;
    }

    const analysis = await analyzeDocument({
      targetDocumentText,
      referenceDocumentText,
      userRole,
      targetDocumentName,
      referenceDocumentName,
    });

    res.json(analysis);
  } catch (error) {
    console.error('Analysis route error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

export default router;
