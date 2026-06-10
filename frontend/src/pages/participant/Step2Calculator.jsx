import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../../utils/socket.js'
import { useSession } from '../../context/SessionContext.jsx'
import SessionClosedBanner from '../../components/SessionClosedBanner.jsx'
import { AREA_QUESTIONS } from '../../utils/answerLabels.js'
import { calculator } from '../../utils/calculator.js'

const AREA_VISUAL = {
  transport:   { color: '#4a90d9', bg: '#e8f2fd', iconBg: '#d0e8f8' },
  energy:      { color: '#e8a020', bg: '#fff8ec', iconBg: '#fff3d6' },
  food:        { color: '#5aab5a', bg: '#f0f7ee', iconBg: '#e0f0dc' },
  consumption: { color: '#b07a30', bg: '#fdf4e8', iconBg: '#f5e6cc' },
  waste:       { color: '#7a7aaa', bg: '#f0f0f8', iconBg: '#e0e0f0' },
}

const AREAS = AREA_QUESTIONS.map(a => ({
  id: a.areaId,
  label: a.areaLabel,
  emoji: a.areaEmoji,
  questions: a.questions,
  ...AREA_VISUAL[a.areaId],
}))

function DotsLoader() {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: '50%', background: '#c8e6c0',
          animation: `calcdot 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes calcdot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

const homeTypeLabels = {
  '25a': 'piso pequeño (~45 m²)',
  '25b': 'piso mediano (~120 m²)',
  '25c': 'casa grande (más de 180 m²)',
}

function NightsInput({ question, answers, onChange }) {
  const handleChange = (value, delta) => {
    const current = answers[value] || 0
    const newVal = Math.max(0, current + delta)
    onChange({ ...answers, [value]: newVal })
  }

  const totalNights = question.options.reduce((sum, opt) => sum + (answers[opt.value] || 0), 0)

  return (
    <div>
      {question.options.map(opt => (
        <div key={opt.value} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', borderRadius: '10px', marginBottom: '6px',
          border: `1.5px solid ${(answers[opt.value] || 0) > 0 ? 'var(--area-color)' : '#ebebeb'}`,
          background: (answers[opt.value] || 0) > 0 ? 'var(--area-bg)' : '#fafafa',
        }}>
          <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{opt.emoji}</span>
          <span style={{ flex: 1, fontSize: '12px', fontWeight: 500, color: '#1a1a1a' }}>{opt.label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => handleChange(opt.value, -1)}
              style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--area-color)', background: 'transparent', color: 'var(--area-color)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontSize: '15px', fontWeight: 700, width: '24px', textAlign: 'center' }}>
              {answers[opt.value] || 0}
            </span>
            <button onClick={() => handleChange(opt.value, 1)}
              style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--area-color)', background: 'transparent', color: 'var(--area-color)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
          <span style={{ fontSize: '10px', color: '#aaa', width: '32px' }}>noches</span>
        </div>
      ))}
      {totalNights > 0 && (
        <div style={{ background: '#f5f5f0', borderRadius: '8px', padding: '8px 12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>Total noches</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{totalNights} noches</span>
        </div>
      )}
    </div>
  )
}

function OptionList({ question, area, answers, onSelect, onToggle, compact }) {
  const useGrid = compact && question.options.length >= 4

  if (question.type === 'multi') {
    const selected = Array.isArray(answers[question.id]) ? answers[question.id] : []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: useGrid ? 'grid' : 'flex', gridTemplateColumns: useGrid ? '1fr 1fr' : undefined, flexDirection: useGrid ? undefined : 'column', gap: compact ? 5 : 9 }}>
          {question.options.map(opt => {
            const isSel = selected.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => onToggle(question.id, opt.value)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: useGrid ? 'flex-start' : 'center', gap: useGrid ? 0 : 12,
                  padding: useGrid ? '12px 10px 12px 10px' : compact ? '8px 12px' : '12px 16px',
                  minHeight: useGrid ? 56 : undefined,
                  borderRadius: useGrid ? 12 : 10, width: '100%', textAlign: 'left',
                  border: `1.5px solid ${isSel ? area.color : '#e0e0e0'}`,
                  background: isSel ? area.bg : '#fafafa', cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {!useGrid && (
                  <div style={{
                    width: compact ? 16 : 18, height: compact ? 16 : 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${isSel ? area.color : '#ccc'}`,
                    background: isSel ? area.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                )}
                {useGrid && isSel && (
                  <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 3, background: area.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#fff', fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>
                  </div>
                )}
                <span style={{ fontSize: compact ? 12 : 13, fontWeight: isSel ? 600 : 400, color: isSel ? '#1a1a1a' : '#555', lineHeight: 1.3 }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, color: '#bbb', margin: '2px 0 0', fontStyle: 'italic' }}>
          {selected.length === 0 ? 'Si no aplica ninguna, continúa sin marcar.' : `${selected.length} seleccionado${selected.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    )
  }

  const currentAnswer = answers[question.id]
  // Desktop: 2 cols for 4+ options; mobile: 2 cols (grid) for 4+ options without radio indicator
  const cols = useGrid ? 2 : (!compact && question.options.length >= 4 ? 2 : 1)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: compact ? 5 : 9 }}>
      {question.options.map(opt => {
        const isSel = currentAnswer === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(question.id, opt.value)}
            style={{
              display: 'flex', alignItems: useGrid ? 'center' : 'center', justifyContent: useGrid ? 'center' : undefined, gap: useGrid ? 0 : 12,
              padding: useGrid ? '14px 10px' : compact ? '8px 12px' : '12px 16px',
              minHeight: useGrid ? 56 : undefined,
              borderRadius: useGrid ? 12 : 10, width: '100%', textAlign: useGrid ? 'center' : 'left',
              border: `1.5px solid ${isSel ? area.color : '#e0e0e0'}`,
              background: isSel ? area.bg : '#fafafa', cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {!useGrid && (
              <div style={{
                width: compact ? 16 : 18, height: compact ? 16 : 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${isSel ? area.color : '#ccc'}`,
                background: isSel ? area.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSel && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
            )}
            <span style={{ fontSize: compact ? 12 : 13, fontWeight: isSel ? 700 : 400, color: isSel ? area.color : '#555', lineHeight: 1.3 }}>
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function Step2Calculator() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { participantGroup, participantName } = useSession()

  const [areaIndex, setAreaIndex]         = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers]             = useState({})
  const [submitted, setSubmitted]         = useState(false)
  const [isMobile, setIsMobile]           = useState(() => window.innerWidth <= 768)
  const submittedResultRef                = useRef(null)
  const STORAGE_KEY                       = `co2sprint_progress_${code}`

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Restore progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const { answers: a, areaIndex: ai, questionIndex: qi } = JSON.parse(saved)
      setAnswers(a || {})
      setAreaIndex(ai || 0)
      setQuestionIndex(qi || 0)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save progress on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, areaIndex, questionIndex }))
  }, [answers, areaIndex, questionIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    socket.on('results:revealed', () => {
      const result = submittedResultRef.current
      if (result) navigate(`/session/${code}/results`, { state: result })
    })
    return () => socket.off('results:revealed')
  }, [code, navigate])

  function isSkipped(q) {
    return q.id === 'electricCar' && answers.car === '1e'
  }

  const area     = AREAS[areaIndex]
  const question = area.questions[questionIndex]
  const isFirst  = areaIndex === 0 && questionIndex === 0
  const isLast   = areaIndex === AREAS.length - 1 && questionIndex === area.questions.length - 1
  const canNext  = isSkipped(question) || question.type === 'multi' || question.type === 'nights' || question.isSensibilization || answers[question.id] !== undefined

  function isAreaDone(ai) {
    return AREAS[ai].questions.every(q => isSkipped(q) || q.type === 'multi' || q.type === 'nights' || q.isSensibilization || answers[q.id] !== undefined)
  }

  function getAreaStatus(ai) {
    if (isAreaDone(ai)) return 'done'
    if (ai === areaIndex) return 'active'
    return 'inactive'
  }

  function handleSelect(questionId, value) {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    // Auto-advance for all single questions (including last → auto-submits)
    // Pass newAnswers directly so the timeout doesn't use stale state
    if (question.type === 'single') {
      setTimeout(() => handleNext(newAnswers), 300)
    }
  }

  function handleToggle(questionId, value) {
    const q = AREAS.flatMap(a => a.questions).find(q => q.id === questionId)
    const noneVal = q?.noneValue
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : []
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter(v => v !== value) }
      }
      if (noneVal && value === noneVal) {
        return { ...prev, [questionId]: [noneVal] }
      }
      if (noneVal) {
        return { ...prev, [questionId]: [...current.filter(v => v !== noneVal), value] }
      }
      return { ...prev, [questionId]: [...current, value] }
    })
  }

  // overrideAnswers: passed from handleSelect to avoid stale closure on the answers state
  function handleNext(overrideAnswers = null) {
    const currentAnswers = overrideAnswers ?? answers
    // Recompute canNext with the actual answers (avoids stale state in timeouts)
    const currentCanNext = isSkipped(question) || question.type === 'multi' || question.type === 'nights' || question.isSensibilization || currentAnswers[question.id] !== undefined
    if (!currentCanNext) return
    if (isLast) {
      const calcResult = calculator(currentAnswers)
      const state = { ...calcResult, answers: currentAnswers }
      submittedResultRef.current = state
      localStorage.removeItem(STORAGE_KEY)
      socket.emit('footprint:submit', {
        sessionCode: code,
        group: participantGroup,
        name: participantName,
        carbonTons: calcResult.carbonTons,
        areas: calcResult.areas,
        answers: currentAnswers,
        category: calcResult.category,
      })
      setSubmitted(true)
      return
    }
    let nextQ = questionIndex + 1
    let nextA = areaIndex
    if (nextQ >= AREAS[nextA].questions.length) { nextA++; nextQ = 0 }
    while (nextA < AREAS.length && isSkipped(AREAS[nextA].questions[nextQ])) {
      nextQ++
      if (nextQ >= AREAS[nextA].questions.length) { nextA++; nextQ = 0 }
    }
    setAreaIndex(nextA)
    setQuestionIndex(nextQ)
  }

  function handlePrev() {
    if (isFirst) return
    let prevQ = questionIndex - 1
    let prevA = areaIndex
    if (prevQ < 0) { prevA--; prevQ = AREAS[prevA].questions.length - 1 }
    while (prevA >= 0 && isSkipped(AREAS[prevA].questions[prevQ])) {
      prevQ--
      if (prevQ < 0) { prevA--; if (prevA >= 0) prevQ = AREAS[prevA].questions.length - 1 }
    }
    setAreaIndex(prevA)
    setQuestionIndex(prevQ)
  }

  function handleAreaClick(ai) {
    if (getAreaStatus(ai) !== 'inactive') {
      setAreaIndex(ai)
      setQuestionIndex(0)
    }
  }

  function handleViewPartial() {
    const calcResult = calculator(answers)
    navigate(`/session/${code}/results`, { state: { ...calcResult, answers } })
  }

  function renderProgressDots(aIdx, activeQIdx) {
    const a = AREAS[aIdx]
    return (
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {a.questions.map((q, qi) => {
          if (isSkipped(q)) return null
          const done   = q.type === 'multi' || q.type === 'nights' || q.isSensibilization || answers[q.id] !== undefined
          const active = aIdx === areaIndex && qi === activeQIdx
          return (
            <div key={qi} style={{
              height: 4, width: 20, borderRadius: 2,
              background: active ? a.color + '88' : done ? a.color : '#ddd',
            }} />
          )
        })}
      </div>
    )
  }

  const nextLabel = isLast ? 'Ver resultados →' : 'Siguiente →'

  // ── submitted waiting screen ─────────────────────────────────────────────────
  if (submitted) return (
    <div>
      <SessionClosedBanner onViewPartial={handleViewPartial} />
      <div style={{
        minHeight: 'calc(100vh - 52px)', background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem', lineHeight: 1 }}>✅</div>
        <h1 style={{ fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase', marginBottom: '0.6rem', color: '#1a1a1a' }}>
          ¡Listo!
        </h1>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#2d5a27', marginBottom: '0.6rem' }}>
          Tu huella ha sido calculada
        </p>
        <p style={{ fontSize: '0.85rem', color: '#888', maxWidth: 300, lineHeight: 1.65, margin: '0 0 2rem' }}>
          Espera a que el facilitador revele los resultados del grupo...
        </p>
        <DotsLoader />
      </div>
    </div>
  )

  // ── desktop ─────────────────────────────────────────────────────────────────
  if (!isMobile) return (
    <div>
      <SessionClosedBanner onViewPartial={handleViewPartial} />
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100dvh - 52px)', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ background: '#fafafa', borderRight: '1px solid #e0e0d8', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bbb', marginBottom: 12, paddingLeft: 8 }}>
            Áreas
          </div>
          {AREAS.map((a, ai) => {
            const status = getAreaStatus(ai)
            const isDone = status === 'done'
            const isAct  = status === 'active'
            return (
              <div
                key={a.id}
                onClick={() => handleAreaClick(ai)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12,
                  background: (isDone || isAct) ? a.bg : 'transparent',
                  opacity: status === 'inactive' ? 0.45 : 1,
                  cursor: status !== 'inactive' ? 'pointer' : 'default',
                  transition: 'opacity 0.15s',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, background: a.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {a.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? '#2d5a27' : isAct ? a.color : '#555' }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {isDone ? 'Completado' : `${a.questions.length} preguntas`}
                  </div>
                  {isAct && renderProgressDots(ai, questionIndex)}
                </div>
                {isDone && (
                  <span style={{ fontSize: 14, color: '#2d5a27', fontWeight: 700, flexShrink: 0 }}>✓</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Main */}
        <div style={{ background: '#f8f8f6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header card */}
          <div style={{ margin: '24px 24px 0', borderRadius: 16, padding: '20px 24px', background: area.bg, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: area.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {area.emoji}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: area.color }}>{area.label}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Pregunta {questionIndex + 1} de {area.questions.filter(q => !isSkipped(q)).length}</div>
              </div>
            </div>
            {renderProgressDots(areaIndex, questionIndex)}
          </div>

          {/* Question */}
          <div style={{ padding: '24px 28px 12px', flexShrink: 0 }}>
            <p style={{ fontSize: 17, fontWeight: 500, maxWidth: 560, lineHeight: 1.55, color: '#1a1a1a', margin: 0 }}>
              {question.text}
            </p>
            {question.id === 'heating' && (
              <p style={{ fontSize: 13, color: area.color, margin: '4px 0 0', fontWeight: 500 }}>
                {`Para tu ${homeTypeLabels[answers.homeType] || 'vivienda'}, ¿qué sistema de calefacción tienes?`}
              </p>
            )}
            {question.info && (
              <p style={{ fontSize: 12, color: '#aaa', margin: '6px 0 0', fontStyle: 'italic' }}>{question.info}</p>
            )}
          </div>

          {/* Options */}
          <div style={{ padding: '0 28px 16px', maxWidth: 640, flex: 1, overflowY: 'auto' }}>
            {question.type === 'nights' ? (
              <div style={{ '--area-color': area.color, '--area-bg': area.bg }}>
                <NightsInput question={question} answers={answers} onChange={setAnswers} />
              </div>
            ) : (
              <OptionList
                question={question} area={area} answers={answers}
                onSelect={handleSelect} onToggle={handleToggle} compact={false}
              />
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, borderTop: '1px solid #eee', background: '#f8f8f6' }}>
            <button
              onClick={handlePrev}
              disabled={isFirst}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                letterSpacing: '0.05em', background: 'transparent',
                border: `1.5px solid ${isFirst ? '#eee' : '#ddd'}`,
                color: isFirst ? '#ccc' : '#555',
              }}
            >
              ← Anterior
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, color: '#999', fontWeight: 500 }}>
              Pregunta {questionIndex + 1} de {area.questions.filter(q => !isSkipped(q)).length}
            </span>
            <button
              onClick={handleNext}
              disabled={!canNext}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                letterSpacing: '0.05em', border: 'none',
                background: canNext ? area.color : '#eee',
                color: canNext ? '#fff' : '#bbb',
              }}
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── mobile ───────────────────────────────────────────────────────────────────
  return (
    <div>
      <SessionClosedBanner onViewPartial={handleViewPartial} />
      <div style={{ height: 'calc(100dvh - 52px)', background: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Gradient header — altura fija */}
        <div style={{ background: `linear-gradient(180deg, ${area.bg} 0%, #ffffff 100%)`, paddingTop: 12, flexShrink: 0 }}>

          {/* Pills */}
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', flexShrink: 0 }}>
            {AREAS.map((a, ai) => {
              const status = getAreaStatus(ai)
              return (
                <button
                  key={a.id}
                  onClick={() => handleAreaClick(ai)}
                  style={{
                    flexShrink: 0, padding: '4px 10px', borderRadius: 20,
                    fontSize: 11, fontWeight: 600, border: 'none',
                    outline: status === 'done' ? '1px solid #c8e6c0' : 'none',
                    background: status === 'active' ? a.color : status === 'done' ? '#f0f7ee' : '#f0f0f0',
                    color: status === 'active' ? '#fff' : status === 'done' ? '#2d5a27' : '#bbb',
                    whiteSpace: 'nowrap',
                    cursor: status !== 'inactive' ? 'pointer' : 'default',
                  }}
                >
                  {status === 'done' ? `✓ ${a.emoji} ${a.label}` : `${a.emoji} ${a.label}`}
                </button>
              )
            })}
          </div>

          {/* Area row */}
          <div style={{ padding: '2px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: area.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {area.emoji}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: area.color }}>{area.label}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>Pregunta {questionIndex + 1} de {area.questions.filter(q => !isSkipped(q)).length}</div>
              {renderProgressDots(areaIndex, questionIndex)}
            </div>
          </div>
        </div>

        {/* Question — altura fija */}
        <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.45, color: '#1a1a1a', margin: 0 }}>
            {question.text}
          </p>
          {question.id === 'heating' && (
            <p style={{ fontSize: 11, color: area.color, margin: '3px 0 0', fontWeight: 500 }}>
              {`Para tu ${homeTypeLabels[answers.homeType] || 'vivienda'}, ¿qué sistema de calefacción tienes?`}
            </p>
          )}
          {question.info && (
            <p style={{ fontSize: 10, color: '#aaa', margin: '4px 0 0', fontStyle: 'italic' }}>{question.info}</p>
          )}
        </div>

        {/* Banner individual — solo en primera pregunta */}
        {isFirst && (
          <div style={{ margin: '0 16px 6px', padding: '7px 12px', background: '#f0f7ee', borderRadius: 8, border: '1px solid #c8e6c0', flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: '#2d5a27', margin: 0, lineHeight: 1.45 }}>
              Responde pensando en ti — no en tu familia ni compañeros de piso.
            </p>
          </div>
        )}

        {/* Options — ocupa el espacio restante con scroll interno */}
        <div style={{ padding: '0 16px 8px', flex: 1, overflowY: 'auto' }}>
          {question.type === 'nights' ? (
            <div style={{ '--area-color': area.color, '--area-bg': area.bg }}>
              <NightsInput question={question} answers={answers} onChange={setAnswers} />
            </div>
          ) : (
            <OptionList
              question={question} area={area} answers={answers}
              onSelect={handleSelect} onToggle={handleToggle} compact={true}
            />
          )}
        </div>

        {/* Footer — siempre visible */}
        <div style={{ padding: '10px 16px 12px', display: 'flex', gap: 10, flexShrink: 0, borderTop: '1px solid #f0f0f0', background: '#fff' }}>
          <button
            onClick={handlePrev}
            disabled={isFirst}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0, fontSize: 16,
              fontWeight: 600, background: 'transparent',
              border: `1.5px solid ${isFirst ? '#eee' : '#ddd'}`,
              color: isFirst ? '#ccc' : '#555',
            }}
          >
            ←
          </button>
          <button
            onClick={handleNext}
            disabled={!canNext}
            style={{
              flex: 1, height: 44, borderRadius: 12, fontSize: 13, fontWeight: 600,
              letterSpacing: '0.05em', border: 'none',
              background: canNext ? area.color : '#eee',
              color: canNext ? '#fff' : '#bbb',
            }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
