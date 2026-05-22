import { useState } from 'react';
import { X, Loader2, Mail, Lock, AlertCircle, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import './LoginModal.css';

export default function LoginModal({ onClose, initialIsPatient = false }) {
  const navigate = useNavigate();
  const { login, googleLogin, patientLogin } = useAuth();

  // State
  const [isPatient, setIsPatient] = useState(initialIsPatient);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pid: '',
    name: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(''); // Clear error when user types
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let result;
      if (isPatient) {
        result = await patientLogin(formData.pid, formData.name);
      } else {
        result = await login(formData.email.trim(), formData.password);
      }

      if (result.success) {
        setIsLoading(false);
        onClose();
        navigate(isPatient ? '/dashboard/overview' : '/dashboard/overview');
      } else {
        setError(result.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      const result = await googleLogin(tokenResponse.access_token);
      if (result.success) {
        onClose();
        navigate('/dashboard/overview');
      } else {
        setError(result.message);
      }
      setIsLoading(false);
    },
    onError: () => {
      setError('Google Login failed. Please try again.');
    },
  });

  return (
    <div className="login-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="login-modal-container animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <button className="login-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="login-header">
          <div className="login-logo-ring">
            {isPatient ? <User size={32} /> : <ShieldCheck size={32} />}
          </div>
          <h3 className="login-title">{isPatient ? 'Patient Portal' : 'Staff Access'}</h3>
          <p className="login-subtitle">
            {isPatient ? 'Access your medical history & results' : 'Secure gateway to HealthCare Pro'}
          </p>
        </div>

        <div className="login-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setIsPatient(false)}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              color: !isPatient ? 'var(--color-primary)' : 'var(--color-gray-400)',
              borderBottom: !isPatient ? '2px solid var(--color-primary)' : 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setIsPatient(true)}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              color: isPatient ? 'var(--color-primary)' : 'var(--color-gray-400)',
              borderBottom: isPatient ? '2px solid var(--color-primary)' : 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Patient
          </button>
        </div>

        <div className="login-body">
          {error && (
            <div className="login-error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="login-form">
            {!isPatient ? (
              <>
                <div className="login-input-group">
                  <label className="login-input-label">Work Email</label>
                  <div className="login-input-wrapper">
                    <input
                      name="email"
                      type="email"
                      className="login-field"
                      placeholder="name@hospital.com"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                    <Mail size={18} className="login-input-icon" />
                  </div>
                </div>

                <div className="login-input-group">
                  <label className="login-input-label">Password</label>
                  <div className="login-input-wrapper">
                    <input
                      name="password"
                      type="password"
                      className="login-field"
                      placeholder="••••••••"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <Lock size={18} className="login-input-icon" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="login-input-group">
                  <label className="login-input-label">Patient ID</label>
                  <div className="login-input-wrapper">
                    <input
                      name="pid"
                      type="text"
                      className="login-field"
                      placeholder="e.g., P-12345"
                      required
                      value={formData.pid}
                      onChange={handleInputChange}
                    />
                    <ShieldCheck size={18} className="login-input-icon" />
                  </div>
                </div>

                <div className="login-input-group">
                  <label className="login-input-label">Your Name (First Name)</label>
                  <div className="login-input-wrapper">
                    <input
                      name="name"
                      type="text"
                      className="login-field"
                      placeholder="e.g., Shamsu"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                    <User size={18} className="login-input-icon" />
                  </div>
                </div>
              </>
            )}

            <div className="login-options">
              {!isPatient && (
                <a href="#" className="login-forgot-link">
                  Forgot password?
                </a>
              )}
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Verifying...</span>
                </>
              ) : (
                isPatient ? 'Access My Portal' : 'Secure Sign In'
              )}
            </button>

            {!isPatient && (
              <>
                <div className="login-divider">
                  <span>Or continue with</span>
                </div>

                <button
                  type="button"
                  className="google-btn"
                  onClick={() => loginWithGoogle()}
                  disabled={isLoading}
                >
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
