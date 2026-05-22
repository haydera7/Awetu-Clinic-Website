import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  visitId: { type: String, required: true, unique: true }, // e.g., V-1234
  patientId: { type: String, required: true },
  patientName: { type: String },
  date: { type: String },
  time: { type: String },
  type: { type: String, required: true },
  doctor: { type: String },
  status: { 
    type: String, 
    default: 'Waiting',
    enum: ['Waiting', 'Scheduled', 'In Session', 'In Consultation', 'Lab/Pharmacy', 'Pharmacy Queue', 'Lab Requested', 'Results Ready', 'Ready for Treatment', 'Awaiting Payment', 'Completed', 'Referred']
  },
  reason: { type: String, required: true }
}, {
  timestamps: true
});

export default mongoose.model('Visit', visitSchema);
