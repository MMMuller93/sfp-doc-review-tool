import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import WhatYouGet from './components/WhatYouGet';
import SupportedDocuments from './components/SupportedDocuments';
import DocumentUpload from './components/DocumentUpload';
import TrustSecurity from './components/TrustSecurity';
import FAQ from './components/FAQ';
import Disclaimer from './components/Disclaimer';

function App() {
  return (
    <div className="min-h-screen bg-stone-950">
      {/* Landing Page */}
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <SupportedDocuments />

      {/* Upload Section */}
      <DocumentUpload />

      <TrustSecurity />
      <FAQ />
      <Disclaimer />
    </div>
  );
}

export default App;
