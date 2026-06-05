import { useState, useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import { PieChart, Pie, Cell } from 'recharts'
import { useSession } from '../../context/SessionContext.jsx'
import SessionClosedBanner from '../../components/SessionClosedBanner.jsx'
import { socket } from '../../utils/socket.js'
import api from '../../utils/api.js'
import { AREA_QUESTIONS } from '../../utils/answerLabels.js'

const SPAIN_AVG = 7.2
const BAR_MAX_H = 120

const CATEGORY_CONFIG = {
  bajo:       { label: 'bajo',     color: '#7d9e7a', bg: '#f0f7ef' },
  medio:      { label: 'medio',    color: '#5a8a57', bg: '#edf5ec' },
  alto:       { label: 'alto',     color: '#b07a30', bg: '#faf3e8' },
  'muy alto': { label: 'muy alto', color: '#cc4444', bg: '#fdf0f0' },
}

const AREA_LABELS = {
  transport:   'Transporte',
  energy:      'Hogar',
  food:        'Alimentación',
  consumption: 'Consumo',
  waste:       'Huella Digital',
}

const AREA_COLORS = {
  transport:   '#4a90d9',
  energy:      '#e8a020',
  food:        '#5aab5a',
  consumption: '#b07a30',
  waste:       '#7a7aaa',
}

function getCategory(tons) {
  if (tons < 4)  return 'bajo'
  if (tons < 7)  return 'medio'
  if (tons < 10) return 'alto'
  return 'muy alto'
}

const MOCK_RESULT = {
  carbonTons: 7.2,
  areas: { transport: 2.2, energy: 1.1, food: 1.9, consumption: 0.4, waste: 1.6 },
  answers: {},
}

// ── helpers ────────────────────────────────────────────────────────────────

function Square({ size = 8, opacity = 1 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `1.5px solid rgba(0,0,0,${opacity * 0.25})`,
      flexShrink: 0,
    }} />
  )
}

function SquareWhite({ size = 8 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: '1.5px solid rgba(255,255,255,0.4)',
      flexShrink: 0,
    }} />
  )
}

function CardTitle({ children, dark = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: '0.68rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      color: dark ? 'rgba(255,255,255,0.55)' : '#aaa',
      marginBottom: '1rem',
    }}>
      {dark ? <SquareWhite /> : <Square />}
      {children}
    </div>
  )
}

function DonutChart({ pct, color, size = 80 }) {
  const r   = size * 0.34
  const sw  = size * 0.13
  const circ   = 2 * Math.PI * r
  const filled = (Math.min(pct ?? 0, 100) / 100) * circ
  const c = size / 2
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#e8e8e8" strokeWidth={sw} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}
      />
    </svg>
  )
}

function DotGrid({ lowerCount, higherCount }) {
  const MAX = 42
  let lo = lowerCount
  let hi = higherCount
  const raw = lo + 1 + hi
  if (raw > MAX) {
    const scale = (MAX - 1) / (lo + hi)
    lo = Math.round(lo * scale)
    hi = Math.round(hi * scale)
  }
  const dots = [...Array(lo).fill('lo'), 'me', ...Array(hi).fill('hi')]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '0.6rem 0 0.5rem' }}>
      {dots.map((t, i) => (
        <span key={i} style={{
          display: 'inline-block', width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
          background: t === 'me' ? '#fff'
            : t === 'lo' ? 'rgba(255,255,255,0.82)'
            : 'rgba(255,255,255,0.22)',
          outline: t === 'me' ? '1.5px solid rgba(255,255,255,0.5)' : 'none',
        }} />
      ))}
    </div>
  )
}

// ── component ──────────────────────────────────────────────────────────────

