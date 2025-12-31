import { useState } from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon, XCircle, ChevronDown, Copy, Check, Shield, Info, Calendar, FileText, Cpu, Download, Code } from 'lucide-react';
import type { AnalysisResult, Issue, SuggestedFix, RegulatoryFlag } from '../types';
import { exportToWord } from '../utils/wordExport';

interface ResultsDashboardProps {
  result: AnalysisResult;
}

// Helper component for displaying regulatory flags
function RegulatoryFlagCard({ flag }: { flag: RegulatoryFlag }) {
  const getStatusConfig = (status: RegulatoryFlag['status']) => {
    switch (status) {
      case 'clear':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/50',
          label: 'Clear',
        };
      case 'flag':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          label: 'Flagged',
        };
      case 'needs-review':
        return {
          icon: AlertOctagon,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/50',
          label: 'Needs Review',
        };
    }
  };

  const statusConfig = getStatusConfig(flag.status);
  const StatusIcon = statusConfig.icon;

  const formatCategory = (category: string) => {
    return category.toUpperCase().replace(/-/g, ' / ');
  };

  return (
    <div className={`rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor} p-4`}>
      <div className="flex items-start gap-4">
        <StatusIcon className={`w-6 h-6 ${statusConfig.color} flex-shrink-0 mt-0.5`} strokeWidth={1.5} />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-semibold text-bronze-50">{formatCategory(flag.category)}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-bronze-200/80 text-sm leading-relaxed">{flag.summary}</p>
        </div>
      </div>
    </div>
  );
}

// Helper component for displaying suggested fixes with redlines
function SuggestedFixCard({ fix }: { fix: SuggestedFix }) {
  const [copiedRedline, setCopiedRedline] = useState(false);

  const handleCopyRedline = () => {
    const redlineText = `Original: ${fix.redline.original}\n\nProposed: ${fix.redline.proposed}`;
    navigator.clipboard.writeText(redlineText);
    setCopiedRedline(true);
    setTimeout(() => setCopiedRedline(false), 2000);
  };

  const approachConfig =
    fix.approach === 'soft'
      ? { label: 'Soft Approach', color: 'text-blue-400', bgColor: 'bg-blue-500/10' }
      : { label: 'Hard Approach', color: 'text-orange-400', bgColor: 'bg-orange-500/10' };

  return (
    <div className="bg-stone-925 border border-stone-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${approachConfig.bgColor} ${approachConfig.color}`}>
            {approachConfig.label}
          </span>
        </div>
        <button
          onClick={handleCopyRedline}
          className="flex items-center gap-2 px-3 py-1.5 bg-bronze-500/10 hover:bg-bronze-500/20 border border-bronze-500/50 rounded text-sm text-bronze-400 transition-colors"
          title="Copy redline to clipboard"
        >
          {copiedRedline ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Redline
            </>
          )}
        </button>
      </div>

      <p className="text-bronze-200/90 mb-4">{fix.description}</p>

      {/* Redline Display */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-red-400 mb-1">Original (Remove):</p>
          <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
            <p className="text-bronze-200/80 text-sm line-through">{fix.redline.original}</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-green-400 mb-1">Proposed (Insert):</p>
          <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
            <p className="text-bronze-200/80 text-sm">{fix.redline.proposed}</p>
          </div>
        </div>
      </div>

      {/* Market Justification */}
      <div className="mt-4 pt-4 border-t border-stone-800">
        <p className="text-xs font-semibold text-bronze-400 mb-1">Market Justification:</p>
        <p className="text-bronze-200/70 text-sm leading-relaxed">{fix.redline.marketJustification}</p>
      </div>
    </div>
  );
}

