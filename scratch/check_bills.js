import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bill from '../server/models/Bill.js';
import Visit from '../server/models/Visit.js';

dotenv.config({ path: '../server/.env' });

async function checkStatus() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const bills = await Bill.find().sort({ date: -1 }).limit(5);
  console.log('--- Recent Bills ---');
  bills.forEach(b => {
    console.log(`ID: ${b.invoiceId}, Patient: ${b.patientName}, Total: ${b.totalAmount}, Paid: ${b.paidAmount}, Status: ${b.status}, VisitID: ${b.visitId}`);
  });

  const visits = await Visit.find({ status: { $in: ['Awaiting Payment', 'Completed'] } }).sort({ date: -1 }).limit(5);
  console.log('\n--- Recent Visits ---');
  visits.forEach(v => {
    console.log(`ID: ${v.visitId}, Patient: ${v.patientName}, Status: ${v.status}`);
  });

  await mongoose.disconnect();
}

checkStatus();
