/**
 * Stub renderer for the "richText" block.
 * A real Lexical serializer is out of scope for this change.
 */
export default function RichTextBlock() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm text-[var(--unc-text-muted)]">
        Contenido enriquecido disponible en Payload CMS
      </p>
    </section>
  );
}