export default function Step2Results() {
  const location = useLocation()
  const { code }  = useParams()
  const { participantGroup } = useSession()
  const data = (location.state?.carbonTons != null) ? location.state : MOCK_RESULT
  const { carbonTons, areas, answers } = data

  const [revealed,      setRevealed]      = useState(false)
  const [sessionResults, setSessionResults] = useState(null)
  const [emailInput,  setEmailInput]  = useState('')
  const [emailStatus, setEmailStatus] = useState('idle')
  const [expandedArea, setExpandedArea] = useState(null)

  function toggleArea(id) {
    setExpandedArea(prev => prev === id ? null : id)
  }

  useEffect(() => {
    // Check if results were already revealed (page reload after reveal)
    api.get(`/api/sessions/${code}/info`)
      .then(res => { if (res.data.resultsRevealed) setRevealed(true) })
      .catch(() => {})

    socket.on('results:revealed', () => setRevealed(true))
    return () => socket.off('results:revealed')
  }, [code])

  useEffect(() => {
    if (!revealed) return
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/results/${code}/ranking`)
      .then(res => setSessionResults(res.data))
      .catch(() => setSessionResults([]))
  }, [code, revealed])

  // ── derived ───────────────────────────────────────────────────
  const category = getCategory(carbonTons)
  const cfg      = CATEGORY_CONFIG[category]
  const maxArea  = Math.max(...Object.values(areas))

  // spain bars
  const barNorm  = Math.max(carbonTons, SPAIN_AVG) * 1.1
  const userBarH  = Math.round((carbonTons / barNorm) * BAR_MAX_H)
  const spainBarH = Math.round((SPAIN_AVG  / barNorm) * BAR_MAX_H)
  const diffPct  = Math.abs(Math.round(((carbonTons - SPAIN_AVG) / SPAIN_AVG) * 100))
  const isBelow  = carbonTons < SPAIN_AVG

  // session percentile
  const loaded      = sessionResults !== null
  const sTons       = loaded ? sessionResults.map(r => r.carbonTons) : []
  const hasMany     = loaded && sTons.length > 1
  const lowerCount  = hasMany ? sTons.filter(t => t < carbonTons).length : 0
  const higherCount = hasMany ? sTons.filter(t => t > carbonTons).length : 0
  const pctHigher   = hasMany ? Math.round((higherCount / sTons.length) * 100) : null
  const topPct      = pctHigher !== null ? 100 - pctHigher : null

  // team
  const myGroup     = participantGroup || ''
  const teamResults = loaded ? sessionResults.filter(r => r.group === myGroup) : []
  const isTeamAlone = teamResults.length <= 1
  const teamTotal   = isTeamAlone ? null : teamResults.reduce((s, r) => s + r.carbonTons, 0)
  const teamAvg     = teamTotal !== null ? teamTotal / teamResults.length : null
  const myContrib   = teamTotal ? Math.round((carbonTons / teamTotal) * 100) : null

  async function handleSendEmail(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setEmailStatus('invalid'); return
    }
    setEmailStatus('sending')
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/results/send-email`, {
        email: emailInput, carbonTons, category, areas, sessionCode: code,
      })
      setEmailStatus('success')
    } catch {
      setEmailStatus('error')
    }
  }

  // ── render ────────────────────────────────────────────────────
  if (!revealed) return (
    <div style={{
      minHeight: 'calc(100vh - 52px)', background: '#f5f5f0',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1.25rem', lineHeight: 1 }}>⏳</div>
      <h1 style={{ fontWeight: 900, fontSize: '1.35rem', textTransform: 'uppercase', marginBottom: '0.75rem', color: '#1a1a1a' }}>
        Espera al facilitador
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#888', maxWidth: 300, lineHeight: 1.65, margin: '0 0 2rem' }}>
        El facilitador revelará los resultados de todos al mismo tiempo...
      </p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#c8e6c0',
            animation: `resdot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
        <style>{`
          @keyframes resdot {
            0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
            40%            { opacity: 1;   transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#f5f5f0', minHeight: 'calc(100vh - 52px)', animation: 'resReveal 0.4s ease both' }}>
      <style>{`
        @keyframes resReveal {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <SessionClosedBanner />

      {/* ═══ HEADER ════════════════════════════════════════════ */}
      <div style={{ background: '#2d5a27', color: '#fff' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', padding: '1.25rem 1.5rem 0' }}>

          {/* top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 900, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              CO2 SPRINT *
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>Sesión {code}</span>
              {myGroup && (
                <span style={{ background: 'rgba(255,255,255,0.18)', padding: '0.25rem 0.7rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                  {myGroup}
                </span>
              )}
            </div>
          </div>

          {/* eyebrow */}
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.16em', opacity: 0.55 }}>
            Tu huella de carbono
          </p>

          {/* hero row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem 3.5rem', paddingBottom: '2.25rem', alignItems: 'flex-start' }}>

            {/* big number */}
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 900, fontSize: 'clamp(3.2rem, 11vw, 4.8rem)', lineHeight: 1 }}>
                  {carbonTons.toFixed(1)}
                </span>
                <span style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.75 }}>
                  t CO₂/año
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: '0.8rem', background: 'rgba(255,255,255,0.14)', padding: '0.35rem 0.8rem', borderRadius: 4, fontSize: '0.78rem', fontWeight: 700 }}>
                <SquareWhite size={7} />
                Categoría {cfg.label}
              </div>
            </div>

            {/* 3 metrics */}
            <div style={{ flex: '1 1 280px', display: 'flex', flexWrap: 'wrap', gap: '1rem 2.5rem' }}>
              {[
                {
                  big: topPct !== null ? `TOP ${topPct}%` : '–',
                  label: 'En la sesión',
                  sub: loaded ? `de ${sTons.length} participantes` : '–',
                },
                {
                  big: `${isBelow ? '–' : '+'}${diffPct}%`,
                  label: 'Vs. España',
                  sub: `media: ${SPAIN_AVG} t`,
                },
                {
                  big: myContrib !== null ? `${myContrib}%` : '–',
                  label: 'Del equipo',
                  sub: myGroup || '–',
                },
              ].map(({ big, label, sub }) => (
                <div key={label}>
                  <span style={{ fontWeight: 900, fontSize: 'clamp(1.5rem, 4.5vw, 2rem)', display: 'block', lineHeight: 1, marginBottom: '0.2rem' }}>{big}</span>
                  <span style={{ fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.55, display: 'block' }}>{label}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.8, display: 'block', marginTop: '0.1rem' }}>{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* wave */}
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 28 }}>
          <path d="M0,0 Q50,12 100,0 L100,12 L0,12 Z" fill="#f5f5f0" />
        </svg>
      </div>

      {/* ═══ CONTENT ═══════════════════════════════════════════ */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '1.25rem 1.25rem 2.5rem' }}>

        {/* ── area donut chart ── */}
        {(() => {
          const pieData = AREA_QUESTIONS
            .map(a => ({ name: AREA_LABELS[a.areaId] || a.areaLabel, value: areas[a.areaId] ?? 0, color: AREA_COLORS[a.areaId] || '#ccc' }))
            .filter(d => d.value > 0.001)
          const total = pieData.reduce((s, d) => s + d.value, 0)
          return (
            <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
              <CardTitle>Distribución por áreas</CardTitle>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <PieChart width={160} height={160}>
                    <Pie data={pieData} cx={80} cy={80} innerRadius={46} outerRadius={72} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1, color: '#1a1a1a' }}>{carbonTons.toFixed(1)}</span>
                    <span style={{ fontSize: '0.58rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>t CO₂</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 9, height: 9, background: d.color, borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.75rem', color: '#555', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1a1a' }}>{d.value.toFixed(1)} t</span>
                      <span style={{ fontSize: '0.68rem', color: '#bbb', minWidth: 30, textAlign: 'right' }}>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── expandable areas ── */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
          <CardTitle>Desglose por áreas</CardTitle>
          {AREA_QUESTIONS.map((areaData, aIdx) => {
            const val = areas[areaData.areaId] ?? 0
            const isExp = expandedArea === areaData.areaId
            return (
              <div key={areaData.areaId} style={{ borderBottom: aIdx < AREA_QUESTIONS.length - 1 ? '1px solid #f5f5f0' : 'none' }}>
                <button
                  onClick={() => toggleArea(areaData.areaId)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{areaData.areaEmoji}</span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#333' }}>{areaData.areaLabel}</span>
                  <div style={{ width: 68, height: 5, background: '#f0f0f0', borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ height: '100%', width: `${maxArea > 0 ? (val / maxArea) * 100 : 0}%`, background: areaData.areaColor, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, width: 36, textAlign: 'right', flexShrink: 0 }}>{val.toFixed(1)} t</span>
                  <span style={{ fontSize: '0.55rem', color: '#bbb', flexShrink: 0, display: 'inline-block', transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 2 }}>▼</span>
                </button>
                <div style={{ maxHeight: isExp ? '600px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <div style={{ paddingBottom: '0.85rem' }}>
                    {areaData.questions.map(q => {
                      const rawSel = answers?.[q.id]
                      return (
                        <div key={q.id} style={{ marginTop: '0.85rem' }}>
                          <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '0.4rem', lineHeight: 1.45 }}>
                            {q.text}
                            {q.type === 'multi' && <span style={{ color: '#ccc', fontStyle: 'italic' }}> · selección múltiple</span>}
                          </div>
                          {q.options.map(opt => {
                            const isSel = q.type === 'single'
                              ? rawSel === opt.value
                              : Array.isArray(rawSel) && rawSel.includes(opt.value)
                            const dimmed = q.type === 'single' && rawSel !== undefined && !isSel
                            return (
                              <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem', opacity: dimmed ? 0.3 : 1 }}>
                                <span style={{ fontSize: '0.62rem', color: isSel ? areaData.areaColor : 'transparent', fontWeight: 700, minWidth: 11, flexShrink: 0 }}>✓</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: isSel ? 700 : 400, color: isSel ? '#1a1a1a' : '#999', flex: 1 }}>
                                  {opt.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── public services card ── */}
        <div style={{ background: '#f0f7ee', border: '1px solid #c8e6c0', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.95rem' }}>🏛️</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2d5a27' }}>
              Servicios públicos — 1,5 t CO₂/año (fijo)
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#555', margin: 0, lineHeight: 1.65 }}>
            Una parte de tu huella proviene de los servicios que usamos colectivamente: sanidad, educación,
            infraestructuras, administración y defensa. Este coste —estimado en{' '}
            <strong>1.500 kg CO₂/año por persona</strong> en España— se reparte de forma igualitaria entre
            toda la ciudadanía y no depende de tus hábitos individuales.
          </p>
        </div>

        {/* ── middle row: spain + percentile ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>

          {/* Spain comparison */}
          <div style={{ flex: '1 1 240px', background: '#fff', borderRadius: 8, padding: '1.25rem 1.5rem', minWidth: 0 }}>
            <CardTitle>Comparativa con España</CardTitle>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: cfg.color }}>{carbonTons.toFixed(1)} t</span>
                <div style={{ width: 80, height: userBarH, background: cfg.color, borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.72rem', color: '#888' }}>Tú</span>
              </div>
              <div style={{ paddingBottom: 24, fontSize: '0.7rem', color: '#ccc', fontWeight: 700 }}>VS</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#888' }}>{SPAIN_AVG.toFixed(1)} t</span>
                <div style={{ width: 80, height: spainBarH, background: '#cacaca', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.72rem', color: '#888' }}>Media España</span>
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: isBelow ? '#f0f7ef' : '#faf3e8',
              color: isBelow ? '#2d5a27' : '#b07a30',
              padding: '0.45rem 0.8rem', borderRadius: 4,
              fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.5rem',
            }}>
              <Square size={7} opacity={0} />
              <span style={{ display: 'inline-block', width: 7, height: 7, border: `1.5px solid ${isBelow ? '#2d5a27' : '#b07a30'}`, flexShrink: 0 }} />
              {diffPct}% {isBelow ? 'por debajo de la media' : 'por encima de la media'}
            </div>
            <p style={{ fontSize: '0.68rem', color: '#bbb', margin: 0 }}>
              Fuente: Ministerio para la Transición Ecológica, 2023
            </p>
          </div>
        </div>

        {/* ── bottom row: percentile + team + email ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Percentile — dark card */}
          <div style={{ flex: '1 1 190px', background: '#2d5a27', borderRadius: 8, padding: '1.25rem 1.5rem', color: '#fff', minWidth: 0 }}>
            <CardTitle dark>Posición en la sesión</CardTitle>
            {!hasMany ? (
              <p style={{ fontSize: '0.78rem', opacity: 0.7, lineHeight: 1.6, margin: 0 }}>
                Esperando a que el resto complete la calculadora...
              </p>
            ) : (
              <>
                <div style={{ fontWeight: 900, fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', lineHeight: 1, marginBottom: '0.35rem' }}>
                  TOP {topPct}%
                </div>
                <p style={{ fontSize: '0.73rem', opacity: 0.78, lineHeight: 1.5, margin: '0 0 0' }}>
                  Tu huella es menor que la del {pctHigher}% de los participantes
                </p>
                <DotGrid lowerCount={lowerCount} higherCount={higherCount} />
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.63rem', opacity: 0.6, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.82)', display: 'inline-block', flexShrink: 0 }} />
                    Menor huella ({lowerCount})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'inline-block', flexShrink: 0 }} />
                    Mayor huella ({higherCount})
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Team */}
          <div style={{ flex: '1 1 220px', background: '#fff', borderRadius: 8, padding: '1.25rem 1.5rem', minWidth: 0 }}>
            <CardTitle>Tu equipo{myGroup ? ` · ${myGroup}` : ''}</CardTitle>
            {isTeamAlone ? (
              <p style={{ fontSize: '0.78rem', color: '#aaa', lineHeight: 1.6, margin: 0 }}>
                Eres el primero de tu equipo en completarla
              </p>
            ) : (
              <>
                {/* avatars */}
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2d5a27', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700, flexShrink: 0 }}>Tú</div>
                  {Array.from({ length: Math.min(teamResults.length - 1, 6) }).map((_, i) => (
                    <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: '#c8e6c0', color: '#2d5a27', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {teamResults.length - 1 > 6 && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                      +{teamResults.length - 7}
                    </div>
                  )}
                </div>
                {/* donut + stats */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flexShrink: 0, width: 80, height: 80 }}>
                    <DonutChart pct={myContrib} color={cfg.color} size={80} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontWeight: 900, fontSize: '1rem', lineHeight: 1, color: '#1a1a1a' }}>{myContrib}%</span>
                      <span style={{ fontSize: '0.52rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.3 }}>tu parte</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.35rem', lineHeight: 1, color: '#1a1a1a' }}>{teamAvg.toFixed(1)} t</div>
                    <div style={{ fontSize: '0.68rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>media del equipo</div>
                    <div style={{ fontSize: '0.73rem', color: '#666', lineHeight: 1.7 }}>
                      Tu huella: <strong style={{ color: '#1a1a1a' }}>{carbonTons.toFixed(1)} t</strong><br />
                      Total equipo: <strong style={{ color: '#1a1a1a' }}>{teamTotal.toFixed(1)} t</strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Email */}
          <div style={{ flex: '1 1 200px', background: '#fff', borderRadius: 8, padding: '1.25rem 1.5rem', minWidth: 0 }}>
            <CardTitle>Recibe tus resultados</CardTitle>
            {emailStatus === 'success' ? (
              <p style={{ fontSize: '0.8rem', color: '#2d5a27', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', padding: '1.25rem 0', margin: 0 }}>
                ✓ Revisa tu bandeja de entrada
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.55, marginBottom: '1rem', marginTop: 0 }}>
                  Solo tus datos personales, sin información del resto de participantes.
                </p>
                <form onSubmit={handleSendEmail}>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={emailInput}
                    onChange={e => { setEmailInput(e.target.value); setEmailStatus('idle') }}
                    style={{ width: '100%', border: '1.5px solid #e0e0e0', borderRadius: 4, padding: '0.6rem 0.75rem', fontSize: '0.85rem', outline: 'none', marginBottom: '0.55rem', boxSizing: 'border-box', background: '#fff', color: '#1a1a1a' }}
                  />
                  {(emailStatus === 'invalid' || emailStatus === 'error') && (
                    <p style={{ fontSize: '0.7rem', color: '#cc4444', margin: '-0.15rem 0 0.5rem' }}>
                      {emailStatus === 'invalid' ? 'Introduce un email válido' : 'Algo ha fallado, inténtalo de nuevo'}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={emailStatus === 'sending'}
                    style={{ width: '100%', background: emailStatus === 'sending' ? '#aaa' : '#2d5a27', color: '#fff', padding: '0.85rem', fontSize: '0.73rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, borderRadius: 4, cursor: emailStatus === 'sending' ? 'default' : 'pointer', border: 'none' }}
                  >
                    {emailStatus === 'sending' ? 'Enviando...' : 'Enviarme mis resultados'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', paddingTop: '0.5rem' }}>
          <div style={{ width: 32, height: 3, background: '#2d5a27', borderRadius: 2 }} />
          <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#888', margin: 0, textAlign: 'center' }}>
            Tu huella forma parte del resultado colectivo del taller
          </p>
        </div>
      </div>
    </div>
  )
}
