interface TwoColumnBlockProps {
  ratio?: '50-50' | '60-40' | '40-60' | null;
  left?: unknown;
  right?: unknown;
}

const RATIO_CLASS: Record<string, string> = {
  '50-50': 'lg:grid-cols-2',
  '60-40': 'lg:grid-cols-[3fr_2fr]',
  '40-60': 'lg:grid-cols-[2fr_3fr]',
};

export default function TwoColumnBlock({ ratio }: TwoColumnBlockProps) {
  const gridClass = RATIO_CLASS[ratio || '50-50'] || RATIO_CLASS['50-50'];

  return (
    <section className={`mx-auto grid max-w-6xl gap-8 px-6 py-10 ${gridClass}`}>
      <div className="unc-card p-6">
        <p className="text-sm text-[var(--unc-text-muted)]">
          Contenido enriquecido disponible en Payload CMS
        </p>
      </div>

      <div className="unc-card p-6">
        <p className="text-sm text-[var(--unc-text-muted)]">
          Contenido enriquecido disponible en Payload CMS
        </p>
      </div>
    </section>
  );
}
