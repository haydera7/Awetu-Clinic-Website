import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare-pro').then(async () => {
  console.log("Connected to MongoDB.");
  const patients = await mongoose.connection.db.collection('patients').find({}).toArray();
  const girma = patients.find(p => p.name.includes("Girma"));
  console.log("Patient Girma:", girma);
  process.exit(0);
}).catch(console.error);
