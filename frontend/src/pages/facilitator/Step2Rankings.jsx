import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../utils/api.js'
import { socket } from '../../utils/socket.js'
import { ACTIONS, AREA_EMOJI, AREA_LABEL } from '../../utils/actions.js'
import {
  DistributionView, GroupsView,
  computeGroups,
} from '../../components/RankingViews.jsx'

export default function Step2Rankings() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [view, setView]                             = useState('individual')
  const [ranking, setRanking]                       = useState([])
  const [groups, setGroups]                         = useState([])
  const [totalJoined, setTotalJoined]               = useState(0)
  const [calculatorStarted, setCalculatorStarted]   = useState(true)
  const [showRanking, setShowRanking]               = useState(false)
  const [revealed, setRevealed]                     = useState(false)

  // Step 3 state
  const [activeStep, setActiveStep]                 = useState(2)
  const [step3Started, setStep3Started]             = useState(false)
  const [teamConfirmations, setTeamConfirmations]   = useState({})
  const [step3Revealed, setStep3Revealed]           = useState(false)
  const [winnersRevealed, setWinnersRevealed]       = useState(false)
  const [step3Data, setStep3Data]                   = useState(null)
  const [sessionGroups, setSessionGroups]           = useState([])
  const [activeTeamTab,  setActiveTeamTab]          = useState(null)
  const [teamSelections, setTeamSelections]         = useState({})
  const [filter3Area,    setFilter3Area]            = useState('all')
  const [sessionStatus,  setSessionStatus]           = useState(null)

  const joinUrl = `${window.location.origin}/?code=${code}`

  async function fetchStep3Data() {
    try {
      const res = await api.get(`/api/sessions/${code}/step3`)
      setStep3Data(res.data)
      setSessionGroups(res.data.teams.map(t => t.group))
    } catch {}
  }

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

    api.get(`/api/sessions/${code}`)
      .then(res => {
        const s = res.data
        setSessionStatus(s.status)
        setSessionGroups(s.groups || [])
        if (s.resultsRevealed) { setRevealed(true); setShowRanking(true) }
        if (s.step3Revealed)   setStep3Revealed(true)
        if (s.winnersRevealed) setWinnersRevealed(true)
        if (s.currentStep >= 3) { setStep3Started(true); setActiveStep(3) }
      })
      .catch(() => {})

    fetchStep3Data()
  }, [code])

  useEffect(() => {
    // Ensure socket is connected and join the session room
    const joinRoom = () => socket.emit('facilitator:join', { code })
    if (!socket.connected) socket.connect()
    joinRoom()

    // Re-join after reconnect so the room membership survives network drops
    socket.on('connect', joinRoom)

    socket.on('participant:joined', ({ total, count }) => setTotalJoined(total ?? count ?? 0))
    socket.on('ranking:update', ({ individual }) => {
      if (individual) {
        const sorted = [...individual].sort((a, b) => a.tons - b.tons)
        setRanking(sorted)
        setGroups(computeGroups(sorted))
        setShowRanking(true)
      }
    })
    socket.on('team:confirmed', ({ group, confirmed, confirmedFinal }) => {
      setTeamConfirmations(prev => ({ ...prev, [group]: { confirmed, confirmedFinal } }))
    })
    socket.on('step3:revealed', () => setStep3Revealed(true))
    socket.on('winners:revealed', () => setWinnersRevealed(true))

    return () => {
      socket.off('connect', joinRoom)
      socket.off('participant:joined')
      socket.off('ranking:update')
      socket.off('team:confirmed')
      socket.off('step3:revealed')
      socket.off('winners:revealed')
    }
  }, [code])

  async function handleReveal() {
    if (!window.confirm(`¿Revelar los resultados a los ${ranking.length} participantes?`)) return
    setRevealed(true)
    setShowRanking(true)
    socket.emit('results:reveal', { sessionCode: code })
    try { await api.patch(`/api/sessions/${code}/reveal`) } catch {}
  }

  async function handleClose() {
    const choice = window.confirm(
      '¿Qué quieres hacer con esta sesión?\n\nPulsa ACEPTAR para CERRAR la sesión (los participantes verán la pantalla de fin).\n\nPulsa CANCELAR para dejarla activa y retomarla más tarde.'
    )
    if (!choice) return
    try { await api.patch(`/api/sessions/${code}/close`) } catch {}
    navigate('/dashboard')
  }

  async function handleActivate() {
    try {
      await api.patch(`/api/sessions/${code}/activate`)
      setSessionStatus('active')
    } catch {}
  }

  async function handleStartStep3() {
    setStep3Started(true)
    setActiveStep(3)
    socket.emit('step:change', { sessionCode: code, step: 3 })
    try { await api.patch(`/api/sessions/${code}/step`, { step: 3 }) } catch {}
  }

  async function handleRevealStep3() {
    socket.emit('step3:reveal', { sessionCode: code })
  }

  async function handleRevealWinners() {
    socket.emit('winners:reveal', { sessionCode: code })
  }

  const completed   = ranking.length
  const total       = Math.max(totalJoined, completed)
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const confirmedCount      = sessionGroups.filter(g => teamConfirmations[g]?.confirmed).length
  const confirmedFinalCount = sessionGroups.filter(g => teamConfirmations[g]?.confirmedFinal).length
  const allConfirmed        = sessionGroups.length > 0 && sessionGroups.every(g => teamConfirmations[g]?.confirmed)
  const allConfirmedFinal   = sessionGroups.length > 0 && confirmedFinalCount === sessionGroups.length

  const groupAvgTons = sessionGroups.reduce((acc, g) => {
    const members = ranking.filter(r => r.group === g)
    if (members.length > 0) acc[g] = members.reduce((s, r) => s + r.tons, 0) / members.length
    return acc
  }, {})

  // ── Draft ─────────────────────────────────────────────────────────────────────
  if (sessionStatus === 'draft') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)', background: '#f5f5f5', gap: '1.5rem', padding: '2.5rem 2rem', textAlign: 'center' }}>
      <div style={{ padding: '16px', background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px' }}>
        <QRCodeSVG value={joinUrl} size={180} fgColor="#000000" bgColor="#ffffff" level="M" />
      </div>
      <div style={{ fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.1em', color: '#0a0a0a', lineHeight: 1 }}>{code}</div>
      <p style={{ fontSize: '0.9rem', color: '#999', maxWidth: 360, lineHeight: 1.65 }}>
        La sesión está en borrador. Actívala para que los participantes puedan entrar.
      </p>
      <button onClick={handleActivate} style={{ background: '#0a0a0a', color: '#fff', border: 'none', padding: '0.9rem 2.5rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '999px', cursor: 'pointer' }}>
        Activar sesión →
      </button>
    </div>
  )

  // ── Step 3 panel (inside revealed view) ──────────────────────────────────────
  const step3Panel = (() => {
    if (!step3Data && !step3Started) return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', color: '#aaa' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
          <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Espera a que terminen la calculadora
          </div>
        </div>
      </div>
    )

    if (!step3Revealed && step3Data) {
      const AREA_ORDER = ['transport', 'energy', 'food', 'consumption', 'waste']
      const A_COLORS = { transport: '#38bdf8', energy: '#f59e0b', food: '#4ade80', consumption: '#a855f7', waste: '#f472b6' }

      const selected = teamSelections[activeTeamTab] || []
      const conf = activeTeamTab ? teamConfirmations[activeTeamTab] : null

      const allAreaActions = ACTIONS.filter(a => filter3Area === 'all' || a.area === filter3Area)
      const selectedBudget = selected.reduce((s, id) => {
        const a = ACTIONS.find(x => x.id === id)
        return s + (a?.cost || 0)
      }, 0)
      const MAX_POINTS = 5

      async function handleConfirmTeam(group) {
        const sel = teamSelections[group] || []
        if (!sel.length) return
        try {
          await api.post(`/api/sessions/${code}/team-actions`, {
            group,
            actions: sel,
            pointsUsed: sel.reduce((s, id) => { const a = ACTIONS.find(x => x.id === id); return s + (a?.cost || 0) }, 0),
          })
          socket.emit('team:confirm', { sessionCode: code, group, actions: sel })
          setTeamConfirmations(prev => ({ ...prev, [group]: { ...prev[group], confirmed: true } }))
          await fetchStep3Data()
        } catch {}
      }

      return (
        <div style={{ flex: 1, padding: '2rem', overflow: 'auto', background: '#f5f5f5' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e5e5', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#0a0a0a' }}>Fase de acciones</h1>
              <span style={{ fontSize: '0.75rem', color: '#666', background: '#f5f5f5', padding: '0.3rem 0.85rem', borderRadius: 999, border: '1px solid #e5e5e5' }}>
                {confirmedCount}/{sessionGroups.length} equipos confirmados
              </span>
            </div>

            {/* Team tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {sessionGroups.map(g => {
                const isActive = activeTeamTab === g
                const isConf = teamConfirmations[g]?.confirmed
                return (
                  <button key={g} onClick={() => setActiveTeamTab(g)} style={{
                    padding: '0.4rem 1rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                    background: isActive ? '#0a0a0a' : '#ffffff',
                    color: isActive ? '#fff' : (isConf ? '#16a34a' : '#666'),
                    border: `1px solid ${isActive ? '#0a0a0a' : (isConf ? '#bbf7d0' : '#e5e5e5')}`,
                    cursor: 'pointer',
                  }}>
                    {isConf ? '✓ ' : ''}{g}
                  </button>
                )
              })}
            </div>

            {activeTeamTab && (() => {
              const teamData = step3Data?.teams?.find(t => t.group === activeTeamTab)
              const selected = teamSelections[activeTeamTab] || []
              const conf = teamConfirmations[activeTeamTab]
              const budget = selected.reduce((s, id) => { const a = ACTIONS.find(x => x.id === id); return s + (a?.cost || 0) }, 0)

              return (
                <div style={{ maxWidth: 680 }}>
                  {/* Budget bar */}
                  <div style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Puntos usados</span>
                    <div style={{ flex: 1, height: 8, background: '#e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(budget / MAX_POINTS) * 100}%`, background: budget >= MAX_POINTS ? '#ef4444' : '#0a0a0a', borderRadius: 4, transition: 'width 0.3s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: budget >= MAX_POINTS ? '#ef4444' : '#0a0a0a' }}>{budget}/{MAX_POINTS}</span>
                  </div>

                  {/* Area filter */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {[{ id: 'all', label: 'Todas' }, ...['transport','energy','food','consumption','waste'].map(a => ({ id: a, label: AREA_LABEL[a] }))].map(f => (
                      <button key={f.id} onClick={() => setFilter3Area(f.id)} style={{
                        padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600,
                        background: filter3Area === f.id ? '#0a0a0a' : 'transparent',
                        color: filter3Area === f.id ? '#fff' : '#666',
                        border: `1px solid ${filter3Area === f.id ? '#0a0a0a' : '#e5e5e5'}`,
                        cursor: 'pointer',
                      }}>{f.label}</button>
                    ))}
                  </div>

                  {/* Actions list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {ACTIONS.filter(a => filter3Area === 'all' || a.area === filter3Area).map(a => {
                      const isSel = selected.includes(a.id)
                      const wouldExceed = !isSel && (budget + a.cost) > MAX_POINTS
                      return (
                        <div key={a.id}
                          onClick={() => {
                            if (wouldExceed) return
                            setTeamSelections(prev => {
                              const cur = prev[activeTeamTab] || []
                              return { ...prev, [activeTeamTab]: isSel ? cur.filter(x => x !== a.id) : [...cur, a.id] }
                            })
                          }}
                          style={{
                            padding: '0.85rem 1rem', borderRadius: '12px', cursor: wouldExceed ? 'default' : 'pointer',
                            border: `1px solid ${isSel ? '#0a0a0a' : '#e5e5e5'}`,
                            background: isSel ? '#f5f5f5' : (wouldExceed ? '#fafafa' : '#ffffff'),
                            opacity: wouldExceed ? 0.45 : 1,
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{AREA_EMOJI[a.area]}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0a0a0a', lineHeight: 1.3 }}>{a.label}</div>
                            {a.description && <div style={{ fontSize: '0.68rem', color: '#666', marginTop: '0.2rem' }}>{a.description}</div>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#666' }}>{'★'.repeat(a.cost)}</span>
                            <span style={{ fontSize: '0.65rem', color: '#666' }}>−{a.co2Reduction} kg</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => handleConfirmTeam(activeTeamTab)}
                    disabled={selected.length === 0}
                    style={{
                      width: '100%', padding: '0.9rem', borderRadius: '999px', border: 'none',
                      background: selected.length > 0 ? '#0a0a0a' : '#f5f5f5',
                      color: selected.length > 0 ? '#fff' : '#999',
                      fontWeight: 600, fontSize: '0.85rem', cursor: selected.length > 0 ? 'pointer' : 'default',
                    }}
                  >
                    {conf?.confirmed ? '✓ Confirmar de nuevo — ' : ''}
                    Confirmar acciones de {activeTeamTab} →
                  </button>
                </div>
              )
            })()}

            {allConfirmed && (
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e5e5' }}>
                <button
                  onClick={handleRevealStep3}
                  style={{ width: '100%', maxWidth: 680, padding: '1rem', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Revelar huella a todos los equipos →
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    return step3Data ? <Step3Results step3Data={step3Data} ranking={ranking} sessionGroups={sessionGroups} /> : null
  })()

  // ── Step3Results helper ───────────────────────────────────────────────────────
  function Step3Results({ step3Data, ranking, sessionGroups }) {
    const AREA_ORDER = ['transport', 'energy', 'food', 'consumption', 'waste']
    const A_COLORS = { transport: '#38bdf8', energy: '#f59e0b', food: '#4ade80', consumption: '#a855f7', waste: '#f472b6' }

    const sortedTeams = [...(step3Data.teams || [])].sort((a, b) => (b.totalReduction || 0) - (a.totalReduction || 0))
    const maxOriginal = Math.max(...sortedTeams.map(t => t.originalTons || 0), 0.1)

    const getGroupAreaAvg = (group) => {
      const members = ranking.filter(r => r.group === group)
      if (!members.length) return {}
      const avg = {}
      AREA_ORDER.forEach(area => { avg[area] = members.reduce((s, r) => s + (r.areas?.[area] || 0), 0) / members.length })
      return avg
    }

    const getGroupAreaAfter = (group, areaAvg) => {
      const teamData = step3Data.teams?.find(t => t.group === group)
      const red = { transport: 0, energy: 0, food: 0, consumption: 0, waste: 0 }
      if (teamData?.actions) {
        teamData.actions.forEach(id => {
          const a = ACTIONS.find(x => x.id === id)
          if (a) red[a.area] = (red[a.area] || 0) + a.co2Reduction / 1000
        })
      }
      const after = {}
      AREA_ORDER.forEach(area => { after[area] = Math.max(0, (areaAvg[area] || 0) - (red[area] || 0)) })
      return after
    }

    const StackedBar = ({ areaAvg, total, maxVal, label, muted = false }) => (
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontSize: '0.65rem', color: '#aaa' }}>{label}</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#000' }}>{total.toFixed(1)} t</span>
        </div>
        <div style={{ height: 12, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
          {AREA_ORDER.map(area => {
            const pct = maxVal > 0 ? (areaAvg[area] / maxVal) * 100 : 0
            if (pct < 0.1) return null
            return <div key={area} style={{ width: `${pct}%`, background: A_COLORS[area], opacity: muted ? 0.7 : 1 }} />
          })}
        </div>
      </div>
    )

    const globalBefore = step3Data.teams?.length
      ? step3Data.teams.reduce((s, t) => s + (t.originalTons || 0), 0) / step3Data.teams.length
      : 0
    const globalAfter = step3Data.teams?.length
      ? step3Data.teams.reduce((s, t) => s + (t.newTons || 0), 0) / step3Data.teams.length
      : 0
    const globalAreaAvg = AREA_ORDER.reduce((acc, area) => {
      acc[area] = ranking.length ? ranking.reduce((s, r) => s + (r.areas?.[area] || 0), 0) / ranking.length : 0
      return acc
    }, {})

    return (
      <div style={{ flex: 1, padding: '2rem', overflow: 'auto', background: '#f5f5f5' }}>
        <h1 style={{ fontWeight: 900, fontSize: '1.4rem', color: '#0a0a0a', marginBottom: '1.5rem' }}>Resultados por equipo</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Column 1: Teams */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.85rem' }}>Equipos</div>
            {sortedTeams.map((team, i) => {
              const areaAvg  = getGroupAreaAvg(team.group)
              const areaAfter = getGroupAreaAfter(team.group, areaAvg)
              return (
                <div key={team.group} style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '0.85rem 0.9rem', marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '1rem', color: '#0a0a0a', width: 22 }}>#{i + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1, color: '#0a0a0a' }}>{team.group}</span>
                    {team.totalReduction > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', background: 'rgba(74,222,128,0.1)', padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
                        −{(team.totalReduction / 1000).toFixed(1)} t
                      </span>
                    )}
                  </div>
                  <StackedBar areaAvg={areaAvg}   total={team.originalTons || 0} maxVal={maxOriginal} label="Antes" />
                  <StackedBar areaAvg={areaAfter} total={team.newTons || 0}      maxVal={maxOriginal} label="Después" muted />
                </div>
              )
            })}
          </div>

          {/* Column 2: Global distribution */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.85rem' }}>Distribución global</div>
            <div style={{ padding: '0.85rem 0.9rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e5e5', marginBottom: '0.75rem' }}>
              <StackedBar areaAvg={globalAreaAvg} total={globalBefore} maxVal={globalBefore} label="Media antes" />
              <StackedBar areaAvg={globalAreaAvg} total={globalAfter}  maxVal={globalBefore} label="Media después" muted />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(74,222,128,0.1)', borderRadius: '999px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#16a34a' }}>−{(globalBefore - globalAfter).toFixed(1)} t</span>
                <span style={{ fontSize: '0.65rem', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ahorro medio</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {AREA_ORDER.map(area => (
                <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: A_COLORS[area], flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#666' }}>{AREA_LABEL[area]}</span>
                </div>
              ))}
            </div>

            {!winnersRevealed && step3Data.allConfirmedFinal && (
              <button
                onClick={handleRevealWinners}
                style={{ width: '100%', marginTop: '1.5rem', padding: '0.9rem', background: '#0a0a0a', color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Revelar ganadores →
              </button>
            )}

            {/* Action stats */}
            {step3Data.actionStats?.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.6rem' }}>Acciones más elegidas</div>
                {step3Data.actionStats.slice(0, 6).map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '5px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <span style={{ fontSize: '1rem' }}>{AREA_EMOJI[a.area]}</span>
                    <span style={{ flex: 1, fontSize: '0.72rem', color: '#0a0a0a' }}>{a.label}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#f5f5f5', padding: '2px 8px', borderRadius: '999px', color: '#0a0a0a' }}>
                      {a.count}/{sessionGroups.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #e5e5e5', padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: '#ffffff' }}>
      {/* QR */}
      <div style={{ padding: '12px', background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px' }}>
        <QRCodeSVG value={joinUrl} size={160} fgColor="#000000" bgColor="#ffffff" level="M" />
      </div>
      <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.1em', color: '#0a0a0a' }}>{code}</div>
      <div style={{ fontSize: '0.62rem', color: '#999', textAlign: 'center', letterSpacing: '0.04em', wordBreak: 'break-all' }}>{joinUrl}</div>

      <div style={{ width: '100%', borderTop: '1px solid #e5e5e5' }} />

      {/* Counter */}
      <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#0a0a0a', lineHeight: 1 }}>{completed}</div>
        <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
          Huellas recibidas
        </div>
      </div>

      <div style={{ width: '100%', borderTop: '1px solid #e5e5e5' }} />

      {/* Step toggle */}
      {revealed && (
        <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
          <button
            onClick={() => setActiveStep(2)}
            style={{
              flex: 1, padding: '0.45rem', fontSize: '0.72rem', fontWeight: 700,
              background: activeStep === 2 ? '#0a0a0a' : 'transparent',
              color: activeStep === 2 ? '#fff' : '#666',
              border: `1px solid ${activeStep === 2 ? '#0a0a0a' : '#e5e5e5'}`,
              borderRadius: '999px', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            STEP 2
          </button>
          <button
            onClick={() => { setActiveStep(3); if (!step3Started) handleStartStep3() }}
            style={{
              flex: 1, padding: '0.45rem', fontSize: '0.72rem', fontWeight: 700,
              background: activeStep === 3 ? '#0a0a0a' : 'transparent',
              color: activeStep === 3 ? '#fff' : '#666',
              border: `1px solid ${activeStep === 3 ? '#0a0a0a' : '#e5e5e5'}`,
              borderRadius: '999px', cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            STEP 3
          </button>
        </div>
      )}

      {/* Step 2 controls */}
      {activeStep === 2 && (
        <>
          <button
            disabled
            style={{ width: '100%', background: '#f5f5f5', color: '#999', border: '1px solid #e5e5e5', padding: '0.8rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: '999px', cursor: 'default' }}
          >
            Calculadora activa
          </button>

          <button
            onClick={revealed ? undefined : handleReveal}
            disabled={revealed}
            style={{
              width: '100%',
              background: revealed ? '#f5f5f5' : '#0a0a0a',
              color: revealed ? '#999' : '#fff',
              border: revealed ? '1px solid #e5e5e5' : 'none',
              padding: '0.8rem', fontSize: '0.78rem', fontWeight: 600,
              borderRadius: '999px', cursor: revealed ? 'default' : 'pointer',
            }}
          >
            {revealed ? 'Resultados revelados' : `Revelar resultados (${completed})`}
          </button>

          {revealed && !step3Started && (
            <button
              onClick={() => { setActiveStep(3); handleStartStep3() }}
              style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', padding: '0.85rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: '999px', cursor: 'pointer' }}
            >
              → Iniciar fase de acciones
            </button>
          )}
        </>
      )}

      {/* Step 3 controls */}
      {activeStep === 3 && (
        <>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.68rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Equipos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {sessionGroups.map(g => {
                const conf = teamConfirmations[g]?.confirmed
                return (
                  <span key={g} style={{
                    padding: '0.3rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    background: conf ? '#f0fdf4' : '#f5f5f5',
                    color: conf ? '#16a34a' : '#999',
                    border: `1px solid ${conf ? '#bbf7d0' : '#e5e5e5'}`,
                  }}>
                    {conf ? '✓ ' : ''}{g}
                  </span>
                )
              })}
            </div>
          </div>

          {!step3Revealed && allConfirmed && (
            <button
              onClick={handleRevealStep3}
              style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '999px', cursor: 'pointer' }}
            >
              Revelar a todos →
            </button>
          )}

          {step3Revealed && (
            <button disabled style={{ width: '100%', background: '#f5f5f5', color: '#999', border: '1px solid #e5e5e5', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 600, borderRadius: '999px', cursor: 'default' }}>
              ✓ Acciones reveladas
            </button>
          )}
        </>
      )}

      <button onClick={handleClose} style={{ width: '100%', background: '#0a0a0a', color: '#fff', border: 'none', padding: '0.7rem', fontSize: '0.72rem', fontWeight: 600, borderRadius: '999px', marginTop: 'auto', cursor: 'pointer' }}>
        Cerrar sesión
      </button>
    </div>
  )

  // ── Phase 1: waiting for results ─────────────────────────────────────────────
  if (!showRanking) return (
    <div style={{ flex: 1, display: 'flex', background: '#f5f5f5', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}
      {activeStep === 3 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Espera a que terminen la calculadora
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 'clamp(5rem, 12vw, 9rem)', lineHeight: 1, color: '#0a0a0a', letterSpacing: '-0.02em' }}>
              {total === 0 ? '–' : `${completed}/${total}`}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: '0.75rem' }}>
              {total === 0 ? 'Esperando respuestas...' : completed === total && total > 0 ? 'Todos han completado' : 'han completado la calculadora'}
            </div>
            {total > 0 && (
              <div style={{ height: 6, background: '#e5e5e5', borderRadius: 3, overflow: 'hidden', width: 260, margin: '1.5rem auto 0' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: completed >= total ? '#0a0a0a' : '#666', borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ── Phase 2 / 3: results revealed ────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', background: '#f5f5f5', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}

      {activeStep === 3 ? step3Panel : (
        <div style={{ flex: 1, padding: '2.5rem', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontWeight: 900, fontSize: '1.6rem', color: '#0a0a0a' }}>
              {view === 'individual' ? 'Distribución' : 'Ranking por Equipo'}
            </h1>
            {/* Global / Equipos toggle pill */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[{ id: 'individual', label: 'Global' }, { id: 'groups', label: 'Equipos' }].map(v => (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  background: view === v.id ? '#0a0a0a' : 'transparent',
                  color: view === v.id ? '#fff' : '#666',
                  border: `1px solid ${view === v.id ? '#0a0a0a' : '#e5e5e5'}`,
                  padding: '0.4rem 1.1rem', fontSize: '0.78rem', fontWeight: 600,
                  borderRadius: '999px', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}>
                  {v.label}
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
      )}
    </div>
  )
}