import User from '../models/User.js';
import Patient from '../models/Patient.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (for initial setup, could be Private for Admin)
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, empId } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      empId,
      avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        empId: user.empId,
        department: user.department,
        avatarColor: user.avatarColor,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email} (Password length: ${password?.length})`);

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      console.log(`Login failed: User ${cleanEmail} not found in database.`);
      return res.status(401).json({ message: 'User not found. Please check the email address.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      console.log(`Login successful for: ${cleanEmail}`);
      
      // Emit real-time welcome notification
      const io = req.app.get('io');
      if (io) {
        io.emit('notification', {
          message: `Welcome back, ${user.name}! System is ready.`,
          type: 'info'
        });
      }

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        empId: user.empId,
        department: user.department,
        avatarColor: user.avatarColor,
        token: generateToken(user._id),
      });
    } else {
      console.log(`Login failed: Incorrect password for ${cleanEmail}.`);
      res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // req.user is set by authMiddleware and handles both Staff and Patients
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify Google token using axios (simpler for access_token flow)
    const googleRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const { email, name, sub } = googleRes.data;

    let user = await User.findOne({ email });

    if (!user) {
      // Create a default Doctor account if it's their first time and they are authorized
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        role: 'Doctor',
        empId: `G-${sub.substring(0, 5)}`,
        status: 'Active',
        avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
      });
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      empId: user.empId,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ message: 'Google authentication failed' });
  }
};

// @desc    Authenticate a patient via PID and Name
// @route   POST /api/auth/patient-login
// @access  Public
const patientLogin = async (req, res) => {
  try {
    const { pid, name } = req.body;

    if (!pid || !name) {
      return res.status(400).json({ message: 'Please provide Patient ID and Name' });
    }

    const patient = await Patient.findOne({ pid: pid.toUpperCase().trim() });

    if (!patient) {
      return res.status(401).json({ message: 'Patient ID not found' });
    }

    // Verify if the provided name matches the patient's name (case-insensitive first name check)
    const storedNameParts = patient.name.toLowerCase().split(' ');
    const providedName = name.toLowerCase().trim();

    if (!storedNameParts.includes(providedName)) {
      return res.status(401).json({ message: 'Verification failed. Name does not match our records.' });
    }

    res.json({
      _id: patient._id,
      name: patient.name,
      pid: patient.pid,
      role: 'Patient',
      token: generateToken(patient._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  googleLogin,
  getMe,
  patientLogin
};
