import { Lock, Trash2, Shield } from 'lucide-react';

export default function TrustSecurity() {
  const features = [
    {
      icon: Trash2,
      title: 'Nothing stored',
      description: 'Documents processed in memory and immediately discarded. No content persists after your session.',
    },
    {
      icon: Lock,
      title: 'Secure processing',
      description: 'API keys never exposed to browser. All document analysis happens server-side with enterprise-grade security.',
    },
    {
      icon: Shield,
      title: 'Market-standard benchmarks',
      description: 'Analysis based on ILPA Principles and institutional market standards from top fund formation practices.',
    },
  ];

  return (
    <section className="py-20 px-6 bg-stone-950">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-4">
          Trust & Security
        </h2>
        <p className="text-bronze-200 text-center mb-16 max-w-2xl mx-auto">
          Built by fund formation professionals for fund professionals
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-bronze-500/10 rounded-full mb-4">
                <feature.icon className="w-8 h-8 text-bronze-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-bronze-50 mb-2">{feature.title}</h3>
              <p className="text-bronze-200/80">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
