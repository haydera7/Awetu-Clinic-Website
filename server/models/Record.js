import mongoose from 'mongoose';

const recordSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  visitId: { type: String },
  type: { 
    type: String, 
    required: true,
    enum: ['Diagnosis', 'Vitals', 'Lab Request', 'Lab Result', 'Prescription', 'Referral', 'Treatment/Procedure'] 
  },
  title: { type: String },
  notes: { type: String },
  fileName: { type: String },
  fileData: { type: String },
  referenceId: { type: String },
  doctor: { type: String },
  date: { type: Date, default: Date.now },
  
  // Vitals specific fields (only populated if type === 'Vitals')
  vitals: {
    bp: { type: String },
    heartRate: { type: Number },
    temp: { type: Number },
    weight: { type: Number }
  }
}, {
  timestamps: true
});

export default mongoose.model('Record', recordSchema);
