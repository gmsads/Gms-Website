import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { confirmAlert } from 'react-confirm-alert';
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

  // Get user role from localStorage
  const role = localStorage.getItem('role');
  const isAdmin = role === 'Admin';

  // Fetch prospective clients data
  useEffect(() => {
    const fetchProspectives = async () => {
      try {
        const userName = localStorage.getItem('userName');
        const role = localStorage.getItem('role');

        // API call to get prospective clients
        const response = await axios.get('/api/prospective-clients', {
          params: { userName, role }
        });

        // Sort by creation date (newest first)
        const sortedData = response.data.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dateCreated || a.followUpDate);
          const dateB = new Date(b.createdAt || b.dateCreated || b.followUpDate);
          return dateB - dateA; // Descending order (newest first)
        });

        // Update state with sorted data
        setProspectives(sortedData);
        setFilteredProspectives(sortedData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching prospectives:', err);
        setError('Failed to load prospective clients');
        setLoading(false);
      }
    };

    fetchProspectives();
  }, []);

  // Filter prospectives based on search term
  useEffect(() => {
    if (searchTerm === '') {
      // Maintain the original sorted order when no search term
      setFilteredProspectives([...prospectives]);
    } else {
      const filtered = prospectives.filter((p) => {
        const searchLower = searchTerm.toLowerCase();
        const formattedDate = p.followUpDate 
          ? format(new Date(p.followUpDate), 'MMM dd, yyyy').toLowerCase() 
          : '';
        
        // Search across multiple fields
        return (
          (p.executiveName?.toLowerCase().includes(searchLower)) ||
          (p.businessName?.toLowerCase().includes(searchLower)) ||
          (p.contactPerson?.toLowerCase().includes(searchLower)) ||
          (p.phoneNumber?.includes(searchTerm)) ||
          (p.location?.toLowerCase().includes(searchLower)) ||
          (p.leadFrom?.toLowerCase().includes(searchLower)) ||
          (p.requirementDescription?.toLowerCase().includes(searchLower)) ||
          (p.prospectType?.toLowerCase().includes(searchLower)) ||
          (p.whatsappStatus?.toLowerCase().includes(searchLower)) ||
          (p.status?.toLowerCase().includes(searchLower)) ||
          formattedDate.includes(searchLower)
        );
      });
      
      // Apply the same sorting to filtered results
      const sortedFiltered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated || a.followUpDate);
        const dateB = new Date(b.createdAt || b.dateCreated || b.followUpDate);
        return dateB - dateA;
      });
      
      setFilteredProspectives(sortedFiltered);
    }
  }, [searchTerm, prospectives]);

  // Handle status change with special case for followup
  const handleStatusChange = (id, status) => {
    if (status === 'followup') {
      setCurrentClientId(id);
      setSelectedDate(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
      setShowDatePicker(true);
    } else {
      updateStatus(id, status);
    }
  };

  // Update status in backend
  const updateStatus = async (id, status, date = null) => {
    try {
      await axios.patch(`/api/prospective-clients/${id}`, {
        status,
        ...(date && { followUpDate: date })
      });
      
      // Refresh data after update
      const response = await axios.get('/api/prospective-clients', {
        params: { 
          userName: localStorage.getItem('userName'),
          role: localStorage.getItem('role')
        }
      });
      
      // Re-sort the updated data
      const sortedData = response.data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated || a.followUpDate);
        const dateB = new Date(b.createdAt || b.dateCreated || b.followUpDate);
        return dateB - dateA;
      });
      
      setProspectives(sortedData);
      setFilteredProspectives(sortedData);
      setShowDatePicker(false);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  // Handle delete confirmation and action
  const handleDelete = async (id) => {
    confirmAlert({
      title: 'Confirm to delete',
      message: 'Are you sure you want to delete this prospective client?',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              await axios.delete(`/api/prospective-clients/${id}`);
              const updatedProspectives = prospectives.filter(p => p._id !== id);
              
              // Maintain sorting after deletion
              const sortedData = updatedProspectives.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.dateCreated || a.followUpDate);
                const dateB = new Date(b.createdAt || b.dateCreated || b.followUpDate);
                return dateB - dateA;
              });
              
              setProspectives(sortedData);
              setFilteredProspectives(sortedData);
            } catch (err) {
              console.error('Error deleting prospective client:', err);
              setError('Failed to delete prospective client');
            }
          }
        },
        {
          label: 'No',
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

  // Style for different status badges
  const getStatusStyle = (status) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'inline-block'
    };

    switch(status) {
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

  // Main render
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Prospective Clients</h2>
      
      {/* Search input */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name, business, phone, location, lead source, etc..."
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

      {/* Main table */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeadRow}>
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
              {isAdmin && <th style={styles.th}>Delete</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProspectives.length > 0 ? (
              filteredProspectives.map((p) => (
                <tr key={p._id} style={styles.tableRow}>
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
                    >
                      <option value="">Update Status</option>
                      <option value="sale closed">Sale Closed</option>
                      <option value="not interested">Not Interested</option>
                      <option value="next month">Next Month</option>
                      <option value="followup">Follow Up</option>
                    </select>
                  </td>
                  {isAdmin && (
                    <td style={styles.td}>
                      <button
                        onClick={() => handleDelete(p._id)}
                        style={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 11 : 10} style={{ padding: '20px', textAlign: 'center' }}>
                  {searchTerm ? 'No matching results found' : 'No prospective clients available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Styles object
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    margin: '20px',
    position: 'relative'
  },
  heading: {
    color: '#2c3e50',
    marginBottom: '25px',
    borderBottom: '2px solid #3498db',
    paddingBottom: '10px',
    fontSize: '24px'
  },
  searchContainer: {
    marginBottom: '25px',
    position: 'relative'
  },
  searchInput: {
    width: '100%',
    padding: '12px 20px',
    borderRadius: '25px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.3s',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
    ':focus': {
      borderColor: '#3498db',
      boxShadow: '0 0 5px rgba(52,152,219,0.5)'
    }
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
    fontSize: '15px'
  },
  tableHeadRow: {
    backgroundColor: '#3498db',
    color: 'white'
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    fontWeight: '600'
  },
  td: {
    padding: '12px 15px',
    borderBottom: '1px solid #eee'
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
    ':focus': {
      outline: 'none',
      borderColor: '#3498db'
    }
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500',
    ':hover': {
      backgroundColor: '#c0392b'
    }
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
    cursor: 'pointer',
    fontWeight: '500'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '500'
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
  }
};

export default ViewProspective;