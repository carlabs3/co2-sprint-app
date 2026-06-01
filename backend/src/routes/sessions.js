import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import Session from '../models/Session.js'
import FootprintResult from '../models/FootprintResult.js'
import { generateCode } from '../utils/generateCode.js'

const STEP_MAP = { waiting: 1, active: 2, closed: 3 }

export default function sessionsRouter(io) {
  const router = Router()

  // Public: info needed by join/waiting screens (groups, name, status, resultsRevealed)
  router.get('/:code/info', async (req, res) => {
    try {
      const session = await Session.findOne({ code: req.params.code }, 'code name groups status resultsRevealed')
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
      res.json({
        code: session.code,
        name: session.name,
        groups: session.groups,
        status: session.status,
        resultsRevealed: session.resultsRevealed,
      })
    } catch {
      res.status(500).json({ error: 'Error al obtener sesión' })
    }
  })

  router.use(authMiddleware)

  router.post('/', async (req, res) => {
    try {
      const { groups, name } = req.body
      const code = await generateCode()
      const session = await Session.create({
        code,
        facilitatorId: req.user.id,
        name: name || '',
        groups: groups || [],
      })
      res.status(201).json(session)
    } catch {
      res.status(500).json({ error: 'Error al crear sesión' })
    }
  })

  router.get('/', async (req, res) => {
    try {
      const sessions = await Session.find({ facilitatorId: req.user.id }).sort({ createdAt: -1 })
      res.json(sessions)
    } catch {
      res.status(500).json({ error: 'Error al obtener sesiones' })
    }
  })

  router.get('/:code', async (req, res) => {
    try {
      const session = await Session.findOne({ code: req.params.code, facilitatorId: req.user.id })
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
      res.json(session)
    } catch {
      res.status(500).json({ error: 'Error al obtener sesión' })
    }
  })

  router.patch('/:code/status', async (req, res) => {
    try {
      const { status } = req.body
      const session = await Session.findOneAndUpdate(
        { code: req.params.code, facilitatorId: req.user.id },
        { status },
        { new: true }
      )
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
      io.to(req.params.code).emit('step:change', { step: STEP_MAP[status] ?? 1 })
      res.json(session)
    } catch {
      res.status(500).json({ error: 'Error al actualizar estado' })
    }
  })

  router.patch('/:code/reveal', async (req, res) => {
    try {
      const code = req.params.code
      const results = await FootprintResult.find({ sessionCode: code })

      let summary = null
      if (results.length > 0) {
        const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length
        const values = results.map(r => r.carbonTons).sort((a, b) => a - b)
        const groupMap = results.reduce((acc, r) => {
          if (!acc[r.group]) acc[r.group] = []
          acc[r.group].push(r.carbonTons)
          return acc
        }, {})
        summary = {
          totalParticipants: results.length,
          averageCarbonTons: Math.round(avg(values) * 10) / 10,
          medianCarbonTons:  Math.round(values[Math.floor(values.length / 2)] * 10) / 10,
          minCarbonTons:     Math.round(values[0] * 10) / 10,
          maxCarbonTons:     Math.round(values[values.length - 1] * 10) / 10,
          byArea: {
            transport:   Math.round(avg(results.map(r => r.areas?.transport   || 0)) * 10) / 10,
            energy:      Math.round(avg(results.map(r => r.areas?.energy      || 0)) * 10) / 10,
            food:        Math.round(avg(results.map(r => r.areas?.food        || 0)) * 10) / 10,
            consumption: Math.round(avg(results.map(r => r.areas?.consumption || 0)) * 10) / 10,
            waste:       Math.round(avg(results.map(r => r.areas?.waste       || 0)) * 10) / 10,
          },
          byGroup: Object.entries(groupMap).map(([group, vals]) => ({
            group,
            average: Math.round(avg(vals) * 10) / 10,
            count: vals.length,
          })),
          calculatedAt: new Date(),
        }
      }

      const session = await Session.findOneAndUpdate(
        { code, facilitatorId: req.user.id },
        { resultsRevealed: true, ...(summary && { summary }) },
        { new: true }
      )
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
      io.to(code).emit('results:revealed')
      res.json(session)
    } catch {
      res.status(500).json({ error: 'Error al revelar resultados' })
    }
  })

  router.patch('/:code/step', async (req, res) => {
    try {
      const { step } = req.body
      const session = await Session.findOneAndUpdate(
        { code: req.params.code, facilitatorId: req.user.id },
        { currentStep: step },
        { new: true }
      )
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
      res.json({ ok: true })
    } catch {
      res.status(500).json({ error: 'Error al actualizar step' })
    }
  })

  router.delete('/:code', async (req, res) => {
    try {
      const session = await Session.findOneAndUpdate(
        { code: req.params.code, facilitatorId: req.user.id },
        { status: 'closed' },
        { new: true }
      )
      if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
      io.to(req.params.code).emit('session:closed')
      res.json({ message: 'Sesión cerrada', session })
    } catch {
      res.status(500).json({ error: 'Error al cerrar sesión' })
    }
  })

  return router
}
