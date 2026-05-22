import express from 'express';
const router = express.Router();
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcementController.js';
import { protect } from '../middlewares/authMiddleware.js';

router.route('/')
  .get(getAnnouncements)
  .post(protect, createAnnouncement);

router.route('/:id')
  .put(protect, updateAnnouncement)
  .delete(protect, deleteAnnouncement);

export default router;
