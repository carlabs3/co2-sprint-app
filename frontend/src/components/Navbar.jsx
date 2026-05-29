import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const styles = {
  nav: {
    height: '52px',
    background: '#2d5a27',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontWeight: 900,
    fontWeight: 900,
    fontSize: '1.05rem',
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  asterisk: {
    color: 'rgba(255,255,255,0.45)',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  link: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  btnPill: {
    background: 'rgba(255,255,255,0.15)',
    color: '#ffffff',
    padding: '0.4rem 1rem',
    fontSize: '0.78rem',
    letterSpacing: '0.06em',
    borderRadius: '20px',
    fontWeight: 500,
  },
  btnSalir: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    padding: '0.4rem 0',
    fontSize: '0.78rem',
    letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 0,
    fontWeight: 500,
  },
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>
        CO2 SPRINT <span style={styles.asterisk}>*</span>
      </Link>
      <div style={styles.links}>
        {user ? (
          <>
            <Link to="/dashboard" style={styles.link}>Sesiones</Link>
            <Link to="/session/create">
              <button style={styles.btnPill}>Nueva Sesión</button>
            </Link>
            <button style={styles.btnSalir} onClick={handleLogout}>Salir</button>
          </>
        ) : (
          <Link to="/login" style={styles.link}>Login Facilitador</Link>
        )}
      </div>
    </nav>
  )
}
