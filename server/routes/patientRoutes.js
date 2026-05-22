import express from 'express';
const router = express.Router();
import { getPatients, createPatient, updatePatient, deletePatient } from '../controllers/patientController.js';

router.route('/')
  .get(getPatients)
  .post(createPatient);

router.route('/:id')
  .put(updatePatient)
  .delete(deletePatient);

export default router;
