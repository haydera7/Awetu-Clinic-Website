import express from 'express';
const router = express.Router();
import { getInventory, addInventoryItem, updateStock } from '../controllers/inventoryController.js';

router.route('/')
  .get(getInventory)
  .post(addInventoryItem);

router.route('/:id/stock')
  .put(updateStock);

export default router;
