import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { AREA_QUESTIONS } from '../utils/answerLabels.js'

// ── helpers ───────────────────────────────────────────────────────────────────

export function getCategory(tons) {
  if (tons < 2) return 'bajo'
  if (tons < 4) return 'medio'
  if (tons < 6) return 'alto'
  return 'muy alto'
}

export function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

export function computeGroups(individual) {
  const map = {}
  for (const p of individual) {
    if (!map[p.group]) map[p.group] = []
    map[p.group].push(p.tons)
  }
  return Object.entries(map)
    .map(([name, tons]) => {
      const a = avg(tons)
      return { name, avg: a, count: tons.length, category: getCategory(a) }
    })
    .sort((a, b) => a.avg - b.avg)
}

function buildHistogram(values, extendForSpain = false) {
  if (!values.length) return []
  const counts = {}
  values.forEach(v => {
    const f = Math.floor(v)
    const key = `${f}–${f + 1}`
    counts[key] = (counts[key] || 0) + 1
  })
  const minFloor = Math.floor(Math.min(...values))
  let maxFloor = Math.floor(Math.max(...values))
  if (extendForSpain) maxFloor = Math.max(maxFloor, 7)
  const data = []
  for (let f = minFloor; f <= maxFloor; f++) {
    const key = `${f}–${f + 1}`
    data.push({ range: key, count: counts[key] || 0, floor: f })
  }
  return data
}

function getBarColor(floor) {
  if (floor < 3) return '#eaf3de'
  if (floor < 6) return '#fff8e0'
  if (floor < 9) return '#fff0e0'
  return '#fce8e8'
}

function getAnswerDistribution(ranking, areaId) {
  const areaIdx = AREA_QUESTIONS.findIndex(a => a.areaId === areaId)
  if (areaIdx < 0) return []
  const area = AREA_QUESTIONS[areaIdx]

  return area.questions.map(q => {
    const counts = {}
    let total = 0
    for (const p of ranking) {
      const selectedVal = p.answers?.[q.key]
      if (selectedVal !== undefined) {
        const matched = q.options.find(o => Math.abs(o.value - selectedVal) < 0.001)
        if (matched) {
          counts[matched.label] = (counts[matched.label] || 0) + 1
          total++
        }
      }
    }
    const distribution = q.options.map(opt => ({
      ...opt,
      count: counts[opt.label] || 0,
      pct: total > 0 ? Math.round(((counts[opt.label] || 0) / total) * 100) : 0,
    }))
    const maxCount = Math.max(...distribution.map(d => d.count), 1)
    return { question: q, distribution, total, maxCount }
  })
}

