import { useState, useEffect } from 'react';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import WhatYouGet from './components/WhatYouGet';
import SupportedDocuments from './components/SupportedDocuments';
import DocumentUpload from './components/DocumentUpload';
import ResultsDashboard from './components/ResultsDashboard';
import ChatInterface from './components/ChatInterface';
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

      {/* Results Dashboard */}
      {sessionState?.analysisResult && <ResultsDashboard result={sessionState.analysisResult} />}

      {/* Chat Interface (appears after analysis, only if document text available) */}
      {sessionState?.analysisResult && sessionState.targetDocumentText && (
        <div className="py-12 px-6 bg-stone-950" id="chat-section">
          <div className="max-w-5xl mx-auto">
            <ChatInterface
              sessionId={sessionState.sessionId}
              analysisResult={sessionState.analysisResult}
              targetDocumentText={sessionState.targetDocumentText}
              targetDocumentName={sessionState.targetDocumentName}
              referenceDocumentText={sessionState.referenceDocumentText}
              referenceDocumentName={sessionState.referenceDocumentName}
            />
          </div>
        </div>
      )}

      <TrustSecurity />
      <FAQ />
      <Disclaimer />
    </div>
  );
}

export default App;
