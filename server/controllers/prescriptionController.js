import mongoose from 'mongoose';
import Prescription from '../models/Prescription.js';
import Visit from '../models/Visit.js';
import Bill from '../models/Bill.js';
import Inventory from '../models/Inventory.js';
import Patient from '../models/Patient.js';

// @desc    Get all prescriptions (or filter by patient/visit)
// @route   GET /api/prescriptions
// @access  Private
const getPrescriptions = async (req, res) => {
  try {
    const query = {};
    if (req.query.patientId) query.patientId = req.query.patientId;
    if (req.query.visitId) query.visitId = req.query.visitId;

    const prescriptions = await Prescription.find(query)
      .sort({ date: -1 });

    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a prescription
// @route   POST /api/prescriptions
// @access  Private
const createPrescription = async (req, res) => {
  try {
    const { patientId, visitId, doctorId, items } = req.body;

    const prescriptionId = `RX-${Math.floor(10000 + Math.random() * 90000)}`;

    const prescription = await Prescription.create({
      prescriptionId,
      patientId,
      visitId,
      doctorId,
      items
    });

    if (visitId) {
      const vQuery = mongoose.Types.ObjectId.isValid(visitId) ? { _id: visitId } : { visitId: visitId };
      const updatedVisit = await Visit.findOneAndUpdate(vQuery, { status: 'Pharmacy Queue' }, { new: true });

      // Persistent notifications for Pharmacist and Patient
      const io = req.app.get('io');
      const { sendPersistentNotification } = await import('../utils/notificationUtils.js');

      if (updatedVisit) {
        // Notify Pharmacist role
        await sendPersistentNotification(io, {
          message: `New Prescription for ${updatedVisit.patientName} is ready in queue`,
          type: 'info',
          role: 'Pharmacist'
        });

        // Notify Patient specifically
        const patientQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient) {
          const { sendLocalizedPersistentNotification } = await import('../utils/notificationUtils.js');
          await sendLocalizedPersistentNotification(io, patient, 'prescriptionSent', {}, 'info');
        }
      }

      // Send SMS
      import('../utils/smsService.js').then(async ({ sendLocalizedSMS }) => {
        const patientQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient && patient.phone) {
          await sendLocalizedSMS(patient, 'prescriptionSent', {});
        }
      });
    }

    res.status(201).json(prescription);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Helper: find inventory item by either MongoDB _id or custom itemId
const findInventoryItem = async (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byId = await Inventory.findById(id);
    if (byId) return byId;
  }
  return Inventory.findOne({ itemId: id });
};

// @desc    Dispense a prescription
// @route   POST /api/prescriptions/:id/dispense
// @access  Private
const dispensePrescription = async (req, res) => {
  try {
    const { dispensedItems } = req.body;
    const rxQuery = mongoose.Types.ObjectId.isValid(req.params.id) ? { _id: req.params.id } : { prescriptionId: req.params.id };
    const rx = await Prescription.findOne(rxQuery);

    if (!rx) return res.status(404).json({ message: 'Prescription not found' });

    let totalCost = 0;
    const billedItems = [];

    for (let item of rx.items) {
      const dispensedInfo = dispensedItems.find(di => di.itemId === item.itemId);
      if (dispensedInfo) {
        if (dispensedInfo.dispensedQty > 0) {

          if (item.medicineId === 'MANUAL') {
            // Use manual price provided by pharmacist
            const cost = dispensedInfo.dispensedQty * (dispensedInfo.price || 0);
            totalCost += cost;
            billedItems.push({ desc: item.name, qty: dispensedInfo.dispensedQty, cost });
          } else {
            const med = await findInventoryItem(item.medicineId);
            if (med) {
              med.stock -= dispensedInfo.dispensedQty;
              med.status = med.stock <= 100 ? 'Low Stock' : 'In Stock';
              if (med.stock <= 0) med.status = 'Out of Stock';
              await med.save();

              // Notify Admin and Pharmacist if stock becomes low after dispensing
              if (med.stock <= 100) {
                const io = req.app.get('io');
                const { sendPersistentNotification } = await import('../utils/notificationUtils.js');

                const message = med.stock === 0
                  ? `OUT OF STOCK ALERT: ${med.name} was just exhausted!`
                  : `LOW STOCK ALERT: ${med.name} dropped to ${med.stock} items.`;

                await sendPersistentNotification(io, {
                  message,
                  type: med.stock === 0 ? 'danger' : 'warning',
                  role: 'Admin'
                });

                await sendPersistentNotification(io, {
                  message,
                  type: med.stock === 0 ? 'danger' : 'warning',
                  role: 'Pharmacist'
                });
              }

              const cost = dispensedInfo.dispensedQty * med.unitPrice;
              totalCost += cost;
              billedItems.push({ desc: med.name, qty: dispensedInfo.dispensedQty, cost });
            }
          }
        }

        item.dispensedQty = (item.dispensedQty || 0) + dispensedInfo.dispensedQty;
        item.status = dispensedInfo.status;
        if (dispensedInfo.dosage) {
          item.dosage = dispensedInfo.dosage;
        }
        if (typeof dispensedInfo.requestedQty === 'number') {
          item.requestedQty = dispensedInfo.requestedQty;
        }

        // Calculate and save requiresNurse flag and nurseDepartment per item
        const manualFlag = dispensedInfo.requiresTreatment === true;
        const name = (item.name || '').toLowerCase();
        item.requiresNurse = manualFlag ||
          name.includes('inj') || name.includes('syringe') || name.includes('vial') ||
          name.includes('iv') || name.includes('im') || name.includes('diclofenac') ||
          (!!dispensedInfo.nurseDepartment && dispensedInfo.nurseDepartment !== 'None');

        if (item.requiresNurse) {
          item.nurseDepartment = dispensedInfo.nurseDepartment ||
            ((name.includes('vaccine') || name.includes('bcg') || name.includes('measles'))
              ? 'Immunization Room'
              : 'Dressing & Injection Room');
        } else {
          item.nurseDepartment = null;
        }
      }
    }

    // Accurate Status Calculation after processing all updates
    const statuses = rx.items.map(i => i.status);
    const allHandled = statuses.every(s => s === 'DISPENSED' || s === 'REFERRED');
    const allReferred = statuses.every(s => s === 'REFERRED');
    const anyHandled = statuses.some(s => s === 'DISPENSED' || s === 'REFERRED' || s === 'OUT_OF_STOCK');

    rx.status = allReferred ? 'REFERRED' : (allHandled ? 'DISPENSED' : (anyHandled ? 'PARTIALLY_DISPENSED' : 'PRESCRIBED'));
    await rx.save();

    // Update Visit Status based on dispensing result
    if (rx.visitId) {
      const vQuery = mongoose.Types.ObjectId.isValid(rx.visitId) ? { _id: rx.visitId } : { visitId: rx.visitId };

      // Determine if a nurse is needed (based on flags set per item)
      const needsNurse = rx.items.some(item => item.requiresNurse === true);

      await Visit.findOneAndUpdate(vQuery, {
        status: needsNurse ? 'Ready for Treatment' : 'Awaiting Payment'
      });

      // Persistent notification for the patient
      const io = req.app.get('io');
      const { sendLocalizedPersistentNotification, sendPersistentNotification } = await import('../utils/notificationUtils.js');
      const patientQuery = mongoose.Types.ObjectId.isValid(rx.patientId) ? { _id: rx.patientId } : { pid: rx.patientId };
      const patient = await Patient.findOne(patientQuery);
      if (patient) {
        const templateKey = needsNurse
          ? 'prescriptionDispensedNurse'
          : 'prescriptionDispensedCheckout';
        await sendLocalizedPersistentNotification(io, patient, templateKey, {}, 'success');
      }

      // Notify Nurse if treatment is required
      if (needsNurse) {
        // Find the designated department (defaulting to Dressing & Injection Room if not found)
        const designatedItem = rx.items.find(item => item.requiresNurse && item.nurseDepartment);
        const targetDept = designatedItem ? designatedItem.nurseDepartment : 'Dressing & Injection Room';

        // Fetch patient name if possible for better notification
        const nursePatientQuery = mongoose.Types.ObjectId.isValid(rx.patientId) ? { _id: rx.patientId } : { pid: rx.patientId };
        const nursePatient = await Patient.findOne(nursePatientQuery);

        await sendPersistentNotification(io, {
          message: `New Patient for Treatment: ${nursePatient ? nursePatient.name : rx.patientId} has pending procedures.`,
          type: 'warning',
          role: 'Nurse',
          department: targetDept
        });
      }

      // Send SMS
      import('../utils/smsService.js').then(async ({ sendLocalizedSMS }) => {
        const patientQuery = mongoose.Types.ObjectId.isValid(rx.patientId) ? { _id: rx.patientId } : { pid: rx.patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient && patient.phone) {
          const templateKey = needsNurse
            ? 'prescriptionDispensedNurse'
            : 'prescriptionDispensedCheckout';
          await sendLocalizedSMS(patient, templateKey, {});
        }
      });
    }

    if (anyHandled && totalCost > 0) {
      const patient = mongoose.Types.ObjectId.isValid(rx.patientId)
        ? await Patient.findById(rx.patientId)
        : await Patient.findOne({ pid: rx.patientId });

      // Check if a bill already exists for this visit (to consolidate) or this prescription
      let bill = null;
      if (rx.visitId && rx.visitId.trim() !== '') {
        bill = await Bill.findOne({ visitId: rx.visitId });
      } else {
        bill = await Bill.findOne({ referenceId: rx._id.toString() });
      }

      if (bill) {
        // Consolidate: merge items from this dispense into the existing bill
        // We only add items that aren't already there (by description) or we update them
        billedItems.forEach(newItem => {
          const existingItemIndex = bill.items.findIndex(i => i.desc === newItem.desc);
          if (existingItemIndex > -1) {
            // Update quantity and cost if it already exists (e.g. re-dispensing)
            bill.items[existingItemIndex].qty += newItem.qty;
            bill.items[existingItemIndex].cost += newItem.cost;
          } else {
            bill.items.push(newItem);
          }
        });

        // Recalculate totalAmount based on all items
        bill.totalAmount = bill.items.reduce((sum, item) => sum + item.cost, 0);

        // Update status if total increased
        if (bill.paidAmount >= bill.totalAmount) {
          bill.status = 'Paid';
        } else {
          bill.status = bill.paidAmount > 0 ? 'Partial' : 'Unpaid';
        }
        await bill.save();
      } else {
        bill = await Bill.create({
          invoiceId: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
          patientId: rx.patientId,
          visitId: rx.visitId,
          patientName: patient ? patient.name : 'Unknown Patient',
          items: billedItems,
          totalAmount: totalCost,
          paidAmount: 0,
          status: 'Unpaid',
          referenceId: rx._id.toString(),
          source: 'PHARMACY'
        });
      }
      return res.json({ prescription: rx, bill });
    }

    res.json({ prescription: rx, bill: null });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export {
  getPrescriptions,
  createPrescription,
  dispensePrescription
};
