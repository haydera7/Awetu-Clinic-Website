import express from 'express';
const router = express.Router();
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

router.route('/')
  .get(protect, getNotifications);

router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);

export default router;
