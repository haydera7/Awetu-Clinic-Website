import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { sendStaffWelcomeEmail, generateStrongPassword } from '../utils/emailService.js';

// @desc    Get all staffs
// @route   GET /api/staffs
// @access  Private
const getStaffs = async (req, res) => {
  try {
    const staffs = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(staffs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a staff member
// @route   POST /api/staffs
// @access  Private
const createStaff = async (req, res) => {
  try {
    const { name, role, department, phone, email, empId, status } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate a strong temporary password
    const tempPassword = generateStrongPassword(10);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const staff = await User.create({
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      empId,
      department,
      phone,
      status: status || 'Active',
      avatarColor: '#' + Math.floor(Math.random()*16777215).toString(16)
    });

    // Send welcome email with the secure temporary password
    await sendStaffWelcomeEmail({
      name: staff.name,
      email: staff.email,
      role: staff.role,
      empId: staff.empId
    }, tempPassword);

    res.status(201).json({
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      department: staff.department,
      phone: staff.phone,
      empId: staff.empId,
      status: staff.status
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a staff member
// @route   DELETE /api/staffs/:id
// @access  Private
const deleteStaff = async (req, res) => {
  try {
    const query = mongoose.Types.ObjectId.isValid(req.params.id) 
      ? { _id: req.params.id } 
      : { empId: req.params.id };

    const staff = await User.findOne(query);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }
    await User.findByIdAndDelete(staff._id);
    res.json({ message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a staff member
// @route   PUT /api/staffs/:id
// @access  Private
const updateStaff = async (req, res) => {
  try {
    const { name, role, department, phone, email, empId, status } = req.body;
    
    const query = mongoose.Types.ObjectId.isValid(req.params.id) 
      ? { _id: req.params.id } 
      : { empId: req.params.id };

    const staff = await User.findOne(query);

    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    staff.name = name || staff.name;
    staff.role = role || staff.role;
    staff.department = department || staff.department;
    staff.phone = phone || staff.phone;
    staff.email = email ? email.trim().toLowerCase() : staff.email;
    staff.empId = empId || staff.empId;
    staff.status = status || staff.status;

    const updatedStaff = await staff.save();
    
    res.json({
      _id: updatedStaff._id,
      name: updatedStaff.name,
      email: updatedStaff.email,
      role: updatedStaff.role,
      department: updatedStaff.department,
      phone: updatedStaff.phone,
      empId: updatedStaff.empId,
      status: updatedStaff.status
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export {
  getStaffs,
  createStaff,
  updateStaff,
  deleteStaff
};
