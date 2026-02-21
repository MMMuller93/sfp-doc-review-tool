import type { DocumentType, ReviewChecklistItem } from '@shared/types';
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
 *
 * When the classified sub-type is known (e.g., "amendment" vs "capital-call"),
 * additional type-specific checklist items and prompt guidance are injected
 * via getSubTypeEnhancements().
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

// ============================================================================
// Sub-Type Enhancements
// ============================================================================

/**
 * Sub-type-specific guidance that gets layered on top of the general module
 * when the classifier identifies a specific non-specialized document type.
 */
interface SubTypeGuidance {
  /** Additional checklist items specific to this sub-type */
  additionalChecklist: ReviewChecklistItem[];
  /** Additional prompt guidance injected into the system prompt */
  promptAddendum: string;
}

const SUB_TYPE_GUIDANCE: Partial<Record<DocumentType, SubTypeGuidance>> = {
  amendment: {
    additionalChecklist: [
      {
        id: 'amd-01',
        label: 'Scope of Amendment',
        description: 'What specific provisions of the underlying agreement are being modified? Is the scope clearly defined?',
        required: true,
      },
      {
        id: 'amd-02',
        label: 'LP Consent Compliance',
        description: 'Does this amendment require LP consent? What threshold (majority, supermajority, unanimous)? Has it been properly obtained?',
        required: true,
      },
      {
        id: 'amd-03',
        label: 'Impact on Existing Rights',
        description: 'Does this amendment diminish or eliminate existing LP rights, economic terms, or protections?',
        required: true,
      },
      {
        id: 'amd-04',
        label: 'Retroactive Effect',
        description: 'Does the amendment apply retroactively? If so, is this appropriate and clearly disclosed?',
        required: true,
      },
    ],
    promptAddendum: `## AMENDMENT-SPECIFIC ANALYSIS

This is an Amendment to an existing agreement. Focus on:

1. WHAT is being changed — identify every modified provision precisely
2. WHY — is the rationale for the amendment disclosed and reasonable?
3. CONSENT — was proper consent obtained per the underlying agreement's amendment provisions?
4. IMPACT — does the amendment benefit one party at the expense of another?
5. INTEGRATION — does the amendment create any inconsistencies with the unamended portions?

COMMON AMENDMENT ISSUES:
- Amendment scope broader than stated (e.g., "technical amendment" that changes economics)
- Consent threshold manipulated (e.g., using "majority in interest" when supermajority required)
- Side effects: changes to one provision that unintentionally affect cross-referenced provisions
- Missing sunset or effective date provisions
- Amendment to amendment creating layer-cake ambiguity`,
  },

  'capital-call': {
    additionalChecklist: [
      {
        id: 'cc-01',
        label: 'Notice Compliance',
        description: 'Does this capital call comply with the notice period required by the LPA (typically 10-15 business days)?',
        required: true,
      },
      {
        id: 'cc-02',
        label: 'Calculation Accuracy',
        description: 'Is the pro-rata calculation clear and correct? Does the total equal the sum of individual contributions?',
        required: true,
      },
      {
        id: 'cc-03',
        label: 'Purpose & Use of Proceeds',
        description: 'Is the purpose of the capital call clearly stated? Is it within the investment scope of the fund?',
        required: true,
      },
      {
        id: 'cc-04',
        label: 'Default Provisions Reference',
        description: 'Does the notice reference default consequences for non-payment as specified in the LPA?',
        required: true,
      },
    ],
    promptAddendum: `## CAPITAL CALL-SPECIFIC ANALYSIS

This is a Capital Call Notice. Focus on:

1. COMPLIANCE — does the notice meet LPA requirements for timing, format, and content?
2. CALCULATION — verify pro-rata allocations and check math consistency
3. PURPOSE — is the stated use of proceeds within the fund's investment period and strategy scope?
4. DEFAULT — are default consequences clearly stated and consistent with the LPA?
5. EXCUSAL — does any LP have excuse or exclusion rights for this type of investment?

COMMON CAPITAL CALL ISSUES:
- Insufficient notice period (LPA typically requires 10-15 business days)
- Vague purpose description that doesn't clearly tie to investment strategy
- Calculation errors in pro-rata allocations (especially after partial transfers)
- Missing wire instructions or payment deadline
- Calls outside the investment period without clear authorization`,
  },

  consent: {
    additionalChecklist: [
      {
        id: 'con-01',
        label: 'Subject of Consent',
        description: 'What specific action or decision requires consent? Is it clearly and completely described?',
        required: true,
      },
      {
        id: 'con-02',
        label: 'Threshold & Counting',
        description: 'What consent threshold is required? How are votes/interests counted? Is the method specified?',
        required: true,
      },
      {
        id: 'con-03',
        label: 'Consequences of Consent/Refusal',
        description: 'What happens if consent is granted? What happens if it is refused? Are both paths clearly described?',
        required: true,
      },
      {
        id: 'con-04',
        label: 'Consent Deadline & Deemed Consent',
        description: 'Is there a deadline for responding? Does failure to respond constitute deemed consent? Is deemed consent appropriate here?',
        required: true,
      },
    ],
    promptAddendum: `## CONSENT SOLICITATION-SPECIFIC ANALYSIS

This is a Consent Solicitation. Focus on:

1. AUTHORITY — does the LPA actually require consent for this action? At what threshold?
2. COMPLETENESS — is the description of the proposed action complete enough for informed consent?
3. DEEMED CONSENT — does silence equal consent? This is often problematic for material changes
4. CONFLICTS — does the GP have a conflict of interest in seeking this consent?
5. CONDITIONALITY — is the consent conditional or can it be revoked?

COMMON CONSENT SOLICITATION ISSUES:
- Deemed consent provisions that effectively bypass LP approval on material matters
- Incomplete disclosure of the action being consented to
- Wrong consent threshold (should be supermajority but using simple majority)
- Missing conflict disclosure when GP benefits from the consented action
- No deadline or unreasonably short deadline for response`,
  },

  'distribution-notice': {
    additionalChecklist: [
      {
        id: 'dn-01',
        label: 'Waterfall Compliance',
        description: 'Does the distribution follow the waterfall specified in the LPA (return of capital → preferred return → carry split)?',
        required: true,
      },
      {
        id: 'dn-02',
        label: 'Calculation Transparency',
        description: 'Are the distribution calculations clear? Can amounts be independently verified from the information provided?',
        required: true,
      },
      {
        id: 'dn-03',
        label: 'Tax Implications',
        description: 'Are withholding tax, K-1 timing, and character of income implications addressed?',
        required: true,
      },
      {
        id: 'dn-04',
        label: 'Clawback Reserve',
        description: 'If this is an interim distribution, is a clawback reserve or escrow being maintained? What is the reserve amount and duration?',
        required: true,
      },
    ],
    promptAddendum: `## DISTRIBUTION NOTICE-SPECIFIC ANALYSIS

This is a Distribution Notice. Focus on:

1. WATERFALL — does the distribution follow the LPA's distribution waterfall?
2. CALCULATION — verify the math (return of capital basis, preferred return accrual, carry calculation)
3. CLAWBACK — is there a clawback reserve or escrow if this is an interim distribution?
4. TAX — are tax withholding and reporting implications addressed?

COMMON DISTRIBUTION NOTICE ISSUES:
- Distribution out of order in the waterfall (carry paid before full return of capital)
- Missing clawback reserve on interim distributions
- Inconsistency between stated distribution amounts and underlying calculations
- No tax withholding disclosure for non-US investors`,
  },

  'fund-notice': {
    additionalChecklist: [
      {
        id: 'fn-01',
        label: 'Action Required',
        description: 'Does this notice require any action from the recipient? What is the deadline?',
        required: true,
      },
      {
        id: 'fn-02',
        label: 'Material Information',
        description: 'Does the notice disclose information that could affect LP decision-making? Is it complete?',
        required: true,
      },
    ],
    promptAddendum: `## FUND NOTICE-SPECIFIC ANALYSIS

This is a Fund Notice. Notices vary widely — they may announce key person events, extension elections, conflicts, NAV adjustments, or other material fund events.

Focus on:
1. MATERIALITY — does this notice disclose a material event that triggers LP rights?
2. TIMING — is the notice timely per LPA requirements?
3. ACTION — does the LP need to do anything in response? By when?
4. RIGHTS — does this event trigger any LP rights (suspension, termination, voting)?`,
  },

  'advisory-materials': {
    additionalChecklist: [
      {
        id: 'am-01',
        label: 'LPAC Authority',
        description: 'Is the matter within the advisory committee\'s jurisdiction per the LPA? Is this advisory or decision-making?',
        required: true,
      },
      {
        id: 'am-02',
        label: 'Conflict Disclosure',
        description: 'Are all relevant conflicts of interest fully disclosed? Is the GP seeking a conflict waiver?',
        required: true,
      },
    ],
    promptAddendum: `## ADVISORY COMMITTEE MATERIALS-SPECIFIC ANALYSIS

These are LP Advisory Committee (LPAC) materials. Focus on:

1. JURISDICTION — is this matter within the LPAC's authority per the LPA?
2. CONFLICTS — is the GP seeking a conflict waiver? Are all conflicts fully disclosed?
3. PRECEDENT — would this decision set a precedent for future actions?
4. INFORMATION — is enough information provided for the LPAC to make an informed decision?

COMMON LPAC ISSUES:
- GP seeking blanket conflict waivers rather than transaction-specific approval
- Insufficient disclosure of economic impact on LPs
- Matters presented as "advisory" that are actually seeking binding approval
- Timing pressure that doesn't allow adequate review`,
  },
};

/**
 * Get sub-type-specific enhancements for the general module.
 * Returns additional checklist items and prompt text when the classified
 * document type has specific guidance, even though it uses the general module.
 *
 * Callers should only invoke this for document types without a specialized
 * module (i.e., where hasSpecializedModule() returns false). The registry
 * enforces this guard before calling — types with specialized modules will
 * return null here because they have no entry in SUB_TYPE_GUIDANCE, but the
 * contract should not be relied upon from the data alone.
 */
export function getSubTypeEnhancements(
  documentType: DocumentType,
): { additionalChecklist: ReviewChecklistItem[]; promptAddendum: string } | null {
  const guidance = SUB_TYPE_GUIDANCE[documentType];
  if (!guidance) return null;
  return {
    additionalChecklist: guidance.additionalChecklist,
    promptAddendum: guidance.promptAddendum,
  };
}
