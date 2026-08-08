import { getFAQs, FAQ_CATEGORIES } from '@/lib/cms/queries/faqs'
import FAQAccordion from '@/components/faq/FAQAccordion'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — UNC',
  description:
    'Encontrá respuestas a las preguntas más comunes sobre admisión, trámites, servicios y más en la Universidad Nacional de Concepción.',
}

export default async function PreguntasFrecuentesPage() {
  const items = await getFAQs()

  const totalCategories = new Set(items.map((i) => i.category)).size

  return (
    <div className="min-h-screen bg-[#F4F7F5]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#09231D] px-4 pb-20 pt-16 text-white">
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#004700]/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-[#37D448]/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#37D448]/30 bg-[#37D448]/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#37D448]" aria-hidden />
            <span className="text-[0.7rem] font-bold uppercase tracking-widest text-[#37D448]">
              Ayuda institucional
            </span>
          </div>

          <h1 className="mb-4 font-serif text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            ¿En qué podemos{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#37D448]">ayudarte?</span>
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-[#37D448]/40"
              />
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-base leading-relaxed text-white/70">
            Reunimos las consultas más frecuentes de estudiantes, docentes y la comunidad.
            Buscá por palabra clave o explorá por categoría.
          </p>

          {/* Stats row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <span className="font-serif text-3xl font-extrabold text-[#37D448]">
                {items.length}
              </span>
              <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
                Preguntas
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" aria-hidden />
            <div className="flex flex-col items-center">
              <span className="font-serif text-3xl font-extrabold text-[#37D448]">
                {totalCategories}
              </span>
              <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
                Categorías
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" aria-hidden />
            <div className="flex flex-col items-center">
              <span className="font-serif text-3xl font-extrabold text-[#37D448]">24/7</span>
              <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/50">
                Disponible
              </span>
            </div>
          </div>
        </div>

        {/* Curved bottom edge */}
        <div
          aria-hidden
          className="absolute -bottom-px left-0 right-0 h-12 bg-[#F4F7F5]"
          style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }}
        />
      </section>

      {/* ── Main content ── */}
      <section className="mx-auto max-w-3xl px-4 pb-24 pt-12">
        {/* Category quick-nav — desktop only */}
        <nav
          aria-label="Categorías disponibles"
          className="mb-10 hidden gap-3 sm:flex sm:flex-wrap"
        >
          {FAQ_CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category === cat.value).length
            if (count === 0) return null
            return (
              <div
                key={cat.value}
                className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[0.7rem] font-semibold text-[#3A4A42] shadow-sm ring-1 ring-[#D7E0DB]"
              >
                <span aria-hidden>{cat.icon}</span>
                {cat.label}
                <span className="ml-0.5 rounded-full bg-[#E6FFE6] px-1.5 py-0.5 text-[0.6rem] font-extrabold text-[#004700]">
                  {count}
                </span>
              </div>
            )
          })}
        </nav>

        {/* FAQ accordion (client component) */}
        <FAQAccordion items={items} />

        {/* ── Contact CTA ── */}
        <div className="mt-16 overflow-hidden rounded-3xl bg-[#09231D] px-8 py-10 text-white">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-[#37D448]">
                ¿No encontraste lo que buscabas?
              </p>
              <h2 className="mt-1 font-serif text-xl font-bold leading-snug">
                Contactá directamente con nosotros
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Respondemos en el siguiente día hábil.
              </p>
            </div>
            <a
              href="/contacto"
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#37D448] px-6 py-3 text-sm font-bold text-[#09231D] transition hover:bg-[#5CFF5C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CFF5C]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09231D]"
            >
              Ir a Contacto
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
