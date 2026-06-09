import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSession } from '../../context/SessionContext.jsx'
import api from '../../utils/api.js'

const AGE_RANGES = ['< 20', '20-29', '30-39', '40-49', '50-59', '60+', 'Prefiero no decirlo']
const GENDERS    = ['Mujer', 'Hombre', 'No binario', 'Prefiero no decirlo']

const s = {
  page: {
    flex: 1,
    background: '#f5f5f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    minHeight: 'calc(100vh - 60px)',
  },
  card: {
    background: '#fff',
    width: '100%',
    maxWidth: '390px',
    borderRadius: '12px',
    padding: '2.5rem 2rem',
  },
  logo: {
    fontWeight: 900,
    fontSize: '1.6rem',
    letterSpacing: '-0.02em',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
  },
  asterisk: { color: '#2d5a27' },
  tagline: {
    fontSize: '0.75rem',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '2.5rem',
  },
  field: { marginBottom: '1.8rem' },
  label: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#666',
    marginBottom: '0.5rem',
  },
  hint: {
    fontSize: '0.68rem',
    color: '#bbb',
    marginTop: '0.35rem',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #e0e0d8',
    padding: '0.6rem 0',
    fontSize: '1.1rem',
    background: 'transparent',
    outline: 'none',
    letterSpacing: '0.05em',
    fontWeight: 700,
  },
  select: {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #e0e0d8',
    padding: '0.6rem 0',
    fontSize: '1rem',
    background: 'transparent',
    outline: 'none',
    letterSpacing: '0.03em',
    fontWeight: 700,
    appearance: 'none',
    paddingRight: '1rem',
  },
  groupRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  chip: (active) => ({
    padding: '0.45rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    borderRadius: '999px',
    background: active ? '#2d5a27' : '#f0f0f0',
    color: active ? '#fff' : '#666',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  btn: {
    width: '100%',
    background: '#2d5a27',
    color: '#fff',
    padding: '1rem',
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    borderRadius: '2px',
    marginTop: '0.5rem',
  },
  error: {
    fontSize: '0.78rem',
    color: '#cc4444',
    marginTop: '0.35rem',
  },
  fieldError: {
    borderBottom: '1px solid #cc4444',
  },
}

export default function JoinSession() {
  const [searchParams] = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [code,        setCode]        = useState('')
  const [name,        setName]        = useState('')
  const [age,         setAge]         = useState('')
  const [gender,      setGender]      = useState('')
  const [group,       setGroup]       = useState('')
  const [groups,      setGroups]      = useState([])
  const [codeError,   setCodeError]   = useState('')
  const [ageError,    setAgeError]    = useState('')
  const [genderError, setGenderError] = useState('')
  const [groupError,  setGroupError]  = useState('')

  const { joinSession, clearSession } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    clearSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl.toUpperCase())
  }, [codeFromUrl])

  useEffect(() => {
    const clean = code.replace('-', '')
    if (clean.length < 7) { setGroups([]); return }
    api.get(`/api/sessions/${code}/info`)
      .then(res => { setGroups(res.data.groups || []); setCodeError('') })
      .catch(() => { setGroups([]); setCodeError('Sesión no encontrada') })
  }, [code])

  function formatCode(val) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length <= 3) return clean
    return clean.slice(0, 3) + '-' + clean.slice(3, 7)
  }

  function handleSubmit(e) {
    e.preventDefault()
    let valid = true

    if (!code || code.length < 7) {
      setCodeError('Ingresa un código válido (ej: ECO-4872)')
      valid = false
    }
    if (!age) {
      setAgeError('Selecciona tu rango de edad')
      valid = false
    }
    if (!gender) {
      setGenderError('Selecciona una opción')
      valid = false
    }
    if (!group) {
      setGroupError('Selecciona un grupo')
      valid = false
    }
    if (!valid) return

    const resolvedName = name.trim() || 'Anónimo'
    localStorage.setItem(`co2sprint_participant_${code}`, JSON.stringify({
      code, name: resolvedName, group, age, gender,
      joinedAt: new Date().toISOString(),
    }))
    joinSession(code, resolvedName, group, age, gender)
    navigate(`/session/${code}/calculator`)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          CO2 Sprint <span style={s.asterisk}>*</span>
        </div>
        <p style={s.tagline}>Calculadora de huella de carbono</p>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px', lineHeight: 1.5 }}>
          Esta calculadora mide tu huella de carbono individual — no la de tu familia ni tu hogar compartido.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Código */}
          <div style={s.field}>
            <label style={s.label} htmlFor="code">Código de sesión</label>
            <input
              id="code"
              style={{ ...s.input, ...(codeError ? s.fieldError : {}) }}
              type="text"
              value={code}
              onChange={e => { setCode(formatCode(e.target.value)); setCodeError('') }}
              placeholder="ECO-4872"
              maxLength={8}
            />
            {codeError && <div style={s.error}>{codeError}</div>}
          </div>

          {/* Nombre (opcional) */}
          <div style={s.field}>
            <label style={s.label} htmlFor="name">
              Tu nombre o alias{' '}
              <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
            </label>
            <input
              id="name"
              style={s.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ej. María, M.García, Participante 7..."
              maxLength={40}
            />
            <div style={s.hint}>Solo visible en el ranking en vivo. No se guarda en ninguna base de datos.</div>
          </div>

          {/* Grupo */}
          {groups.length > 0 && (
            <div style={s.field}>
              <label style={s.label}>Tu grupo</label>
              <div style={s.groupRow}>
                {groups.map(g => (
                  <button
                    key={g}
                    type="button"
                    style={s.chip(group === g)}
                    onClick={() => { setGroup(g); setGroupError('') }}
                  >
                    {g}
                  </button>
                ))}
              </div>
              {groupError && <div style={{ ...s.error, marginTop: '0.5rem' }}>{groupError}</div>}
            </div>
          )}

          {/* Edad + Género */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.8rem' }}>
            <div style={{ flex: 1 }}>
              <label style={s.label} htmlFor="age">Edad</label>
              <select
                id="age"
                value={age}
                onChange={e => { setAge(e.target.value); setAgeError('') }}
                style={{ ...s.select, color: age ? '#1a1a1a' : '#aaa', ...(ageError ? s.fieldError : {}) }}
              >
                <option value="">—</option>
                {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {ageError && <div style={s.error}>{ageError}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label} htmlFor="gender">Género</label>
              <select
                id="gender"
                value={gender}
                onChange={e => { setGender(e.target.value); setGenderError('') }}
                style={{ ...s.select, color: gender ? '#1a1a1a' : '#aaa', ...(genderError ? s.fieldError : {}) }}
              >
                <option value="">—</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {genderError && <div style={s.error}>{genderError}</div>}
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#888', lineHeight: 1.5, marginBottom: '16px', marginTop: 0 }}>
            Los datos de edad, género y huella de carbono se recogen de forma anónima
            para los resultados del taller. No se asocian a ningún nombre ni se comparten
            con terceros.
          </p>

          <button style={s.btn} type="submit">Unirme →</button>
        </form>
      </div>
    </div>
  )
}
