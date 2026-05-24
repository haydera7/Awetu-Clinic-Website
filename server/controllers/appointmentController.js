import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Public
export const getAppointments = async (req, res) => {
  try {
    const { date, doctorId, patientId } = req.query;
    let query = {};

    if (date) query.date = date;
    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;

    const appointments = await Appointment.find(query)
      .sort({ date: 1, timeSlot: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new appointment
// @route   POST /api/appointments
// @access  Public
export const createAppointment = async (req, res) => {
  try {
    const { patientId, doctorId, date, timeSlot, type, reason } = req.body;

    // Check if slot is already taken for this doctor
    const existing = await Appointment.findOne({ doctorId, date, timeSlot, status: 'Scheduled' });
    if (existing) {
      return res.status(400).json({ message: 'This time slot is already booked for this doctor.' });
    }

    // Look up names for denormalized storage (gracefully handle if not found)
    let patientName = 'Unknown Patient';
    let doctorName = 'Unknown Doctor';
    try { const patient = await Patient.findById(patientId); if (patient) patientName = patient.name; } catch(e) {}
    try {
      const doctor = await User.findOne({ empId: doctorId }) || await User.findById(doctorId).catch(() => null);
      if (doctor) doctorName = doctor.name;
    } catch(e) {}

    const appointment = await Appointment.create({
      patientId,
      patientName,
      doctorId,
      doctorName,
      date,
      timeSlot,
      type,
      reason,
      bookedBy: req.user?._id?.toString() || null
    });

    // Send localized notification and SMS to patient
    const io = req.app.get('io');
    const doctor = doctorName;
    const time = `${date} at ${timeSlot}`;

    if (patientId) {
      if (io) {
        import('../utils/notificationUtils.js').then(async ({ sendLocalizedPersistentNotification }) => {
          try {
            const patient = await Patient.findById(patientId);
            if (patient) {
              await sendLocalizedPersistentNotification(io, patient, 'appointmentConfirmed', { doctor, time }, 'success');
            }
          } catch (e) {
            console.error('Failed to send localized persistent notification for appointment:', e.message);
          }
        });
      }

      import('../utils/smsService.js').then(async ({ sendLocalizedSMS }) => {
        try {
          const patient = await Patient.findById(patientId);
          if (patient && patient.phone) {
            await sendLocalizedSMS(patient, 'appointmentConfirmed', { doctor, time });
          }
        } catch (e) {
          console.error('Failed to send localized SMS for appointment:', e.message);
        }
      });
    }

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update appointment status (e.g., Check-in, Cancel)
// @route   PUT /api/appointments/:id/status
// @access  Public
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;

    if (status === 'Checked-In') {
      appointment.checkInTime = new Date();
      
      // Auto-create a Visit if one doesn't already exist
      const existingVisit = await Visit.findOne({ 
        patientId: appointment.patientId, 
        status: { $in: ['Waiting', 'Scheduled', 'In Session', 'In Consultation'] } 
      });

      if (!existingVisit) {
        const visit = await Visit.create({
          visitId: `V-${Math.floor(10000 + Math.random() * 90000)}`,
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          type: appointment.type || 'Follow-up',
          doctor: appointment.doctorName,
          status: 'Waiting',
          reason: appointment.reason || 'Appointment Check-in'
        });
        appointment.visitId = visit.visitId;
      }

      // Update patient status to 'Active' and set lastVisit date safely
      try {
        const patientQuery = mongoose.Types.ObjectId.isValid(appointment.patientId) ? { _id: appointment.patientId } : { pid: appointment.patientId };
        const patient = await Patient.findOne(patientQuery);
        if (patient) {
          patient.status = 'Active';
          patient.lastVisit = new Date().toISOString().split('T')[0];
          await patient.save();

          // Emit real-time event if socket.io is available
          const io = req.app.get('io');
          if (io) {
            io.emit('patient-updated', patient);
          }
        }
      } catch (e) {
        console.error('Failed to update patient status on check-in:', e.message);
      }
    }

    await appointment.save();
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete/Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Public
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    await appointment.deleteOne();
    res.json({ message: 'Appointment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
