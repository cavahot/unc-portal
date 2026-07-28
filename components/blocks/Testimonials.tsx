import Image from 'next/image';
import type { Media } from '@unc/cms-types';

interface TestimonialItem {
  quote: string;
  author: string;
  role?: string | null;
  photo?: number | Media | null;
  id?: string | null;
}

interface TestimonialsBlockProps {
  heading?: string | null;
  items?: TestimonialItem[] | null;
}

export default function TestimonialsBlock({ heading, items }: TestimonialsBlockProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      {heading && (
        <h2 className="mb-8 text-center text-2xl font-semibold text-[var(--unc-text)]">{heading}</h2>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const photo = typeof item.photo === 'object' ? item.photo : null;

          return (
            <blockquote key={item.id || index} className="unc-card flex flex-col gap-4 p-6">
              <p className="text-sm leading-relaxed text-[var(--unc-text-secondary)]">
                &ldquo;{item.quote}&rdquo;
              </p>

              <footer className="mt-auto flex items-center gap-3">
                {photo?.url && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                    <Image src={photo.url} alt={photo.alt || ''} fill sizes="40px" className="object-cover" />
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-[var(--unc-text)]">{item.author}</p>
                  {item.role && <p className="text-xs text-[var(--unc-text-muted)]">{item.role}</p>}
                </div>
              </footer>
            </blockquote>
          );
        })}
      </div>
    </section>
  );
}