function getMostFrequent(values) {
  if (!values.length) return '–'
  const counts = {}
  values.forEach(v => {
    const key = `${Math.floor(v)}–${Math.floor(v) + 1}`
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

// ── constants ─────────────────────────────────────────────────────────────────

export const HISTOGRAM_TABS = [
  { id: 'total',       label: 'Total',          color: '#2d5a27' },
  { id: 'transport',   label: '🚗 Transporte',   color: '#4a90d9' },
  { id: 'energy',      label: '⚡ Energía',       color: '#e8a020' },
  { id: 'food',        label: '🥗 Alimentación', color: '#5aab5a' },
  { id: 'consumption', label: '🛍 Consumo',       color: '#b07a30' },
  { id: 'waste',       label: '♻️ Residuos',     color: '#7a7aaa' },
]

export const SPAIN_AVERAGES = {
  total: 7.2, transport: 1.8, energy: 1.6,
  food: 1.4, consumption: 1.2, waste: 0.8,
}

export const AREA_COLORS = {
  transport: '#4a90d9', energy: '#e8a020', food: '#5aab5a',
  consumption: '#b07a30', waste: '#7a7aaa',
}

export const AREA_LABELS = {
  transport: 'Transporte', energy: 'Energía', food: 'Alimentación',
  consumption: 'Consumo', waste: 'Residuos',
}

export const CATEGORY_COLORS = { bajo: '#3b6d11', medio: '#2d5a27', alto: '#b07a30', 'muy alto': '#cc4444' }
export const CATEGORY_BG     = { bajo: '#eaf3de', medio: '#eaf3de', alto: '#fff0e0', 'muy alto': '#fce8e8' }
export const CATEGORY_LABELS = { bajo: 'BAJO', medio: 'MEDIO', alto: 'ALTO', 'muy alto': 'MUY ALTO' }

// ── DistributionView ──────────────────────────────────────────────────────────

export function DistributionView({ ranking }) {
  const [activeTab, setActiveTab] = useState('total')

  const tab = HISTOGRAM_TABS.find(t => t.id === activeTab)

  const values = ranking
    .map(r => activeTab === 'total' ? r.tons : (r.areas?.[activeTab] ?? 0))
    .filter(v => v > 0)
    .sort((a, b) => a - b)

  const histData = buildHistogram(values, activeTab === 'total')
  const spainAvg = SPAIN_AVERAGES[activeTab]
  const spainBucket = `${Math.floor(spainAvg)}–${Math.floor(spainAvg) + 1}`

  const median       = values.length ? values[Math.floor(values.length / 2)] : 0
  const minVal       = values[0] ?? 0
  const maxVal       = values[values.length - 1] ?? 0
  const mostFrequent = values.length ? getMostFrequent(values) : '–'

  const medianBucket = `${Math.floor(median)}–${Math.floor(median) + 1}`
  const minBucket    = `${Math.floor(minVal)}–${Math.floor(minVal) + 1}`
  const maxBucket    = `${Math.floor(maxVal)}–${Math.floor(maxVal) + 1}`

  const areaAvg = {
    transport:   avg(ranking.map(r => r.areas?.transport   ?? 0)),
    energy:      avg(ranking.map(r => r.areas?.energy      ?? 0)),
    food:        avg(ranking.map(r => r.areas?.food        ?? 0)),
    consumption: avg(ranking.map(r => r.areas?.consumption ?? 0)),
    waste:       avg(ranking.map(r => r.areas?.waste       ?? 0)),
  }
  const areaTotal = Object.values(areaAvg).reduce((s, v) => s + v, 0)

  if (ranking.length === 0) return (
    <div style={{ color: '#bbb', padding: '4rem 2rem', textAlign: 'center', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Aún no hay resultados.
    </div>
  )

  return (
    <div>
      {ranking.length < 3 && (
        <div style={{ background: '#fff8e8', border: '1px solid #f5e0a0', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#b07a30' }}>
          Con pocos datos la distribución puede no ser representativa.
        </div>
      )}

      {/* Histogram card */}
      <div style={{ background: '#fff', border: '1px solid #f0f0ee', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {HISTOGRAM_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
              border: `1.5px solid ${activeTab === t.id ? t.color : '#e0e0d8'}`,
              background: activeTab === t.id ? t.color : 'transparent',
              color: activeTab === t.id ? '#fff' : '#666',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={histData} margin={{ top: 24, right: 16, left: -20, bottom: 4 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#f0f0ee" />
            <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div style={{ background: '#fff', border: '1px solid #e0e0d8', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: 12 }}>
                  <strong>{d.range} t</strong> — {d.count} participante{d.count !== 1 ? 's' : ''}
                </div>
              )
            }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.floor)}
                  stroke={entry.range === mostFrequent ? '#e8a020' : 'transparent'} strokeWidth={2} />
              ))}
            </Bar>
            {values.length > 0 && (
              <ReferenceLine x={medianBucket} stroke={tab.color} strokeWidth={2} strokeDasharray="5 3"
                label={{ value: `med. ${median.toFixed(1)}t`, fill: tab.color, fontSize: 11, fontWeight: 700, position: 'top' }} />
            )}
            {values.length > 0 && minBucket !== medianBucket && (
              <ReferenceLine x={minBucket} stroke="#3b6d11" strokeWidth={1} strokeDasharray="3 3"
                label={{ value: `mín ${minVal.toFixed(1)}t`, fill: '#3b6d11', fontSize: 10, position: 'top' }} />
            )}
            {values.length > 0 && maxBucket !== medianBucket && maxBucket !== minBucket && (
              <ReferenceLine x={maxBucket} stroke="#cc4444" strokeWidth={1} strokeDasharray="3 3"
                label={{ value: `máx ${maxVal.toFixed(1)}t`, fill: '#cc4444', fontSize: 10, position: 'top' }} />
            )}
            {activeTab === 'total' && histData.some(d => d.range === spainBucket) && (
              <ReferenceLine x={spainBucket} stroke="#888" strokeWidth={1.5} strokeDasharray="6 3"
                label={{ value: `España ${spainAvg}t`, fill: '#666', fontSize: 10, position: 'top' }} />
            )}
          </BarChart>
        </ResponsiveContainer>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f5f5f0' }}>
          {[
            { line: `2px dashed ${tab.color}`, label: 'Mediana grupo' },
            { line: '1px dashed #3b6d11', label: 'Mínimo' },
            { line: '1px dashed #cc4444', label: 'Máximo' },
            { line: '1.5px dashed #888', label: 'Media España' },
            { box: '#fff', border: '2px solid #e8a020', label: 'Más frecuente' },
          ].map(({ line, box, border, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#888' }}>
              {line
                ? <div style={{ width: 20, borderTop: line }} />
                : <div style={{ width: 12, height: 12, background: box, border, borderRadius: 2 }} />
              }
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Mediana', value: values.length ? `${median.toFixed(1)} t` : '–', bg: '#f0f7ee', color: '#2d5a27', border: '#c8e6c0' },
          { label: 'Mínimo',  value: values.length ? `${minVal.toFixed(1)} t` : '–',  bg: '#f5f5f0', color: '#555',    border: '#e0e0d8' },
          { label: 'Máximo',  value: values.length ? `${maxVal.toFixed(1)} t` : '–',  bg: '#f5f5f0', color: '#555',    border: '#e0e0d8' },
          { label: 'Más frecuente', value: mostFrequent !== '–' ? `${mostFrequent} t` : '–', bg: '#fff8e8', color: '#e8a020', border: '#f5e0a0' },
        ].map(({ label, value, bg, color, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.4rem', color, lineHeight: 1, marginBottom: '0.3rem' }}>{value}</div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Area breakdown */}
      {areaTotal > 0 && (
        <div style={{ background: '#fff', border: '1px solid #f0f0ee', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '1rem' }}>
            Media del grupo por áreas
          </div>
          <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: '0.75rem' }}>
            {Object.entries(AREA_COLORS).map(([key, color]) => {
              const w = areaAvg[key] / areaTotal * 100
              return w > 0 ? (
                <div key={key} title={`${AREA_LABELS[key]}: ${areaAvg[key].toFixed(2)} t`}
                  style={{ width: `${w}%`, background: color, transition: 'width 0.5s ease' }} />
              ) : null
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1.25rem' }}>
            {Object.entries(AREA_COLORS).map(([key, color]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                <span style={{ color: '#555' }}>{AREA_LABELS[key]}</span>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{areaAvg[key].toFixed(2)} t</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answer distribution */}
      {activeTab !== 'total' && (() => {
        const dist = getAnswerDistribution(ranking, activeTab)
        if (!dist.length) return null
        return (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '1rem' }}>
              Distribución de respuestas
            </div>
            {dist.map(({ question, distribution, total: qTotal, maxCount }) => (
              <div key={question.key} style={{ background: '#fff', border: '1px solid #f0f0ee', borderRadius: 12, padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#333', marginBottom: '1rem', lineHeight: 1.4 }}>
                  {question.text}
                </div>
                {distribution.map(opt => {
                  const isMost = opt.count > 0 && opt.count === maxCount
                  return (
                    <div key={opt.label} style={{ marginBottom: '0.7rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: isMost ? 700 : 400, color: isMost ? '#1a1a1a' : '#777' }}>
                          {opt.emoji} {opt.label}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: isMost ? 700 : 400, color: isMost ? tab.color : '#aaa' }}>
                          {opt.pct}%
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${opt.pct}%`, background: isMost ? tab.color : '#d8d8d4', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
                {qTotal < ranking.length && (
                  <div style={{ fontSize: '0.65rem', color: '#ccc', marginTop: '0.5rem' }}>
                    {qTotal} de {ranking.length} respondieron
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

// ── GroupsView ────────────────────────────────────────────────────────────────

export function GroupsView({ groups }) {
  const maxGroupAvg = groups.length > 0 ? Math.max(...groups.map(g => g.avg)) : 1

  if (groups.length === 0) return (
    <div style={{ textAlign: 'center', color: '#bbb', padding: '4rem 2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Sin datos de equipos aún...
    </div>
  )

  return (
    <div>
      {groups.map((g, i) => (
        <div key={g.name} style={{ background: '#f5f5f0', padding: '1rem 1.25rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderRadius: '8px' }}>
          <span style={{ fontWeight: 900, fontSize: '1.2rem', width: '2rem', color: '#1a1a1a' }}>#{i + 1}</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', flex: 1 }}>{g.name}</span>
          <div style={{ flex: 2, height: '6px', background: '#e0e0d8', position: 'relative', overflow: 'hidden', borderRadius: '3px' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(g.avg / maxGroupAvg) * 100}%`, background: '#2d5a27', borderRadius: '3px', transition: 'width 0.5s ease' }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: '1.05rem', width: '60px', textAlign: 'right' }}>{Number(g.avg).toFixed(1)} t</span>
          <span style={{ background: CATEGORY_BG[g.category] || '#f5f5f0', color: CATEGORY_COLORS[g.category] || '#888', padding: '0.2rem 0.65rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '999px' }}>
            {CATEGORY_LABELS[g.category]}
          </span>
          <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{g.count} pers.</span>
        </div>
      ))}
    </div>
  )
}
