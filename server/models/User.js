import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true,
    enum: ['Doctor', 'Nurse', 'Receptionist', 'Pharmacist', 'Lab Technician', 'Admin']
  },
  empId: { type: String, required: true, unique: true },
  department: { type: String, default: 'General' },
  phone: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  avatarColor: { type: String, default: '#3b82f6' }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);
