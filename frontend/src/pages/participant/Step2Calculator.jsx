import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../../utils/socket.js'
import { useSession } from '../../context/SessionContext.jsx'
import SessionClosedBanner from '../../components/SessionClosedBanner.jsx'

const AREAS = [
  {
    id: 'transport',
    label: 'Transporte',
    emoji: '🚗',
    color: '#4a90d9',
    bg: '#e8f2fd',
    iconBg: '#d0e8f8',
    questions: [
      {
        id: 't1',
        text: '¿Cómo te desplazas principalmente al trabajo o escuela?',
        options: [
          { label: 'Caminando o bicicleta', emoji: '🚶', value: 0 },
          { label: 'Transporte público',    emoji: '🚌', value: 0.3 },
          { label: 'Auto compartido',       emoji: '🤝', value: 0.8 },
          { label: 'Auto propio',           emoji: '🚗', value: 1.5 },
        ],
      },
      {
        id: 't2',
        text: '¿Cuántos vuelos haces al año?',
        options: [
          { label: 'Ninguno',         emoji: '🚫', value: 0 },
          { label: '1–2 cortos',      emoji: '✈️',  value: 0.5 },
          { label: '1–2 largos',      emoji: '🌍', value: 1.5 },
          { label: 'Más de 3 vuelos', emoji: '🛫', value: 3.0 },
        ],
      },
    ],
  },
  {
    id: 'energy',
    label: 'Energía',
    emoji: '⚡',
    color: '#e8a020',
    bg: '#fff8ec',
    iconBg: '#fff3d6',
    questions: [
      {
        id: 'e1',
        text: '¿Qué tan alta es tu factura de electricidad mensual?',
        options: [
          { label: 'Menos de $200', emoji: '💚', value: 0.1 },
          { label: '$200–$500',     emoji: '💡', value: 0.3 },
          { label: '$500–$1000',    emoji: '⚡', value: 0.6 },
          { label: 'Más de $1000', emoji: '🔋', value: 1.0 },
        ],
      },
      {
        id: 'e2',
        text: '¿Usas energías renovables en casa?',
        options: [
          { label: 'Sí, solar o eólica', emoji: '☀️', value: 0 },
          { label: 'Parcialmente',        emoji: '🌱', value: 0.2 },
          { label: 'Solo red eléctrica',  emoji: '🔌', value: 0.5 },
          { label: 'No sé',              emoji: '❓', value: 0.4 },
        ],
      },
    ],
  },
  {
    id: 'food',
    label: 'Alimentación',
    emoji: '🥗',
    color: '#5aab5a',
    bg: '#f0f7ee',
    iconBg: '#e0f0dc',
    questions: [
      {
        id: 'a1',
        text: '¿Cuál es tu dieta principal?',
        options: [
          { label: 'Vegana',         emoji: '🌱', value: 0.3 },
          { label: 'Vegetariana',    emoji: '🥗', value: 0.5 },
          { label: 'Poca carne',     emoji: '🥩', value: 0.9 },
          { label: 'Carne a diario', emoji: '🍖', value: 1.8 },
        ],
      },
      {
        id: 'a2',
        text: '¿Con qué frecuencia desperdicias comida?',
        options: [
          { label: 'Casi nunca', emoji: '✅', value: 0.1 },
          { label: 'A veces',    emoji: '🤔', value: 0.3 },
          { label: 'Seguido',    emoji: '😬', value: 0.5 },
          { label: 'Mucho',      emoji: '🗑️', value: 0.8 },
        ],
      },
    ],
  },
  {
    id: 'consumption',
    label: 'Consumo',
    emoji: '🛍️',
    color: '#b07a30',
    bg: '#fdf4e8',
    iconBg: '#f5e6cc',
    questions: [
      {
        id: 'c1',
        text: '¿Cuánta ropa nueva compras al año?',
        options: [
          { label: 'Casi nada o usada', emoji: '♻️', value: 0.1 },
          { label: '1–5 prendas',       emoji: '👕', value: 0.3 },
          { label: '6–20 prendas',      emoji: '🛍️', value: 0.6 },
          { label: 'Más de 20',         emoji: '🏪', value: 1.0 },
        ],
      },
      {
        id: 'c2',
        text: '¿Cada cuánto renuevas dispositivos electrónicos?',
        options: [
          { label: 'Más de 5 años',  emoji: '⏳', value: 0.1 },
          { label: 'Cada 3–5 años',  emoji: '📱', value: 0.3 },
          { label: 'Cada 1–2 años',  emoji: '🔄', value: 0.6 },
          { label: 'Menos de 1 año', emoji: '🆕', value: 1.0 },
        ],
      },
    ],
  },
  {
    id: 'waste',
    label: 'Residuos',
    emoji: '♻️',
    color: '#7a7aaa',
    bg: '#f0f0f8',
    iconBg: '#e0e0f0',
    questions: [
      {
        id: 'r1',
        text: '¿Reciclas o separas tus residuos?',
        options: [
          { label: 'Siempre',    emoji: '♻️', value: 0.05 },
          { label: 'A veces',    emoji: '🔄', value: 0.2 },
          { label: 'Casi nunca', emoji: '😔', value: 0.4 },
          { label: 'Nunca',      emoji: '🚮', value: 0.6 },
        ],
      },
    ],
  },
]

