import { useState } from 'react';
import DocumentViewer from './DocumentViewer';
import ResultsDashboard from './ResultsDashboard';
import ChatInterface from './ChatInterface';
import type { AnalysisResult, Issue } from '../types';

interface AnnotatedResultsViewProps {
  result: AnalysisResult;
  documentText: string;
  documentName: string;
  sessionId: string;
  referenceDocumentText?: string;
  referenceDocumentName?: string;
}

export default function AnnotatedResultsView({
  result,
  documentText,
  documentName,
  sessionId,
  referenceDocumentText,
  referenceDocumentName,
}: AnnotatedResultsViewProps) {
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);

  // Combine all issues for document highlighting
  const allIssues: Issue[] = [...result.criticalIssues, ...result.issues];

  const handleHighlightClick = (issueId: string) => {
    setActiveIssueId(issueId);
  };

  const handleIssueSelect = (issueId: string) => {
    setActiveIssueId(issueId);
  };

  return (
    <div id="results-section">
      {/* Split-pane layout: document left, results right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen border-t border-stone-900">
        {/* Left: Document Viewer */}
        <div className="bg-stone-950 border-r border-stone-800 lg:sticky lg:top-0 lg:h-screen overflow-hidden hidden lg:block">
          <DocumentViewer
            documentText={documentText}
            documentName={documentName}
            issues={allIssues}
            activeIssueId={activeIssueId}
            onHighlightClick={handleHighlightClick}
          />
        </div>

        {/* Right: Results + Chat */}
        <div className="bg-stone-950 overflow-y-auto lg:max-h-screen">
          <ResultsDashboard
            result={result}
            onIssueSelect={handleIssueSelect}
            activeIssueId={activeIssueId}
            embedded
          />

          {/* Chat Interface */}
          <div className="px-6 pb-12">
            <ChatInterface
              sessionId={sessionId}
              analysisResult={result}
              targetDocumentText={documentText}
              targetDocumentName={documentName}
              referenceDocumentText={referenceDocumentText}
              referenceDocumentName={referenceDocumentName}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Document tab (shown on small screens only) */}
      <MobileDocumentTab
        documentText={documentText}
        documentName={documentName}
        issues={allIssues}
        activeIssueId={activeIssueId}
        onHighlightClick={handleHighlightClick}
      />
    </div>
  );
}

/**
 * Mobile-only floating button that opens the document viewer in a modal overlay.
 * Only visible on screens smaller than lg breakpoint.
 */
function MobileDocumentTab({
  documentText,
  documentName,
  issues,
  activeIssueId,
  onHighlightClick,
}: {
  documentText: string;
  documentName: string;
  issues: Issue[];
  activeIssueId: string | null;
  onHighlightClick: (issueId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 bg-bronze-500 hover:bg-bronze-400 text-stone-950 font-semibold rounded-lg shadow-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        View Document
      </button>

      {/* Full-screen overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800">
              <span className="text-sm font-semibold text-bronze-50">Document View</span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-bronze-200 hover:text-bronze-50 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DocumentViewer
                documentText={documentText}
                documentName={documentName}
                issues={issues}
                activeIssueId={activeIssueId}
                onHighlightClick={(issueId) => {
                  onHighlightClick(issueId);
                  setIsOpen(false); // Close overlay to show the issue
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
