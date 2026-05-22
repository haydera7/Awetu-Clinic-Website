import express from 'express';
const router = express.Router();
import { getBills, createManualInvoice, addPayment, initOnlinePayment, verifyOnlinePayment, chapaWebhook, deleteBill } from '../controllers/billingController.js';

router.route('/')
  .get(getBills);

router.route('/:id')
  .delete(deleteBill);

router.post('/manual', createManualInvoice);
router.post('/chapa-webhook', chapaWebhook);
router.post('/:id/pay', addPayment);
router.post('/:id/chapa-init', initOnlinePayment);
router.get('/chapa-verify', verifyOnlinePayment);

export default router;
