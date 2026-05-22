import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const BillSchema = new mongoose.Schema({
  invoiceId: String,
  patientName: String,
  totalAmount: Number,
  status: String,
  referenceId: String,
  date: { type: Date, default: Date.now }
});

const Bill = mongoose.model('Bill', BillSchema);

async function checkBills() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare_pro');
    console.log('Connected to MongoDB');
    
    const bills = await Bill.find().sort({ date: -1 }).limit(10);
    console.log('Recent Bills:');
    bills.forEach(b => {
      console.log(`[${b.date.toISOString()}] ${b.invoiceId} - ${b.patientName}: ${b.totalAmount} (${b.status}) - Ref: ${b.referenceId}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkBills();
