'use client'

import React, { useEffect, useState } from 'react'

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: '#fff', borderRadius: '12px',
      border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function ServiceRow({ name, status, ms }: { name: string; status: 'up' | 'down'; ms: number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 20px', borderBottom: '1px solid #f8fafc',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: '9px', height: '9px', borderRadius: '50%',
          backgroundColor: status === 'up' ? '#10b981' : '#ef4444',
          display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>{name}</span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: '13px', fontWeight: '600',
          color: status === 'up' ? '#047857' : '#b91c1c',
        }}>
          {status === 'up' ? 'Activo' : 'Inactivo'}
        </span>
        {ms > 0 && (
          <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '8px' }}>{ms}ms</span>
        )}
      </div>
    </div>
  )
}

function MemBar({ pct }: { pct: number }) {
  const color = pct < 70 ? '#10b981' : pct < 85 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{
        width: '100%', height: '8px', backgroundColor: '#e2e8f0',
        borderRadius: '9999px', overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '9999px', transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: '#64748b' }}>{pct}% usado</span>
        <span style={{ fontSize: '11px', color: color, fontWeight: '600' }}>
          {pct < 70 ? 'Normal' : pct < 85 ? 'Moderado' : 'Alto'}
        </span>
      </div>
    </div>
  )
}

export const MonitoringView: React.FC = () => {
  const [health, setHealth] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      const [h, m] = await Promise.all([
        fetch('/api/health').then(r => r.json()),
        fetch('/api/metrics').then(r => r.json()),
      ])
      setHealth(h)
      setMetrics(m)
      setLastUpdate(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const services = [
    { key: 'cms',      name: 'CMS (Payload)' },
    { key: 'database', name: 'Base de Datos' },
    { key: 'minio',    name: 'MinIO S3' },
    { key: 'portal',   name: 'Portal Web' },
  ]

  const overallColor = !health ? '#64748b'
    : health.status === 'healthy' ? '#047857'
    : health.status === 'degraded' ? '#b45309'
    : '#b91c1c'

  const overallLabel = !health ? 'Verificando...'
    : health.status === 'healthy' ? '✓ Sistema Saludable'
    : health.status === 'degraded' ? '⚠ Sistema Degradado'
    : '✗ Sistema con Fallas'

  const formatUptime = (s: number) => {
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${d}d ${h}h ${m}m`
  }

  return (
    <div style={{
      padding: '28px 32px', backgroundColor: '#f8fafc', minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>
            🔍 Monitoreo del Sistema
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Actualización automática cada 30 segundos
            {lastUpdate && ` · Última: ${lastUpdate.toLocaleTimeString('es-PY')}`}
          </p>
        </div>
        <button onClick={fetchData} style={{
          padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
          backgroundColor: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
          color: '#0f172a',
        }}>
          🔄 Actualizar
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Cargando datos del sistema...
        </div>
      )}

      {!loading && (
        <>
          {/* Estado general */}
          <Card style={{
            padding: '20px 24px',
            marginBottom: '20px',
            background: health?.status === 'healthy'
              ? 'linear-gradient(135deg, #064e3b, #047857)'
              : health?.status === 'degraded'
              ? 'linear-gradient(135deg, #92400e, #b45309)'
              : 'linear-gradient(135deg, #7f1d1d, #b91c1c)',
            border: 'none',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{overallLabel}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              {new Date().toLocaleString('es-PY')}
            </div>
          </Card>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

            {/* Servicios */}
            <Card>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: '600' }}>
                Servicios
              </div>
              {services.map(({ key, name }) => {
                const svc = health?.services?.[key]
                return (
                  <ServiceRow
                    key={key}
                    name={name}
                    status={svc?.status ?? 'down'}
                    ms={svc?.responseTime ?? 0}
                  />
                )
              })}
            </Card>

            {/* Sistema */}
            <Card>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: '600' }}>
                Recursos del Servidor
              </div>
              <div style={{ padding: '16px 20px' }}>
                {metrics?.sistema && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Uptime
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                        {formatUptime(metrics.sistema.uptime)}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Memoria
                        </span>
                        <span style={{ fontSize: '12px', color: '#374151' }}>
                          {metrics.sistema.memoria.usado} / {metrics.sistema.memoria.total} MB
                        </span>
                      </div>
                      <MemBar pct={metrics.sistema.memoria.porcentaje} />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Métricas de noticias */}
          {metrics?.noticias && (
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '14px', fontWeight: '600' }}>
                Métricas Editoriales
              </div>
              <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{metrics.noticias.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasa Aprobación</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#047857', marginTop: '4px' }}>{metrics.noticias.tasa_aprobacion}%</div>
                </div>
                {Object.entries(metrics.noticias.por_estado || {}).map(([estado, count]: [string, any]) => (
                  <div key={estado}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {estado.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{count}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

    </div>
  )
}
