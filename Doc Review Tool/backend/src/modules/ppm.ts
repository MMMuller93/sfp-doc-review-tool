import type { ReviewModuleDefinition } from './base';

/**
 * PPM (Private Placement Memorandum) Review Module
 *
 * PPMs are disclosure documents, not negotiation documents. The focus is on
 * adequacy and accuracy of disclosures, consistency with the LPA, and
 * completeness of risk factors. 8-item mandatory checklist.
 */
export const ppmModule: ReviewModuleDefinition = {
  documentType: 'ppm',
  name: 'Private Placement Memorandum',

  checklist: [
    {
      id: 'ppm-01',
      label: 'Investment Strategy & Objectives',
      description: 'Clarity of investment strategy, geographic/sector focus, target returns, investment restrictions, leverage policy',
      required: true,
    },
    {
      id: 'ppm-02',
      label: 'Fee & Expense Disclosure',
      description: 'Management fee description, carry mechanics, organizational expenses, operating expenses, broken-deal costs — check consistency with LPA if available',
      required: true,
    },
    {
      id: 'ppm-03',
      label: 'Risk Factors',
      description: 'Completeness of risk disclosures: market risk, liquidity risk, leverage risk, concentration risk, key person risk, regulatory risk, conflicts risk',
      required: true,
    },
    {
      id: 'ppm-04',
      label: 'Conflicts of Interest',
      description: 'Disclosure of GP conflicts: other funds, co-investments, affiliated transactions, allocation of opportunities, personal investments by GP personnel',
      required: true,
    },
    {
      id: 'ppm-05',
      label: 'Track Record & Performance',
      description: 'Prior fund performance data presentation, benchmark comparison, track record disclaimers, attribution of returns, SEC marketing rule compliance',
      required: true,
    },
    {
      id: 'ppm-06',
      label: 'Regulatory Status & Compliance',
      description: 'SEC/state registration status, Form ADV cross-reference, exemptions relied upon (3(c)(1)/3(c)(7)), ERISA status, Volcker Rule considerations',
      required: true,
    },
    {
      id: 'ppm-07',
      label: 'Tax Considerations',
      description: 'Pass-through taxation, UBTI/ECI considerations, FIRPTA, state tax nexus, carried interest tax treatment, PFIC risk',
      required: true,
    },
    {
      id: 'ppm-08',
      label: 'Subscription Process',
      description: 'Minimum commitment, closing mechanics, acceptance/rejection rights, capital call procedures reference, investor qualification requirements',
      required: true,
    },

    // Additional
    {
      id: 'ppm-09',
      label: 'Service Providers',
      description: 'Disclosure of administrator, auditor, legal counsel, custodian, prime broker — independence and potential conflicts',
      required: false,
    },
    {
      id: 'ppm-10',
      label: 'Valuation Policy',
      description: 'NAV calculation methodology, fair value hierarchy, frequency of valuations, use of independent valuators',
      required: false,
    },
  ],

  systemPromptAddendum: `## PPM-SPECIFIC ANALYSIS

This is a Private Placement Memorandum — a disclosure document. Your primary focus is on ADEQUACY and ACCURACY of disclosures, not negotiation.

ANALYSIS APPROACH:
1. Disclosure completeness: Are all material terms and risks adequately disclosed?
2. Consistency: Do the economic terms described match what would be in a typical LPA?
3. Regulatory compliance: Are the proper exemptions cited? Is the regulatory status accurate?
4. Red flags: Are there unusual terms buried in disclosure language that deserve scrutiny?

COMMON PPM ISSUES:
- Vague or overly broad investment strategy with no real constraints
- Fee disclosures that don't match LPA terms (or lack specificity)
- Missing or inadequate risk factors for the strategy type
- Conflicts of interest that are disclosed but not mitigated
- Track record presented without proper disclaimers or context
- Outdated regulatory status or missing Form ADV references
- Tax section that doesn't address UBTI/ECI for tax-exempt investors`,

  gpFraming: `As GP counsel reviewing this PPM:
- Verify all disclosures are accurate and consistent with the LPA
- Ensure risk factors are comprehensive enough to limit liability exposure
- Check that track record presentation complies with SEC marketing rule
- Confirm regulatory status and exemptions are current and accurate
- Flag any disclosure gaps that could create litigation risk`,

  lpFraming: `As LP counsel reviewing this PPM:
- Evaluate whether disclosures give a complete picture of the investment
- Check if fee and expense disclosures match what you'd expect in the LPA
- Assess whether risk factors adequately describe the actual risks of the strategy
- Scrutinize conflict of interest disclosures — are they complete and are mitigants adequate?
- Verify track record data is presented fairly with proper context`,
};
