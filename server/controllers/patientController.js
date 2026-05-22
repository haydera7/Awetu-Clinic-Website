import mongoose from 'mongoose';
import Patient from '../models/Patient.js';

// @desc    Get all patients
// @route   GET /api/patients
// @access  Private
const getPatients = async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a patient
// @route   POST /api/patients
// @access  Private
const createPatient = async (req, res) => {
  try {
    console.log('--- ATTEMPTING TO SAVE PATIENT ---');
    console.log('Payload:', req.body);

    const { name, age, gender, bloodGroup, phone, email, address, dob, allergy } = req.body;

    // Generate PID
    const pid = `P-${Math.floor(10000 + Math.random() * 90000)}`;

    const patient = new Patient({
      pid,
      name,
      age: Number(age), // Ensure age is a number
      gender,
      bloodGroup,
      phone,
      email,
      address,
      dob,
      allergy: allergy || 'None'
    });

    const savedPatient = await patient.save();
    console.log('SUCCESS: Patient saved to MongoDB:', savedPatient.pid);

    // Send Persistent Notifications to Admin and Receptionist
    try {
      const io = req.app.get('io');
      const { sendPersistentNotification } = await import('../utils/notificationUtils.js');
      
      await sendPersistentNotification(io, {
        message: `New Patient Registered: ${name} (${pid})`,
        type: 'success',
        role: 'Admin'
      });

      await sendPersistentNotification(io, {
        message: `New Patient Registered: ${name} (${pid})`,
        type: 'success',
        role: 'Receptionist'
      });
    } catch (socketErr) {
      console.warn('Notification failed, but patient was saved:', socketErr.message);
    }

    res.status(201).json(savedPatient);
  } catch (error) {
    console.error('DATABASE ERROR:', error.message);
    res.status(400).json({
      message: 'Database save failed: ' + error.message,
      details: error.errors
    });
  }
};

// @desc    Update a patient
// @route   PUT /api/patients/:id
// @access  Private
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { pid: id };

    const patient = await Patient.findOneAndUpdate(query, req.body, { new: true });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    
    // Notify about patient update
    const io = req.app.get('io');
    if (io) {
      io.emit('patient-updated', patient);
    }
    
    res.json(patient);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a patient
// @route   DELETE /api/patients/:id
// @access  Private
const deletePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json({ message: 'Patient removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  getPatients,
  createPatient,
  updatePatient,
  deletePatient
};
