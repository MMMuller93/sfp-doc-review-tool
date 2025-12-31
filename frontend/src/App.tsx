import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import WhatYouGet from './components/WhatYouGet';
import SupportedDocuments from './components/SupportedDocuments';
import DocumentUpload from './components/DocumentUpload';
import ResultsDashboard from './components/ResultsDashboard';
import TrustSecurity from './components/TrustSecurity';
import FAQ from './components/FAQ';
import Disclaimer from './components/Disclaimer';
import type { AnalysisResult } from './types';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Scroll to results when analysis completes
  useEffect(() => {
    if (analysisResult) {
      const resultsSection = document.getElementById('results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [analysisResult]);

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Landing Page */}
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <SupportedDocuments />

      {/* Upload Section */}
      <DocumentUpload onAnalysisComplete={setAnalysisResult} />

      {/* Results Dashboard */}
      {analysisResult && <ResultsDashboard result={analysisResult} />}

      <TrustSecurity />
      <FAQ />
      <Disclaimer />
    </div>
  );
}

export default App;
