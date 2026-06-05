import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../utils/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const AREA_LABELS = {
  transport: 'Transporte', energy: 'Energía', food: 'Alimentación',
  consumption: 'Consumo', waste: 'Residuos',
}

const STATUS_LABEL = { waiting: 'En espera', active: 'Activa', closed: 'Cerrada' }
const STATUS_STYLE = {
  waiting: { background: '#f5f5f0',  color: '#888' },
  active:  { background: '#eaf3de',  color: '#3b6d11' },
  closed:  { background: '#f5f5f0',  color: '#bbb' },
}

const s = {
  page:  { flex: 1, background: '#f5f5f0', padding: '3rem 2rem' },
  inner: { maxWidth: '960px', margin: '0 auto' },
  header: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem',
  },
  title:    { fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', textTransform: 'uppercase' },
  subtitle: { fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.3rem' },
  btnNew: {
    background: '#2d5a27', color: '#fff', padding: '0.75rem 1.5rem',
    fontSize: '0.85rem', letterSpacing: '0.08em', borderRadius: '4px',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card: { background: '#fff', borderRadius: '12px', padding: '1.5rem' },
  cardCode: { fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  cardMeta: { fontSize: '0.8rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' },
  groupsRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.75rem 0' },
  groupPill: {
    fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: 999,
    background: '#f0f7ee', color: '#2d5a27', border: '1px solid #c8e6c0',
  },
  badge: (status) => ({
    display: 'inline-block', padding: '3px 10px',
    fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em',
    textTransform: 'uppercase', borderRadius: 999,
    marginBottom: '1.2rem',
    ...STATUS_STYLE[status],
  }),
  cardActions: { display: 'flex', gap: '0.5rem', marginTop: '0.25rem' },
  btnOpen: {
    flex: 1, background: '#2d5a27', color: '#fff', padding: '0.55rem',
    fontSize: '0.73rem', letterSpacing: '0.08em', borderRadius: '4px', textAlign: 'center',
  },
  btnDelete: {
    background: 'transparent', color: '#bbb', padding: '0.55rem 0.75rem',
    fontSize: '0.73rem', letterSpacing: '0.06em', borderRadius: '4px',
    border: '1px solid #e0e0d8',
  },
  empty: {
    textAlign: 'center', padding: '5rem 2rem', color: '#999',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
  },
  emptyBtn: {
    background: '#2d5a27', color: '#fff', padding: '0.85rem 2rem',
    fontSize: '0.85rem', letterSpacing: '0.08em', borderRadius: '4px',
  },
}

export default function FacilitatorDashboard() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get('/api/sessions')
      .then(({ data }) => setSessions(data))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(code) {
    if (!confirm('¿Eliminar esta sesión del panel? Los datos se conservarán en la base de datos.')) return
    try {
      await api.patch(`/api/sessions/${code}/delete`)
      setSessions(prev => prev.filter(s => s.code !== code))
    } catch {
      alert('Error al eliminar la sesión')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.inner}>
        <div style={s.header}>
          <div>
            <h1 style={s.title}>Mis Sesiones</h1>
            <p style={s.subtitle}>{user?.email}</p>
          </div>
          <Link to="/session/create">
            <button style={s.btnNew}>+ Nueva Sesión</button>
          </Link>
        </div>

        {loading ? (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '3rem' }}>Cargando...</div>
        ) : sessions.length === 0 ? (
          <div style={s.empty}>
            <p style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Aún no has creado ninguna sesión
            </p>
            <Link to="/session/create">
              <button style={s.emptyBtn}>CREAR MI PRIMERA SESIÓN</button>
            </Link>
          </div>
        ) : (
          <div style={s.grid}>
            {sessions.map(session => (
              <div key={session.code} style={s.card}>
                {session.name && (
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#444', marginBottom: '0.25rem', letterSpacing: '0.01em' }}>
                    {session.name}
                  </div>
                )}
                <div style={s.cardCode}>{session.code}</div>
                <div style={s.cardMeta}>{formatDate(session.createdAt)}</div>

                {session.groups?.length > 0 && (
                  <div style={s.groupsRow}>
                    {session.groups.map(g => (
                      <span key={g} style={s.groupPill}>{g}</span>
                    ))}
                  </div>
                )}

                <div style={s.badge(session.status)}>
                  {STATUS_LABEL[session.status] || session.status}
                </div>

                {/* Summary block for sessions with revealed results */}
                {session.summary && (() => {
                  const sm = session.summary
                  const topArea = sm.byArea
                    ? Object.entries(sm.byArea).sort((a, b) => b[1] - a[1])[0]
                    : null
                  return (
                    <div style={{ background: '#f5f5f0', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 900, fontSize: '1.7rem', lineHeight: 1, color: '#1a1a1a' }}>
                          {sm.averageCarbonTons?.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          t CO₂/año media
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#666', marginBottom: topArea ? '0.4rem' : 0 }}>
                        {sm.totalParticipants} participante{sm.totalParticipants !== 1 ? 's' : ''}
                        {' · '}min {sm.minCarbonTons?.toFixed(1)} t · máx {sm.maxCarbonTons?.toFixed(1)} t
                      </div>
                      {topArea && (
                        <div style={{ fontSize: '0.68rem', color: '#888' }}>
                          Área mayor: <strong style={{ color: '#1a1a1a' }}>{AREA_LABELS[topArea[0]] || topArea[0]}</strong> ({topArea[1].toFixed(1)} t)
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Team URLs — visible for waiting/active sessions with groups */}
                {session.status !== 'closed' && session.groups?.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bbb', marginBottom: '0.5rem' }}>
                      Pantallas de equipo
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {session.groups.map(group => {
                        const slug = group.toLowerCase().replace(/\s+/g, '-')
                        const url  = `${window.location.origin}/team/${session.code}/${encodeURIComponent(slug)}`
                        return (
                          <div key={group} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555', minWidth: 60, flexShrink: 0 }}>{group}</span>
                            <code style={{ flex: 1, fontSize: '0.62rem', color: '#aaa', background: '#f5f5f0', padding: '2px 6px', borderRadius: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                              /team/{session.code}/{slug}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(url)}
                              style={{ fontSize: '0.65rem', color: '#2d5a27', background: 'transparent', border: '1px solid #c8e6c0', borderRadius: 3, padding: '2px 7px', cursor: 'pointer', flexShrink: 0 }}
                            >
                              Copiar
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={s.cardActions}>
                  <Link
                    to={session.status === 'closed'
                      ? `/session/${session.code}/stats`
                      : `/session/${session.code}/rankings`}
                    style={{ flex: 1 }}
                  >
                    <button style={{ ...s.btnOpen, width: '100%' }}>
                      {session.status === 'closed' ? 'Ver resultados' : 'Abrir sesión'}
                    </button>
                  </Link>
                  <button style={s.btnDelete} onClick={() => handleDelete(session.code)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
