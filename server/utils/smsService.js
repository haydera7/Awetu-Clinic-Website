// Textbee SMS Service for HealthCare Pro
// Uses an Android phone as an SMS Gateway (Textbee.dev)

const apiKey = process.env.TEXTBEE_API_KEY;
const deviceId = process.env.TEXTBEE_DEVICE_ID;

if (apiKey && deviceId) {
  console.log('✅ Textbee SMS Gateway configured.');
} else {
  console.log('⚠️ Textbee credentials missing from .env. Running SMS in Mock Mode.');
}

export const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber) {
    console.warn('⚠️ SMS Service: No phone number provided for message:', message);
    return false;
  }

  // Formatting phone number to E.164 standard if needed
  const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  // If Textbee is configured, send the actual SMS via their API
  if (apiKey && deviceId) {
    try {
      const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          recipients: [ formattedPhone ],
          message: message
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Real SMS sent to ${formattedPhone} via Textbee!`);
        return true;
      } else {
        console.error('❌ Textbee Failed to send SMS:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Textbee Network Error:', error.message);
      return false;
    }
  }

  // --- Mock Fallback Mode (Runs if .env is missing Textbee Keys) ---
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
  console.log('\n=============================================');
  console.log('📱 🟢 [MOCK MODE] NEW SMS DELIVERED');
  console.log('---------------------------------------------');
  console.log(`To: ${formattedPhone}`);
  console.log(`Message: ${message}`);
  console.log('=============================================\n');

  return true;
};

import { getTranslatedSMS } from './translationUtils.js';

export const sendLocalizedSMS = async (patient, templateKey, data) => {
  if (!patient || !patient.phone) return false;
  const language = patient.preferredLanguage || 'English';
  const localizedMessage = getTranslatedSMS(templateKey, data, language);
  return sendSMS(patient.phone, localizedMessage);
};
