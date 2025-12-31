import { CheckCircle, AlertTriangle, AlertOctagon, XCircle } from 'lucide-react';
import type { AnalysisResult } from '../types';

interface ResultsDashboardProps {
  result: AnalysisResult;
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

        {/* Placeholder for additional sections */}
        <div className="text-center text-bronze-200/60">
          <p className="text-sm">
            Additional sections (critical issues, all issues, regulatory flags) coming in feat-017 through feat-020
          </p>
        </div>
      </div>
    </section>
  );
}
