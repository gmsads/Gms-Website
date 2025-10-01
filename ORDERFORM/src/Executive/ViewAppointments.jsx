import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '80vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '2rem',
    color: '#003366',
    margin: 0,
  },
  filterContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  filterLabel: {
    fontWeight: 'bold',
  },
  filterSelect: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  tableContainer: {
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '900px',
  },
  th: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '12px',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #ddd',
  },
  trHover: {
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  statusPending: {
    color: '#FFA500',
    fontWeight: 'bold',
  },
  statusAssigned: {
    color: '#008000',
    fontWeight: 'bold',
  },
  statusContacted: {
    color: '#0066CC',
    fontWeight: 'bold',
  },
  statusInProgress: {
    color: '#6633CC',
    fontWeight: 'bold',
  },
  statusCompleted: {
    color: '#003366',
    fontWeight: 'bold',
  },
  statusCancelled: {
    color: '#CC0000',
    fontWeight: 'bold',
  },
  statusPostponed: {
    color: '#663300',
    fontWeight: 'bold',
  },
  statusSaleClosed: {
    color: '#008080',
    fontWeight: 'bold',
  },
  executiveBadge: {
    backgroundColor: '#e6f3ff',
    color: '#003366',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '0.85rem',
    display: 'inline-block',
  },
  button: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: '4px',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  statusSelect: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    width: '100%',
    fontSize: '0.9rem',
  },
  updateButton: {
    padding: '6px 12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '8px',
    width: '100%',
    fontSize: '0.85rem',
  },
  updating: {
    opacity: 0.7,
    pointerEvents: 'none',
  },
  successMessage: {
    color: '#4CAF50',
    fontSize: '0.8rem',
    marginTop: '4px',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#CC0000',
    fontSize: '0.8rem',
    marginTop: '4px',
    textAlign: 'center',
  },
};

const ViewAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState({});
  const [updating, setUpdating] = useState({});
  const [updateSuccess, setUpdateSuccess] = useState({});
  const [updateError, setUpdateError] = useState({});
  const currentUser = localStorage.getItem('userName');

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'in progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'postponded', label: 'Postponed' },
    { value: 'sale closed', label: 'Sale Closed' }
  ];

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/appointments');
      const filteredData = response.data
        .filter(appt => appt.executiveName === currentUser)
        .filter(appt => filter === 'all' || appt.status === filter)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setAppointments(filteredData);
      
      // Initialize selectedStatus with current statuses
      const initialStatuses = {};
      filteredData.forEach(appt => {
        initialStatuses[appt._id] = appt.status;
      });
      setSelectedStatus(initialStatuses);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch appointments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filter, currentUser]);

  const handleStatusChange = (id, newStatus) => {
    setSelectedStatus(prev => ({ ...prev, [id]: newStatus }));
    // Clear any previous error for this appointment
    setUpdateError(prev => ({ ...prev, [id]: null }));
  };

  const updateStatus = async (id) => {
    setUpdating(prev => ({ ...prev, [id]: true }));
    setUpdateSuccess(prev => ({ ...prev, [id]: false }));
    setUpdateError(prev => ({ ...prev, [id]: null }));
    
    try {
      // Get the executive name from localStorage
      const executiveName = localStorage.getItem('userName');
      
      // Make the API request with the correct data structure
      await axios.put(`/api/appointments/${id}/status`, {
        status: selectedStatus[id],
        executiveName: executiveName // Some APIs might require this field
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Update local state
      setAppointments(prevAppointments => 
        prevAppointments.map(appt => 
          appt._id === id ? { ...appt, status: selectedStatus[id] } : appt
        )
      );
      
      setUpdateSuccess(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setUpdateSuccess(prev => ({ ...prev, [id]: false })), 2000);
    } catch (err) {
      console.error('Error updating status:', err);
      
      let errorMessage = 'Failed to update status';
      if (err.response) {
        // Server responded with an error status
        if (err.response.status === 400) {
          errorMessage = 'Invalid request. Please check the status value.';
        } else if (err.response.status === 404) {
          errorMessage = 'Appointment not found.';
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setUpdateError(prev => ({ ...prev, [id]: errorMessage }));
    } finally {
      setUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'pending': return styles.statusPending;
      case 'assigned': return styles.statusAssigned;
      case 'contacted': return styles.statusContacted;
      case 'in progress': return styles.statusInProgress;
      case 'completed': return styles.statusCompleted;
      case 'cancelled': return styles.statusCancelled;
      case 'postponded': return styles.statusPostponed;
      case 'sale closed': return styles.statusSaleClosed;
      default: return {};
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Your Appointments</h1>
        <div style={styles.filterContainer}>
          <label style={styles.filterLabel}>Filter:</label>
          <select
            style={styles.filterSelect}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button style={styles.refreshButton} onClick={fetchAppointments}>
            Refresh
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Venue</th>
              <th style={styles.th}>Executive</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Update Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.length > 0 ? (
              appointments.map(appt => (
                <tr key={appt._id} style={styles.trHover}>
                  <td style={styles.td}>{appt.businessName}</td>
                  <td style={styles.td}>{appt.contactName}</td>
                  <td style={styles.td}>{appt.phoneNumber}</td>
                  <td style={styles.td}>{formatDate(appt.date)}</td>
                  <td style={styles.td}>{appt.time}</td>
                  <td style={styles.td}>{appt.venue}</td>
                  <td style={styles.td}>
                    <span style={styles.executiveBadge}>
                      {appt.executiveName}
                    </span>
                  </td>
                  <td style={{
                    ...styles.td,
                    ...getStatusStyle(appt.status),
                  }}>
                    {appt.status}
                  </td>
                  <td style={styles.td}>
                    <div style={updating[appt._id] ? styles.updating : {}}>
                      <select
                        style={styles.statusSelect}
                        value={selectedStatus[appt._id] || appt.status}
                        onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                        disabled={updating[appt._id]}
                      >
                        {statusOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        style={styles.updateButton}
                        onClick={() => updateStatus(appt._id)}
                        disabled={updating[appt._id] || (selectedStatus[appt._id] === appt.status)}
                      >
                        {updating[appt._id] ? 'Updating...' : 'Update'}
                      </button>
                      {updateSuccess[appt._id] && (
                        <div style={styles.successMessage}>Status updated!</div>
                      )}
                      {updateError[appt._id] && (
                        <div style={styles.errorMessage}>{updateError[appt._id]}</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ ...styles.td, textAlign: 'center' }}>
                  No appointments found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewAppointments;