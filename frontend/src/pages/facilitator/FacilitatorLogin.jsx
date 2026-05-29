import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

const s = {
  page: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f0',
    padding: '2rem',
  },
  card: {
    background: '#ffffff',
    width: '100%',
    maxWidth: '400px',
    padding: '3rem 2.5rem',
    borderRadius: '12px',
  },
  title: {
    fontWeight: 900,
    fontSize: '1.8rem',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '2.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  fieldset: {
    border: 'none',
    padding: 0,
    marginBottom: '1.8rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: '0.4rem',
    color: '#666',
  },
  input: {
    width: '100%',
    border: 'none',
    borderBottom: '1px solid #e0e0d8',
    padding: '0.6rem 0',
    fontSize: '1rem',
    background: 'transparent',
    outline: 'none',
    color: '#1a1a1a',
  },
  btn: {
    width: '100%',
    background: '#2d5a27',
    color: '#ffffff',
    padding: '1rem',
    fontSize: '0.9rem',
    letterSpacing: '0.1em',
    borderRadius: '4px',
    marginTop: '0.5rem',
  },
  error: {
    background: '#fdf0f0',
    border: '1px solid #f5c6c6',
    padding: '0.75rem 1rem',
    fontSize: '0.82rem',
    marginBottom: '1.5rem',
    color: '#cc4444',
    borderRadius: '6px',
  },
}

export default function FacilitatorLogin() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      login(data.token, email)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Acceso</h1>
        <p style={s.subtitle}>Panel de Facilitador</p>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <fieldset style={s.fieldset}>
            <label style={s.label} htmlFor="email">Email</label>
            <input
              id="email"
              style={s.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="facilitador@ejemplo.com"
              required
            />
          </fieldset>
          <fieldset style={s.fieldset}>
            <label style={s.label} htmlFor="password">Contraseña</label>
            <input
              id="password"
              style={s.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </fieldset>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
