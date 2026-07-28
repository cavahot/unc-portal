interface FAQItem {
  question: string;
  answer: string;
  id?: string | null;
}

interface FAQBlockProps {
  heading?: string | null;
  items?: FAQItem[] | null;
}

export default function FAQBlock({ heading, items }: FAQBlockProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-3xl px-6 py-14">
      {heading && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-[var(--unc-text)]">{heading}</h2>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <details key={item.id || index} className="unc-card group p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--unc-text)] marker:content-none">
              {item.question}
            </summary>

            <p className="mt-3 text-sm leading-relaxed text-[var(--unc-text-secondary)]">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
