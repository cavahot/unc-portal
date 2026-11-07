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

    // GLO-GN-APPROVAL-02: `req` DEBE viajar en cada llamada local. Sin él, Payload crea una petición sin usuario
    // y el hook `enforceGuaraniApproval` no reconoce al superadmin (rechaza la aprobación o borra `aprobadoPor`).
    let doc: Record<string, unknown>
    try {
      doc = (await req.payload.findByID({ collection: 'glosario-guarani', id, depth: 0, req })) as unknown as Record<string, unknown>
    } catch (error) {
      // Solo «no existe» se traduce a 404; cualquier otro fallo (base caída, etc.) no debe disfrazarse de 404.
      if ((error as { status?: number })?.status === 404) {
        return Response.json({ message: 'No existe ese término del glosario.' }, { status: 404 })
      }
      throw error
    }
    const updated = (await req.payload.update({
      collection: 'glosario-guarani',
      id,
      req,
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
