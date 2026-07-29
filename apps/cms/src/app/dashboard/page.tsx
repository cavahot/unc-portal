'use client'

import { useEffect, useState } from 'react'

interface Stats {
  borrador: number
  enRevision: number
  aprobado: number
  rechazado: number
  publicado: number
  total: number
}

interface Noticia {
  id: number
  title: string
  slug: string
  category: string
  approvalStatus: string
  createdBy: string
  updatedAt: string
  publishedAt: string | null
  lastComment: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  totalDocs: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  en_revision: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  publicado: 'bg-blue-100 text-blue-800',
}

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  en_revision: 'En Revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  publicado: 'Publicado',
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('en_revision')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchStats()
    fetchNoticias()
  }, [selectedStatus, page])

  async function fetchStats() {
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()
      setStats(data.stats)
      setError(null)
    } catch (err) {
      setError('Error cargando estadísticas')
      console.error(err)
    }
  }

  async function fetchNoticias() {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/noticias?status=${selectedStatus}&page=${page}`)
      const data = await res.json()
      setNoticias(data.noticias)
      setPagination(data.pagination)
      setError(null)
    } catch (err) {
      setError('Error cargando noticias')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openNoticia = (id: number) => {
    window.location.href = `/admin/collections/noticias/${id}`
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ marginBottom: '30px', fontSize: '32px', fontWeight: 'bold' }}>
        📋 Dashboard Editorial
      </h1>

      {error && (
        <div style={{ padding: '12px', marginBottom: '20px', backgroundColor: '#fee', borderRadius: '4px', color: '#c00' }}>
          {error}
        </div>
      )}

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        {stats && [
          { label: 'Borrador', count: stats.borrador, status: 'draft', icon: '📝' },
          { label: 'En Revisión', count: stats.enRevision, status: 'en_revision', icon: '👀' },
          { label: 'Aprobado', count: stats.aprobado, status: 'aprobado', icon: '✅' },
          { label: 'Rechazado', count: stats.rechazado, status: 'rechazado', icon: '❌' },
          { label: 'Publicado', count: stats.publicado, status: 'publicado', icon: '🚀' },
        ].map((item) => (
          <div
            key={item.status}
            onClick={() => {
              setSelectedStatus(item.status)
              setPage(1)
            }}
            style={{
              padding: '16px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedStatus === item.status ? '#f0f9ff' : '#fff',
              borderColor: selectedStatus === item.status ? '#0084ff' : '#ddd',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0084ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = selectedStatus === item.status ? '#0084ff' : '#ddd'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{item.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '4px' }}>{item.count}</div>
          </div>
        ))}
      </div>

      {/* Tabla de Noticias */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {statusLabels[selectedStatus]}
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
            Cargando noticias...
          </div>
        ) : noticias.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
            No hay noticias en este estado
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Título</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Categoría</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Autor</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Actualizado</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Comentario</th>
                </tr>
              </thead>
              <tbody>
                {noticias.map((noticia) => (
                  <tr
                    key={noticia.id}
                    onClick={() => openNoticia(noticia.id)}
                    style={{
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <strong>{noticia.title}</strong>
                      <div style={{ fontSize: '12px', color: '#666' }}>/{noticia.slug}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', backgroundColor: '#e8f0fe', color: '#1f2937' }}>
                        {noticia.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>{noticia.createdBy}</div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                      {new Date(noticia.updatedAt).toLocaleDateString('es-PY', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#666', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {noticia.lastComment || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', borderTop: '1px solid #ddd' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Página {pagination.page} de {pagination.totalPages} ({pagination.totalDocs} total)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrevPage}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: pagination.hasPrevPage ? 'pointer' : 'not-allowed',
                  backgroundColor: pagination.hasPrevPage ? '#fff' : '#f8f9fa',
                  opacity: pagination.hasPrevPage ? 1 : 0.5,
                }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNextPage}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed',
                  backgroundColor: pagination.hasNextPage ? '#fff' : '#f8f9fa',
                  opacity: pagination.hasNextPage ? 1 : 0.5,
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '4px', fontSize: '12px', color: '#0051b3' }}>
        💡 Tip: Haz clic en una noticia para editarla. Cambia el estado de aprobación desde el panel lateral.
      </div>
    </div>
  )
}
