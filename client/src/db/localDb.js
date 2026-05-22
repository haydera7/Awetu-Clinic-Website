import Dexie from 'dexie';

export const db = new Dexie('HealthCareProDB');

// Define the schema for the local database
// ++id is the auto-incrementing primary key for IndexedDB
// indexed fields are listed after the comma
db.version(5).stores({
  patients: '++id, _id, pid, name, phone',
  visits: '++id, _id, visitId, patientId',
  medicalRecords: '++id, _id, recordId, patientId, visitId',
  prescriptions: '++id, _id, prescriptionId, patientId, visitId',
  inventory: '++id, _id, itemId, name',
  bills: '++id, _id, invoiceId, patientId',
  staffs: '++id, _id, empId, role',
  appointments: '++id, _id, appointmentId, patientId, doctorId, date',
  announcements: '++id, _id, title',
  syncQueue: '++id, collection, action, timestamp, status'
});

export const syncItem = async (collection, action, data) => {
  return await db.syncQueue.add({
    collection,
    action,
    data,
    timestamp: Date.now(),
    status: 'pending'
  });
};
