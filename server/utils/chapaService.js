export const initializePayment = async (tx_ref, amount, email, first_name, last_name, return_url) => {
  const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

  if (!CHAPA_SECRET_KEY) {
    console.log(`⚠️ [MOCK CHAPA] Initializing payment for ${amount} ETB...`);
    // In mock mode, we immediately return a URL that fakes the redirect back to the app
    return {
      status: 'success',
      checkout_url: `${return_url}?status=success&tx_ref=${tx_ref}&mock=true`,
      message: 'Mock payment initialized'
    };
  }

  try {
    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amount),
        currency: 'ETB',
        email: email || 'patient@healthcare.com',
        first_name: first_name || 'Patient',
        last_name: last_name || 'User',
        tx_ref: tx_ref,
        callback_url: (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost')) 
          ? `${process.env.BACKEND_URL}/api/billing/chapa-webhook` 
          : undefined, // Chapa might reject localhost webhooks
        return_url: return_url,
        customization: {
          title: 'HealthCare Pro',
          description: 'Medical Bill Payment'
        }
      })
    });

    const data = await response.json();
    if (response.ok && data.status === 'success') {
      return {
        status: 'success',
        checkout_url: data.data.checkout_url
      };
    } else {
      console.error('❌ Chapa Init Error Details:', JSON.stringify(data, null, 2));
      return { 
        status: 'error', 
        message: data.message || 'Chapa API returned an error'
      };
    }
  } catch (error) {
    console.error('❌ Chapa Network Error:', error.message);
    return { status: 'error', message: error.message };
  }
};

export const verifyPayment = async (tx_ref) => {
  const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;

  if (!CHAPA_SECRET_KEY) {
    console.log(`⚠️ [MOCK CHAPA] Verifying payment tx_ref: ${tx_ref}...`);
    return { status: 'success', amount: null }; // Mock success
  }

  try {
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`
      }
    });

    const data = await response.json();
    if (response.ok && data.status === 'success') {
      return {
        status: 'success',
        amount: data.data.amount,
        charge: data.data.charge,
        method: data.data.method || 'Online'
      };
    } else {
      return { status: 'error', message: data.message };
    }
  } catch (error) {
    return { status: 'error', message: error.message };
  }
};
