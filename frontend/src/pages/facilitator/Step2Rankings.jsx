import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../utils/api.js'
import { socket } from '../../utils/socket.js'
import {
  DistributionView, GroupsView,
  computeGroups,
} from '../../components/RankingViews.jsx'

export default function Step2Rankings() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [view, setView]                         = useState('individual')
  const [ranking, setRanking]                   = useState([])
  const [groups, setGroups]                     = useState([])
  const [totalJoined, setTotalJoined]           = useState(0)
  const [calculatorStarted, setCalculatorStarted] = useState(false)
  const [showRanking, setShowRanking]           = useState(false)
  const [revealed, setRevealed]                 = useState(false)

  const joinUrl = `${window.location.origin}/?code=${code}`

  useEffect(() => {
    api.get(`/api/results/${code}/ranking`)
      .then(res => {
        const items = res.data.map(r => ({
          name: 'Anónimo',
          group: r.group,
          tons: r.carbonTons,
          category: r.category,
          areas: r.areas || {},
          answers: r.answers || {},
        }))
        setRanking(items)
        setGroups(computeGroups(items))
        setTotalJoined(prev => Math.max(prev, items.length))
      })
      .catch(() => {})

    socket.emit('facilitator:join', { code })

    socket.on('ranking:update', data => {
      if (data.individual) {
        const sorted = [...data.individual]
          .map(r => ({ ...r, answers: r.answers || {} }))
          .sort((a, b) => a.tons - b.tons)
        setRanking(sorted)
        setGroups(computeGroups(sorted))
      }
    })

    socket.on('participant:joined', data => setTotalJoined(data.count))

    socket.on('results:revealed', () => {
      setRevealed(true)
      setShowRanking(true)
    })

    return () => {
      socket.off('ranking:update')
      socket.off('participant:joined')
      socket.off('results:revealed')
    }
  }, [code])

  async function handleStartCalculator() {
    setCalculatorStarted(true)
    socket.emit('step:change', { sessionCode: code, step: 2 })
    try { await api.patch(`/api/sessions/${code}/step`, { step: 2 }) } catch {}
  }

  async function handleReveal() {
    setRevealed(true)
    setShowRanking(true)
    socket.emit('results:reveal', { sessionCode: code })
    try { await api.patch(`/api/sessions/${code}/reveal`) } catch {}
  }

  async function handleClose() {
    if (!confirm('¿Cerrar esta sesión? Los participantes no podrán seguir enviando resultados.')) return
    try { await api.delete(`/api/sessions/${code}`) } catch {}
    navigate('/dashboard')
  }

  const completed   = ranking.length
  const total       = Math.max(totalJoined, completed)
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  // ── Phase 0: before calculator started — fullscreen QR ───────────────────────
  if (!calculatorStarted) return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 52px)',
      background: '#fff', gap: '1.5rem', padding: '2.5rem 2rem', textAlign: 'center',
    }}>
      <div style={{ padding: '16px', background: '#fff', border: '1px solid #e0e0d8', borderRadius: '12px' }}>
        <QRCodeSVG value={joinUrl} size={220} fgColor="#2d5a27" bgColor="#ffffff" level="M" />
      </div>

      <div style={{ fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.1em', color: '#2d5a27', lineHeight: 1 }}>
        {code}
      </div>

      <div style={{ fontSize: '0.72rem', color: '#bbb', letterSpacing: '0.04em', wordBreak: 'break-all', maxWidth: 320 }}>
        {joinUrl}
      </div>

      <div style={{ marginTop: '0.5rem' }}>
        <div style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1, color: '#1a1a1a' }}>
          {totalJoined}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.5rem' }}>
          participante{totalJoined !== 1 ? 's' : ''} conectado{totalJoined !== 1 ? 's' : ''}
        </div>
      </div>

      <button
        onClick={handleStartCalculator}
        style={{
          background: '#2d5a27', color: '#fff', border: 'none',
          padding: '1rem 2.5rem', fontSize: '0.88rem', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          borderRadius: '4px', cursor: 'pointer', marginTop: '0.5rem',
        }}
      >
        Iniciar calculadora →
      </button>
    </div>
  )

  // ── Sidebar (phases 1 & 2) ────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #e0e0d8', padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ padding: '10px', background: '#fff', border: '1px solid #e0e0d8', borderRadius: '8px' }}>
        <QRCodeSVG value={joinUrl} size={160} fgColor="#2d5a27" bgColor="#ffffff" level="M" />
      </div>
      <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.1em', color: '#2d5a27' }}>{code}</div>
      <div style={{ fontSize: '0.62rem', color: '#bbb', textAlign: 'center', letterSpacing: '0.04em', wordBreak: 'break-all' }}>{joinUrl}</div>

      <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

      <div style={{ background: '#f5f5f0', padding: '0.85rem 1.25rem', textAlign: 'center', width: '100%', borderRadius: '8px' }}>
        <div style={{ fontWeight: 900, fontSize: '2.2rem', lineHeight: 1, color: '#1a1a1a' }}>{total === 0 ? '0/0' : `${completed}/${total}`}</div>
        <div style={{ fontSize: '0.68rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem' }}>Completados</div>
      </div>
      <div style={{ width: '100%', height: 5, background: '#e0e0d8', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: completed > 0 && completed >= total ? '#2d5a27' : '#7db87a', borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

      <button
        disabled
        style={{ width: '100%', background: '#eaf3de', color: '#2d5a27', border: '1px solid #c8e6c0', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', cursor: 'default' }}
      >
        ✓ Calculadora activa
      </button>

      <button
        onClick={revealed ? undefined : handleReveal}
        disabled={revealed}
        style={{ width: '100%', background: revealed ? '#eaf3de' : '#2d5a27', color: revealed ? '#2d5a27' : '#fff', border: revealed ? '1px solid #c8e6c0' : 'none', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', cursor: revealed ? 'default' : 'pointer' }}
      >
        {revealed ? '✓ Resultados revelados' : `Revelar resultados (${completed})`}
      </button>

      <button onClick={handleClose} style={{ width: '100%', background: 'transparent', color: '#cc4444', border: '1px solid #e0e0d8', padding: '0.7rem', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', marginTop: 'auto', cursor: 'pointer' }}>
        Cerrar sesión
      </button>
    </div>
  )

  // ── Phase 1: calculator active, waiting for results ───────────────────────────
  if (!showRanking) return (
    <div style={{ flex: 1, display: 'flex', background: '#ffffff', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: 'clamp(5rem, 12vw, 9rem)', lineHeight: 1, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
            {total === 0 ? '–' : `${completed}/${total}`}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.75rem' }}>
            {total === 0 ? 'Esperando respuestas...' : completed === total && total > 0 ? 'Todos han completado' : 'han completado la calculadora'}
          </div>
          {total > 0 && (
            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', width: 260, margin: '1.5rem auto 0' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: completed >= total ? '#2d5a27' : '#7db87a', borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Phase 2: results revealed ─────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', background: '#ffffff', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}
      <div style={{ flex: 1, padding: '2.5rem', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase' }}>
            {view === 'individual' ? 'Distribución' : 'Ranking por Equipo'}
          </h1>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['individual', 'groups'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? '#2d5a27' : 'transparent', color: view === v ? '#fff' : '#666', border: `1px solid ${view === v ? '#2d5a27' : '#e0e0d8'}`, padding: '0.45rem 1.1rem', fontSize: '0.75rem', letterSpacing: '0.06em', borderRadius: '4px', cursor: 'pointer' }}>
                {v === 'individual' ? 'Individual' : 'Equipos'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ animation: 'rankReveal 0.4s ease both' }}>
          <style>{`@keyframes rankReveal { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
          {view === 'individual'
            ? <DistributionView ranking={ranking} />
            : <GroupsView groups={groups} />
          }
        </div>
      </div>
    </div>
  )
}
