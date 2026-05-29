import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function formatCode(val) {
  const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length <= 3) return clean
  return clean.slice(0, 3) + '-' + clean.slice(3, 7)
}

export default function Home() {
  const navigate = useNavigate()
  const [code, setCode]   = useState('')
  const [error, setError] = useState('')

  function handleCodeChange(e) {
    setCode(formatCode(e.target.value))
    setError('')
  }

  function handleJoin(e) {
    e.preventDefault()
    const formatted = code.trim()
    if (!formatted) {
      setError('Introduce el código de sesión')
      return
    }
    if (formatted.length < 7) {
      setError('El código debe tener el formato ECO-0000')
      return
    }
    navigate(`/join?code=${formatted}`)
  }

  function scrollToHow(e) {
    e.preventDefault()
    document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--gris-borde)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="hero-grid">

            {/* Left */}
            <div>
              <p className="hero-tag">• TALLER DE HUELLA DE CARBONO</p>
              <h1 className="hero-h1">
                ¿Cuánto<br />
                CO₂ <span>emites</span><br />
                tú?
              </h1>
              <p className="hero-sub">
                Descubre el impacto real de tu estilo de vida en el planeta.
                Calcula tu huella de carbono en menos de 5 minutos.
              </p>
              <button
                onClick={scrollToHow}
                style={{
                  background: 'transparent',
                  border: '1.5px solid #1a1a1a',
                  borderRadius: 8,
                  padding: '11px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: '#1a1a1a',
                }}
              >
                ¿Cómo funciona? →
              </button>
              <p className="hero-note">Sin registro · Desde tu móvil · Resultados en tiempo real</p>
            </div>

            {/* Right — join box */}
            <div className="join-box">
              <div style={{ marginBottom: 18 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 10, fontWeight: 600, color: '#3b6d11',
                  background: '#eaf3de', borderRadius: 999,
                  padding: '4px 10px', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b6d11', flexShrink: 0 }} />
                  Sesión activa
                </span>
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 8, letterSpacing: '-0.01em' }}>
                Únete al taller
              </h3>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.55, marginBottom: 20 }}>
                Introduce el código que te ha dado tu facilitador para calcular tu huella.
              </p>

              <form onSubmit={handleJoin}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#888', marginBottom: 8,
                }}>
                  Código de sesión
                </label>
                <div className="join-box-inner">
                  <input
                    className="join-input"
                    type="text"
                    placeholder="ECO-0000"
                    value={code}
                    onChange={handleCodeChange}
                    maxLength={8}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button className="join-btn" type="submit">
                    UNIRME AL TALLER →
                  </button>
                </div>
                {error && (
                  <p style={{ fontSize: 12, color: '#cc4444', marginTop: 8 }}>{error}</p>
                )}
              </form>

              {/* Info pills */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 9,
                marginTop: 20, paddingTop: 18,
                borderTop: '1px solid var(--gris-borde)',
              }}>
                {[
                  { icon: '📱', text: 'Sin registro ni instalación' },
                  { icon: '⏱️', text: '5 minutos para completarlo' },
                  { icon: '🏆', text: 'Resultados en tiempo real' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#666' }}>
                    <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────────────── */}
      <div className="stats">
        {[
          { bg: '#c8e6c0', numColor: '#1e3d1a', textColor: '#2d5a27',              big: '4.7 t', text: 'Media de CO₂ por persona al año en España' },
          { bg: '#2d5a27', numColor: '#fff',     textColor: 'rgba(255,255,255,0.7)', big: '2×',   text: 'El doble de lo que el planeta puede absorber' },
          { bg: '#f5f5f0', numColor: '#1a1a1a',  textColor: '#666',                 big: "5'",    text: 'Minutos para calcular tu huella y empezar a cambiar' },
        ].map(({ bg, numColor, textColor, big, text }) => (
          <div key={big} className="stat" style={{ background: bg }}>
            <div style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: numColor, lineHeight: 1, marginBottom: 12 }}>
              {big}
            </div>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', color: textColor, lineHeight: 1.55, margin: 0 }}>
              {text}
            </p>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="como-funciona" style={{ background: '#fff', padding: '64px 0 72px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#aaa', marginBottom: 40 }}>
            ¿Cómo funciona el taller?
          </p>
          <div className="how-steps">
            {[
              {
                n: '1',
                title: 'Entra con tu código',
                text:  'El facilitador comparte un código. Entra desde tu móvil sin registro ni instalación.',
              },
              {
                n: '2',
                title: 'Calcula tu huella',
                text:  'Responde preguntas sobre transporte, energía, alimentación y más.',
              },
              {
                n: '3',
                title: 'Ve los resultados',
                text:  'Compara con tu equipo y la media de España en tiempo real.',
              },
            ].map(({ n, title, text }) => (
              <div key={n}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#2d5a27', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, marginBottom: 16, flexShrink: 0,
                }}>
                  {n}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8, textTransform: 'none', letterSpacing: 0 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, margin: 0 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
