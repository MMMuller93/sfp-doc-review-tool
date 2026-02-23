import { useMemo, useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';
import type { Issue, RiskLevel } from '../types';

interface DocumentViewerProps {
  documentText: string;
  documentName: string;
  issues: Issue[];
  activeIssueId?: string | null;
  onHighlightClick: (issueId: string) => void;
}

interface HighlightRegion {
  start: number;
  end: number;
  issueId: string;
  risk: RiskLevel;
}

const RISK_COLORS: Record<RiskLevel, { bg: string; activeBg: string; border: string }> = {
  blocker: { bg: 'bg-red-500/20', activeBg: 'bg-red-500/40', border: 'border-b-2 border-red-500/40' },
  negotiate: { bg: 'bg-amber-500/20', activeBg: 'bg-amber-500/40', border: 'border-b-2 border-amber-500/40' },
  standard: { bg: 'bg-blue-500/20', activeBg: 'bg-blue-500/40', border: 'border-b-2 border-blue-500/40' },
};

const RISK_PRIORITY: Record<RiskLevel, number> = { blocker: 0, negotiate: 1, standard: 2 };

/**
 * Best-effort fallback: try to find a quote in the document text
 * via exact/case-insensitive indexOf when backend offsets are missing.
 * Handles ~60% of PDF quotes; the rest won't get highlights.
 */
function findFallbackOffset(quote: string, documentText: string): { start: number; end: number } | undefined {
  if (!quote || quote.length < 10 || !documentText) return undefined;

  // Try exact match
  let idx = documentText.indexOf(quote);
  if (idx >= 0) return { start: idx, end: idx + quote.length };

  // Try case-insensitive
  const lowerDoc = documentText.toLowerCase();
  const lowerQuote = quote.toLowerCase();
  idx = lowerDoc.indexOf(lowerQuote);
  if (idx >= 0) return { start: idx, end: idx + quote.length };

  return undefined;
}

/**
 * Merge overlapping highlight regions, keeping the highest-severity one.
 */
function mergeRegions(regions: HighlightRegion[]): HighlightRegion[] {
  if (regions.length === 0) return [];

  const sorted = [...regions].sort(
    (a, b) => a.start - b.start || RISK_PRIORITY[a.risk] - RISK_PRIORITY[b.risk],
  );
  const merged: HighlightRegion[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current.start < last.end) {
      // Overlap — extend, keep higher severity
      if (RISK_PRIORITY[current.risk] < RISK_PRIORITY[last.risk]) {
        merged[merged.length - 1] = {
          ...current,
          start: last.start,
          end: Math.max(last.end, current.end),
        };
      } else {
        merged[merged.length - 1] = { ...last, end: Math.max(last.end, current.end) };
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export default function DocumentViewer({
  documentText,
  documentName,
  issues,
  activeIssueId,
  onHighlightClick,
}: DocumentViewerProps) {
  const activeHighlightRef = useRef<HTMLSpanElement>(null);

  // Auto-scroll to active highlight
  useEffect(() => {
    if (activeIssueId && activeHighlightRef.current) {
      activeHighlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIssueId]);

  // Build segments with highlights — memoized to avoid reprocessing large documents
  const { segments, highlightCount } = useMemo(() => {
    const regions: HighlightRegion[] = [];

    for (const issue of issues) {
      const offsets = issue.targetRef?.highlightOffsets;
      if (offsets && offsets.start >= 0 && offsets.end > offsets.start) {
        regions.push({
          start: offsets.start,
          end: Math.min(offsets.end, documentText.length),
          issueId: issue.id,
          risk: issue.risk,
        });
      } else {
        // Fallback: simple string matching
        const fallback = findFallbackOffset(issue.targetRef?.quote || '', documentText);
        if (fallback) {
          regions.push({
            start: fallback.start,
            end: Math.min(fallback.end, documentText.length),
            issueId: issue.id,
            risk: issue.risk,
          });
        }
      }
    }

    const merged = mergeRegions(regions);

    if (merged.length === 0) {
      return {
        segments: [{ text: documentText, highlight: null as HighlightRegion | null }],
        highlightCount: 0,
      };
    }

    // Split text into alternating plain/highlighted segments
    const segs: Array<{ text: string; highlight: HighlightRegion | null }> = [];
    let cursor = 0;

    for (const region of merged) {
      const start = Math.max(cursor, Math.min(region.start, documentText.length));
      const end = Math.min(region.end, documentText.length);

      if (start > cursor) {
        segs.push({ text: documentText.slice(cursor, start), highlight: null });
      }

      if (end > start) {
        segs.push({ text: documentText.slice(start, end), highlight: region });
      }

      cursor = end;
    }

    if (cursor < documentText.length) {
      segs.push({ text: documentText.slice(cursor), highlight: null });
    }

    return { segments: segs, highlightCount: merged.length };
  }, [documentText, issues]);

  return (
    <div className="flex flex-col h-full">
      {/* Document header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 bg-stone-900 border-b border-stone-800">
        <FileText className="w-5 h-5 text-bronze-500" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-bronze-50 truncate">{documentName}</h3>
        <span className="ml-auto text-xs text-bronze-200/50">
          {highlightCount} highlight{highlightCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Scrollable document body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 max-h-[calc(100vh-120px)]">
        <div
          className="text-bronze-200/90 text-sm leading-relaxed font-serif"
          style={{ whiteSpace: 'pre-line' }}
        >
          {segments.map((seg, idx) => {
            if (!seg.highlight) {
              return <span key={idx}>{seg.text}</span>;
            }

            const colors = RISK_COLORS[seg.highlight.risk];
            const isActive = activeIssueId === seg.highlight.issueId;

            return (
              <span
                key={idx}
                ref={isActive ? activeHighlightRef : undefined}
                role="mark"
                className={`cursor-pointer rounded-sm ${colors.border} transition-colors ${
                  isActive ? colors.activeBg : colors.bg
                }`}
                onClick={() => onHighlightClick(seg.highlight!.issueId)}
                title="Click to view issue"
              >
                {seg.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
