import express, { type Request, type Response } from 'express';
import { SSEWriter } from '../utils/sse';
import { runPipeline } from '../services/pipeline';
import type { UserRole } from '@shared/types';

const router = express.Router();

interface V2AnalyzeBody {
  targetDocumentText?: string;
  targetDocumentName?: string;
  userRole?: UserRole;
  referenceDocumentText?: string;
  referenceDocumentName?: string;
  usePremiumModel?: boolean;
}

/**
 * POST /api/v2/analyze/stream
 * v2 pipeline endpoint with SSE progress streaming.
 * Runs the full multi-stage pipeline: classify → analyze → verify → synthesize.
 */
router.post('/stream', async (req: Request, res: Response) => {
  const sse = new SSEWriter(res);

  try {
    const body = req.body as V2AnalyzeBody;

    if (!body.targetDocumentText || !body.userRole) {
      sse.sendError('targetDocumentText and userRole are required');
      return;
    }

    await runPipeline({
      documentText: body.targetDocumentText,
      documentName: body.targetDocumentName || 'document',
      userRole: body.userRole,
      referenceDocumentText: body.referenceDocumentText,
      referenceDocumentName: body.referenceDocumentName,
      usePremiumModel: body.usePremiumModel,
      sse,
    });
    // Pipeline handles sse.send('result', ...) and sse.close() internally
  } catch (error) {
    console.error('v2 analyze stream error:', error);
    // Pipeline already sent error via SSE if it threw after starting
    if (!res.headersSent) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
});

/**
 * POST /api/v2/analyze
 * v2 pipeline endpoint without streaming (returns JSON directly).
 * Useful for testing and clients that don't support SSE.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as V2AnalyzeBody;

    if (!body.targetDocumentText || !body.userRole) {
      res.status(400).json({ error: 'targetDocumentText and userRole are required' });
      return;
    }

    const result = await runPipeline({
      documentText: body.targetDocumentText,
      documentName: body.targetDocumentName || 'document',
      userRole: body.userRole,
      referenceDocumentText: body.referenceDocumentText,
      referenceDocumentName: body.referenceDocumentName,
      usePremiumModel: body.usePremiumModel,
      // No SSE — result returned directly
    });

    res.json(result);
  } catch (error) {
    console.error('v2 analyze error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
