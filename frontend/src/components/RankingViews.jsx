import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { AREA_QUESTIONS } from '../utils/answerLabels.js'
import { MAP, calcAlcohol } from '../utils/calculator.js'
import { fmtTons } from '../utils/format.js'

// ── helpers ───────────────────────────────────────────────────────────────────

export function getCategory(tons) {
  if (tons < 4)  return 'bajo'
  if (tons < 7)  return 'medio'
  if (tons < 10) return 'alto'
  return 'muy alto'
}

export function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

export function computeGroups(ranking) {
  const map = {}
  ranking.forEach(r => {
    if (!map[r.group]) map[r.group] = { name: r.group, items: [] }
    map[r.group].items.push(r)
  })
  return Object.values(map).map(g => {
    const avgVal = g.items.reduce((s, r) => s + r.tons, 0) / g.items.length
    const areas = {}
    ;['transport', 'energy', 'food', 'consumption', 'waste'].forEach(area => {
      areas[area] = g.items.reduce((s, r) => s + (r.areas?.[area] || 0), 0) / g.items.length
    })
    areas.publicServices = 1.5
    return { name: g.name, avg: avgVal, count: g.items.length, category: getCategory(avgVal), areas }
  }).sort((a, b) => a.avg - b.avg)
}

function buildHistogram(values, extendForSpain = false, step = 1) {
  if (!values.length) return []
  const counts = {}
  values.forEach(v => {
    const f = Math.floor(v / step) * step
    const key = `${f}–${(f + step)}`
    counts[key] = (counts[key] || 0) + 1
  })
  const minFloor = Math.floor(Math.min(...values) / step) * step
  let maxFloor = Math.floor(Math.max(...values) / step) * step
  if (extendForSpain) maxFloor = Math.max(maxFloor, 7)
  const data = []
  for (let f = minFloor; f <= maxFloor; f = Math.round((f + step) * 100) / 100) {
    const key = `${f}–${Math.round((f + step) * 100) / 100}`
    data.push({ range: key, count: counts[key] || 0, floor: f })
  }
  return data
}

// All bars are dark/neutral — most frequent gets solid black, rest get light gray
function getBarColor(floor, isMostFrequent) {
  if (isMostFrequent) return '#1a1a1a'
  return '#d4d4d4'
}

