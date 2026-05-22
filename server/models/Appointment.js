import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    required: true,
    unique: true,
    default: () => `APT-${Math.floor(100000 + Math.random() * 900000)}`
  },
  patientId: {
    type: String,
    required: true
  },
  patientName: {
    type: String
  },
  doctorId: {
    type: String,
    required: true
  },
  doctorName: {
    type: String
  },
  date: {
    type: String,
    required: true
  },
  timeSlot: {
    type: String, // e.g., "10:30 AM"
    required: true
  },
  type: {
    type: String,
    enum: ['Follow-up', 'Chronic Care', 'Lab Result Review'],
    default: 'Follow-up'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Checked-In', 'Completed', 'Cancelled', 'No-Show'],
    default: 'Scheduled'
  },
  reason: {
    type: String
  },
  bookedBy: {
    type: String
  },
  checkInTime: {
    type: Date
  },
  visitId: {
    type: String
  }
}, {
  timestamps: true
});

// Index for quick lookups
appointmentSchema.index({ date: 1, doctorId: 1 });
appointmentSchema.index({ patientId: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
