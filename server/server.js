import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import connectDB from './config/db.js';

// Connect to database
connectDB();

const app = express();
const httpServer = createServer(app);

// Allowed origins: Vercel frontend + local dev
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

// Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io accessible in routes/controllers
app.set('io', io);

// Track Online Users
const onlineUsers = new Map(); // socket.id -> userData

// Socket Events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Register online status
  socket.on('register-online', (userData) => {
    // userData should contain { userId, name, role }
    onlineUsers.set(socket.id, userData);
    
    // Broadcast the current list of online users
    const onlineList = Array.from(onlineUsers.values());
    io.emit('online-users', onlineList);
    console.log(`User registered online: ${userData.name} (${userData.role})`);
  });

  // Join a specific role-based room
  socket.on('join-role-room', (role) => {
    socket.join(role);
    console.log(`Staff ${socket.id} joined role room: ${role}`);
  });

  // Join a specific user/patient room for private alerts
  socket.on('join-user-room', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined private room: ${userId}`);
  });

  socket.on('disconnect', () => {
    if (onlineUsers.has(socket.id)) {
      const userData = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      
      // Broadcast the updated list
      const onlineList = Array.from(onlineUsers.values());
      io.emit('online-users', onlineList);
      console.log(`User disconnected: ${userData.name}`);
    }
  });
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Serve uploaded images statically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
import authRoutes from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import recordRoutes from './routes/recordRoutes.js';
import prescriptionRoutes from './routes/prescriptionRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/staffs', staffRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('HealthCare Pro API with Socket.io is running...');
});

import { errorHandler } from './middlewares/errorMiddleware.js';
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (Socket.io enabled)`);
});
