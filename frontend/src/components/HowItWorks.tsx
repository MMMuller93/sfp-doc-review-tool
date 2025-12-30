import { Upload, UserCheck, Sparkles, FileDown } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: 'Upload your document',
      description: 'Drop your PDF, Word, or text file',
    },
    {
      icon: UserCheck,
      title: 'Select your perspective',
      description: 'GP protecting the fund, or LP protecting your investment',
    },
    {
      icon: Sparkles,
      title: 'Get structured analysis',
      description: 'Risk ratings, specific issues, and prioritized concerns',
    },
    {
      icon: FileDown,
      title: 'Export negotiation points',
      description: 'Ready-to-use redline language for your team',
    },
  ];

  return (
    <section className="py-20 px-6 bg-stone-925">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-4">
          How It Works
        </h2>
        <p className="text-bronze-200 text-center mb-16 max-w-2xl mx-auto">
          Get from upload to actionable insights in under 45 seconds
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Step number */}
              <div className="absolute -top-4 -left-4 w-10 h-10 bg-bronze-500 text-stone-950 font-bold rounded-full flex items-center justify-center text-lg">
                {index + 1}
              </div>

              {/* Card */}
              <div className="bg-stone-950 border border-stone-900 rounded-lg p-6 h-full hover:border-bronze-500/50 transition-colors">
                <step.icon className="w-8 h-8 text-bronze-500 mb-4" strokeWidth={1.5} />
                <h3 className="text-xl font-semibold text-bronze-50 mb-2">{step.title}</h3>
                <p className="text-bronze-200/80">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
