import { useState } from 'react';
import { CheckCircle, AlertTriangle, AlertOctagon, XCircle, ChevronDown } from 'lucide-react';
import type { AnalysisResult, Issue } from '../types';

interface ResultsDashboardProps {
  result: AnalysisResult;
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
        className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 group hover:bg-white/5 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${riskConfig.bgColor} ${riskConfig.color}`}>
              {issue.risk}
            </span>
            <span className="px-3 py-1 bg-stone-900/50 rounded-full text-xs text-bronze-200">
              {formatTopic(issue.topic)}
            </span>
          </div>
          <h4 className="text-xl font-semibold text-bronze-50 mb-2">{issue.title}</h4>
          <p className="text-bronze-200/80 leading-relaxed">{issue.summary}</p>
        </div>
        <ChevronDown
          className={`w-6 h-6 text-bronze-500 flex-shrink-0 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-stone-800/50">
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

          {/* Suggested Fixes (placeholder for feat-019) */}
          <div>
            <h5 className="text-sm font-semibold text-bronze-400 mb-2">Suggested Fixes</h5>
            <p className="text-bronze-200/60 text-sm">
              {issue.fixes.length} fix{issue.fixes.length !== 1 ? 'es' : ''} available (detailed view in feat-019)
            </p>
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

  return (
    <section id="results-section" className="py-20 px-6 bg-stone-950 border-t border-stone-900">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-12">
          Analysis Results
        </h2>

        {/* Verdict Card */}
        <div
          className={`mb-8 p-8 rounded-lg border-2 ${verdictConfig.bgColor} ${verdictConfig.borderColor}`}
        >
          <div className="flex items-start gap-6">
            <VerdictIcon className={`w-16 h-16 ${verdictConfig.iconColor} flex-shrink-0`} strokeWidth={1.5} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className={`text-3xl font-serif font-bold ${verdictConfig.textColor}`}>
                  {verdictConfig.label}
                </h3>
                <span className="px-3 py-1 bg-stone-925 border border-stone-800 rounded-full text-sm text-bronze-200">
                  {result.protectingRole.toUpperCase()} Perspective
                </span>
              </div>
              <p className="text-bronze-200 text-lg leading-relaxed mb-6">
                {result.verdictRationale}
              </p>
            </div>
          </div>
        </div>

        {/* Key Action Card */}
        <div className="mb-12 p-6 bg-bronze-500/10 border-2 border-bronze-500/50 rounded-lg">
          <h4 className="text-lg font-semibold text-bronze-400 mb-2">Next Step</h4>
          <p className="text-bronze-50 text-xl font-medium leading-relaxed">
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

        {/* Placeholder for additional sections */}
        <div className="text-center text-bronze-200/60">
          <p className="text-sm">
            Additional sections (regulatory flags) coming in feat-020
          </p>
        </div>
      </div>
    </section>
  );
}
