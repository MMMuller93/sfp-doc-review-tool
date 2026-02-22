import express, { type Request, type Response } from 'express';
import type { AnalysisResult } from '@shared/types';

const router = express.Router();

/**
 * POST /api/v2/export/json
 * Export analysis results as a downloadable JSON file with metadata.
 */
router.post('/json', (req: Request, res: Response) => {
  try {
    const { analysisResult, documentName } = req.body as {
      analysisResult?: AnalysisResult;
      documentName?: string;
    };

    if (!analysisResult) {
      res.status(400).json({ error: 'analysisResult is required' });
      return;
    }

    const exportData = {
      exportVersion: '2.0',
      exportTimestamp: new Date().toISOString(),
      documentName: documentName || analysisResult.metadata.targetDocumentName,
      ...analysisResult,
    };

    const filename = sanitizeFilename(
      documentName || analysisResult.metadata.targetDocumentName || 'analysis',
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-analysis.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/v2/export/summary
 * Export a plain-text executive summary of the analysis.
 */
router.post('/summary', (req: Request, res: Response) => {
  try {
    const { analysisResult, documentName } = req.body as {
      analysisResult?: AnalysisResult;
      documentName?: string;
    };

    if (!analysisResult) {
      res.status(400).json({ error: 'analysisResult is required' });
      return;
    }

    const summary = buildTextSummary(analysisResult, documentName);
    const filename = sanitizeFilename(
      documentName || analysisResult.metadata.targetDocumentName || 'analysis',
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}-summary.txt"`);
    res.send(summary);
  } catch (error) {
    console.error('Export summary error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

function buildTextSummary(result: AnalysisResult, documentName?: string): string {
  const name = documentName || result.metadata.targetDocumentName;
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════');
  lines.push('DOCUMENT REVIEW — EXECUTIVE SUMMARY');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Document: ${name}`);
  lines.push(`Date: ${result.metadata.analysisTimestamp}`);
  lines.push(`Protecting: ${result.protectingRole.toUpperCase()}`);
  lines.push(`Pipeline: v${result.metadata.pipelineVersion || '2'}`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────');
  lines.push('VERDICT');
  lines.push('───────────────────────────────────────────────────────');
  lines.push('');
  lines.push(`  ${result.verdict.toUpperCase()}`);
  lines.push('');
  lines.push(result.verdictRationale);
  lines.push('');
  lines.push(`Key Action: ${result.keyAction}`);

  if (result.criticalIssues.length > 0) {
    lines.push('');
    lines.push('───────────────────────────────────────────────────────');
    lines.push(`CRITICAL ISSUES (${result.criticalIssues.length})`);
    lines.push('───────────────────────────────────────────────────────');
    for (const issue of result.criticalIssues) {
      lines.push('');
      lines.push(`  [BLOCKER] ${issue.title}`);
      lines.push(`  ${issue.summary}`);
      lines.push(`  Impact: ${issue.impactAnalysis}`);
      lines.push(`  Reference: ${issue.targetRef.locator}`);
      if (issue.fixes.length > 0) {
        lines.push(`  Fix: ${issue.fixes[0].description}`);
      }
    }
  }

  if (result.issues.length > 0) {
    lines.push('');
    lines.push('───────────────────────────────────────────────────────');
    lines.push(`OTHER ISSUES (${result.issues.length})`);
    lines.push('───────────────────────────────────────────────────────');
    for (const issue of result.issues) {
      lines.push('');
      lines.push(`  [${issue.risk.toUpperCase()}] ${issue.title}`);
      lines.push(`  ${issue.summary}`);
      lines.push(`  Reference: ${issue.targetRef.locator}`);
    }
  }

  if (result.regulatoryFlags.length > 0) {
    lines.push('');
    lines.push('───────────────────────────────────────────────────────');
    lines.push('REGULATORY FLAGS');
    lines.push('───────────────────────────────────────────────────────');
    for (const flag of result.regulatoryFlags) {
      lines.push(`  [${flag.status.toUpperCase()}] ${flag.category}: ${flag.summary}`);
    }
  }

  if (result.assumptions.length > 0) {
    lines.push('');
    lines.push('───────────────────────────────────────────────────────');
    lines.push('ASSUMPTIONS');
    lines.push('───────────────────────────────────────────────────────');
    for (const assumption of result.assumptions) {
      lines.push(`  • ${assumption}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('Generated by Doc Review Tool v2');
  lines.push(`Models: ${result.metadata.modelUsed}`);
  if (result.metadata.totalTimeMs) {
    lines.push(`Processing time: ${(result.metadata.totalTimeMs / 1000).toFixed(1)}s`);
  }
  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Sanitize a filename for use in Content-Disposition header.
 * Removes path separators, special characters, and limits length.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[\r\n\t]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\.pdf$|\.docx$|\.txt$/i, '')
    .replace(/\s+/g, '-')
    .substring(0, 100)
    || 'analysis';
}

export default router;
