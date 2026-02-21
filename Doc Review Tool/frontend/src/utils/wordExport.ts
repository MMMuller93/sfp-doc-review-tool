import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx';
import { saveAs } from 'file-saver';
import type { AnalysisResult } from '../types';

export async function exportToWord(result: AnalysisResult): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'Document Analysis Report',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Metadata
          new Paragraph({
            text: `Analysis Date: ${new Date(result.metadata.analysisTimestamp).toLocaleString('en-US', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Target Document: ${result.metadata.targetDocumentName}`,
            spacing: { after: 100 },
          }),
          ...(result.metadata.referenceDocumentName
            ? [
                new Paragraph({
                  text: `Reference Document: ${result.metadata.referenceDocumentName}`,
                  spacing: { after: 100 },
                }),
              ]
            : []),
          new Paragraph({
            text: `AI Model: ${result.metadata.modelUsed}`,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Perspective: ${result.protectingRole.toUpperCase()}`,
            spacing: { after: 400 },
          }),

          // Verdict Section
          new Paragraph({
            text: 'VERDICT',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Decision: ${result.verdict.toUpperCase().replace(/-/g, ' ')}`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: result.verdictRationale,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Key Action: ', bold: true }),
              new TextRun(result.keyAction),
            ],
            spacing: { after: 400 },
          }),

          // Critical Issues
          ...(result.criticalIssues.length > 0
            ? [
                new Paragraph({
                  text: `CRITICAL ISSUES (${result.criticalIssues.length})`,
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                }),
                ...result.criticalIssues.flatMap((issue) => createIssueParagraphs(issue)),
              ]
            : []),

          // All Issues
          ...(result.issues.length > 0
            ? [
                new Paragraph({
                  text: `ALL ISSUES (${result.issues.length})`,
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                }),
                ...result.issues.flatMap((issue) => createIssueParagraphs(issue)),
              ]
            : []),

          // Regulatory Flags
          ...(result.regulatoryFlags.length > 0
            ? [
                new Paragraph({
                  text: 'REGULATORY FLAGS',
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                }),
                ...result.regulatoryFlags.flatMap((flag) => [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${flag.category.toUpperCase().replace(/-/g, ' / ')}: `,
                        bold: true,
                      }),
                      new TextRun(flag.status.toUpperCase()),
                    ],
                    spacing: { after: 100 },
                  }),
                  new Paragraph({
                    text: flag.summary,
                    spacing: { after: 300 },
                  }),
                ]),
              ]
            : []),

          // Assumptions
          ...(result.assumptions.length > 0
            ? [
                new Paragraph({
                  text: 'ASSUMPTIONS',
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 400, after: 200 },
                }),
                ...result.assumptions.map(
                  (assumption) =>
                    new Paragraph({
                      text: `• ${assumption}`,
                      spacing: { after: 100 },
                    })
                ),
              ]
            : []),

          // Disclaimer
          new Paragraph({
            text: '',
            spacing: { before: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'DISCLAIMER: ',
                bold: true,
              }),
              new TextRun(
                'This analysis is generated by AI and provided for informational purposes only. It does not constitute legal advice. Material errors or omissions may be present. Always consult qualified legal counsel before executing fund documents.'
              ),
            ],
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            },
            spacing: { before: 400, after: 200 },
          }),
        ],
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `analysis-${result.metadata.targetDocumentName.replace(/\.[^/.]+$/, '')}-${timestamp}.docx`;
  saveAs(blob, filename);
}

function createIssueParagraphs(issue: AnalysisResult['issues'][0]): Paragraph[] {
  return [
    // Issue Title
    new Paragraph({
      text: issue.title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 200 },
    }),

    // Risk and Topic
    new Paragraph({
      children: [
        new TextRun({ text: `Risk Level: ${issue.risk.toUpperCase()}`, bold: true }),
        new TextRun(' | '),
        new TextRun(
          `Topic: ${issue.topic
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')}`
        ),
      ],
      spacing: { after: 200 },
    }),

    // Summary
    new Paragraph({
      children: [new TextRun({ text: 'Summary: ', bold: true }), new TextRun(issue.summary)],
      spacing: { after: 200 },
    }),

    // Impact Analysis
    new Paragraph({
      children: [new TextRun({ text: 'Impact: ', bold: true }), new TextRun(issue.impactAnalysis)],
      spacing: { after: 200 },
    }),

    // Document Reference
    new Paragraph({
      children: [
        new TextRun({ text: 'Document Reference: ', bold: true }),
        new TextRun(`${issue.targetRef.locator} - "${issue.targetRef.quote}"`),
      ],
      spacing: { after: 200 },
    }),

    // Reference Document (if available)
    ...(issue.referenceRef
      ? [
          new Paragraph({
            children: [
              new TextRun({ text: 'Reference Document: ', bold: true }),
              new TextRun(`${issue.referenceRef.locator} - "${issue.referenceRef.quote}"`),
            ],
            spacing: { after: 200 },
          }),
        ]
      : []),

    // Market Context (if available)
    ...(issue.marketContext
      ? [
          new Paragraph({
            children: [
              new TextRun({ text: 'Market Context: ', bold: true }),
              new TextRun(issue.marketContext),
            ],
            spacing: { after: 200 },
          }),
        ]
      : []),

    // Suggested Fixes
    new Paragraph({
      children: [new TextRun({ text: 'Suggested Fixes:', bold: true })],
      spacing: { before: 200, after: 100 },
    }),

    ...issue.fixes.flatMap((fix) => [
      new Paragraph({
        children: [
          new TextRun({
            text: `${fix.approach === 'soft' ? 'Soft' : 'Hard'} Approach: `,
            bold: true,
          }),
          new TextRun(fix.description),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Original (Remove): ', bold: true, color: 'CC0000' })],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: fix.redline.original, italics: true })],
        indent: { left: 300 },
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Proposed (Insert): ', bold: true, color: '00AA00' })],
        spacing: { after: 50 },
      }),
      new Paragraph({
        children: [new TextRun({ text: fix.redline.proposed, italics: true })],
        indent: { left: 300 },
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Market Justification: ', bold: true }),
          new TextRun(fix.redline.marketJustification),
        ],
        spacing: { after: 200 },
      }),
    ]),

    // Separator
    new Paragraph({
      text: '―――――――――――――――――――――――――――――――――――――――――――',
      spacing: { before: 200, after: 300 },
    }),
  ];
}
