import type { ReviewModuleDefinition } from './base';

/**
 * Co-Investment Agreement Review Module
 *
 * Co-investment documents govern side-by-side investments alongside the
 * main fund. Key concerns: allocation fairness, fee/carry treatment,
 * information rights, tag-along/drag-along, and exit mechanics.
 * 10-item mandatory checklist.
 */
export const coInvestModule: ReviewModuleDefinition = {
  documentType: 'co-invest',
  name: 'Co-Investment Agreement',

  checklist: [
    {
      id: 'ci-01',
      label: 'Allocation & Capacity Rights',
      description: 'How co-investment opportunities are allocated, capacity caps, priority of allocations, pro-rata vs discretionary',
      required: true,
    },
    {
      id: 'ci-02',
      label: 'Fee & Carry Treatment',
      description: 'Management fee on co-invest (typically reduced or zero), carried interest treatment, fee offset provisions',
      required: true,
    },
    {
      id: 'ci-03',
      label: 'Decision-Making & Governance',
      description: 'Who controls investment decisions, voting rights, board representation, reserved matters',
      required: true,
    },
    {
      id: 'ci-04',
      label: 'Funding & Capital Calls',
      description: 'Timing of capital calls, funding deadlines, default consequences, excuse/exclusion rights',
      required: true,
    },
    {
      id: 'ci-05',
      label: 'Information Rights',
      description: 'Access to portfolio company information, reporting frequency, audit rights, confidentiality restrictions on shared information',
      required: true,
    },
    {
      id: 'ci-06',
      label: 'Exit & Liquidity',
      description: 'Exit timing alignment with main fund, tag-along rights, drag-along obligations, transfer restrictions, secondary sale rights',
      required: true,
    },
    {
      id: 'ci-07',
      label: 'Expense Allocation',
      description: 'Deal expenses, broken-deal costs, ongoing operating expenses — allocation between main fund and co-investors',
      required: true,
    },
    {
      id: 'ci-08',
      label: 'Conflicts of Interest',
      description: 'GP conflicts between main fund and co-investors, allocation conflicts, preferential treatment risk',
      required: true,
    },
    {
      id: 'ci-09',
      label: 'Indemnification & Liability',
      description: 'Indemnification of GP/manager, liability caps, co-investor indemnification obligations',
      required: true,
    },
    {
      id: 'ci-10',
      label: 'Follow-On Investment Rights',
      description: 'Rights to participate in follow-on rounds, preemptive rights, anti-dilution, additional capital commitment obligations',
      required: true,
    },

    // Additional
    {
      id: 'ci-11',
      label: 'Tax Structuring',
      description: 'Blocker entity requirements, tax-exempt investor considerations, UBTI/ECI, withholding tax treatment',
      required: false,
    },
    {
      id: 'ci-12',
      label: 'Relationship to Main Fund',
      description: 'Integration with main fund LPA, parallel structure, cross-default provisions, wind-down coordination',
      required: false,
    },
  ],

  systemPromptAddendum: `## CO-INVESTMENT-SPECIFIC ANALYSIS

This is a Co-Investment Agreement — a side-by-side investment opportunity alongside the main fund. Co-investment terms are critical because they directly affect LP economics and alignment with the GP.

ANALYSIS APPROACH:
1. Economics: Are fees/carry on the co-invest truly reduced, or are there hidden costs?
2. Allocation fairness: Is the allocation methodology clear, equitable, and consistently applied?
3. Control: Does the co-investor have adequate governance rights, or is the GP operating with unchecked discretion?
4. Exit alignment: Can the co-investor exit when the main fund exits, or are they trapped?

COMMON CO-INVEST ISSUES:
- "No fee, no carry" that actually has organizational expenses or deal-by-deal carry
- Allocation methodology that gives GP full discretion with no standards or disclosure
- No tag-along rights — co-investor stuck while main fund exits
- Expense allocation that loads disproportionate costs onto co-investors
- Information rights that are weaker than main fund LP rights
- Follow-on funding obligations without adequate notice or opt-out
- Default provisions more punitive than main fund terms

MARKET BENCHMARKS:
- Institutional co-invest: typically 0% management fee, 0% carry (or reduced carry)
- Allocation: clear methodology with disclosure of how opportunities are distributed
- Exit: co-investors should exit pari passu with main fund absent good reason
- Information: at minimum, same reporting as main fund LPs
- Expenses: pro-rata based on commitment size is market standard`,

  gpFraming: `As GP counsel reviewing this co-investment agreement:
- Ensure allocation methodology protects against claims of preferential treatment
- Verify fee/carry structure is clearly documented and consistent with side letter commitments
- Check that governance provisions give GP sufficient control over investment decisions
- Confirm expense allocation is defensible and consistently applied across co-investors
- Verify exit mechanics work for both the main fund and co-investor timelines`,

  lpFraming: `As LP counsel reviewing this co-investment agreement:
- Scrutinize the fee/carry structure — look for hidden economics beyond headline "no fee, no carry"
- Verify allocation methodology is transparent and equitable
- Ensure robust tag-along rights so you are not trapped when the main fund exits
- Check information rights are at least as strong as main fund LP rights
- Review follow-on obligations — can you opt out without penalty?
- Verify expense allocation is pro-rata and not disproportionately loaded onto co-investors`,
};
