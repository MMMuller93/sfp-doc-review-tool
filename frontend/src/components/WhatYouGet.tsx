import { CheckCircle2, AlertTriangle, FileText, Shield } from 'lucide-react';

export default function WhatYouGet() {
  const benefits = [
    {
      icon: CheckCircle2,
      title: 'Clear verdict',
      description: 'Safe to Sign, Negotiate, High Risk, or Do Not Sign — know immediately where you stand',
    },
    {
      icon: AlertTriangle,
      title: 'Prioritized issues',
      description: 'Blockers, negotiation points, and standard provisions ranked by impact',
    },
    {
      icon: FileText,
      title: 'Ready-to-use redlines',
      description: 'Specific language changes with market justification — copy directly into your negotiation',
    },
    {
      icon: Shield,
      title: 'Regulatory flags',
      description: 'ERISA, tax, FOIA, and compliance issues surfaced automatically',
    },
  ];

  return (
    <section className="py-20 px-6 bg-stone-950">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-4">
          What You'll Get
        </h2>
        <p className="text-bronze-200 text-center mb-16 max-w-2xl mx-auto">
          Analysis designed for decision-making, not academic review
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-stone-925 border border-stone-900 rounded-lg p-8 hover:border-bronze-500/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-bronze-500/10 rounded-lg flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-bronze-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-bronze-50 mb-2">{benefit.title}</h3>
                  <p className="text-bronze-200/80 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
