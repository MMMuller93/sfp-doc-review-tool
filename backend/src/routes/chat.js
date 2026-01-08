import express from 'express';
import { handleChatMessage } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/chat
 * Handle conversational Q&A about analyzed documents
 *
 * Request body:
 * {
 *   sessionId: string,
 *   message: string,
 *   conversationHistory: ChatMessage[],
 *   analysisContext: AnalysisResult,
 *   documentTexts: {
 *     target: string,
 *     targetName: string,
 *     reference?: string,
 *     referenceName?: string
 *   }
 * }
 *
 * Response:
 * {
 *   reply: string,
 *   conversationHistory: ChatMessage[]
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      message,
      conversationHistory = [],
      analysisContext,
      documentTexts,
    } = req.body;

    // Validate required fields
    if (!sessionId || !message || !analysisContext || !documentTexts) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'sessionId, message, analysisContext, and documentTexts are required',
      });
    }

    console.log(`Chat request from session ${sessionId}: ${message.substring(0, 100)}...`);

    // Call Gemini chat service
    const reply = await handleChatMessage({
      message,
      conversationHistory,
      analysisContext,
      documentTexts,
    });

    // Build updated conversation history
    const updatedHistory = [
      ...conversationHistory,
      {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      },
      {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
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
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

export default router;
