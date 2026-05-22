import mongoose from 'mongoose';
import 'dotenv/config';
import Announcement from '../models/Announcement.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://haydera7:hayder123@awetukebele.vwxdxyc.mongodb.net/healthDB';

const exampleAnnouncements = [
  {
    title: 'Secure Online Payments via Chapa Live',
    content: 'Patients can now pay their consultation, medical laboratory, and pharmacy bills online directly from the Patient Portal. We have fully integrated the Chapa payment gateway, supporting Telebirr, CBE Birr, and credit cards. Instantly confirm your payment online to clear your medications at the Pharmacy counter!',
    category: 'Update',
    active: true,
    createdBy: 'System Admin'
  },
  {
    title: 'Full Amharic & Oromic Support Active',
    content: 'To better serve our community, the patient portal, sidebar panels, consultation queues, and automated SMS appointment confirmations now fully support three languages: English, Amharic (አማርኛ), and Oromo (Afaan Oromoo). You can switch your preferred language at any time in your Settings panel.',
    category: 'Notice',
    active: true,
    createdBy: 'Head of Operations'
  },
  {
    title: 'Digital Triage & Queue Maintenance Schedule',
    content: 'Please be advised that our digital patient triage, clinical records database, and pharmacy queue sync service will undergo a scheduled maintenance window this Saturday from 11:00 PM to 2:00 AM. During this brief period, patients will be registered manually by the nursing staff.',
    category: 'Critical',
    active: true,
    createdBy: 'IT Department'
  }
];

const seedDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected successfully.');

    // Clear existing
    console.log('Clearing existing announcements...');
    await Announcement.deleteMany({});

    // Seed new
    console.log('Seeding announcement examples...');
    const docs = await Announcement.insertMany(exampleAnnouncements);
    console.log(`Successfully seeded ${docs.length} highly relevant announcements!`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding announcements:', error);
    process.exit(1);
  }
};

seedDB();
