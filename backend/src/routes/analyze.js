import express from 'express';
import { analyzeDocument } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/analyze
 * Analyze document with full system prompt and return structured AnalysisResult
 *
 * Request body:
 * {
 *   targetDocumentText: string,
 *   referenceDocumentText?: string,
 *   userRole: 'gp' | 'lp',
 *   targetDocumentName: string,
 *   referenceDocumentName?: string
 * }
 *
 * Response:
 * AnalysisResult JSON
 */
router.post('/', async (req, res) => {
  try {
    const {
      targetDocumentText,
      referenceDocumentText,
      userRole,
      targetDocumentName,
      referenceDocumentName
    } = req.body;

    // Validate required fields
    if (!targetDocumentText || typeof targetDocumentText !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'targetDocumentText is required and must be a string'
      });
    }

    if (!userRole || !['gp', 'lp'].includes(userRole)) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'userRole is required and must be either "gp" or "lp"'
      });
    }

    if (!targetDocumentName || typeof targetDocumentName !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'targetDocumentName is required and must be a string'
      });
    }

    // Validate optional reference document
    if (referenceDocumentText && typeof referenceDocumentText !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'referenceDocumentText must be a string if provided'
      });
    }

    // Call Gemini analysis
    const analysis = await analyzeDocument({
      targetDocumentText,
      referenceDocumentText,
      userRole,
      targetDocumentName,
      referenceDocumentName
    });

    res.json(analysis);
  } catch (error) {
    console.error('Analysis route error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
