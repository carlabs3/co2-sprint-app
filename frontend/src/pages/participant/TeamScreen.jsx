import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell } from 'recharts'
import { socket } from '../../utils/socket.js'
import api from '../../utils/api.js'
import { ACTIONS, MAX_POINTS, AREA_EMOJI, AREA_COLOR, AREA_LABEL, TYPE_LABEL } from '../../utils/actions.js'

// Normalize group name for comparison: "Equipo A" === "equipo-a"
function normalizeGroup(g) {
  return (g || '').toLowerCase().replace(/\s+/g, '-')
}
function groupMatches(recordGroup, urlGroup) {
  if (!recordGroup || !urlGroup) return false
  if (recordGroup === urlGroup) return true
  return normalizeGroup(recordGroup) === normalizeGroup(urlGroup)
}

const AREA_META = [
  { key: 'transport',   label: 'Transporte',   color: '#4a90d9' },
  { key: 'energy',      label: 'Vivienda',     color: '#e8a020' },
  { key: 'food',        label: 'Alimentación', color: '#5aab5a' },
  { key: 'consumption', label: 'Consumo',      color: '#b07a30' },
  { key: 'waste',       label: 'Digital',      color: '#7a7aaa' },
]

const SPAIN_AVG = 8.1

const CATEGORY_CONFIG = {
  bajo:       { label: 'Huella baja' },
  medio:      { label: 'Huella media' },
  alto:       { label: 'Huella alta' },
  'muy alto': { label: 'Huella muy alta' },
}

function mean(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

function getCategory(tons) {
  if (tons < 4)  return 'bajo'
  if (tons < 7)  return 'medio'
  if (tons < 10) return 'alto'
  return 'muy alto'
}

function DotsLoader({ color = '#c8e6c0' }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%', background: color,
          animation: `tmdot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes tmdot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function Navbar({ group }) {
  return (
    <div style={{ background: '#2d5a27', padding: '0.85rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <span style={{ fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
        CO2 SPRINT *
      </span>
      {group && (
        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 0.9rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
          {group}
        </span>
      )}
    </div>
  )
}

// ── Phase 1: Waiting ─────────────────────────────────────────────────────────
function WaitingPhase({ group }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={null} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1 }}>🌿</div>
        <h1 style={{
          fontWeight: 900,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          letterSpacing: '-0.02em', color: '#1a1a1a',
          marginBottom: '0.5rem', textTransform: 'uppercase',
        }}>
          {group}
        </h1>
        <p style={{ fontSize: '1.05rem', color: '#888', maxWidth: 400, lineHeight: 1.65, marginBottom: '3rem' }}>
          El taller comenzará en breve.<br />Mantened esta pantalla abierta.
        </p>
        <DotsLoader />
      </div>
    </div>
  )
}

// ── Phase 2: Calculating ──────────────────────────────────────────────────────
function CalculatingPhase({ group, teamResults, teamJoined }) {
  const completed = teamResults.length
  const total     = Math.max(completed, teamJoined)

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={group} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#bbb', marginBottom: '1.25rem' }}>
          Calculando la huella del equipo
        </p>

        <div style={{ fontWeight: 900, fontSize: 'clamp(5rem, 16vw, 10rem)', lineHeight: 1, color: '#1a1a1a', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {total > 0 ? `${completed}/${total}` : completed || '–'}
        </div>
        <p style={{ fontSize: '1rem', color: '#888', marginBottom: '2.5rem' }}>
          miembros han completado la calculadora
        </p>

        {total > 0 && (
          <div style={{ width: '100%', maxWidth: 420, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', marginBottom: '3rem' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((completed / total) * 100, 100)}%`,
              background: completed >= total ? '#2d5a27' : '#7db87a',
              borderRadius: 4, transition: 'width 0.6s ease',
            }} />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', maxWidth: 560 }}>
          {teamResults.map((r, i) => (
            <div key={i} style={{ padding: '0.5rem 1.2rem', borderRadius: 999, background: '#f0f7ee', color: '#2d5a27', fontSize: '0.85rem', fontWeight: 700 }}>
              ✓ {r.name && r.name !== 'Anónimo' ? r.name : `Miembro ${i + 1}`}
            </div>
          ))}
          {Array.from({ length: Math.max(0, total - completed) }).map((_, i) => (
            <div key={`p${i}`} style={{ padding: '0.5rem 1.2rem', borderRadius: 999, background: '#f5f5f0', color: '#bbb', fontSize: '0.85rem', fontWeight: 600 }}>
              Esperando...
            </div>
          ))}
        </div>

        {completed > 0 && (
          <p style={{ fontSize: '0.75rem', color: '#ccc', marginTop: '2rem', fontStyle: 'italic' }}>
            Los resultados se revelarán cuando el facilitador lo indique
          </p>
        )}
      </div>
    </div>
  )
}

