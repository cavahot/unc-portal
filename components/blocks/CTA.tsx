import Link from 'next/link';

interface CTABlockProps {
  heading: string;
  text?: string | null;
  buttonLabel: string;
  buttonUrl: string;
  style?: 'primary' | 'secondary' | 'outline' | null;
}

const STYLE_CLASS: Record<string, string> = {
  primary: 'pill-button-primary',
  secondary: 'pill-button-secondary',
  outline: 'pill-button-outline',
};

export default function CTABlock({ heading, text, buttonLabel, buttonUrl, style }: CTABlockProps) {
  const buttonClass = STYLE_CLASS[style || 'primary'] || STYLE_CLASS.primary;

  return (
    <section className="unc-card mx-auto my-10 max-w-4xl px-8 py-10 text-center">
      <h2 className="text-2xl font-semibold text-[var(--unc-text)]">{heading}</h2>

      {text && <p className="mt-3 text-[var(--unc-text-secondary)]">{text}</p>}

      <Link href={buttonUrl} className={`pill-button ${buttonClass} mt-6 inline-flex px-6 py-3`}>
        {buttonLabel}
      </Link>
    </section>
  );
}
