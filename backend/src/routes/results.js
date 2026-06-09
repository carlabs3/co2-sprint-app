import { Router } from 'express'
import { Resend } from 'resend'
import { authMiddleware } from '../middleware/authMiddleware.js'
import FootprintResult from '../models/FootprintResult.js'

const router = Router()


// Enviar resultados por email — público
router.post('/send-email', async (req, res) => {
  const { email, carbonTons, category, areas } = req.body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email no válido' })
  }
  if (carbonTons == null || !category) {
    return res.status(400).json({ error: 'Faltan datos del resultado' })
  }
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Servicio de email no configurado' })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'CO2 Sprint <noreply@threeoclock.co>',
      to: email,
      subject: `Tu huella de carbono — ${Number(carbonTons).toFixed(1)} t CO₂/año`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #2d5a27; font-size: 28px; margin-bottom: 8px;">Tu huella de carbono</h1>
          <p style="color: #666; margin-bottom: 32px;">Resultado del taller CO2 Sprint</p>

          <div style="background: #2d5a27; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <p style="color: #c8e6c0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px;">Tu huella total</p>
            <h2 style="color: #fff; font-size: 52px; font-weight: 700; margin: 0;">${Number(carbonTons).toFixed(1)} t <span style="font-size: 20px; color: #c8e6c0;">CO₂/año</span></h2>
            <span style="background: rgba(255,255,255,0.15); color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 13px; display: inline-block; margin-top: 12px; text-transform: uppercase; letter-spacing: 0.08em;">${category}</span>
          </div>

          <h3 style="color: #1a1a1a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;">Desglose por áreas</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #555;">🚗 Transporte</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600;">${Number(areas?.transport || 0).toFixed(1)} t</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #555;">⚡ Energía</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600;">${Number(areas?.energy || 0).toFixed(1)} t</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #555;">🥗 Alimentación</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600;">${Number(areas?.food || 0).toFixed(1)} t</td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 10px 0; color: #555;">🛍️ Consumo</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600;">${Number(areas?.consumption || 0).toFixed(1)} t</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #555;">♻️ Residuos</td>
              <td style="padding: 10px 0; text-align: right; font-weight: 600;">${Number(areas?.waste || 0).toFixed(1)} t</td>
            </tr>
          </table>

          <p style="color: #aaa; font-size: 11px; margin-top: 32px; text-align: center;">
            CO2 Sprint · Taller de huella de carbono
          </p>
        </div>
      `,
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Email error:', err.message)
    res.status(500).json({ error: 'Error al enviar el email' })
  }
})

// Todos los resultados — requiere JWT
router.get('/:code', authMiddleware, async (req, res) => {
  try {
    const results = await FootprintResult.find({ sessionCode: req.params.code })
    res.json(results)
  } catch {
    res.status(500).json({ error: 'Error al obtener resultados' })
  }
})

// Ranking individual anónimo — público
router.get('/:code/ranking', async (req, res) => {
  try {
    const results = await FootprintResult.find({ sessionCode: req.params.code })
      .select('group carbonTons category areas answers -_id')
      .sort({ carbonTons: 1 })
    res.json(results)
  } catch {
    res.status(500).json({ error: 'Error al obtener ranking' })
  }
})

// Ranking grupal — público
router.get('/:code/ranking/groups', async (req, res) => {
  try {
    const results = await FootprintResult.aggregate([
      { $match: { sessionCode: req.params.code } },
      {
        $group: {
          _id: '$group',
          avg: { $avg: '$carbonTons' },
          min: { $min: '$carbonTons' },
          max: { $max: '$carbonTons' },
          count: { $sum: 1 },
        },
      },
      { $sort: { avg: 1 } },
    ])
    res.json(results)
  } catch {
    res.status(500).json({ error: 'Error al obtener ranking grupal' })
  }
})

// Estadísticas — público
router.get('/:code/stats', async (req, res) => {
  try {
    const results = await FootprintResult.find({ sessionCode: req.params.code })
    if (!results.length) return res.json({ totalParticipants: 0 })

    const tons = results.map(r => r.carbonTons)
    const average = tons.reduce((a, b) => a + b, 0) / tons.length
    const min = Math.min(...tons)
    const max = Math.max(...tons)

    const groupMap = {}
    for (const r of results) {
      if (!groupMap[r.group]) groupMap[r.group] = { total: 0, count: 0 }
      groupMap[r.group].total += r.carbonTons
      groupMap[r.group].count += 1
    }
    const byGroup = Object.entries(groupMap).map(([group, d]) => ({
      group,
      average: d.total / d.count,
      total: d.total,
      count: d.count,
    }))

    res.json({ average, min, max, totalParticipants: results.length, byGroup })
  } catch {
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

export default router
