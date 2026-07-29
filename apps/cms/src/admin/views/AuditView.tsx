'use client'

import React, { useEffect, useState } from 'react'

const ACTIONS = ['login', 'logout', 'crear', 'actualizar', 'eliminar', 'publicar', 'rechazar', 'aprobar', 'ver', 'exportar', 'importar', 'cambio_rol']

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterResult, setFilterResult] = useState('')

  const fetchLogs = async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '20')
      params.set('page', String(p))
      if (filterAction) params.set('accion', filterAction)
      if (filterResult) params.set('resultado', filterResult)

      const res = await fetch(`/api/auditoria?${params}`)
      const data = await res.json()
      setLogs(data.docs ?? [])
      setTotal(data.totalDocs ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchLogs(1)
  }, [filterAction, filterResult])

  const handlePage = (p: number) => {
    setPage(p)
    fetchLogs(p)
  }

  const actionColor = (accion: string) => {
    if (['crear', 'importar'].includes(accion)) return { color: '#047857', bg: '#d1fae5' }
    if (['eliminar'].includes(accion)) return { color: '#b91c1c', bg: '#fee2e2' }
    if (['login', 'logout'].includes(accion)) return { color: '#1d4ed8', bg: '#dbeafe' }
    if (['publicar', 'aprobar'].includes(accion)) return { color: '#047857', bg: '#d1fae5' }
    if (['rechazar'].includes(accion)) return { color: '#b45309', bg: '#fef3c7' }
    return { color: '#374151', bg: '#f1f5f9' }
  }

  return (
    <div style={{
      padding: '28px 32px', backgroundColor: '#f8fafc', minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>
          🛡️ Auditoría del Sistema
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
          {total} registros totales · Todas las acciones del sistema quedan registradas
        </p>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
      }}>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#fff', fontSize: '13px', color: '#0f172a', cursor: 'pointer',
          }}
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={filterResult}
          onChange={e => setFilterResult(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#fff', fontSize: '13px', color: '#0f172a', cursor: 'pointer',
          }}
        >
          <option value="">Todos los resultados</option>
          <option value="exito">Éxito</option>
          <option value="error">Error</option>
        </select>

        <button
          onClick={() => { setFilterAction(''); setFilterResult('') }}
          style={{
            padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#fff', fontSize: '13px', cursor: 'pointer', color: '#64748b',
          }}
        >
          Limpiar filtros
        </button>
      </div>

      {/* Tabla */}
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            No hay registros de auditoría con los filtros aplicados
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['Fecha', 'Usuario', 'Acción', 'Colección', 'Documento', 'IP', 'Resultado'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: '11px',
                      fontWeight: '700', color: '#64748b', letterSpacing: '0.05em',
                      textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => {
                  const aColor = actionColor(log.accion ?? '')
                  return (
                    <tr key={log.id ?? i} style={{
                      borderBottom: '1px solid #f8fafc',
                      backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}>
                      <td style={{ padding: '11px 16px', fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {log.fechaHora
                          ? new Date(log.fechaHora).toLocaleString('es-PY', {
                              day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#374151', maxWidth: '160px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.usuario ?? '—'}
                        </div>
                        {log.rol && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.rol}</div>
                        )}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: '9999px', fontSize: '12px',
                          fontWeight: '600', color: aColor.color, backgroundColor: aColor.bg,
                        }}>
                          {log.accion ?? '—'}
                        </span>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b' }}>
                        {log.coleccion ?? '—'}
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '12px', color: '#94a3b8', maxWidth: '120px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.documento ?? '—'}
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {log.ip ?? '—'}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '12px', fontWeight: '600',
                          color: log.resultado === 'exito' ? '#047857' : '#b91c1c',
                        }}>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            backgroundColor: log.resultado === 'exito' ? '#10b981' : '#ef4444',
                            display: 'inline-block',
                          }} />
                          {log.resultado === 'exito' ? 'Éxito' : 'Error'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{
            padding: '14px 20px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc',
          }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Página {page} de {totalPages} · {total} registros
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0',
                  backgroundColor: page <= 1 ? '#f8fafc' : '#fff', fontSize: '13px',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: '1px solid #e2e8f0',
                  backgroundColor: page >= totalPages ? '#f8fafc' : '#fff', fontSize: '13px',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
