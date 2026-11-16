'use client'

// PROTO-SONNER-01: superficie aislada para evaluar Sonner antes de adoptarlo en producción.
// Qué hace: demuestra éxito, error, información, carga, promesa y confirmación destructiva.
// Amenaza: evita introducir notificaciones globales sin comprobar jerarquía, contraste y acciones.
// Límite: esta ruta es experimental; no debe enlazarse desde la navegación pública.
import { useEffect } from 'react'
import { Toaster, toast } from 'sonner'

function sleep(ms: number) {
  // La demora controlada permite observar la transición carga → éxito/error sin depender de una API real.
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function SonnerPlayground() {
  useEffect(() => {
    // La URL de demostración permite verificar visualmente Sonner sin una interacción adicional.
    if (window.location.search.includes('show=success')) {
      toast.success('Mensaje mostrado dentro del portal', {
        description: 'Sonner funciona con la estética visual de la UNC.',
      })
    }
  }, [])

  const promiseDemo = () =>
    toast.promise(sleep(1400), {
      loading: 'Guardando cambios…',
      success: 'Cambios guardados',
      error: 'No se pudieron guardar los cambios',
    })

  const destructiveDemo = () => {
    // La acción destructiva requiere una segunda confirmación dentro del toast.
    toast.warning('Eliminar archivo', {
      description: 'Esta acción no se puede deshacer.',
      duration: 9000,
      action: {
        label: 'Eliminar',
        onClick: () => toast.success('Archivo eliminado'),
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => toast.info('Acción cancelada'),
      },
    })
  }

  return (
    <main className="min-h-screen bg-[#F1F8F2] px-5 py-16 text-[#09231D] sm:px-8">
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        theme="light"
        toastOptions={{
          classNames: {
            toast: 'sonner-unc-toast',
            title: 'sonner-unc-title',
            description: 'sonner-unc-description',
            actionButton: 'sonner-unc-action',
            cancelButton: 'sonner-unc-cancel',
          },
        }}
      />

      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#008000]">Prototipo visual</p>
        <h1 className="mt-3 font-serif text-5xl font-bold tracking-[-0.05em] text-[#004700]">Sonner + UNC</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#56655F]">
          Prueba de mensajes no bloqueantes para éxito, error, información, carga y confirmaciones destructivas.
        </p>

        <section aria-labelledby="sonner-actions" className="mt-10 rounded-3xl border border-[#CDE8D2] bg-white p-5 shadow-[0_20px_55px_rgba(0,71,0,0.08)] sm:p-8">
          <h2 id="sonner-actions" className="font-serif text-2xl font-bold text-[#09231D]">Estados disponibles</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => toast.success('Operación completada', { description: 'El registro se guardó correctamente.' })} className="sonner-demo-button bg-[#004700] text-white hover:bg-[#006B0A]">Éxito</button>
            <button type="button" onClick={() => toast.error('No se pudo completar', { description: 'Revisá los datos e intentá nuevamente.' })} className="sonner-demo-button border border-[#F2B8B5] bg-[#FFF7F6] text-[#8A1C12] hover:bg-[#FBE9E7]">Error</button>
            <button type="button" onClick={() => toast.info('Información', { description: 'La sesión se mantiene activa.' })} className="sonner-demo-button border border-[#B8D6F2] bg-[#F5FAFF] text-[#15528A] hover:bg-[#E8F3FF]">Información</button>
            <button type="button" onClick={() => toast.warning('Revisá este dato', { description: 'La vigencia editorial todavía necesita confirmación.' })} className="sonner-demo-button border border-[#E6CC8A] bg-[#FFFBEF] text-[#795500] hover:bg-[#FFF4C9]">Advertencia</button>
            <button type="button" onClick={promiseDemo} className="sonner-demo-button border border-[#B8FFB8] bg-[#E6FFE6] text-[#004700] hover:bg-[#D2FFD2]">Promesa: carga → éxito</button>
            <button type="button" onClick={destructiveDemo} className="sonner-demo-button border border-[#D7E0DB] bg-white text-[#09231D] hover:border-[#008000] hover:text-[#004700]">Confirmación destructiva</button>
          </div>
        </section>

        <aside className="mt-6 rounded-2xl border border-[#D7E0DB] bg-[#E9F4EA] p-4 text-sm leading-6 text-[#3E4A45]">
          <strong className="text-[#004700]">Criterio propuesto:</strong> usar Sonner para estados breves y no bloqueantes; reservar un diálogo accesible para decisiones críticas que requieran contexto amplio.
        </aside>
      </div>
    </main>
  )
}
