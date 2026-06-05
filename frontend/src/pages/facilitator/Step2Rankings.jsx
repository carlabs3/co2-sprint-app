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

  const [view, setView]                             = useState('individual')
  const [ranking, setRanking]                       = useState([])
  const [groups, setGroups]                         = useState([])
  const [totalJoined, setTotalJoined]               = useState(0)
  const [calculatorStarted, setCalculatorStarted]   = useState(false)
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

    // Fetch session groups
    api.get(`/api/sessions/${code}/info`).then(res => {
      if (res.data.groups) setSessionGroups(res.data.groups)
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

    socket.on('team:confirmedFinal', ({ group }) => {
      setTeamConfirmations(prev => ({ ...prev, [group]: { ...prev[group], confirmedFinal: true } }))
    })

    socket.on('step3:revealed', () => {
      setStep3Revealed(true)
      fetchStep3Data()
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
      socket.off('step3:revealed')
      socket.off('winners:revealed')
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
  const allConfirmed        = sessionGroups.length > 0 && confirmedCount === sessionGroups.length
  const allConfirmedFinal   = sessionGroups.length > 0 && confirmedFinalCount === sessionGroups.length

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

  // ── Step 3 confirmation panel ─────────────────────────────────────────────────
  const step3Panel = (
    <div style={{ flex: 1, padding: '2.5rem', overflow: 'auto' }}>
      {!step3Revealed ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '2rem' }}>
            <h1 style={{ fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase', margin: 0 }}>
              Step 3 — Reducción de huella
            </h1>
            <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
              {confirmedCount} / {sessionGroups.length} equipos confirmados
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {sessionGroups.map(g => {
              const conf = teamConfirmations[g]?.confirmed
              return (
                <div key={g} style={{
                  padding: '1.25rem 1.5rem', borderRadius: '8px',
                  background: conf ? '#eaf3de' : '#f5f5f0',
                  border: `1px solid ${conf ? '#c8e6c0' : '#e0e0d8'}`,
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{conf ? '✓' : '⏳'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: conf ? '#2d5a27' : '#555' }}>{g}</div>
                    <div style={{ fontSize: '0.72rem', color: conf ? '#4a8a44' : '#aaa', marginTop: '0.15rem' }}>
                      {conf ? 'Selección confirmada' : 'Eligiendo...'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {sessionGroups.length === 0 && (
            <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '2rem' }}>
              Cargando equipos...
            </div>
          )}
        </>
      ) : step3Data ? (
        <>
          <h1 style={{ fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase', marginBottom: '2rem' }}>
            Resultados Step 3
          </h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Left: ranking by totalReduction */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '1rem' }}>
                Mayor reducción
              </div>
              {[...(step3Data.teams || [])]
                .sort((a, b) => (b.totalReduction || 0) - (a.totalReduction || 0))
                .map((team, i) => (
                  <div key={team.group} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.85rem 1rem', marginBottom: '0.5rem',
                    background: '#f5f5f0', borderRadius: '6px',
                    border: '1px solid #e0e0d8',
                  }}>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#bbb', minWidth: 24 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{team.group}</div>
                      <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                        {team.originalTons != null ? `${team.originalTons.toFixed(1)}t` : '—'}
                        {' → '}
                        {team.newTons != null ? `${team.newTons.toFixed(1)}t` : '—'}
                      </div>
                    </div>
                    {team.totalReduction != null && (
                      <span style={{
                        background: '#eaf3de', color: '#2d5a27',
                        padding: '0.2rem 0.6rem', borderRadius: '4px',
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        −{Math.round(team.totalReduction)} kg CO₂
                      </span>
                    )}
                  </div>
                ))}

              {/* Ranking by newTons (lower is better) */}
              {winnersRevealed && (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', margin: '1.5rem 0 1rem' }}>
                    Menor huella final
                  </div>
                  {[...(step3Data.teams || [])]
                    .sort((a, b) => (a.newTons || 0) - (b.newTons || 0))
                    .map((team, i) => (
                      <div key={team.group} style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '0.85rem 1rem', marginBottom: '0.5rem',
                        background: i === 0 ? '#eaf3de' : '#f5f5f0',
                        borderRadius: '6px',
                        border: `1px solid ${i === 0 ? '#c8e6c0' : '#e0e0d8'}`,
                      }}>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: i === 0 ? '#2d5a27' : '#bbb', minWidth: 24 }}>
                          {i + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: i === 0 ? '#2d5a27' : '#1a1a1a' }}>{team.group}</div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: i === 0 ? '#2d5a27' : '#555' }}>
                          {team.newTons != null ? `${team.newTons.toFixed(1)}t` : '—'}
                        </span>
                      </div>
                    ))}
                </>
              )}
            </div>

            {/* Right: top actions */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', marginBottom: '1rem' }}>
                Acciones más elegidas
              </div>
              {[...(step3Data.actionStats || [])]
                .sort((a, b) => (b.co2Reduction || 0) - (a.co2Reduction || 0))
                .map(action => (
                  <div key={action.id || action.label} style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.85rem 1rem', marginBottom: '0.5rem',
                    background: '#f5f5f0', borderRadius: '6px',
                    border: '1px solid #e0e0d8',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{action.label || action.id}</div>
                      {action.co2Reduction != null && (
                        <div style={{ fontSize: '0.72rem', color: '#2d5a27', marginTop: '0.1rem' }}>
                          −{Math.round(action.co2Reduction)} kg CO₂
                        </div>
                      )}
                    </div>
                    {action.count != null && (
                      <span style={{
                        background: '#f0f0f0', color: '#555',
                        padding: '0.2rem 0.6rem', borderRadius: '4px',
                        fontSize: '0.75rem', fontWeight: 700,
                      }}>
                        {action.count} equipo{action.count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '2rem' }}>
          Cargando resultados...
        </div>
      )}
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
        </>
      )}

      {/* Step 3 sidebar controls */}
      {activeStep === 3 && (
        <>
          {/* Team confirmation pills */}
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '0.68rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              Equipos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {sessionGroups.map(g => {
                const conf = teamConfirmations[g]?.confirmed
                return (
                  <span key={g} style={{
                    padding: '0.3rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700,
                    background: conf ? '#eaf3de' : '#f0f0f0',
                    color: conf ? '#2d5a27' : '#999',
                    border: `1px solid ${conf ? '#c8e6c0' : '#e0e0d8'}`,
                  }}>
                    {conf ? '✓' : '⏳'} {g}
                  </span>
                )
              })}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#aaa', marginTop: '0.5rem' }}>
              {confirmedCount} / {sessionGroups.length} confirmados
            </div>
          </div>

          <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

          <button
            onClick={allConfirmed && !step3Revealed ? handleRevealStep3 : undefined}
            disabled={!allConfirmed || step3Revealed}
            style={{
              width: '100%', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px',
              cursor: allConfirmed && !step3Revealed ? 'pointer' : 'default',
              background: step3Revealed ? '#eaf3de' : allConfirmed ? '#2d5a27' : '#f0f0f0',
              color: step3Revealed ? '#2d5a27' : allConfirmed ? '#fff' : '#bbb',
              border: step3Revealed ? '1px solid #c8e6c0' : allConfirmed ? 'none' : '1px solid #e0e0d8',
            }}
          >
            {step3Revealed ? '✓ Impacto revelado' : 'Revelar impacto'}
          </button>

          {step3Revealed && (
            <button
              onClick={allConfirmedFinal && !winnersRevealed ? handleRevealWinners : undefined}
              disabled={!allConfirmedFinal || winnersRevealed}
              style={{
                width: '100%', padding: '0.8rem', fontSize: '0.75rem', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px',
                cursor: allConfirmedFinal && !winnersRevealed ? 'pointer' : 'default',
                background: winnersRevealed ? '#eaf3de' : allConfirmedFinal ? '#2d5a27' : '#f0f0f0',
                color: winnersRevealed ? '#2d5a27' : allConfirmedFinal ? '#fff' : '#bbb',
                border: winnersRevealed ? '1px solid #c8e6c0' : allConfirmedFinal ? 'none' : '1px solid #e0e0d8',
              }}
            >
              {winnersRevealed ? '✓ Ganadores revelados' : 'Revelar ganadores'}
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
