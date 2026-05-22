import { useState } from 'react';
import { Calendar, Clock, User, Plus, Search, Filter, MoreVertical, CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useTranslation } from '../../utils/translations';
import './Appointments.css';

export default function Appointments() {
  const { appointments, patients, staffs, bookAppointment, updateAppointmentStatus, deleteAppointment } = useData();
  const { user } = useAuth();
  const { showToast } = useSocket();

  const patientRecord = user?.role === 'Patient' ? patients.find(p => p.id === user?._id || p.pid === user?.pid) : null;
  const preferredLanguage = patientRecord?.preferredLanguage || 'English';
  const { t } = useTranslation(preferredLanguage);
  
  const [selectedDate, setSelectedDate] = useState(''); // Empty string shows all dates by default
  const [searchTerm, setSearchTerm] = useState('');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patientId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '',
    type: 'Follow-up',
    reason: ''
  });

  const filteredAppointments = appointments.filter(apt => {
    // Role based filtering
    if (user?.role === 'Patient' && (apt.patientId !== user._id && apt.patientId !== user.pid)) {
      return false;
    }

    const aptDate = apt.date || '';
    const matchesDate = aptDate.startsWith(selectedDate);
    const matchesSearch = !searchTerm || 
                          apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          apt.appointmentId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // Auto-resolve doctor ID from logged-in user
  const currentDoctorStaff = staffs.find(s => s.role === 'Doctor' && (s.name === user?.name || s.id === user?.empId || s.empId === user?.empId));
  const currentDoctorId = currentDoctorStaff?.id || currentDoctorStaff?.empId || user?.empId || user?.id || '';

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      await bookAppointment({ ...bookingForm, doctorId: currentDoctorId });
      const currentPatient = patients.find(p => p.id === bookingForm.patientId);
      showToast(`Appointment for ${currentPatient ? currentPatient.name : 'Patient'} has been successfully scheduled!`, "success");
      setSelectedDate(bookingForm.date); // Switch filter to the booked date to show it
      setIsBookModalOpen(false);
      setBookingForm({
        patientId: '',
        doctorId: '',
        date: new Date().toISOString().split('T')[0],
        timeSlot: '',
        type: 'Follow-up',
        reason: ''
      });
    } catch (err) {
      showToast(err.response?.data?.message || err.message, "danger");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    if (status === 'Cancelled' && !window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await updateAppointmentStatus(id, status);
      showToast(`Appointment status updated to ${status}!`, "success");
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const timeSlots = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
  ];

  return (
    <div className="dashboard-page animate-fade-in" style={{ padding: 'var(--spacing-6)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-8)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <Calendar size={32} className="text-primary" />
            {user?.role === 'Patient' ? t('appointments') : 'Appointments'}
          </h1>
          <p style={{ color: 'var(--color-gray-400)', marginTop: '4px' }}>
            {user?.role === 'Patient' ? t('followUpSchedules') : 'Patient follow-up schedules and return dates'}
          </p>
        </div>

        {user?.role === 'Doctor' && (
          <button className="btn btn-primary" onClick={() => setIsBookModalOpen(true)}>
            <Plus size={20} /> Schedule Follow-up
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ padding: 'var(--spacing-6)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--spacing-6)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '300px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder={user?.role === 'Patient' ? t('searchPlaceholder') : "Search by patient name or ID..."} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ width: '200px', marginBottom: 0 }}>
            <input 
              type="date" 
              className="form-control" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-card glass-panel" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '16px' }}>{user?.role === 'Patient' ? t('time') : 'Time'}</th>
                <th style={{ padding: '16px' }}>{user?.role === 'Patient' ? t('patient') : 'Patient'}</th>
                <th style={{ padding: '16px' }}>{user?.role === 'Patient' ? t('doctor') : 'Doctor'}</th>
                <th style={{ padding: '16px' }}>{user?.role === 'Patient' ? t('type') : 'Type'}</th>
                <th style={{ padding: '16px' }}>{user?.role === 'Patient' ? t('status') : 'Status'}</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>
                  {['Doctor', 'Receptionist'].includes(user?.role) && 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? filteredAppointments.map(apt => (
                <tr key={apt.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                      <Clock size={16} className="text-primary" />
                      {apt.timeSlot}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>{apt.patientName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{apt.appointmentId}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div>Dr. {apt.doctorName}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      fontSize: '12px', 
                      padding: '3px 10px', 
                      borderRadius: 'var(--radius-full)',
                      background: apt.type === 'Follow-up' ? 'rgba(157, 0, 255, 0.1)' : 'rgba(0, 240, 255, 0.1)', 
                      color: apt.type === 'Follow-up' ? 'var(--color-purple)' : 'var(--color-primary)',
                      fontWeight: 500
                    }}>{apt.type}</span>
                    {apt.reason && (
                      <div style={{ fontSize: '11px', color: 'var(--color-gray-500)', marginTop: '4px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{apt.reason}</div>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`badge badge-${
                      apt.status === 'Scheduled' ? 'primary' : 
                      apt.status === 'Checked-In' ? 'warning' : 
                      apt.status === 'Completed' ? 'success' : 'danger'
                    }`}>
                      {apt.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {apt.status === 'Scheduled' && (
                        <>
                          {user?.role === 'Receptionist' && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 12px', fontSize: '12px', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                              onClick={() => handleStatusUpdate(apt.id, 'Checked-In')}
                            >
                              Check-in
                            </button>
                          )}
                          {user?.role === 'Doctor' && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 12px', fontSize: '12px', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                              onClick={() => handleStatusUpdate(apt.id, 'Cancelled')}
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                    <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <p>{user?.role === 'Patient' ? t('noAppointments') : 'No appointments found for this date.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ width: '500px', padding: 'var(--spacing-8)', borderRadius: 'var(--radius-2xl)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-6)', fontSize: 'var(--font-size-xl)' }}>Schedule Follow-up</h2>
            <form onSubmit={handleBookSubmit}>
              <div className="form-group">
                <label className="form-label">Patient</label>
                <select className="form-control" required value={bookingForm.patientId} onChange={e => setBookingForm({...bookingForm, patientId: e.target.value})}>
                  <option value="">Select Patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.pid})</option>)}
                </select>
              </div>
              <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 'var(--spacing-4)', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gray-400)' }}>
                  <User size={14} />
                  <span>Doctor: <strong style={{ color: 'var(--color-white)' }}>Dr. {user?.name?.replace(/^DR\.?\s*/i, '')}</strong></span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-control" required value={bookingForm.date} onChange={e => setBookingForm({...bookingForm, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Slot</label>
                  <select className="form-control" required value={bookingForm.timeSlot} onChange={e => setBookingForm({...bookingForm, timeSlot: e.target.value})}>
                    <option value="">Select Slot</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Appointment Type</label>
                <select className="form-control" required value={bookingForm.type} onChange={e => setBookingForm({...bookingForm, type: e.target.value})}>
                  <option value="Follow-up">Follow-up (ክትትል)</option>
                  <option value="Chronic Care">Chronic Care (ሥር በሽታ)</option>
                  <option value="Lab Result Review">Lab Result Review (የላብ ውጤት)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason / Notes</label>
                <textarea className="form-control" style={{ height: '80px' }} value={bookingForm.reason} onChange={e => setBookingForm({...bookingForm, reason: e.target.value})} placeholder="E.g., Check wound healing, CBC result review, Monthly BP & sugar check, ART refill..." />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setIsBookModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
