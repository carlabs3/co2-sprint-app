import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import api from '../../utils/api.js'
import { socket } from '../../utils/socket.js'

// ── helpers ───────────────────────────────────────────────────────────────────

function getCategory(tons) {
  if (tons < 2) return 'bajo'
  if (tons < 4) return 'medio'
  if (tons < 6) return 'alto'
  return 'muy alto'
}

function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

function computeGroups(individual) {
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

const HISTOGRAM_TABS = [
  { id: 'total',       label: 'Total',          color: '#2d5a27' },
  { id: 'transport',   label: '🚗 Transporte',   color: '#4a90d9' },
  { id: 'energy',      label: '⚡ Energía',       color: '#e8a020' },
  { id: 'food',        label: '🥗 Alimentación', color: '#5aab5a' },
  { id: 'consumption', label: '🛍 Consumo',       color: '#b07a30' },
  { id: 'waste',       label: '♻️ Residuos',     color: '#7a7aaa' },
]

const SPAIN_AVERAGES = {
  total: 7.2, transport: 1.8, energy: 1.6,
  food: 1.4, consumption: 1.2, waste: 0.8,
}

const AREA_COLORS = {
  transport: '#4a90d9', energy: '#e8a020', food: '#5aab5a',
  consumption: '#b07a30', waste: '#7a7aaa',
}

const AREA_LABELS = {
  transport: 'Transporte', energy: 'Energía', food: 'Alimentación',
  consumption: 'Consumo', waste: 'Residuos',
}

const CATEGORY_COLORS = { bajo: '#3b6d11', medio: '#2d5a27', alto: '#b07a30', 'muy alto': '#cc4444' }
const CATEGORY_BG     = { bajo: '#eaf3de', medio: '#eaf3de', alto: '#fff0e0', 'muy alto': '#fce8e8' }
const CATEGORY_LABELS = { bajo: 'BAJO', medio: 'MEDIO', alto: 'ALTO', 'muy alto': 'MUY ALTO' }

// ── DistributionView ──────────────────────────────────────────────────────────

function DistributionView({ ranking }) {
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
      Aún no hay resultados. Los participantes aparecerán aquí cuando completen la calculadora.
    </div>
  )

  return (
    <div>
      {ranking.length < 3 && (
        <div style={{ background: '#fff8e8', border: '1px solid #f5e0a0', borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#b07a30' }}>
          Con pocos datos la distribución puede no ser representativa. Espera a más participantes.
        </div>
      )}

      {/* ── Section 1: Histogram ── */}
      <div style={{ background: '#fff', border: '1px solid #f0f0ee', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' }}>

        {/* Area tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {HISTOGRAM_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
                border: `1.5px solid ${activeTab === t.id ? t.color : '#e0e0d8'}`,
                background: activeTab === t.id ? t.color : 'transparent',
                color: activeTab === t.id ? '#fff' : '#666',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={histData} margin={{ top: 24, right: 16, left: -20, bottom: 4 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#f0f0ee" />
            <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div style={{ background: '#fff', border: '1px solid #e0e0d8', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: 12 }}>
                    <strong>{d.range} t</strong> — {d.count} participante{d.count !== 1 ? 's' : ''}
                  </div>
                )
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={getBarColor(entry.floor)}
                  stroke={entry.range === mostFrequent ? '#e8a020' : 'transparent'}
                  strokeWidth={2}
                />
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

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f5f5f0' }}>
          {[
            { line: `2px dashed ${tab.color}`, label: `Mediana grupo` },
            { line: '1px dashed #3b6d11', label: 'Mínimo' },
            { line: '1px dashed #cc4444', label: 'Máximo' },
            { line: '1.5px dashed #888', label: 'Media España' },
            { box: '#fff', border: '2px solid #e8a020', label: 'Más frecuente' },
          ].map(({ line, box, border, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#888' }}>
              {line ? (
                <div style={{ width: 20, borderTop: line }} />
              ) : (
                <div style={{ width: 12, height: 12, background: box, border, borderRadius: 2 }} />
              )}
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Stats ── */}
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

      {/* ── Section 3: Area breakdown ── */}
      {areaTotal > 0 && (
        <div style={{ background: '#fff', border: '1px solid #f0f0ee', borderRadius: 12, padding: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '1rem' }}>
            Media del grupo por áreas
          </div>

          {/* Stacked bar */}
          <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', marginBottom: '0.75rem' }}>
            {Object.entries(AREA_COLORS).map(([key, color]) => {
              const w = areaAvg[key] / areaTotal * 100
              return w > 0 ? (
                <div key={key} title={`${AREA_LABELS[key]}: ${areaAvg[key].toFixed(2)} t`}
                  style={{ width: `${w}%`, background: color, transition: 'width 0.5s ease' }} />
              ) : null
            })}
          </div>

          {/* Legend */}
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
    </div>
  )
}

// ── GroupsView ────────────────────────────────────────────────────────────────

function GroupsView({ groups }) {
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

// ── Step2Rankings ─────────────────────────────────────────────────────────────

export default function Step2Rankings() {
  const { code } = useParams()
  const navigate = useNavigate()

  const [view, setView]               = useState('individual')
  const [ranking, setRanking]         = useState([])
  const [groups, setGroups]           = useState([])
  const [totalJoined, setTotalJoined] = useState(0)
  const [showRanking, setShowRanking] = useState(false)
  const [revealed, setRevealed]       = useState(false)

  const joinUrl = `${window.location.origin}/join?code=${code}`

  useEffect(() => {
    api.get(`/api/results/${code}/ranking`)
      .then(res => {
        const items = res.data.map(r => ({
          name: 'Anónimo',
          group: r.group,
          tons: r.carbonTons,
          category: r.category,
          areas: r.areas || {},
        }))
        setRanking(items)
        setGroups(computeGroups(items))
        setTotalJoined(prev => Math.max(prev, items.length))
      })
      .catch(() => {})

    socket.emit('facilitator:join', { code })

    socket.on('ranking:update', data => {
      if (data.individual) {
        const sorted = [...data.individual].sort((a, b) => a.tons - b.tons)
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

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const sidebar = (
    <div style={{ width: '300px', flexShrink: 0, borderRight: '1px solid #e0e0d8', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ padding: '14px', background: '#fff', border: '1px solid #e0e0d8', borderRadius: '8px' }}>
        <QRCodeSVG value={joinUrl} size={196} fgColor="#2d5a27" bgColor="#ffffff" level="M" />
      </div>
      <div style={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: '0.1em', color: '#2d5a27' }}>{code}</div>
      <div style={{ fontSize: '0.68rem', color: '#bbb', textAlign: 'center', letterSpacing: '0.04em', wordBreak: 'break-all' }}>{joinUrl}</div>

      <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

      <div style={{ background: '#f5f5f0', padding: '1rem 1.5rem', textAlign: 'center', width: '100%', borderRadius: '8px' }}>
        <div style={{ fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, color: '#1a1a1a' }}>{total === 0 ? '0/0' : `${completed}/${total}`}</div>
        <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.3rem' }}>Completados</div>
      </div>
      <div style={{ width: '100%', height: 6, background: '#e0e0d8', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: completed > 0 && completed >= total ? '#2d5a27' : '#7db87a', borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ width: '100%', borderTop: '1px solid #e0e0d8' }} />

      <button
        onClick={revealed ? undefined : handleReveal}
        disabled={revealed}
        style={{ width: '100%', background: revealed ? '#eaf3de' : '#2d5a27', color: revealed ? '#2d5a27' : '#fff', border: revealed ? '1px solid #c8e6c0' : 'none', padding: '0.85rem', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', cursor: revealed ? 'default' : 'pointer' }}
      >
        {revealed ? '✓ Resultados revelados' : 'Revelar resultados'}
      </button>
      {!revealed && (
        <div style={{ fontSize: '0.68rem', color: '#bbb', textAlign: 'center', letterSpacing: '0.03em', lineHeight: 1.5 }}>
          Los participantes verán su huella al pulsar
        </div>
      )}

      <button onClick={handleClose} style={{ width: '100%', background: 'transparent', color: '#cc4444', border: '1px solid #e0e0d8', padding: '0.75rem', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '4px', marginTop: 'auto', cursor: 'pointer' }}>
        Cerrar sesión
      </button>
    </div>
  )

  // ── Phase 1: waiting ─────────────────────────────────────────────────────────
  if (!showRanking) return (
    <div style={{ flex: 1, display: 'flex', background: '#ffffff', minHeight: 'calc(100vh - 52px)' }}>
      {sidebar}
      <div style={{ flex: 1, padding: '2.5rem', overflow: 'auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 4rem)', lineHeight: 1, color: '#1a1a1a' }}>
            {total === 0 ? '–' : `${completed} / ${total}`}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '0.4rem' }}>
            {total === 0 ? 'Esperando participantes...' : 'han completado la calculadora'}
          </div>
          {total > 0 && (
            <div style={{ marginTop: '1.25rem', height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden', maxWidth: 480 }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: completed >= total ? '#2d5a27' : '#7db87a', borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          )}
        </div>

        {ranking.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '0.75rem' }}>Completados</div>
            {ranking.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #f5f5f0', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.name || 'Anónimo'}</div>
                  <div style={{ fontSize: '0.72rem', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{p.group}</div>
                </div>
                <span style={{ background: CATEGORY_BG[p.category] || '#f5f5f0', color: CATEGORY_COLORS[p.category] || '#888', padding: '0.2rem 0.65rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: '999px' }}>
                  {CATEGORY_LABELS[p.category]}
                </span>
                <span style={{ fontWeight: 900, fontSize: '1.05rem' }}>{Number(p.tons).toFixed(1)} t</span>
              </div>
            ))}
          </div>
        )}

        {ranking.length === 0 && (
          <div style={{ textAlign: 'center', color: '#bbb', padding: '4rem 2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Esperando que los participantes completen la calculadora...
          </div>
        )}
      </div>
    </div>
  )

  // ── Phase 2: ranking revealed ─────────────────────────────────────────────────
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
