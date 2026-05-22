import { useState } from 'react';
import { Search, Plus, Filter, Edit2, Trash2, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Navigate } from 'react-router-dom';
import './StaffList.css';

export default function StaffList() {
  const { staffs, openAddStaffModal, deleteStaff } = useData();
  const { user } = useAuth();
  const { showToast } = useSocket();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Authorization
  if (user?.role !== 'Admin') {
    return <Navigate to="/dashboard/overview" replace />;
  }

  // Filtering
  const filteredStaffs = staffs.filter(st =>
    st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    st.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredStaffs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStaffs = filteredStaffs.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="staff-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="heading-3">Staff Directory</h1>
          <p className="header-subtitle">Manage clinical staff, administrators, and department access.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openAddStaffModal()}>
          <Plus size={18} /> <span>Add New Staff</span>
        </button>
      </div>

      <div className="staff-panel">
        <div className="panel-filters">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, employee ID, or role..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button className="btn-icon-label">
            <Filter size={18} />
            <span>Filter</span>
          </button>
        </div>

        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Staff Name</th>
                <th>Role / Dept</th>
                <th>Contact Information</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStaffs.map((st) => (
                <tr key={st.id}>
                  <td className="staff-id">{st.empId}</td>
                  <td>
                    <div className="staff-identity">
                      <div className="staff-avatar" style={{ background: st.role === 'Admin' ? 'var(--color-purple)' : 'var(--color-primary)' }}>
                        {st.name.split(' ').map((n, i) => i < 2 ? n[0] : '').join('')}
                      </div>
                      <div className="staff-name-group">
                        <span className="staff-name">{st.name}</span>
                        <span className="staff-role-label">{st.role}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="dept-tag">
                      {['Doctor', 'Nurse'].includes(st.role) ? (st.department && st.department !== st.role ? st.department : (st.role === 'Doctor' ? 'General OPD' : 'Triage & Emergency')) : st.role}
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <span className="phone">{st.phone}</span>
                      <span className="email">{st.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${st.status === 'Active' ? 'active' : 'inactive'}`}>
                      {st.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions">
                      <button
                        className="action-btn edit"
                        title="Edit Staff Member"
                        onClick={() => openAddStaffModal(st)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button className="action-btn delete" title="Remove Staff" onClick={() => {
                        showToast('Are you sure you want to remove this staff member?', 'confirm', () => {
                          deleteStaff(st.id);
                          showToast('Staff member removed successfully', 'success');
                        });
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStaffs.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No staff members found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-wrapper">
          <div className="pagination-info">
            Showing <span>{startIndex + 1}</span> to <span>{Math.min(startIndex + itemsPerPage, filteredStaffs.length)}</span> of <span>{filteredStaffs.length}</span> members
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
