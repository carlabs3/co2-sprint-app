import { createContext, useContext, useState, useEffect } from 'react'
import { socket } from '../utils/socket.js'

const SESSION_KEY = 'co2sprint_session'

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || {}
  } catch {
    return {}
  }
}

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const saved = loadSession()

  const [sessionCode,      setSessionCode]      = useState(saved.sessionCode      || null)
  const [participantName,  setParticipantName]  = useState(saved.participantName  || '')
  const [participantGroup, setParticipantGroup] = useState(saved.participantGroup || '')
  const [currentStep,      setCurrentStep]      = useState(1)
  const [sessionClosed,    setSessionClosed]    = useState(false)

  useEffect(() => {
    socket.connect()
    socket.on('step:change', ({ step }) => setCurrentStep(step))
    socket.on('session:closed', () => setSessionClosed(true))

    // Re-join socket room if session was persisted (e.g. after page refresh)
    const s = loadSession()
    if (s.sessionCode && s.participantName !== undefined && s.participantGroup) {
      socket.emit('session:join', {
        code:  s.sessionCode,
        name:  s.participantName,
        group: s.participantGroup,
      })
    }

    return () => {
      socket.off('step:change')
      socket.off('session:closed')
      socket.disconnect()
    }
  }, [])

  function joinSession(code, name, group) {
    setSessionCode(code)
    setParticipantName(name)
    setParticipantGroup(group)
    setSessionClosed(false)

    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionCode: code, participantName: name, participantGroup: group }))

    socket.emit('session:join', { code, name, group })
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY)
    setSessionCode(null)
    setParticipantName('')
    setParticipantGroup('')
    setSessionClosed(false)
  }

  return (
    <SessionContext.Provider value={{
      sessionCode,
      currentStep,
      participantName,
      participantGroup,
      sessionClosed,
      joinSession,
      clearSession,
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
