import { Schema, model } from 'mongoose'

const teamActionsSchema = new Schema({
  sessionCode:    { type: String,  required: true },
  group:          { type: String,  required: true },
  actions:        [String],
  pointsUsed:     { type: Number,  default: 0 },
  confirmed:      { type: Boolean, default: false },
  confirmedFinal: { type: Boolean, default: false },
  totalReduction: { type: Number,  default: 0 },
}, { timestamps: true })

teamActionsSchema.index({ sessionCode: 1, group: 1 }, { unique: true })

export default model('TeamActions', teamActionsSchema)
