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
const participantNames = new Map()

// Unique participant tracker: code -> Map(uniqueKey -> { name, group, socketId })
const sessionParticipants = new Map()

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('facilitator:join', async ({ code }) => {
      socket.join(code)
      try {
        const mapSize = sessionParticipants.get(code)?.size ?? 0
        const total = mapSize > 0 ? mapSize : await Participant.countDocuments({ sessionCode: code })
        socket.emit('participant:joined', { total })
      } catch {}
    })

    socket.on('session:join', async ({ code, name, group, age, gender }) => {
      try {
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

        // Track unique participant by group+name (reconnects reuse the same slot)
        const uniqueKey = `${group}_${name || socket.id}`
        if (!sessionParticipants.has(code)) sessionParticipants.set(code, new Map())
        sessionParticipants.get(code).set(uniqueKey, { name, group, socketId: socket.id })
        const totalUnique = sessionParticipants.get(code).size

        socket.join(code)
        io.to(code).emit('participant:joined', { total: totalUnique, name, group })

        const session = await Session.findOne({ code }, 'status currentStep resultsRevealed deleted')
        if (session) {
          if (session.currentStep >= 2) {
            socket.emit('step:change', { step: session.currentStep })
          }
          if (session.resultsRevealed) {
            socket.emit('results:revealed')
          }
          if (session.status === 'closed' || session.deleted) {
            socket.emit('session:closed')
          }
        }
      } catch {
        socket.emit('error', { message: 'Error al unirse a la sesión' })
      }
    })

    socket.on('team:join', async ({ code, group }) => {
      try {
        socket.join(code)
        socket.data.teamGroup = group
        socket.data.isTeamScreen = true

        const [session, results] = await Promise.all([
          Session.findOne({ code }, 'status currentStep resultsRevealed deleted'),
          FootprintResult.find({ sessionCode: code }),
        ])

        if (session?.currentStep >= 2) {
          socket.emit('step:change', { step: session.currentStep })
        }
        if (session?.resultsRevealed) {
          socket.emit('results:revealed')
        }
        if (session?.status === 'closed' || session?.deleted) {
          socket.emit('session:closed')
        }

        if (results.length > 0) {
          const individual = results.map(r => ({
            name:     participantNames.get(r.participantId?.toString()) || 'Anónimo',
            group:    r.group,
            tons:     r.carbonTons,
            category: r.category,
            areas:    r.areas || {},
            answers:  r.answers || {},
          }))
          socket.emit('ranking:update', { individual })
        }
      } catch {
        socket.emit('error', { message: 'Error al unirse como equipo' })
      }
    })

    socket.on('step:change', async ({ sessionCode, step }) => {
      try {
        await Session.findOneAndUpdate({ code: sessionCode }, { currentStep: step })
        io.to(sessionCode).emit('step:change', { step })
      } catch {}
    })

    socket.on('results:reveal', async ({ sessionCode }) => {
      try {
        await Session.findOneAndUpdate({ code: sessionCode }, { resultsRevealed: true })
      } catch {}
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

        if (participant?._id) {
          const existing = await FootprintResult.findOne({ sessionCode, participantId: participant._id })
          if (existing) {
            await FootprintResult.findByIdAndUpdate(existing._id, {
              carbonTons, areas: mappedAreas, answers: answers || {}, category,
            })
          } else {
            await FootprintResult.create({
              sessionCode, participantId: participant._id, group,
              carbonTons, areas: mappedAreas, category, answers: answers || {},
            })
          }
        } else {
          await FootprintResult.create({
            sessionCode, participantId: null, group,
            carbonTons, areas: mappedAreas, category, answers: answers || {},
          })
        }

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

      // Mark disconnected but keep in unique count so it doesn't drop
      sessionParticipants.forEach(participants => {
        participants.forEach(p => {
          if (p.socketId === socket.id) p.socketId = null
        })
      })
    })
  })
}
