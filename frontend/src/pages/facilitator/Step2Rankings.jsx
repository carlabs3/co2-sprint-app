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
  const [activeStep, setActiveStep]                 = useState(2)  // 2 | 3
  const [step3Started, setStep3Started]             = useState(false)
  const [teamConfirmations, setTeamConfirmations]   = useState({}) // { [group]: { confirmed, confirmedFinal } }
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

    // Fetch session info (groups + status)
    api.get(`/api/sessions/${code}/info`).then(res => {
      if (res.data.groups) setSessionGroups(res.data.groups)
      if (res.data.status) setSessionStatus(res.data.status)
    }).catch(() => {})

    // Check if step3 already started/revealed
    api.get(`/api/sessions/${code}/step3`).then(res => {
      if (res.data.step3Revealed) { setStep3Revealed(true); setStep3Data(res.data) }
      if (res.data.winnersRevealed) setWinnersRevealed(true)
      const tc = {}
      res.data.teams.forEach(t => { tc[t.group] = { confirmed: t.confirmed, confirmedFinal: t.confirmedFinal } })
      setTeamConfirmations(tc)
      if (res.data.teams.length > 0) setSessionGroups(res.data.teams.map(t => t.group))
    }).catch(() => {})

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

    socket.on('participant:joined', data => setTotalJoined(data.total ?? data.count ?? 0))

    socket.on('results:revealed', () => {
      setRevealed(true)
      setShowRanking(true)
    })

    socket.on('team:confirmed', ({ group }) => {
      setTeamConfirmations(prev => ({ ...prev, [group]: { ...prev[group], confirmed: true } }))
    })

    socket.on('team:actionsConfirmed', ({ group, newCarbonTons, totalReduction }) => {
      setTeamConfirmations(prev => ({
        ...prev,
        [group]: { ...prev[group], confirmed: true, newCarbonTons, totalReduction },
      }))
    })

    socket.on('team:confirmedFinal', ({ group }) => {
      setTeamConfirmations(prev => ({ ...prev, [group]: { ...prev[group], confirmedFinal: true } }))
    })

    socket.on('step3:revealed', () => {
      setStep3Revealed(true)
      fetchStep3Data()
      setStep3Started(true)
    })

    socket.on('winners:revealed', () => {
      setWinnersRevealed(true)
    })

    return () => {
      socket.off('ranking:update')
      socket.off('participant:joined')
      socket.off('results:revealed')
      socket.off('team:confirmed')
      socket.off('team:confirmedFinal')
      socket.off('team:actionsConfirmed')
      socket.off('step3:revealed')
      socket.off('winners:revealed')
    }
  }, [code])

  useEffect(() => {
    if (sessionGroups.length > 0 && !activeTeamTab) setActiveTeamTab(sessionGroups[0])
  }, [sessionGroups])

  async function handleStartCalculator() {
    setCalculatorStarted(true)
    socket.emit('step:change', { sessionCode: code, step: 2 })
    try { await api.patch(`/api/sessions/${code}/step`, { step: 2 }) } catch {}
  }

  async function handleReveal() {
    if (!confirm('¿Revelar resultados? Los participantes verán su huella en ese momento.')) return
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

  // Step 3 computed values
  const confirmedCount      = sessionGroups.filter(g => teamConfirmations[g]?.confirmed).length
  const confirmedFinalCount = sessionGroups.filter(g => teamConfirmations[g]?.confirmedFinal).length
  const allConfirmed        = sessionGroups.length > 0 && sessionGroups.every(g => teamConfirmations[g]?.confirmed)
  const allConfirmedFinal   = sessionGroups.length > 0 && confirmedFinalCount === sessionGroups.length

  // Group averages from ranking data
  const groupAvgTons = sessionGroups.reduce((acc, g) => {
    const members = ranking.filter(r => r.group === g)
    if (members.length > 0) acc[g] = members.reduce((s, r) => s + r.tons, 0) / members.length
    return acc
  }, {})

  // ── Draft: session not yet active ────────────────────────────────────────────
  if (sessionStatus === 'draft') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)', background: '#fff', gap: '1.5rem', padding: '2.5rem 2rem', textAlign: 'center' }}>
      <div style={{ padding: '16px', background: '#fff', border: '1px solid #e0e0d8', borderRadius: '12px' }}>
        <QRCodeSVG value={joinUrl} size={180} fgColor="#2d5a27" bgColor="#ffffff" level="M" />
      </div>
      <div style={{ fontWeight: 900, fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.1em', color: '#2d5a27', lineHeight: 1 }}>{code}</div>
      <p style={{ fontSize: '0.9rem', color: '#888', maxWidth: 360, lineHeight: 1.65 }}>
        La sesión está en borrador. Actívala para que los participantes puedan entrar.
      </p>
      <button onClick={handleActivate} style={{ background: '#2d5a27', color: '#fff', border: 'none', padding: '1rem 2.5rem', fontSize: '0.88rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}>
        ACTIVAR SESIÓN →
      </button>
    </div>
  )

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

  function handleToggleAction(group, actionId) {
    setTeamSelections(prev => {
      const current = prev[group] || []
      return {
        ...prev,
        [group]: current.includes(actionId)
          ? current.filter(id => id !== actionId)
          : [...current, actionId]
      }
    })
  }

  async function handleConfirmTeam(group) {
    const actions = teamSelections[group] || []
    const totalReduction = actions.reduce((sum, id) => {
      const action = ACTIONS.find(a => a.id === id)
      return sum + (action?.co2Reduction || 0)
    }, 0)
    const originalAvg = groupAvgTons[group] || 0
    const newCarbonTons = Math.max(0, originalAvg - totalReduction / 1000)

    socket.emit('team:confirmActions', {
      sessionCode: code,
      group,
      actions,
      totalReduction,
      newCarbonTons,
    })
    try {
      await api.post(`/api/sessions/${code}/team-actions`, {
        group, actions, totalReduction, newCarbonTons
      })
    } catch {}

    setTeamConfirmations(prev => ({
      ...prev,
      [group]: { confirmed: true, actions, totalReduction, newCarbonTons }
    }))
  }

  // ── Step 3 confirmation panel ─────────────────────────────────────────────────
  const step3Panel = (
    <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
      {!step3Revealed ? (
        <>
          {/* Team tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {sessionGroups.map(g => {
              const conf = teamConfirmations[g]?.confirmed
              return (
                <button
                  key={g}
                  onClick={() => setActiveTeamTab(g)}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.82rem',
                    fontWeight: 700, cursor: 'pointer',
                    background: activeTeamTab === g ? '#2d5a27' : conf ? '#f0f7ee' : '#f5f5f0',
                    color: activeTeamTab === g ? '#fff' : conf ? '#2d5a27' : '#888',
                    border: activeTeamTab === g ? 'none' : `1px solid ${conf ? '#c8e6c0' : '#e0e0d8'}`,
                  }}
                >
                  {conf ? '✓ ' : ''}{g}
                </button>
              )
            })}
          </div>

          {activeTeamTab && (() => {
            const group = activeTeamTab
            const conf = teamConfirmations[group]
            const selected = teamSelections[group] || []
            const originalAvg = groupAvgTons[group]
            const totalRed = selected.reduce((sum, id) => {
              const a = ACTIONS.find(x => x.id === id); return sum + (a?.co2Reduction || 0)
            }, 0)
            const newTons = originalAvg != null ? Math.max(0, originalAvg - totalRed / 1000) : null

            const filtered = ACTIONS.filter(a =>
              filter3Area === 'all' || a.area === filter3Area
            )

            return (
              <div>
                {/* Team header — solo huella actual, sin comparativa hasta revelar */}
                <div style={{ background: '#f5f5f0', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Huella actual</span>
                      <div style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1a1a1a' }}>
                        {originalAvg != null ? `${originalAvg.toFixed(1)} t` : '–'}
                      </div>
                    </div>
                    {selected.length > 0 && (
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>
                        {selected.length} acción{selected.length !== 1 ? 'es' : ''} seleccionada{selected.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected actions */}
                {selected.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '0.6rem' }}>
                      Acciones seleccionadas ({selected.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {selected.map(id => {
                        const a = ACTIONS.find(x => x.id === id)
                        if (!a) return null
                        return (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0f7ee', border: '1px solid #c8e6c0', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
                            <span style={{ fontSize: '1rem' }}>{AREA_EMOJI[a.area]}</span>
                            <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#2d5a27' }}>{a.label}</span>
                            <button
                              onClick={() => handleToggleAction(group, id)}
                              style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 0.25rem' }}
                            >×</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Filters — solo por área */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {['all', 'transport', 'energy', 'food', 'consumption', 'waste'].map(area => (
                    <button key={area} onClick={() => setFilter3Area(area)} style={{ padding: '0.3rem 0.7rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', background: filter3Area === area ? '#2d5a27' : '#f5f5f0', color: filter3Area === area ? '#fff' : '#888', border: 'none' }}>
                      {area === 'all' ? 'Todas' : `${AREA_EMOJI[area]} ${AREA_LABEL[area]}`}
                    </button>
                  ))}
                </div>

                {/* Available actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {filtered.map(a => {
                    const isSel = selected.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        onClick={() => handleToggleAction(group, a.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.65rem 0.9rem', borderRadius: '6px', textAlign: 'left',
                          border: `1px solid ${isSel ? '#2d5a27' : '#e0e0d8'}`,
                          background: isSel ? '#f0f7ee' : '#fff',
                          cursor: 'pointer', width: '100%',
                        }}
                      >
                        <div style={{ width: 18, height: 18, borderRadius: 3, flexShrink: 0, border: `2px solid ${isSel ? '#2d5a27' : '#ccc'}`, background: isSel ? '#2d5a27' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '0.72rem' }}>{AREA_EMOJI[a.area]}</span>
                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: isSel ? 600 : 400, color: isSel ? '#1a1a1a' : '#555' }}>{a.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Confirm button */}
                <button
                  onClick={() => handleConfirmTeam(group)}
                  disabled={selected.length === 0}
                  style={{
                    width: '100%', padding: '0.9rem', borderRadius: '6px',
                    background: selected.length > 0 ? '#2d5a27' : '#eee',
                    color: selected.length > 0 ? '#fff' : '#aaa',
                    border: 'none', fontWeight: 700, fontSize: '0.82rem',
                    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: selected.length > 0 ? 'pointer' : 'default',
                  }}
                >
                  {conf?.confirmed ? '✓ Confirmar de nuevo — ' : ''}
                  Confirmar acciones de {group} →
                </button>
              </div>
            )
          })()}

          {/* Reveal all button */}
          {allConfirmed && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e0e0d8' }}>
              <button
                onClick={handleRevealStep3}
                style={{ width: '100%', padding: '1rem', background: '#1a3f1a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Revelar huella a todos los equipos →
              </button>
            </div>
          )}
        </>
      ) : step3Data ? <Step3Results step3Data={step3Data} ranking={ranking} sessionGroups={sessionGroups} /> : null}
    </div>
  )

  // ── Step3Results helper ───────────────────────────────────────────────────────
  function Step3Results({ step3Data, ranking, sessionGroups }) {
        /* Post-reveal: 3-column results */
        const AREA_ORDER = ['transport', 'energy', 'food', 'consumption', 'waste']
        const A_COLORS = { transport: '#4a90d9', energy: '#e8a020', food: '#5aab5a', consumption: '#b07a30', waste: '#7a7aaa' }

        const sortedTeams = [...(step3Data.teams || [])].sort((a, b) => (b.totalReduction || 0) - (a.totalReduction || 0))
        const maxOriginal = Math.max(...sortedTeams.map(t => t.originalTons || 0), 0.1)

        // Per-team area averages from ranking data
        const getGroupAreaAvg = (group) => {
          const members = ranking.filter(r => r.group === group)
          if (!members.length) return {}
          const avg = {}
          AREA_ORDER.forEach(area => { avg[area] = members.reduce((s, r) => s + (r.areas?.[area] || 0), 0) / members.length })
          return avg
        }

        // Per-team area after from confirmed actions
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
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{total.toFixed(1)} t</span>
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

        // Global distribution
        const globalBefore = step3Data.teams?.length
          ? step3Data.teams.reduce((s, t) => s + (t.originalTons || 0), 0) / step3Data.teams.length
          : 0
        const globalAfter = step3Data.teams?.length
          ? step3Data.teams.reduce((s, t) => s + (t.newTons || 0), 0) / step3Data.teams.length
          : 0
        const globalAreaAvg = AREA_ORDER.reduce((acc, area) => {
          const members = ranking
          acc[area] = members.length ? members.reduce((s, r) => s + (r.areas?.[area] || 0), 0) / members.length : 0
          return acc
        }, {})

        // All actions sorted by frequency then co2Reduction
        const allActionsSorted = [...(step3Data.actionStats || [])]
          .sort((a, b) => (b.count - a.count) || (b.co2Reduction - a.co2Reduction))

        return (
          <>
            <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '0.04em' }}>
              Resultados — Acciones
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>

              {/* Column 1: Ranking by reduction with stacked bars */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.85rem' }}>Ranking reducción</div>
                {sortedTeams.map((team, i) => {
                  const areaAvg = getGroupAreaAvg(team.group)
                  const areaAfter = getGroupAreaAfter(team.group, areaAvg)
                  return (
                    <div key={team.group} style={{ marginBottom: '1rem', padding: '0.75rem 0.9rem', background: '#f9f9f7', borderRadius: '6px', border: '1px solid #e0e0d8' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#bbb' }}>{i + 1}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{team.group}</span>
                        {team.totalReduction != null && (
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#2d5a27' }}>
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
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.85rem' }}>Distribución global</div>
                <div style={{ padding: '0.85rem 0.9rem', background: '#f9f9f7', borderRadius: '6px', border: '1px solid #e0e0d8', marginBottom: '0.75rem' }}>
                  <StackedBar areaAvg={globalAreaAvg} total={globalBefore} maxVal={globalBefore} label="Media antes" />
                  <StackedBar areaAvg={globalAreaAvg} total={globalAfter}  maxVal={globalBefore} label="Media después" muted />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.5rem', background: '#eaf3de', borderRadius: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#2d5a27' }}>−{(globalBefore - globalAfter).toFixed(1)} t</span>
                    <span style={{ fontSize: '0.65rem', color: '#4a8a44', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ahorro medio</span>
                  </div>
                </div>
                {/* Area color legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {AREA_ORDER.map(area => (
                    <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 10, height: 10, background: A_COLORS[area], borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', color: '#666' }}>{AREA_LABEL[area]}</span>
                      <span style={{ fontSize: '0.7rem', color: '#aaa', marginLeft: 'auto' }}>
                        {globalAreaAvg[area]?.toFixed(2)} t
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 3: All actions with scroll */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '0.85rem' }}>
                  Acciones elegidas ({allActionsSorted.length})
                </div>
                <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  {allActionsSorted.map((a, i) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '7px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ccc', width: 18, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: '0.95rem' }}>{AREA_EMOJI[a.area]}</span>
                      <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 500, lineHeight: 1.3 }}>{a.label}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2d5a27', flexShrink: 0 }}>
                        −{(a.co2Reduction / 1000).toFixed(1)}t
                      </span>
                      <span style={{ fontSize: '0.65rem', background: '#f0f7ee', color: '#2d5a27', padding: '1px 6px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                        {a.count}/{sessionGroups.length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )
  }

  // ── Sidebar (phases 1 & 2) ────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid #e0e0d8', padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ padding: '10px', background: '#fff', border: '1px solid #e0e0d8', borderRadius: '8px' }}>
        <QRCodeSVG value={joinUrl} size={160} fgColor="#2d5a27" bgColor="#ffffff" level="M" />
      </div>
      <div style={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.1em', color: '#2d5a27' }}>{code}</div>
      <div style={{ fontSize: '0.62rem', color: '#bbb', textAlign: 'center', letterSpacing: '0.04em', wordBreak: 'break-all' }}>{joinUrl}</div>

      <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

      <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#2d5a27', lineHeight: 1 }}>{completed}</div>
        <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
          huellas recibidas
        </div>
      </div>

      <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

      {/* Step toggle — shown once results are revealed */}
      {revealed && (
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <button
            onClick={() => setActiveStep(2)}
            style={{
              flex: 1, padding: '0.5rem', fontSize: '0.72rem', fontWeight: 700,
              background: activeStep === 2 ? '#2d5a27' : 'transparent',
              color: activeStep === 2 ? '#fff' : '#888',
              border: '1px solid #e0e0d8', borderRadius: '4px', cursor: 'pointer',
            }}
          >
            STEP 2
          </button>
          <button
            onClick={() => { setActiveStep(3); if (!step3Started) handleStartStep3() }}
            style={{
              flex: 1, padding: '0.5rem', fontSize: '0.72rem', fontWeight: 700,
              background: activeStep === 3 ? '#2d5a27' : 'transparent',
              color: activeStep === 3 ? '#fff' : '#888',
              border: '1px solid #e0e0d8', borderRadius: '4px', cursor: 'pointer',
            }}
          >
            STEP 3
          </button>
        </div>
      )}

      {/* Step 2 sidebar controls */}
      {activeStep === 2 && (
        <>
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

          {revealed && !step3Started && (
            <button
              onClick={() => { setActiveStep(3); handleStartStep3() }}
              style={{ width: '100%', background: '#1a3f1a', color: '#fff', border: 'none', padding: '0.85rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}
            >
              Iniciar fase de acciones →
            </button>
          )}
        </>
      )}

      {/* Step 3 sidebar controls */}
      {activeStep === 3 && (
        <>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Equipos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {sessionGroups.map(g => {
                const conf = teamConfirmations[g]?.confirmed
                return (
                  <span key={g} style={{ padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: conf ? '#eaf3de' : '#f5f5f0', color: conf ? '#2d5a27' : '#aaa' }}>
                    {conf ? '✓' : '⏳'} {g}
                  </span>
                )
              })}
            </div>
          </div>

          {!step3Revealed && allConfirmed && (
            <button
              onClick={handleRevealStep3}
              style={{ width: '100%', background: '#1a3f1a', color: '#fff', border: 'none', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', cursor: 'pointer' }}
            >
              Revelar a todos →
            </button>
          )}

          {step3Revealed && (
            <button disabled style={{ width: '100%', background: '#eaf3de', color: '#2d5a27', border: '1px solid #c8e6c0', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', cursor: 'default' }}>
              ✓ Acciones reveladas
            </button>
          )}
        </>
      )}

      <button onClick={handleClose} style={{ width: '100%', background: 'transparent', color: '#cc4444', border: '1px solid #e0e0d8', padding: '0.7rem', fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', marginTop: 'auto', cursor: 'pointer' }}>
        Cerrar sesión
      </button>
    </div>
  )

  // ── Phase 1: calculator active, waiting for results ───────────────────────────
  if (!showRanking) return (
    <div style={{ flex: 1, display: 'flex', background: '#ffffff', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}
      {activeStep === 3 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Espera a que terminen la calculadora
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  )

  // ── Phase 2 / 3: results revealed ────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', background: '#ffffff', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}

      {activeStep === 3 ? step3Panel : (
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
      )}
    </div>
  )
}