// Helper component for individual issue cards (used for both critical and non-critical issues)
function IssueCard({ issue }: { issue: Issue }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getRiskConfig = (risk: Issue['risk']) => {
    switch (risk) {
      case 'blocker':
        return { color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/50' };
      case 'negotiate':
        return { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/50' };
      case 'standard':
        return { color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/50' };
    }
  };

  const riskConfig = getRiskConfig(issue.risk);

  const formatTopic = (topic: string) => {
    return topic
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className={`rounded-lg border-2 ${riskConfig.bgColor} ${riskConfig.borderColor} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex items-center justify-between gap-3 sm:gap-4 group hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold uppercase ${riskConfig.bgColor} ${riskConfig.color}`}>
              {issue.risk}
            </span>
            <span className="px-2 sm:px-3 py-1 bg-stone-900/50 rounded-full text-xs text-bronze-200">
              {formatTopic(issue.topic)}
            </span>
          </div>
          <h4 className="text-lg sm:text-xl font-semibold text-bronze-50 mb-2">{issue.title}</h4>
          <p className="text-sm sm:text-base text-bronze-200/80 leading-relaxed">{issue.summary}</p>
        </div>
        <ChevronDown
          className={`w-5 h-5 sm:w-6 sm:h-6 text-bronze-500 flex-shrink-0 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4 border-t border-stone-800/50">
          {/* Impact Analysis */}
          <div className="pt-4">
            <h5 className="text-sm font-semibold text-bronze-400 mb-2">Impact Analysis</h5>
            <p className="text-bronze-200/80 leading-relaxed">{issue.impactAnalysis}</p>
          </div>

          {/* Target Reference */}
          <div>
            <h5 className="text-sm font-semibold text-bronze-400 mb-2">Document Reference</h5>
            <div className="bg-stone-950/50 border border-stone-800 rounded-lg p-4">
              <p className="text-xs text-bronze-400 mb-1">{issue.targetRef.locator}</p>
              <p className="text-bronze-200/80 text-sm italic leading-relaxed">"{issue.targetRef.quote}"</p>
            </div>
          </div>

          {/* Reference Document (if available) */}
          {issue.referenceRef && (
            <div>
              <h5 className="text-sm font-semibold text-bronze-400 mb-2">Reference Document</h5>
              <div className="bg-stone-950/50 border border-stone-800 rounded-lg p-4">
                <p className="text-xs text-bronze-400 mb-1">{issue.referenceRef.locator}</p>
                <p className="text-bronze-200/80 text-sm italic leading-relaxed">"{issue.referenceRef.quote}"</p>
              </div>
            </div>
          )}

          {/* Market Context */}
          {issue.marketContext && (
            <div>
              <h5 className="text-sm font-semibold text-bronze-400 mb-2">Market Context</h5>
              <p className="text-bronze-200/80 text-sm leading-relaxed">{issue.marketContext}</p>
            </div>
          )}

          {/* Suggested Fixes */}
          <div>
            <h5 className="text-sm font-semibold text-bronze-400 mb-3">
              Suggested Fixes ({issue.fixes.length})
            </h5>
            <div className="space-y-3">
              {issue.fixes.map((fix, index) => (
                <SuggestedFixCard key={index} fix={fix} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsDashboard({ result }: ResultsDashboardProps) {
  const getVerdictConfig = (verdict: AnalysisResult['verdict']) => {
    switch (verdict) {
      case 'safe-to-sign':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/50',
          iconColor: 'text-green-500',
          textColor: 'text-green-400',
          label: 'Safe to Sign',
        };
      case 'negotiate':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          iconColor: 'text-yellow-500',
          textColor: 'text-yellow-400',
          label: 'Recommend Negotiation',
        };
      case 'high-risk':
        return {
          icon: AlertOctagon,
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/50',
          iconColor: 'text-orange-500',
          textColor: 'text-orange-400',
          label: 'High Risk',
        };
      case 'do-not-sign':
        return {
          icon: XCircle,
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/50',
          iconColor: 'text-red-500',
          textColor: 'text-red-400',
          label: 'Do Not Sign',
        };
    }
  };

  const verdictConfig = getVerdictConfig(result.verdict);
  const VerdictIcon = verdictConfig.icon;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportToWord = async () => {
    setIsExporting(true);
    try {
      await exportToWord(result);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToJSON = () => {
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.href = url;
    link.download = `analysis-${result.metadata.targetDocumentName.replace(/\.[^/.]+$/, '')}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="results-section" className="py-20 px-6 bg-stone-950 border-t border-stone-900">
      <div className="max-w-5xl mx-auto">
        {/* Header with Title and Export Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-bronze-50">Analysis Results</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportToJSON}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-bronze-200 rounded-lg transition-colors text-sm"
              title="Export raw JSON data"
            >
              <Code className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={handleExportToWord}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-3 bg-bronze-500 hover:bg-bronze-400 disabled:bg-stone-800 disabled:text-stone-600 text-stone-950 font-semibold rounded-lg transition-colors text-sm sm:text-base"
            >
              <Download className="w-5 h-5" />
              {isExporting ? 'Exporting...' : 'Export to Word'}
            </button>
          </div>
        </div>

        {/* Verdict Card */}
        <div
          className={`mb-8 p-4 sm:p-8 rounded-lg border-2 ${verdictConfig.bgColor} ${verdictConfig.borderColor}`}
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <VerdictIcon className={`w-12 h-12 sm:w-16 sm:h-16 ${verdictConfig.iconColor} flex-shrink-0`} strokeWidth={1.5} />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <h3 className={`text-2xl sm:text-3xl font-serif font-bold ${verdictConfig.textColor}`}>
                  {verdictConfig.label}
                </h3>
                <span className="px-3 py-1 bg-stone-925 border border-stone-800 rounded-full text-xs sm:text-sm text-bronze-200 self-start">
                  {result.protectingRole.toUpperCase()} Perspective
                </span>
              </div>
              <p className="text-bronze-200 text-base sm:text-lg leading-relaxed mb-6">
                {result.verdictRationale}
              </p>
            </div>
          </div>
        </div>

        {/* Key Action Card */}
        <div className="mb-12 p-4 sm:p-6 bg-bronze-500/10 border-2 border-bronze-500/50 rounded-lg">
          <h4 className="text-base sm:text-lg font-semibold text-bronze-400 mb-2">Next Step</h4>
          <p className="text-bronze-50 text-lg sm:text-xl font-medium leading-relaxed">
            {result.keyAction}
          </p>
        </div>

        {/* Critical Issues Section */}
        {result.criticalIssues.length > 0 ? (
          <div className="mb-12">
            <h3 className="text-2xl font-serif font-bold text-bronze-50 mb-6">
              Critical Issues ({result.criticalIssues.length})
            </h3>
            <div className="space-y-4">
              {result.criticalIssues.slice(0, 3).map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-12 p-8 bg-green-500/10 border-2 border-green-500/50 rounded-lg text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="text-xl font-semibold text-green-400 mb-2">No Critical Issues Found</h3>
            <p className="text-bronze-200/80">
              This document does not contain any blocking issues that would require immediate attention.
            </p>
          </div>
        )}

        {/* All Issues Section */}
        {result.issues.length > 0 && (
          <div className="mb-12">
            <h3 className="text-2xl font-serif font-bold text-bronze-50 mb-6">
              All Issues ({result.issues.length})
            </h3>
            <div className="space-y-4">
              {result.issues
                .sort((a, b) => {
                  // Sort by risk level: negotiate > standard
                  const riskOrder = { negotiate: 1, standard: 2, blocker: 0 };
                  return riskOrder[a.risk] - riskOrder[b.risk];
                })
                .slice(0, 10)
                .map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
            </div>
            {result.issues.length > 10 && (
              <p className="text-center text-bronze-200/60 text-sm mt-4">
                Showing top 10 of {result.issues.length} issues
              </p>
            )}
          </div>
        )}

        {/* Regulatory Flags Section */}
        {result.regulatoryFlags.length > 0 ? (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-bronze-500" strokeWidth={1.5} />
              <h3 className="text-2xl font-serif font-bold text-bronze-50">
                Regulatory Flags ({result.regulatoryFlags.length})
              </h3>
            </div>
            <div className="space-y-3">
              {result.regulatoryFlags.map((flag, index) => (
                <RegulatoryFlagCard key={index} flag={flag} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-12 p-6 bg-stone-925 border border-stone-800 rounded-lg text-center">
            <Shield className="w-10 h-10 text-bronze-500/60 mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-bronze-200 mb-2">No Regulatory Flags</h3>
            <p className="text-bronze-200/60 text-sm">
              No specific regulatory concerns were identified in this document.
            </p>
          </div>
        )}

        {/* Assumptions Section */}
        {result.assumptions.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-6 h-6 text-bronze-500" strokeWidth={1.5} />
              <h3 className="text-2xl font-serif font-bold text-bronze-50">Assumptions</h3>
            </div>
            <div className="bg-stone-925 border border-stone-800 rounded-lg p-6">
              <ul className="space-y-3">
                {result.assumptions.map((assumption, index) => (
                  <li key={index} className="flex items-start gap-3 text-bronze-200/80">
                    <span className="text-bronze-500 mt-1">•</span>
                    <span>{assumption}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Metadata Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-serif font-bold text-bronze-50 mb-6">Analysis Details</h3>
          <div className="bg-stone-925 border border-stone-800 rounded-lg p-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-bronze-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-semibold text-bronze-400 mb-1">Analysis Date</p>
                  <p className="text-bronze-200">
                    {new Date(result.metadata.analysisTimestamp).toLocaleString('en-US', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-bronze-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-semibold text-bronze-400 mb-1">Target Document</p>
                  <p className="text-bronze-200">{result.metadata.targetDocumentName}</p>
                </div>
              </div>

              {result.metadata.referenceDocumentName && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-bronze-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <p className="text-xs font-semibold text-bronze-400 mb-1">Reference Document</p>
                    <p className="text-bronze-200">{result.metadata.referenceDocumentName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Cpu className="w-5 h-5 text-bronze-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-semibold text-bronze-400 mb-1">AI Model</p>
                  <p className="text-bronze-200">{result.metadata.modelUsed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-stone-925 border-2 border-bronze-500/30 rounded-lg p-6">
          <p className="text-sm text-bronze-200/80 leading-relaxed">
            <strong className="text-bronze-400">Disclaimer:</strong> This analysis is generated by AI and
            provided for informational purposes only. It does not constitute legal advice. Material errors or
            omissions may be present. Always consult qualified legal counsel before executing fund documents.
          </p>
        </div>
      </div>
    </section>
  );
}
