import { useState } from 'react';
import { ArrowLeft, Phone, Mail, Calendar, MapPin, Pill, Activity, Download, Heart, Thermometer, Weight, FileText, Send, User } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportMedicalRecordToPdf, exportBillReceiptToPdf } from '../../utils/ExportPdf';
import { useTranslation } from '../../utils/translations';
import api from '../../services/api';
import './PatientDetails.css';

export default function MyProfile() {
  const { user } = useAuth();
  const { patients, visits, medicalRecords, vitals, prescriptions, bills, updatePatient } = useData();
  const [activeTab, setActiveTab] = useState('visits');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Find the current patient's data
  const patient = patients.find(p => p.id === user?._id || p.pid === user?.pid);
  const preferredLanguage = patient?.preferredLanguage || 'English';
  const { t } = useTranslation(preferredLanguage);
  
  if (!patient) {
    return (
      <div className="dashboard-page" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h2 className="heading-2">Profile Not Found</h2>
        <p style={{ color: 'var(--color-gray-500)' }}>We couldn't retrieve your patient profile data.</p>
      </div>
    );
  }

  const patientId = patient.id;
  const patientVisits = visits.filter(v => v.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const patientRecords = medicalRecords.filter(r => r.patientId === patientId);
  const patientPrescriptions = prescriptions.filter(p => p.patientId === patientId);
  const patientBills = bills.filter(b => b.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestVitals = vitals.filter(v => v.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const handleOnlinePayment = async (billId) => {
    try {
      setIsProcessingPayment(true);
      const res = await api.post(`/billing/${billId}/chapa-init`);
      if (res.data && res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        alert('Failed to get checkout URL');
      }
    } catch (error) {
      console.error('Payment Init Error:', error);
      alert('Error initializing payment. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLanguageChange = async (newLanguage) => {
    try {
      await updatePatient(patientId, { preferredLanguage: newLanguage });
    } catch (error) {
      console.error('Failed to update language', error);
      alert('Failed to update language preference.');
    }
  };

  return (
    <div className="patient-details-page slide-in">
      <div className="overview-header" style={{ marginBottom: 40 }}>
        <div>
          <h1 className="heading-3">{t('myMedicalProfile')}</h1>
          <p style={{ color: 'var(--color-gray-500)' }}>Managed by HealthCare Pro • {patient.pid}</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {patient.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="profile-info">
          <h2 className="heading-2" style={{ fontSize: 'var(--font-size-2xl)', marginBottom: '4px' }}>{patient.name}</h2>
          <div className="profile-tags">
            <span className={`badge ${patient.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
              {patient.status}
            </span>
            <span className="badge" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', border: 'transparent' }}>
              {patient.gender}, {patient.age} yrs
            </span>
            {patient.allergy && patient.allergy !== 'None' && (
              <span className="badge" style={{ background: '#fef2f2', color: '#ef4444', border: 'transparent' }}>
                {t('allergy')}: {patient.allergy}
              </span>
            )}
          </div>

          <div className="profile-contacts">
            <div className="contact-item"><Phone size={14} /> {patient.phone}</div>
            <div className="contact-item"><Mail size={14} /> {patient.email}</div>
            <div className="contact-item"><Calendar size={14} /> {t('dob')}: {patient.dob}</div>
            <div className="contact-item"><MapPin size={14} /> {patient.address}</div>
          </div>

          {latestVitals && (
            <div className="vitals-header-strip">
              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#fef2f2' }}><Heart size={16} /></div>
                  {t('bp')}
                </div>
                <div><span className="vital-val">{latestVitals.bp}</span> <span className="vital-unit">mmHg</span></div>
              </div>

              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#f5f3ff' }}><Activity size={16} /></div>
                  {t('heartRate')}
                </div>
                <div><span className="vital-val">{latestVitals.heartRate}</span> <span className="vital-unit">bpm</span></div>
              </div>

              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#fffbeb' }}><Thermometer size={16} /></div>
                  {t('temp')}
                </div>
                <div><span className="vital-val">{latestVitals.temp}</span> <span className="vital-unit">°C</span></div>
              </div>

              <div className="vital-mini-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
                  <div className="vital-icon-wrap" style={{ background: '#ecfdf5' }}><Weight size={16} /></div>
                  {t('weight')}
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
            {t('myVisits')}
          </button>
          <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            {t('records')}
          </button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            {t('labReports')}
          </button>
          <button className={`tab-btn ${activeTab === 'bills' ? 'active' : ''}`} onClick={() => setActiveTab('bills')}>
            {t('myBills')}
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'visits' && (
            <div className="visits-tab animate-fade-in">
              <div className="timeline">
                {patientVisits.map((visit, i) => (
                  <div key={visit.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-card panel">
                      <div className="timeline-date">{new Date(visit.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <h4 className="heading-4" style={{ fontSize: 'var(--font-size-base)', marginBottom: '8px' }}>
                        {visit.type} - {visit.reason}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} /> {t('attending')}: {visit.doctor}
                      </p>
                    </div>
                  </div>
                ))}
                {patientVisits.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-500)' }}>No visit records found.</p>
                )}
               </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="reports-tab animate-fade-in" style={{ display: 'flex', gap: '24px', flexDirection: 'column' }}>
              <div className="panel">
                <div className="panel-header" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                  <h3 className="heading-4" style={{ fontSize: 'var(--font-size-base)' }}>{t('activeMeds')}</h3>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {patientPrescriptions.map(presc => (
                    <div key={presc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-highlight)', borderRadius: '8px' }}>
                      <div>
                        <h4 style={{ fontWeight: 600, margin: 0 }}>RX: {presc.items.map(i => i.name).join(', ')}</h4>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                          {presc.items.map(i => `${i.name} - ${i.dosage}`).join('; ')}
                        </p>
                        <span className={`badge ${presc.status === 'DISPENSED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px', marginTop: '8px' }}>
                          {presc.status}
                        </span>
                      </div>
                      <button className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => exportMedicalRecordToPdf({ ...presc, title: 'Prescription' }, patient)}>
                        <Download size={14} /> {t('downloadPdf')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header" style={{ background: '#fef3c7', color: '#b45309' }}>
                  <h3 className="heading-4" style={{ fontSize: 'var(--font-size-base)' }}>{t('labReports')}</h3>
                </div>
                <div style={{ padding: '20px' }}>
                  {patientRecords.filter(r => r.type === 'Lab Result').map(lab => (
                    <div key={lab.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                      <div>
                        <h4 style={{ fontWeight: 500 }}>{lab.title}</h4>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {new Date(lab.date).toLocaleDateString()} - {lab.notes}
                        </p>
                      </div>
                      <button className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => exportMedicalRecordToPdf(lab, patient)}>
                        <Download size={14} /> {t('download')}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-tab animate-fade-in panel" style={{ padding: '24px' }}>
              <h3 className="heading-4" style={{ marginBottom: '16px' }}>{t('diagnosisHistory')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientRecords.filter(r => r.type === 'Diagnosis').map(diag => (
                  <div key={diag.id} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>{new Date(diag.date).toLocaleDateString()}</div>
                    <h4 style={{ fontWeight: 600, margin: '4px 0' }}>{diag.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{diag.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'bills' && (
            <div className="bills-tab animate-fade-in panel" style={{ padding: '24px' }}>
              <h3 className="heading-4" style={{ marginBottom: '16px' }}>{t('myBills')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientBills.map(bill => (
                  <div key={bill._id || bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--color-highlight)', borderRadius: '8px', borderLeft: `4px solid ${bill.status === 'Paid' ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                    <div>
                      <h4 style={{ fontWeight: 600, margin: '0 0 4px 0' }}>{t('invoice')}: {bill.invoiceId}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Date: {new Date(bill.date).toLocaleDateString()}
                      </p>
                      <div style={{ marginTop: '8px' }}>
                        <span className={`badge ${bill.status === 'Paid' ? 'badge-success' : 'badge-danger'}`} style={{ marginRight: '8px' }}>
                          {bill.status}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                          Total: ETB {bill.totalAmount.toLocaleString()} 
                          {bill.paidAmount > 0 && bill.paidAmount < bill.totalAmount ? ` (Paid: ETB ${bill.paidAmount.toLocaleString()})` : ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {bill.status === 'Paid' && (
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '12px' }}
                          onClick={() => exportBillReceiptToPdf(bill, patient)}
                        >
                          <Download size={14} /> {t('receipt')}
                        </button>
                      )}
                      {bill.status !== 'Paid' && (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleOnlinePayment(bill._id || bill.id)}
                          disabled={isProcessingPayment}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          {isProcessingPayment ? 'Processing...' : t('payOnline')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {patientBills.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>No bills found on your record.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
