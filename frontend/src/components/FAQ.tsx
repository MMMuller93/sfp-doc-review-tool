import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'What types of documents can I analyze?',
      answer: 'Side Letters, LPAs, Subscription Documents, and Co-Investment terms. Upload as PDF, Word (.docx), or plain text.',
    },
    {
      question: "What's the difference between GP and LP analysis?",
      answer: 'GP analysis protects the fund manager — flagging excessive LP concessions, precedent risks, and operational burdens. LP analysis protects the investor — flagging below-market terms, missing rights, and GP-favorable provisions.',
    },
    {
      question: 'Is my document secure?',
      answer: 'Yes. Documents are processed in memory and never stored. No document content is retained after your browser session ends.',
    },
    {
      question: 'How accurate is the analysis?',
      answer: 'The tool provides preliminary issue-spotting based on market standards and the specific document language. It is designed to accelerate review, not replace legal counsel. Always have qualified attorneys review before signing.',
    },
    {
      question: 'Can I export the results?',
      answer: 'Yes. Export your change list and redlines as a Word document, or download the raw analysis as JSON.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-6 bg-stone-925">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-bronze-200 text-center mb-12">
          Everything you need to know about the document review tool
        </p>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-stone-950 border border-stone-900 rounded-lg overflow-hidden hover:border-bronze-500/50 transition-colors"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 group"
              >
                <span className="text-lg font-semibold text-bronze-50 group-hover:text-bronze-400 transition-colors">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-bronze-500 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-bronze-200/80 leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
