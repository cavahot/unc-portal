'use client'

import { useEffect, useState } from 'react'

export default function Monitoring() {
  const [health, setHealth] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const h = await fetch('/api/health').then(r => r.json())
        const m = await fetch('/api/metrics').then(r => r.json())
        setHealth(h)
        setMetrics(m)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: '20px' }}>Cargando...</div>

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>📊 Monitoreo del Sistema</h1>

      {health && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h2>Estado General: {health.status}</h2>
          <div style={{ marginTop: '10px' }}>
            <strong>Servicios:</strong>
            <ul>
              {Object.entries(health.services || {}).map(([name, service]: [string, any]) => (
                <li key={name}>
                  {name}: {service.status} ({service.responseTime}ms)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {metrics && (
        <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h2>Métricas del Sistema</h2>
          <div>
            <p><strong>Uptime:</strong> {Math.floor(metrics.sistema.uptime)} segundos</p>
            <p><strong>Memoria:</strong> {metrics.sistema.memoria.usado}MB / {metrics.sistema.memoria.total}MB ({metrics.sistema.memoria.porcentaje}%)</p>
          </div>

          <h3>Noticias</h3>
          <div>
            <p><strong>Total:</strong> {metrics.noticias.total}</p>
            <p><strong>Tasa Aprobación:</strong> {metrics.noticias.tasa_aprobacion}%</p>
            <div>
              <strong>Por Estado:</strong>
              <ul>
                {Object.entries(metrics.noticias.por_estado || {}).map(([state, count]: [string, any]) => (
                  <li key={state}>{state}: {count}</li>
                ))}
              </ul>
            </div>
          </div>

          <h3>Usuarios</h3>
          <div>
            <p><strong>Total:</strong> {metrics.usuarios.total}</p>
            <strong>Por Rol:</strong>
            <ul>
              {Object.entries(metrics.usuarios.por_rol || {}).map(([role, count]: [string, any]) => (
                <li key={role}>{role}: {count}</li>
              ))}
            </ul>
          </div>

          <h3>Auditoría Hoy</h3>
          <p><strong>Registros:</strong> {metrics.auditoria.registros_hoy}</p>
        </div>
      )}
    </div>
  )
}
