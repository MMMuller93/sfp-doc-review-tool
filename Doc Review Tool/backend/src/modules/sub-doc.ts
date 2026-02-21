import type { ReviewModuleDefinition } from './base';

/**
 * Subscription Document Review Module
 *
 * Subscription documents are legal agreements where investors commit capital.
 * The focus is on representations, warranties, power of attorney grants,
 * and investor qualification requirements. 9-item mandatory checklist.
 */
export const subDocModule: ReviewModuleDefinition = {
  documentType: 'sub-doc',
  name: 'Subscription Document',

  checklist: [
    {
      id: 'sub-01',
      label: 'Capital Commitment Terms',
      description: 'Commitment amount, payment schedule, default provisions, default remedies (forfeiture, forced sale, interest), cure period',
      required: true,
    },
    {
      id: 'sub-02',
      label: 'Representations & Warranties',
      description: 'Scope and survival of investor representations: accredited/qualified status, anti-money laundering, no ERISA plan assets, authority to invest, no tax-exempt concerns',
      required: true,
    },
    {
      id: 'sub-03',
      label: 'Indemnification by Investor',
      description: 'Investor indemnification obligations for breach of reps, scope (fund + GP + affiliates), survival period, potential uncapped liability',
      required: true,
    },
    {
      id: 'sub-04',
      label: 'Power of Attorney',
      description: 'Scope of POA granted to GP, irrevocability, what actions GP can take on behalf of LP (amendments, tax filings, regulatory filings)',
      required: true,
    },
    {
      id: 'sub-05',
      label: 'Investor Qualification',
      description: 'Accredited investor / qualified purchaser / qualified client status requirements, verification methodology',
      required: true,
    },
    {
      id: 'sub-06',
      label: 'ERISA & Benefit Plan Status',
      description: 'ERISA plan asset status, benefit plan investor percentage limitations, VCOC/REOC operating company exemption reliance',
      required: true,
    },
    {
      id: 'sub-07',
      label: 'Tax Certifications',
      description: 'W-9/W-8 requirements, FATCA compliance, tax-exempt status declarations, ECI/UBTI considerations',
      required: true,
    },
    {
      id: 'sub-08',
      label: 'AML/KYC Requirements',
      description: 'Anti-money laundering representations, OFAC compliance, beneficial ownership disclosure, source of funds verification',
      required: true,
    },
    {
      id: 'sub-09',
      label: 'Acceptance & Rejection',
      description: 'GP right to accept or reject subscriptions (in whole or in part), closing mechanics, capital call upon acceptance',
      required: true,
    },

    // Additional
    {
      id: 'sub-10',
      label: 'Side Letter Reference',
      description: 'Whether the subscription agreement references or incorporates a side letter, integration clause implications',
      required: false,
    },
    {
      id: 'sub-11',
      label: 'Electronic Delivery Consent',
      description: 'Consent to electronic delivery of notices, reports, K-1s, and other communications',
      required: false,
    },
  ],

  systemPromptAddendum: `## SUBSCRIPTION DOCUMENT-SPECIFIC ANALYSIS

This is a Subscription Document — the investor's agreement to commit capital to the fund. Focus on the obligations the investor is taking on and the rights being granted to the GP.

ANALYSIS APPROACH:
1. Investor obligations: What is the investor committing to? What are the default consequences?
2. Representations scope: Are the reps reasonable in scope and survival? Any unusual reps?
3. Power of attorney: How broad is the POA grant? Any overreach?
4. Compliance: Are the regulatory/tax requirements properly addressed?

COMMON SUB-DOC ISSUES:
- Overly broad investor indemnification with no cap or limitation
- Power of attorney that extends beyond standard fund operations
- Default provisions with excessive penalties (forfeiture of entire interest)
- Missing cure period for capital call defaults
- Representations that survive indefinitely rather than for a reasonable period
- Acceptance clause giving GP sole discretion with no standards`,

  gpFraming: `As GP counsel reviewing this subscription document:
- Ensure investor representations are comprehensive enough to protect the fund
- Verify compliance sections address all regulatory requirements (AML, ERISA, FATCA)
- Check that default provisions provide adequate remedies for capital call defaults
- Confirm POA scope covers all necessary fund operations without gaps`,

  lpFraming: `As LP counsel reviewing this subscription document:
- Scrutinize the breadth of representations — flag any that are unusual or overreaching
- Check investor indemnification scope — should be limited to breach of reps, not unlimited
- Review POA grants carefully — should be limited to standard fund operations
- Verify default provisions include reasonable cure periods and proportionate remedies
- Check if indemnification obligations are capped or have a survival period`,
};
