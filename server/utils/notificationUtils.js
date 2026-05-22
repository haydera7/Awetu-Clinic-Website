import Notification from '../models/Notification.js';

/**
 * Sends a persistent notification (Saves to DB and Emits via Socket)
 * @param {Object} io - Socket.io instance
 * @param {Object} data - { message, type, role, userId }
 */
export const sendPersistentNotification = async (io, { message, type, role, department, userId }) => {
  try {
    // 1. Save to Database
    const notification = await Notification.create({
      message,
      type: type || 'info',
      role,
      department,
      userId
    });

    // 2. Emit via Socket
    if (io) {
      if (userId) {
        // Send to specific user
        io.to(userId.toString()).emit('notification', {
          id: notification._id,
          message,
          type: type || 'info',
          createdAt: notification.createdAt
        });
      } else if (department) {
        // Send to specific department (joined as room on client)
        io.to(department).emit('notification', {
          id: notification._id,
          message,
          type: type || 'info',
          createdAt: notification.createdAt
        });
      } else if (role) {
        // Send to specific role
        io.to(role).emit('notification', {
          id: notification._id,
          message,
          type: type || 'info',
          createdAt: notification.createdAt
        });
      } else {
        // Send to everyone
        io.emit('notification', {
          id: notification._id,
          message,
          type: type || 'info',
          createdAt: notification.createdAt
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Failed to send persistent notification:', error.message);
  }
};

import { getTranslatedSMS } from './translationUtils.js';

export const sendLocalizedPersistentNotification = async (io, patient, templateKey, data, type) => {
  if (!patient) return false;
  const language = patient.preferredLanguage || 'English';
  let localizedMessage = getTranslatedSMS(templateKey, data, language);
  
  // Strip the generic prefix for in-app notifications
  localizedMessage = localizedMessage.replace('HealthCare Pro: ', '');
  
  return sendPersistentNotification(io, {
    message: localizedMessage,
    type,
    userId: patient._id || patient.id || patient.pid
  });
};
