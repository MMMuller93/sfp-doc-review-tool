import express, { type Request, type Response } from 'express';
import { classifyDocument } from '../services/gemini';

const router = express.Router();

interface ClassifyRequestBody {
  documentText: string;
  userRole?: 'gp' | 'lp';
}

/**
 * POST /api/classify
 * Classify document to infer user role and document type (preflight, 2-3 seconds).
 */
router.post('/', async (req: Request<object, unknown, ClassifyRequestBody>, res: Response) => {
  try {
    const { documentText, userRole } = req.body;

    if (!documentText || typeof documentText !== 'string') {
      res.status(400).json({
        error: 'Invalid request',
        details: 'documentText is required and must be a string',
      });
      return;
    }

    if (userRole && !['gp', 'lp'].includes(userRole)) {
      res.status(400).json({
        error: 'Invalid request',
        details: 'userRole must be either "gp" or "lp"',
      });
      return;
    }

    const classification = await classifyDocument(documentText, userRole || null);

    res.json(classification);
  } catch (error) {
    console.error('Classification route error:', error);
    res.status(500).json({
      error: 'Classification failed',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

export default router;
