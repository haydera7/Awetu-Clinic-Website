import { useState } from 'react';
import { Search, Filter, Plus, Calendar as CalendarIcon, Clock, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import './VisitsList.css';

export default function VisitsList() {
  const navigate = useNavigate();
  const { visits, openAddVisitModal, openEditVisitModal, deleteVisit } = useData();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtering
  const filteredVisits = visits.filter(visit => {
    // Role-based filtering: Doctors only see their assigned visits
    if (user?.role === 'Doctor') {
      const isAssigned = (visit.doctor || '').toLowerCase().includes(user.name.toLowerCase()) || 
                        (user.name || '').toLowerCase().includes((visit.doctor || '').replace('DR.', '').trim().toLowerCase());
      if (!isAssigned) return false;
    }

    return (
      (visit.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visit.visitId || visit.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visit.doctor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visit.type || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVisits = filteredVisits.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'status-completed';
    if (s === 'scheduled') return 'status-triage'; // New Triage status
    if (s === 'waiting') return 'status-pending';
    if (s === 'in session' || s === 'in consultation') return 'status-active';
    if (s.includes('lab') || s.includes('pharmacy')) return 'status-alert';
    if (s === 'awaiting payment') return 'status-alert';
    if (s === 'ready for treatment') return 'status-warning';
    return 'status-default';
  };

  return (
    <div className="visits-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="heading-3">Visits & Appointments</h1>
          <p className="header-subtitle">Monitor clinical encounters, scheduled sessions, and patient workflow.</p>
        </div>
        {['Receptionist'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => openAddVisitModal()}>
            <Plus size={18} /> <span>Schedule New Visit</span>
          </button>
        )}
      </div>

      <div className="visits-panel">
        <div className="panel-filters">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search visits by patient name, ID, or doctor..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="filter-actions">
            <button className="btn-icon-label">
              <CalendarIcon size={18} />
              <span>Today</span>
            </button>
            <button className="btn-icon-label">
              <Filter size={18} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="visits-table">
            <thead>
              <tr>
                <th>Visit ID</th>
                <th>Patient Name</th>
                <th>Assigned Doctor</th>
                <th>Type of Visit</th>
                <th>Schedule</th>
                <th>Current Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVisits.map((visit) => (
                <tr key={visit.id} onClick={() => navigate(`/dashboard/patient/${visit.patientId}`)}>
                  <td className="visit-id-cell">{visit.visitId || visit.id}</td>
                  <td>
                    <div className="patient-info-cell">
                      <div className="avatar-small">{visit.patientName?.[0]}</div>
                      <span className="patient-name-text">{visit.patientName}</span>
                    </div>
                  </td>
                  <td className="doctor-cell">{visit.doctor}</td>
                  <td>
                    <span className="type-tag">{visit.type}</span>
                  </td>
                  <td>
                    <div className="schedule-cell">
                      <div className="date-row">
                        <CalendarIcon size={12} />
                        <span>{visit.date}</span>
                      </div>
                      <div className="time-row">
                        <Clock size={12} />
                        <span>{visit.time}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusClass(visit.status)}`}>
                      {visit.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="action-btn view" title="View Patient Details" onClick={() => navigate(`/dashboard/patient/${visit.patientId}`)}>
                        <Eye size={16} />
                      </button>
                      {['Receptionist'].includes(user?.role) && (
                        <>
                          <button className="action-btn edit" title="Edit Visit" onClick={() => openEditVisitModal(visit)}>
                            <Edit size={16} />
                          </button>
                          <button className="action-btn delete" title="Delete Visit" onClick={() => deleteVisit(visit.id)}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedVisits.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No clinical visits found for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing <span>{startIndex + 1}</span> to <span>{Math.min(startIndex + itemsPerPage, filteredVisits.length)}</span> of <span>{filteredVisits.length}</span> visits
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
