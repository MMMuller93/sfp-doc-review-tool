import express from 'express';
import { classifyDocument } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/classify
 * Classify document to infer user role and document type (preflight, 2-3 seconds)
 *
 * Request body:
 * {
 *   documentText: string,  // First 2-3 pages
 *   userRole?: 'gp' | 'lp' // Optional manual override
 * }
 *
 * Response:
 * PreflightResult JSON
 */
router.post('/', async (req, res) => {
  try {
    const { documentText, userRole } = req.body;

    // Validate request
    if (!documentText || typeof documentText !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'documentText is required and must be a string'
      });
    }

    if (userRole && !['gp', 'lp'].includes(userRole)) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'userRole must be either "gp" or "lp"'
      });
    }

    // Call Gemini classification
    const classification = await classifyDocument(documentText, userRole);

    res.json(classification);
  } catch (error) {
    console.error('Classification route error:', error);
    res.status(500).json({
      error: 'Classification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
