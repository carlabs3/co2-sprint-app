import { Schema, model } from 'mongoose'

const footprintResultSchema = new Schema({
  sessionCode: { type: String, required: true },
  participantId: { type: Schema.Types.ObjectId, ref: 'Participant' },
  group: { type: String, required: true },
  carbonTons: { type: Number, required: true },
  areas: {
    transport: Number,
    energy: Number,
    food: Number,
    consumption: Number,
    waste: Number,
  },
  category: { type: String, enum: ['bajo', 'medio', 'alto', 'muy alto'] },
  answers:  { type: Schema.Types.Mixed },
}, { timestamps: true })

export default model('FootprintResult', footprintResultSchema)
