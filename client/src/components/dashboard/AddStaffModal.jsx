import { useState, useEffect } from 'react';
import { X, UserPlus, Shield, Briefcase, Phone, Mail, Hash } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export default function AddStaffModal() {
  const { closeAddStaffModal, addStaff, updateStaff, selectedStaff } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    empId: '',
    name: '',
    role: 'Doctor',
    department: '',
    phone: '',
    email: '',
    status: 'Active'
  });

  useEffect(() => {
    if (selectedStaff) {
      setFormData({
        empId: selectedStaff.empId || '',
        name: selectedStaff.name || '',
        role: selectedStaff.role || 'Doctor',
        department: selectedStaff.department || '',
        phone: selectedStaff.phone || '',
        email: selectedStaff.email || '',
        status: selectedStaff.status || 'Active'
      });
    }
  }, [selectedStaff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (selectedStaff) {
        await updateStaff(selectedStaff.id, formData);
      } else {
        await addStaff(formData);
      }
      closeAddStaffModal();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to ${selectedStaff ? 'update' : 'register'} staff. Please try again.`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={closeAddStaffModal}>
      <div className="modal-content animate-scale-up" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-group">
            {selectedStaff ? <Shield size={24} className="text-primary" /> : <UserPlus size={24} className="text-primary" />}
            <h3 className="heading-4">{selectedStaff ? 'Edit Staff Member' : 'Register Healthcare Professional'}</h3>
          </div>
          <button className="modal-close" onClick={closeAddStaffModal}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {!selectedStaff && (
            <p className="modal-subtitle" style={{ marginBottom: '24px', color: 'var(--color-gray-500)', fontSize: '14px' }}>
              Enter the details below to create a new staff account. The Employee ID will be used as the initial password.
            </p>
          )}

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Full Name</label>
              <div className="input-with-icon">
                <UserPlus size={18} className="input-icon" />
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Employee ID (Unique)</label>
              <div className="input-with-icon">
                <Hash size={18} className="input-icon" />
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  placeholder="e.g. EMP-105"
                  value={formData.empId}
                  onChange={e => setFormData({...formData, empId: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">System Role</label>
              <div className="input-with-icon">
                <Shield size={18} className="input-icon" />
                <select 
                  className="form-control form-select"
                  required
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  style={{ appearance: 'auto', paddingLeft: '44px' }}
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Lab Technician">Lab Technician</option>
                  <option value="Pharmacist">Pharmacist</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Clinical Department</label>
              <div className="input-with-icon">
                <Briefcase size={18} className="input-icon" />
                {['Doctor', 'Nurse'].includes(formData.role) ? (
                  <select 
                    className="form-control form-select"
                    required
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    style={{ appearance: 'auto', paddingLeft: '44px' }}
                  >
                    <option value="" disabled>-- Select Department --</option>
                    {formData.role === 'Doctor' ? (
                      <>
                        {formData.department && !['General OPD', 'Internal Medicine', 'Pediatrics', 'OB/GYN', 'Emergency & Triage', 'ART Clinic', 'Minor Surgery', 'MCH', 'Cardiology'].includes(formData.department) && (
                          <option value={formData.department}>{formData.department}</option>
                        )}
                        <option value="General OPD">General OPD</option>
                        <option value="Internal Medicine">Internal Medicine</option>
                        <option value="Pediatrics">Pediatrics</option>
                        <option value="OB/GYN">OB/GYN</option>
                        <option value="Cardiology">Cardiology</option>
                        <option value="Emergency & Triage">Emergency & Triage</option>
                        <option value="ART Clinic">ART Clinic</option>
                        <option value="Minor Surgery">Minor Surgery</option>
                        <option value="MCH">MCH</option>
                      </>
                    ) : (
                      <>
                        {formData.department && !['Triage & Emergency', 'OPD Nursing', 'Maternal & Child Health (MCH)', 'Inpatient Ward', 'Operating Theatre', 'ART/HIV Clinic', 'Immunization Room', 'Dressing & Injection Room'].includes(formData.department) && (
                          <option value={formData.department}>{formData.department}</option>
                        )}
                        <option value="Triage & Emergency">Triage & Emergency</option>
                        <option value="OPD Nursing">OPD Nursing</option>
                        <option value="Maternal & Child Health (MCH)">Maternal & Child Health (MCH)</option>
                        <option value="Inpatient Ward">Inpatient Ward</option>
                        <option value="Operating Theatre">Operating Theatre</option>
                        <option value="ART/HIV Clinic">ART/HIV Clinic</option>
                        <option value="Immunization Room">Immunization Room</option>
                        <option value="Dressing & Injection Room">Dressing & Injection Room</option>
                      </>
                    )}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Administration"
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input 
                  type="tel" 
                  className="form-control" 
                  required
                  placeholder="+251 9XX-XXX-XXX"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  className="form-control" 
                  required
                  placeholder="name@hospital.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {selectedStaff && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Status</label>
                <div className="input-with-icon">
                  <Shield size={18} className="input-icon" />
                  <select 
                    className="form-control form-select"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    style={{ appearance: 'auto', paddingLeft: '44px' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            )}

          </div>

          <div className="modal-footer" style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-outline" onClick={closeAddStaffModal} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? (selectedStaff ? 'Updating...' : 'Registering...') : (selectedStaff ? 'Update Staff Member' : 'Complete Registration')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
