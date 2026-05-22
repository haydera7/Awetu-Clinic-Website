import mongoose from 'mongoose';
import Record from '../models/Record.js';
import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';

import Bill from '../models/Bill.js';

// @desc    Get all records for a patient
// @route   GET /api/records/patient/:patientId
// @access  Private
const getPatientRecords = async (req, res) => {
  try {
    const records = await Record.find({ patientId: req.params.patientId })
      .sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all records
// @route   GET /api/records
// @access  Private
const getRecords = async (req, res) => {
  try {
    const records = await Record.find()
      .sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a medical record (Diagnosis, Vitals, etc.)
// @route   POST /api/records
// @access  Private
const createRecord = async (req, res) => {
  try {
    const { patientId, visitId, referenceId, type, title, notes, fileName, vitals, bp, heartRate, temp, weight, doctor, recordedBy } = req.body;
    
    // Support frontend sending flat vitals
    const vitalsObj = vitals || (type === 'Vitals' ? { bp, heartRate, temp, weight } : undefined);
    
    // Create record
    const record = await Record.create({
      patientId,
      visitId,
      referenceId,
      type,
      title,
      notes,
      fileName,
      vitals: vitalsObj,
      doctor: doctor || recordedBy
    });

    // Update visit status based on record type
    if (visitId) {
      if (type === 'Lab Request') {
        const vQuery = mongoose.Types.ObjectId.isValid(visitId) ? { _id: visitId } : { visitId: visitId };
        await Visit.findOneAndUpdate(vQuery, { status: 'Lab/Pharmacy' });
      } else if (type === 'Treatment/Procedure') {
        const vQuery = mongoose.Types.ObjectId.isValid(visitId) ? { _id: visitId } : { visitId: visitId };
        
        // Find if the bill for this visit is fully paid
        const bill = await Bill.findOne({ visitId });
        const isPaid = bill ? bill.status === 'Paid' : true; // Default to true if no bill exists
        
        const status = req.body.isCourseFinished === false 
          ? 'Ready for Treatment' 
          : (isPaid ? 'Completed' : 'Awaiting Payment');
          
        const updatedVisit = await Visit.findOneAndUpdate(vQuery, { status }, { new: true });
        
        // If the visit is now completed, set the patient to Inactive
        if (status === 'Completed' && updatedVisit && updatedVisit.patientId) {
          const pQuery = mongoose.Types.ObjectId.isValid(updatedVisit.patientId) ? { _id: updatedVisit.patientId } : { pid: updatedVisit.patientId };
          await Patient.findOneAndUpdate(pQuery, { status: 'Inactive' });
          const io = req.app.get('io');
          if (io) {
            const updatedPatient = await Patient.findOne(pQuery);
            if (updatedPatient) io.emit('patient-updated', updatedPatient);
            io.emit('visit-updated', updatedVisit);
          }
        }
      } else if (type === 'Referral') {
        const vQuery = mongoose.Types.ObjectId.isValid(visitId) ? { _id: visitId } : { visitId: visitId };
        await Visit.findOneAndUpdate(vQuery, { status: 'Referred' });
        
        // Also update the Patient status to Referred
        if (patientId) {
          const pQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
          await Patient.findOneAndUpdate(pQuery, { status: 'Referred' });
        }
      }
    }

    // Emit Socket Notification and SMS to Patient for Lab Results
    const io = req.app.get('io');
    const { sendPersistentNotification } = await import('../utils/notificationUtils.js');

    if (type === 'Lab Result' && io) {
      // Fetch patient details for a better message
      const patient = await Patient.findById(patientId) || await Patient.findOne({ pid: patientId });
      const patientDisplay = patient ? `${patient.name} (${patient.pid})` : patientId;

      // Notify Patient
      const { sendLocalizedPersistentNotification } = await import('../utils/notificationUtils.js');
      if (patient) {
        await sendLocalizedPersistentNotification(io, patient, 'labResultReady', { title }, 'success');
      }

      // Notify the Doctor who requested the test
      if (doctor || recordedBy) {
        const User = (await import('../models/User.js')).default;
        const targetDocName = doctor || recordedBy;
        const docUser = await User.findOne({ name: targetDocName, role: 'Doctor' });
        
        if (docUser) {
          await sendPersistentNotification(io, {
            message: `LAB READY: Results for ${title} - ${patientDisplay} are available for review.`,
            type: 'warning',
            userId: docUser._id.toString()
          });
        }
      }

      // Send SMS
      import('../utils/smsService.js').then(async ({ sendLocalizedSMS }) => {
        const patientQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient && patient.phone) {
          await sendLocalizedSMS(patient, 'labResultReady', { title });
        }
      });
    }

    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export {
  getPatientRecords,
  getRecords,
  createRecord
};
