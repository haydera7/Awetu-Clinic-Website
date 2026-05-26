import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { db, syncItem } from '../db/localDb';
import { useSocket } from './SocketContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [bills, setBills] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const { socket } = useSocket();

  const loadData = useCallback(async () => {
    // 1. Load from Local IndexedDB first (Instant UI)
    const localPatients = await db.patients.toArray();
    const localVisits = await db.visits.toArray();
    const localInventory = await db.inventory.toArray();
    const localRecords = await db.medicalRecords.toArray();
    const localRxs = await db.prescriptions.toArray();
    const localBills = await db.bills.toArray();
    const localStaffs = await db.staffs.toArray();
    const localApts = await db.appointments.toArray();
    const localAnnouncements = await db.announcements.toArray();

    if (localPatients.length > 0) setPatients(localPatients);
    if (localVisits.length > 0) setVisits(localVisits);
    if (localInventory.length > 0) setInventory(localInventory);
    if (localRxs.length > 0) setPrescriptions(localRxs);
    if (localBills.length > 0) setBills(localBills);
    if (localStaffs.length > 0) setStaffs(localStaffs);
    if (localApts.length > 0) setAppointments(localApts);
    if (localAnnouncements.length > 0) setAnnouncements(localAnnouncements);
    if (localRecords.length > 0) {
      setMedicalRecords(localRecords.filter(r => r.type !== 'Vitals'));
      setVitals(localRecords.filter(r => r.type === 'Vitals'));
    }

    // 2. Fetch from API and Refresh Local Cache
    try {
      const [resPatients, resVisits, stfs, inv, bls, rxs, rcs, apts, anns] = await Promise.all([
        api.get('/patients').catch(() => ({ data: [] })),
        api.get('/visits').catch(() => ({ data: [] })),
        api.get('/staffs').catch(() => ({ data: [] })),
        api.get('/inventory').catch(() => ({ data: [] })),
        api.get('/billing').catch(() => ({ data: [] })),
        api.get('/prescriptions').catch(() => ({ data: [] })),
        api.get('/records').catch(() => ({ data: [] })),
        api.get('/appointments').catch(() => ({ data: [] })),
        api.get('/announcements').catch(() => ({ data: [] }))
      ]);

      let allLoadedPatients = [];

      let allVisits = [];
      if (resVisits && resVisits.data) {
        const loadedVisits = resVisits.data.map(v => {
          const pt = allLoadedPatients.find(p => p.id === v.patientId || p._id === v.patientId);
          return { ...v, id: v.visitId || v._id, patientName: v.patientName || pt?.name || 'Unknown Patient' };
        });

        const localVisits = await db.visits.toArray();
        const unsyncedVisits = localVisits.filter(v => String(v.id).startsWith('V-TEMP-'));
        allVisits = [...loadedVisits, ...unsyncedVisits];

        await db.visits.clear();
        await db.visits.bulkPut(allVisits);
        setVisits(allVisits);
      }

      if (resPatients && resPatients.data) {
        allLoadedPatients = resPatients.data.map(p => ({ ...p, id: p._id }));

        // Smart merge: Remove local temp records that now exist on server
        const unsyncedPatients = localPatients.filter(lp => {
          if (lp.pid !== 'SYNCING...') return false;
          const alreadyOnServer = allLoadedPatients.find(p =>
            p.id === lp.id ||
            (p.name.toLowerCase() === lp.name.toLowerCase() && p.phone === lp.phone)
          );
          return !alreadyOnServer;
        });

        const mergedPatients = [...allLoadedPatients, ...unsyncedPatients].map(p => {
          const patientVisits = allVisits.filter(v => v.patientId === p.id || v.patientId === p._id);
          if (patientVisits.length > 0) {
            const latest = patientVisits.reduce((prev, curr) =>
              new Date(curr.date || curr.createdAt) > new Date(prev.date || prev.createdAt) ? curr : prev
            );
            return { ...p, lastVisit: latest.date || latest.createdAt };
          }
          return p;
        });

        setPatients(mergedPatients);

        // Update local DB: cleanup synced temps
        const tempsToDelete = localPatients.filter(lp =>
          lp.pid === 'SYNCING...' &&
          allLoadedPatients.find(p => p.name.toLowerCase() === lp.name.toLowerCase() && p.phone === lp.phone)
        );
        for (const t of tempsToDelete) await db.patients.delete(t.id);

        await db.patients.bulkPut(allLoadedPatients);
      }

      if (inv && inv.data) {
        const loadedInv = inv.data.map(i => ({ ...i, id: i.itemId || i._id }));
        setInventory(loadedInv);
        await db.inventory.clear();
        await db.inventory.bulkPut(loadedInv);
      }

      if (rcs && rcs.data) {
        const allRecords = rcs.data.map(r => ({ ...r, ...(r.vitals || {}), id: r.recordId || r._id }));
        setMedicalRecords(allRecords.filter(r => r.type !== 'Vitals'));
        setVitals(allRecords.filter(r => r.type === 'Vitals'));
        await db.medicalRecords.clear();
        await db.medicalRecords.bulkPut(allRecords);
      }

      if (rxs && rxs.data) {
        const loadedRxs = rxs.data.map(r => ({ ...r, id: r.prescriptionId || r._id }));
        setPrescriptions(loadedRxs);
        await db.prescriptions.clear();
        await db.prescriptions.bulkPut(loadedRxs);
      }

      if (bls && bls.data) {
        const loadedBills = bls.data.map(b => ({ ...b, id: b._id, total: b.totalAmount }));
        setBills(loadedBills);
        await db.bills.clear();
        await db.bills.bulkPut(loadedBills);
      }

      if (stfs && stfs.data) {
        const loadedStaffs = stfs.data.map(s => ({ ...s, id: s.empId || s._id }));
        setStaffs(loadedStaffs);
        await db.staffs.clear();
        await db.staffs.bulkPut(loadedStaffs);
      }

      if (apts && apts.data) {
        const loadedApts = apts.data.map(a => ({ ...a, id: a._id }));
        setAppointments(loadedApts);
        await db.appointments.clear();
        await db.appointments.bulkPut(loadedApts);
      }

      if (anns && anns.data) {
        const loadedAnns = anns.data.map(a => ({ ...a, id: a._id }));
        setAnnouncements(loadedAnns);
        await db.announcements.clear();
        await db.announcements.bulkPut(loadedAnns);
      }

    } catch (err) {
      console.warn('API sync failed, using cached data.', err);
    }

    reconcileSyncQueue();
  }, []);

  useEffect(() => {
    const handleStatusChange = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    loadData();

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [loadData]);

  // Real-time Updates Listener
  useEffect(() => {
    if (!socket) return;

    socket.on('visit-updated', (updatedVisit) => {
      console.log('Real-time visit update:', updatedVisit.visitId);
      setVisits(prev => prev.map(v => 
        (v._id === updatedVisit._id || v.id === updatedVisit.visitId) ? { ...v, ...updatedVisit, id: updatedVisit.visitId } : v
      ));
    });

    socket.on('patient-updated', (updatedPatient) => {
      console.log('Real-time patient update:', updatedPatient.pid);
      setPatients(prev => prev.map(p => 
        (p._id === updatedPatient._id || p.id === updatedPatient.pid || p.id === updatedPatient._id) ? { ...p, ...updatedPatient, id: updatedPatient._id } : p
      ));
    });

    socket.on('announcement-created', (announcement) => {
      console.log('Real-time announcement created:', announcement.title);
      const formatted = { ...announcement, id: announcement._id };
      setAnnouncements(prev => [formatted, ...prev]);
      db.announcements.put(formatted).catch(console.warn);
    });

    socket.on('announcement-updated', (announcement) => {
      console.log('Real-time announcement updated:', announcement.title);
      const formatted = { ...announcement, id: announcement._id };
      setAnnouncements(prev => prev.map(a => a.id === announcement._id ? formatted : a));
      db.announcements.put(formatted).catch(console.warn);
    });

    socket.on('announcement-deleted', (id) => {
      console.log('Real-time announcement deleted:', id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      db.announcements.delete(id).catch(console.warn);
    });

    return () => {
      socket.off('visit-updated');
      socket.off('patient-updated');
      socket.off('announcement-created');
      socket.off('announcement-updated');
      socket.off('announcement-deleted');
    };
  }, [socket]);

  // 3. Background Sync Logic
  const handleSync = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
    if (pendingItems.length === 0) return;

    setIsSyncing(true);
    console.log(`🔄 Syncing ${pendingItems.length} offline items...`);

    for (const item of pendingItems) {
      try {
        if (item.collection === 'patients' && item.action === 'CREATE') {
          const { localId, ...patientData } = item.data;
          const res = await api.post('/patients', patientData);
          const serverPatient = { ...res.data, id: res.data._id };

          // Cleanup: update local db and remove from sync queue
          if (localId) await db.patients.delete(localId);
          await db.patients.add(serverPatient);
          await db.syncQueue.delete(item.id);

          // Update any local IndexedDB visits that reference the temporary patient ID
          if (localId) {
            const localVisits = await db.visits.where('patientId').equals(localId).toArray();
            for (const v of localVisits) {
              await db.visits.update(v.id, { patientId: serverPatient._id });
            }

            // Update subsequent visits in the sync queue that reference the temporary patient ID
            const pendingQueueItems = await db.syncQueue.where('collection').equals('visits').toArray();
            for (const qItem of pendingQueueItems) {
              if (qItem.data && qItem.data.visitData && qItem.data.visitData.patientId === localId) {
                qItem.data.visitData.patientId = serverPatient._id;
                await db.syncQueue.put(qItem);
              }
            }

            // Update the React state for visits to reference the new server patient ID
            setVisits(prev => prev.map(v => v.patientId === localId ? { ...v, patientId: serverPatient._id } : v));
          }

          setPatients(prev => {
            // Replace temp placeholder with server record
            return prev.map(p => {
              const isMatch = p.id === localId ||
                (p.pid === 'SYNCING...' && p.name.toLowerCase() === serverPatient.name.toLowerCase());
              return isMatch ? serverPatient : p;
            }).filter((p, index, self) =>
              // Final safety: remove any duplicates that might have sneaked in
              index === self.findIndex(t => t.id === p.id || (t.pid === 'SYNCING...' && t.name === p.name))
            );
          });
        } else if (item.collection === 'visits' && item.action === 'CREATE') {
          const { visitData, vitalsData, localId } = item.data;
          const res = await api.post('/visits', visitData);
          const serverVisit = { ...res.data, id: res.data.visitId || res.data._id };

          if (localId) await db.visits.delete(localId);
          await db.visits.add(serverVisit);
          await db.syncQueue.delete(item.id);

          if (vitalsData) {
            addVitals({ ...vitalsData, visitId: serverVisit.id, patientId: visitData.patientId });
          }

          setVisits(prev => prev.map(v => (v.id === localId || (v.visitId && v.visitId.startsWith('V-TEMP') && v.patientId === serverVisit.patientId)) ? serverVisit : v));
        }
      } catch (e) {
        console.error("Failed to sync item", item, e);
      }
    }
    setIsSyncing(false);
    const count = await db.syncQueue.where('status').equals('pending').count();
    setPendingSyncCount(count);
    loadData();
  }, [loadData]);

  const reconcileSyncQueue = async () => {
    try {
      const localPatients = await db.patients.where('pid').equals('SYNCING...').toArray();
      const localVisits = await db.visits.where('visitId').startsWith('V-TEMP').toArray();
      const pendingQueue = await db.syncQueue.toArray();

      let added = 0;
      for (const p of localPatients) {
        const isInQueue = pendingQueue.find(item => item.collection === 'patients' && (item.data.localId === p.id || item.data.name === p.name));
        if (!isInQueue) {
          const { id, pid, status, ...data } = p;
          await syncItem('patients', 'CREATE', { ...data, localId: id });
          added++;
        }
      }

      for (const v of localVisits) {
        const isInQueue = pendingQueue.find(item => item.collection === 'visits' && item.data.localId === v.id);
        if (!isInQueue) {
          await syncItem('visits', 'CREATE', { visitData: v, localId: v.id });
          added++;
        }
      }

      if (added > 0) {
        const count = await db.syncQueue.where('status').equals('pending').count();
        setPendingSyncCount(count);
        handleSync();
      }
    } catch (err) {
      console.error("Reconciliation failed", err);
    }
  };

  // Trigger sync when coming back online
  useEffect(() => {
    if (!isOffline) {
      console.log("🟢 System online, checking sync queue...");
      handleSync();
    }
  }, [isOffline]);

  // Update LocalStorage whenever state changes (Fallback)
  /*
  useEffect(() => {
    localStorage.setItem('healthcare-patients', JSON.stringify(patients));
    localStorage.setItem('healthcare-visits', JSON.stringify(visits));
    localStorage.setItem('healthcare-records', JSON.stringify(medicalRecords));
    localStorage.setItem('healthcare-vitals', JSON.stringify(vitals));
    localStorage.setItem('healthcare-staffs', JSON.stringify(staffs));
    localStorage.setItem('healthcare-inventory', JSON.stringify(inventory));
    localStorage.setItem('healthcare-bills', JSON.stringify(bills));
    localStorage.setItem('healthcare-prescriptions', JSON.stringify(prescriptions));
  }, [patients, visits, medicalRecords, vitals, staffs, inventory, bills, prescriptions]);
  */

  const addPatient = async (newPatient) => {
    const tempId = `TEMP-${Date.now()}`;
    const patientWithTempId = { ...newPatient, id: tempId, pid: 'SYNCING...', status: 'Active' };

    try {
      // 1. Save to Local DB immediately for instant UI
      await db.patients.add(patientWithTempId);
      setPatients(prev => [patientWithTempId, ...prev]);

      if (navigator.onLine) {
        try {
          const res = await api.post('/patients', newPatient);
          const serverPatient = { ...res.data, id: res.data._id };

          // Replace temp record with server record
          await db.patients.delete(tempId);
          await db.patients.add(serverPatient);
          setPatients(prev => prev.map(p => p.id === tempId ? serverPatient : p));
          return; // Success
        } catch (e) {
          console.warn("Direct API save failed, falling back to background sync", e);
        }
      }

      // If offline or direct save failed
      await syncItem('patients', 'CREATE', { ...newPatient, localId: tempId });
      setPendingSyncCount(prev => prev + 1);
    } catch (err) {
      console.error("Critical error in addPatient", err);
    }
  };

  const addVisit = async (visitData, vitalsData = null) => {
    const tempId = `V-TEMP-${Date.now()}`;
    const visitWithId = { ...visitData, id: tempId, visitId: tempId, status: 'Scheduled' };

    try {
      if (navigator.onLine) {
        try {
          const res = await api.post('/visits', visitData);
          const serverVisit = { ...res.data, id: res.data.visitId || res.data._id };

          await db.visits.add(serverVisit);
          setVisits(prev => [serverVisit, ...prev]);

          // Update local patient status and last visit
          const now = new Date().toISOString();
          setPatients(prev => prev.map(p => (p.id === visitData.patientId || p._id === visitData.patientId) ? { ...p, status: 'Active', lastVisit: now } : p));
          await db.patients.where('id').equals(visitData.patientId).modify({ status: 'Active', lastVisit: now });

          if (vitalsData) {
            addVitals({ ...vitalsData, visitId: serverVisit.id, patientId: visitData.patientId });
          }
          return { success: true }; 
        } catch (e) {
          const errorMsg = e.response?.data?.message || e.message;
          console.warn("API visit creation failed:", errorMsg);
          
          // If it's a validation error (like duplicate visit), don't fallback to offline sync
          if (e.response?.status === 400) {
            throw new Error(errorMsg);
          }
        }
      }

      // Offline Fallback
      await db.visits.add(visitWithId);
      setVisits(prev => [visitWithId, ...prev]);
      await syncItem('visits', 'CREATE', { visitData, vitalsData, localId: tempId });
      setPendingSyncCount(prev => prev + 1);
      return { success: true, offline: true };
    } catch (err) {
      console.error("Error in addVisit:", err.message);
      throw err; // Re-throw to be caught by UI
    }
  };

  const addMedicalRecord = async (recordData) => {
    // OPTIMISTIC UPDATE: Change status immediately for instant UI feedback
    if (recordData.type === 'Referral' && recordData.patientId) {
      setPatients(prev => prev.map(p => {
        const isMatch = String(p.id || p._id) === String(recordData.patientId) || String(p.pid) === String(recordData.patientId);
        return isMatch ? { ...p, status: 'Referred' } : p;
      }));
      if (recordData.visitId) {
        setVisits(prev => prev.map(v => (String(v.id) === String(recordData.visitId) || String(v.visitId) === String(recordData.visitId)) ? { ...v, status: 'Referred' } : v));
      }
    }

    try {
      const res = await api.post('/records', recordData);
      setMedicalRecords(prev => [{ ...res.data, id: res.data._id }, ...prev]);

      if (recordData.visitId) {
        if (recordData.type === 'Lab Request') updateVisitStatus(recordData.visitId, 'Lab Requested');
        else if (recordData.type === 'Lab Result') updateVisitStatus(recordData.visitId, 'Results Ready');
        else if (recordData.type === 'Diagnosis') updateVisitStatus(recordData.visitId, 'In Session'); // Keep active for prescription phase
        else if (recordData.type === 'Treatment/Procedure') {
          // If this is a course (not finished), keep it in Ready for Treatment status
          if (recordData.isCourseFinished === false) {
            await updateVisitStatus(recordData.visitId, 'Ready for Treatment');
          } else {
            // Check if the bill is paid to decide status
            const bill = bills.find(b => b.visitId === recordData.visitId);
            const isPaid = bill ? bill.status === 'Paid' : true;
            await updateVisitStatus(recordData.visitId, isPaid ? 'Completed' : 'Awaiting Payment');
          }
        }
        else if (recordData.type === 'Referral') {
          updateVisitStatus(recordData.visitId, 'Referred');
        }
        else if (recordData.type !== 'Prescription') {
          const v = visits.find(v => v.id === recordData.visitId);
          if (v && (v.status === 'Waiting' || v.status === 'Scheduled')) {
            updateVisitStatus(recordData.visitId, 'Consultation');
          }
        }
      }
    } catch (err) {
      console.error("API Error", err);
    }
  };

  const addVitals = async (vitalsData) => {
    try {
      const res = await api.post('/records', { ...vitalsData, type: 'Vitals' });
      const flattenedVital = { ...res.data, ...(res.data.vitals || {}), id: res.data._id };
      setVitals(prev => [flattenedVital, ...prev]);
      if (vitalsData.visitId) {
        updateVisitStatus(vitalsData.visitId, 'In Session');
      }
    } catch (err) {
      console.warn("Offline fallback", err);
      const newVitals = { ...vitalsData, id: `VIT-${Math.floor(1000 + Math.random() * 9000)}`, date: new Date().toISOString().split('T')[0] };
      setVitals(prev => [newVitals, ...prev]);
    }
  };

  const addStaff = async (newStaff) => {
    try {
      const res = await api.post('/staffs', newStaff);
      const staff = { ...res.data, id: res.data._id };
      setStaffs(prev => [staff, ...prev]);
      return staff;
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };

  const updatePatient = async (id, updatedData) => {
    if (!id || id === 'undefined') {
      console.error("updatePatient called with invalid ID:", id);
      return;
    }
    try {
      const res = await api.put(`/patients/${id}`, updatedData);
      setPatients(prev => prev.map(p => p.id === id ? { ...res.data, id: res.data._id } : p));
    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      setPatients(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
      */
    }
  };

  const updateVisitStatus = async (id, newStatus) => {
    try {
      // Update local state instantly for UI responsiveness
      setVisits(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));

      // If the visit is now Completed, set the patient to Inactive
      if (newStatus === 'Completed') {
        const visitToComplete = visits.find(v => String(v.id) === String(id));
        if (visitToComplete && visitToComplete.patientId) {
          await updatePatient(visitToComplete.patientId, { status: 'Inactive' });
        }
      }

      await api.put(`/visits/${id}/status`, { status: newStatus });
    } catch (err) {
      console.error("Status update failed", err);
    }
  };

  const updateVisit = async (id, updatedData) => {
    try {
      const res = await api.put(`/visits/${id}`, updatedData);
      setVisits(prev => prev.map(v => v.id === id ? { ...res.data, id: res.data.visitId || res.data._id } : v));

      // Update local DB
      const visit = await db.visits.get(id);
      if (visit) {
        await db.visits.update(id, updatedData);
      }
    } catch (err) {
      console.error("API Error", err);
    }
  };

  const deleteVisit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this visit record?")) return;

    try {
      const isTemp = String(id).startsWith('V-TEMP');
      
      if (!isTemp) {
        await api.delete(`/visits/${id}`);
      }

      // Remove from React State
      setVisits(prev => prev.filter(v => v.id !== id));

      // Remove from IndexedDB
      await db.visits.delete(id);

      // Clean up the syncQueue if there is a pending CREATE action for this temporary visit
      if (isTemp) {
        const pendingItems = await db.syncQueue.where('collection').equals('visits').toArray();
        const visitItem = pendingItems.find(item => item.data && item.data.localId === id);
        if (visitItem) {
          await db.syncQueue.delete(visitItem.id);
          // Recalculate pending sync count
          const count = await db.syncQueue.where('status').equals('pending').count();
          setPendingSyncCount(count);
        }
      }
    } catch (err) {
      console.error("API Error", err);
    }
  };

  const deletePatient = async (id) => {
    try {
      const isTemp = String(id).startsWith('TEMP-');
      
      if (!isTemp) {
        await api.delete(`/patients/${id}`);
      }

      // Remove from React State
      setPatients(prev => prev.filter(p => p.id !== id));

      // Remove from IndexedDB
      await db.patients.delete(id);

      // Clean up the syncQueue if there is a pending CREATE action for this temporary patient
      if (isTemp) {
        const pendingItems = await db.syncQueue.where('collection').equals('patients').toArray();
        const patientItem = pendingItems.find(item => item.data && item.data.localId === id);
        if (patientItem) {
          await db.syncQueue.delete(patientItem.id);
          // Recalculate pending sync count
          const count = await db.syncQueue.where('status').equals('pending').count();
          setPendingSyncCount(count);
        }
      }
    } catch (err) {
      console.error("API Error", err);
    }
  };

  const deleteStaff = async (id) => {
    try {
      await api.delete(`/staffs/${id}`);
      setStaffs(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      setStaffs(prev => prev.filter(s => s.id !== id));
      */
    }
  };

  const createAnnouncement = async (announcementData) => {
    try {
      const res = await api.post('/announcements', announcementData);
      const formatted = { ...res.data, id: res.data._id };
      setAnnouncements(prev => [formatted, ...prev]);
      await db.announcements.put(formatted);
      return formatted;
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };

  const updateAnnouncement = async (id, updatedData) => {
    try {
      const res = await api.put(`/announcements/${id}`, updatedData);
      const formatted = { ...res.data, id: res.data._id };
      setAnnouncements(prev => prev.map(a => a.id === id ? formatted : a));
      await db.announcements.put(formatted);
      return formatted;
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };

  const deleteAnnouncement = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      await db.announcements.delete(id);
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };

  const updateInventoryStock = async (id, amount) => {
    try {
      const res = await api.put(`/inventory/${id}/stock`, { amount });
      setInventory(prev => prev.map(med => med.id === id ? { ...res.data, id: res.data.itemId || res.data._id } : med));
    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      setInventory(prev => prev.map(med => {
        if(med.id === id) {
          const newStock = med.stock + amount;
          return { ...med, stock: newStock, status: newStock <= 100 ? 'Low Stock' : 'In Stock' };
        }
        return med;
      }));
      */
    }
  };

  const addInventoryItem = async (itemData) => {
    try {
      const res = await api.post('/inventory', itemData);
      setInventory(prev => [{ ...res.data, id: res.data.itemId || res.data._id }, ...prev]);
    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      const newItem = { ...itemData, id: `MED-${Math.floor(100 + Math.random() * 900)}`, status: itemData.stock <= 100 ? 'Low Stock' : 'In Stock' };
      setInventory(prev => [newItem, ...prev]);
      */
    }
  };

  const addPaymentToBill = async (id, amount, method = 'Cash', recordedBy = 'System') => {
    try {
      // Find the actual MongoDB _id if id is a temp or invoice ID
      const billToUpdate = bills.find(b => b.id === id || b._id === id);
      const targetId = billToUpdate?._id || id;

      const res = await api.post(`/billing/${targetId}/pay`, { amount, method });
      const updatedBill = { ...res.data, id: res.data._id, total: res.data.totalAmount };
      setBills(prev => prev.map(bill => (bill._id === targetId || bill.id === id) ? updatedBill : bill));
      await db.bills.put(updatedBill);
      if (res.data.status === 'Paid' && res.data.visitId) {
        const visit = visits.find(v => v.id === res.data.visitId || v.visitId === res.data.visitId);
        if (visit && visit.status === 'Ready for Treatment') {
          // Keep it in 'Ready for Treatment' so the nurse dashboard is not cleared
        } else {
          updateVisitStatus(res.data.visitId, 'Completed');
        }
      }
    } catch (err) {
      console.warn("Offline fallback", err);
      setBills(prev => prev.map(bill => {
        if (bill.id === id) {
          const currentPaid = bill.paidAmount || 0;
          const newPaidAmount = currentPaid + amount;
          let newStatus = 'Unpaid';
          if (newPaidAmount >= bill.total) newStatus = 'Paid';
          else if (newPaidAmount > 0) newStatus = 'Partial';

          if (newStatus === 'Paid' && bill.visitId) {
            const visit = visits.find(v => v.id === bill.visitId || v.visitId === bill.visitId);
            if (visit && visit.status === 'Ready for Treatment') {
              // Keep it in 'Ready for Treatment' so the nurse dashboard is not cleared
            } else {
              updateVisitStatus(bill.visitId, 'Completed');
            }
          }

          const newPayment = { txId: `TX-${Math.floor(1000 + Math.random() * 9000)}`, amount, date: new Date().toISOString(), method, recordedBy };
          const existingPayments = bill.payments || [];
          return { ...bill, paidAmount: newPaidAmount, status: newStatus, payments: [...existingPayments, newPayment] };
        }
        return bill;
      }));
    }
  };

  const createManualInvoice = async ({ patientName, items }) => {
    try {
      const res = await api.post('/billing/manual', { patientName, items });
      const formattedBill = { ...res.data, id: res.data._id, total: res.data.totalAmount };
      setBills(prev => [formattedBill, ...prev]);
      await db.bills.put(formattedBill);

      // Refetch inventory since backend already deducted stock
      api.get('/inventory').then(inv => {
        if (inv && inv.data) setInventory(inv.data.map(i => ({ ...i, id: i.itemId || i._id })));
      }).catch(console.warn);
    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      let totalCost = 0;
      const billedItems = [];
      items.forEach(item => {
         const med = inventory.find(m => m.id === item.medicineId);
         if (med && item.qty > 0) {
            const cost = item.qty * med.unitPrice;
            totalCost += cost;
            billedItems.push({ desc: med.name, qty: item.qty, cost: cost });
            updateInventoryStock(item.medicineId, -item.qty);
         }
      });
  
      if (totalCost > 0) {
        const newBill = {
          id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          patientId: null, visitId: null, patientName: patientName || 'Walk-in Patient', date: new Date().toISOString().split('T')[0],
          items: billedItems, total: totalCost, paidAmount: 0, status: 'Unpaid', payments: [], source: 'OTC'
        };
        setBills(prev => [newBill, ...prev]);
      }
      */
    }
  };

  const addPrescription = async (prescriptionData) => {
    try {
      const res = await api.post('/prescriptions', prescriptionData);
      setPrescriptions(prev => [{ ...res.data, id: res.data.prescriptionId || res.data._id }, ...prev]);
      if (prescriptionData.visitId) updateVisitStatus(prescriptionData.visitId, 'Pharmacy Queue');
    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      const newPrescription = { ...prescriptionData, id: `rx_${Math.floor(1000 + Math.random() * 9000)}`, status: 'PRESCRIBED', date: new Date().toISOString() };
      setPrescriptions(prev => [newPrescription, ...prev]);
      if (prescriptionData.visitId) updateVisitStatus(prescriptionData.visitId, 'Pharmacy Queue');
      */
    }
  };

  const dispensePrescription = async (prescriptionId, dispensedItems) => {
    try {
      const res = await api.post(`/prescriptions/${prescriptionId}/dispense`, { dispensedItems });
      const { prescription, bill } = res.data;

      setPrescriptions(prev => prev.map(rx =>
        rx.id === prescriptionId ? { ...prescription, id: prescription.prescriptionId || prescription._id } : rx
      ));
      if (bill && (bill._id || bill.id)) {
        const formattedBill = { ...bill, id: bill._id || bill.id, total: bill.totalAmount };
        setBills(prev => {
          // If bill already exists in state, update it; otherwise add it
          const exists = prev.find(b => b._id === formattedBill.id || b.id === formattedBill.id);
          if (exists) {
            return prev.map(b => (b._id === formattedBill.id || b.id === formattedBill.id) ? formattedBill : b);
          }
          return [formattedBill, ...prev];
        });
        await db.bills.put(formattedBill);
      }

      // Visit status is already correctly set by the backend:
      // - 'Ready for Treatment' if needsNurse
      // - 'Awaiting Payment' if no nurse needed
      // Only update local frontend state to match (do NOT call updateVisitStatus which would re-hit the API)
      const needsNurse = dispensedItems.some(item => {
        const itemName = (item.resolvedName || item.name || '').toLowerCase();
        const manualFlag = item.requiresTreatment === true;
        return manualFlag || itemName.includes('inj') || itemName.includes('syringe') || itemName.includes('vial') || itemName.includes('iv') || itemName.includes('im') || itemName.includes('diclofenac');
      });

      if (res.data.prescription && res.data.prescription.visitId) {
        const visitId = res.data.prescription.visitId;
        const targetStatus = needsNurse ? 'Ready for Treatment' : 'Awaiting Payment';
        setVisits(prev => prev.map(v => v.id === visitId ? { ...v, status: targetStatus } : v));
      }

      // Update inventory by refetching
      api.get('/inventory').then(inv => {
        if (inv && inv.data) setInventory(inv.data.map(i => ({ ...i, id: i.itemId || i._id })));
      }).catch(console.warn);

    } catch (err) {
      console.error("API Error", err);
      /*
      console.warn("Offline fallback", err);
      setPrescriptions(prev => prev.map(rx => {
        if (rx.id !== prescriptionId) return rx;

        let allDispensed = true;
        let anyDispensed = false;
        let totalCost = 0;
        const billedItems = [];

        const updatedItems = rx.items.map(item => {
          const dispensedInfo = dispensedItems.find(di => di.itemId === item.itemId);
          if (dispensedInfo) {
            if (dispensedInfo.dispensedQty > 0) {
              updateInventoryStock(item.medicineId, -dispensedInfo.dispensedQty);
              anyDispensed = true;
              
              const med = inventory.find(m => m.id === item.medicineId);
              if (med) {
                const cost = dispensedInfo.dispensedQty * med.unitPrice;
                totalCost += cost;
                billedItems.push({ desc: med.name, qty: dispensedInfo.dispensedQty, cost: cost });
              }
            }
            
            if (dispensedInfo.dispensedQty < item.requestedQty && dispensedInfo.status !== 'OUT_OF_STOCK') allDispensed = false;
            if (dispensedInfo.status === 'OUT_OF_STOCK' || dispensedInfo.status === 'PENDING') allDispensed = false;

            return { ...item, dispensedQty: dispensedInfo.dispensedQty, status: dispensedInfo.status };
          }
          allDispensed = false;
          return item;
        });

        const newStatus = allDispensed ? 'DISPENSED' : (anyDispensed ? 'PARTIALLY_DISPENSED' : 'PRESCRIBED');
        
        if (anyDispensed && totalCost > 0) {
          const patient = patients.find(p => p.id === rx.patientId);
          const newBill = {
            id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
            patientId: rx.patientId, visitId: rx.visitId, patientName: patient ? patient.name : 'Unknown Patient', date: new Date().toISOString().split('T')[0],
            items: billedItems, total: totalCost, paidAmount: 0, status: 'Unpaid', payments: [], referenceId: rx.id, source: 'PHARMACY'
          };
          api.post('/billing/manual', { patientName: patient ? patient.name : 'Unknown Patient', items: billedItems.map(b => ({ medicineId: b.medicineId, qty: b.qty })) }).catch(console.warn);
          
          setBills(prevBills => [newBill, ...prevBills]);
        }

        return { ...rx, items: updatedItems, status: newStatus };
      }));
      */
    }
  };
  const bookAppointment = async (appointmentData) => {
    try {
      const res = await api.post('/appointments', appointmentData);
      const newApt = { ...res.data, id: res.data._id };
      setAppointments(prev => [newApt, ...prev]);
      await db.appointments.put(newApt);
      return newApt;
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };

  const updateAppointmentStatus = async (id, status) => {
    try {
      const res = await api.put(`/appointments/${id}/status`, { status });
      const updatedApt = { ...res.data, id: res.data._id };
      setAppointments(prev => prev.map(apt => apt.id === id ? updatedApt : apt));
      await db.appointments.put(updatedApt);

      // If checked in, we might need to refresh visits since backend auto-creates one
      if (status === 'Checked-In') {
        loadData();
      }
      return updatedApt;
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };

  const deleteAppointment = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      await db.appointments.delete(id);
    } catch (err) {
      console.error("API Error", err);
      throw err;
    }
  };


  const updatePrescriptionDose = async (prescriptionId) => {
    try {
      setPrescriptions(prev => prev.map(p => {
        if (String(p.id) === String(prescriptionId)) {
          const newItems = p.items.map(item => ({
            ...item,
            dosesAdministered: (item.dosesAdministered || 0) + 1
          }));
          return { ...p, items: newItems };
        }
        return p;
      }));
    } catch (err) {
      console.error("Dose update failed", err);
    }
  };

  const deleteBill = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await api.delete(`/billing/${id}`);
      setBills(prev => prev.filter(b => b._id !== id && b.id !== id));
      await db.bills.delete(id);
    } catch (err) {
      console.error("API Error deleting bill", err);
    }
  };

  const openAddPatientModal = (patient = null) => {
    // If called from an event handler directly (onClick={openAddPatientModal}),
    // the first argument will be the event object. We should treat it as null.
    const patientData = (patient && (patient.nativeEvent || patient.preventDefault)) ? null : patient;
    setSelectedPatient(patientData);
    setIsAddPatientModalOpen(true);
  };
  const closeAddPatientModal = () => {
    setSelectedPatient(null);
    setIsAddPatientModalOpen(false);
  };
  const openAddVisitModal = (patientId = null) => { setSelectedPatientId(patientId); setIsAddVisitModalOpen(true); };
  const openEditVisitModal = (visit) => { setSelectedVisit(visit); setIsAddVisitModalOpen(true); };
  const closeAddVisitModal = () => { setIsAddVisitModalOpen(false); setSelectedPatientId(null); setSelectedVisit(null); };
  const openAddRecordModal = (patientId = null, visitId = null, referenceId = null) => { setSelectedPatientId(patientId); setSelectedVisitId(visitId); setSelectedReferenceId(referenceId); setIsAddRecordModalOpen(true); };
  const closeAddRecordModal = () => { setIsAddRecordModalOpen(false); setSelectedPatientId(null); setSelectedVisitId(null); setSelectedReferenceId(null); };
  const openAddStaffModal = (staff = null) => { 
    const staffData = (staff && (staff.nativeEvent || staff.preventDefault)) ? null : staff;
    setSelectedStaff(staffData);
    setIsAddStaffModalOpen(true); 
  };
  const closeAddStaffModal = () => {
    setSelectedStaff(null);
    setIsAddStaffModalOpen(false);
  };

  const updateStaff = async (id, updatedData) => {
    if (!id || id === 'undefined') {
      console.error("updateStaff called with invalid ID:", id);
      return;
    }
    try {
      const res = await api.put(`/staffs/${id}`, updatedData);
      const updatedStaff = { ...res.data, id: res.data.empId || res.data._id };
      setStaffs(prev => prev.map(s => s.id === id ? updatedStaff : s));
      
      if (id !== updatedStaff.id) {
         // Cleanup if id changed (e.g., from ObjectId to empId)
         await db.staffs.delete(id);
      }
      await db.staffs.put(updatedStaff);
      return updatedStaff;
    } catch (err) {
      console.error("API Error updating staff", err);
      throw err;
    }
  };

  return (
    <DataContext.Provider value={{
      patients, visits, medicalRecords, vitals, staffs, inventory, bills, prescriptions, appointments, announcements,
      addPatient, addVisit, addMedicalRecord, addVitals, addStaff,
      updatePatient, updateVisitStatus, updateVisit, deleteVisit, deletePatient, deleteStaff, updateStaff,
      updateInventoryStock, addInventoryItem, addPaymentToBill, createManualInvoice,
      addPrescription, dispensePrescription, updatePrescriptionDose,
      bookAppointment, updateAppointmentStatus, deleteAppointment, deleteBill,
      createAnnouncement, updateAnnouncement, deleteAnnouncement,
      isAddPatientModalOpen, openAddPatientModal, closeAddPatientModal,
      isAddVisitModalOpen, openAddVisitModal, openEditVisitModal, closeAddVisitModal,
      isAddRecordModalOpen, openAddRecordModal, closeAddRecordModal,
      isAddStaffModalOpen, openAddStaffModal, closeAddStaffModal,
      selectedPatientId, selectedVisitId, selectedReferenceId, selectedPatient, selectedVisit, selectedStaff,
      isSyncing, isOffline, pendingSyncCount, handleSync
    }}>
      {children}
    </DataContext.Provider>
  );
};
