import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import WhatYouGet from './components/WhatYouGet';
import SupportedDocuments from './components/SupportedDocuments';
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

      {/* Upload Section Placeholder - will be feat-006 */}
      <section id="upload-section" className="py-20 px-6 bg-stone-950 border-t border-stone-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-bold text-bronze-50 mb-4">
            Document Upload
          </h2>
          <p className="text-bronze-200 mb-8">
            Upload interface coming soon...
          </p>
          <div className="bg-stone-925 border-2 border-dashed border-stone-800 rounded-lg p-16">
            <p className="text-bronze-200/60">
              File upload UI will be implemented in feat-006
            </p>
          </div>
        </div>
      </section>

      <TrustSecurity />
      <FAQ />
      <Disclaimer />
    </div>
  );
}

export default App;
