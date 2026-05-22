import axios from 'axios';
axios.post('http://127.0.0.1:3000/api/appointments', {
  patientId: "123",
  doctorId: "456",
  date: "2026-05-15",
  timeSlot: "08:00 AM",
  type: "Follow-up",
  reason: "Test"
}).then(res => console.log(res.data)).catch(err => console.log(err.response?.data || err.message));
