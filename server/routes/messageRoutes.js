import express from 'express';
import { getMessages, sendMessage, getContacts, markAsRead } from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/contacts/list', getContacts);
router.get('/:targetId', getMessages);
router.post('/', sendMessage);
router.put('/:senderId/read', markAsRead);

export default router;
