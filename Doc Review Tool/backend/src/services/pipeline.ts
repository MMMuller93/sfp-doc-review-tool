import { classifyDocument } from '../pipeline/classify';
import { extractStructure, extractStructureLongDocument } from '../pipeline/extract-structure';
import { analyzeDocument, analyzeDocumentSectioned, fillChecklistGaps } from '../pipeline/analyze';
import { verifyAnalysis } from '../pipeline/verify';
import { synthesizeResult } from '../pipeline/synthesize';
import { SSEWriter } from '../utils/sse';
import { MODELS } from './llm';
import { analysisCache } from './cache';
import type {
  AnalysisResult,
  DocumentStructure,
  UserRole,
  PipelineStage,
  PipelineStageStatus,
} from '@shared/types';

interface PipelineParams {
  documentText: string;
  documentName: string;
  userRole: UserRole;
  pageTexts?: string[]; // Per-page text for structure extraction
  referenceDocumentText?: string;
  referenceDocumentName?: string;
  usePremiumModel?: boolean;
  sse?: SSEWriter;
}

interface StageState {
  stage: PipelineStage;
  status: PipelineStageStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

/**
 * Run the full v2 analysis pipeline.
 *
 * Pipeline stages:
 * 1. Classify (Haiku 4.5) — document type, role, complexity
 * 2. Extract Structure (Phase 2 — skipped in Phase 1)
 * 3. Analyze (GPT-5.2 or Opus 4.6) — deep analysis with evidence
 * 4. Review + Verify (Sonnet 4.6 + algorithmic) — quote verification, hallucination detection
 * 5. Synthesize (Sonnet 4.6) — verdict, prioritization, action items
 *
 * If Stage 4 flags >2 hallucinations, Stage 3 is retried once.
 */
export async function runPipeline(params: PipelineParams): Promise<AnalysisResult> {
  const { sse } = params;

  // Cache check — only for non-streaming requests (SSE needs real progress events)
  if (!sse) {
    const cacheKey = analysisCache.buildKey(
      params.documentText,
      params.userRole,
      params.usePremiumModel,
      params.referenceDocumentText,
    );
    const cached = analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const stageTimings: Record<string, number> = {};
  const modelsUsed: string[] = [];

  const stages: StageState[] = [
    { stage: 'classify', status: 'pending' },
    { stage: 'extract-structure', status: 'pending' },
    { stage: 'analyze', status: 'pending' },
    { stage: 'review-verify', status: 'pending' },
    { stage: 'synthesize', status: 'pending' },
  ];

  function updateStage(stage: PipelineStage, status: PipelineStageStatus, error?: string) {
    const s = stages.find((st) => st.stage === stage);
    if (!s) return;
    s.status = status;
    if (status === 'running') s.startedAt = Date.now();
    if (status === 'complete' || status === 'error') s.completedAt = Date.now();
    if (error) s.error = error;

    sse?.send('progress', {
      currentStage: stage,
      status,
      message: getStageMessage(stage, status),
      stages: stages.map((st) => ({
        stage: st.stage,
        status: st.status,
        ...(st.startedAt && { startedAt: new Date(st.startedAt).toISOString() }),
        ...(st.completedAt && { completedAt: new Date(st.completedAt).toISOString() }),
        ...(st.error && { error: st.error }),
      })),
    });
  }

  try {
    // === STAGES 1 & 2: CLASSIFY + EXTRACT STRUCTURE (parallel) ===
    updateStage('classify', 'running');
    updateStage('extract-structure', 'running');

    const classifyStart = Date.now();
    const structureStart = Date.now();

    // Run classify and structure extraction in parallel
    const isLongDocument = params.pageTexts && params.pageTexts.length >= 50;

    const [classifyResult, structureResult] = await Promise.all([
      // Stage 1: Classify
      classifyDocument(
        params.documentText.substring(0, 5000),
        params.userRole,
      ).then((res) => {
        stageTimings.classify = Date.now() - classifyStart;
        modelsUsed.push(MODELS.HAIKU);
        updateStage('classify', 'complete');
        sse?.send('stage-complete', {
          stage: 'classify',
          result: {
            documentType: res.result.documentType,
            complexity: res.result.complexity,
            confidence: res.result.confidence,
          },
        });
        return res;
      }),

      // Stage 2: Extract Structure (soft-fail: pipeline continues without structure if this fails)
      (isLongDocument
        ? extractStructureLongDocument(params.pageTexts!)
        : extractStructure({
            documentText: params.documentText,
            pageTexts: params.pageTexts,
            totalPages: params.pageTexts?.length,
          }).then(({ result, response }) => ({ result, responses: [response] }))
      ).then((res) => {
        stageTimings['extract-structure'] = Date.now() - structureStart;
        modelsUsed.push(MODELS.SONNET);
        updateStage('extract-structure', 'complete');
        sse?.send('stage-complete', {
          stage: 'extract-structure',
          result: {
            sectionCount: res.result.sections.length,
            definedTermCount: res.result.definedTerms.length,
            crossRefCount: res.result.crossReferences.length,
          },
        });
        return res;
      }).catch((err) => {
        // Graceful degradation: continue pipeline without structure
        stageTimings['extract-structure'] = Date.now() - structureStart;
        updateStage('extract-structure', 'error', (err as Error).message);
        return null;
      }),
    ]);

    const classification = classifyResult.result;
    const documentStructure: DocumentStructure | undefined = structureResult?.result;

    // === STAGE 3: ANALYZE ===
    updateStage('analyze', 'running');
    const analyzeStart = Date.now();

    const analyzeModel = MODELS.OPUS;
    modelsUsed.push(analyzeModel);

    const analyzeParams = {
      documentText: params.documentText,
      documentName: params.documentName,
      userRole: params.userRole,
      classification,
      documentStructure,
      referenceDocumentText: params.referenceDocumentText,
      referenceDocumentName: params.referenceDocumentName,
      usePremiumModel: params.usePremiumModel,
    };

    // Use sectioned analysis for long documents with page data
    let analyzeResult = isLongDocument
      ? await analyzeDocumentSectioned({ ...analyzeParams, pageTexts: params.pageTexts! })
          .then(({ result, responses }) => ({ result, response: responses[0] }))
      : await analyzeDocument(analyzeParams);

    // Fill checklist gaps — targeted follow-up for missing mandatory items
    const { result: gapFilledResult } = await fillChecklistGaps(analyzeParams, analyzeResult.result);
    analyzeResult = { ...analyzeResult, result: gapFilledResult };

    stageTimings.analyze = Date.now() - analyzeStart;
    updateStage('analyze', 'complete');

    sse?.send('stage-complete', {
      stage: 'analyze',
      result: { issueCount: analyzeResult.result.issues.length },
    });

    // === STAGE 4: REVIEW + VERIFY ===
    updateStage('review-verify', 'running');
    const verifyStart = Date.now();

    let verifyResult = await verifyAnalysis({
      rawResult: analyzeResult.result,
      documentText: params.documentText,
      userRole: params.userRole,
    });

    // Retry Stage 3 once if too many hallucinations
    if (verifyResult.shouldRetry) {
      sse?.send('progress', {
        currentStage: 'analyze',
        status: 'running',
        message: 'Retrying analysis — too many unverified quotes detected',
      });

      const retryStart = Date.now();
      analyzeResult = isLongDocument
        ? await analyzeDocumentSectioned({ ...analyzeParams, pageTexts: params.pageTexts! })
            .then(({ result, responses }) => ({ result, response: responses[0] }))
        : await analyzeDocument(analyzeParams);

      // Fill checklist gaps on retry too
      const { result: retryGapFilled } = await fillChecklistGaps(analyzeParams, analyzeResult.result);
      analyzeResult = { ...analyzeResult, result: retryGapFilled };

      stageTimings.analyze += Date.now() - retryStart;

      // Re-verify
      verifyResult = await verifyAnalysis({
        rawResult: analyzeResult.result,
        documentText: params.documentText,
        userRole: params.userRole,
      });
    }

    modelsUsed.push(MODELS.SONNET); // verification model
    stageTimings['review-verify'] = Date.now() - verifyStart;
    updateStage('review-verify', 'complete');

    sse?.send('stage-complete', {
      stage: 'review-verify',
      result: verifyResult.result.verificationStats,
    });

    // === STAGE 5: SYNTHESIZE ===
    updateStage('synthesize', 'running');
    const synthesizeStart = Date.now();

    const { result: finalResult } = await synthesizeResult({
      verifiedResult: verifyResult.result,
      documentName: params.documentName,
      userRole: params.userRole,
      documentType: classification.documentType,
      stageTimings,
      modelsUsed,
    });

    stageTimings.synthesize = Date.now() - synthesizeStart;
    updateStage('synthesize', 'complete');

    // Update timing in metadata
    finalResult.metadata.stageTimings = stageTimings;
    finalResult.metadata.totalTimeMs = Object.values(stageTimings).reduce((s, t) => s + t, 0);

    // Send final result via SSE
    sse?.send('result', finalResult);
    sse?.close();

    // Cache result for non-streaming re-requests
    if (!sse) {
      const cacheKey = analysisCache.buildKey(
        params.documentText,
        params.userRole,
        params.usePremiumModel,
        params.referenceDocumentText,
      );
      analysisCache.set(cacheKey, finalResult);
    }

    return finalResult;
  } catch (error) {
    const currentStage = stages.find((s) => s.status === 'running');
    if (currentStage) {
      updateStage(currentStage.stage, 'error', (error as Error).message);
    }
    sse?.sendError((error as Error).message);
    throw error;
  }
}

function getStageMessage(stage: PipelineStage, status: PipelineStageStatus): string {
  if (status === 'running') {
    switch (stage) {
      case 'classify': return 'Classifying document type and complexity...';
      case 'extract-structure': return 'Extracting document structure...';
      case 'analyze': return 'Performing deep legal analysis...';
      case 'review-verify': return 'Verifying quotes and checking for accuracy...';
      case 'synthesize': return 'Synthesizing verdict and recommendations...';
    }
  }
  if (status === 'complete') {
    switch (stage) {
      case 'classify': return 'Document classified';
      case 'extract-structure': return 'Structure extracted';
      case 'analyze': return 'Analysis complete';
      case 'review-verify': return 'Verification complete';
      case 'synthesize': return 'Synthesis complete';
    }
  }
  if (status === 'skipped') return `${stage} skipped (Phase 2)`;
  if (status === 'error') return `${stage} failed`;
  return '';
}
