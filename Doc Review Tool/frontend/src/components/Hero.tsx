import { FileText, ArrowRight } from 'lucide-react';

export default function Hero() {
  const scrollToTool = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative bg-stone-950 bg-sfp-grid py-24 px-6">
      <div className="max-w-5xl mx-auto text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-bronze-500/10 rounded-full mb-8">
          <FileText className="w-10 h-10 text-bronze-500" strokeWidth={1.5} />
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-bronze-50 mb-6 leading-tight">
          Private Fund Document Review Tool
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-bronze-200 mb-12 max-w-3xl mx-auto leading-relaxed">
          Decision-ready analysis for Side Letters, LPAs, and Subscription Documents — built for PE, VC, and hedge fund professionals.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={scrollToTool}
            className="group px-8 py-4 bg-bronze-500 hover:bg-bronze-400 text-stone-950 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            Start Review
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="https://strategicfundpartners.com/contact"
            className="px-8 py-4 border-2 border-bronze-500 hover:bg-bronze-500/10 text-bronze-200 font-semibold rounded-lg transition-all duration-200"
          >
            Talk to an Advisor
          </a>
        </div>
      </div>
    </section>
  );
}
