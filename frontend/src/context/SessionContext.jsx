import { createContext, useContext, useState, useEffect } from 'react'
import { socket } from '../utils/socket.js'
import api from '../utils/api.js'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [sessionCode,       setSessionCode]       = useState(null)
  const [participantName,   setParticipantName]   = useState('')
  const [participantGroup,  setParticipantGroup]  = useState('')
  const [participantAge,    setParticipantAge]    = useState('')
  const [participantGender, setParticipantGender] = useState('')
  const [currentStep,       setCurrentStep]       = useState(1)
  const [sessionClosed,     setSessionClosed]     = useState(false)

  useEffect(() => {
    socket.connect()
    socket.on('step:change', ({ step }) => setCurrentStep(step))
    socket.on('session:closed', () => setSessionClosed(true))

    // Try to restore participant session from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('co2sprint_participant_'))
    if (keys.length > 0) {
      const key = keys[keys.length - 1]
      try {
        const saved = JSON.parse(localStorage.getItem(key))
        api.get(`/api/sessions/${saved.code}/info`)
          .then(res => {
            if (res.data.status === 'active') {
              setSessionCode(saved.code)
              setParticipantName(saved.name || '')
              setParticipantGroup(saved.group || '')
              setParticipantAge(saved.age || '')
              setParticipantGender(saved.gender || '')
              socket.emit('session:join', {
                code:   saved.code,
                name:   saved.name,
                group:  saved.group,
                age:    saved.age,
                gender: saved.gender,
              })
            } else {
              localStorage.removeItem(key)
            }
          })
          .catch(() => localStorage.removeItem(key))
      } catch {
        localStorage.removeItem(key)
      }
    }

    return () => {
      socket.off('step:change')
      socket.off('session:closed')
      socket.disconnect()
    }
  }, [])

  function joinSession(code, name, group, age, gender) {
    setSessionCode(code)
    setParticipantName(name)
    setParticipantGroup(group)
    setParticipantAge(age || '')
    setParticipantGender(gender || '')
    setSessionClosed(false)
    socket.emit('session:join', { code, name, group, age, gender })
  }

  function clearSession() {
    // Clear participant and progress keys from localStorage
    Object.keys(localStorage)
      .filter(k => k.startsWith('co2sprint_participant_') || k.startsWith('co2sprint_progress_'))
      .forEach(k => localStorage.removeItem(k))
    setSessionCode(null)
    setParticipantName('')
    setParticipantGroup('')
    setParticipantAge('')
    setParticipantGender('')
    setCurrentStep(1)
    setSessionClosed(false)
    socket.disconnect()
    socket.connect()
  }

  return (
    <SessionContext.Provider value={{
      sessionCode,
      currentStep,
      participantName,
      participantGroup,
      participantAge,
      participantGender,
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
