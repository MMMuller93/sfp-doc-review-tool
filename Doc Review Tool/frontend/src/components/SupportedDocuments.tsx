import { FileText } from 'lucide-react';

export default function SupportedDocuments() {
  const documents = [
    {
      name: 'Side Letters',
      description: 'Most common — negotiate LP-specific terms',
    },
    {
      name: 'Limited Partnership Agreements',
      description: 'Full fund governing documents',
    },
    {
      name: 'Subscription Documents',
      description: 'Investor onboarding and representations',
    },
    {
      name: 'Co-Investment Term Sheets',
      description: 'Deal-specific investment terms',
    },
  ];

  return (
    <section className="py-20 px-6 bg-stone-925">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-serif font-bold text-bronze-50 text-center mb-4">
          Supported Documents
        </h2>
        <p className="text-bronze-200 text-center mb-12">
          Upload as PDF, Word (.docx), or plain text
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="bg-stone-950 border border-stone-900 rounded-lg p-6 hover:border-bronze-500/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <FileText className="w-6 h-6 text-bronze-500 flex-shrink-0 mt-1" strokeWidth={1.5} />
                <div>
                  <h3 className="text-lg font-semibold text-bronze-50 mb-1">{doc.name}</h3>
                  <p className="text-bronze-200/70 text-sm">{doc.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
