import type { ReviewModuleDefinition } from './base';

/**
 * LPA (Limited Partnership Agreement) Review Module
 *
 * The most comprehensive module — LPAs are the governing documents of a fund
 * and contain the most negotiable terms. 13-item mandatory checklist covers
 * all major negotiation points for both GP and LP perspectives.
 */
export const lpaModule: ReviewModuleDefinition = {
  documentType: 'lpa',
  name: 'Limited Partnership Agreement',

  checklist: [
    // Economics (items 1-5)
    {
      id: 'lpa-01',
      label: 'Management Fee',
      description: 'Rate, basis (committed vs invested capital), step-down timing, offset provisions, fee waiver for GP affiliates',
      required: true,
    },
    {
      id: 'lpa-02',
      label: 'Carried Interest',
      description: 'Carry percentage, hurdle rate/preferred return, catch-up, European vs American waterfall, clawback mechanism and escrow',
      required: true,
    },
    {
      id: 'lpa-03',
      label: 'Preferred Return & Waterfall',
      description: 'Preferred return rate, compounding, distribution waterfall mechanics, whole-fund vs deal-by-deal',
      required: true,
    },
    {
      id: 'lpa-04',
      label: 'Clawback',
      description: 'GP clawback obligation, escrow percentage, post-tax vs pre-tax, joint and several vs several, survival period',
      required: true,
    },
    {
      id: 'lpa-05',
      label: 'Fund Expenses & Fee Offset',
      description: 'Organizational expense cap, operating expenses borne by fund, broken-deal expenses, fee offset mechanics for portfolio company fees',
      required: true,
    },

    // Governance (items 6-9)
    {
      id: 'lpa-06',
      label: 'Key Person',
      description: 'Named key persons, trigger events (departure, reduced time commitment), consequences (suspension, termination), cure period',
      required: true,
    },
    {
      id: 'lpa-07',
      label: 'GP Removal',
      description: 'Removal threshold (supermajority required), for-cause vs no-fault, consequences of removal (carry forfeiture, fee termination)',
      required: true,
    },
    {
      id: 'lpa-08',
      label: 'LP Advisory Committee',
      description: 'LPAC composition, authority (conflict approval, valuation, extension consent), meeting frequency, information rights',
      required: true,
    },
    {
      id: 'lpa-09',
      label: 'Term & Extensions',
      description: 'Fund term, investment period length, extension rights (GP unilateral vs LP consent), number of extensions',
      required: true,
    },

    // Liability & Protection (items 10-11)
    {
      id: 'lpa-10',
      label: 'Indemnification & Exculpation',
      description: 'Standard of care (gross negligence vs ordinary negligence), indemnification scope, advancement of expenses, carve-outs for fraud/willful misconduct',
      required: true,
    },
    {
      id: 'lpa-11',
      label: 'Conflicts of Interest',
      description: 'Allocation policy, co-investment obligations, GP affiliate transactions, subsequent fund restrictions, LPAC conflict approval process',
      required: true,
    },

    // LP Rights (items 12-13)
    {
      id: 'lpa-12',
      label: 'Transfer Restrictions',
      description: 'LP transfer rights, GP consent requirements, ROFR, minimum transfer amounts, transfer fee',
      required: true,
    },
    {
      id: 'lpa-13',
      label: 'Reporting & Information Rights',
      description: 'Quarterly/annual reporting obligations, audit rights, capital account statements, K-1 timing, ILPA reporting template compliance',
      required: true,
    },

    // Additional items (not mandatory but address if present)
    {
      id: 'lpa-14',
      label: 'Excuse/Exclude Rights',
      description: 'LP right to be excused from specific investments (ERISA, regulatory, ethical), notice requirements',
      required: false,
    },
    {
      id: 'lpa-15',
      label: 'Recycling & Reinvestment',
      description: 'Capital recycling provisions, reinvestment limitations, impact on investment period',
      required: false,
    },
    {
      id: 'lpa-16',
      label: 'Borrowing & Credit Facilities',
      description: 'Subscription credit facility terms, borrowing limits, duration, impact on preferred return calculations',
      required: false,
    },
  ],

  systemPromptAddendum: `## LPA-SPECIFIC ANALYSIS

This is a Limited Partnership Agreement — the foundational governance document of the fund. Your analysis must be comprehensive and cover all major negotiation points.

PRIORITIES:
1. Economics: Management fee, carry, waterfall, clawback, expenses — these have direct P&L impact
2. Governance: Key person, GP removal, LPAC — these protect against bad outcomes
3. Liability: Indemnification standard — this is the most litigated provision in fund documents
4. LP Rights: Transfer, reporting, excuse — these affect operational flexibility

BENCHMARKS:
- Management Fee: Market is 1.5-2.0% on committed during IP, 1.0-1.5% on invested/NAV post-IP
- Carry: Market is 20% over 8% preferred return with European waterfall for first-time funds
- Clawback: Market is GP clawback with 50-100% escrow, post-tax, several (not joint and several)
- Key Person: Market is 2-3 named persons, suspension trigger, 180-day cure
- GP Removal: Market is 66.7-75% no-fault removal with carry reduction
- Indemnification: Market is gross negligence/willful misconduct standard, NOT ordinary negligence
- LPAC: Market is quarterly meetings, conflict approval authority, 3-5 members`,

  gpFraming: `As GP counsel reviewing this LPA:
- Protect operational flexibility and investment discretion
- Ensure management fee and carry economics are preserved
- Limit LP governance rights to market-standard levels
- Minimize liability exposure — push for broad indemnification
- Avoid precedents that could spread via MFN to other LPs
- Flag any provisions that would create undue administrative burden`,

  lpFraming: `As LP counsel reviewing this LPA:
- Protect capital and maximize enforceable investor rights
- Ensure economics are fair and aligned with market standards (ILPA Principles)
- Secure meaningful governance rights (key person, GP removal, LPAC)
- Demand transparency — robust reporting, audit rights, K-1 timing
- Verify indemnification standard protects against GP misconduct
- Check for adequate transfer rights and liquidity options`,
};