// ── Phase 3: Results ──────────────────────────────────────────────────────────
function ResultsPhase({ group, teamResults, sessionResults }) {
  if (teamResults.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
        <Navbar group={group} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <p style={{ color: '#aaa', fontSize: '0.95rem' }}>Sin resultados para este equipo.</p>
        </div>
      </div>
    )
  }

  const teamAvg    = mean(teamResults.map(r => r.tons))
  const sessionAvg = sessionResults.length ? mean(sessionResults.map(r => r.tons)) : null
  const category   = getCategory(teamAvg)
  const catCfg     = CATEGORY_CONFIG[category]

  const vsSesion = sessionAvg != null ? Math.round(((teamAvg - sessionAvg) / sessionAvg) * 100) : null
  const vsSpain  = Math.round(((teamAvg - SPAIN_AVG) / SPAIN_AVG) * 100)

  // Donut data
  const areaAvgMap = {}
  AREA_META.forEach(a => { areaAvgMap[a.key] = mean(teamResults.map(r => r.areas?.[a.key] || 0)) })
  const pieData = AREA_META
    .map(a => ({ name: a.label, value: areaAvgMap[a.key], color: a.color }))
    .filter(d => d.value > 0.001)

  // Horizontal bars (scale 0–10 t)
  const BAR_MAX   = 10
  const pct = v => `${Math.min((v / BAR_MAX) * 100, 100).toFixed(1)}%`
  const TARGET_PCT = `${(2 / BAR_MAX) * 100}%`

  const bars = [
    { label: group,          value: teamAvg,    color: '#2d5a27', bold: true },
    ...(sessionAvg != null ? [{ label: 'Media sesión', value: sessionAvg, color: '#aaa',    bold: false }] : []),
    { label: 'Media España',  value: SPAIN_AVG,  color: '#d0d0d0', bold: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', animation: 'tmReveal 0.5s ease both' }}>
      <style>{`@keyframes tmReveal { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <Navbar group={group} />

      {/* Hero */}
      <div style={{ background: '#2d5a27', color: '#fff', padding: '2.5rem 2rem 3rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '2rem 4rem', alignItems: 'flex-start' }}>
          {/* Left: big number */}
          <div style={{ flex: '1 1 180px' }}>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.5, margin: '0 0 0.6rem' }}>
              Huella media · {group}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 900, fontSize: 'clamp(3.5rem, 10vw, 5.5rem)', lineHeight: 1 }}>
                {teamAvg.toFixed(1)}
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>t CO₂/año</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: '0.9rem', background: 'rgba(255,255,255,0.18)', padding: '0.35rem 0.9rem', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700 }}>
              {catCfg.label}
            </div>
          </div>

          {/* Right: 3 stats */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexWrap: 'wrap', gap: '1.25rem 3rem', alignItems: 'flex-start', paddingTop: '0.25rem' }}>
            {[
              {
                big: vsSesion != null ? `${vsSesion > 0 ? '+' : ''}${vsSesion}%` : '–',
                label: 'Vs. sesión',
                sub: sessionAvg != null ? `media: ${sessionAvg.toFixed(1)} t` : '–',
                highlight: vsSesion != null && vsSesion < 0,
              },
              {
                big: `${vsSpain > 0 ? '+' : ''}${vsSpain}%`,
                label: 'Vs. España',
                sub: `media: ${SPAIN_AVG} t`,
                highlight: vsSpain < 0,
              },
              {
                big: `${teamResults.length}`,
                label: 'Miembros',
                sub: 'han completado',
                highlight: false,
              },
            ].map(({ big, label, sub, highlight }) => (
              <div key={label}>
                <span style={{ fontWeight: 900, fontSize: 'clamp(1.6rem, 4.5vw, 2.2rem)', display: 'block', lineHeight: 1, marginBottom: '0.2rem', color: highlight ? '#a8d8a0' : '#fff' }}>
                  {big}
                </span>
                <span style={{ fontSize: '0.63rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, display: 'block' }}>{label}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.75, display: 'block', marginTop: '0.1rem' }}>{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.75rem 1.5rem 3rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>

        {/* Donut */}
        <div style={{ flex: '1 1 340px', background: '#fff', borderRadius: 14, padding: '1.75rem', minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', marginBottom: '1.5rem' }}>
            Desglose por áreas — media del equipo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <PieChart width={200} height={200}>
                <Pie
                  data={pieData}
                  cx={100} cy={100}
                  innerRadius={58} outerRadius={90}
                  dataKey="value"
                  paddingAngle={2}
                  startAngle={90} endAngle={-270}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontWeight: 900, fontSize: '1.6rem', lineHeight: 1, color: '#1a1a1a' }}>{teamAvg.toFixed(1)}</span>
                <span style={{ fontSize: '0.62rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>t CO₂</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {AREA_META.map(a => {
                const val = areaAvgMap[a.key]
                const totalForPct = pieData.reduce((s, d) => s + d.value, 0)
                const pctArea = totalForPct > 0 ? Math.round((val / totalForPct) * 100) : 0
                return (
                  <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 10, height: 10, background: a.color, borderRadius: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: '#555', flex: 1 }}>{a.label}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1a1a', minWidth: 36, textAlign: 'right' }}>{val.toFixed(1)} t</span>
                    <span style={{ fontSize: '0.68rem', color: '#bbb', minWidth: 32, textAlign: 'right' }}>{pctArea}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Horizontal bar comparison */}
        <div style={{ flex: '1 1 280px', background: '#fff', borderRadius: 14, padding: '1.75rem', minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', marginBottom: '1.75rem' }}>
            Comparativa
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {bars.map(({ label, value, color, bold }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: bold ? '#1a1a1a' : '#888', fontWeight: bold ? 700 : 500 }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1a1a1a' }}>{value.toFixed(1)} t</span>
                </div>
                <div style={{ height: 32, background: '#f5f5f0', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(value), background: color, borderRadius: 6, transition: 'width 0.7s ease' }} />
                  {/* 2t objective marker */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: TARGET_PCT, width: 2, background: '#e05555', opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>

          {/* X axis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', paddingTop: '0.4rem', borderTop: '1px solid #f0f0f0' }}>
            {[0, 2, 4, 6, 8, 10].map(v => (
              <span key={v} style={{ fontSize: '0.62rem', color: '#ccc' }}>{v}t</span>
            ))}
          </div>

          <div style={{ fontSize: '0.65rem', color: '#e05555', marginTop: '0.75rem', fontStyle: 'italic' }}>
            ─ Objetivo climático: 2 t/año por persona
          </div>

          {vsSesion != null && vsSesion < 0 && (
            <div style={{ marginTop: '1.25rem', background: '#f0f7ee', border: '1px solid #c8e6c0', borderRadius: 8, padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1rem' }}>🏆</span>
              <span style={{ fontSize: '0.78rem', color: '#2d5a27', fontWeight: 700 }}>
                Por debajo de la media de la sesión
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Selecting ─────────────────────────────────────────────────────────
function Step3SelectingPhase({ group, code, teamAvg, showCO2, onConfirm, initialSelected = [] }) {
  const [selectedActions, setSelectedActions] = useState(initialSelected)
  const [filterArea, setFilterArea]           = useState('all')
  const [filterType, setFilterType]           = useState('all')

  const pointsUsed     = selectedActions.reduce((s, id) => {
    const a = ACTIONS.find(x => x.id === id)
    return s + (a ? a.cost : 0)
  }, 0)

  const totalReduction = selectedActions.reduce((s, id) => {
    const a = ACTIONS.find(x => x.id === id)
    return s + (a ? a.co2Reduction : 0)
  }, 0)

  const filteredActions = ACTIONS.filter(a => {
    if (filterArea !== 'all' && a.area !== filterArea) return false
    if (filterType !== 'all' && a.type !== filterType) return false
    return true
  })

  function toggleAction(id) {
    const action = ACTIONS.find(a => a.id === id)
    if (!action) return
    if (selectedActions.includes(id)) {
      setSelectedActions(prev => prev.filter(x => x !== id))
    } else {
      if (pointsUsed + action.cost > MAX_POINTS) return
      setSelectedActions(prev => [...prev, id])
    }
  }

  const areaFilters = [
    { key: 'all', label: 'Todas' },
    { key: 'transport',   label: `${AREA_EMOJI.transport} Transporte` },
    { key: 'energy',      label: `${AREA_EMOJI.energy} Vivienda` },
    { key: 'food',        label: `${AREA_EMOJI.food} Alimentación` },
    { key: 'consumption', label: `${AREA_EMOJI.consumption} Consumo` },
    { key: 'waste',       label: `${AREA_EMOJI.waste} Digital` },
  ]

  const typeFilters = [
    { key: 'all',        label: 'Todos' },
    { key: 'individual', label: 'Individual' },
    { key: 'colectiva',  label: 'Colectiva' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes co2Appear { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <Navbar group={group} />

      {/* Header */}
      <div style={{ background: '#2d5a27', color: '#fff', padding: '1.5rem 1.75rem 1.25rem' }}>
        <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.55, margin: '0 0 0.4rem' }}>
          {showCO2 ? 'Ajusta tu selección — impacto visible' : 'Elige tus acciones de reducción'}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 900, fontSize: 'clamp(1.4rem, 4vw, 2rem)', lineHeight: 1 }}>
            {group}
          </span>
          {teamAvg > 0 && (
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>
              Huella actual: {teamAvg.toFixed(1)} t CO₂/año
            </span>
          )}
        </div>
        {showCO2 && totalReduction > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              Reducción: <strong>−{totalReduction} kg CO₂/año</strong>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              Nueva huella: <strong>{Math.max(0, teamAvg - totalReduction / 1000).toFixed(1)} t</strong>
            </div>
          </div>
        )}
      </div>

      {/* Budget bar */}
      <div style={{ background: '#fff', padding: '1rem 1.75rem', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: MAX_POINTS }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 22, height: 22, borderRadius: '50%',
                background: i < pointsUsed ? '#2d5a27' : '#e8e8e8',
                border: i < pointsUsed ? 'none' : '2px solid #ddd',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: pointsUsed > MAX_POINTS ? '#e05555' : '#2d5a27' }}>
          {pointsUsed} / {MAX_POINTS} pts
        </span>
      </div>

      {/* Filter row */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0.75rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
          {areaFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterArea(f.key)}
              style={{
                flexShrink: 0,
                padding: '0.35rem 0.85rem',
                borderRadius: 999,
                border: filterArea === f.key ? '2px solid #2d5a27' : '2px solid #e0e0e0',
                background: filterArea === f.key ? '#f0f7ee' : '#fff',
                color: filterArea === f.key ? '#2d5a27' : '#666',
                fontSize: '0.78rem',
                fontWeight: filterArea === f.key ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {typeFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              style={{
                flexShrink: 0,
                padding: '0.28rem 0.75rem',
                borderRadius: 999,
                border: filterType === f.key ? '2px solid #7a7aaa' : '2px solid #e0e0e0',
                background: filterType === f.key ? '#f0f0f8' : '#fff',
                color: filterType === f.key ? '#4a4a80' : '#666',
                fontSize: '0.73rem',
                fontWeight: filterType === f.key ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem 6rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {filteredActions.map(action => {
            const isSelected = selectedActions.includes(action.id)
            const isDisabled = !isSelected && pointsUsed + action.cost > MAX_POINTS
            const areaColor  = AREA_COLOR[action.area]

            return (
              <div
                key={action.id}
                onClick={() => !isDisabled && toggleAction(action.id)}
                style={{
                  background: isSelected ? '#f0f7ee' : '#fff',
                  border: isSelected ? '2px solid #2d5a27' : '2px solid #e8e8e8',
                  borderRadius: 12,
                  padding: '0.9rem 1.1rem',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.45 : 1,
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                }}
              >
                {/* Area color stripe */}
                <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: areaColor, flexShrink: 0 }} />

                {/* Checkbox */}
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: isSelected ? '#2d5a27' : '#f0f0f0',
                  border: isSelected ? 'none' : '2px solid #ddd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}>
                  {isSelected && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 900 }}>✓</span>}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1a1a1a', lineHeight: 1.35 }}>
                      {action.label}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 999,
                        background: areaColor + '22', color: areaColor,
                      }}>
                        {AREA_EMOJI[action.area]} {AREA_LABEL[action.area]}
                      </span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: 999,
                        background: '#f0f0f0', color: '#666',
                      }}>
                        {TYPE_LABEL[action.type]}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#888', margin: '0.3rem 0 0', lineHeight: 1.5 }}>
                    {action.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2d5a27' }}>
                      {action.cost} {action.cost === 1 ? 'pt' : 'pts'}
                    </span>
                    {showCO2 && (
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700, color: '#e05555',
                        animation: 'co2Appear 0.4s ease both',
                      }}>
                        −{action.co2Reduction} kg CO₂/año
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e8e8e8',
        padding: '0.9rem 1.75rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: pointsUsed > MAX_POINTS ? '#e05555' : '#1a1a1a' }}>
          {pointsUsed} / {MAX_POINTS} pts usados · {selectedActions.length} acciones
        </span>
        <button
          disabled={pointsUsed === 0 || pointsUsed > MAX_POINTS}
          onClick={() => onConfirm({ actions: selectedActions, pointsUsed })}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: 10,
            border: 'none',
            background: pointsUsed === 0 || pointsUsed > MAX_POINTS ? '#ccc' : '#2d5a27',
            color: '#fff',
            fontWeight: 900,
            fontSize: '0.9rem',
            letterSpacing: '0.06em',
            cursor: pointsUsed === 0 || pointsUsed > MAX_POINTS ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          CONFIRMAR
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Waiting (after first confirm) ─────────────────────────────────────
function Step3WaitingPhase({ group, selectedActions, showCO2 }) {
  const actionObjects = selectedActions.map(id => ACTIONS.find(a => a.id === id)).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={group} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>✅</div>
        <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.4rem, 4vw, 2rem)', color: '#1a1a1a', marginBottom: '0.5rem' }}>
          Selección confirmada
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '2rem', maxWidth: 380 }}>
          Espera a que el facilitador revele el impacto...
        </p>

        {/* Selected actions list */}
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {actionObjects.map(action => (
            <div
              key={action.id}
              style={{
                background: '#fff',
                border: '1px solid #e0e8dc',
                borderRadius: 10,
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{AREA_EMOJI[action.area]}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{action.label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2d5a27', flexShrink: 0 }}>
                {action.cost} pts
              </span>
            </div>
          ))}
        </div>

        <DotsLoader />
      </div>
    </div>
  )
}

// ── Step 3: Revealed ──────────────────────────────────────────────────────────
function Step3RevealedPhase({ group, teamAvg, selectedActions, onAdjust }) {
  const actionObjects  = selectedActions.map(id => ACTIONS.find(a => a.id === id)).filter(Boolean)
  const totalReduction = actionObjects.reduce((s, a) => s + a.co2Reduction, 0)
  const newTons        = Math.max(0, teamAvg - totalReduction / 1000)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column', animation: 'tmReveal 0.5s ease both' }}>
      <style>{`
        @keyframes tmReveal { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes co2Appear { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <Navbar group={group} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem 7rem' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Hero card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e4020 0%, #2d5a27 100%)',
            color: '#fff',
            borderRadius: 18,
            padding: '2rem 1.75rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.55, margin: '0 0 1.25rem' }}>
              Impacto de tus acciones · {group}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Antes</div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(2rem, 7vw, 3rem)', lineHeight: 1, opacity: 0.7 }}>
                  {teamAvg.toFixed(1)} t
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', opacity: 0.5 }}>→</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Después</div>
                <div style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 3.8rem)', lineHeight: 1, color: '#a8d8a0' }}>
                  {newTons.toFixed(1)} t
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1.25rem', borderRadius: 999,
              fontSize: '0.88rem', fontWeight: 700,
            }}>
              <span>🌱</span>
              <span>Ahorro: −{totalReduction} kg CO₂/año</span>
            </div>
          </div>

          {/* Actions with co2 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {actionObjects.map((action, idx) => (
              <div
                key={action.id}
                style={{
                  background: '#fff',
                  border: '2px solid #c8e6c0',
                  borderRadius: 12,
                  padding: '0.9rem 1.1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  animation: `co2Appear 0.4s ease ${idx * 0.08}s both`,
                }}
              >
                <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: AREA_COLOR[action.area], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.87rem', color: '#1a1a1a', marginBottom: '0.2rem' }}>
                    {AREA_EMOJI[action.area]} {action.label}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{action.cost} pts</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e05555', animation: `co2Appear 0.5s ease ${idx * 0.08 + 0.15}s both` }}>
                      −{action.co2Reduction} kg CO₂/año
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e8e8e8',
        padding: '0.9rem 1.75rem',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        display: 'flex', justifyContent: 'center',
      }}>
        <button
          onClick={onAdjust}
          style={{
            padding: '0.8rem 2.5rem',
            borderRadius: 10,
            border: '2px solid #2d5a27',
            background: '#fff',
            color: '#2d5a27',
            fontWeight: 900,
            fontSize: '0.9rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
          }}
        >
          AJUSTAR SELECCIÓN
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Confirmed (waiting for winners) ───────────────────────────────────
function Step3ConfirmedPhase({ group, selectedActions }) {
  const actionObjects = selectedActions.map(id => ACTIONS.find(a => a.id === id)).filter(Boolean)

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={group} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>✅</div>
        <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.4rem, 4vw, 2rem)', color: '#1a1a1a', marginBottom: '0.5rem' }}>
          Selección final confirmada
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '2rem', maxWidth: 380 }}>
          Esperando resultados finales...
        </p>

        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {actionObjects.map(action => (
            <div
              key={action.id}
              style={{
                background: '#fff',
                border: '1px solid #e0e8dc',
                borderRadius: 10,
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{AREA_EMOJI[action.area]}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a', flex: 1 }}>{action.label}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e05555', flexShrink: 0 }}>
                −{action.co2Reduction} kg
              </span>
            </div>
          ))}
        </div>

        <DotsLoader />
      </div>
    </div>
  )
}

// ── Step 3: Winners ───────────────────────────────────────────────────────────
function Step3WinnersPhase({ group, teamAvg, selectedActions, step3Data }) {
  const actionObjects  = selectedActions.map(id => ACTIONS.find(a => a.id === id)).filter(Boolean)
  const totalReduction = actionObjects.reduce((s, a) => s + a.co2Reduction, 0)
  const newTons        = Math.max(0, teamAvg - totalReduction / 1000)

  // Find this team's rank
  let rank = null
  let totalGroups = null
  if (step3Data?.teams?.length) {
    const sorted = [...step3Data.teams].sort((a, b) => b.totalReduction - a.totalReduction)
    const idx = sorted.findIndex(t => groupMatches(t.group, group))
    rank = idx >= 0 ? idx + 1 : null
    totalGroups = step3Data.totalGroups || sorted.length
  }

  const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `#${rank}` : null

  const topActions = step3Data?.actionStats
    ? [...step3Data.actionStats].sort((a, b) => b.co2Reduction * b.count - a.co2Reduction * a.count).slice(0, 5)
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f0', display: 'flex', flexDirection: 'column', animation: 'tmReveal 0.5s ease both' }}>
      <style>{`
        @keyframes tmReveal { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes co2Appear { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <Navbar group={group} />

      <div style={{ overflowY: 'auto', padding: '1.5rem 1.25rem 3rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Hero */}
          <div style={{
            background: 'linear-gradient(135deg, #1e4020 0%, #2d5a27 100%)',
            color: '#fff',
            borderRadius: 18,
            padding: '2rem 1.75rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            {rankLabel && (
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem', lineHeight: 1 }}>{rankLabel}</div>
            )}
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.18em', opacity: 0.55, margin: '0 0 0.75rem' }}>
              Resultado final · {group}
            </p>
            <div style={{ fontWeight: 900, fontSize: 'clamp(2.8rem, 9vw, 4.5rem)', lineHeight: 1, color: '#a8d8a0', marginBottom: '0.5rem' }}>
              {newTons.toFixed(1)} t
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.75, marginBottom: '1rem' }}>
              CO₂/año · antes {teamAvg.toFixed(1)} t
            </div>
            {rank && totalGroups && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(255,255,255,0.15)', padding: '0.4rem 1.1rem', borderRadius: 999,
                fontSize: '0.82rem', fontWeight: 700,
              }}>
                Puesto {rank} de {totalGroups} equipos
              </div>
            )}
          </div>

          {/* Ranking table */}
          {step3Data?.teams?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', marginBottom: '1rem' }}>
                Clasificación de equipos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[...step3Data.teams]
                  .sort((a, b) => b.totalReduction - a.totalReduction)
                  .map((team, idx) => {
                    const isMe = groupMatches(team.group, group)
                    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`
                    return (
                      <div
                        key={team.group}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.65rem 0.85rem', borderRadius: 10,
                          background: isMe ? '#f0f7ee' : '#f9f9f9',
                          border: isMe ? '2px solid #2d5a27' : '2px solid transparent',
                          animation: `co2Appear 0.35s ease ${idx * 0.06}s both`,
                        }}
                      >
                        <span style={{ fontSize: '1rem', minWidth: 28, textAlign: 'center' }}>{medal}</span>
                        <span style={{ flex: 1, fontWeight: isMe ? 700 : 500, fontSize: '0.85rem', color: '#1a1a1a' }}>
                          {team.group}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e05555' }}>
                          −{team.totalReduction} kg
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#888', minWidth: 50, textAlign: 'right' }}>
                          {(team.newTons ?? Math.max(0, (team.originalTons || 0) - team.totalReduction / 1000)).toFixed(1)} t
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* My selected actions */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', marginBottom: '0.85rem' }}>
              Mis acciones — {group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {actionObjects.map((action, idx) => (
                <div
                  key={action.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    padding: '0.6rem 0.85rem', borderRadius: 10,
                    background: '#f9f9f9',
                    animation: `co2Appear 0.35s ease ${idx * 0.06}s both`,
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{AREA_EMOJI[action.area]}</span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a' }}>{action.label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e05555', flexShrink: 0 }}>
                    −{action.co2Reduction} kg
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top actions across session */}
          {topActions && topActions.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', marginBottom: '0.85rem' }}>
                Acciones más elegidas en la sesión
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {topActions.map((stat, idx) => (
                  <div
                    key={stat.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.65rem',
                      padding: '0.6rem 0.85rem', borderRadius: 10, background: '#f9f9f9',
                      animation: `co2Appear 0.35s ease ${idx * 0.06}s both`,
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#bbb', minWidth: 18 }}>{idx + 1}</span>
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#1a1a1a' }}>{stat.label}</span>
                    <span style={{ fontSize: '0.72rem', color: '#888', flexShrink: 0 }}>
                      {stat.count} {stat.count === 1 ? 'equipo' : 'equipos'}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e05555', flexShrink: 0 }}>
                      −{stat.co2Reduction} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeamScreen() {
  const { code, group } = useParams()
  const navigate = useNavigate()

  const [phase,               setPhase]               = useState('waiting')
  const [step3Phase,          setStep3Phase]          = useState('selecting')
  const [teamResults,         setTeamResults]         = useState([])
  const [sessionResults,      setSessionResults]      = useState([])
  const [teamJoined,          setTeamJoined]          = useState(0)
  const [step3Data,           setStep3Data]           = useState(null)
  const [step3SelectedActions, setStep3SelectedActions] = useState([])

  useEffect(() => {
    socket.connect()
    socket.emit('team:join', { code, group })

    function onStepChange({ step }) {
      if (step >= 3) {
        setPhase('step3')
      } else if (step >= 2) {
        setPhase(p => p === 'results' ? p : 'calculating')
      }
    }

    function onRankingUpdate({ individual }) {
      if (individual) {
        console.log('[TeamScreen] ranking:update groups:', [...new Set(individual.map(r => r.group))], '| url group:', group)
        setSessionResults(individual)
        const myTeam = individual.filter(r => groupMatches(r.group, group))
        setTeamResults(myTeam)
        setTeamJoined(prev => Math.max(prev, myTeam.length))
      }
    }

    function onParticipantJoined({ group: joinedGroup }) {
      if (groupMatches(joinedGroup, group)) setTeamJoined(prev => prev + 1)
    }

    function onResultsRevealed() { setPhase('results') }
    function onSessionClosed()   { navigate('/') }

    function onStep3Revealed() {
      setStep3Phase(p =>
        p === 'selecting' || p === 'waiting' || p === 'adjusting' ? 'revealed' : p
      )
    }

    function onWinnersRevealed() {
      setStep3Phase('winners')
      api.get(`/api/sessions/${code}/step3`)
        .then(res => setStep3Data(res.data))
        .catch(() => {})
    }

    socket.on('step:change',        onStepChange)
    socket.on('ranking:update',     onRankingUpdate)
    socket.on('participant:joined', onParticipantJoined)
    socket.on('results:revealed',   onResultsRevealed)
    socket.on('session:closed',     onSessionClosed)
    socket.on('step3:revealed',     onStep3Revealed)
    socket.on('winners:revealed',   onWinnersRevealed)

    api.get(`/api/sessions/${code}/info`)
      .then(res => {
        if (res.data.winnersRevealed) setPhase('step3')
        else if (res.data.resultsRevealed) setPhase('results')
        else if (res.data.status === 'active') setPhase('calculating')
      })
      .catch(() => {})

    return () => {
      socket.off('step:change',        onStepChange)
      socket.off('ranking:update',     onRankingUpdate)
      socket.off('participant:joined', onParticipantJoined)
      socket.off('results:revealed',   onResultsRevealed)
      socket.off('session:closed',     onSessionClosed)
      socket.off('step3:revealed',     onStep3Revealed)
      socket.off('winners:revealed',   onWinnersRevealed)
    }
  }, [code, group, navigate])

  const teamAvg = mean(teamResults.map(r => r.tons))

  function handleStep3Confirm({ actions, pointsUsed }) {
    setStep3SelectedActions(actions)
    socket.emit('team:confirmActions', { sessionCode: code, group, actions, pointsUsed })
    setStep3Phase('waiting')
  }

  function handleStep3ConfirmFinal({ actions, pointsUsed }) {
    setStep3SelectedActions(actions)
    socket.emit('team:confirmFinal', { sessionCode: code, group, actions, pointsUsed })
    setStep3Phase('confirmed')
  }

  function handleAdjust() {
    setStep3Phase('adjusting')
  }

  if (phase === 'waiting')     return <WaitingPhase group={group} />
  if (phase === 'calculating') return <CalculatingPhase group={group} teamResults={teamResults} teamJoined={teamJoined} />
  if (phase === 'results')     return <ResultsPhase group={group} teamResults={teamResults} sessionResults={sessionResults} />

  // Step 3
  if (phase === 'step3') {
    switch (step3Phase) {
      case 'selecting':
        return (
          <Step3SelectingPhase
            group={group}
            code={code}
            teamAvg={teamAvg}
            showCO2={false}
            onConfirm={handleStep3Confirm}
            initialSelected={[]}
          />
        )

      case 'waiting':
        return (
          <Step3WaitingPhase
            group={group}
            selectedActions={step3SelectedActions}
            showCO2={false}
          />
        )

      case 'revealed':
        return (
          <Step3RevealedPhase
            group={group}
            teamAvg={teamAvg}
            selectedActions={step3SelectedActions}
            onAdjust={handleAdjust}
          />
        )

      case 'adjusting':
        return (
          <Step3SelectingPhase
            group={group}
            code={code}
            teamAvg={teamAvg}
            showCO2={true}
            onConfirm={handleStep3ConfirmFinal}
            initialSelected={step3SelectedActions}
          />
        )

      case 'confirmed':
        return (
          <Step3ConfirmedPhase
            group={group}
            selectedActions={step3SelectedActions}
          />
        )

      case 'winners':
        return (
          <Step3WinnersPhase
            group={group}
            teamAvg={teamAvg}
            selectedActions={step3SelectedActions}
            step3Data={step3Data}
          />
        )

      default:
        return <WaitingPhase group={group} />
    }
  }

  return <WaitingPhase group={group} />
}
