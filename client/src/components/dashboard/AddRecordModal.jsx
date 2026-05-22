import { useState, useRef, useEffect } from 'react';
import { X, FileText, Pill, Activity, Loader2, Info, UploadCloud, Plus, Trash2, HeartPulse, Send, Syringe } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

export default function AddRecordModal() {
  const { addMedicalRecord, addPrescription, addVitals, updatePatient, setPatients, inventory, closeAddRecordModal, selectedPatientId, selectedVisitId, selectedReferenceId, visits, patients, medicalRecords, prescriptions, updatePrescriptionDose } = useData();
  const { user } = useAuth();
  const { showToast } = useSocket();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const visit = visits.find(v => v.id === selectedVisitId);

  const availableTypes = (() => {
    if (user?.role === 'Lab Technician') return ['Lab Result'];
    if (user?.role === 'Nurse') {
      const dept = user?.department || '';
      const types = ['Treatment/Procedure'];
      
      // Triage and OPD nurses can record Vitals
      if (['Triage & Emergency', 'OPD Nursing'].includes(dept)) {
        types.push('Vitals');
      }
      
      // ART, MCH, and Triage nurses can request Labs under protocol
      if (['ART/HIV Clinic', 'Maternal & Child Health (MCH)', 'Triage & Emergency'].includes(dept)) {
        types.push('Lab Request');
      }
      
      return types;
    }
    if (user?.role === 'Doctor') return ['Vitals', 'Diagnosis', 'Prescription', 'Lab Request', 'Referral'];
    return ['Vitals', 'Diagnosis', 'Prescription', 'Lab Request', 'Lab Result', 'Referral'];
  })();

  const referenceRecord = medicalRecords.find(r => r.id === selectedReferenceId);
  const defaultType = selectedReferenceId ? 'Lab Result' : (availableTypes.includes('Diagnosis') ? 'Diagnosis' : availableTypes[0]);

  const [formData, setFormData] = useState({
    patientId: selectedPatientId || '',
    visitId: selectedVisitId || '',
    referenceId: selectedReferenceId || '',
    type: defaultType,
    title: referenceRecord ? referenceRecord.title : '',
    notes: '',
    fileName: '',
    fileData: '',
    doctor: user?.name ? (
      (user.role === 'Doctor' && !user.name.startsWith('Dr.')) ? `Dr. ${user.name}` :
        (user.role === 'Nurse' && !user.name.startsWith('Nurse')) ? `Nurse ${user.name}` :
          user.name
    ) : 'Medical Staff',
    isCourseFinished: true
  });

  const [referralData, setReferralData] = useState({
    clinicalSummary: '',
    investigationFindings: '',
    treatmentGiven: '',
    reasonForReferral: ''
  });

  // --- Nursing Context & Dose Tracking ---
  const visitPrescriptions = prescriptions?.filter(p => p.visitId === selectedVisitId) || [];

  // Find the most relevant prescription (prefer injections/procedures)
  let treatmentPrescription = visitPrescriptions.find(p =>
    p.items.some(i => {
      const n = (i.name || '').toLowerCase();
      return n.includes('inj') || n.includes('syringe') || n.includes('diclofenac') || n.includes('iv') || n.includes('im') || n.includes('amp');
    })
  );

  // Fallback to the latest prescription if no specific injection found
  if (!treatmentPrescription && visitPrescriptions.length > 0) {
    treatmentPrescription = visitPrescriptions[0];
  }

  // --- Hyper-Resilient Dose Tracking ---
  const todayDate = new Date().toDateString();
  const previousTreatments = medicalRecords.filter(r => {
    // 1. Direct ID comparison (Robust)
    const isSameVisit = r.visitId && selectedVisitId && String(r.visitId) === String(selectedVisitId);

    // 2. Check Patient ID + Date
    const isSamePatient = String(r.patientId) === String(selectedPatientId);
    const isSameDay = r.date && new Date(r.date).toDateString() === todayDate;

    // 3. Check Title Similarity
    const isTreatment = (r.type || '').toLowerCase() === 'treatment/procedure';

    return isTreatment && (isSameVisit || (isSamePatient && isSameDay));
  });

  const existingTreatmentsCount = previousTreatments.length;
  const currentDoseNumber = existingTreatmentsCount + 1;

  // Try to parse total days from ANY item in the prescription
  let totalDoses = 0;
  if (treatmentPrescription) {
    treatmentPrescription.items.forEach(item => {
      const d = (item.dosage || '').toLowerCase();
      const match = d.match(/(\d+)\s*day/i);
      if (match) totalDoses = Math.max(totalDoses, parseInt(match[1]));
    });
  }

  // --- Smart Toggle Logic ---
  // Automatically uncheck "Final Dose" if we haven't reached the total yet
  useEffect(() => {
    if (formData.type === 'Treatment/Procedure' && totalDoses > 0) {
      const isActuallyFinished = currentDoseNumber >= totalDoses;
      setFormData(prev => ({ ...prev, isCourseFinished: isActuallyFinished }));
    }
  }, [currentDoseNumber, totalDoses, formData.type]);

  useEffect(() => {
    if (formData.type === 'Referral' && selectedVisitId) {
      const visitRecords = medicalRecords.filter(r => r.visitId === selectedVisitId);
      const visitPrescriptions = prescriptions?.filter(p => p.visitId === selectedVisitId) || [];

      const summary = visitRecords.filter(r => r.type === 'Diagnosis').map(r => `${r.title}: ${r.notes}`).join('\n');
      const investigations = visitRecords.filter(r => r.type === 'Lab Result').map(r => `${r.title}: ${r.notes}`).join('\n');
      const treatments = visitPrescriptions.flatMap(p => p.items.map(i => `${i.name} (${i.dosage})`)).join(', ');

      setReferralData({
        clinicalSummary: summary || '',
        investigationFindings: investigations || 'No recent investigations logged.',
        treatmentGiven: treatments || 'No treatments prescribed.',
        reasonForReferral: ''
      });
    }
  }, [formData.type, selectedVisitId, medicalRecords, prescriptions]);

  const handleReferralChange = (e) => {
    const { name, value } = e.target;
    setReferralData(prev => ({ ...prev, [name]: value }));
  };

  const [vitalsData, setVitalsData] = useState({
    bp: '',
    heartRate: '',
    temp: '',
    weight: ''
  });

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitalsData(prev => ({ ...prev, [name]: value }));
  };

  const [prescriptionItems, setPrescriptionItems] = useState([
    { medicineId: '', requestedQty: 0, dosage: '', isManual: false, customName: '' }
  ]);

  const handleAddPrescriptionItem = () => {
    setPrescriptionItems(prev => [...prev, { medicineId: '', requestedQty: 10, dosage: '', isManual: false, customName: '' }]);
  };

  const handleUpdatePrescriptionItem = (index, field, value) => {
    const newItems = [...prescriptionItems];
    if (field === 'medicineId' && value === 'OTHER') {
      newItems[index].isManual = true;
      newItems[index].medicineId = 'OTHER';
    } else if (field === 'medicineId') {
      newItems[index].isManual = false;
      newItems[index].medicineId = value;
    } else {
      newItems[index][field] = value;
    }
    setPrescriptionItems(newItems);
  };

  const handleRemovePrescriptionItem = (index) => {
    if (prescriptionItems.length > 1) {
      setPrescriptionItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.type === 'Prescription') {
        const validItems = prescriptionItems.filter(item => item.medicineId || item.isManual);

        if (validItems.length > 0) {
          const formattedItems = validItems.map(item => {
            if (item.isManual) {
              return {
                itemId: `item_${Math.random().toString(36).substr(2, 6)}`,
                medicineId: 'MANUAL',
                name: item.customName || 'Other Medication',
                dosage: item.dosage,
                requestedQty: Number(item.requestedQty) || 0,
                dispensedQty: 0,
                status: 'PENDING'
              };
            }
            const med = inventory.find(m => m.id === item.medicineId) || inventory[0];
            return {
              itemId: `item_${Math.random().toString(36).substr(2, 6)}`,
              medicineId: med ? med.id : 'MED-1',
              name: med ? med.name : 'Unknown Medicine',
              dosage: item.dosage,
              requestedQty: Number(item.requestedQty) || 0,
              dispensedQty: 0,
              status: 'PENDING'
            };
          });

          // Status is now handled by the visit lifecycle in DataContext
          if (formData.type === 'Prescription') {
            await addPrescription({
              ...formData,
              patientId: formData.patientId,
              visitId: formData.visitId,
              doctorId: user?.empId || 'EMP-101',
              items: formattedItems
            });
          }

          // Save a medical record log
          const titles = formattedItems.map(i => i.name).join(', ');
          await addMedicalRecord({
            ...formData,
            title: `Prescription: ${titles}`,
            notes: `Prescribed ${formattedItems.length} medication(s).`
          });
        }
      } else if (formData.type === 'Vitals') {
        await addVitals({
          patientId: formData.patientId,
          visitId: formData.visitId,
          bp: vitalsData.bp,
          heartRate: vitalsData.heartRate,
          temp: vitalsData.temp,
          weight: vitalsData.weight,
          recordedBy: user?.name || 'Dr. Admin'
        });
      } else if (formData.type === 'Referral') {
        const payload = { ...formData, notes: JSON.stringify(referralData) };
        await addMedicalRecord(payload);
      } else {
        // If it's a treatment, link it to the prescription for permanent tracking
        if (formData.type === 'Treatment/Procedure' && treatmentPrescription) {
          await addMedicalRecord({
            ...formData,
            prescriptionId: treatmentPrescription.id,
            notes: `${formData.notes}\n(Reference RX: ${treatmentPrescription.id})`
          });
        } else {
          await addMedicalRecord(formData);
        }
      }

      if (formData.type === 'Lab Result') {
        showToast("Lab results successfully uploaded and updated!", "success");
      } else if (formData.type === 'Treatment/Procedure') {
        if (formData.isCourseFinished) {
          showToast(`Final dose administered! Treatment course completed and patient visit finalized!`, "success");
        } else {
          showToast(`Dose #${currentDoseNumber} administered successfully! Patient scheduled to return tomorrow.`, "success");
        }
      } else {
        showToast(`Successfully saved ${formData.type === 'Prescription' ? 'prescription' : formData.type.toLowerCase()} record!`, "success");
      }
      setIsLoading(false);
      closeAddRecordModal();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to save medical record. Please try again.", "danger");
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fileName: file.name, fileData: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeAddRecordModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="heading-4 text-gradient">Add Medical Finding</h3>
          <button className="modal-close" onClick={closeAddRecordModal}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {visit && (
            <div style={{ background: 'var(--color-primary-light)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Info size={18} color="var(--color-primary)" />
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-dark)' }}>
                Linking to visit <strong>#{visit.id}</strong> ({visit.date})
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {!selectedPatientId && (
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ marginBottom: '12px' }}>Select Target Patient</label>
                <select
                  name="patientId"
                  className="form-control"
                  required
                  value={formData.patientId}
                  onChange={handleChange}
                  style={{
                    appearance: 'auto',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" disabled>-- Choose a Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.pid})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" style={{ marginBottom: '12px' }}>Record Type</label>

              {/* Nursing Context Header */}
              {user?.role === 'Nurse' && formData.type === 'Treatment/Procedure' && (
                <div style={{ marginBottom: 'var(--spacing-6)', padding: 'var(--spacing-4)', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    <Pill size={16} /> Doctor's Order
                  </div>
                  {treatmentPrescription ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                      {treatmentPrescription.items
                        .filter(item => {
                          // Filter for items that specifically require nursing (inj, iv, etc.)
                          if (item.requiresNurse === true) return true;
                          // Backward compatibility fallback for items already in DB without the flag
                          const n = (item.name || '').toLowerCase();
                          return n.includes('inj') || n.includes('syringe') || n.includes('diclofenac') || n.includes('iv') || n.includes('im') || n.includes('amp');
                        })
                        .map((item, idx, filteredArray) => (
                          <div key={idx} style={{ paddingBottom: idx < filteredArray.length - 1 ? 'var(--spacing-2)' : 0, borderBottom: idx < filteredArray.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{item.name}</div>
                            <div style={{ fontSize: '13px', color: 'var(--color-gray-400)', marginTop: '2px' }}>{item.dosage}</div>
                          </div>
                        ))}

                      {totalDoses > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '4px' }}>
                            <span>TREATMENT PROGRESS</span>
                            <span>DOSE {currentDoseNumber} OF {totalDoses}</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, (currentDoseNumber / totalDoses) * 100)}%`, background: 'var(--color-primary)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-gray-500)', marginTop: '6px', fontStyle: 'italic' }}>
                            * Previous doses logged: {existingTreatmentsCount}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>No specific prescription found for this treatment.</div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${availableTypes.length}, 1fr)`, gap: '12px' }}>
                {availableTypes.map(type => {
                  const isSelected = formData.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type, fileName: '' }))}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--glass-border)',
                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'var(--color-highlight)', // theme adapted
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-gray-400)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: isSelected ? '600' : '500',
                        fontSize: '13px',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--color-gray-500)';
                          e.currentTarget.style.backgroundColor = 'var(--color-highlight-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--glass-border)';
                          e.currentTarget.style.backgroundColor = 'var(--color-highlight)';
                        }
                      }}
                    >
                      {type === 'Diagnosis' && <Activity size={24} color={isSelected ? 'var(--color-primary)' : 'var(--color-gray-400)'} />}
                      {type === 'Prescription' && <Pill size={24} color={isSelected ? 'var(--color-primary)' : 'var(--color-gray-400)'} />}
                      {type === 'Lab Request' && <FileText size={24} color={isSelected ? 'var(--color-warning)' : 'var(--color-gray-400)'} />}
                      {type === 'Lab Result' && <FileText size={24} color={isSelected ? 'var(--color-primary)' : 'var(--color-gray-400)'} />}
                      {type === 'Vitals' && <HeartPulse size={24} color={isSelected ? 'var(--color-danger)' : 'var(--color-gray-400)'} />}
                      {type === 'Referral' && <Send size={24} color={isSelected ? 'var(--color-primary)' : 'var(--color-gray-400)'} />}
                      {type === 'Treatment/Procedure' && <Syringe size={24} color={isSelected ? 'var(--color-success)' : 'var(--color-gray-400)'} />}
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.type === 'Prescription' ? (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label className="form-label" style={{ marginBottom: '0' }}>Medications</label>

                {prescriptionItems.map((item, index) => (
                  <div key={index} style={{ background: 'var(--color-highlight)', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                    {prescriptionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePrescriptionItem(index)}
                        style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    <div style={{ flex: 1 }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Select Medication</label>
                      {item.isManual ? (
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Type medicine name..."
                            required
                            value={item.customName}
                            onChange={(e) => handleUpdatePrescriptionItem(index, 'customName', e.target.value)}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdatePrescriptionItem(index, 'medicineId', '')}
                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '10px', cursor: 'pointer' }}
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <select
                          className="form-control"
                          required
                          value={item.medicineId}
                          onChange={(e) => handleUpdatePrescriptionItem(index, 'medicineId', e.target.value)}
                          style={{ appearance: 'auto', cursor: 'pointer' }}
                        >
                          <option value="" disabled>-- Choose Medicine --</option>
                          {inventory.map(med => (
                            <option key={med.id} value={med.id}>{med.name} ({med.stock} in stock)</option>
                          ))}
                          <option value="OTHER" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>+ OTHER (Manually Type)</option>
                        </select>
                      )}
                      {/* Dosage and Quantity are now provided by the pharmacist during dispensing */}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPrescriptionItem}
                  className="btn btn-outline"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                >
                  <Plus size={16} /> Add Another Medicine
                </button>
              </div>
            ) : formData.type === 'Referral' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Referred To (Facility Name)</label>
                  <select
                    name="title"
                    className="form-control"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    style={{ appearance: 'auto', cursor: 'pointer' }}
                  >
                    <option value="" disabled>-- Select Destination Facility --</option>
                    <option value="Jimma University Specialized Hospital">Jimma University Specialized Hospital</option>
                    <option value="Oda Hulle General Hospital">Oda Hulle General Hospital</option>
                    <option value="Firomsis primary hospital">Firomsis primary hospital</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Clinical Summary</label>
                    <textarea
                      name="clinicalSummary"
                      className="form-control"
                      placeholder="Enter summary of history, physical exam..."
                      style={{ minHeight: '80px', paddingTop: '10px' }}
                      value={referralData.clinicalSummary}
                      onChange={handleReferralChange}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Investigation Findings</label>
                    <textarea
                      name="investigationFindings"
                      className="form-control"
                      placeholder="Summarize labs, imaging..."
                      style={{ minHeight: '80px', paddingTop: '10px' }}
                      value={referralData.investigationFindings}
                      onChange={handleReferralChange}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Treatment Given</label>
                    <textarea
                      name="treatmentGiven"
                      className="form-control"
                      placeholder="List drugs, procedures done here..."
                      style={{ minHeight: '80px', paddingTop: '10px' }}
                      value={referralData.treatmentGiven}
                      onChange={handleReferralChange}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Reason for Referral <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <textarea
                      name="reasonForReferral"
                      className="form-control"
                      placeholder="State clearly why the patient is being referred..."
                      style={{ minHeight: '80px', paddingTop: '10px' }}
                      required
                      value={referralData.reasonForReferral}
                      onChange={handleReferralChange}
                    />
                  </div>
                </div>
              </>
            ) : formData.type !== 'Vitals' ? (
              <>
                <div className="form-group">
                  <label className="form-label">
                    {formData.type === 'Diagnosis' ? 'Diagnosis Title' :
                      formData.type === 'Lab Request' ? 'Requested Test' :
                        formData.type === 'Treatment/Procedure' ? 'Procedure Name' :
                          'Test Name'}
                  </label>
                  <input
                    name="title"
                    type="text"
                    className="form-control"
                    placeholder={
                      formData.type === 'Diagnosis' ? 'e.g., Hypertension' :
                        formData.type === 'Lab Request' ? 'e.g., Complete Blood Count' :
                          formData.type === 'Treatment/Procedure' ? 'e.g., IM Injection (Diclofenac)' :
                            'e.g., CBC Results Found'
                    }
                    required
                    value={formData.title}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {formData.type === 'Diagnosis' ? 'Clinical Notes' :
                      formData.type === 'Lab Request' ? 'Reason for Request / Instructions' :
                        formData.type === 'Treatment/Procedure' ? 'Procedure Details / Observations' :
                          'Result Summary'}
                  </label>
                  <textarea
                    name="notes"
                    className="form-control"
                    placeholder={
                      formData.type === 'Lab Request' ? 'Enter clinical reasons or specific instructions for the lab...' :
                        formData.type === 'Treatment/Procedure' ? 'Enter dosage, site of injection, or procedure notes...' :
                          'Enter detailed information here...'
                    }
                    style={{ minHeight: '100px', paddingTop: '12px' }}
                    required
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
                {formData.type === 'Treatment/Procedure' && (
                  <>
                    <div className="glass-panel" style={{ marginTop: 'var(--spacing-4)', padding: '16px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          onClick={() => setFormData({ ...formData, isCourseFinished: !formData.isCourseFinished })}
                          style={{
                            width: '44px',
                            height: '24px',
                            background: formData.isCourseFinished ? 'var(--color-primary)' : 'var(--color-gray-700)',
                            borderRadius: '12px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.3s'
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '3px',
                            left: formData.isCourseFinished ? '23px' : '3px',
                            transition: 'left 0.3s'
                          }}></div>
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>Final Dose?</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>
                            {formData.isCourseFinished
                              ? "Complete the visit after saving"
                              : "Keep visit active for the next dose tomorrow"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dose History List */}
                    {previousTreatments.length > 0 && (
                      <div style={{ marginTop: 'var(--spacing-4)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 'var(--spacing-4)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-gray-500)', marginBottom: '8px', textTransform: 'uppercase' }}>Dose History for Today</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {previousTreatments.map((t, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div>
                                <div style={{ fontSize: '13px', color: 'white', fontWeight: '500' }}>Dose #{i + 1}</div>
                                <div style={{ fontSize: '11px', color: 'var(--color-gray-500)' }}>{new Date(t.date || t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {t.doctor || 'Staff'}</div>
                              </div>
                              <div style={{ color: 'var(--color-primary)' }}><Activity size={14} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}  </>
            ) : null}

            {formData.type === 'Vitals' && (
              <div style={{ margin: '8px 0 24px', padding: '20px', background: 'var(--color-highlight)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontSize: '12px', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>Clinical Measurements</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Blood Pressure (mmHg)</label>
                    <input name="bp" placeholder="e.g., 120/80" className="form-control" style={{ fontSize: '13px' }} value={vitalsData.bp} onChange={handleVitalsChange} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Heart Rate (BPM)</label>
                    <input name="heartRate" type="number" placeholder="e.g., 72" className="form-control" style={{ fontSize: '13px' }} value={vitalsData.heartRate} onChange={handleVitalsChange} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Temperature (°C)</label>
                    <input name="temp" type="number" step="0.1" placeholder="e.g., 36.5" className="form-control" style={{ fontSize: '13px' }} value={vitalsData.temp} onChange={handleVitalsChange} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Weight (kg)</label>
                    <input name="weight" type="number" step="0.1" placeholder="e.g., 70.5" className="form-control" style={{ fontSize: '13px' }} value={vitalsData.weight} onChange={handleVitalsChange} required />
                  </div>
                </div>
              </div>
            )}

            {formData.type === 'Lab Result' && (
              <div className="form-group">
                <label className="form-label">Upload Detailed Results (Optional)</label>
                <div
                  style={{
                    border: '2px dashed var(--glass-border)',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--color-highlight)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="hover-lift"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                  <UploadCloud size={32} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
                  {formData.fileName ? (
                    <p style={{ fontWeight: 500, color: 'var(--color-primary-dark)' }}>{formData.fileName}</p>
                  ) : (
                    <>
                      <p style={{ fontWeight: 500, color: 'var(--color-gray-700)', marginBottom: '4px' }}>Click to upload research file</p>
                      <p style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>Supports PDF, JPG, PNG, DOC (Max 10MB)</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px', marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-outline flex-1"
                onClick={closeAddRecordModal}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : (formData.type === 'Prescription' ? 'Go to Pharmacy' : 'Save Record')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
