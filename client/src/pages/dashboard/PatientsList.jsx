import { useState } from 'react';
import { Search, Plus, Filter, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import './PatientsList.css';

export default function PatientsList() {
  const navigate = useNavigate();
  const { patients, openAddPatientModal, deletePatient } = useData();
  const { user } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtering
  const filteredPatients = patients.filter(pt =>
    pt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.pid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pt.phone.includes(searchQuery)
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const canAddPatient = ['Receptionist'].includes(user?.role);

  return (
    <div className="patients-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="heading-3">Patients Directory</h1>
          <p className="header-subtitle">Manage and monitor your patient registry and clinical histories.</p>
        </div>

      </div>

      <div className="patients-panel">
        <div className="panel-filters">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, patient ID, or phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
            />
          </div>
          <button className="btn-icon-label">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>

        <div className="table-container">
          <table className="patients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Contact</th>
                <th>Last Visit</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.map((pt) => (
                <tr key={pt.id} onClick={() => navigate(`/dashboard/patient/${pt.id}`)}>
                  <td className="patient-pid">{pt.pid}</td>
                  <td>
                    <div className="patient-identity">
                      <div className="patient-avatar">
                        {pt.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="patient-name">{pt.name}</span>
                    </div>
                  </td>
                  <td className="patient-meta">{pt.age} yrs, {pt.gender}</td>
                  <td className="patient-meta">{pt.phone}</td>
                  <td>
                    <span className="visit-date">
                      {pt.lastVisit ? new Date(pt.lastVisit).toLocaleDateString('en-GB') : 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${pt.status === 'Active' ? 'active' : pt.status === 'Referred' ? 'referred' : 'inactive'}`}>
                      {pt.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="action-btn view" title="View Profile" onClick={() => navigate(`/dashboard/patient/${pt.id}`)}>
                        <Eye size={16} />
                      </button>
                      {['Receptionist', 'Admin'].includes(user?.role) && (
                        <>
                          <button className="action-btn edit" title="Edit Profile" onClick={() => openAddPatientModal(pt)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="action-btn delete" title="Delete Record" onClick={() => {
                            if (window.confirm('Are you sure you want to delete this patient record?')) {
                              deletePatient(pt.id);
                            }
                          }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedPatients.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No patients found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing <span>{startIndex + 1}</span> to <span>{Math.min(startIndex + itemsPerPage, filteredPatients.length)}</span> of <span>{filteredPatients.length}</span> patients
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
