import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Calendar, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSocket } from '../../contexts/SocketContext';

export default function AddPatientModal() {
  const { addPatient, updatePatient, closeAddPatientModal, selectedPatient } = useData();
  const { showToast } = useSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    bloodGroup: 'UnKnown',
    allergy: 'None',
    preferredLanguage: 'English'
  });

  // Load data if editing, or reset if adding new
  useEffect(() => {
    if (selectedPatient) {
      setFormData({
        name: selectedPatient.name || '',
        age: selectedPatient.age || '',
        gender: selectedPatient.gender || 'Male',
        phone: selectedPatient.phone || '',
        email: selectedPatient.email || '',
        address: selectedPatient.address || '',
        bloodGroup: selectedPatient.bloodGroup || 'UnKnown',
        allergy: selectedPatient.allergy || 'None',
        preferredLanguage: selectedPatient.preferredLanguage || 'English'
      });
    } else {
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
        phone: '',
        email: '',
        address: '',
        bloodGroup: 'UnKnown',
        allergy: 'None',
        preferredLanguage: 'English'
      });
    }
  }, [selectedPatient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (selectedPatient) {
        await updatePatient(selectedPatient.id || selectedPatient._id, formData);
        showToast(`Patient profile for ${formData.name} updated successfully!`, "success");
      } else {
        await addPatient(formData);
        showToast(`Patient ${formData.name} registered successfully!`, "success");
      }
      setIsLoading(false);
      closeAddPatientModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save patient. Please check all fields.');
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  return (
    <div className="modal-overlay" onClick={closeAddPatientModal}>
      <div className="modal-content animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', padding: '0' }}>
        <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 className="heading-4 text-gradient">{selectedPatient ? 'Update Patient Profile' : 'Register New Patient'}</h3>
          <button className="modal-close" onClick={closeAddPatientModal}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '32px' }}>
          {error && (
            <div className="login-error-alert" style={{ marginBottom: '20px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--color-danger)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '14px' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-500)' }} />
                  <input
                    name="name"
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    required
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-500)' }} />
                  <input
                    name="phone"
                    type="tel"
                    className="form-control"
                    placeholder="+251 ..."
                    style={{ paddingLeft: '40px', width: '100%' }}
                    required
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age</label>
                <input
                  name="age"
                  type="number"
                  className="form-control"
                  placeholder="25"
                  style={{ width: '100%' }}
                  required
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</label>
                <select
                  name="gender"
                  className="form-control"
                  style={{ width: '100%', appearance: 'auto', background: 'var(--color-bg-surface)' }}
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blood Group</label>
                <select
                  name="bloodGroup"
                  className="form-control"
                  style={{ width: '100%', appearance: 'auto', background: 'var(--color-bg-surface)' }}
                  value={formData.bloodGroup}
                  onChange={handleChange}
                >
                  <option value="UnKnown">UnKnown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-500)' }} />
                  <input
                    name="email"
                    type="email"
                    className="form-control"
                    placeholder="patient@example.com"
                    style={{ paddingLeft: '40px', width: '100%' }}
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Allergies</label>
                <input
                  name="allergy"
                  type="text"
                  className="form-control"
                  placeholder="e.g. None"
                  style={{ width: '100%' }}
                  value={formData.allergy}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language</label>
                <select
                  name="preferredLanguage"
                  className="form-control"
                  style={{ width: '100%', appearance: 'auto', background: 'var(--color-bg-surface)' }}
                  value={formData.preferredLanguage}
                  onChange={handleChange}
                >
                  <option value="English">English</option>
                  <option value="Amharic">Amharic (አማርኛ)</option>
                  <option value="Oromic">Oromic (Afaan Oromoo)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '32px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Home Address</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '16px', color: 'var(--color-gray-500)' }} />
                <textarea
                  name="address"
                  className="form-control"
                  placeholder="Street name, City..."
                  style={{ paddingLeft: '40px', minHeight: '80px', paddingTop: '12px', width: '100%', resize: 'none' }}
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, height: '48px' }}
                onClick={closeAddPatientModal}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, height: '48px' }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (selectedPatient ? 'Update Profile' : 'Register Patient')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
