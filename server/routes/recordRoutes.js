import express from 'express';
const router = express.Router();
import { getPatientRecords, getRecords, createRecord } from '../controllers/recordController.js';

router.route('/')
  .get(getRecords)
  .post(createRecord);

router.route('/patient/:patientId')
  .get(getPatientRecords);

export default router;
