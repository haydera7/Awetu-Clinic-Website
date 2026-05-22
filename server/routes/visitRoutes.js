import express from 'express';
const router = express.Router();
import { getVisits, createVisit, updateVisitStatus, updateVisit, deleteVisit } from '../controllers/visitController.js';

router.route('/')
  .get(getVisits)
  .post(createVisit);

router.route('/:id')
  .put(updateVisit)
  .delete(deleteVisit);

router.route('/:id/status')
  .put(updateVisitStatus);

export default router;
