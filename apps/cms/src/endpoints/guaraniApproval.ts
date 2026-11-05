// GLO-GN-APPROVAL-01: acción explícita de aprobación desde el panel autenticado.
// Qué hace: recibe la decisión del superadmin, registra actor/fecha y devuelve un mensaje visible para el admin.
// Amenaza: evita que una edición genérica publique una glosa sin una decisión explícita.
// Límite: la sesión y el rol los valida Payload; no sustituye la revisión lingüística humana.
import type { Endpoint } from 'payload'

export const guaraniApprovalEndpoint: Endpoint = {
  path: '/guarani-review/:id/approve',
  method: 'post',
  handler: async (req) => {
    if (req.user?.role !== 'superadmin') {
      return Response.json({ message: 'Solo un superadmin puede aprobar traducciones guaraníes.' }, { status: 403 })
    }

    const id = req.routeParams?.id as string | number | undefined
    if (!id) return Response.json({ message: 'Falta el identificador del término.' }, { status: 400 })

    const doc = (await req.payload.findByID({ collection: 'glosario-guarani', id, depth: 0 })) as unknown as Record<string, unknown>
    const updated = (await req.payload.update({
      collection: 'glosario-guarani',
      id,
      overrideAccess: true,
      data: {
        revisado: true,
        estadoRevision: 'aprobado',
        fechaAprobacion: new Date().toISOString(),
        aprobadoPor: req.user.id,
      },
    })) as unknown as Record<string, unknown>

    return Response.json({
      message: `Término aprobado: «${doc.terminoEs}» → «${updated.terminoGn}». La traducción queda disponible para el portal.`,
      terminoEs: updated.terminoEs,
      terminoGn: updated.terminoGn,
      fuente: updated.fuente,
    })
  },
}
