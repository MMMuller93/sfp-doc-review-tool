import express, { type Request, type Response } from 'express';
import { handleChatMessage } from '../services/gemini';

const router = express.Router();

interface ChatRequestBody {
  sessionId: string;
  message: string;
  conversationHistory: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  analysisContext: {
    protectingRole: string;
    verdict: string;
    verdictRationale: string;
    criticalIssues: unknown[];
    issues: unknown[];
    keyAction: string;
  };
  documentTexts: {
    target: string;
    targetName: string;
    reference?: string;
    referenceName?: string;
  };
}

/**
 * POST /api/chat
 * Handle conversational Q&A about analyzed documents.
 */
router.post('/', async (req: Request<object, unknown, ChatRequestBody>, res: Response) => {
  try {
    const {
      sessionId,
      message,
      conversationHistory = [],
      analysisContext,
      documentTexts,
    } = req.body;

    if (!sessionId || !message || !analysisContext || !documentTexts) {
      res.status(400).json({
        error: 'Invalid request',
        details: 'sessionId, message, analysisContext, and documentTexts are required',
      });
      return;
    }

    console.log(`Chat request from session ${sessionId}: ${message.substring(0, 100)}...`);

    const reply = await handleChatMessage({
      message,
      conversationHistory,
      analysisContext: analysisContext as Parameters<typeof handleChatMessage>[0]['analysisContext'],
      documentTexts,
    });

    const updatedHistory = [
      ...conversationHistory,
      {
        id: `msg-${Date.now()}-user`,
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString(),
      },
      {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant' as const,
        content: reply,
        timestamp: new Date().toISOString(),
      },
    ];

    res.json({
      reply,
      conversationHistory: updatedHistory,
    });
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({
      error: 'Chat failed',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

export default router;
