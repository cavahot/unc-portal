import React from 'react'
import { getPayload } from 'payload'
import config from '../../payload.config'
import type { AdminViewProps } from 'payload'

const statusMeta: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  borrador:    { label: 'Borrador',    color: '#64748b', bg: '#f1f5f9', icon: '📝' },
  draft:       { label: 'Borrador',    color: '#64748b', bg: '#f1f5f9', icon: '📝' },
  en_revision: { label: 'En Revisión', color: '#b45309', bg: '#fef3c7', icon: '👀' },
  aprobado:    { label: 'Aprobado',    color: '#047857', bg: '#d1fae5', icon: '✅' },
  rechazado:   { label: 'Rechazado',   color: '#b91c1c', bg: '#fee2e2', icon: '❌' },
  publicado:   { label: 'Publicado',   color: '#1d4ed8', bg: '#dbeafe', icon: '🚀' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? { label: status, color: '#64748b', bg: '#f1f5f9', icon: '•' }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600',
      color: meta.color,
      backgroundColor: meta.bg,
    }}>
      {meta.icon} {meta.label}
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '14px',
      fontWeight: '600',
      color: '#0f172a',
    }}>
      {children}
    </div>
  )
}

export const PortalDashboard: React.FC<AdminViewProps> = async () => {
  const payload = await getPayload({ config })

  const [r1, r2, r3, r4, r5, rNoticias, rAudit, rUsers] = await Promise.allSettled([
    payload.find({ collection: 'noticias', where: { approvalStatus: { equals: 'draft' } }, limit: 1, depth: 0 }),
    payload.find({ collection: 'noticias', where: { approvalStatus: { equals: 'en_revision' } }, limit: 1, depth: 0 }),
    payload.find({ collection: 'noticias', where: { approvalStatus: { equals: 'aprobado' } }, limit: 1, depth: 0 }),
    payload.find({ collection: 'noticias', where: { approvalStatus: { equals: 'rechazado' } }, limit: 1, depth: 0 }),
    payload.find({ collection: 'noticias', where: { approvalStatus: { equals: 'publicado' } }, limit: 1, depth: 0 }),
    payload.find({ collection: 'noticias', sort: '-updatedAt', limit: 8, depth: 1 }),
    payload.find({ collection: 'auditoria', sort: '-fechaHora', limit: 6, depth: 0 }),
    payload.find({ collection: 'users', limit: 1, depth: 0 }),
  ])

  const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null

  const stats = {
    borrador:   get(r1)?.totalDocs ?? 0,
    en_revision: get(r2)?.totalDocs ?? 0,
    aprobado:   get(r3)?.totalDocs ?? 0,
    rechazado:  get(r4)?.totalDocs ?? 0,
    publicado:  get(r5)?.totalDocs ?? 0,
  }
  const total      = Object.values(stats).reduce((a, b) => a + b, 0)
  const noticias   = get(rNoticias)?.docs ?? []
  const auditLogs  = get(rAudit)?.docs ?? []
  const totalUsers = get(rUsers)?.totalDocs ?? 0

  const tasaAprobacion = stats.publicado + stats.rechazado > 0
    ? Math.round((stats.publicado / (stats.publicado + stats.rechazado)) * 100)
    : 0

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-PY', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const statCards = [
    { key: 'borrador',    count: stats.borrador,    href: '/admin/portal?estado=draft' },
    { key: 'en_revision', count: stats.en_revision, href: '/admin/portal?estado=en_revision' },
    { key: 'aprobado',    count: stats.aprobado,    href: '/admin/portal?estado=aprobado' },
    { key: 'rechazado',   count: stats.rechazado,   href: '/admin/portal?estado=rechazado' },
    { key: 'publicado',   count: stats.publicado,   href: '/admin/portal?estado=publicado' },
  ]

  return (
    <div style={{
      padding: '28px 32px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0f172a',
    }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #003087, #0052cc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
          }}>🎓</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>
              Dashboard — Portal UNC
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', textTransform: 'capitalize' }}>
              {dateStr}
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        {statCards.map(({ key, count, href }) => {
          const meta = statusMeta[key]
          return (
            <a key={key} href={href} style={{ textDecoration: 'none' }}>
              <Card style={{ padding: '18px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{meta.icon}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: 1 }}>
                  {count}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: meta.color, marginTop: '4px' }}>
                  {meta.label}
                </div>
              </Card>
            </a>
          )
        })}

        {/* Total card */}
        <Card style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #003087 0%, #0052cc 100%)',
          border: 'none',
        }}>
          <div style={{ fontSize: '22px', marginBottom: '8px' }}>📰</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
            Total Noticias
          </div>
        </Card>
      </div>

      {/* KPI row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '14px',
        marginBottom: '24px',
      }}>
        {[
          { label: 'Tasa de Aprobación', value: `${tasaAprobacion}%`, icon: '📈', color: tasaAprobacion >= 80 ? '#047857' : '#b45309' },
          { label: 'Usuarios Registrados', value: totalUsers, icon: '👥', color: '#1d4ed8' },
          { label: 'Pendientes de Revisión', value: stats.en_revision, icon: '⏳', color: stats.en_revision > 5 ? '#b91c1c' : '#047857' },
        ].map((kpi) => (
          <Card key={kpi.label} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '28px' }}>{kpi.icon}</div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: kpi.color }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{kpi.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '20px' }}>

        {/* Noticias recientes */}
        <Card>
          <SectionTitle>📰 Noticias Recientes</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            {noticias.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No hay noticias todavía
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    {['Título', 'Estado', 'Actualizado'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                        fontWeight: '700', color: '#64748b', letterSpacing: '0.05em',
                        textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {noticias.map((n: any) => (
                    <tr key={n.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <a
                          href={`/admin/collections/noticias/${n.id}`}
                          style={{ fontWeight: '500', fontSize: '14px', color: '#0f172a', textDecoration: 'none' }}
                        >
                          {n.title || 'Sin título'}
                        </a>
                        {n.slug && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                            /{n.slug}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={n.approvalStatus ?? 'draft'} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(n.updatedAt).toLocaleDateString('es-PY', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
            <a href="/admin/collections/noticias" style={{
              fontSize: '13px', color: '#0052cc', textDecoration: 'none', fontWeight: '500',
            }}>
              Ver todas las noticias →
            </a>
          </div>
        </Card>

        {/* Panel derecho */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Acciones rápidas */}
          <Card>
            <SectionTitle>⚡ Acciones Rápidas</SectionTitle>
            <div style={{ padding: '12px' }}>
              {[
                { href: '/admin/collections/noticias/create', label: '➕ Nueva Noticia', primary: true },
                { href: '/admin/collections/media/create', label: '🖼  Subir Media', primary: false },
                { href: '/admin/collections/users/create', label: '👤 Nuevo Usuario', primary: false },
                { href: '/admin/portal-monitoring', label: '📊 Ver Monitoreo', primary: false },
                { href: '/admin/portal-audit', label: '📋 Ver Auditoría', primary: false },
              ].map(({ href, label, primary }) => (
                <a key={href} href={href} style={{
                  display: 'block',
                  padding: '9px 14px',
                  marginBottom: '6px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  color: primary ? '#fff' : '#0f172a',
                  background: primary ? 'linear-gradient(135deg, #003087, #0052cc)' : '#f8fafc',
                  border: primary ? 'none' : '1px solid #e2e8f0',
                  transition: 'opacity 0.15s',
                }}>
                  {label}
                </a>
              ))}
            </div>
          </Card>

          {/* Health rápido */}
          <Card>
            <SectionTitle>🔧 Estado del Sistema</SectionTitle>
            <div style={{ padding: '12px 16px' }}>
              {[
                { label: 'CMS (Payload)', key: 'cms' },
                { label: 'Base de Datos', key: 'database' },
                { label: 'MinIO S3', key: 'minio' },
                { label: 'Portal Web', key: 'portal' },
              ].map(({ label }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #f8fafc',
                }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{label}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    fontSize: '12px', fontWeight: '600', color: '#047857',
                  }}>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      backgroundColor: '#10b981', display: 'inline-block',
                    }} />
                    Activo
                  </span>
                </div>
              ))}
              <a href="/admin/portal-monitoring" style={{
                display: 'block', marginTop: '10px', fontSize: '12px',
                color: '#0052cc', textDecoration: 'none',
              }}>
                Ver métricas completas →
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* Auditoría reciente */}
      <Card>
        <SectionTitle>🛡️ Actividad Reciente (Auditoría)</SectionTitle>
        {auditLogs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
            Sin registros de auditoría
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['Usuario', 'Acción', 'Colección', 'Resultado', 'Fecha'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                    fontWeight: '700', color: '#64748b', letterSpacing: '0.05em',
                    textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#374151' }}>
                    {log.usuario ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: '12px', padding: '2px 8px', borderRadius: '4px',
                      backgroundColor: '#f1f5f9', color: '#374151', fontWeight: '500',
                    }}>
                      {log.accion ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '13px', color: '#64748b' }}>
                    {log.coleccion ?? '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: '600',
                      color: log.resultado === 'exito' ? '#047857' : '#b91c1c',
                    }}>
                      {log.resultado === 'exito' ? '✓ Éxito' : '✗ Error'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {log.fechaHora
                      ? new Date(log.fechaHora).toLocaleString('es-PY', {
                          day: '2-digit', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
          <a href="/admin/portal-audit" style={{ fontSize: '13px', color: '#0052cc', textDecoration: 'none', fontWeight: '500' }}>
            Ver auditoría completa →
          </a>
        </div>
      </Card>

    </div>
  )
}