function getAnswerDistribution(ranking, areaId) {
  const areaData = AREA_QUESTIONS.find(a => a.areaId === areaId)
  if (!areaData) return []

  return areaData.questions
    .filter(q => q.type !== 'stepper')
    .map(q => {
      const counts = {}
      let total = 0

      for (const p of ranking) {
        const raw = p.answers?.[q.id]
        if (q.type === 'single') {
          if (raw !== undefined) {
            const matched = q.options.find(o => o.value === raw)
            if (matched) counts[matched.label] = (counts[matched.label] || 0) + 1
            total++
          }
        } else if (q.type === 'weekDistribution' || q.type === 'dailyCount') {
          const dist = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
          for (const opt of q.options) {
            if ((dist[opt.value] || 0) > 0) {
              counts[opt.label] = (counts[opt.label] || 0) + 1
            }
          }
          total++
        } else {
          const selected = Array.isArray(raw) ? raw : []
          for (const opt of q.options) {
            if (selected.includes(opt.value)) {
              counts[opt.label] = (counts[opt.label] || 0) + 1
            }
          }
          total++
        }
      }

      const isMultiLike = q.type === 'multi' || q.type === 'weekDistribution' || q.type === 'dailyCount'
      const base = isMultiLike ? Math.max(ranking.length, 1) : Math.max(total, 1)
      const distribution = q.options.map(opt => ({
        ...opt,
        count: counts[opt.label] || 0,
        pct: Math.round(((counts[opt.label] || 0) / base) * 100),
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
  { id: 'total',       label: 'rankings.tabs.total',       color: '#1a1a1a' },
  { id: 'transport',   label: 'rankings.tabs.transport',   color: '#38bdf8' },
  { id: 'energy',      label: 'rankings.tabs.energy',      color: '#f59e0b' },
  { id: 'food',        label: 'rankings.tabs.food',        color: '#4ade80' },
  { id: 'consumption', label: 'rankings.tabs.consumption', color: '#a855f7' },
  { id: 'waste',       label: 'rankings.tabs.waste',       color: '#f472b6' },
]

export const SPAIN_AVERAGES = {
  total: 8.1, transport: 2.1, energy: 1.8,
  food: 1.6, consumption: 1.4, waste: 1.2, publicServices: 1.5,
}

export const AREA_COLORS = {
  transport:      '#38bdf8',
  energy:         '#f59e0b',
  food:           '#4ade80',
  consumption:    '#a855f7',
  waste:          '#f472b6',
  publicServices: '#94a3b8',
}

export const AREA_LABELS = {
  transport: 'areas.transport', energy: 'areas.energy', food: 'areas.food',
  consumption: 'areas.consumption', waste: 'areas.waste',
  publicServices: 'areas.publicServices',
}

export const CATEGORY_COLORS = { bajo: '#16a34a', medio: '#555555', alto: '#b07a30', 'muy alto': '#cc4444' }
export const CATEGORY_BG     = { bajo: '#f0fdf4', medio: '#f5f5f5', alto: '#fff7ed', 'muy alto': '#fef2f2' }
export const CATEGORY_LABELS = { bajo: 'rankings.categoryShort.bajo', medio: 'rankings.categoryShort.medio', alto: 'rankings.categoryShort.alto', 'muy alto': 'rankings.categoryShort.muy alto' }

// ── Subcategory definitions ───────────────────────────────────────────────────

const AREA_SUBCATEGORIES = {
  transport: [
    { label: 'subcategories.transport.privateVehicle', keys: ['carKm'] },
    { label: 'subcategories.transport.flights', keys: ['flights'] },
    { label: 'subcategories.transport.publicActive', keys: ['train', 'moto', 'urbanMobility'] },
    { label: 'subcategories.transport.telework', keys: ['telework'], negative: true },
  ],
  energy: [
    { label: 'subcategories.energy.heating', keys: ['heating'] },
    { label: 'subcategories.energy.cooling', keys: ['hasAC'] },
    { label: 'subcategories.energy.extras', keys: ['pool', 'hotelNights', 'hostelNights', 'campingNights', 'airbnbNights', 'secondHome'] },
    { label: 'subcategories.energy.renewable', keys: ['renewable'], negative: true },
    { label: 'subcategories.energy.efficiency', keys: ['homeHabits'], negative: true },
  ],
  food: [
    { label: 'subcategories.food.dailyDiet', keys: ['breakfastDays', 'lunchDays', 'dinnerDays', 'deliveryPerWeek'] },
    { label: 'subcategories.food.drinks', keys: ['hotDrinksCount', 'alcohol', 'bottledWater'] },
    { label: 'subcategories.food.sustainable', keys: ['foodHabits'], negative: true },
  ],
  consumption: [
    { label: 'subcategories.consumption.fashion', keys: ['clothes'] },
    { label: 'subcategories.consumption.tech', keys: ['electronics', 'appliances'] },
    { label: 'subcategories.consumption.lifestyle', keys: ['pets', 'hygiene', 'smoking', 'sports'] },
  ],
  waste: [
    { label: 'subcategories.waste.screens', keys: ['videoCalls', 'streaming', 'socialMedia'] },
    { label: 'subcategories.waste.ai', keys: ['aiUsage'] },
  ],
  publicServices: [
    { label: 'subcategories.publicServices.collective', keys: ['publicServices'] },
  ],
}

// Contribution of a single question key in kgCO2
function getContribution(answers, key) {
  if (!answers) return 0
  switch (key) {
    case 'carKm': {
      if (!answers.carKm || answers.carKm === 'km_e') return 0
      return answers.carType === 'electric'
        ? (MAP.electricCar[answers.carKm] || 0)
        : (MAP.carKm[answers.carKm] || 0)
    }
    case 'flights':      return (answers.flightShort || 0) * 550 + (answers.flightMedium || 0) * 1252 + (answers.flightLong || 0) * 1752
    case 'telework':     return MAP.telework[answers.telework] ?? 0
    case 'train':        return MAP.train[answers.train] || 0
    case 'moto':         return MAP.moto[answers.moto] || 0
    case 'urbanMobility':return MAP.urbanMobility[answers.urbanMobility] || 0
    case 'heating': {
      let kg = 0
      if (answers.homeType === '25a')      kg = MAP.heatingSmall[answers.heating]  ?? MAP.heatingMedium[answers.heating] ?? 0
      else if (answers.homeType === '25b') kg = MAP.heatingMedium[answers.heating] ?? 0
      else                                 kg = MAP.heatingLarge[answers.heating]  ?? MAP.heatingMedium[answers.heating] ?? 0
      return kg
    }
    case 'hasAC':        return answers.hasAC === 'yes' ? 350 : 0
    case 'pool':         return MAP.pool?.[answers.pool] || 0
    case 'renewable':    return answers.renewable === 'yes' ? -300 : 0
    case 'homeHabits': {
      const h = Array.isArray(answers.homeHabits) ? answers.homeHabits : []
      return h.length > 0 ? -(h.length * 50) : 0
    }
    case 'vacationNights':
      return (answers.hotelNights   || 0) * 8
           + (answers.hostelNights  || 0) * 1
           + (answers.campingNights || 0) * 1
           + (answers.airbnbNights  || 0) * 5
           + (answers.secondHome    ? 250 : 0)
    case 'hotelNights':  return (answers.hotelNights || 0) * 30
    case 'hostelNights': return (answers.hostelNights || 0) * 10
    case 'campingNights':return (answers.campingNights || 0) * 5
    case 'airbnbNights': return (answers.airbnbNights || 0) * 20
    case 'secondHome':   return answers.secondHome === 'yes' ? 500 : 0
    case 'breakfastDays':  return Object.entries(answers.breakfastDays || {}).reduce((s, [t, d]) => s + (MAP.breakfastDaily[t] ?? 0) * d * 52, 0)
    case 'hotDrinksCount': return Object.entries(answers.hotDrinksCount || {}).reduce((s, [t, c]) => s + (MAP.hotDrinksDaily[t] ?? 0) * c * 365, 0)
    case 'lunchDays':      return Object.entries(answers.lunchDays || {}).reduce((s, [t, d]) => s + (MAP.mealDaily[t] ?? 0) * d * 52, 0)
    case 'dinnerDays':     return Object.entries(answers.dinnerDays || {}).reduce((s, [t, d]) => s + (MAP.mealDaily[t] ?? 0) * d * 52, 0)
    case 'deliveryPerWeek':return (answers.deliveryPerWeek || 0) * 3 * 52
    case 'alcohol':        return calcAlcohol(answers) || 0
    case 'bottledWater': return MAP.bottledWater[answers.bottledWater] || 0
    case 'foodHabits': {
      const h = Array.isArray(answers.foodHabits) ? answers.foodHabits : []
      return h.length > 0 ? -(h.length * 60) : 0
    }
    case 'clothes':      return MAP.clothes[answers.clothes] || 0
    case 'electronics':  return (Array.isArray(answers.electronics) ? answers.electronics : []).reduce((s, v) => s + (MAP.electronics[v] || 0), 0)
    case 'appliances':   return (Array.isArray(answers.appliances)  ? answers.appliances  : []).reduce((s, v) => s + (MAP.appliances[v]  || 0), 0)
    case 'pets':         return ['bigDog','medDog','smallDog','cat'].filter(p => answers.pets?.includes(p)).reduce((s, p) => s + (MAP.pets[p] || 0), 0)
    case 'hygiene':      return MAP.hygiene[answers.hygiene] || 0
    case 'smoking':      return MAP.smoking[answers.smoking] || 0
    case 'sports':       return Array.isArray(answers.sports)
      ? answers.sports.filter(s => s !== 'none').reduce((sum, s) => sum + (MAP.sports[s] || 0), 0)
      : 0
    case 'videoCalls':   return MAP.videoCalls[answers.videoCalls] || 0
    case 'streaming':    return MAP.streaming[answers.streaming] || 0
    case 'socialMedia':  return MAP.socialMedia[answers.socialMedia] || 0
    case 'aiUsage':        return MAP.aiUsage[answers.aiUsage] || 0
    case 'publicServices': return 1500
    default:               return 0
  }
}

function getQuestionAvgKg(ranking, questionId) {
  const vals = ranking
    .filter(r => r.answers && Object.keys(r.answers).length > 0)
    .map(r => getContribution(r.answers, questionId))
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

function getSubcatAvg(ranking, keys) {
  const vals = ranking
    .filter(r => r.answers && Object.keys(r.answers).length > 0)
    .map(r => keys.reduce((sum, key) => sum + getContribution(r.answers, key), 0))
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

const SUBCAT_PALETTES = {
  transport:   ['#0369a1', '#38bdf8', '#bae6fd'],
  energy:      ['#b45309', '#f59e0b', '#fde68a'],
  food:        ['#16a34a', '#4ade80', '#bbf7d0'],
  consumption: ['#7e22ce', '#a855f7', '#d8b4fe'],
  waste:       ['#be185d', '#f472b6', '#fbcfe8'],
}

function AnswerDistribution({ ranking, activeTab, tab }) {
  const { t } = useTranslation()
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries((AREA_SUBCATEGORIES[activeTab] || []).map((s, i) => [i, false]))
  )
  const allDist = getAnswerDistribution(ranking, activeTab)
  const subcats = AREA_SUBCATEGORIES[activeTab] || []

  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '1rem' }}>
        {t('rankings.answerDistTitle')}
      </div>
      {subcats.map((sub, si) => {
        const subDist = allDist.filter(d => sub.keys.includes(d.question.id))
        if (!subDist.length) return null
        const isOpen = openSections[si] !== false
        return (
          <div key={si} style={{ marginBottom: '0.75rem', border: '1px solid #f0f0ee', borderRadius: 12, overflow: 'hidden' }}>
            <button
              onClick={() => setOpenSections(prev => ({ ...prev, [si]: !isOpen }))}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1.25rem', background: isOpen ? '#fafafa' : '#fff',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: isOpen ? '1px solid #f0f0ee' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: sub.negative ? '#3b6d11' : (SUBCAT_PALETTES[activeTab]?.[si] ?? tab.color), flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01rem' }}>{t(sub.label)}</span>
                <span style={{ fontSize: '0.72rem', color: '#bbb' }}>{t('rankings.questionsCount', { count: subDist.length })}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#bbb', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {isOpen && (
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {subDist.map(({ question, distribution, total: qTotal, maxCount }) => (
                  <div key={question.id}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#333', lineHeight: 1.4 }}>
                        {t(question.text)}
                      </div>
                      {(() => {
                        const avgKg = getQuestionAvgKg(ranking, question.id)
                        if (avgKg === 0) return null
                        const isNegative = avgKg < 0
                        return (
                          <div style={{
                            flexShrink: 0,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: isNegative ? '#16a34a' : '#aaa',
                            opacity: 0.85,
                          }}>
                            {t('rankings.kgAvg', { sign: isNegative ? '↓' : '+', kg: Math.abs(Math.round(avgKg)) })}
                          </div>
                        )
                      })()}
                    </div>
                    {question.type === 'multi' && (
                      <div style={{ fontSize: '0.68rem', color: '#bbb', marginBottom: '0.65rem' }}>
                        {t('rankings.multiSelectNote', { count: ranking.length })}
                      </div>
                    )}
                    {question.type !== 'multi' && <div style={{ marginBottom: '0.65rem' }} />}
                    {distribution.map(opt => {
                      const isMost = opt.count > 0 && opt.count === maxCount
                      const barColor = sub.negative ? '#3b6d11' : (SUBCAT_PALETTES[activeTab]?.[si] ?? tab.color)
                      return (
                        <div key={opt.value} style={{ marginBottom: '0.6rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: isMost ? 700 : 400, color: isMost ? '#1a1a1a' : '#777' }}>
                              {t(opt.label)}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: isMost ? 700 : 400, color: isMost ? barColor : '#aaa' }}>
                              {opt.pct}%
                            </span>
                          </div>
                          <div style={{ height: 6, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${opt.pct}%`, background: isMost ? barColor : `${barColor}66`, borderRadius: 3, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ fontSize: '0.68rem', color: '#bbb', marginTop: '0.4rem' }}>
                      {t('rankings.answered', { answered: qTotal, total: ranking.length })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── DistributionView ──────────────────────────────────────────────────────────

export function DistributionView({ ranking }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('total')

  const tab = HISTOGRAM_TABS.find(tb => tb.id === activeTab)

  const values = ranking
    .map(r => activeTab === 'total' ? r.tons : (r.areas?.[activeTab] ?? 0))
    .filter(v => v > 0)
    .sort((a, b) => a - b)

  const histStep = activeTab === 'total' ? 1 : 0.5
  const histData = buildHistogram(values, activeTab === 'total', histStep)
  const spainAvg = SPAIN_AVERAGES[activeTab]
  const spainBucket = `${Math.floor(spainAvg)}–${Math.floor(spainAvg) + 1}`

  const meanVal      = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
  const minVal       = values[0] ?? 0
  const maxVal       = values[values.length - 1] ?? 0
  const mostFrequent = values.length ? getMostFrequent(values) : '–'

  const meanBucket = `${Math.floor(meanVal / histStep) * histStep}–${Math.round((Math.floor(meanVal / histStep) * histStep + histStep) * 100) / 100}`
  const minBucket  = `${Math.floor(minVal  / histStep) * histStep}–${Math.round((Math.floor(minVal  / histStep) * histStep + histStep) * 100) / 100}`
  const maxBucket  = `${Math.floor(maxVal  / histStep) * histStep}–${Math.round((Math.floor(maxVal  / histStep) * histStep + histStep) * 100) / 100}`

  const areaAvg = {
    transport:      avg(ranking.map(r => r.areas?.transport      ?? 0)),
    energy:         avg(ranking.map(r => r.areas?.energy         ?? 0)),
    food:           avg(ranking.map(r => r.areas?.food           ?? 0)),
    consumption:    avg(ranking.map(r => r.areas?.consumption    ?? 0)),
    waste:          avg(ranking.map(r => r.areas?.waste          ?? 0)),
    publicServices: avg(ranking.map(r => r.areas?.publicServices > 0 ? r.areas.publicServices : 1.5)),
  }
  const areaTotal = Object.values(areaAvg).reduce((s, v) => s + v, 0)

  if (ranking.length === 0) return (
    <div style={{ color: '#bbb', padding: '4rem 2rem', textAlign: 'center', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {t('rankings.noResults')}
    </div>
  )

  return (
    <div>
      {ranking.length < 3 && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '0.65rem 1rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#666' }}>
          {t('rankings.fewDataWarning')}
        </div>
      )}

      {/* Histogram card */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {HISTOGRAM_TABS.map(tb => (
            <button key={tb.id} onClick={() => setActiveTab(tb.id)} style={{
              padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
              border: `1.5px solid ${activeTab === tb.id ? tb.color : '#e5e5e5'}`,
              background: activeTab === tb.id ? tb.color : '#ffffff',
              color: activeTab === tb.id ? (tb.id === 'total' ? '#fff' : '#0a0a0a') : '#666',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}>
              {t(tb.label)}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={histData} margin={{ top: 32, right: 24, left: -8, bottom: 8 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="range" tick={{ fontSize: 14, fill: '#888' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 'auto']} minTickGap={6} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <strong>{d.range} t</strong> — {t('rankings.tooltip', { count: d.count })}
                </div>
              )
            }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histData.map((entry, i) => {
                const isMF = entry.range === mostFrequent && entry.count > 0
                return (
                  <Cell
                    key={i}
                    fill={entry.range === mostFrequent ? (activeTab === 'total' ? '#1a1a1a' : tab.color) : getBarColor(entry.floor)}
                    stroke={entry.range === mostFrequent ? (activeTab === 'total' ? '#1a1a1a' : tab.color) : 'transparent'}
                    strokeWidth={2}
                  />
                )
              })}
            </Bar>
            {/* Spain average reference line */}
            <ReferenceLine
              x={spainBucket}
              stroke="#000000"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: t('rankings.refSpain', { value: spainAvg }), position: 'top', fontSize: 13, fill: '#555' }}
            />
            {values.length > 0 && (
              <ReferenceLine x={meanBucket} stroke={tab.color} strokeWidth={2.5} strokeDasharray="5 3"
                label={{ value: t('rankings.refMean'), fill: tab.color, fontSize: 14, fontWeight: 700, position: 'top' }} />
            )}
            {values.length > 0 && minBucket !== meanBucket && (
              <ReferenceLine x={minBucket} stroke="#3b6d11" strokeWidth={1} strokeDasharray="3 3"
                label={{ value: t('rankings.refMin', { value: fmtTons(minVal) }), fill: '#3b6d11', fontSize: 13, position: 'top' }} />
            )}
            {values.length > 0 && maxBucket !== meanBucket && maxBucket !== minBucket && (
              <ReferenceLine x={maxBucket} stroke="#cc4444" strokeWidth={1} strokeDasharray="3 3"
                label={{ value: t('rankings.refMax', { value: fmtTons(maxVal) }), fill: '#cc4444', fontSize: 13, position: 'top' }} />
            )}
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.82rem', color: '#666', alignItems: 'center' }}>
          {[
            { label: t('rankings.legend.mean'),  line: `2px dashed ${tab.color}`, box: null,   border: null },
            { label: t('rankings.legend.min'),   line: '2px dashed #3b6d11',  box: null,      border: null },
            { label: t('rankings.legend.max'),   line: '2px dashed #cc4444',  box: null,      border: null },
            { label: t('rankings.legend.spain'), line: '2px dashed #000',     box: null,      border: null },
            { label: t('rankings.legend.mostFrequent'), line: null, box: '#fff',     border: `2px solid ${activeTab === 'total' ? '#1a1a1a' : tab.color}` },
          ].map(({ label, line, box, border }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {line
                ? <div style={{ width: 28, borderTop: line }} />
                : <div style={{ width: 12, height: 12, background: box, border, borderRadius: 2 }} />
              }
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      {(() => {
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {[
              {
                label: t('rankings.stats.mean'),
                value: values.length ? `${fmtTons(meanVal)} t` : '–',
                bg: activeTab === 'total' ? '#1a1a1a' : tab.color,
                color: '#ffffff',
                border: activeTab === 'total' ? '#1a1a1a' : tab.color,
                labelColor: 'rgba(255,255,255,0.6)',
              },
              {
                label: t('rankings.stats.min'),
                value: values.length ? `${fmtTons(minVal)} t` : '–',
                bg: '#ffffff', color: '#2d5a27', border: '#3b6d11',
                labelColor: '#3b6d11',
              },
              {
                label: t('rankings.stats.max'),
                value: values.length ? `${fmtTons(maxVal)} t` : '–',
                bg: '#ffffff', color: '#cc4444', border: '#cc4444',
                labelColor: '#cc4444',
              },
              {
                label: t('rankings.stats.mostFrequent'),
                value: mostFrequent !== '–' ? `${mostFrequent} t` : '–',
                bg: activeTab === 'total' ? '#f0f0ee' : `${tab.color}18`,
                color: activeTab === 'total' ? '#1a1a1a' : tab.color,
                border: activeTab === 'total' ? '#1a1a1a' : tab.color,
                labelColor: activeTab === 'total' ? '#555' : tab.color,
              },
              {
                label: t('rankings.stats.total'),
                value: values.length ? `${fmtTons(values.reduce((s, v) => s + v, 0))} t` : '–',
                bg: '#ffffff', color: '#444', border: '#e0e0d8',
                labelColor: '#aaa',
              },
            ].map(({ label, value, bg, color, border, labelColor }) => (
              <div key={label} style={{
                background: bg,
                border: `2px solid ${border}`,
                borderRadius: 14,
                padding: '1.25rem 1rem',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 900, fontSize: '1.8rem', color, lineHeight: 1, marginBottom: '0.45rem' }}>{value}</div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: labelColor, fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Area breakdown */}
      {areaTotal > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem' }}>
          {activeTab === 'total' ? (
            <>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#000', marginBottom: '1rem' }}>
                {t('rankings.avgByCategory')}
              </div>
              {/* Stacked bar */}
              <div style={{ display: 'flex', height: 44, borderRadius: '12px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                {Object.entries(AREA_COLORS).map(([key, color]) => {
                  const w = areaAvg[key] / areaTotal * 100
                  return w > 0 ? (
                    <div key={key} title={`${t(AREA_LABELS[key])}: ${fmtTons(areaAvg[key])} t`}
                      style={{ width: `${w}%`, background: color, transition: 'width 0.5s ease' }} />
                  ) : null
                })}
              </div>
              {/* Legend row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem 1.25rem' }}>
                {Object.entries(AREA_COLORS).map(([key, color]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ color: '#555' }}>{t(AREA_LABELS[key])}</span>
                    <span style={{ fontWeight: 700, color: '#000' }}>
                      {areaTotal > 0 ? Math.round((areaAvg[key] / areaTotal) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (() => {
              const subcats = AREA_SUBCATEGORIES[activeTab] || []
              const subcatData = subcats.map(sub => ({
                label: t(sub.label),
                kg: Math.max(0, getSubcatAvg(ranking, sub.keys)),
                negative: sub.negative,
              }))
              const totalKg = subcatData.reduce((s, d) => s + d.kg, 0)

              return (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#aaa', marginBottom: '0.85rem' }}>
                    {t('rankings.subcatDist')}
                  </div>

                  {/* Stacked bar */}
                  <div style={{ display: 'flex', height: 44, borderRadius: 8, overflow: 'hidden', marginBottom: '1rem' }}>
                    {subcatData.map((sub, i) => {
                      const pct = totalKg > 0 ? (sub.kg / totalKg) * 100 : 0
                      if (pct < 0.5) return null
                      const color = sub.negative ? '#3b6d11' : (SUBCAT_PALETTES[activeTab]?.[i] ?? tab.color)
                      return (
                        <div key={i}
                          title={`${sub.label}: ${pct.toFixed(0)}%`}
                          style={{ width: `${pct}%`, background: color, transition: 'width 0.5s ease' }}
                        />
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {subcatData.map((sub, i) => {
                      const pct = totalKg > 0 ? Math.round((sub.kg / totalKg) * 100) : 0
                      const color = sub.negative ? '#3b6d11' : (SUBCAT_PALETTES[activeTab]?.[i] ?? tab.color)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#666' }}>
                          <div style={{ width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
                          <span>{sub.label}</span>
                          <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}
        </div>
      )}

      {/* Answer distribution */}
      {activeTab !== 'total' && (
        <AnswerDistribution ranking={ranking} activeTab={activeTab} tab={tab} />
      )}
    </div>
  )
}

// ── GroupsView ────────────────────────────────────────────────────────────────

const AREA_ORDER = ['transport', 'energy', 'food', 'consumption', 'waste', 'publicServices']
const CATEGORY_LABEL_F = { bajo: 'rankings.categoryFem.bajo', medio: 'rankings.categoryFem.medio', alto: 'rankings.categoryFem.alto', 'muy alto': 'rankings.categoryFem.muy alto' }
const AREA_LABEL_SHORT = {
  transport:      'areas.transport',
  energy:         'areas.energy',
  food:           'areas.food',
  consumption:    'areas.consumption',
  waste:          'areas.waste',
  publicServices: 'rankings.areaShortPublic',
}

export function GroupsView({ groups }) {
  const { t } = useTranslation()
  if (groups.length === 0) return (
    <div style={{ textAlign: 'center', color: '#bbb', padding: '4rem 2rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {t('rankings.noGroups')}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {groups.map((g, i) => {
        const areaTotal = AREA_ORDER.reduce((s, a) => s + (g.areas?.[a] || 0), 0)
        const hasAreas  = areaTotal > 0

        return (
          <div key={g.name} style={{
            background: '#fff',
            border: '1px solid #e8e8e4',
            borderRadius: 16,
            padding: '1.25rem 1.5rem',
          }}>
            {/* Top row: rank + name + badge + tons + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: hasAreas ? '1.1rem' : 0 }}>
              <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1a1a1a', minWidth: 36 }}>#{i + 1}</span>
              <span style={{ fontWeight: 800, fontSize: '1.35rem', flex: 1, color: '#1a1a1a' }}>{g.name}</span>
              <span style={{
                background: CATEGORY_BG[g.category]    || '#f5f5f0',
                color:      CATEGORY_COLORS[g.category] || '#888',
                border:     `1px solid ${CATEGORY_COLORS[g.category] || '#ccc'}`,
                padding: '0.3rem 0.85rem',
                fontSize: '0.78rem', fontWeight: 700,
                letterSpacing: '0.04em',
                borderRadius: 999,
              }}>
                {g.category === 'bajo' ? '🌿' : g.category === 'medio' ? '🌱' : '🔥'} {t('rankings.footprintFem', { cat: t(CATEGORY_LABEL_F[g.category]) })}
              </span>
              <span style={{ fontWeight: 900, fontSize: '1.5rem', color: '#1a1a1a' }}>{fmtTons(g.avg)}t</span>
              <span style={{ fontSize: '0.85rem', color: '#bbb', minWidth: 48 }}>{t('rankings.persons', { count: g.count })}</span>
            </div>

            {/* Stacked bar */}
            {hasAreas && (
              <>
                <div style={{ display: 'flex', height: 36, borderRadius: 999, overflow: 'hidden', marginBottom: '0.75rem' }}>
                  {AREA_ORDER.map(area => {
                    const pct = areaTotal > 0 ? (g.areas[area] / areaTotal) * 100 : 0
                    if (pct < 0.5) return null
                    return (
                      <div key={area} style={{
                        width: `${pct}%`,
                        background: AREA_COLORS[area],
                        transition: 'width 0.5s ease',
                      }} />
                    )
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {AREA_ORDER.map(area => {
                    const pct = areaTotal > 0 ? Math.round((g.areas[area] / areaTotal) * 100) : 0
                    if (!pct) return null
                    return (
                      <div key={area} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#555' }}>
                        <div style={{ width: 11, height: 11, borderRadius: 3, background: AREA_COLORS[area], flexShrink: 0 }} />
                        <span>{t(AREA_LABEL_SHORT[area])}</span>
                        <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}