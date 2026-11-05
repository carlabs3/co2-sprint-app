import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../context/SessionContext.jsx'
import api from '../../utils/api.js'
import { applySessionLang } from '../../utils/sessionLang.js'
import { safeSet } from '../../utils/safeStorage.js'

// value = ID neutro guardado en DB · labelKey = clave i18n del texto visible
const AGE_RANGES = [
  { value: '< 20',        labelKey: 'demographics.age.lt20' },
  { value: '20-29',       labelKey: 'demographics.age.a2029' },
  { value: '30-39',       labelKey: 'demographics.age.a3039' },
  { value: '40-49',       labelKey: 'demographics.age.a4049' },
  { value: '50-59',       labelKey: 'demographics.age.a5059' },
  { value: '60+',         labelKey: 'demographics.age.a60plus' },
  { value: 'undisclosed', labelKey: 'demographics.age.undisclosed' },
]
const GENDERS = [
  { value: 'female',      labelKey: 'demographics.gender.female' },
  { value: 'male',        labelKey: 'demographics.gender.male' },
  { value: 'nonbinary',   labelKey: 'demographics.gender.nonbinary' },
  { value: 'undisclosed', labelKey: 'demographics.gender.undisclosed' },
]

const s = {
  page: {
    flex: 1,
    background: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    minHeight: 'calc(100vh - 60px)',
  },
  card: {
    background: '#ffffff',
    width: '100%',
    maxWidth: '390px',
    borderRadius: '16px',
    border: '1px solid #e5e5e5',
    padding: '32px',
  },
  logo: {
    fontWeight: 900,
    fontSize: '1.6rem',
    letterSpacing: '-0.02em',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
    color: '#0a0a0a',
  },
  asterisk: { color: '#0a0a0a' },
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
    fontSize: '11px',
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
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '0.6rem 0.75rem',
    fontSize: '1.1rem',
    background: '#ffffff',
    outline: 'none',
    letterSpacing: '0.05em',
    fontWeight: 700,
    color: '#0a0a0a',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '0.6rem 0.75rem',
    fontSize: '1rem',
    background: '#ffffff',
    outline: 'none',
    letterSpacing: '0.03em',
    fontWeight: 700,
    appearance: 'none',
    boxSizing: 'border-box',
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
    background: active ? '#0a0a0a' : '#f5f5f5',
    color: active ? '#fff' : '#0a0a0a',
    border: '1px solid #e5e5e5',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  btn: {
    width: '100%',
    background: '#0a0a0a',
    color: '#fff',
    padding: '1rem',
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    borderRadius: '999px',
    marginTop: '0.5rem',
    border: 'none',
    cursor: 'pointer',
  },
  error: {
    fontSize: '0.78rem',
    color: '#cc4444',
    marginTop: '0.35rem',
  },
  fieldError: {
    border: '1px solid #cc4444',
  },
}

export default function JoinSession() {
  const [searchParams] = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [code,        setCode]        = useState('')
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
  const { t } = useTranslation()

  useEffect(() => {
    clearSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl.toUpperCase())
  }, [codeFromUrl])

  useEffect(() => {
    const clean = code.replace('-', '')
    if (clean.length < 8) { setGroups([]); setCodeError(''); return }
    api.get(`/api/sessions/${code}/info`)
      .then(res => {
        const { status, groups: g } = res.data
        applySessionLang(res.data.lang)
        if (status === 'draft') {
          setGroups([])
          setCodeError(t('joinSession.errors.notStarted'))
        } else if (status === 'closed') {
          setGroups([])
          setCodeError(t('joinSession.errors.finished'))
        } else {
          setGroups(g || [])
          setCodeError('')
        }
      })
      .catch(() => { setGroups([]); setCodeError(t('joinSession.errors.notFound')) })
  }, [code])

  function formatCode(val) {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length <= 4) return clean
    return clean.slice(0, 4) + '-' + clean.slice(4, 8)
  }

  function handleSubmit(e) {
    e.preventDefault()
    let valid = true

    if (!code || code.length < 9) {
      setCodeError(t('joinSession.errors.invalidCode'))
      valid = false
    }
    if (!age) {
      setAgeError(t('joinSession.errors.selectAge'))
      valid = false
    }
    if (!gender) {
      setGenderError(t('joinSession.errors.selectGender'))
      valid = false
    }
    if (!group) {
      setGroupError(t('joinSession.errors.selectGroup'))
      valid = false
    }
    if (!valid) return

    safeSet(`co2sprint_participant_${code}`, JSON.stringify({
      code, name: 'Anónimo', group, age, gender,
      joinedAt: new Date().toISOString(),
    }))
    joinSession(code, 'Anónimo', group, age, gender)
    navigate(`/session/${code}/calculator`)
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          CO2 Sprint <span style={s.asterisk}>*</span>
        </div>
        <p style={s.tagline}>{t('joinSession.tagline')}</p>
        <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px', lineHeight: 1.5 }}>
          {t('joinSession.intro')}
        </p>

        <form onSubmit={handleSubmit}>

          {/* Código */}
          <div style={s.field}>
            <label style={s.label} htmlFor="code">{t('joinSession.codeLabel')}</label>
            <input
              id="code"
              style={{ ...s.input, ...(codeError ? s.fieldError : {}) }}
              type="text"
              value={code}
              onChange={e => { setCode(formatCode(e.target.value)); setCodeError('') }}
              placeholder="DROP-4872"
              maxLength={9}
            />
            {codeError && <div style={s.error}>{codeError}</div>}
          </div>

          {/* Grupo */}
          {groups.length > 0 && (
            <div style={s.field}>
              <label style={s.label}>{t('joinSession.groupLabel')}</label>
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
              <label style={s.label} htmlFor="age">{t('joinSession.ageLabel')}</label>
              <select
                id="age"
                value={age}
                onChange={e => { setAge(e.target.value); setAgeError('') }}
                style={{ ...s.select, color: age ? '#0a0a0a' : '#aaa', ...(ageError ? s.fieldError : {}) }}
              >
                <option value="">—</option>
                {AGE_RANGES.map(r => <option key={r.value} value={r.value}>{t(r.labelKey)}</option>)}
              </select>
              {ageError && <div style={s.error}>{ageError}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label} htmlFor="gender">{t('joinSession.genderLabel')}</label>
              <select
                id="gender"
                value={gender}
                onChange={e => { setGender(e.target.value); setGenderError('') }}
                style={{ ...s.select, color: gender ? '#0a0a0a' : '#aaa', ...(genderError ? s.fieldError : {}) }}
              >
                <option value="">—</option>
                {GENDERS.map(g => <option key={g.value} value={g.value}>{t(g.labelKey)}</option>)}
              </select>
              {genderError && <div style={s.error}>{genderError}</div>}
            </div>
          </div>

          <p style={{ fontSize: '11px', color: '#999', lineHeight: 1.5, marginBottom: '16px', marginTop: 0 }}>
            {t('joinSession.privacyNote')}
          </p>

          <button style={s.btn} type="submit">{t('joinSession.submit')}</button>
        </form>
      </div>
    </div>
  )
}
