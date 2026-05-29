import { Schema, model } from 'mongoose'

const sessionSchema = new Schema({
  code: { type: String, required: true, unique: true },
  facilitatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: '' },
  groups: [String],
  status: { type: String, enum: ['waiting', 'active', 'closed'], default: 'waiting' },
  resultsRevealed: { type: Boolean, default: false },
}, { timestamps: true })

export default model('Session', sessionSchema)
