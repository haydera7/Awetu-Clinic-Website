import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { role, _id } = req.user;

    // Find notifications for this specific user OR for their role (matching their department)
    const notifications = await Notification.find({
      $or: [
        { userId: _id },
        {
          role: role,
          $or: [
            { department: { $exists: false } },
            { department: null },
            { department: req.user.department }
          ]
        }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const { role, _id } = req.user;

    if (!_id) {
      return res.status(401).json({ message: 'User identity not found' });
    }

    // Cast to ObjectId to be safe
    const userObjectId = mongoose.Types.ObjectId.isValid(_id)
      ? new mongoose.Types.ObjectId(_id)
      : _id;

    // Build query to clear both personal, role-based, and department-based unread notifications
    const query = {
      $and: [
        { isRead: false },
        {
          $or: [
            { userId: userObjectId },
            {
              role: role,
              $or: [
                { department: { $exists: false } },
                { department: null },
                { department: req.user.department }
              ]
            }
          ]
        }
      ]
    };

    const result = await Notification.updateMany(query, { isRead: true });

    console.log(`Notifications cleared for user ${_id} (${role}): ${result.modifiedCount} items`);
    res.json({ message: 'All marked as read', count: result.modifiedCount });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

export { getNotifications, markAsRead, markAllAsRead };
