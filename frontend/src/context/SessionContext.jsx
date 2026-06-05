import { createContext, useContext, useState, useEffect } from 'react'
import { socket } from '../utils/socket.js'

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
