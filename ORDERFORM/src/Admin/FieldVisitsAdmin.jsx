import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, isSameDay } from 'date-fns';

const FieldVisitsAdmin = () => {
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editForm, setEditForm] = useState({
    client: '',
    contactNumber: '',
    businessName: '',
    location: '',
    purpose: '',
    status: '',
    notes: ''
  });
  const [filters, setFilters] = useState({
    executive: 'all',
    status: 'all',
    date: ''
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Timeline States
  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'timeline'
  const [timelineExec, setTimelineExec] = useState('');
  const [timelineDate, setTimelineDate] = useState(new Date().toISOString().split('T')[0]);
  const [timelineLog, setTimelineLog] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState('');

  const fetchRouteTimeline = async (exec, dateStr) => {
    if (!exec || !dateStr) return;
    setTimelineLoading(true);
    setTimelineError('');
    setTimelineLog(null);
    try {
      const res = await axios.get(`/api/tracking/${encodeURIComponent(exec)}/${dateStr}`);
      if (res.data?.data) {
        setTimelineLog(res.data.data);
      } else {
        setTimelineError(res.data?.message || 'No GPS tracking points recorded for this executive on this date.');
      }
    } catch (err) {
      setTimelineError('Failed to fetch GPS timeline data.');
    } finally {
      setTimelineLoading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchVisits();
    fetchExecutives();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, visits]);

  // Format image URL
  const formatImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http') || photoUrl.startsWith('data:')) return photoUrl;
    if (photoUrl.startsWith('/uploads') || photoUrl.startsWith('uploads')) {
      const prefix = photoUrl.startsWith('/') ? '' : '/';
      return `http://localhost:5000${prefix}${photoUrl}`;
    }
    return photoUrl;
  };

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError('');
      setServerError(null);

      const response = await axios.get('/api/field-executive/admin/visits');

      const processedVisits = response.data.map(visit => ({
        ...visit,
        photo: visit.photo ? formatImageUrl(visit.photo) : null
      }));

      setVisits(processedVisits);
      setFilteredVisits(processedVisits);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching visits:', error);

      try {
        const simpleResponse = await axios.get('/api/field-executive/admin/simple-visits');

        const processedVisits = simpleResponse.data.map(visit => ({
          ...visit,
          photo: visit.photo ? formatImageUrl(visit.photo) : null
        }));

        setVisits(processedVisits);
        setFilteredVisits(processedVisits);
        setLoading(false);
        return;
      } catch (simpleError) {
        console.error('Simple endpoint also failed:', simpleError);

        if (error.response && error.response.data) {
          setServerError(error.response.data);
          setError(`Server Error: ${error.response.data.error || error.response.data.message || 'Unknown error'}`);
        } else {
          setError('Failed to fetch visits. Please check if the server is running and try again.');
        }

        setLoading(false);
      }
    }
  };

  const fetchExecutives = async () => {
    try {
      const response = await axios.get('/api/field-executive/admin/executives');
      setExecutives(response.data);
    } catch (error) {
      console.error('Error fetching executives:', error);
      const uniqueExecutives = [...new Set(visits.map(visit => visit.executive).filter(Boolean))];
      setExecutives(uniqueExecutives);
    }
  };

  const applyFilters = () => {
    let filtered = [...visits];

    if (filters.executive && filters.executive !== 'all') {
      filtered = filtered.filter(visit =>
        visit.executive && visit.executive.toLowerCase().includes(filters.executive.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(visit => visit.status === filters.status);
    }

    if (filters.date) {
      const selectedDate = new Date(filters.date);
      filtered = filtered.filter(visit => {
        if (!visit.date) return false;
        const visitDate = new Date(visit.date);
        return isSameDay(visitDate, selectedDate);
      });
    }

    setFilteredVisits(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      executive: 'all',
      status: 'all',
      date: ''
    });
  };

  const openImageModal = (imageUrl) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
    }
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const deleteVisit = async (visitId) => {
    if (!window.confirm('Are you sure you want to delete this visit? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/field-executive/admin/visits/${visitId}`);
      setVisits(prev => prev.filter(visit => visit._id !== visitId));
      setFilteredVisits(prev => prev.filter(visit => visit._id !== visitId));
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Failed to delete visit. Please try again.');
    }
  };

  const startEdit = (visit) => {
    setEditingVisit(visit);
    setEditForm({
      client: visit.client || '',
      contactNumber: visit.contactNumber || '',
      businessName: visit.businessName || '',
      location: visit.location || '',
      purpose: visit.purpose || '',
      status: visit.status || 'scheduled',
      notes: visit.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingVisit(null);
    setEditForm({
      client: '',
      contactNumber: '',
      businessName: '',
      location: '',
      purpose: '',
      status: '',
      notes: ''
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const saveEdit = async () => {
    if (!editingVisit) return;

    try {
      const response = await axios.put(`/api/field-executive/admin/visits/${editingVisit._id}`, editForm);

      setVisits(prev => prev.map(visit =>
        visit._id === editingVisit._id ? { ...response.data.visit, photo: visit.photo } : visit
      ));

      setFilteredVisits(prev => prev.map(visit =>
        visit._id === editingVisit._id ? { ...response.data.visit, photo: visit.photo } : visit
      ));

      cancelEdit();
    } catch (error) {
      console.error('Error updating visit:', error);
      alert('Failed to update visit. Please try again.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Executive', 'Client', 'Contact Number', 'Business Name', 'Location', 'Purpose', 'Status', 'Notes', 'Photo'];
    const csvData = filteredVisits.map(visit => [
      visit.date ? format(new Date(visit.date), 'yyyy-MM-dd') : 'N/A',
      visit.executive || 'Unknown',
      visit.client || 'N/A',
      visit.contactNumber || 'N/A',
      visit.businessName || 'N/A',
      visit.location || 'N/A',
      visit.purpose || 'N/A',
      visit.status || 'scheduled',
      visit.notes || '',
      visit.photo ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `field-visits-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusStats = () => {
    const stats = {
      scheduled: 0,
      completed: 0,
      'not-interested': 0,
      'follow-up': 0,
      'sale-close': 0,
      total: filteredVisits.length,
      withPhotos: filteredVisits.filter(visit => visit.photo).length
    };

    filteredVisits.forEach(visit => {
      if (visit.status === 'scheduled') stats.scheduled++;
      if (visit.status === 'completed') stats.completed++;
      if (visit.status === 'not-interested') stats['not-interested']++;
      if (visit.status === 'follow-up') stats['follow-up']++;
      if (visit.status === 'sale-close') stats['sale-close']++;
    });

    return stats;
  };

  const stats = getStatusStats();

  if (loading) {
    return <div className="loading">Loading field visits data...</div>;
  }

  return (
    <div className="field-visits-admin">
      <header className="page-header">
        <h1>Field Visits</h1>
        <div className="header-actions">
          <button onClick={fetchVisits} className="refresh-btn">
            Refresh Data
          </button>
          <button onClick={exportToCSV} className="export-btn">
            Export to CSV
          </button>
        </div>
      </header>

      {/* Tab Selector Navigation */}
      <div style={{ display: 'flex', gap: '12px', margin: '16px 0', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('visits')} 
          style={{ padding: '10px 20px', border: 'none', background: activeTab === 'visits' ? '#1e3c72' : '#f1f5f9', color: activeTab === 'visits' ? 'white' : '#475569', fontWeight: '800', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', boxShadow: activeTab === 'visits' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
        >
          📋 Field Visit Reports
        </button>
        <button 
          onClick={() => {
            setActiveTab('timeline');
            if (executives.length > 0 && !timelineExec) {
              const defaultExec = executives[0];
              setTimelineExec(defaultExec);
              fetchRouteTimeline(defaultExec, timelineDate);
            }
          }} 
          style={{ padding: '10px 20px', border: 'none', background: activeTab === 'timeline' ? '#1e3c72' : '#f1f5f9', color: activeTab === 'timeline' ? 'white' : '#475569', fontWeight: '800', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', boxShadow: activeTab === 'timeline' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
        >
          🗺️ Live Route Timeline (GPS Map)
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={fetchVisits} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {serverError && (
        <div className="server-error-details">
          <h3>Server Error Details:</h3>
          <pre>{JSON.stringify(serverError, null, 2)}</pre>
        </div>
      )}

      {activeTab === 'timeline' ? (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>Select Field Executive</label>
              <select 
                value={timelineExec} 
                onChange={(e) => {
                  setTimelineExec(e.target.value);
                  fetchRouteTimeline(e.target.value, timelineDate);
                }}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #94a3b8', fontWeight: '700', minWidth: '220px', fontSize: '14px', outline: 'none' }}
              >
                <option value="">-- Choose Executive --</option>
                {executives.map((ex, i) => <option key={i} value={ex}>{ex}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '6px' }}>Select Date</label>
              <input 
                type="date" 
                value={timelineDate} 
                onChange={(e) => {
                  setTimelineDate(e.target.value);
                  fetchRouteTimeline(timelineExec, e.target.value);
                }}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #94a3b8', fontWeight: '700', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <button 
              onClick={() => fetchRouteTimeline(timelineExec, timelineDate)}
              style={{ marginTop: '20px', padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '14px', boxShadow: '0 2px 4px rgba(59,130,246,0.3)' }}
            >
              🔄 Refresh Route
            </button>
          </div>

          {timelineLoading && <div style={{ textAlign: 'center', padding: '60px', fontWeight: '700', color: '#64748b', fontSize: '16px' }}>📡 Retrieving GPS waypoints & rendering Google Maps route timeline...</div>}
          
          {timelineError && <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '12px', fontWeight: '700', border: '1px solid #fecaca' }}>⚠️ {timelineError}</div>}

          {timelineLog && !timelineLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px' }}>
              {/* Interactive OpenStreetMap Polyline Route View */}
              <div style={{ borderRadius: '16px', overflow: 'hidden', border: '2px solid #cbd5e1', height: '540px', position: 'relative', backgroundColor: '#e2e8f0' }}>
                {timelineLog.trajectory?.length > 0 ? (
                  <iframe 
                    title="Executive Route Trajectory Map"
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight="0" 
                    marginWidth="0" 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${Math.min(...timelineLog.trajectory.map(t=>t.lng))-0.01}%2C${Math.min(...timelineLog.trajectory.map(t=>t.lat))-0.01}%2C${Math.max(...timelineLog.trajectory.map(t=>t.lng))+0.01}%2C${Math.max(...timelineLog.trajectory.map(t=>t.lat))+0.01}&layer=mapnik&marker=${timelineLog.trajectory[timelineLog.trajectory.length-1].lat}%2C${timelineLog.trajectory[timelineLog.trajectory.length-1].lng}`}
                  />
                ) : <div style={{ padding: '60px', textAlign: 'center', fontWeight: '700' }}>No GPS coordinates found for this date</div>}
                
                <div style={{ position: 'absolute', bottom: '16px', left: '16px', backgroundColor: 'rgba(255,255,255,0.95)', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '800', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#1e293b' }}>
                  🟢 Start Position • 🔵 Travel Path ({timelineLog.trajectory?.length || 0} GPS waypoints) • 🔴 Latest Active Ping
                </div>
              </div>

              {/* Chronological Google Maps Timeline Feed Sidebar */}
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', maxHeight: '540px', overflowY: 'auto', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', margin: 0 }}>📍 Daily Itinerary Feed</h3>
                  <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: timelineLog.status === 'completed' ? '#d1fae5' : '#dbeafe', color: timelineLog.status === 'completed' ? '#065f46' : '#1e40af', padding: '4px 10px', borderRadius: '20px' }}>
                    {timelineLog.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>

                <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '3px solid #3b82f6', marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {timelineLog.trajectory?.map((pt, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {/* Timeline Node Dot Pin */}
                      <div style={{ position: 'absolute', left: '-31px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: pt.type === 'visit' ? '#f59e0b' : (idx === 0 ? '#10b981' : '#3b82f6'), border: '3px solid white', boxShadow: '0 0 0 2px #94a3b8' }} />
                      
                      <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: '#1e293b' }}>
                            {pt.formattedTime || new Date(pt.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: pt.type==='visit' ? '#d97706' : '#475569', backgroundColor: pt.type==='visit' ? '#fef3c7' : '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                            {pt.type === 'visit' ? '📸 Client Visit' : (idx === 0 ? '🟢 Check-In' : '📍 En Route')}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                          {pt.area}
                        </div>
                        {pt.notes && <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '700', backgroundColor: '#fffbeb', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', borderLeft: '3px solid #f59e0b' }}>{pt.notes}</div>}
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: '600' }}>
                          GPS: {pt.lat?.toFixed(4)}, {pt.lng?.toFixed(4)} {pt.speed > 0 ? `• Speed: ${pt.speed} km/h` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="stats-overview">
            <div className="stat-card">
              <h3>Total Visits</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
            <div className="stat-card scheduled">
              <h3>Scheduled</h3>
              <p className="stat-value">{stats.scheduled}</p>
            </div>
            <div className="stat-card completed">
              <h3>Completed</h3>
              <p className="stat-value">{stats.completed}</p>
            </div>
            <div className="stat-card not-interested">
              <h3>Not Interested</h3>
              <p className="stat-value">{stats['not-interested']}</p>
            </div>
            <div className="stat-card follow-up">
              <h3>Follow Up</h3>
              <p className="stat-value">{stats['follow-up']}</p>
            </div>
            <div className="stat-card sale-close">
              <h3>Sale Close</h3>
              <p className="stat-value">{stats['sale-close']}</p>
            </div>
            <div className="stat-card photos">
              <h3>With Photos</h3>
              <p className="stat-value">{stats.withPhotos}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-section">
            <h2>Filters</h2>
            <div className="filter-controls">
              <div className="filter-group">
                <label>Executive:</label>
                <select
                  name="executive"
                  value={filters.executive}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Executives</option>
                  {executives.map((exec, index) => (
                    <option key={exec || index} value={exec}>{exec || 'Unknown'}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="not-interested">Not Interested</option>
                  <option value="follow-up">Follow Up</option>
                  <option value="sale-close">Sale Close</option>
                </select>
              </div>



              <button onClick={resetFilters} className="reset-filters-btn">
                Reset Filters
              </button>
            </div>
          </div>

          {/* Debug Info */}
          <div className="debug-info">
            <small>Showing {filteredVisits.length} of {visits.length} visits</small>
            {filters.date && (
              <small> | Filtered by: {format(new Date(filters.date), 'MMM dd, yyyy')}</small>
            )}
          </div>

          {/* Edit Modal */}
          {editingVisit && (
            <div className="edit-modal-overlay" onClick={cancelEdit}>
              <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="edit-modal-header">
                  <h3>Edit Visit</h3>
                  <button className="modal-close-btn" onClick={cancelEdit}>
                    ✕
                  </button>
                </div>
                <div className="edit-form">
                  <div className="form-group">
                    <label>Client:</label>
                    <input
                      type="text"
                      name="client"
                      value={editForm.client}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number:</label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={editForm.contactNumber}
                      onChange={handleEditChange}
                      maxLength="10"
                      pattern="\d{10}"
                    />
                  </div>
                  <div className="form-group">
                    <label>Business Name:</label>
                    <input
                      type="text"
                      name="businessName"
                      value={editForm.businessName}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Location:</label>
                    <input
                      type="text"
                      name="location"
                      value={editForm.location}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Purpose:</label>
                    <input
                      type="text"
                      name="purpose"
                      value={editForm.purpose}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Status:</label>
                    <select
                      name="status"
                      value={editForm.status}
                      onChange={handleEditChange}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="not-interested">Not Interested</option>
                      <option value="follow-up">Follow Up</option>
                      <option value="sale-close">Sale Close</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes:</label>
                    <textarea
                      name="notes"
                      value={editForm.notes}
                      onChange={handleEditChange}
                      rows="3"
                    />
                  </div>
                </div>
                <div className="edit-modal-footer">
                  <button onClick={cancelEdit} className="cancel-btn">
                    Cancel
                  </button>
                  <button onClick={saveEdit} className="save-btn">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Visits List / Table */}
          <div className="visits-table-section">
            <h2>Field Visits ({filteredVisits.length} records)</h2>
            <div className="table-container">
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px' }}>
                  {filteredVisits.length > 0 ? (
                    filteredVisits.map((visit, index) => (
                      <div key={visit._id || index} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '6px' }}>
                          <span style={{ fontWeight: 'bold', color: '#1e3c72', fontSize: '14px' }}>{visit.client || 'Unnamed Client'}</span>
                          <span className={`status-badge ${visit.status || 'scheduled'}`} style={{ fontSize: '11px' }}>
                            {visit.status || 'scheduled'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#4a5568', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                          <div><strong>Date:</strong> {visit.date ? format(new Date(visit.date), 'MMM dd, yyyy') : 'N/A'}</div>
                          <div><strong>Exec:</strong> {visit.executive || 'Unknown'}</div>
                          <div><strong>Phone:</strong> {visit.contactNumber || 'N/A'}</div>
                          <div><strong>Purpose:</strong> {visit.purpose || 'N/A'}</div>
                          <div style={{ gridColumn: '1 / -1' }}><strong>Location:</strong> {visit.location || 'N/A'}</div>
                          <div style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {visit.notes || '-'}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #edf2f7' }}>
                          <div>
                            {visit.photo ? (
                              <button className="view-photo-btn" onClick={() => openImageModal(visit.photo)} style={{ padding: '6px 10px', fontSize: '12px' }}>
                                📷 View Photo
                              </button>
                            ) : (
                              <span className="no-photo" style={{ fontSize: '12px' }}>No Photo</span>
                            )}
                          </div>
                          <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                            <button className="edit-btn" onClick={() => startEdit(visit)} title="Edit">✏️</button>
                            <button className="delete-btn" onClick={() => deleteVisit(visit._id)} title="Delete">🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>No field visits found</div>
                  )}
                </div>
              ) : (
                <table className="visits-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Executive</th>
                      <th>Client</th>
                      <th>Contact Number</th>
                      <th>Business Name</th>
                      <th>Location</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th>Photo</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.length > 0 ? (
                      filteredVisits.map((visit, index) => (
                        <tr key={visit._id || index}>
                          <td>{visit.date ? format(new Date(visit.date), 'MMM dd, yyyy') : 'N/A'}</td>
                          <td>{visit.executive || 'Unknown'}</td>
                          <td>{visit.client || 'N/A'}</td>
                          <td>{visit.contactNumber || 'N/A'}</td>
                          <td>{visit.businessName || 'N/A'}</td>
                          <td>{visit.location || 'N/A'}</td>
                          <td>{visit.purpose || 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${visit.status || 'scheduled'}`}>
                              {visit.status || 'scheduled'}
                            </span>
                          </td>
                          <td>
                            {visit.photo ? (
                              <button
                                className="view-photo-btn"
                                onClick={() => openImageModal(visit.photo)}
                                title="View Photo"
                              >
                                📷 View
                              </button>
                            ) : (
                              <span className="no-photo">No Photo</span>
                            )}
                          </td>
                          <td className="notes-cell">{visit.notes || '-'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="edit-btn"
                                onClick={() => startEdit(visit)}
                                title="Edit Visit"
                              >
                                ✏️
                              </button>
                              <button
                                className="delete-btn"
                                onClick={() => deleteVisit(visit._id)}
                                title="Delete Visit"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="11" className="no-data">
                          {filters.date || filters.executive !== 'all' || filters.status !== 'all'
                            ? 'No field visits found matching your filters'
                            : 'No field visits found'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>Visit Photo</h3>
              <button className="modal-close-btn" onClick={closeImageModal}>
                ✕
              </button>
            </div>
            <div className="image-container">
              <img
                src={selectedImage}
                alt="Visit"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2E0YWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjM1ZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                }}
              />
            </div>
            <div className="image-modal-footer">
              <button onClick={closeImageModal} className="close-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .field-visits-admin {
          padding: 2rem;
          background-color: #f8fafc;
          min-height: 100vh;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .page-header h1 {
          margin: 0;
          font-weight: 600;
          font-size: 1.8rem;
        }
        
        .header-actions {
          display: flex;
          gap: 1rem;
        }
        
        .refresh-btn, .export-btn {
          padding: 0.75rem 1.5rem;
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .refresh-btn:hover, .export-btn:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .error-message {
          background-color: #fee2e2;
          color: #dc2626;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .retry-btn {
          padding: 0.5rem 1rem;
          background-color: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .server-error-details {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          color: #dc2626;
        }
        
        .server-error-details pre {
          white-space: pre-wrap;
          font-size: 0.8rem;
          background-color: white;
          padding: 0.5rem;
          border-radius: 4px;
          overflow-x: auto;
        }
        
        .debug-info {
          text-align: right;
          margin-bottom: 1rem;
          color: #6b7280;
          font-size: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        
        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background-color: white;
          padding: 1.2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          text-align: center;
        }
        
        .stat-card.scheduled {
          border-top: 4px solid #3b82f6;
        }
        
        .stat-card.completed {
          border-top: 4px solid #10b981;
        }
        
        .stat-card.not-interested {
          border-top: 4px solid #ef4444;
        }
        
        .stat-card.follow-up {
          border-top: 4px solid #f59e0b;
        }
        
        .stat-card.sale-close {
          border-top: 4px solid #8b5cf6;
        }
        
        .stat-card.photos {
          border-top: 4px solid #ec4899;
        }
        
        .stat-card h3 {
          margin: 0 0 0.5rem;
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .stat-value {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
        }
        
        .filters-section {
          background-color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          margin-bottom: 2rem;
        }
        
        .filters-section h2 {
          margin: 0 0 1.5rem;
          color: #1f2937;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .filter-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          align-items: end;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .filter-group label {
          font-weight: 500;
          color: #374151;
          font-size: 0.9rem;
        }
        
        .filter-group select,
        .filter-group input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }
        
        .reset-filters-btn {
          padding: 0.75rem 1rem;
          background-color: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .reset-filters-btn:hover {
          background-color: #dc2626;
        }
        
        .visits-table-section {
          background-color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .visits-table-section h2 {
          margin: 0 0 1.5rem;
          color: #1f2937;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .visits-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .visits-table th {
          background-color: #f9fafb;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .visits-table td {
          padding: 1rem;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .visits-table tr:hover {
          background-color: #f9fafb;
        }
        
        .status-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .status-badge.scheduled {
          background-color: #dbeafe;
          color: #3b82f6;
        }
        
        .status-badge.completed {
          background-color: #dcfce7;
          color: #16a34a;
        }
        
        .status-badge.not-interested {
          background-color: #fee2e2;
          color: #dc2626;
        }
        
        .status-badge.follow-up {
          background-color: #fef3c7;
          color: #d97706;
        }
        
        .status-badge.sale-close {
          background-color: #ede9fe;
          color: #8b5cf6;
        }
        
        .view-photo-btn {
          padding: 0.4rem 0.8rem;
          background-color: #f59e0b;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .view-photo-btn:hover {
          background-color: #d97706;
        }
        
        .no-photo {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.8rem;
        }
        
        .notes-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }
        
        .edit-btn, .delete-btn {
          padding: 0.4rem 0.6rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        
        .edit-btn {
          background-color: #3b82f6;
          color: white;
        }
        
        .edit-btn:hover {
          background-color: #2563eb;
        }
        
        .delete-btn {
          background-color: #ef4444;
          color: white;
        }
        
        .delete-btn:hover {
          background-color: #dc2626;
        }
        
        .no-data {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
          font-style: italic;
        }
        
        .loading {
          text-align: center;
          padding: 3rem;
          font-size: 1.2rem;
          color: #6b7280;
        }
        
        /* Edit Modal Styles */
        .edit-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 2rem;
        }
        
        .edit-modal-content {
          background-color: white;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .edit-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .edit-modal-header h3 {
          margin: 0;
          color: #1f2937;
          font-weight: 600;
        }
        
        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0.5rem;
        }
        
        .modal-close-btn:hover {
          color: #374151;
        }
        
        .edit-form {
          padding: 1.5rem;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        
        .edit-modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        
        .cancel-btn {
          padding: 0.75rem 1.5rem;
          background-color: #6b7280;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .cancel-btn:hover {
          background-color: #4b5563;
        }
        
        .save-btn {
          padding: 0.75rem 1.5rem;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .save-btn:hover {
          background-color: #059669;
        }
        
        /* Image Modal Styles */
        .image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 2rem;
        }
        
        .image-modal-content {
          background-color: white;
          border-radius: 12px;
          max-width: 90vw;
          max-height: 90vh;
          width: auto;
          display: flex;
          flex-direction: column;
        }
        
        .image-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .image-modal-header h3 {
          margin: 0;
          color: #1f2937;
          font-weight: 600;
        }
        
        .image-container {
          padding: 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: auto;
        }
        
        .image-container img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          border-radius: 8px;
        }
        
        .image-modal-footer {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }
        
        .close-btn {
          padding: 0.75rem 1.5rem;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .close-btn:hover {
          background-color: #2563eb;
        }
        
        @media (max-width: 768px) {
          .field-visits-admin {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .filter-controls {
            grid-template-columns: 1fr;
          }
          
          .visits-table {
            font-size: 0.8rem;
          }
          
          .visits-table th,
          .visits-table td {
            padding: 0.5rem;
          }
          
          .edit-modal-overlay,
          .image-modal-overlay {
            padding: 1rem;
          }
          
          .edit-modal-content,
          .image-modal-content {
            max-width: 95vw;
            max-height: 95vh;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 0.3rem;
          }
          
          .stats-overview {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default FieldVisitsAdmin;