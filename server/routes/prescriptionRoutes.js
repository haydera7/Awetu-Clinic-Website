import express from 'express';
const router = express.Router();
import { getPrescriptions, createPrescription, dispensePrescription } from '../controllers/prescriptionController.js';

router.route('/')
  .get(getPrescriptions)
  .post(createPrescription);

router.post('/:id/dispense', dispensePrescription);

export default router;