function getCategory(tons) {
  if (tons < 2) return 'bajo'
  if (tons < 4) return 'medio'
  if (tons < 6) return 'alto'
  return 'muy alto'
}

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

function OptionCard({ opt, area, currentAnswer, onSelect, compact }) {
  const sel = currentAnswer === opt.value
  return (
    <button
      onClick={() => onSelect(opt.value)}
      style={{
        border: `1.5px solid ${sel ? area.color : '#ebebeb'}`,
        borderRadius: 14,
        padding: compact ? '14px 10px' : '18px 12px',
        background: sel ? area.bg : '#fafafa',
        cursor: 'pointer',
        textAlign: 'center',
        width: '100%',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ fontSize: compact ? 24 : 28, marginBottom: 6, lineHeight: 1 }}>
        {opt.emoji}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, color: sel ? area.color : '#1a1a1a' }}>
        {opt.label}
      </div>
    </button>
  )
}

export default function Step2Calculator() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { participantGroup, participantName } = useSession()

  const [areaIndex, setAreaIndex]       = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers]           = useState({})
  const [submitted, setSubmitted]       = useState(false)
  const [isMobile, setIsMobile]         = useState(() => window.innerWidth <= 768)
  const submittedResultRef              = useRef(null)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    socket.on('results:revealed', () => {
      const result = submittedResultRef.current
      if (result) {
        navigate(`/session/${code}/results`, { state: result })
      }
      // If not submitted yet, stay in calculator — they'll see results when done
    })
    return () => socket.off('results:revealed')
  }, [code, navigate])

  const area          = AREAS[areaIndex]
  const question      = area.questions[questionIndex]
  const answerKey     = `${areaIndex}-${questionIndex}`
  const currentAnswer = answers[answerKey]
  const isFirst       = areaIndex === 0 && questionIndex === 0
  const isLast        = areaIndex === AREAS.length - 1 && questionIndex === area.questions.length - 1
  const canNext       = currentAnswer !== undefined

  const totalCO2 = parseFloat(
    Object.values(answers).reduce((s, v) => s + v, 0).toFixed(2)
  )

  function isAreaDone(ai) {
    return AREAS[ai].questions.every((_, qi) => answers[`${ai}-${qi}`] !== undefined)
  }

  function getAreaStatus(ai) {
    if (isAreaDone(ai)) return 'done'
    if (ai === areaIndex) return 'active'
    return 'inactive'
  }

  function buildAreaResults() {
    const out = {}
    AREAS.forEach((a, ai) => {
      const total = a.questions.reduce((s, _, qi) => s + (answers[`${ai}-${qi}`] || 0), 0)
      if (total > 0) out[a.id] = parseFloat(total.toFixed(2))
    })
    return out
  }

  function handleSelect(value) {
    setAnswers(prev => ({ ...prev, [answerKey]: value }))
  }

  function handleNext() {
    if (!canNext) return
    if (isLast) {
      const areaResults = buildAreaResults()
      const result = { carbonTons: totalCO2, areas: areaResults, answers }
      socket.emit('footprint:submit', {
        sessionCode: code,
        group: participantGroup,
        name: participantName,
        carbonTons: totalCO2,
        areas: areaResults,
        answers,
        category: getCategory(totalCO2),
      })
      submittedResultRef.current = result
      setSubmitted(true)
      return
    }
    if (questionIndex < area.questions.length - 1) {
      setQuestionIndex(q => q + 1)
    } else {
      setAreaIndex(a => a + 1)
      setQuestionIndex(0)
    }
  }

  function handlePrev() {
    if (isFirst) return
    if (questionIndex > 0) {
      setQuestionIndex(q => q - 1)
    } else {
      const prevAi = areaIndex - 1
      setAreaIndex(prevAi)
      setQuestionIndex(AREAS[prevAi].questions.length - 1)
    }
  }

  function handleAreaClick(ai) {
    if (getAreaStatus(ai) !== 'inactive') {
      setAreaIndex(ai)
      setQuestionIndex(0)
    }
  }

  // ── shared ──────────────────────────────────────────────────────────────────
  const nextLabel = isLast ? 'Ver resultados →' : 'Siguiente →'

  function renderProgressDots(aIdx, activeQIdx) {
    const a = AREAS[aIdx]
    return (
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {a.questions.map((_, qi) => {
          const done   = answers[`${aIdx}-${qi}`] !== undefined
          const active = qi === activeQIdx
          return (
            <div key={qi} style={{
              height: 4, width: 24, borderRadius: 2,
              background: done ? a.color : active ? a.color + '55' : '#ddd',
            }} />
          )
        })}
      </div>
    )
  }

  function handleViewPartial() {
    const areaResults = buildAreaResults()
    navigate(`/session/${code}/results`, { state: { carbonTons: totalCO2, areas: areaResults, answers } })
  }

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
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 'calc(100vh - 52px)' }}>

      {/* Sidebar */}
      <div style={{ background: '#fafafa', borderRight: '1px solid #e0e0d8', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
      <div style={{ background: '#f8f8f6', display: 'flex', flexDirection: 'column' }}>
        {/* Header card */}
        <div style={{ margin: '24px 24px 0', borderRadius: 16, padding: '20px 24px', background: area.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: area.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              {area.emoji}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: area.color }}>{area.label}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Área {areaIndex + 1} de {AREAS.length}</div>
            </div>
          </div>
          {renderProgressDots(areaIndex, questionIndex)}
        </div>

        {/* Question */}
        <div style={{ padding: '28px 28px 20px' }}>
          <p style={{ fontSize: 18, fontWeight: 500, maxWidth: 480, lineHeight: 1.55, color: '#1a1a1a', margin: 0 }}>
            {question.text}
          </p>
        </div>

        {/* Options */}
        <div style={{ padding: '0 28px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {question.options.map((opt, i) => (
            <OptionCard
              key={i} opt={opt} area={area}
              currentAnswer={currentAnswer} onSelect={handleSelect}
              compact={false}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
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
            Pregunta {questionIndex + 1} de {area.questions.length}
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
    <div style={{ minHeight: 'calc(100vh - 52px)', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>

      {/* Gradient header */}
      <div style={{ background: `linear-gradient(180deg, ${area.bg} 0%, #ffffff 100%)`, paddingTop: 16 }}>

        {/* Pills */}
        <div style={{
          display: 'flex', gap: 8, padding: '0 16px 16px',
          overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {AREAS.map((a, ai) => {
            const status = getAreaStatus(ai)
            return (
              <button
                key={a.id}
                onClick={() => handleAreaClick(ai)}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 20,
                  fontSize: 12, fontWeight: 600, border: 'none',
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
        <div style={{ padding: '4px 16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: area.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {area.emoji}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: area.color }}>{area.label}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Área {areaIndex + 1} de {AREAS.length}</div>
            {renderProgressDots(areaIndex, questionIndex)}
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: '16px 16px 12px' }}>
        <p style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.55, color: '#1a1a1a', margin: 0 }}>
          {question.text}
        </p>
      </div>

      {/* Options 2-col */}
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1 }}>
        {question.options.map((opt, i) => (
          <OptionCard
            key={i} opt={opt} area={area}
            currentAnswer={currentAnswer} onSelect={handleSelect}
            compact={true}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px', display: 'flex', gap: 10, marginTop: 'auto' }}>
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
