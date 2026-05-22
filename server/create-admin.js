import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import connectDB from './config/db.js';

const start = async () => {
    await connectDB();

    // Choose your credentials here:
    const adminEmail = "haydermd2004@gmail.com";
    const adminPassword = "Password123";

    try {
        // Delete the old "failing" user if it exists
        await User.deleteOne({ email: adminEmail });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await User.create({
            name: "Super Admin",
            email: adminEmail,
            password: hashedPassword,
            role: "Admin",
            empId: "ADM-001",
            status: "Active"
        });


    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        mongoose.connection.close();
    }
};

start();
