import type { ReviewModuleDefinition } from './base';

/**
 * Side Letter Review Module
 *
 * Side letters modify the LPA for specific LPs. The focus is on MFN rights,
 * fee concessions, co-investment rights, and how modifications interact
 * with the LPA terms. 8-item mandatory checklist.
 */
export const sideLetterModule: ReviewModuleDefinition = {
  documentType: 'side-letter',
  name: 'Side Letter',

  checklist: [
    {
      id: 'sl-01',
      label: 'Most Favored Nation (MFN)',
      description: 'MFN election rights, carve-outs/exclusions (commitment-based, seed investor, GP affiliates), notification mechanics, opt-in procedure, materiality threshold',
      required: true,
    },
    {
      id: 'sl-02',
      label: 'Fee Concessions',
      description: 'Management fee reductions, carry modifications, fee rebates, netting provisions, commitment-based fee tiers',
      required: true,
    },
    {
      id: 'sl-03',
      label: 'Co-Investment Rights',
      description: 'Co-investment allocation rights (pro rata, priority, guaranteed), minimum deal size, fee/carry terms on co-investments, information rights on co-invest deals',
      required: true,
    },
    {
      id: 'sl-04',
      label: 'Reporting Enhancements',
      description: 'Additional reporting beyond LPA requirements, frequency, format (ILPA template), look-through transparency, ESG reporting, position-level detail',
      required: true,
    },
    {
      id: 'sl-05',
      label: 'Transfer & Liquidity',
      description: 'Enhanced transfer rights, pre-approved transferees, reduced GP consent standards, secondary market provisions',
      required: true,
    },
    {
      id: 'sl-06',
      label: 'ERISA & Tax Provisions',
      description: 'ERISA plan asset carve-outs, VCOC/REOC commitments, UBTI/ECI limitations, tax gross-up provisions, withholding tax protections',
      required: true,
    },
    {
      id: 'sl-07',
      label: 'Confidentiality Exceptions',
      description: 'FOIA/public records exceptions, disclosure to advisors/consultants, regulatory disclosure rights, portfolio company confidentiality',
      required: true,
    },
    {
      id: 'sl-08',
      label: 'Governance Rights',
      description: 'LPAC seat rights, observer rights, consent rights on specific actions, key person notification, GP removal voting enhancements',
      required: true,
    },

    // Additional
    {
      id: 'sl-09',
      label: 'Excuse/Exclude Rights',
      description: 'Enhanced excuse rights beyond LPA, specific investment type exclusions, ethical/ESG-based exclusions',
      required: false,
    },
    {
      id: 'sl-10',
      label: 'Integration & Conflicts',
      description: 'Integration clause with LPA, which document controls on conflict, amendment requirements for side letter terms',
      required: false,
    },
  ],

  systemPromptAddendum: `## SIDE LETTER-SPECIFIC ANALYSIS

This is a Side Letter — a bilateral agreement modifying the LPA for a specific LP. Side letters are heavily negotiated and reveal the true economic and governance terms of the fund.

ANALYSIS APPROACH:
1. MFN: This is the most critical provision. Evaluate the scope, carve-outs, and practical effectiveness
2. Economics: Fee concessions and co-investment terms have direct P&L impact
3. Governance: Enhanced rights may or may not be available via MFN to other LPs
4. Integration: How do these terms interact with (and potentially conflict with) the LPA?

KEY SIDE LETTER DYNAMICS:
- MFN carve-outs can effectively nullify MFN rights — count and categorize them
- Fee concessions often come with commitment-size thresholds
- Co-investment rights vary enormously: best efforts → pro rata → guaranteed allocation
- FOIA exceptions are critical for public pension LPs
- ERISA provisions affect the fund's ability to accept benefit plan investors

MARKET BENCHMARKS:
- MFN: Market standard includes 5-10 carve-outs (capacity-based, regulatory, seed investor, GP affiliate)
- Fee: 25-50 bps reduction for $50M+ commitments; 50-75 bps for $100M+
- Co-invest: Pro rata allocation rights for top-quartile commitments
- Reporting: ILPA template quarterly, audited annual, K-1 by March 15`,

  gpFraming: `As GP counsel reviewing this side letter:
- Ensure MFN carve-outs are broad enough to protect key relationships
- Check that fee concessions don't create unsustainable economics when aggregated
- Verify co-investment rights don't constrain deal allocation flexibility
- Confirm enhanced reporting is operationally feasible
- Watch for provisions that could spread via MFN to other LPs`,

  lpFraming: `As LP counsel reviewing this side letter:
- Evaluate MFN provision effectiveness — are carve-outs reasonable or do they gut the right?
- Assess fee concessions against market benchmarks for your commitment size
- Verify co-investment rights are meaningful (allocation methodology, minimums, fee terms)
- Check that FOIA/confidentiality exceptions are adequate for your regulatory requirements
- Confirm ERISA provisions provide the protections you need`,
};
