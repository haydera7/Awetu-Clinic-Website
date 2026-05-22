import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true }, // e.g. INV-1234
  patientId: { type: String }, // null if walk-in
  visitId: { type: String },
  patientName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  source: { 
    type: String, 
    default: 'GENERAL',
    enum: ['PHARMACY', 'OTC', 'LAB', 'GENERAL']
  },
  referenceId: { type: String }, // e.g. rx_1234
  items: [{
    desc: { type: String, required: true },
    qty: { type: Number, required: true },
    cost: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: { 
    type: String, 
    default: 'Unpaid',
    enum: ['Unpaid', 'Partial', 'Paid']
  },
  payments: [{
    txId: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, required: true },
    recordedBy: { type: String }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Bill', billSchema);
