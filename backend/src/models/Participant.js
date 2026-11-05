import { Schema, model } from 'mongoose'

const participantSchema = new Schema({
  sessionCode: { type: String, required: true },
  group: { type: String, required: true },
  pid:    { type: String, default: null }, // id estable del participante (localStorage)
  age:    { type: String, default: '' },
  gender: { type: String, default: '', enum: ['', 'female', 'male', 'nonbinary', 'undisclosed'] },
  socketId: { type: String, default: null },
}, { timestamps: true })

export default model('Participant', participantSchema)
