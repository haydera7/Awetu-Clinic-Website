import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: { type: String, required: true, unique: true }, // rx_1234
  patientId: { type: String, required: true },
  visitId: { type: String },
  doctorId: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    default: 'PRESCRIBED',
    enum: ['PRESCRIBED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED', 'REFERRED']
  },
  items: [{
    itemId: { type: String },
    medicineId: { type: String, required: true },
    name: { type: String }, // cached name
    dosage: { type: String },
    requestedQty: { type: Number },
    dispensedQty: { type: Number, default: 0 },
    status: {
      type: String,
      default: 'PENDING',
      enum: ['PENDING', 'DISPENSED', 'OUT_OF_STOCK', 'REFERRED']
    },
    requiresNurse: { type: Boolean, default: false },
    nurseDepartment: { type: String, default: null }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Prescription', prescriptionSchema);
