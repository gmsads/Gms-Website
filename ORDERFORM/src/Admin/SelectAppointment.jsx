import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: {
    padding: '20px',
    background: 'linear-gradient(to right, #e6f0ff, #f7faff)',
    minHeight: '100vh',
    fontFamily: 'Segoe UI, sans-serif',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '2rem',
    color: '#1a237e',
    fontWeight: '600',
  },
  appointmentStatusBtn: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 20px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '20px',
    transition: 'background-color 0.3s ease',
    display: 'block',
    width: '200px',
    marginLeft: 'auto',
    marginRight: '5rem',
  },
  cardContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: '15px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '20px',
    marginBottom: '15px',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    width: 'calc(50% - 7.5px)',
    boxSizing: 'border-box',
    transition: 'transform 0.2s ease-in-out',
    fontSize: '0.9rem',
    minHeight: '230px',
  },
  info: {
    marginBottom: '10px',
    fontSize: '1rem',
    color: '#333',
    lineHeight: '1.4',
  },
  executiveInfo: {
    marginBottom: '10px',
    fontSize: '1rem',
    color: '#1a237e',
    fontWeight: 'bold',
    lineHeight: '1.4',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dropdown: {
    padding: '6px 10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    fontSize: '0.9rem',
    backgroundColor: '#fafafa',
    cursor: 'pointer',
    height: '35px',
    minWidth: '150px',
  },
  assignBtn: {
    padding: '6px 15px',
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    height: '35px',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.3s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '100vw',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: '30px 40px',
    borderRadius: '12px',
    textAlign: 'center',
    fontSize: '1.2rem',
    fontWeight: '500',
    color: '#2e7d32',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
  },
  assignedText: {
    marginTop: '12px',
    color: '#388e3c',
    fontWeight: 'bold',
    fontSize: '1.1rem',
  },
  noAppointments: {
    textAlign: 'center',
    color: '#666',
    fontSize: '1.1rem',
    width: '100%',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    padding: '20px',
  }
};

const SelectAppointment = () => {
  const [appointments, setAppointments] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [selectedExec, setSelectedExec] = useState({});
  const [assignedMap, setAssignedMap] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [appointmentsRes, executivesRes] = await Promise.all([
          axios.get('/api/appointments'),
          axios.get('/api/executives')
        ]);
        
        const pendingAppointments = appointmentsRes.data.filter(
          appt => appt.status === 'pending'
        );
        
        setAppointments(pendingAppointments);
        setExecutives(executivesRes.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleStatusClick = () => {
    navigate('/admin-dashboard/appointment-status');
  };

  const handleAssign = async (appointmentId) => {
    const executiveName = selectedExec[appointmentId];
    if (!executiveName) return;

    try {
      await axios.put(`/api/appointments/${appointmentId}/assign`, { 
        executiveName 
      });

      setAssignedMap(prev => ({ ...prev, [appointmentId]: executiveName }));
      setAppointments(prev => prev.filter(appt => appt._id !== appointmentId));
      
      setPopupMessage(`Successfully assigned to ${executiveName}`);
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2500);
    } catch (err) {
      console.error('Error assigning executive:', err);
      setPopupMessage('Failed to assign executive');
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2500);
    }
  };

  const handleCardHover = (e, isHover) => {
    e.currentTarget.style.transform = isHover ? 'scale(1.02)' : 'scale(1)';
    e.currentTarget.style.boxShadow = isHover 
      ? '0 8px 20px rgba(0, 0, 0, 0.15)' 
      : '0 4px 12px rgba(0, 0, 0, 0.08)';
  };

  const handleButtonHover = (e, isHover) => {
    e.currentTarget.style.backgroundColor = isHover ? '#1565c0' : '#2196f3';
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading appointments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorText}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button
        style={styles.appointmentStatusBtn}
        onClick={handleStatusClick}
        onMouseEnter={(e) => handleButtonHover(e, true)}
        onMouseLeave={(e) => handleButtonHover(e, false)}
      >
        Appointment Status
      </button>

      <h1 style={styles.title}>📅 Appointment Requests</h1>

      {appointments.length === 0 ? (
        <p style={styles.noAppointments}>
          No pending appointments available.
        </p>
      ) : (
        <div style={styles.cardContainer}>
          {appointments.map((appt) => (
            <div
              key={appt._id}
              style={styles.card}
              onMouseEnter={(e) => handleCardHover(e, true)}
              onMouseLeave={(e) => handleCardHover(e, false)}
            >
              <div style={styles.executiveInfo}>
                <strong>👔 Executive:</strong> {appt.executiveName || 'Not assigned'}
              </div>
              <div style={styles.info}><strong>👤 Contact:</strong> {appt.contactName}</div>
              <div style={styles.info}><strong>📞 Phone:</strong> {appt.phoneNumber}</div>
              <div style={styles.info}><strong>🏢 Business:</strong> {appt.businessName}</div>
              <div style={styles.info}><strong>📅 Date:</strong> {appt.date}</div>
              <div style={styles.info}><strong>⏰ Time:</strong> {appt.time}</div>
              <div style={styles.info}><strong>📍 Venue:</strong> {appt.venue}</div>

              {assignedMap[appt._id] ? (
                <div style={styles.assignedText}>✅ Assigned to {assignedMap[appt._id]}</div>
              ) : (
                <div style={styles.buttonGroup}>
                  <select
                    style={styles.dropdown}
                    value={selectedExec[appt._id] || ''}
                    onChange={(e) =>
                      setSelectedExec(prev => ({
                        ...prev,
                        [appt._id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select Executive</option>
                    {executives.map((exec) => (
                      <option key={exec._id} value={exec.name}>
                        {exec.name}
                      </option>
                    ))}
                  </select>
                  <button
                    style={styles.assignBtn}
                    onClick={() => handleAssign(appt._id)}
                    onMouseEnter={(e) => handleButtonHover(e, true)}
                    onMouseLeave={(e) => handleButtonHover(e, false)}
                    disabled={!selectedExec[appt._id]}
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showPopup && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>{popupMessage}</div>
        </div>
      )}
    </div>
  );
};

export default SelectAppointment;