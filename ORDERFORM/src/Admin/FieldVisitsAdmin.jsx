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
  const [filters, setFilters] = useState({
    executive: 'all',
    status: 'all',
    date: ''
  });

  // All possible statuses from field executive actions
  // eslint-disable-next-line no-unused-vars
  const allStatuses = [
    'scheduled',
    'completed', 
    'not-interested',
    'follow-up',
    'sale-close'
  ];

  useEffect(() => {
    fetchVisits();
    fetchExecutives();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, visits]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      setError('');
      setServerError(null);
      console.log('Fetching visits from /api/field-executive/admin/visits');
      
      const response = await axios.get('/api/field-executive/admin/visits');
      console.log('Visits data received:', response.data);
      
      setVisits(response.data);
      setFilteredVisits(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching visits:', error);
      
      try {
        console.log('Trying simple endpoint...');
        const simpleResponse = await axios.get('/api/field-executive/admin/simple-visits');
        setVisits(simpleResponse.data);
        setFilteredVisits(simpleResponse.data);
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
      // Handle both relative and absolute URLs
      const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `http://localhost:5000${imageUrl}`;
      setSelectedImage(fullImageUrl);
    }
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Executive', 'Client', 'Contact', 'Business Name', 'Location', 'Purpose', 'Status', 'Notes', 'Photo', 'Follow-up Date', 'Remark', 'Outcome', 'Leads'];
    const csvData = filteredVisits.map(visit => {
      const report = visit.reports && visit.reports[0] ? visit.reports[0] : {};
      return [
        visit.date ? format(new Date(visit.date), 'yyyy-MM-dd') : 'N/A',
        visit.executive || 'Unknown',
        visit.client || 'N/A',
        visit.contactNumber || 'N/A',
        visit.businessName || 'N/A',
        visit.location || 'N/A',
        visit.purpose || 'N/A',
        visit.status || 'scheduled',
        visit.notes || '',
        visit.photo ? 'Yes' : 'No',
        visit.followUpDate ? format(new Date(visit.followUpDate), 'yyyy-MM-dd') : '',
        visit.remark || '',
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
      'not-interested': 0,
      'follow-up': 0,
      'sale-close': 0,
      total: filteredVisits.length,
      withPhotos: filteredVisits.filter(visit => visit.photo).length
    };

    filteredVisits.forEach(visit => {
      const status = visit.status || 'scheduled';
      // eslint-disable-next-line no-prototype-builtins
      if (stats.hasOwnProperty(status)) {
        stats[status]++;
      }
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
        <h1>Field Visits Management</h1>
        <div className="header-actions">
          <button onClick={fetchVisits} className="refresh-btn">
            🔄 Refresh Data
          </button>
          <button onClick={exportToCSV} className="export-btn">
            📊 Export to CSV
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
        <div className="stat-card total">
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
        <div className="stat-card completion-rate">
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
              <option value="not-interested">Not Interested</option>
              <option value="follow-up">Follow Up</option>
              <option value="sale-close">Sale Close</option>
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
            🗑️ Reset Filters
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="debug-info">
        <small>Showing {filteredVisits.length} of {visits.length} visits</small>
        {filters.date && (
          <small> | Filtered by: {format(new Date(filters.date), 'MMM dd, yyyy')}</small>
        )}
        {filters.status !== 'all' && (
          <small> | Status: {filters.status}</small>
        )}
        {filters.executive !== 'all' && (
          <small> | Executive: {filters.executive}</small>
        )}
      </div>

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
                <th>Contact</th>
                <th>Business</th>
                <th>Location</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Photo</th>
                <th>Follow-up Date</th>
                <th>Remark</th>
                <th>Notes</th>
                <th>Outcome</th>
                <th>Leads</th>
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
                      <td>
                        {visit.followUpDate ? format(new Date(visit.followUpDate), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="remark-cell">{visit.remark || '-'}</td>
                      <td className="notes-cell">{visit.notes || '-'}</td>
                      <td>{report.outcome || '-'}</td>
                      <td>{report.leads || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="14" className="no-data">
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
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background-color: white;
          padding: 1.2rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          text-align: center;
          border-top: 4px solid #e5e7eb;
        }
        
        .stat-card.total {
          border-top-color: #6b7280;
        }
        
        .stat-card.scheduled {
          border-top-color: #3b82f6;
        }
        
        .stat-card.completed {
          border-top-color: #10b981;
        }
        
        .stat-card.not-interested {
          border-top-color: #ef4444;
        }
        
        .stat-card.follow-up {
          border-top-color: #f59e0b;
        }
        
        .stat-card.sale-close {
          border-top-color: #8b5cf6;
        }
        
        .stat-card.photos {
          border-top-color: #ec4899;
        }
        
        .stat-card.completion-rate {
          border-top-color: #06b6d4;
        }
        
        .stat-card h3 {
          margin: 0 0 0.5rem;
          color: #6b7280;
          font-size: 0.8rem;
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
          font-size: 0.9rem;
        }
        
        .visits-table th {
          background-color: #f9fafb;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          white-space: nowrap;
        }
        
        .visits-table td {
          padding: 0.8rem;
          border-bottom: 1px solid #f3f4f6;
          white-space: nowrap;
        }
        
        .visits-table tr:hover {
          background-color: #f9fafb;
        }
        
        .status-badge {
          padding: 0.3rem 0.6rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: capitalize;
          display: inline-block;
          min-width: 80px;
          text-align: center;
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
          background-color: #fecaca;
          color: #dc2626;
        }
        
        .status-badge.follow-up {
          background-color: #fef3c7;
          color: #d97706;
        }
        
        .status-badge.sale-close {
          background-color: #ede9fe;
          color: #7c3aed;
        }
        
        .view-photo-btn {
          padding: 0.3rem 0.6rem;
          background-color: #f59e0b;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .view-photo-btn:hover {
          background-color: #d97706;
        }
        
        .no-photo {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.75rem;
        }
        
        .notes-cell, .remark-cell {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          
          .stats-overview {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          }
          
          .stat-card {
            padding: 1rem;
          }
          
          .stat-value {
            font-size: 1.5rem;
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
          
          .image-modal-overlay {
            padding: 1rem;
          }
          
          .image-modal-content {
            max-width: 95vw;
            max-height: 95vh;
          }
        }
      `}</style>
    </div>
  );
};

export default FieldVisitsAdmin;