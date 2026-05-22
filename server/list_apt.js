import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://hayder:PzV1G57T7XvA7W25@healthcare-pro.vwxdxyc.mongodb.net/healthcare-pro?retryWrites=true&w=majority');
const Appointment = mongoose.model('Appointment', new mongoose.Schema({}, { strict: false }));
Appointment.find().sort({createdAt: -1}).limit(5).then(res => {
  console.log(res);
  process.exit(0);
});
