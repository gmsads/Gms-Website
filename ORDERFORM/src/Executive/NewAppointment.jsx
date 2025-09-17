import React, { useEffect, useState } from 'react';
import axios from 'axios';

const styles = {
  container: {
    padding: '25px',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #f9fbe7 100%)',
    minHeight: '100vh',
    fontFamily: "'Poppins', sans-serif",
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#2e7d32',
    marginBottom: '10px',
    letterSpacing: '0.5px',
    background: 'linear-gradient(90deg, #2e7d32, #558b2f)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#616161',
    fontWeight: '400',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '25px',
    padding: '10px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
    },
  },
  cardContent: {
    padding: '20px',
  },
  executiveBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    backgroundColor: '#e0f2fe',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#0369a1',
  },
  infoItem: {
    marginBottom: '12px',
  },
  infoLabel: {
    fontSize: '0.85rem',
    color: '#757575',
    fontWeight: '500',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#212121',
    fontWeight: '600',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '15px',
  },
  actionSection: {
    borderTop: '1px solid #f5f5f5',
    padding: '20px',
    background: '#fafafa',
  },
  statusDropdown: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#f5f5f5',
    fontSize: '0.95rem',
    color: '#424242',
    marginBottom: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#2e7d32',
      boxShadow: '0 0 0 2px rgba(46, 125, 50, 0.2)',
    },
  },
  updateButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2e7d32',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#1b5e20',
    },
    '&:disabled': {
      backgroundColor: '#a5d6a7',
      cursor: 'not-allowed',
    },
  },
  successMessage: {
    marginTop: '12px',
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: '0.9rem',
    textAlign: 'center',
    animation: 'fadeIn 0.3s',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    gridColumn: '1/-1',
  },
  emptyIcon: {
    fontSize: '3rem',
    color: '#9e9e9e',
    marginBottom: '20px',
  },
  emptyText: {
    fontSize: '1.2rem',
    color: '#757575',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    gridColumn: '1/-1',
  },
  error: {
    textAlign: 'center',
    padding: '20px',
    color: '#d32f2f',
    fontWeight: '500',
    gridColumn: '1/-1',
  },
};

const statusColors = {
  'New Lead': { bg: '#e3f2fd', text: '#1565c0' },
  'Contacted': { bg: '#e8f5e9', text: '#2e7d32' },
  'Interested': { bg: '#fff8e1', text: '#ff8f00' },
  'Not Interested': { bg: '#ffebee', text: '#c62828' },
  'Follow Up': { bg: '#f3e5f5', text: '#7b1fa2' },
  'Negotiating': { bg: '#e0f7fa', text: '#00838f' },
  'Converted': { bg: '#e8f5e9', text: '#2e7d32' },
  'On Hold': { bg: '#fff3e0', text: '#e65100' },
};

const NewAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [sending, setSending] = useState({});
  const [success, setSuccess] = useState({});

  useEffect(() => {
    const fetchAssignedAppointments = async () => {
      try {
        const executiveName = localStorage.getItem('userName');
        if (!executiveName) {
          throw new Error('Executive name not found in localStorage');
        }

        let response;
        try {
          response = await axios.get(`/api/appointments?executive=${executiveName}`);
        } catch (firstError) {
          try {
            response = await axios.get(`/api/appointments/appointments/assigned/${executiveName}`);
          } catch (secondError) {
            throw new Error(`Both endpoints failed: ${firstError.message}, ${secondError.message}`);
          }
        }

        const executiveAppointments = response.data.filter(
          appt => appt.executiveName === executiveName && appt.status !== 'completed'
        );

        setAppointments(executiveAppointments);

        const initialStatuses = {};
        executiveAppointments.forEach(appt => {
          initialStatuses[appt._id] = appt.status || 'New Lead';
        });
        setStatuses(initialStatuses);
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedAppointments();
  }, []);

  const handleStatusChange = (id, newStatus) => {
    setStatuses(prev => ({ ...prev, [id]: newStatus }));
  };

  const handleSendStatus = async (id) => {
    const selectedStatus = statuses[id];
    if (!selectedStatus || selectedStatus === 'Select') {
      setError('Please select a valid status');
      return;
    }

    try {
      setSending(prev => ({ ...prev, [id]: true }));
      setError(null);
      
      const executiveName = localStorage.getItem('userName');
      const response = await axios.put(
        `/api/appointments/appointments/${id}/status`, 
        { 
          status: selectedStatus,
          executiveName 
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        setSuccess(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setSuccess(prev => ({ ...prev, [id]: false })), 2000);
        
        const updatedAppointments = appointments.map(appt => 
          appt._id === id ? { ...appt, status: selectedStatus } : appt
        );
        setAppointments(updatedAppointments);
      }
    } catch (error) {
      console.error('Update failed:', error);
      let errorMsg = 'Failed to update status';
      
      if (error.response) {
        errorMsg = error.response.data.message || 
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMsg = 'No response from server';
      }
      
      setError(errorMsg);
    } finally {
      setSending(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading your appointments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Your Appointments</h1>
          <p style={styles.subtitle}>Manage your assigned appointments</p>
        </div>
        <div style={styles.error}>
          Error: {error}
          <div style={{ marginTop: '10px' }}>
            Please check your connection or contact support.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Your Appointments</h1>
        <p style={styles.subtitle}>Manage your assigned appointments</p>
      </div>

      {appointments.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <div style={styles.emptyText}>No appointments currently assigned to you</div>
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {appointments.map(appt => (
            <div key={appt._id} style={styles.card}>
              <div style={styles.cardContent}>
                {/* Executive Badge */}
                {appt.executiveName && (
                  <div style={styles.executiveBadge}>
                    {appt.executiveName}
                  </div>
                )}

                {/* Status Badge */}
                <div style={{
                  ...styles.statusBadge,
                  backgroundColor: statusColors[appt.status]?.bg || '#f5f5f5',
                  color: statusColors[appt.status]?.text || '#424242',
                }}>
                  {appt.status}
                </div>

                {/* Appointment Details */}
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Business</div>
                  <div style={styles.infoValue}>{appt.businessName}</div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Contact</div>
                  <div style={styles.infoValue}>{appt.contactName}</div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Phone</div>
                  <div style={styles.infoValue}>{appt.phoneNumber}</div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Date & Time</div>
                  <div style={styles.infoValue}>{appt.date} at {appt.time}</div>
                </div>

                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Venue</div>
                  <div style={styles.infoValue}>{appt.venue}</div>
                </div>
              </div>

              {/* Action Section */}
              <div style={styles.actionSection}>
                <select
                  value={statuses[appt._id] || 'Select'}
                  onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                  style={styles.statusDropdown}
                >
                  <option value="Select">Select Status</option>
                  <option value="New Lead">New Lead</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Negotiating">Negotiating</option>
                  <option value="Converted">Converted</option>
                  <option value="On Hold">On Hold</option>
                   <option value="Completed">Completed</option>
                </select>

                <button
                  style={{
                    ...styles.updateButton,
                    backgroundColor: sending[appt._id] ? '#81c784' : '#2e7d32'
                  }}
                  onClick={() => handleSendStatus(appt._id)}
                  disabled={sending[appt._id] || statuses[appt._id] === appt.status || statuses[appt._id] === 'Select'}
                >
                  {sending[appt._id] ? 'Updating...' : 'Update Status'}
                </button>

                {success[appt._id] && (
                  <div style={styles.successMessage}>✓ Status updated successfully!</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewAppointments;