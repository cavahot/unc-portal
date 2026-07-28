import Image from 'next/image';
import Link from 'next/link';
import type { Media } from '@unc/cms-types';

interface HeroBlockProps {
  heading: string;
  subheading?: string | null;
  backgroundImage?: number | Media | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export default function HeroBlock({ heading, subheading, backgroundImage, ctaLabel, ctaUrl }: HeroBlockProps) {
  const image = typeof backgroundImage === 'object' ? backgroundImage : null;

  return (
    <section className="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden bg-[var(--unc-deep-green)] px-6 py-24 text-center text-white">
      {image?.url && (
        <Image
          src={image.url}
          alt={image.alt || ''}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
      )}

      <div className="relative z-10 mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{heading}</h1>

        {subheading && (
          <p className="mt-4 text-lg leading-relaxed text-white/80">{subheading}</p>
        )}

        {ctaLabel && ctaUrl && (
          <Link href={ctaUrl} className="pill-button pill-button-primary mt-8 inline-flex px-6 py-3">
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
