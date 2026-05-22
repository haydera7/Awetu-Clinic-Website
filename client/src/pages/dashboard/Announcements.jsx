import { useState, useRef, useCallback } from 'react';
import {
  Search, Plus, Trash2, Megaphone, CheckCircle, AlertTriangle,
  Info, Bell, ToggleLeft, ToggleRight, X, Upload, ImageIcon
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { Navigate } from 'react-router-dom';
import api from '../../services/api';
import './Announcements.css';

export default function Announcements() {
  const { announcements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = useData();
  const { user } = useAuth();
  const { showToast } = useSocket();

  // List state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    active: true
  });

  // Image upload state
  const [selectedFile, setSelectedFile] = useState(null);   // File object
  const [localPreview, setLocalPreview] = useState('');     // blob URL for display
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Authorization
  if (user?.role !== 'Admin') {
    return <Navigate to="/dashboard/overview" replace />;
  }

  // ─── Filter ──────────────────────────────────────────────────────────────────
  const filtered = announcements.filter(ann => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || ann.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const clearImageState = useCallback(() => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setSelectedFile(null);
    setLocalPreview('');
  }, [localPreview]);

  const applyFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file.', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB.', 'warning');
      return;
    }
    if (localPreview) URL.revokeObjectURL(localPreview);
    setSelectedFile(file);
    setLocalPreview(URL.createObjectURL(file));
    // Clear any previously saved imageUrl from the server so it doesn't conflict
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) applyFile(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  };

  // ─── Modal open/close ──────────────────────────────────────────────────────────
  const handleOpenModal = (ann = null) => {
    clearImageState();
    if (ann) {
      setEditingAnnouncement(ann);
      setFormData({
        title: ann.title,
        content: ann.content,
        category: ann.category,
        active: ann.active,
        imageUrl: ann.imageUrl || ''
      });
      // Show existing image as preview (it's a server URL, not a blob)
      if (ann.imageUrl) setLocalPreview(ann.imageUrl);
    } else {
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', category: 'General', active: true, imageUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    clearImageState();
    setIsModalOpen(false);
    setEditingAnnouncement(null);
  };

  // ─── Toggle / Delete ──────────────────────────────────────────────────────────
  const handleToggleActive = async (ann) => {
    try {
      await updateAnnouncement(ann.id, { active: !ann.active });
      showToast(`Announcement ${ann.active ? 'deactivated' : 'activated'} successfully`, 'success');
    } catch {
      showToast('Failed to update status', 'danger');
    }
  };

  const handleDelete = (id) => {
    showToast('Permanently delete this announcement?', 'confirm', async () => {
      try {
        await deleteAnnouncement(id);
        showToast('Announcement deleted', 'success');
      } catch {
        showToast('Failed to delete announcement', 'danger');
      }
    });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl || '';

      // Upload new file if one was chosen
      if (selectedFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('image', selectedFile);
        const res = await api.post('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = res.data.url;
        setUploading(false);
      }

      const payload = { ...formData, imageUrl: finalImageUrl };

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, payload);
        showToast('Announcement updated', 'success');
      } else {
        await createAnnouncement(payload);
        showToast('Announcement published', 'success');
      }
      handleCloseModal();
    } catch (err) {
      setUploading(false);
      showToast(err.response?.data?.message || 'Failed to save announcement', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Category icon ────────────────────────────────────────────────────────────
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Critical': return <AlertTriangle size={16} className="category-icon critical" />;
      case 'Notice':   return <Info size={16} className="category-icon notice" />;
      case 'Update':   return <CheckCircle size={16} className="category-icon update" />;
      default:         return <Megaphone size={16} className="category-icon general" />;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="announcements-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="heading-3">Admin Announcements</h1>
          <p className="header-subtitle">Publish notices and news directly on the landing page.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> <span>Create Announcement</span>
        </button>
      </div>

      <div className="announcements-panel">
        {/* Filters */}
        <div className="panel-filters">
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="category-filters">
            {['All', 'General', 'Notice', 'Update', 'Critical'].map((cat) => (
              <button
                key={cat}
                className={`filter-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="announcements-grid">
          {filtered.map((ann) => (
            <div key={ann.id} className={`announcement-card ${ann.active ? 'active' : 'inactive'}`}>
              {ann.imageUrl && (
                <div className="card-image-wrapper">
                  <img
                    src={ann.imageUrl}
                    alt={ann.title}
                    className="card-image"
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="card-header">
                <span className={`category-tag ${ann.category.toLowerCase()}`}>
                  {getCategoryIcon(ann.category)}
                  <span>{ann.category}</span>
                </span>
                <span className="card-date">{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="card-body">
                <h3 className="card-title">{ann.title}</h3>
                <p className="card-content">{ann.content}</p>
              </div>
              <div className="card-footer">
                <span className="created-by">By {ann.createdBy || 'Admin'}</span>
                <div className="card-actions">
                  <button
                    className="toggle-active-btn"
                    title={ann.active ? 'Deactivate' : 'Activate'}
                    onClick={() => handleToggleActive(ann)}
                  >
                    {ann.active
                      ? <ToggleRight size={26} className="active-toggle" />
                      : <ToggleLeft size={26} className="inactive-toggle" />}
                  </button>
                  <button className="action-btn edit" onClick={() => handleOpenModal(ann)}>Edit</button>
                  <button className="action-btn delete" onClick={() => handleDelete(ann.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="empty-state-box">
              <Bell size={48} className="empty-state-icon" />
              <h3>No Announcements Found</h3>
              <p>Create a new announcement to share clinical updates and notices with visitors.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal ────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="announcement-modal">
            <div className="modal-header">
              <h2 className="heading-3">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button className="close-btn" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Title */}
              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Extended OPD Hours or New Pharmacy Service"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              {/* Category + Visibility */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input select-input"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="General">General</option>
                    <option value="Notice">Notice</option>
                    <option value="Update">Update</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="form-group status-group">
                  <label className="form-label">Visibility</label>
                  <div className="status-toggle-wrapper">
                    <input
                      type="checkbox"
                      id="active-checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    />
                    <label htmlFor="active-checkbox" className="toggle-slider-label">
                      {formData.active ? 'Visible on Landing Page' : 'Draft / Hidden'}
                    </label>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="form-group">
                <label className="form-label">Content / Body *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe the notice clearly..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  required
                />
              </div>

              {/* ── Image upload ─────────────────────────────────────────── */}
              <div className="form-group">
                <label className="form-label">
                  <ImageIcon size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  Cover Image <span className="optional-label">(Optional · max 5 MB)</span>
                </label>

                {/* Hidden real input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {localPreview ? (
                  /* Preview */
                  <div className="image-preview-wrapper">
                    <img src={localPreview} alt="Preview" className="image-preview" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => {
                        clearImageState();
                        setFormData(prev => ({ ...prev, imageUrl: '' }));
                      }}
                    >
                      <X size={14} /> Remove
                    </button>
                  </div>
                ) : (
                  /* Drop zone */
                  <div
                    className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <Upload size={28} className="dropzone-icon" />
                    <p className="dropzone-text">
                      <span>Click to upload</span> or drag &amp; drop
                    </p>
                    <p className="dropzone-sub">PNG, JPG, WEBP — up to 5 MB</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
                  {uploading ? 'Uploading image…' : submitting ? 'Saving…' : editingAnnouncement ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
