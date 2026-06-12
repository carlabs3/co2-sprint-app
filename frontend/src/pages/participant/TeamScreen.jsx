import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell } from 'recharts'
import { socket } from '../../utils/socket.js'
import api from '../../utils/api.js'
import { ACTIONS, AREA_EMOJI } from '../../utils/actions.js'
import WaitingForFacilitator from '../../components/WaitingForFacilitator.jsx'

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
  { key: 'transport',   label: 'Transporte',   color: '#38bdf8' },
  { key: 'energy',      label: 'Vivienda',     color: '#f59e0b' },
  { key: 'food',        label: 'Alimentación', color: '#4ade80' },
  { key: 'consumption', label: 'Consumo',      color: '#a855f7' },
  { key: 'waste',       label: 'Digital',      color: '#f472b6' },
]

const SPAIN_AVG = 8.1

const CATEGORY_CONFIG = {
  bajo:       { label: 'Huella reducida 🌿' },
  medio:      { label: 'Huella moderada 🌱' },
  alto:       { label: 'Huella elevada 🌍' },
  'muy alto': { label: 'Huella muy elevada 🔥' },
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

function DotsLoader({ color = '#0a0a0a' }) {
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
    <div style={{ background: '#0a0a0a', padding: '0.85rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={null} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: '1.5rem', lineHeight: 1 }}>🌿</div>
        <h1 style={{
          fontWeight: 900,
          fontSize: 'clamp(2rem, 6vw, 3.5rem)',
          letterSpacing: '-0.02em', color: '#0a0a0a',
          marginBottom: '0.5rem', textTransform: 'uppercase',
        }}>
          {group}
        </h1>
        <p style={{ fontSize: '1.05rem', color: '#666', maxWidth: 400, lineHeight: 1.65, marginBottom: '3rem' }}>
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={group} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#bbb', marginBottom: '1.25rem' }}>
          Calculando la huella del equipo
        </p>

        <div style={{ fontWeight: 900, fontSize: 'clamp(5rem, 16vw, 10rem)', lineHeight: 1, color: '#0a0a0a', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {total > 0 ? `${completed}/${total}` : completed || '–'}
        </div>
        <p style={{ fontSize: '1rem', color: '#888', marginBottom: '2.5rem' }}>
          miembros han completado la calculadora
        </p>

        {total > 0 && (
          <div style={{ width: '100%', maxWidth: 420, height: 8, background: '#e5e5e5', borderRadius: 4, overflow: 'hidden', marginBottom: '3rem' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((completed / total) * 100, 100)}%`,
              background: completed >= total ? '#0a0a0a' : '#0a0a0a',
              borderRadius: 4, transition: 'width 0.6s ease',
            }} />
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.6rem', maxWidth: 560 }}>
          {teamResults.map((r, i) => (
            <div key={i} style={{ padding: '0.5rem 1.2rem', borderRadius: 999, background: '#f5f5f5', border: '1px solid #e5e5e5', color: '#0a0a0a', fontSize: '0.85rem', fontWeight: 700 }}>
              ✓ {r.name && r.name !== 'Anónimo' ? r.name : `Miembro ${i + 1}`}
            </div>
          ))}
          {Array.from({ length: Math.max(0, total - completed) }).map((_, i) => (
            <div key={`p${i}`} style={{ padding: '0.5rem 1.2rem', borderRadius: 999, background: '#fff', border: '1px solid #e5e5e5', color: '#ccc', fontSize: '0.85rem', fontWeight: 600 }}>
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
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
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
    { label: group,          value: teamAvg,    color: '#0a0a0a', bold: true },
    ...(sessionAvg != null ? [{ label: 'Media sesión', value: sessionAvg, color: '#aaa',    bold: false }] : []),
    { label: 'Media España',  value: SPAIN_AVG,  color: '#d4d4d4', bold: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', animation: 'tmReveal 0.5s ease both' }}>
      <style>{`@keyframes tmReveal { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <Navbar group={group} />

      {/* Hero */}
      <div style={{ background: '#0a0a0a', color: '#fff', padding: '2.5rem 2rem 3rem' }}>
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
        <div style={{ flex: '1 1 340px', background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '1.75rem', minWidth: 0 }}>
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
                <span style={{ fontWeight: 900, fontSize: '1.6rem', lineHeight: 1, color: '#0a0a0a' }}>{teamAvg.toFixed(1)}</span>
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
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0a0a0a', minWidth: 36, textAlign: 'right' }}>{val.toFixed(1)} t</span>
                    <span style={{ fontSize: '0.68rem', color: '#bbb', minWidth: 32, textAlign: 'right' }}>{pctArea}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Horizontal bar comparison */}
        <div style={{ flex: '1 1 280px', background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', padding: '1.75rem', minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', marginBottom: '1.75rem' }}>
            Comparativa
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {bars.map(({ label, value, color, bold }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: bold ? '#0a0a0a' : '#888', fontWeight: bold ? 700 : 500 }}>{label}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0a0a0a' }}>{value.toFixed(1)} t</span>
                </div>
                <div style={{ height: 32, background: '#f5f5f5', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct(value), background: color, borderRadius: 6, transition: 'width 0.7s ease' }} />
                  {/* 2t objective marker */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: TARGET_PCT, width: 2, background: '#e05555', opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>

          {/* X axis */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', paddingTop: '0.4rem', borderTop: '1px solid #e5e5e5' }}>
            {[0, 2, 4, 6, 8, 10].map(v => (
              <span key={v} style={{ fontSize: '0.62rem', color: '#ccc' }}>{v}t</span>
            ))}
          </div>

          <div style={{ fontSize: '0.65rem', color: '#e05555', marginTop: '0.75rem', fontStyle: 'italic' }}>
            ─ Objetivo climático: 2 t/año por persona
          </div>

          {vsSesion != null && vsSesion < 0 && (
            <div style={{ marginTop: '1.25rem', background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: 8, padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1rem' }}>🏆</span>
              <span style={{ fontSize: '0.78rem', color: '#0a0a0a', fontWeight: 700 }}>
                Por debajo de la media de la sesión
              </span>
            </div>
          )}
        </div>

        {/* Action list */}
        <div style={{ width: '100%' }}>
          {/* action items shown here if needed */}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Display (receiver only) ──────────────────────────────────────────
function Step3DisplayPhase({ group, teamAvg, teamResults, confirmedData, showValues }) {
  const { actions = [], newCarbonTons = 0, totalReduction = 0 } = confirmedData || {}

  const AREA_ORDER = ['transport', 'energy', 'food', 'consumption', 'waste']
  const COLORS = { transport: '#38bdf8', energy: '#f59e0b', food: '#4ade80', consumption: '#a855f7', waste: '#f472b6' }
  const SHORT   = { transport: 'Trans.', energy: 'Viv.', food: 'Alim.', consumption: 'Cons.', waste: 'Dig.' }

  const areaAvgBefore = {}
  AREA_ORDER.forEach(area => {
    areaAvgBefore[area] = teamResults.length
      ? teamResults.reduce((s, r) => s + (r.areas?.[area] || 0), 0) / teamResults.length
      : 0
  })

  const areaRed = { transport: 0, energy: 0, food: 0, consumption: 0, waste: 0 }
  actions.forEach(id => {
    const a = ACTIONS.find(x => x.id === id)
    if (a) areaRed[a.area] = (areaRed[a.area] || 0) + a.co2Reduction / 1000
  })

  const areaAvgAfter = {}
  AREA_ORDER.forEach(area => {
    areaAvgAfter[area] = Math.max(0, areaAvgBefore[area] - (areaRed[area] || 0))
  })

  const sortedActions = [...actions]
    .map(id => ACTIONS.find(a => a.id === id))
    .filter(Boolean)
    .sort((a, b) => b.co2Reduction - a.co2Reduction)

  const StackedBar = ({ areaAvg, total, maxVal, label, color = '#0a0a0a' }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#888' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{total.toFixed(1)} t</span>
      </div>
      <div style={{ height: 18, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 6 }}>
        {AREA_ORDER.map(area => {
          const pct = maxVal > 0 ? (areaAvg[area] / maxVal) * 100 : 0
          if (pct < 0.1) return null
          return <div key={area} style={{ width: `${pct}%`, background: COLORS[area] }} />
        })}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
      <Navbar group={group} />

      {/* Header oscuro — huella actual */}
      <div style={{ background: '#000000', padding: '2rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center' }}>
        <div>
          <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)', margin: '0 0 0.3rem' }}>
            Huella actual del equipo
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', color: '#fff', lineHeight: 1 }}>
              {teamAvg.toFixed(1)}
            </span>
            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>t CO₂/año · media</span>
          </div>
        </div>

        {(() => {
          const areaTotal = Object.values(areaAvgBefore).reduce((s, v) => s + v, 0)
          const COLORS_LOCAL = { transport: '#38bdf8', energy: '#f59e0b', food: '#4ade80', consumption: '#a855f7', waste: '#f472b6' }
          return areaTotal > 0 ? (
            <div style={{ width: '100%', maxWidth: 500 }}>
              <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', marginBottom: '0.5rem' }}>
                {AREA_ORDER.map(area => {
                  const pct = (areaAvgBefore[area] / areaTotal) * 100
                  if (pct < 0.5) return null
                  return <div key={area} style={{ width: `${pct}%`, background: COLORS_LOCAL[area] }} />
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {AREA_ORDER.map(area => {
                  const pct = Math.round((areaAvgBefore[area] / areaTotal) * 100)
                  if (!pct) return null
                  return (
                    <div key={area} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS_LOCAL[area] }} />
                      {SHORT[area]} {pct}%
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null
        })()}
      </div>

      {/* Body — acciones confirmadas */}
      <div style={{ flex: 1, padding: '2.5rem 3rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', marginBottom: '1.25rem' }}>
          Acciones confirmadas para vuestro equipo
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 560, margin: '0 auto' }}>
          {sortedActions.map(action => (
            <div key={action.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#fff', border: '1px solid #e5e5e5',
              borderRadius: 14, padding: '1rem 1.25rem',
            }}>
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{AREA_EMOJI[action.area]}</span>
              <span style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3, textAlign: 'left' }}>{action.label}</span>
              {showValues ? (
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>
                  −{(action.co2Reduction / 1000).toFixed(1)} t
                </span>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#ccc', flexShrink: 0 }}>···</span>
              )}
            </div>
          ))}
        </div>

        {showValues && (
          <div style={{ marginTop: '2rem', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 16, padding: '1.25rem 1.5rem', maxWidth: 900 }}>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.68rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>Reducción total</p>
                <span style={{ fontWeight: 900, fontSize: '1.75rem', color: '#16a34a' }}>−{(totalReduction / 1000).toFixed(1)} t</span>
              </div>
              <div>
                <p style={{ fontSize: '0.68rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.25rem' }}>Nueva huella estimada</p>
                <span style={{ fontWeight: 900, fontSize: '1.75rem', color: '#1a1a1a' }}>{newCarbonTons.toFixed(1)} t</span>
              </div>
            </div>
            <StackedBar areaAvg={areaAvgBefore} total={teamAvg}       maxVal={teamAvg} label="Antes"   color="#1a1a1a" />
            <StackedBar areaAvg={areaAvgAfter}  total={newCarbonTons} maxVal={teamAvg} label="Después" color="#16a34a" />
          </div>
        )}

        {!showValues && sortedActions.length > 0 && (
          <p style={{ fontSize: '0.82rem', color: '#aaa', marginTop: '1.5rem', fontStyle: 'italic' }}>
            El facilitador revelará los valores en breve
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TeamScreen() {
  const { code, group } = useParams()
  const navigate = useNavigate()

  const [phase,            setPhase]            = useState('waiting')
  const [teamResults,      setTeamResults]      = useState([])
  const [sessionResults,   setSessionResults]   = useState([])
  const [teamJoined,       setTeamJoined]       = useState(0)
  const [confirmedActions, setConfirmedActions] = useState(null)  // { actions, newCarbonTons, totalReduction }
  const [step3ShowValues,  setStep3ShowValues]  = useState(false)

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

    function onTeamActionsConfirmed({ group: g, actions, newCarbonTons, totalReduction, showValues }) {
      if (!groupMatches(g, group)) return
      setConfirmedActions({ actions, newCarbonTons, totalReduction })
      if (showValues) setStep3ShowValues(true)
      setPhase(p => p === 'step3' || p === 'results' ? 'step3' : p)
    }

    function onStep3Revealed({ allActions } = {}) {
      setStep3ShowValues(true)
      if (allActions) {
        const myTA = allActions.find(ta => groupMatches(ta.group, group))
        if (myTA) {
          setConfirmedActions({
            actions: myTA.actions,
            newCarbonTons: myTA.newCarbonTons,
            totalReduction: myTA.totalReduction,
          })
        }
      }
      setPhase(p => p === 'step3' || p === 'results' ? 'step3' : p)
    }

    socket.on('step:change',           onStepChange)
    socket.on('ranking:update',        onRankingUpdate)
    socket.on('participant:joined',    onParticipantJoined)
    socket.on('results:revealed',      onResultsRevealed)
    socket.on('session:closed',        onSessionClosed)
    socket.on('team:actionsConfirmed', onTeamActionsConfirmed)
    socket.on('step3:revealed',        onStep3Revealed)

    api.get(`/api/sessions/${code}/info`)
      .then(res => {
        if (res.data.step3Revealed || res.data.currentStep >= 3) setPhase('step3')
        else if (res.data.resultsRevealed) setPhase('results')
        else if (res.data.status === 'active') setPhase('calculating')
      })
      .catch(() => {})

    // Fetch confirmed team actions for late joiners (fallback if socket missed)
    api.get(`/api/sessions/${code}/team-actions`)
      .then(res => {
        const myTeam = res.data.find(ta => groupMatches(ta.group, group))
        if (myTeam?.confirmed) {
          setConfirmedActions({
            actions: myTeam.actions,
            newCarbonTons: myTeam.newCarbonTons,
            totalReduction: myTeam.totalReduction,
          })
        }
      })
      .catch(() => {})

    return () => {
      socket.off('step:change',           onStepChange)
      socket.off('ranking:update',        onRankingUpdate)
      socket.off('participant:joined',    onParticipantJoined)
      socket.off('results:revealed',      onResultsRevealed)
      socket.off('session:closed',        onSessionClosed)
      socket.off('team:actionsConfirmed', onTeamActionsConfirmed)
      socket.off('step3:revealed',        onStep3Revealed)
    }
  }, [code, group, navigate])

  if (phase === 'waiting')     return <WaitingPhase group={group} />
  if (phase === 'calculating') return <CalculatingPhase group={group} teamResults={teamResults} teamJoined={teamJoined} />
  if (phase === 'results')     return <ResultsPhase group={group} teamResults={teamResults} sessionResults={sessionResults} />

  // Step 3
  if (phase === 'step3') {
    const tAvg = teamResults.length ? mean(teamResults.map(r => r.tons)) : 0
    if (!confirmedActions) {
      return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', flexDirection: 'column' }}>
          <Navbar group={group} />
          {tAvg > 0 && (
            <div style={{ background: '#f5f5f5', padding: '2rem', textAlign: 'center', borderBottom: '1px solid #e5e5e5' }}>
              <p style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#aaa', margin: '0 0 0.4rem' }}>
                Huella media actual del equipo
              </p>
              <p style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1, color: '#0a0a0a', margin: 0 }}>
                {tAvg.toFixed(1)} <span style={{ fontSize: '1rem', color: '#888', fontWeight: 500 }}>t CO₂/año</span>
              </p>
            </div>
          )}
          <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 14, margin: '1.5rem', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#0a0a0a', fontWeight: 700, margin: '0 0 0.4rem' }}>Esperando acciones del equipo</p>
            <p style={{ color: '#999', fontSize: '0.85rem', margin: 0 }}>El facilitador está eligiendo las acciones para vuestro equipo...</p>
          </div>
        </div>
      )
    }
    return (
      <Step3DisplayPhase
        group={group}
        teamAvg={tAvg}
        teamResults={teamResults}
        confirmedData={confirmedActions}
        showValues={step3ShowValues}
      />
    )
  }

  return <WaitingPhase group={group} />
}
