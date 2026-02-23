import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import WhatYouGet from './components/WhatYouGet';
import SupportedDocuments from './components/SupportedDocuments';
import DocumentUpload from './components/DocumentUpload';
import AnnotatedResultsView from './components/AnnotatedResultsView';
import TrustSecurity from './components/TrustSecurity';
import FAQ from './components/FAQ';
import Disclaimer from './components/Disclaimer';
import type { AnalysisResult, SessionState } from './types';

function App() {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  // Scroll to results when analysis completes
  useEffect(() => {
    if (sessionState?.analysisResult) {
      const resultsSection = document.getElementById('results-section');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [sessionState?.analysisResult]);

  // Handle analysis completion with session state
  const handleAnalysisComplete = (
    analysis: AnalysisResult,
    targetDocText: string,
    targetDocName: string,
    refDocText?: string,
    refDocName?: string
  ) => {
    const newSession: SessionState = {
      sessionId: `session-${Date.now()}`,
      analysisResult: analysis,
      targetDocumentText: targetDocText,
      targetDocumentName: targetDocName,
      referenceDocumentText: refDocText,
      referenceDocumentName: refDocName,
      conversationHistory: [],
      createdAt: new Date().toISOString(),
    };

    setSessionState(newSession);

    // Store in localStorage for persistence
    try {
      localStorage.setItem('docReviewSession', JSON.stringify(newSession));
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  };

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('docReviewSession');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        // Check if session is less than 30 minutes old
        const age = Date.now() - new Date(parsed.createdAt).getTime();
        if (age < 30 * 60 * 1000) {
          setSessionState(parsed);
        } else {
          localStorage.removeItem('docReviewSession');
        }
      }
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-stone-950">
      {/* Landing Page */}
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <SupportedDocuments />

      {/* Upload Section */}
      <DocumentUpload onAnalysisComplete={handleAnalysisComplete} />

      {/* Results: Split-pane document viewer + analysis dashboard + chat */}
      {sessionState?.analysisResult && (
        <AnnotatedResultsView
          result={sessionState.analysisResult}
          documentText={sessionState.targetDocumentText}
          documentName={sessionState.targetDocumentName}
          sessionId={sessionState.sessionId}
          referenceDocumentText={sessionState.referenceDocumentText}
          referenceDocumentName={sessionState.referenceDocumentName}
        />
      )}

      <TrustSecurity />
      <FAQ />
      <Disclaimer />
    </div>
  );
}

export default App;
