import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      // Get user from the token - check both Staff and Patient collections
      let user = await User.findById(decoded.id).select('-password');
      if (!user) {
        user = await Patient.findById(decoded.id);
        if (user) {
          user = user.toObject(); // Convert to plain object to add properties
          user.role = 'Patient'; // Ensure role is set for patients
        }
      }
      req.user = user;

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export { protect };
