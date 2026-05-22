import { useState } from 'react';
import { Search, Filter, FlaskConical, Pill, Activity, Download, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportMedicalRecordToPdf } from '../../utils/ExportPdf';
import './MedicalRecords.css';

export default function MedicalRecords() {
  const { medicalRecords, patients, openAddRecordModal } = useData();
  const { user } = useAuth();

  // Tabs Logic
  const initialTab = ['Lab Technician'].includes(user?.role) ? 'Lab Request' : 'Lab Result';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Map type names to tab roles
  const tabMap = {
    'labs': 'Lab Result',
    'prescriptions': 'Prescription',
    'diagnostics': 'Diagnosis'
  };

  const currentType = tabMap[activeTab] || activeTab;

  // Record Filtering
  const filteredRecords = medicalRecords.filter(record => {
    // Hide requests from Admin
    if (user?.role === 'Admin' && record.type === 'Lab Request') return false;

    // Hide requests that already have results
    if (currentType === 'Lab Request') {
      const hasResult = medicalRecords.some(r =>
        r.type === 'Lab Result' &&
        String(r.patientId) === String(record.patientId) &&
        (
          (r.referenceId && String(r.referenceId) === String(record.id)) ||
          (record.visitId && String(r.visitId) === String(record.visitId) && r.title === record.title)
        )
      );
      if (hasResult) return false;
    }

    const matchesTab = record.type === currentType;
    const patient = patients.find(p => p.id === record.patientId);
    const patientName = record.patientName || patient?.name || '';

    const matchesSearch = patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="medical-records-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="heading-3">Medical Records</h1>
          <p className="header-subtitle">Access and manage clinical documentation, lab reports, and medication histories.</p>
        </div>

        { /* {['Doctor'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => openAddRecordModal()}>
            <Plus size={18} /> <span>Create New Entry</span>
          </button>
        )}*/}

      </div>

      <div className="mr-tabs-wrapper">
        <div className="mr-tabs-nav">
          {['Lab Technician'].includes(user?.role) && (
            <button
              className={`mr-tab-item ${activeTab === 'Lab Request' ? 'active warning' : ''}`}
              onClick={() => { setActiveTab('Lab Request'); setCurrentPage(1); }}
            >
              <FlaskConical size={18} />
              <span>Pending Requests</span>
            </button>
          )}
          <button
            className={`mr-tab-item ${activeTab === 'Lab Result' ? 'active' : ''}`}
            onClick={() => { setActiveTab('Lab Result'); setCurrentPage(1); }}
          >
            <FlaskConical size={18} />
            <span>Lab Results</span>
          </button>
          <button
            className={`mr-tab-item ${activeTab === 'Prescription' ? 'active' : ''}`}
            onClick={() => { setActiveTab('Prescription'); setCurrentPage(1); }}
          >
            <Pill size={18} />
            <span>Prescriptions</span>
          </button>
          <button
            className={`mr-tab-item ${activeTab === 'Diagnosis' ? 'active' : ''}`}
            onClick={() => { setActiveTab('Diagnosis'); setCurrentPage(1); }}
          >
            <Activity size={18} />
            <span>Diagnostics</span>
          </button>
        </div>
      </div>

      <div className="mr-panel">
        <div className="panel-filters">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by patient, title, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button className="btn-icon-label">
            <Filter size={18} />
            <span>Filter Results</span>
          </button>
        </div>

        <div className="table-container">
          <table className="mr-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient Details</th>
                <th>{activeTab === 'Lab Request' ? 'Requested Test' : 'Record Title'}</th>
                <th>Recorded At</th>
                <th>Clinician</th>
                <th>Brief Summary</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((record) => {
                const patient = patients.find(p => p.id === record.patientId);
                return (
                  <tr key={record.id}>
                    <td className="record-id-cell">
                      {record.id?.length > 10 ? `REC-${record.id.slice(-4).toUpperCase()}` : record.id}
                    </td>
                    <td>
                      <div className="patient-meta-cell">
                        <span className="patient-name">{patient?.name || 'Unknown'}</span>
                        <span className="patient-id-tag">{patient?.pid || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="record-title-cell">{record.title}</td>
                    <td className="record-date-cell">
                      {record.date ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="doctor-name-cell">{record.doctor}</td>
                    <td className="notes-summary-cell">
                      {record.notes || 'No notes provided.'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        {activeTab === 'Lab Request' ? (
                          <button
                            className="btn-action-primary"
                            onClick={() => openAddRecordModal(record.patientId, record.visitId, record.id)}
                          >
                            <span>Enter Result</span>
                          </button>
                        ) : (
                          <button
                            className="action-btn download"
                            title="Download PDF"
                            onClick={() => exportMedicalRecordToPdf(record, patient)}
                          >
                            <Download size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No matching {activeTab.toLowerCase()} records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing <span>{startIndex + 1}</span> to <span>{Math.min(startIndex + itemsPerPage, filteredRecords.length)}</span> of <span>{filteredRecords.length}</span> records
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <div className="page-numbers">
              Page {currentPage} of {totalPages || 1}
            </div>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
