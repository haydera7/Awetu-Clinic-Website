import express from 'express';
const router = express.Router();
import { registerUser, loginUser, googleLogin, getMe, patientLogin } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/patient-login', patientLogin);
router.post('/google', googleLogin);
router.get('/me', protect, getMe);

export default router;
