import express from 'express';
const router = express.Router();
import { getStaffs, createStaff, updateStaff, deleteStaff } from '../controllers/staffController.js';

router.route('/')
  .get(getStaffs)
  .post(createStaff);

router.route('/:id')
  .put(updateStaff)
  .delete(deleteStaff);

export default router;
