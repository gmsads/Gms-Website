import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [popup, setPopup] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    title: '',
    bannerType: 'date_range',
    startDate: '',
    endDate: '',
    specificDate: '',
    duration: '',
    durationUnit: 'days',
    priority: 0,
    clickUrl: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  // Auto-hide popup after 3 seconds
  useEffect(() => {
    if (popup.show) {
      const timer = setTimeout(() => {
        setPopup({ show: false, message: '', type: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [popup.show]);

  const showPopup = (message, type = 'success') => {
    setPopup({ show: true, message, type });
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/banners');
      if (response.data.success) {
        setBanners(response.data.banners);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      showPopup('Failed to fetch banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, bannerImage: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const submitData = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== undefined && formData[key] !== null && key !== 'bannerImage') {
        submitData.append(key, formData[key]);
      }
    });
    
    if (formData.bannerImage) {
      submitData.append('bannerImage', formData.bannerImage);
    }

    try {
      let response;
      if (editingBanner) {
        response = await axios.put(`/api/banners/${editingBanner._id}`, submitData);
        if (response.data.success) {
          showPopup('Banner updated successfully!', 'success');
        }
      } else {
        response = await axios.post('/api/banners', submitData);
        if (response.data.success) {
          showPopup('Banner created successfully!', 'success');
        }
      }

      if (response.data.success) {
        resetForm();
        fetchBanners();
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      showPopup(error.response?.data?.message || 'Failed to save banner', 'error');
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      bannerType: banner.bannerType,
      startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
      specificDate: banner.specificDate ? banner.specificDate.split('T')[0] : '',
      duration: banner.duration?.value || '',
      durationUnit: banner.duration?.unit || 'days',
      priority: banner.priority,
      clickUrl: banner.clickUrl || '',
      description: banner.description || '',
      isActive: banner.isActive
    });
    setPreviewImage(banner.imageUrl);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        const response = await axios.delete(`/api/banners/${id}`);
        if (response.data.success) {
          showPopup('Banner deleted successfully!', 'success');
          fetchBanners();
        }
      } catch (error) {
        console.error('Error deleting banner:', error);
        showPopup('Failed to delete banner', 'error');
      }
    }
  };

  const resetForm = () => {
    setEditingBanner(null);
    setShowForm(false);
    setPreviewImage(null);
    setFormData({
      title: '',
      bannerType: 'date_range',
      startDate: '',
      endDate: '',
      specificDate: '',
      duration: '',
      durationUnit: 'days',
      priority: 0,
      clickUrl: '',
      description: '',
      isActive: true
    });
  };

  const getBannerStatus = (banner) => {
    const now = new Date();
    if (!banner.isActive) return 'Inactive';
    
    switch(banner.bannerType) {
      case 'single_day': {
        const specificDate = new Date(banner.specificDate);
        return specificDate.toDateString() === now.toDateString() ? 'Active Today' : 'Scheduled';
      }
      case 'date_range': {
        const start = new Date(banner.startDate);
        const end = new Date(banner.endDate);
        if (now >= start && now <= end) return 'Active';
        if (now < start) return 'Upcoming';
        return 'Expired';
      }
      case 'ongoing':
        return 'Active (Ongoing)';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active')) return '#4caf50';
    if (statusLower.includes('active today')) return '#ff9800';
    if (statusLower.includes('upcoming')) return '#ffc107';
    if (statusLower.includes('expired')) return '#9e9e9e';
    if (statusLower.includes('scheduled')) return '#9c27b0';
    if (statusLower.includes('inactive')) return '#f44336';
    return '#666';
  };

  // Popup Styles
  const popupStyles = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '500',
    zIndex: 9999,
    animation: 'slideIn 0.3s ease-out',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  };

  // Styles
  const styles = {
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '2px solid #e0e0e0',
      flexWrap: 'wrap',
      gap: '15px'
    },
    headerTitle: {
      margin: 0,
      color: '#333',
      fontSize: '28px'
    },
    addButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 600,
      transition: 'all 0.2s'
    },
    formContainer: {
      background: 'white',
      borderRadius: '12px',
      padding: '30px',
      marginBottom: '30px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    },
    formTitle: {
      marginTop: 0,
      marginBottom: '20px',
      color: '#333'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontWeight: 600,
      color: '#555',
      fontSize: '14px'
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      transition: 'border-color 0.2s'
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      transition: 'border-color 0.2s'
    },
    textarea: {
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      transition: 'border-color 0.2s',
      fontFamily: 'inherit'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontWeight: 600,
      color: '#555',
      fontSize: '14px'
    },
    imagePreview: {
      marginTop: '10px',
      maxWidth: '300px'
    },
    previewImg: {
      width: '100%',
      height: 'auto',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    formActions: {
      display: 'flex',
      gap: '15px',
      marginTop: '10px'
    },
    submitButton: {
      background: '#4caf50',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s'
    },
    cancelButton: {
      background: '#f44336',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 600,
      transition: 'all 0.2s'
    },
    sectionTitle: {
      marginBottom: '20px',
      color: '#333'
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      color: '#666',
      fontSize: '16px'
    },
    noBanners: {
      textAlign: 'center',
      padding: '40px',
      color: '#666',
      fontSize: '16px'
    },
    bannersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '25px'
    },
    bannerCard: {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s'
    },
    bannerImageContainer: {
      position: 'relative',
      height: '200px',
      overflow: 'hidden'
    },
    bannerImg: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    bannerStatus: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      color: 'white'
    },
    bannerInfo: {
      padding: '15px'
    },
    bannerTitle: {
      margin: '0 0 10px 0',
      fontSize: '18px',
      color: '#333'
    },
    bannerType: {
      color: '#666',
      fontSize: '13px',
      margin: '5px 0',
      textTransform: 'capitalize'
    },
    bannerDate: {
      color: '#666',
      fontSize: '13px',
      margin: '5px 0'
    },
    bannerDesc: {
      color: '#777',
      fontSize: '13px',
      margin: '10px 0',
      lineHeight: '1.4'
    },
    bannerMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      margin: '10px 0',
      paddingTop: '10px',
      borderTop: '1px solid #e0e0e0',
      fontSize: '12px',
      color: '#666'
    },
    statusBadge: {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600
    },
    bannerActions: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px'
    },
    editButton: {
      flex: 1,
      padding: '8px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 600,
      background: '#2196f3',
      color: 'white',
      transition: 'all 0.2s'
    },
    deleteButton: {
      flex: 1,
      padding: '8px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: 600,
      background: '#f44336',
      color: 'white',
      transition: 'all 0.2s'
    }
  };

  return (
    <div style={styles.container}>
      {/* Popup Notification */}
      {popup.show && (
        <div style={{
          ...popupStyles,
          background: popup.type === 'success' ? '#4caf50' : '#f44336'
        }}>
          {popup.message}
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Banner Management</h1>
        <button 
          style={styles.addButton}
          onClick={() => setShowForm(!showForm)}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {showForm ? 'Cancel' : '+ Add New Banner'}
        </button>
      </div>

      {showForm && (
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>{editingBanner ? 'Edit Banner' : 'Create New Banner'}</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Banner Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Enter banner title"
                style={styles.input}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Banner Type *</label>
              <select 
                name="bannerType" 
                value={formData.bannerType} 
                onChange={handleInputChange}
                style={styles.select}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              >
                <option value="single_day">Single Day</option>
                <option value="date_range">Date Range</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>

            {formData.bannerType === 'single_day' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Specific Date *</label>
                <input
                  type="date"
                  name="specificDate"
                  value={formData.specificDate}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                />
              </div>
            )}

            {formData.bannerType === 'date_range' && (
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date *</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    required
                    style={styles.input}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                </div>
              </div>
            )}

            {formData.bannerType === 'ongoing' && (
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Duration Value</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    placeholder="Optional"
                    style={styles.input}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Duration Unit</label>
                  <select 
                    name="durationUnit" 
                    value={formData.durationUnit} 
                    onChange={handleInputChange}
                    style={styles.select}
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            )}

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Priority (0-10)</label>
                <input
                  type="number"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  min="0"
                  max="10"
                  style={styles.input}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active
                </label>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Click URL (Optional)</label>
              <input
                type="url"
                name="clickUrl"
                value={formData.clickUrl}
                onChange={handleInputChange}
                placeholder="https://example.com"
                style={styles.input}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Brief description of the banner"
                style={styles.textarea}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Banner Image * {!editingBanner && '(Required)'}</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required={!editingBanner}
                style={styles.input}
              />
              {previewImage && (
                <div style={styles.imagePreview}>
                  <img src={previewImage} alt="Preview" style={styles.previewImg} />
                </div>
              )}
            </div>

            <div style={styles.formActions}>
              <button 
                type="submit" 
                style={styles.submitButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4caf50'}
              >
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </button>
              <button 
                type="button" 
                style={styles.cancelButton}
                onClick={resetForm}
                onMouseEnter={(e) => e.currentTarget.style.background = '#da190b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f44336'}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h2 style={styles.sectionTitle}>All Banners</h2>
        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : banners.length === 0 ? (
          <div style={styles.noBanners}>No banners found. Create your first banner!</div>
        ) : (
          <div style={styles.bannersGrid}>
            {banners.map((banner) => {
              const status = getBannerStatus(banner);
              return (
                <div key={banner._id} style={styles.bannerCard}>
                  <div style={styles.bannerImageContainer}>
                    <img src={banner.imageUrl} alt={banner.title} style={styles.bannerImg} />
                    <div style={{...styles.bannerStatus, background: getStatusColor(status)}}>
                      {status}
                    </div>
                  </div>
                  <div style={styles.bannerInfo}>
                    <h3 style={styles.bannerTitle}>{banner.title}</h3>
                    <p style={styles.bannerType}>Type: {banner.bannerType.replace('_', ' ')}</p>
                    {banner.bannerType === 'single_day' && (
                      <p style={styles.bannerDate}>
                        Date: {new Date(banner.specificDate).toLocaleDateString()}
                      </p>
                    )}
                    {banner.bannerType === 'date_range' && (
                      <p style={styles.bannerDate}>
                        From: {new Date(banner.startDate).toLocaleDateString()} <br />
                        To: {new Date(banner.endDate).toLocaleDateString()}
                      </p>
                    )}
                    {banner.bannerType === 'ongoing' && banner.duration && (
                      <p style={styles.bannerDate}>
                        Duration: {banner.duration.value} {banner.duration.unit}
                      </p>
                    )}
                    {banner.description && <p style={styles.bannerDesc}>{banner.description}</p>}
                    <div style={styles.bannerMeta}>
                      <span>Priority: {banner.priority}</span>
                      <span style={{
                        ...styles.statusBadge,
                        background: banner.isActive ? '#e8f5e9' : '#ffebee',
                        color: banner.isActive ? '#4caf50' : '#f44336'
                      }}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={styles.bannerActions}>
                      <button 
                        style={styles.editButton}
                        onClick={() => handleEdit(banner)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1976d2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#2196f3'}
                      >
                        Edit
                      </button>
                      <button 
                        style={styles.deleteButton}
                        onClick={() => handleDelete(banner._id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#da190b'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#f44336'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add animation keyframes */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default BannerManagement;