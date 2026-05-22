import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function PaymentVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your secure payment with the bank...');

  useEffect(() => {
    const verifyPayment = async () => {
      const searchParams = new URLSearchParams(location.search);
      const tx_ref = searchParams.get('tx_ref') || searchParams.get('trx_ref');
      const paymentStatus = searchParams.get('status');

      if (!tx_ref) {
        setStatus('error');
        setMessage('Invalid payment return URL. Missing transaction reference.');
        return;
      }

      try {
        const res = await api.get(`/billing/chapa-verify?tx_ref=${tx_ref}&status=${paymentStatus}`);
        setStatus('success');
        setMessage(res.data.message || 'Payment successfully processed!');
      } catch (error) {
        console.error('Verification Error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || 'Failed to verify payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [location]);

  return (
    <div className="dashboard-page slide-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="panel" style={{ padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
        
        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
            <h2 className="heading-2">Processing Payment</h2>
            <p style={{ color: 'var(--text-muted)' }}>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <CheckCircle size={64} color="var(--color-success)" />
            <h2 className="heading-2" style={{ color: 'var(--color-success)' }}>Payment Successful!</h2>
            <p style={{ color: 'var(--text-muted)' }}>{message}</p>
            <p style={{ fontSize: '14px', background: 'var(--color-highlight)', padding: '12px', borderRadius: '8px' }}>
              Your bill has been marked as Paid and your medical visit is now completed. A digital receipt has been sent to your phone.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard/profile')} style={{ marginTop: '20px' }}>
              Return to Profile
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <XCircle size={64} color="var(--color-danger)" />
            <h2 className="heading-2" style={{ color: 'var(--color-danger)' }}>Payment Failed</h2>
            <p style={{ color: 'var(--text-muted)' }}>{message}</p>
            <button className="btn btn-outline" onClick={() => navigate('/dashboard/profile')} style={{ marginTop: '20px' }}>
              Back to Billing
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
