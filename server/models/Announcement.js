import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['General', 'Notice', 'Update', 'Critical'],
    default: 'General'
  },
  active: {
    type: Boolean,
    default: true
  },
  imageUrl: {
    type: String,
    required: false
  },
  createdBy: {
    type: String,
    default: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
