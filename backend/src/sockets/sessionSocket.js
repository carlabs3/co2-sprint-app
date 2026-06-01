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

// In-memory name store: participantId (string) -> display name
// Names are never written to DB, only used for live ranking display
const participantNames = new Map()

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('facilitator:join', async ({ code }) => {
      socket.join(code)
      try {
        const count = await Participant.countDocuments({ sessionCode: code })
        socket.emit('participant:joined', { count })
      } catch {}
    })

    socket.on('session:join', async ({ code, name, group, age, gender }) => {
      try {
        // Store name in socket memory only — never written to DB
        socket.data.name = name || 'Anónimo'
        socket.data.group = group
        socket.data.sessionCode = code

        const participant = await Participant.findOneAndUpdate(
          { socketId: socket.id },
          { sessionCode: code, group, age: age || '', gender: gender || '', socketId: socket.id },
          { upsert: true, new: true }
        )
        if (participant?._id) {
          participantNames.set(participant._id.toString(), socket.data.name)
        }

        socket.join(code)
        const count = await Participant.countDocuments({ sessionCode: code })
        io.to(code).emit('participant:joined', { count })

        const session = await Session.findOne({ code }, 'status currentStep')
        if (session?.currentStep > 1) {
          socket.emit('step:change', { step: session.currentStep })
        }
      } catch {
        socket.emit('error', { message: 'Error al unirse a la sesión' })
      }
    })

    socket.on('step:change', async ({ sessionCode, step }) => {
      try {
        await Session.findOneAndUpdate({ code: sessionCode }, { currentStep: step })
        io.to(sessionCode).emit('step:change', { step })
      } catch {}
    })

    socket.on('results:reveal', ({ sessionCode }) => {
      io.to(sessionCode).emit('results:revealed')
    })

    socket.on('footprint:submit', async ({ sessionCode, group, carbonTons, areas, answers }) => {
      try {
        const participant = await Participant.findOne({ socketId: socket.id }) ||
          await Participant.findOne({ sessionCode, group })

        if (participant?._id && socket.data.name) {
          participantNames.set(participant._id.toString(), socket.data.name)
        }

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
          answers: answers || {},
        })

        const results = await FootprintResult.find({ sessionCode }).sort({ carbonTons: 1 })

        const individual = results.map(r => ({
          name: participantNames.get(r.participantId?.toString()) || 'Anónimo',
          group: r.group,
          tons: r.carbonTons,
          category: r.category,
          areas: r.areas || {},
          answers: r.answers || {},
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
