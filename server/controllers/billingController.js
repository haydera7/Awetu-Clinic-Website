import mongoose from 'mongoose';
import Bill from '../models/Bill.js';
import Visit from '../models/Visit.js';
import Inventory from '../models/Inventory.js';
import Patient from '../models/Patient.js';
import { initializePayment, verifyPayment } from '../utils/chapaService.js';

// In-memory lock to prevent race conditions between webhook and redirect callback
const processingTransactions = new Set();

// @desc    Get all bills
// @route   GET /api/billing
// @access  Private
const getBills = async (req, res) => {
  try {
    const bills = await Bill.find()
      .sort({ date: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create manual OTC invoice
// @route   POST /api/billing/manual
// @access  Private
// Helper: find inventory item by either MongoDB _id or custom itemId
const findInventoryItem = async (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await Inventory.findById(id);
    if (byId) return byId;
  }
  return Inventory.findOne({ itemId: id });
};

const createManualInvoice = async (req, res) => {
  try {
    const { patientName, items } = req.body;
    let totalCost = 0;
    const billedItems = [];

    // Deduct stock and calculate total
    for (let item of items) {
      const med = await findInventoryItem(item.medicineId);
      if (med && item.qty > 0) {
        const cost = item.qty * med.unitPrice;
        totalCost += cost;
        billedItems.push({ desc: med.name, qty: item.qty, cost });
        
        med.stock -= item.qty;
        med.status = med.stock <= 100 ? 'Low Stock' : 'In Stock';
        if (med.stock === 0) med.status = 'Out of Stock';
        await med.save();
      }
    }

    if (totalCost === 0) {
      return res.status(400).json({ message: 'Invalid items or zero cost' });
    }

    const invoiceId = `INV-${Math.floor(10000 + Math.random() * 90000)}`;

    const newBill = await Bill.create({
      invoiceId,
      patientName: patientName || 'Walk-in Patient',
      source: 'OTC',
      items: billedItems,
      totalAmount: totalCost,
      paidAmount: 0,
      status: 'Unpaid'
    });

    res.status(201).json(newBill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Helper: Send notifications after successful payment
const notifyPaymentSuccess = async (req, bill, amount, method) => {
  const io = req.app.get('io');
  const { sendPersistentNotification } = await import('../utils/notificationUtils.js');

  const displayMethod = method.toUpperCase();
  const message = `Payment Received: ETB ${amount.toLocaleString()} via ${displayMethod} for ${bill.patientName}`;

  // Persistent Notifications for Admin and Pharmacist
  await sendPersistentNotification(io, {
    message,
    type: 'success',
    role: 'Admin'
  });

  await sendPersistentNotification(io, {
    message,
    type: 'success',
    role: 'Pharmacist'
  });

  // Persistent Notification for Patient
  if (bill.patientId) {
    import('../utils/notificationUtils.js').then(async ({ sendLocalizedPersistentNotification }) => {
      try {
        const patientQuery = mongoose.Types.ObjectId.isValid(bill.patientId) ? { _id: bill.patientId } : { pid: bill.patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient) {
          await sendLocalizedPersistentNotification(io, patient, 'paymentSuccess', { amount: amount.toLocaleString(), method: displayMethod }, 'success');
        }
      } catch (err) {
        console.error('Notification Error:', err.message);
      }
    });
    // Send SMS asynchronously
    import('../utils/smsService.js').then(async ({ sendLocalizedSMS }) => {
      try {
        const patientQuery = mongoose.Types.ObjectId.isValid(bill.patientId) ? { _id: bill.patientId } : { pid: bill.patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient && patient.phone) {
          await sendLocalizedSMS(patient, 'paymentSuccess', { amount: amount.toLocaleString(), method: displayMethod });
        }
      } catch (err) {
        console.error('SMS Error:', err.message);
      }
    });
  }
};

// @desc    Add payment to an invoice
// @route   POST /api/billing/:id/pay
// @access  Private
const addPayment = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const bill = await Bill.findById(req.params.id);

    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const newPaidAmount = bill.paidAmount + amount;
    
    if (newPaidAmount > bill.totalAmount) {
      return res.status(400).json({ message: 'Payment exceeds total amount' });
    }

    bill.paidAmount = newPaidAmount;
    
    if (newPaidAmount >= bill.totalAmount) {
      bill.status = 'Paid';
      if (bill.visitId && bill.visitId.trim() !== '') {
        const vQuery = mongoose.Types.ObjectId.isValid(bill.visitId) ? { _id: bill.visitId } : { visitId: bill.visitId };
        const currentVisit = await Visit.findOne(vQuery);
        if (currentVisit && currentVisit.status === 'Ready for Treatment') {
          // Keep it in 'Ready for Treatment' so the nurse dashboard is not cleared
          const io = req.app.get('io');
          if (io) {
            io.emit('visit-updated', currentVisit);
          }
        } else {
          const updatedVisit = await Visit.findOneAndUpdate(vQuery, { status: 'Completed' }, { new: true });
          
          // Also update patient status to Inactive when visit is completed
          const io = req.app.get('io');
          if (updatedVisit && updatedVisit.patientId) {
            const patientQuery = mongoose.Types.ObjectId.isValid(updatedVisit.patientId) ? { _id: updatedVisit.patientId } : { pid: updatedVisit.patientId };
            const updatedPatient = await Patient.findOneAndUpdate(patientQuery, { status: 'Inactive' }, { new: true });
            if (io && updatedPatient) {
              io.emit('patient-updated', updatedPatient);
            }
          }
          
          // Notify all roles about visit completion
          if (io && updatedVisit) {
            io.emit('visit-updated', updatedVisit);
          }
        }
      }
    } else {
      bill.status = 'Partial';
    }

    bill.payments.push({
      txId: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
      amount,
      method,
    });

    await bill.save();

    // Send Notifications
    await notifyPaymentSuccess(req, bill, amount, method);

    res.json(bill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Initialize Chapa online payment
// @route   POST /api/billing/:id/chapa-init
// @access  Private
const initOnlinePayment = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    if (bill.status === 'Paid') return res.status(400).json({ message: 'Bill already paid' });

    const amount = bill.totalAmount - bill.paidAmount;
    const tx_ref = `TX-${Date.now()}-${bill._id}`;
    
    // Attempt to get patient email/name if they exist
    let email = 'patient@healthcare.com';
    let firstName = bill.patientName.split(' ')[0] || 'Patient';
    let lastName = bill.patientName.split(' ')[1] || 'User';

    if (bill.patientId) {
      const patientQuery = mongoose.Types.ObjectId.isValid(bill.patientId) ? { _id: bill.patientId } : { pid: bill.patientId };
      const patient = await Patient.findOne(patientQuery);
      if (patient) {
        if (patient.email) email = patient.email;
        firstName = patient.name.split(' ')[0];
        lastName = patient.name.split(' ')[1] || '';
      }
    }

    const returnUrl = `${req.headers.origin || 'http://localhost:5173'}/dashboard/billing/verify?tx_ref=${tx_ref}`;

    const chapaData = await initializePayment(tx_ref, amount, email, firstName, lastName, returnUrl);
    
    if (chapaData.status === 'success') {
      res.json({ checkout_url: chapaData.checkout_url });
    } else {
      res.status(400).json({ message: chapaData.message || 'Failed to initialize payment' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify Chapa payment via Callback
// @route   GET /api/billing/chapa-verify
// @access  Private
const verifyOnlinePayment = async (req, res) => {
  try {
    const { tx_ref, status } = req.query; // If mock mode, status might be passed in query
    
    if (processingTransactions.has(tx_ref)) {
      return res.json({ message: 'Transaction is already being verified. Please wait.' });
    }
    processingTransactions.add(tx_ref);

    try {
      // In mock mode, we assume success if tx_ref is provided
      let verifyResult = { status: 'success', amount: null };
      
      if (process.env.CHAPA_SECRET_KEY) {
        verifyResult = await verifyPayment(tx_ref);
      } else if (status !== 'success') {
         return res.status(400).json({ message: 'Payment verification failed (Mock)' });
      }

      if (verifyResult.status === 'success') {
        // Extract bill ID from tx_ref (Format: TX-timestamp-billId)
        const parts = tx_ref.split('-');
        const billId = parts[2];
        
        const bill = await Bill.findById(billId);
        if (!bill) return res.status(404).json({ message: 'Bill not found during verification' });
        
        const alreadyProcessed = bill.payments.some(p => p.txId === tx_ref);
        if (alreadyProcessed || bill.status === 'Paid') {
           return res.json({ message: 'Already verified', bill });
        }

        const amountPaid = verifyResult.amount || (bill.totalAmount - bill.paidAmount); // fallback to full remaining in mock mode

        bill.paidAmount += amountPaid;
        bill.status = bill.paidAmount >= bill.totalAmount ? 'Paid' : 'Partial';
        
        bill.payments.push({
          txId: tx_ref,
          amount: amountPaid,
          method: verifyResult.method || 'Online',
        });

        if (bill.status === 'Paid' && bill.visitId && bill.visitId.trim() !== '') {
          const vQuery = mongoose.Types.ObjectId.isValid(bill.visitId) ? { _id: bill.visitId } : { visitId: bill.visitId };
          const currentVisit = await Visit.findOne(vQuery);
          if (currentVisit && currentVisit.status === 'Ready for Treatment') {
            // Keep it in 'Ready for Treatment' so the nurse dashboard is not cleared
            const io = req.app.get('io');
            if (io) {
              io.emit('visit-updated', currentVisit);
            }
          } else {
            const updatedVisit = await Visit.findOneAndUpdate(vQuery, { status: 'Completed' }, { new: true });
            
            // Also update patient status to Inactive when visit is completed
            const io = req.app.get('io');
            if (updatedVisit && updatedVisit.patientId) {
              const patientQuery = mongoose.Types.ObjectId.isValid(updatedVisit.patientId) ? { _id: updatedVisit.patientId } : { pid: updatedVisit.patientId };
              const updatedPatient = await Patient.findOneAndUpdate(patientQuery, { status: 'Inactive' }, { new: true });
              if (io && updatedPatient) {
                io.emit('patient-updated', updatedPatient);
              }
            }
            
            // Notify all roles about visit completion
            if (io && updatedVisit) {
              io.emit('visit-updated', updatedVisit);
            }
          }
        }

        await bill.save();

        // Notifications
        await notifyPaymentSuccess(req, bill, amountPaid, verifyResult.method || 'Online');

        res.json({ message: 'Payment verified and recorded successfully', bill });
      } else {
        res.status(400).json({ message: verifyResult.message || 'Payment verification failed' });
      }
    } finally {
      processingTransactions.delete(tx_ref);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Chapa Webhook handler
// @route   POST /api/billing/chapa-webhook
// @access  Public
const chapaWebhook = async (req, res) => {
  try {
    const { tx_ref, status } = req.body;
    
    console.log(`🔔 Chapa Webhook Received: ${tx_ref} [${status}]`);

    if (status === 'success') {
      if (processingTransactions.has(tx_ref)) {
        console.log(`🔔 Webhook: Transaction ${tx_ref} is currently being processed by another request.`);
        return res.status(200).send('OK');
      }
      processingTransactions.add(tx_ref);

      try {
        const verifyResult = await verifyPayment(tx_ref);
        
        if (verifyResult.status === 'success') {
          const parts = tx_ref.split('-');
          const billId = parts[2];
          
          const bill = await Bill.findById(billId);
          if (bill && bill.status !== 'Paid') {
            const alreadyProcessed = bill.payments.some(p => p.txId === tx_ref);
            if (!alreadyProcessed) {
              const amountPaid = verifyResult.amount || (bill.totalAmount - bill.paidAmount);
              bill.paidAmount += amountPaid;
              bill.status = bill.paidAmount >= bill.totalAmount ? 'Paid' : 'Partial';
              
              bill.payments.push({
                txId: tx_ref,
                amount: amountPaid,
                method: verifyResult.method || 'Online',
              });

              if (bill.status === 'Paid' && bill.visitId && bill.visitId.trim() !== '') {
                const vQuery = mongoose.Types.ObjectId.isValid(bill.visitId) ? { _id: bill.visitId } : { visitId: bill.visitId };
                const currentVisit = await Visit.findOne(vQuery);
                if (currentVisit && currentVisit.status === 'Ready for Treatment') {
                  // Keep it in 'Ready for Treatment' so the nurse dashboard is not cleared
                  const io = req.app.get('io');
                  if (io) {
                    io.emit('visit-updated', currentVisit);
                  }
                } else {
                  const updatedVisit = await Visit.findOneAndUpdate(vQuery, { status: 'Completed' }, { new: true });
                  
                  // Also update patient status to Inactive when visit is completed
                  const io = req.app.get('io');
                  if (updatedVisit && updatedVisit.patientId) {
                    const patientQuery = mongoose.Types.ObjectId.isValid(updatedVisit.patientId) ? { _id: updatedVisit.patientId } : { pid: updatedVisit.patientId };
                    const updatedPatient = await Patient.findOneAndUpdate(patientQuery, { status: 'Inactive' }, { new: true });
                    if (io && updatedPatient) {
                      io.emit('patient-updated', updatedPatient);
                    }
                  }
                  
                  // Notify all roles about visit completion
                  if (io && updatedVisit) {
                    io.emit('visit-updated', updatedVisit);
                  }
                }
              }

              await bill.save();
              console.log(`✅ Webhook: Bill ${billId} updated to Paid`);
              
              // Notifications
              await notifyPaymentSuccess(req, bill, amountPaid, verifyResult.method || 'Online');
            }
          }
        }
      } finally {
        processingTransactions.delete(tx_ref);
      }
    }

    // Always respond with 200 to Chapa
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook Error:', error.message);
    res.status(500).send('Webhook Error');
  }
};

const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getBills,
  createManualInvoice,
  addPayment,
  initOnlinePayment,
  verifyOnlinePayment,
  chapaWebhook,
  deleteBill
};
