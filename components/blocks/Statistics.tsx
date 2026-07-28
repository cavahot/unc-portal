interface StatisticItem {
  label: string;
  value: string;
  icon?: string | null;
  id?: string | null;
}

interface StatisticsBlockProps {
  heading?: string | null;
  items?: StatisticItem[] | null;
}

export default function StatisticsBlock({ heading, items }: StatisticsBlockProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      {heading && (
        <h2 className="mb-8 text-center text-2xl font-semibold text-[var(--unc-text)]">{heading}</h2>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.id || index} className="unc-card p-6 text-center">
            <p className="text-3xl font-bold text-[var(--unc-green-600)]">{item.value}</p>
            <p className="mt-2 text-sm text-[var(--unc-text-secondary)]">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
