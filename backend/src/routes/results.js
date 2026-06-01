import { Router } from 'express'
import nodemailer from 'nodemailer'
import { authMiddleware } from '../middleware/authMiddleware.js'
import FootprintResult from '../models/FootprintResult.js'

const router = Router()

const SPAIN_AVG = 7.2

const CATEGORY_CONFIG = {
  bajo:       { label: 'Bajo',     color: '#7d9e7a', bg: '#f0f7ef', range: 'Menos de 2 t/año' },
  medio:      { label: 'Medio',    color: '#5a8a57', bg: '#edf5ec', range: '2–4 t/año' },
  alto:       { label: 'Alto',     color: '#b07a30', bg: '#faf3e8', range: '4–6 t/año' },
  'muy alto': { label: 'Muy alto', color: '#cc4444', bg: '#fdf0f0', range: 'Más de 6 t/año' },
}

const AREA_LABELS = {
  transport:   'Transporte',
  energy:      'Energía',
  food:        'Alimentación',
  consumption: 'Consumo',
  waste:       'Residuos',
}

let _transporter = null
function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    })
  }
  return _transporter
}

function buildEmailHtml({ carbonTons, category, areas, date }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['medio']

  const diffPct = Math.abs(Math.round(((carbonTons - SPAIN_AVG) / SPAIN_AVG) * 100))
  const isBelow = carbonTons < SPAIN_AVG
  const diffText = isBelow
    ? `Estás un ${diffPct}% por debajo de la media española (${SPAIN_AVG} t CO₂/año)`
    : `Estás un ${diffPct}% por encima de la media española (${SPAIN_AVG} t CO₂/año)`
  const diffColor = isBelow ? '#5a8a57' : '#b07a30'

  const areasRows = Object.entries(areas || {})
    .filter(([, v]) => v > 0)
    .map(([key, val]) => `
      <tr>
        <td style="padding:0.5rem 0;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#1a1a1a;border-bottom:1px solid #f0f0f0;">
          ${AREA_LABELS[key] || key}
        </td>
        <td style="padding:0.5rem 0;text-align:right;font-weight:700;font-size:14px;border-bottom:1px solid #f0f0f0;">
          ${Number(val).toFixed(1)} t
        </td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 16px;border-top:4px solid #2d5a27;">
          <p style="margin:0;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;color:#2d5a27;">CO2 SPRINT *</p>
          <p style="margin:4px 0 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Tu huella de carbono · ${date}</p>
        </td></tr>

        <!-- Hero -->
        <tr><td style="padding:0 32px 24px;">
          <div style="background:${cfg.bg};padding:32px;text-align:center;">
            <div style="font-size:64px;font-weight:900;color:#1a1a1a;line-height:1;">${Number(carbonTons).toFixed(1)}</div>
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#666;margin:6px 0 12px;">t CO₂ / año</div>
            <span style="background:${cfg.color};color:#fff;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">${cfg.label}</span>
            <p style="margin:8px 0 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.05em;">${cfg.range}</p>
          </div>
        </td></tr>

        <!-- Desglose por área -->
        <tr><td style="padding:0 32px 24px;border-top:2px solid #f0f0f0;">
          <p style="margin:24px 0 12px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#666;">Desglose por área</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${areasRows}
          </table>
        </td></tr>

        <!-- Comparativa con España -->
        <tr><td style="padding:0 32px 24px;border-top:2px solid #f0f0f0;">
          <p style="margin:24px 0 8px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#666;">Comparativa con España</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:${diffColor};">${diffText}</p>
          <p style="margin:6px 0 0;font-size:11px;color:#bbb;">Fuente: Ministerio para la Transición Ecológica, 2023</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;background:#f5f5f0;border-top:2px solid #f0f0f0;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#999;">
            Este email fue generado automáticamente durante el taller CO2 Sprint.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// Enviar resultados por email — público
router.post('/send-email', async (req, res) => {
  const { email, carbonTons, category, areas, sessionCode } = req.body

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email no válido' })
  }
  if (carbonTons == null || !category) {
    return res.status(400).json({ error: 'Faltan datos del resultado' })
  }

  const transport = getTransporter()
  if (!transport) {
    return res.status(503).json({ error: 'Servicio de email no configurado' })
  }

  const date = new Date().toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  try {
    await transport.sendMail({
      from: `"CO2 Sprint" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Tu huella de carbono — ${Number(carbonTons).toFixed(1)} t CO₂/año`,
      html: buildEmailHtml({ carbonTons, category, areas, date }),
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
      .populate('participantId', 'name group')
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
