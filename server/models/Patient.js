import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  pid: { type: String, required: true, unique: true }, // e.g., P-1234
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  bloodGroup: { type: String },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  dob: { type: String },
  allergy: { type: String, default: 'None' },
  lastVisit: { type: String },
  status: { type: String, default: 'Active' },
  preferredLanguage: { type: String, enum: ['English', 'Amharic', 'Oromic'], default: 'English' }
}, {
  timestamps: true
});

export default mongoose.model('Patient', patientSchema);
