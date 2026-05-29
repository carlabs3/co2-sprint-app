import { useSession } from '../context/SessionContext.jsx'

export default function SessionClosedBanner({ onViewPartial }) {
  const { sessionClosed } = useSession()

  if (!sessionClosed) return null

  return (
    <div style={{
      background: '#fce8e8',
      borderBottom: '1px solid #f5c1c1',
      padding: '0.7rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
      <span style={{ fontSize: '0.82rem', color: '#cc4444', flex: 1, lineHeight: 1.5 }}>
        El facilitador ha cerrado esta sesión. Tus resultados han sido guardados.
      </span>
      {onViewPartial && (
        <button
          onClick={onViewPartial}
          style={{
            background: 'transparent',
            border: '1px solid #cc4444',
            color: '#cc4444',
            borderRadius: 4,
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Ver mis resultados parciales
        </button>
      )}
    </div>
  )
}
