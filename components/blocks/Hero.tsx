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

export default function HeroBlock({
  heading,
  subheading,
  backgroundImage,
  ctaLabel,
  ctaUrl,
}: HeroBlockProps) {
  const image = typeof backgroundImage === 'object' && backgroundImage !== null
    ? backgroundImage
    : null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#004700] via-[#005c00] to-[#00A300] pb-20 pt-28 text-white sm:pt-32">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-[#001A00]/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-[22rem] w-[22rem] rounded-full bg-[#5CFF5C]/10 blur-3xl"
      />

      {image?.url && (
        <Image
          src={image.url}
          alt={image.alt || ''}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20 mix-blend-overlay"
        />
      )}

      <div className="relative mx-auto max-w-[1260px] px-5 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl font-bold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
          {heading}
        </h1>

        {subheading && (
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            {subheading}
          </p>
        )}

        {ctaLabel && ctaUrl && (
          <Link
            href={ctaUrl}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#004700] shadow-lg transition-colors hover:bg-[#E6FFE6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]"
          >
            {ctaLabel}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}
