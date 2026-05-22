import { useState } from 'react';
import { X, Calendar, Clock, User, Stethoscope, FileText, Loader2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useSocket } from '../../contexts/SocketContext';

export default function AddVisitModal() {
  const { patients, staffs, addVisit, updateVisit, closeAddVisitModal, selectedPatientId, selectedVisit } = useData();
  const { onlineUsers, showToast } = useSocket();
  const [isLoading, setIsLoading] = useState(false);

  const initialPatient = patients.find(p => p.id === (selectedVisit?.patientId || selectedPatientId)) || patients[0];
  const clinicians = staffs.filter(s => ['Doctor', 'Nurse'].includes(s.role));

  const [formData, setFormData] = useState({
    patientId: selectedVisit?.patientId || initialPatient?.id || '',
    patientName: selectedVisit?.patientName || initialPatient?.name || '',
    doctor: selectedVisit?.doctor || clinicians[0]?.name || 'Dr. Sarah Jenkins',
    type: selectedVisit?.type || 'Checkup',
    date: selectedVisit?.date || new Date().toISOString().split('T')[0],
    time: selectedVisit?.time || '10:00 AM',
    reason: selectedVisit?.reason || ''
  });


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Find the current patient name if it was changed
      const currentPatient = patients.find(p => p.id === formData.patientId);

      const visitToSubmit = {
        ...formData,
        patientName: currentPatient?.name || formData.patientName
      };

      if (selectedVisit) {
        await updateVisit(selectedVisit.id, visitToSubmit);
        showToast(`Visit for ${currentPatient?.name || formData.patientName} has been successfully updated!`, "success");
      } else {
        await addVisit(visitToSubmit);
        showToast(`Visit for ${currentPatient?.name || formData.patientName} has been successfully scheduled!`, "success");
      }

      setIsLoading(false);
      closeAddVisitModal();
    } catch (err) {
      setIsLoading(false);
      showToast(err.message || "Failed to schedule visit. Please try again.", "danger");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  return (
    <div className="modal-overlay" onClick={closeAddVisitModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h3 className="heading-4 text-gradient">{selectedVisit ? 'Update Clinical Visit' : 'Schedule New Visit'}</h3>
          <button className="modal-close" onClick={closeAddVisitModal}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label className="form-label">Select Patient</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                <select
                  name="patientId"
                  className="form-control form-select"
                  style={{ paddingLeft: '40px' }}
                  value={formData.patientId}
                  onChange={handleChange}
                  required
                  disabled={!!selectedPatientId}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.pid})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Visit Type</label>
                <select
                  name="type"
                  className="form-control form-select"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option>Checkup</option>
                  <option>Follow-up</option>
                  <option>Consultation</option>
                  <option>Emergency</option>
                  <option>Lab Test</option>
                  <option>Imaging</option>
                  <option>Vaccination</option>
                  <option>Maternal Care</option>
                  <option>Referral</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Attending Clinician / Room</label>
                <div style={{ position: 'relative' }}>
                  <Stethoscope size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                  <select
                    name="doctor"
                    className="form-control form-select"
                    style={{ paddingLeft: '40px' }}
                    value={formData.doctor}
                    onChange={handleChange}
                  >
                    {clinicians.length > 0 ? (
                      clinicians.map(c => {
                        const isOnline = (onlineUsers || []).some(u =>
                          (u.name || '').toLowerCase().includes((c.name || '').toLowerCase()) ||
                          (c.name || '').toLowerCase().includes((u.name || '').toLowerCase())
                        );
                        return (
                          <option key={c.id} value={c.name}>
                            {c.name} ({c.role === 'Nurse' ? `Nurse - ${c.department}` : `Doctor - ${c.department || 'General'}`}) {isOnline ? '(🟢 Online)' : '(Offline)'}
                          </option>
                        );
                      })
                    ) : (
                      <option>Dr. Sarah Jenkins</option>
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                  <input
                    name="date"
                    type="date"
                    className="form-control"
                    style={{ paddingLeft: '40px' }}
                    required
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Time</label>
                <div style={{ position: 'relative' }}>
                  <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                  <input
                    name="time"
                    type="text"
                    className="form-control"
                    placeholder="10:00 AM"
                    style={{ paddingLeft: '40px' }}
                    required
                    value={formData.time}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>


            <div className="form-group">
              <label className="form-label">Reason for Visit</label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '16px', color: 'var(--color-gray-400)' }} />
                <textarea
                  name="reason"
                  className="form-control"
                  placeholder="Describe the complaint or reason for visit..."
                  style={{ paddingLeft: '40px', minHeight: '80px', paddingTop: '12px' }}
                  required
                  value={formData.reason}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px', marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-outline flex-1"
                onClick={closeAddVisitModal}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (selectedVisit ? 'Update Visit' : 'Confirm Visit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
