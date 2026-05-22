import express from 'express';
const router = express.Router();
import { 
  getAppointments, 
  createAppointment, 
  updateAppointmentStatus, 
  deleteAppointment 
} from '../controllers/appointmentController.js';

router.route('/')
  .get(getAppointments)
  .post(createAppointment);

router.route('/:id/status')
  .put(updateAppointmentStatus);

router.route('/:id')
  .delete(deleteAppointment);

export default router;
