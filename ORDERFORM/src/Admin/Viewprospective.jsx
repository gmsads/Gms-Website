/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { confirmAlert } from 'react-confirm-alert';
import { useNavigate, useLocation } from 'react-router-dom';
import 'react-confirm-alert/src/react-confirm-alert.css';

const ViewProspective = () => {
  // State declarations
  const [prospectives, setProspectives] = useState([]);
  const [filteredProspectives, setFilteredProspectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [currentClientId, setCurrentClientId] = useState(null);
  const [sending, setSending] = useState({});
  const [success, setSuccess] = useState({});
  const [redirectId, setRedirectId] = useState(null);
  
  // Simple filter states
  const [filters, setFilters] = useState({
    year: '',
    month: '',
    leadSource: ''
  });

  // Get user info from localStorage
  const role = localStorage.getItem('role');
  const userName = localStorage.getItem('userName');
  const isAdmin = role === 'Admin';
  
  // Define executive names who should see ALL prospects (like Admin)
  const privilegedExecutives = ['Soujanya', 'Aleem', 'Sirisha', 'Sangeetha', 'Malleshwari', 'Malli'];
  const isPrivilegedExecutive = privilegedExecutives.includes(userName);
  
  // Users who can see all prospects: Admin + privileged executives
  const canSeeAllProspects = isAdmin || isPrivilegedExecutive;
  
  const navigate = useNavigate();
  const location = useLocation();

  // API configuration
  const API_BASE_URL = '/api';
  const API_ENDPOINTS = {
    PROSPECTIVES: `${API_BASE_URL}/prospective-clients`,
    DELETE_PROSPECTIVE: (id) => `${API_BASE_URL}/prospective-clients/${id}`,
    TRASH_PROSPECTIVES: `${API_BASE_URL}/prospective-clients/trash`,
    RESTORE_PROSPECTIVE: (id) => `${API_BASE_URL}/prospective-clients/${id}/restore`,
    PERMANENT_DELETE_PROSPECTIVE: (id) => `${API_BASE_URL}/prospective-clients/${id}/permanent`
  };

  // Extract filter parameters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    const month = searchParams.get('month');
    const year = searchParams.get('year');

    setFilters({
      year: year || '',
      month: month || '',
      leadSource: ''
    });
  }, [location]);

  // Fetch prospective clients data - UPDATED VERSION with privileged route
  const fetchProspectives = async () => {
    try {
      const userName = localStorage.getItem('userName');
      const role = localStorage.getItem('role');

      // Determine which API endpoint to use based on user privileges
      let apiEndpoint;
      let params = {};

      if (role === 'Admin' || privilegedExecutives.includes(userName)) {
        // Use the privileged route for Admin and privileged executives
        apiEndpoint = `${API_BASE_URL}/prospective-clients/privileged/all`;
        params = { userName };
      } else {
        // Use the regular route for normal executives
        apiEndpoint = API_ENDPOINTS.PROSPECTIVES;
        params = { userName, role };
      }

      const response = await axios.get(apiEndpoint, { params });

      // Sort by creation date (newest first)
      const sortedData = response.data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated || a.followUpDate);
        const dateB = new Date(b.createdAt || b.dateCreated || b.followUpDate);
        return dateB - dateA;
      });

      setProspectives(sortedData);
      setFilteredProspectives(sortedData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching prospectives:', err);
      
      // Handle access denied errors gracefully
      if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to view all prospects.');
      } else {
        setError('Failed to load prospective clients');
      }
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchProspectives();
  }, []);

  // Apply filters whenever filters or search term changes
  useEffect(() => {
    applyFilters();
  }, [prospectives, filters, searchTerm]);

  // Apply filters based on year, month, lead source and search term
  const applyFilters = () => {
    let filtered = [...prospectives];

    // Year Filter (based on created date)
    if (filters.year) {
      filtered = filtered.filter(p => {
        const createdDate = new Date(p.createdAt || p.dateCreated);
        return createdDate.getFullYear() === parseInt(filters.year);
      });
    }

    // Month Filter (based on created date)
    if (filters.month) {
      filtered = filtered.filter(p => {
        const createdDate = new Date(p.createdAt || p.dateCreated);
        return (createdDate.getMonth() + 1) === parseInt(filters.month);
      });
    }

    // Lead Source Filter
    if (filters.leadSource) {
      filtered = filtered.filter(p => 
        p.leadFrom?.toLowerCase().includes(filters.leadSource.toLowerCase())
      );
    }

    // Search Term Filter
    if (searchTerm) {
      filtered = filtered.filter((p) => {
        const searchLower = searchTerm.toLowerCase();
        const createdDate = p.createdAt
          ? format(new Date(p.createdAt), 'MMM dd, yyyy').toLowerCase()
          : '';
        const followUpDate = p.followUpDate
          ? format(new Date(p.followUpDate), 'MMM dd, yyyy').toLowerCase()
          : '';

        return (
          (p.executiveName?.toLowerCase().includes(searchLower)) ||
          (p.ExcutiveName?.toLowerCase().includes(searchLower)) ||
          (p.businessName?.toLowerCase().includes(searchLower)) ||
          (p.contactPerson?.toLowerCase().includes(searchLower)) ||
          (p.phoneNumber?.includes(searchTerm)) ||
          (p.location?.toLowerCase().includes(searchLower)) ||
          (p.leadFrom?.toLowerCase().includes(searchLower)) ||
          (p.requirementDescription?.toLowerCase().includes(searchLower)) ||
          (p.prospectType?.toLowerCase().includes(searchLower)) ||
          (p.whatsappStatus?.toLowerCase().includes(searchLower)) ||
          (p.status?.toLowerCase().includes(searchLower)) ||
          createdDate.includes(searchLower) ||
          followUpDate.includes(searchLower)
        );
      });
    }

    setFilteredProspectives(filtered);
  };

  // Handle redirect after sale closed
  useEffect(() => {
    if (redirectId) {
      const timer = setTimeout(() => {
        const prospectiveData = prospectives.find(p => p._id === redirectId);
        if (prospectiveData) {
          localStorage.setItem('saleClosedProspectiveData', JSON.stringify(prospectiveData));
          navigate('/order', {
            state: {
              activeTab: 'order',
              prospectiveData: prospectiveData
            }
          });
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [redirectId, navigate, prospectives]);

  // Handle status change with special case for followup and sale closed
  const handleStatusChange = (id, status) => {
    if (status === 'followup') {
      setCurrentClientId(id);
      setSelectedDate(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
      setShowDatePicker(true);
    } else if (status === 'sale closed') {
      handleSaleClosed(id);
    } else {
      updateStatus(id, status);
    }
  };

  // Handle sale closed status - redirect to order form
  const handleSaleClosed = async (id) => {
    try {
      setSending(prev => ({ ...prev, [id]: true }));
      setError(null);

      const executiveName = localStorage.getItem('userName');
      const response = await axios.patch(`/api/prospective-clients/${id}`, {
        status: 'sale closed',
        executiveName
      });

      if (response.status === 200) {
        setSuccess(prev => ({ ...prev, [id]: true }));

        // Update local state
        const updatedProspectives = prospectives.map(p =>
          p._id === id ? { ...p, status: 'sale closed' } : p
        );

        setProspectives(updatedProspectives);
        setFilteredProspectives(updatedProspectives);

        setRedirectId(id);
      }
    } catch (err) {
      console.error('Error updating to sale closed:', err);
      setError('Failed to update status to sale closed');
      setSending(prev => ({ ...prev, [id]: false }));
    }
  };

  // Update status in backend for other statuses
  const updateStatus = async (id, status, date = null) => {
    try {
      setSending(prev => ({ ...prev, [id]: true }));
      setError(null);

      await axios.patch(`/api/prospective-clients/${id}`, {
        status,
        ...(date && { followUpDate: date })
      });

      // Refresh the data
      await fetchProspectives();

      setShowDatePicker(false);
      setSuccess(prev => ({ ...prev, [id]: true }));

      setTimeout(() => setSuccess(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    } finally {
      setSending(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDelete = async (id) => {
    confirmAlert({
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this prospect.',
      buttons: [
        {
          label: 'Delete',
          onClick: async () => {
            try {
              setSending(prev => ({ ...prev, [id]: true }));
              
              console.log('Starting delete process for ID:', id);
              
              const response = await axios.delete(API_ENDPOINTS.DELETE_PROSPECTIVE(id), {
                data: {
                  deletedBy: role === 'Admin' ? 'Admin' : localStorage.getItem('userName'),
                  reason: 'Deleted from prospective clients page'
                }
              });
  
              console.log('Delete response:', response.data);
  
              if (response.status === 200) {
                console.log('Successfully deleted from backend, updating UI...');
                
                const updatedProspectives = prospectives.filter(p => p._id !== id);
                
                const sortedData = updatedProspectives.sort((a, b) => {
                  const dateA = new Date(a.createdAt || a.dateCreated || a.followUpDate);
                  const dateB = new Date(b.createdAt || b.dateCreated || b.followUpDate);
                  return dateB - dateA;
                });
                
                setProspectives(sortedData);
                setFilteredProspectives(sortedData);
                
                setSuccess(prev => ({ ...prev, [id]: 'deleted' }));
                
                setTimeout(() => setSuccess(prev => {
                  const newSuccess = { ...prev };
                  delete newSuccess[id];
                  return newSuccess;
                }), 3000);
              }
            } catch (err) {
              console.error('Error deleting prospective client:', err);
              setError('Failed to delete prospective client: ' + (err.response?.data?.error || err.message));
              fetchProspectives();
            } finally {
              setSending(prev => {
                const newSending = { ...prev };
                delete newSending[id];
                return newSending;
              });
            }
          }
        },
        {
          label: 'Cancel',
          onClick: () => {}
        }
      ]
    });
  };

  // Confirm follow-up date selection
  const handleDateConfirm = () => {
    if (selectedDate) {
      updateStatus(currentClientId, 'followup', selectedDate);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      year: '',
      month: '',
      leadSource: ''
    });
    setSearchTerm('');
  };

  // Get years from 2010 to 2050
  const getAvailableYears = () => {
    const years = [];
    for (let year = 2050; year >= 2010; year--) {
      years.push(year);
    }
    return years;
  };

  // Get unique lead sources
  const getUniqueLeadSources = () => {
    return [...new Set(prospectives.map(p => p.leadFrom).filter(Boolean))];
  };

  // Style for different status badges
  const getStatusStyle = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'inline-block'
    };

    switch (status) {
      case 'sale closed':
        return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
      case 'not interested':
        return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
      case 'next month':
        return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
      case 'followup':
        return { ...baseStyle, backgroundColor: '#cce5ff', color: '#004085' };
      default:
        return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
    }
  };

  // Loading and error states
  if (loading) return <div style={styles.loading}>Loading prospective clients...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>
          Prospective Clients 
          {canSeeAllProspects && ` - All Prospects`}
          {!canSeeAllProspects && ` - ${userName}'s Prospects`}
        </h2>

        {/* User privilege indicator */}
        {isPrivilegedExecutive && (
          <div style={styles.privilegeBanner}>
            <strong>Privileged Access:</strong> Viewing all prospects
          </div>
        )}

        {/* Show active filters */}
        {(filters.year || filters.month || filters.leadSource) && (
          <div style={styles.filterInfo}>
            <span style={styles.filterText}>
              Active Filters: 
              {filters.year && ` Year: ${filters.year}`}
              {filters.month && ` Month: ${filters.month}`}
              {filters.leadSource && ` Lead Source: ${filters.leadSource}`}
            </span>
            <button onClick={clearFilters} style={styles.clearFilterButton}>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Simple Filter Controls */}
      <div style={styles.filterContainer}>
        <div style={styles.filterRow}>
          {/* Year Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Year:</label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Years</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Month:</label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          {/* Lead Source Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Lead Source:</label>
            <select
              value={filters.leadSource}
              onChange={(e) => handleFilterChange('leadSource', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Sources</option>
              {getUniqueLeadSources().map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search input */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name, business, phone, location, lead source, dates, etc..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Follow-up date picker modal */}
      {showDatePicker && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalHeading}>Set Next Follow-up Date</h3>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              style={styles.dateInput}
            />
            <div style={styles.modalActions}>
              <button
                onClick={handleDateConfirm}
                style={styles.confirmButton}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Results count */}
      <div style={styles.resultsCount}>
        Showing {filteredProspectives.length} of {prospectives.length} prospects
        {canSeeAllProspects ? ' (All Prospects)' : ` (Assigned to ${userName})`}
      </div>

      {/* Main table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeadRow}>
              <th style={styles.th}>Created Date</th>
              <th style={styles.th}>Executive</th>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Lead From</th>
              <th style={styles.th}>Requirement</th>
              <th style={styles.th}>Follow-up Date</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
              {canSeeAllProspects && <th style={styles.th}>Delete</th>}
            </tr>
          </thead>
         <tbody>
  {filteredProspectives.length > 0 ? (
    filteredProspectives.map((p) => (
      <tr key={p._id} style={styles.tableRow}>
        <td style={styles.td}>
          {p.createdAt ? format(new Date(p.createdAt), 'MMM dd, yyyy') : 'N/A'}
        </td>
        <td style={styles.td}>{p.ExcutiveName || p.executiveName}</td>
        <td style={styles.td}>{p.businessName}</td>
        <td style={styles.td}>{p.contactPerson}</td>
        <td style={styles.td}>{p.phoneNumber}</td>
        <td style={styles.td}>{p.location}</td>
        <td style={styles.td}>{p.leadFrom || 'N/A'}</td>
        <td style={styles.td}>{p.requirementDescription || 'N/A'}</td>
        <td style={styles.td}>
          {p.followUpDate ? format(new Date(p.followUpDate), 'MMM dd, yyyy') : 'N/A'}
        </td>
        <td style={styles.td}>
          <span style={getStatusStyle(p.status)}>
            {p.status || 'New'}
          </span>
        </td>
        <td style={styles.td}>
          <select
            value=""
            onChange={(e) => handleStatusChange(p._id, e.target.value)}
            style={styles.select}
            disabled={sending[p._id]}
          >
            <option value="">Update Status</option>
            <option value="sale closed">Sale Closed</option>
            <option value="not interested">Not Interested</option>
            <option value="next month">Next Month</option>
            <option value="followup">Follow Up</option>
          </select>
          {sending[p._id] && (
            <div style={{ fontSize: '12px', color: '#2e7d32', marginTop: '5px' }}>
              Updating...
            </div>
          )}
          {success[p._id] && p.status === 'sale closed' && (
            <div style={{ fontSize: '12px', color: '#2e7d32', marginTop: '5px' }}>
              ✓ Sale closed! Redirecting to order form...
            </div>
          )}
          {success[p._id] && p.status !== 'sale closed' && success[p._id] !== 'moved_to_trash' && (
            <div style={{ fontSize: '12px', color: '#2e7d32', marginTop: '5px' }}>
              ✓ Status updated successfully!
            </div>
          )}
        </td>
        {canSeeAllProspects && (
          <td style={styles.td}>
            <button
              onClick={() => handleDelete(p._id)}
              style={styles.deleteButton}
              disabled={sending[p._id]}
            >
              {sending[p._id] ? 'Deleting...' : 'Delete'}
            </button>
          </td>
        )}
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={canSeeAllProspects ? 12 : 11} style={{ padding: '20px', textAlign: 'center' }}>
        {searchTerm || filters.year || filters.month || filters.leadSource 
          ? 'No matching results found with current filters' 
          : !canSeeAllProspects 
            ? `No prospective clients assigned to ${userName}`
            : 'No prospective clients available'
        }
      </td>
    </tr>
  )}
</tbody>
        </table>
      </div>
    </div>
  );
};

// Styles object (keep the same as before)
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    margin: '20px'
  },
  header: {
    marginBottom: '20px'
  },
  heading: {
    color: '#2c3e50',
    marginBottom: '15px',
    borderBottom: '2px solid #3498db',
    paddingBottom: '10px',
    fontSize: '24px'
  },
  privilegeBanner: {
    backgroundColor: '#d4edda',
    padding: '10px 15px',
    borderRadius: '6px',
    marginBottom: '15px',
    border: '1px solid #c3e6cb',
    color: '#155724',
    fontSize: '14px',
    fontWeight: '500'
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #e0e0e0'
  },
  filterRow: {
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    minWidth: '150px'
  },
  filterLabel: {
    fontWeight: '500',
    color: '#2c3e50',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  filterInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    padding: '12px 15px',
    borderRadius: '6px',
    marginBottom: '15px'
  },
  filterText: {
    color: '#2c3e50',
    fontWeight: '500',
    fontSize: '14px'
  },
  clearFilterButton: {
    padding: '6px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  searchContainer: {
    marginBottom: '20px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 20px',
    borderRadius: '25px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none'
  },
  resultsCount: {
    marginBottom: '15px',
    color: '#666',
    fontSize: '14px',
    fontWeight: '500'
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    backgroundColor: 'white'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeadRow: {
    backgroundColor: '#3498db',
    color: 'white'
  },
  th: {
    padding: '12px 8px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '13px'
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    fontSize: '13px'
  },
  tableRow: {
    ':hover': {
      backgroundColor: '#f5f5f5'
    }
  },
  select: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '13px'
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '13px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    width: '400px',
    maxWidth: '90%'
  },
  modalHeading: {
    marginTop: 0,
    color: '#2c3e50',
    marginBottom: '20px'
  },
  dateInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px',
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#e74c3c'
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px 15px',
    borderRadius: '4px',
    marginBottom: '15px',
    border: '1px solid #f5c6cb'
  }
};

export default ViewProspective;