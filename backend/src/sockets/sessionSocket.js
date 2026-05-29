import Participant from '../models/Participant.js'
import FootprintResult from '../models/FootprintResult.js'
import Session from '../models/Session.js'

function getCategory(carbonTons) {
  if (carbonTons < 2) return 'bajo'
  if (carbonTons < 4) return 'medio'
  if (carbonTons < 6) return 'alto'
  return 'muy alto'
}

const AREA_KEY_MAP = {
  transporte:   'transport',
  energia:      'energy',
  alimentacion: 'food',
  consumo:      'consumption',
  residuos:     'waste',
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('facilitator:join', ({ code }) => {
      socket.join(code)
    })

    socket.on('session:join', async ({ code, name, group }) => {
      try {
        await Participant.create({
          sessionCode: code,
          name: name || 'Anónimo',
          group,
          socketId: socket.id,
        })
        socket.join(code)
        const count = await Participant.countDocuments({ sessionCode: code })
        io.to(code).emit('participant:joined', { count })

        // If session is already active, let this participant know immediately
        const session = await Session.findOne({ code }, 'status')
        if (session?.status === 'active') {
          socket.emit('step:change', { step: 2 })
        }
      } catch {
        socket.emit('error', { message: 'Error al unirse a la sesión' })
      }
    })

    socket.on('results:reveal', ({ sessionCode }) => {
      io.to(sessionCode).emit('results:revealed')
    })

    socket.on('footprint:submit', async ({ sessionCode, group, carbonTons, areas }) => {
      try {
        const participant = await Participant.findOne({ socketId: socket.id })
        const category = getCategory(carbonTons)
        const mappedAreas = Object.fromEntries(
          Object.entries(areas || {}).map(([k, v]) => [AREA_KEY_MAP[k] ?? k, v])
        )
        await FootprintResult.create({
          sessionCode,
          participantId: participant?._id,
          group,
          carbonTons,
          areas: mappedAreas,
          category,
        })

        const results = await FootprintResult.find({ sessionCode })
          .populate('participantId', 'name')
          .sort({ carbonTons: 1 })

        const individual = results.map(r => ({
          name: r.participantId?.name || 'Anónimo',
          group: r.group,
          tons: r.carbonTons,
          category: r.category,
          areas: r.areas || {},
        }))

        io.to(sessionCode).emit('ranking:update', { individual })
      } catch {
        socket.emit('error', { message: 'Error al guardar huella' })
      }
    })

    socket.on('disconnect', async () => {
      await Participant.findOneAndUpdate({ socketId: socket.id }, { socketId: null }).catch(() => {})
    })
  })
}
