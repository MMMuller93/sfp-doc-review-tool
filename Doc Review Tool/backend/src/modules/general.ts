import type { ReviewModuleDefinition } from './base';

/**
 * General Review Module (Fallback)
 *
 * Used for document types without a specialized module: amendments,
 * fund notices, capital calls, consent documents, distribution notices,
 * advisory materials, and any other fund-adjacent documents.
 *
 * Uses a two-pass approach: first identify what provisions exist,
 * then analyze each for issues.
 */
export const generalModule: ReviewModuleDefinition = {
  documentType: 'other',
  name: 'General Review',

  checklist: [
    {
      id: 'gen-01',
      label: 'Document Purpose & Context',
      description: 'What is this document? What action does it require? What is the timeline?',
      required: true,
    },
    {
      id: 'gen-02',
      label: 'Key Obligations',
      description: 'What obligations does this document create or modify for each party?',
      required: true,
    },
    {
      id: 'gen-03',
      label: 'Rights & Protections',
      description: 'What rights does each party have? Are any rights being waived or modified?',
      required: true,
    },
    {
      id: 'gen-04',
      label: 'Economic Terms',
      description: 'Any fees, costs, economic modifications, or financial implications',
      required: true,
    },
    {
      id: 'gen-05',
      label: 'Consent & Approval Requirements',
      description: 'What consents are needed? What thresholds? Are they properly obtained?',
      required: true,
    },
    {
      id: 'gen-06',
      label: 'Non-Standard or Unusual Terms',
      description: 'Flag any provisions that deviate from typical market practice for this document type',
      required: true,
    },
  ],

  systemPromptAddendum: `## GENERAL REVIEW APPROACH

This document does not have a specialized review module. Apply a general legal analysis framework:

ANALYSIS APPROACH:
1. First, identify what this document IS and what it's trying to accomplish
2. Map all obligations, rights, and economic terms
3. Compare against what would be standard for this type of document
4. Flag anything unusual, non-standard, or potentially problematic

ADAPT YOUR ANALYSIS TO THE DOCUMENT TYPE:
- Amendments: Focus on what is being changed and whether LP consent was required
- Capital calls: Focus on notice compliance, calculation accuracy, and default provisions
- Fund notices: Focus on the action required, timeline, and any rights being exercised
- Consent documents: Focus on what is being consented to and whether the threshold is met
- Distribution notices: Focus on waterfall compliance and calculation accuracy
- Advisory materials: Focus on the recommendations and potential conflicts

Be thorough but proportionate — the depth of analysis should match the significance of the document.`,

  gpFraming: `As GP counsel reviewing this document:
- Verify it accomplishes its intended purpose correctly
- Check for consistency with the governing LPA
- Ensure proper procedures are being followed
- Flag any unintended consequences or liability exposure`,

  lpFraming: `As LP counsel reviewing this document:
- Understand what is being asked of or communicated to investors
- Check whether proper notice and consent procedures are being followed
- Verify any calculations or economic terms
- Flag any rights being waived or modified without adequate process`,
};
