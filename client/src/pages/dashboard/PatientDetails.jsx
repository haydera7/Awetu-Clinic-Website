import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Calendar, MapPin, Pill, Activity, Stethoscope, Download, Heart, Thermometer, Weight, FileText, CalendarPlus, Clock, Send } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { exportMedicalRecordToPdf } from '../../utils/ExportPdf';
import './PatientDetails.css';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, visits, medicalRecords, vitals, prescriptions, staffs, openAddVisitModal, openAddRecordModal, bookAppointment } = useData();
  const { user } = useAuth();
  const { showToast } = useSocket();
  const [activeTab, setActiveTab] = useState('visits');
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    date: '',
    timeSlot: '',
    reason: ''
  });
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);

  const timeSlots = [
    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
  ];

  // Find the doctor staff record matching the logged-in user
  const currentDoctorStaff = staffs.find(s => s.role === 'Doctor' && (s.name === user?.name || s.id === user?.empId || s.empId === user?.empId));

  const handleFollowUpSubmit = async (e) => {
    e.preventDefault();
    setFollowUpSubmitting(true);
    try {
      const doctorId = currentDoctorStaff?.id || currentDoctorStaff?.empId || user?.empId || user?.id;
      await bookAppointment({
        patientId: patient?.id,
        doctorId,
        date: followUpForm.date,
        timeSlot: followUpForm.timeSlot,
        type: 'Follow-up',
        reason: followUpForm.reason
      });
      setIsFollowUpModalOpen(false);
      setFollowUpForm({ date: '', timeSlot: '', reason: '' });
      showToast(`Follow-up appointment for ${patient?.name || 'Patient'} scheduled successfully!`, "success");
    } catch (err) {
      showToast('Failed to schedule: ' + (err.response?.data?.message || err.message), "danger");
    } finally {
      setFollowUpSubmitting(false);
    }
  };

  const patient = patients.find(p => p.id === id);
  const patientVisits = visits.filter(v => v.patientId === id);
  const patientRecords = medicalRecords.filter(r => r.patientId === id && (user?.role !== 'Admin' || r.type !== 'Lab Request'));
  const patientPrescriptions = prescriptions.filter(p => p.patientId === id);
  const latestVitals = vitals.filter(v => v.patientId === id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const canAddVisit = ['Receptionist'].includes(user?.role);
  const canAddRecord = ['Lab Technician', 'Doctor', 'Nurse'].includes(user?.role);
  const latestActiveVisit = patientVisits.find(v => !['Completed', 'Cancelled'].includes(v.status));

  if (!patient) {
    if (patients.length === 0) {
      return (
        <div className="patient-details-page slide-in" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div style={{ margin: '0 auto', marginBottom: '20px', width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <h2 className="heading-3" style={{ color: 'var(--color-gray-500)' }}>Loading Patient Data...</h2>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    return (
      <div className="patient-details-page slide-in" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2 className="heading-2">Patient Not Found</h2>
        <p style={{ color: 'var(--color-gray-500)', marginBottom: '24px' }}>The patient you are looking for does not exist or has been removed.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard/patients')}>
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="patient-details-page slide-in">
      <div className="overview-header" style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-btn" onClick={() => navigate('/dashboard/patients')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="heading-3">Patient Profile</h1>
            <p style={{ color: 'var(--color-gray-500)' }}>{patient.pid} • {patient.status} Patient</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canAddRecord && patient.status !== 'Inactive' && (() => {
            // For Doctors, only allow adding record if they are assigned to the latest active visit
            if (user?.role === 'Doctor' && latestActiveVisit) {
              const isMyVisit = (latestActiveVisit.doctor || '').toLowerCase().includes(user.name.toLowerCase()) || 
                                (user.name || '').toLowerCase().includes((latestActiveVisit.doctor || '').replace('DR.', '').trim().toLowerCase());
              if (!isMyVisit) return null;
            }
            return (
              <button className="btn btn-secondary" onClick={() => openAddRecordModal(patient.id, latestActiveVisit?.id)}>
                + Add Record
              </button>
            );
          })()}
          {canAddVisit && (
            <button className="btn btn-primary" style={{ boxShadow: 'var(--shadow-glow)' }} onClick={() => openAddVisitModal(patient.id)}>
              + Add Visit
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-large" style={{ color: 'var(--color-avatar)' }} > {patient.name.split(' ').map(n => n[0]).join('')}</div>
        <div className="profile-info">
          <h2 className="heading-2" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>{patient.name}</h2>
          <div className="profile-tags">
            <span className={`badge ${patient.status === 'Active' ? 'badge-success' : patient.status === 'Referred' ? 'badge-purple' : 'badge-danger'}`} style={{ border: 'transparent', textTransform: 'uppercase' }}>
              {patient.status} Patient
            </span>
            <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', border: 'transparent' }}>{patient.gender}, {patient.age} yrs</span>
            {patient.allergy && patient.allergy !== 'None' && (
              <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', border: 'transparent' }}>
                Allergy: {patient.allergy}
              </span>
            )}
          </div>

          <div className="profile-contacts">
            <div className="contact-item"><Phone size={14} /> {patient.phone}</div>
            <div className="contact-item"><Mail size={14} /> {patient.email}</div>
            <div className="contact-item"><Calendar size={14} /> DOB: {patient.dob}</div>
            <div className="contact-item"><MapPin size={14} /> {patient.address}</div>
          </div>

          {latestVitals && (
            <div className="vitals-header-strip">
              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#fef2f2' }}><Heart size={16} /></div>
                  Blood Pressure
                </div>
                <div><span className="vital-val">{latestVitals.bp}</span> <span className="vital-unit">mmHg</span></div>
              </div>

              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#f5f3ff' }}><Activity size={16} /></div>
                  Heart Rate
                </div>
                <div><span className="vital-val">{latestVitals.heartRate}</span> <span className="vital-unit">bpm</span></div>
              </div>

              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#fffbeb' }}><Thermometer size={16} /></div>
                  Temperature
                </div>
                <div><span className="vital-val">{latestVitals.temp}</span> <span className="vital-unit">°C</span></div>
              </div>

              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#ecfdf5' }}><Weight size={16} /></div>
                  Weight
                </div>
                <div><span className="vital-val">{latestVitals.weight}</span> <span className="vital-unit">kg</span></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs System */}
      <div className="tabs-container">
        <div className="tabs-list">
          <button className={`tab-btn ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}>
            Visits
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            Medical History
          </button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            Reports & Prescriptions
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'visits' && (
            <div className="visits-tab animate-fade-in">
              <div className="timeline">
                {patientVisits.map((visit, i) => (
                  <div key={visit.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-card panel hover-lift" style={{ transform: 'none', boxShadow: 'var(--shadow-sm)', background: 'var(--glass-bg, rgba(255, 255, 255, 0.7))' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="timeline-date ">{visit.date}</div>
                          <h4 className="heading-4" style={{ fontSize: 'var(--font-size-base)', marginBottom: '8px', color: 'green' }}>{visit.type}: {visit.reason}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {user?.role === 'Doctor' && (() => {
                            const isMyVisit = (visit.doctor || '').toLowerCase().includes(user.name.toLowerCase()) || 
                                              (user.name || '').toLowerCase().includes((visit.doctor || '').replace('DR.', '').trim().toLowerCase());
                            if (!isMyVisit) return null;
                            return (
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--color-purple)', color: 'var(--color-purple)' }}
                                onClick={() => {
                                  setFollowUpForm({ date: '', timeSlot: '', reason: `Follow-up for: ${visit.reason || visit.type}` });
                                  setIsFollowUpModalOpen(true);
                                }}
                              >
                                <CalendarPlus size={14} /> Schedule Follow-up
                              </button>
                            );
                          })()}
                          {canAddRecord && patient.status !== 'Inactive' && (() => {
                            if (user?.role === 'Doctor') {
                              const isMyVisit = (visit.doctor || '').toLowerCase().includes(user.name.toLowerCase()) || 
                                                (user.name || '').toLowerCase().includes((visit.doctor || '').replace('DR.', '').trim().toLowerCase());
                              if (!isMyVisit) return null;
                            }
                            return (
                              <button className="btn btn-outline" style={{ fontSize: '18px', padding: '4px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark' }} onClick={() => openAddRecordModal(patient.id, visit.id)}>
                                + Add Finding
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="timeline-footer" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                          <Stethoscope size={16} /> Attending: {visit.doctor}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {patientVisits.length === 0 && (
                  <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: '40px' }}>No visit record found.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-tab animate-fade-in" style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>

              <div className="panel">
                <div className="panel-header" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '12px 20px' }}>
                  <h3 className="heading-4" style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Pill size={18} /> Medication Records & Prescriptions
                  </h3>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {patientPrescriptions.map(presc => (
                    <div key={presc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-highlight)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h4 style={{ fontWeight: 600, color: 'var(--text-color)', margin: 0 }}>RX: {presc.items.map(i => i.name).join(', ')}</h4>
                          {presc.status === 'PRESCRIBED' && <span className="badge badge-warning" style={{ fontSize: '10px' }}>Pending</span>}
                          {presc.status === 'DISPENSED' && <span className="badge badge-success" style={{ fontSize: '10px' }}>Dispensed</span>}
                          {presc.status === 'REFERRED' && <span className="badge badge-info" style={{ fontSize: '10px' }}>Referred (External)</span>}
                          {presc.status === 'PARTIALLY_DISPENSED' && <span className="badge badge-primary" style={{ fontSize: '10px' }}>Partial</span>}
                        </div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{presc.items.map(i => `${i.name}${i.requestedQty > 0 ? ` (${i.requestedQty} units)` : ''}${i.dosage ? ` - ${i.dosage}` : ''}`).join('; ')}</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: '4px' }}>Prescription ID: {presc.id} • {new Date(presc.date).toLocaleDateString()}</p>
                      </div>
                      <button className="btn btn-outline" style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => exportMedicalRecordToPdf({ ...presc, title: 'Prescription', notes: presc.items.map(i => `${i.name}${i.requestedQty > 0 ? ` (${i.requestedQty} units)` : ''}${i.dosage ? ` (${i.dosage})` : ''}`).join('\n') }, patient)}>
                        <Download size={14} /> PDF
                      </button>
                    </div>
                  ))}
                  {patientPrescriptions.length === 0 && (
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>No active prescriptions.</p>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header" style={{ background: '#fef3c7', color: '#b45309', padding: '12px 20px' }}>
                  <h3 className="heading-4" style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} /> Recent Lab Results
                  </h3>
                </div>
                <div style={{ padding: '20px' }}>
                  {patientRecords.filter(r => r.type === 'Lab Result').map(lab => (
                    <div key={lab.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                      <div>
                        <h4 style={{ fontWeight: 500, color: 'var(--text-color)' }}>{lab.title}</h4>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{lab.date ? new Date(lab.date).toLocaleDateString() : 'N/A'} - Result: {lab.notes}</p>
                        {lab.fileName && (
                          <a
                            href={lab.fileData || '#'}
                            download={lab.fileName}
                            onClick={(e) => {
                              if (!lab.fileData) {
                                e.preventDefault();
                                const element = document.createElement("a");
                                let href;
                                const lowerName = lab.fileName.toLowerCase();
                                if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
                                  const canvas = document.createElement('canvas');
                                  canvas.width = 400;
                                  canvas.height = 300;
                                  const ctx = canvas.getContext('2d');
                                  ctx.fillStyle = '#f0f0f0';
                                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                                  ctx.fillStyle = '#333';
                                  ctx.font = '20px sans-serif';
                                  ctx.textAlign = 'center';
                                  ctx.fillText('Mock Image: ' + lab.fileName, canvas.width / 2, canvas.height / 2);
                                  href = canvas.toDataURL('image/png');
                                } else if (lowerName.endsWith('.pdf')) {
                                  href = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLdnKFTDUM1QwAEIwm10vWgAK1w2gCmVuZHN0cmVhbQplbmRvYmoKCjMgMCBvYmoKNDQKZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZS9NZWRpYUJveFswIDAgNTk1LjI3NiA4NDEuODk0XS9SZXNvdXJjZXM8PC9Gb250PDwvRjEgMSAwIFI+Pj4+L0NvbnRlbnRzIDIgMCBSL1BhcmVudCA1IDAgUj4+CmVuZG9iagoKMSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2EvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nPj4KZW5kb2JqCgo1IDAgb2JqCjw8L1R5cGUvUGFnZXMvS2lkc1s0IDAgUl0vQ291bnQgMT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNSAwIFI+PgplbmRvYmoKCjcgMCBvYmoKPDwvUHJvZHVjZXIoZHVtbXkpL0NyZWF0aW9uRGF0ZShEOjIwMjQxMTE1MDAwMDAwWik+PgplbmRvYmoKPHhyZWYKMCA4CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDI1OCAwMDAwMCBuIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxMzIgMDAwMDAgbiAKMDAwMDAwMDE1MSAwMDAwMCBuIAowMDAwMDAwMzQ2IDAwMDAwIG4gCjAwMDAwMDA0MDMgMDAwMDAgbiAKMDAwMDAwMDQ1MyAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgOC9Sb290IDYgMCBSL0luZm8gNyAwIFI+PgpzdGFydHhyZWYKNTE5CiUlRU9GCg==';
                                } else {
                                  const fileBlob = new Blob(["Mock file content for " + lab.fileName], {type: 'text/plain'});
                                  href = URL.createObjectURL(fileBlob);
                                }
                                element.href = href;
                                element.download = lab.fileName;
                                document.body.appendChild(element);
                                element.click();
                                document.body.removeChild(element);
                              }
                            }}
                            style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', cursor: 'pointer' }}
                          >
                            <FileText size={12} /> Attached: {lab.fileName}
                          </a>
                        )}
                      </div>
                      <button className="btn btn-outline" style={{ fontSize: '12px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => exportMedicalRecordToPdf(lab, patient)}>
                        <Download size={14} /> PDF
                      </button>
                    </div>
                  ))}
                  {patientRecords.filter(r => r.type === 'Lab Result').length === 0 && (
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', padding: '10px' }}>No lab results available.</p>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header" style={{ background: '#e0e7ff', color: '#3730a3', padding: '12px 20px' }}>
                  <h3 className="heading-4" style={{ fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={18} /> Referral Letters
                  </h3>
                </div>
                <div style={{ padding: '20px' }}>
                  {patientRecords.filter(r => r.type === 'Referral').map(ref => {
                    let reasonText = ref.notes;
                    try {
                      const data = JSON.parse(ref.notes);
                      reasonText = data.reasonForReferral || 'Referral';
                    } catch (e) {
                      // It's a standard string
                    }
                    return (
                      <div key={ref.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', marginBottom: '16px', background: 'var(--glass-bg, rgba(255, 255, 255, 0.05))', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ background: 'var(--color-highlight)', padding: '8px', borderRadius: '8px', color: 'var(--color-primary)' }}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 style={{ fontWeight: 600, color: 'var(--text-color)', margin: 0, fontSize: '15px' }}>Referral To: {ref.title}</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Issued on {ref.date ? new Date(ref.date).toLocaleDateString() : 'N/A'} by {ref.doctor}</p>
                            </div>
                          </div>
                          <div style={{ marginLeft: '48px', padding: '10px 14px', background: 'var(--color-highlight)', borderRadius: '6px', borderLeft: '3px solid var(--color-primary)' }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                              <span style={{ fontWeight: 600, fontStyle: 'normal', color: 'var(--text-color)' }}>Reason:</span> {reasonText}
                            </p>
                          </div>
                        </div>
                        <div style={{ marginLeft: '24px' }}>
                          <button className="btn btn-outline" style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => exportMedicalRecordToPdf(ref, patient)}>
                            <Download size={16} /> Print Letter
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {patientRecords.filter(r => r.type === 'Referral').length === 0 && (
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', padding: '10px' }}>No referrals have been issued.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-tab animate-fade-in panel" style={{ padding: '24px' }}>
              <h3 className="heading-4" style={{ marginBottom: '16px' }}>Diagnosis History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientRecords.filter(r => r.type === 'Diagnosis').map(diag => (
                  <div key={diag.id} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>{diag.date}</div>
                    <h4 style={{ fontWeight: 600, margin: '4px 0', color: 'var(--text-color)' }}>{diag.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{diag.notes}</p>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>Diagnosed by {diag.doctor}</div>
                  </div>
                ))}
                {patientRecords.filter(r => r.type === 'Diagnosis').length === 0 && (
                  <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>No diagnosis history found.</p>
                )}
              </div>
              <hr style={{ border: 0, borderTop: '1px solid var(--glass-border)', margin: '24px 0' }} />
              <h3 className="heading-4" style={{ marginBottom: '16px' }}>Notes & Allergies</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Known Allergies: <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{patient.allergy || 'None'}</span>
              </p>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '8px' }}>
                Address: {patient.address}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Follow-up Appointment Modal */}
      {isFollowUpModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ width: '460px', padding: 'var(--spacing-8)', borderRadius: 'var(--radius-2xl)', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-6)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-lg)', background: 'rgba(157, 0, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-purple)' }}>
                <CalendarPlus size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>Schedule Follow-up</h2>
                <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', margin: 0 }}>For {patient.name} ({patient.pid})</p>
              </div>
            </div>

            <div style={{ background: 'rgba(157, 0, 255, 0.05)', border: '1px solid rgba(157, 0, 255, 0.15)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 'var(--spacing-5)', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-gray-400)' }}>
                <Stethoscope size={14} />
                <span>Doctor: <strong style={{ color: 'var(--color-white)' }}>Dr. {user?.name?.replace(/^DR\.?\s*/i, '')}</strong></span>
              </div>
            </div>

            <form onSubmit={handleFollowUpSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Return Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={followUpForm.date}
                    onChange={e => setFollowUpForm({...followUpForm, date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Time Slot *</label>
                  <select className="form-control" required value={followUpForm.timeSlot} onChange={e => setFollowUpForm({...followUpForm, timeSlot: e.target.value})}>
                    <option value="">Select Time</option>
                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason / Instructions</label>
                <textarea
                  className="form-control"
                  style={{ height: '80px' }}
                  value={followUpForm.reason}
                  onChange={e => setFollowUpForm({...followUpForm, reason: e.target.value})}
                  placeholder="E.g., Check wound healing, CBC result review, Monthly BP & sugar check, ART refill..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline flex-1" onClick={() => setIsFollowUpModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex-1" disabled={followUpSubmitting} style={{ background: 'var(--color-purple)', borderColor: 'var(--color-purple)' }}>
                  {followUpSubmitting ? 'Scheduling...' : 'Confirm Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div >
  );
}
