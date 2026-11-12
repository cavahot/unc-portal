---
version: 1
slug: "app-locale-titulos-page-tsx"
primary_target: "app/[locale]/titulos/page.tsx"
related_targets: []
---

# Surface brief: /titulos (Inscripción de títulos)

Scope and mode: Read. Route `app/[locale]/titulos`. Extension of an established surface (the institutional green portal), not a new identity.

Audience, job, action: a person holding a title from another university who must register it. They need to know which documents apply to their case, what it costs, how long it takes and what happens next, then act: gather documents, pay, collect.
Content: everything comes from the CMS global `titulos-inscripcion`; the fee comes from the linked `aranceles-rectorado` row. No hardcoded institutional facts.
Constraints: es/gn/en/pt-BR interface, AA contrast, mobile first, print-friendly, states ok/empty/unavailable.
Errors: every failure is captured in the design and shown inline, accessible (role status or alert) and with a recovery action (retry, contact), never as a modal interruption (the SweetAlert2 pattern). Unexpected render errors are caught by a route error boundary in the same visual system. Toasts (Sonner, evaluated in the prototype) stay a documented alternative pending approval, not used on this page.

## Direction contract

THESIS: A document that answers one question in order (what do I bring, what does it cost, how long, what next) inside the portal's own world. It refuses the category default: three equal icon cards, stat chips, and kicker labels above every heading.
OWN-WORLD: The portal's established institutional green: gradient hero #004700 to #005c00 to #00A300 with the serif display face, a calm #F4F7F5 reading ground with white panels, a #004700 closing card, #8AFF8A for focus and the primary action, tabular numerals for time and fee. The accents verde, azul and violeta appear only as small markers beside a type's title, never as page colour.
STORY: The visitor recognises their case in seconds, sees time and fee as plain facts, follows eight numbered steps, and leaves knowing where to go and what to bring.
FIRST VIEWPORT: Left, breadcrumb, serif h1 from the CMS title, the CMS description, and below it a plain definition list (time, fee, responsible unit). Right on wide screens, an index of the university types as jump links, each with its requirement count; the primary action is choosing your type. On mobile the index follows the hero as a single column.
FORM: Established-world extension of a Read surface; no concept roll (a precise, content-fixed request inside an existing world). seed: none (no roll run)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved decisions

- DESIGN.md does not exist; documenting the incumbent system is offered, not done unasked.
- The finish review by a separate agent is skipped by the user's standing decision not to spend usage on subagents; the mechanical detector and in-browser checks replace it, and that is disclosed in the report.
