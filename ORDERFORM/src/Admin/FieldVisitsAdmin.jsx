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

  // Get base URL dynamically - safe for browser environment
  const getBaseUrl = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) {
      return 'http://localhost:5000';
    }
    return '';
  };

  const BASE_URL = getBaseUrl();

  useEffect(() => {
    fetchVisits();
    fetchExecutives();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, visits]);

  // Helper function to format image URLs correctly
  const formatImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    
    if (photoUrl.startsWith('/uploads')) {
      return BASE_URL ? `${BASE_URL}${photoUrl}` : photoUrl;
    }
    
    return BASE_URL ? `${BASE_URL}/uploads/visits/${photoUrl}` : `/uploads/visits/${photoUrl}`;
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

  // Delete visit function
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

  // Edit visit functions
  const startEdit = (visit) => {
    setEditingVisit(visit);
    setEditForm({
      client: visit.client || '',
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
      
      // Update the visits state with the updated visit
      setVisits(prev => prev.map(visit => 
        visit._id === editingVisit._id ? response.data.visit : visit
      ));
      
      setFilteredVisits(prev => prev.map(visit => 
        visit._id === editingVisit._id ? response.data.visit : visit
      ));
      
      cancelEdit();
    } catch (error) {
      console.error('Error updating visit:', error);
      alert('Failed to update visit. Please try again.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Executive', 'Client', 'Location', 'Purpose', 'Status', 'Notes', 'Photo', 'Outcome', 'Leads'];
    const csvData = filteredVisits.map(visit => {
      const report = visit.reports && visit.reports[0] ? visit.reports[0] : {};
      return [
        visit.date ? format(new Date(visit.date), 'yyyy-MM-dd') : 'N/A',
        visit.executive || 'Unknown',
        visit.client || 'N/A',
        visit.location || 'N/A',
        visit.purpose || 'N/A',
        visit.status || 'scheduled',
        visit.notes || '',
        visit.photo ? 'Yes' : 'No',
        report.outcome || '',
        report.leads || ''
      ];
    });

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
      total: filteredVisits.length,
      withPhotos: filteredVisits.filter(visit => visit.photo).length
    };

    filteredVisits.forEach(visit => {
      if (visit.status === 'scheduled') stats.scheduled++;
      if (visit.status === 'completed') stats.completed++;
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
        <div className="stat-card photos">
          <h3>With Photos</h3>
          <p className="stat-value">{stats.withPhotos}</p>
        </div>
        <div className="stat-card">
          <h3>Completion Rate</h3>
          <p className="stat-value">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </p>
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
            </select>
          </div>

          <div className="filter-group">
            <label>Date:</label>
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
            />
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

      {/* Visits Table */}
      <div className="visits-table-section">
        <h2>Field Visits ({filteredVisits.length} records)</h2>
        <div className="table-container">
          <table className="visits-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Executive</th>
                <th>Client</th>
                <th>Location</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Photo</th>
                <th>Notes</th>
                <th>Outcome</th>
                <th>Leads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.length > 0 ? (
                filteredVisits.map((visit, index) => {
                  const report = visit.reports && visit.reports[0] ? visit.reports[0] : {};
                  return (
                    <tr key={visit._id || index}>
                      <td>{visit.date ? format(new Date(visit.date), 'MMM dd, yyyy') : 'N/A'}</td>
                      <td>{visit.executive || 'Unknown'}</td>
                      <td>{visit.client || 'N/A'}</td>
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
                      <td>{report.outcome || '-'}</td>
                      <td>{report.leads || '-'}</td>
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
                  );
                })
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
        </div>
      </div>

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
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
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
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background-color: white;
          padding: 1.5rem;
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
        
        .stat-card.photos {
          border-top: 4px solid #f59e0b;
        }
        
        .stat-card h3 {
          margin: 0 0 0.5rem;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .stat-value {
          margin: 0;
          font-size: 2.5rem;
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
        }
      `}</style>
    </div>
  );
};

export default FieldVisitsAdmin;