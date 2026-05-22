import nodemailer from 'nodemailer';
import crypto from 'crypto';

/**
 * Generates a secure random password for new staff members
 * @param {number} length - The length of the password (default 10)
 * @returns {string} - A random alphanumeric password
 */
export const generateStrongPassword = (length = 10) => {
  const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#%*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  return password;
};

/**
 * Sends a welcome email to a newly registered staff member
 * @param {Object} staff - The staff object containing name, email, role, and empId
 * @param {string} tempPassword - The generated temporary password
 */
export const sendStaffWelcomeEmail = async (staff, tempPassword) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'mock_user',
        pass: process.env.EMAIL_PASS || 'mock_pass',
      },
    });

    const mailOptions = {
      from: `"HealthCare Pro HR" <${process.env.EMAIL_FROM || 'hr@healthcarepro.com'}>`,
      to: staff.email,
      subject: 'Welcome to HealthCare Pro - Your Staff Account',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #3b82f6; text-align: center;">Welcome to the Team, ${staff.name}!</h2>
          <p>Your professional account has been successfully registered on the HealthCare Pro platform.</p>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #4b5563;">Your Login Credentials:</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0;">
            <p style="margin: 5px 0;"><strong>Employee ID:</strong> ${staff.empId}</p>
            <p style="margin: 5px 0;"><strong>System Role:</strong> ${staff.role}</p>
            <p style="margin: 5px 0;"><strong>Username/Email:</strong> ${staff.email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <span style="color: #2563eb; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 1px;">${tempPassword}</span></p>
          </div>

          <p style="font-size: 14px; color: #6b7280; background: #fffbeb; padding: 10px; border-radius: 5px; border-left: 4px solid #f59e0b;">
            <strong>Security Action Required:</strong> For your protection, you are required to change this temporary password immediately after your first login.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5173/login" style="background: #3b82f6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            HealthCare Pro Management System<br>
            Automated Notification Service
          </p>
        </div>
      `,
    };

    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'mock_user') {
      console.log('--- SIMULATED EMAIL SENT ---');
      console.log(`To: ${staff.email}`);
      console.log(`Temporary Password: ${tempPassword}`);
      console.log('-----------------------------');
      return { success: true, mock: true };
    }

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email Error:', error);
    return { success: false, error: error.message };
  }
};
