import { Schema, model } from 'mongoose'

const participantSchema = new Schema({
  sessionCode: { type: String, required: true },
  name: { type: String, default: 'Anónimo' },
  group: { type: String, required: true },
  socketId: { type: String, default: null },
}, { timestamps: true })

export default model('Participant', participantSchema)
