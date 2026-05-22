import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for role-based notifications
  },
  role: {
    type: String,
    required: false
  },
  department: {
    type: String,
    required: false
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'danger'],
    default: 'info'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
