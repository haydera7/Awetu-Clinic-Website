import mongoose from 'mongoose';
import Visit from '../models/Visit.js';
import Patient from '../models/Patient.js';

// @desc    Get all visits
// @route   GET /api/visits
// @access  Private
const getVisits = async (req, res) => {
  try {
    const visits = await Visit.find().populate('patientId', 'name pid').sort({ date: -1 });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a visit
// @route   POST /api/visits
// @access  Private
const createVisit = async (req, res) => {
  try {
    const { patientId, patientName, type, doctor, reason, date, time } = req.body;

    // Find the patient to get all identifiers (MongoDB _id and Public PID)
    const patientQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
    const patient = await Patient.findOne(patientQuery);
    
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    // Check if patient already has an active (non-completed) visit using BOTH identifiers
    const activeVisit = await Visit.findOne({ 
      $or: [
        { patientId: patient._id.toString() },
        { patientId: patient.pid }
      ],
      status: { $nin: ['Completed', 'Cancelled', 'Referred'] } 
    });

    if (activeVisit) {
      return res.status(400).json({ 
        message: `Patient already has an active visit with ${activeVisit.doctor} (${activeVisit.status}). Please complete or cancel the existing visit first.` 
      });
    }

    // Generate Visit ID
    const visitId = `V-${Math.floor(10000 + Math.random() * 90000)}`;

    const visit = await Visit.create({
      visitId,
      patientId,
      patientName,
      type,
      doctor,
      date,
      time,
      reason
    });

    // Update patient's lastVisit safely and set status to Active
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      await Patient.findByIdAndUpdate(patientId, { lastVisit: date, status: 'Active' });
    }

    // Persistent notifications
    const io = req.app.get('io');
    const { sendPersistentNotification } = await import('../utils/notificationUtils.js');

    if (io) {
      // Notify the SPECIFIC Doctor assigned privately
      const User = (await import('../models/User.js')).default;
      const assignedDocUser = await User.findOne({ name: doctor, role: 'Doctor' });
      
      if (assignedDocUser) {
        await sendPersistentNotification(io, {
          message: `URGENT: ${patientName} has been assigned to you for consultation at ${time}.`,
          type: 'warning',
          userId: assignedDocUser._id.toString()
        });
      }

      // Send data update event (real-time only)
      if (assignedDocUser) {
        io.to(assignedDocUser._id.toString()).emit('visit-created', visit);
      }

      // Notify Patient specifically
      import('../utils/notificationUtils.js').then(async ({ sendLocalizedPersistentNotification }) => {
        const patientQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient) {
          await sendLocalizedPersistentNotification(io, patient, 'appointmentConfirmed', { doctor, time }, 'success');
        }
      });
    } // End of if (io) block
      
    // Send SMS to the patient
    import('../utils/smsService.js').then(async ({ sendLocalizedSMS }) => {
      const patientQuery = mongoose.Types.ObjectId.isValid(patientId) ? { _id: patientId } : { pid: patientId };
      const patient = await Patient.findOne(patientQuery);
      if (patient && patient.phone) {
        await sendLocalizedSMS(patient, 'appointmentConfirmed', { doctor, time });
      }
    });

    res.status(201).json(visit);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
};

// @desc    Update visit status
// @route   PUT /api/visits/:id/status
// @access  Private
const updateVisitStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const io = req.app.get('io');
    const vQuery = mongoose.Types.ObjectId.isValid(req.params.id) ? { _id: req.params.id } : { visitId: req.params.id };
    
    // Find current visit to check for status change
    const currentVisit = await Visit.findOne(vQuery);
    if (!currentVisit) return res.status(404).json({ message: 'Visit not found' });

    const isStatusChanged = currentVisit.status !== status;
    const visit = await Visit.findOneAndUpdate(vQuery, { status }, { new: true });

    // If visit is completed, set patient status to Inactive
    if (status === 'Completed' && visit.patientId) {
      const patientQuery = mongoose.Types.ObjectId.isValid(visit.patientId) ? { _id: visit.patientId } : { pid: visit.patientId };
      const updatedPatient = await Patient.findOneAndUpdate(patientQuery, { status: 'Inactive' }, { new: true });
      if (io && updatedPatient) {
        io.emit('patient-updated', updatedPatient);
      }
    }

    // Persistent notifications for status changes
    const { sendPersistentNotification } = await import('../utils/notificationUtils.js');
    
    if (io && isStatusChanged) {
      if (status === 'Lab Requested') {
        await sendPersistentNotification(io, {
          message: `New Lab Request for ${visit.patientName} (${visit.visitId})`,
          type: 'warning',
          role: 'Lab Technician'
        });
      } else if (status === 'Pharmacy Queue') {
        await sendPersistentNotification(io, {
          message: `New Prescription for ${visit.patientName} is ready in queue`,
          type: 'info',
          role: 'Pharmacist'
        });
      } else if (status === 'Results Ready') {
        const User = (await import('../models/User.js')).default;
        const assignedDocUser = await User.findOne({ name: visit.doctor, role: 'Doctor' });
        
        if (assignedDocUser) {
          await sendPersistentNotification(io, {
            message: `Lab Results Ready for ${visit.patientName}`,
            type: 'success',
            userId: assignedDocUser._id.toString()
          });
        } else {
          await sendPersistentNotification(io, {
            message: `Lab Results Ready for ${visit.patientName}`,
            type: 'success',
            role: 'Doctor'
          });
        }
      }
    }

    res.json(visit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateVisit = async (req, res) => {
  try {
    const vQuery = mongoose.Types.ObjectId.isValid(req.params.id) ? { _id: req.params.id } : { visitId: req.params.id };
    const visit = await Visit.findOneAndUpdate(vQuery, req.body, { new: true });
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    res.json(visit);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteVisit = async (req, res) => {
  try {
    const vQuery = mongoose.Types.ObjectId.isValid(req.params.id) ? { _id: req.params.id } : { visitId: req.params.id };
    const visit = await Visit.findOneAndDelete(vQuery);
    if (!visit) return res.status(404).json({ message: 'Visit not found' });
    res.json({ message: 'Visit removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getVisits,
  createVisit,
  updateVisitStatus,
  updateVisit,
  deleteVisit
};
