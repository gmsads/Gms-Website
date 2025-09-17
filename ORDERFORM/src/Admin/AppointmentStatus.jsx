import React, { useEffect, useState } from 'react';
import axios from 'axios';

const styles = {
  container: {
    padding: '20px 40px',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', sans-serif",
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '10px',
    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: '500',
  },
  filterContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    padding: '10px 0',
  },
  filterButton: {
    padding: '8px 20px',
    backgroundColor: '#e2e8f0',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    color: '#475569',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  activeFilter: {
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 2px 5px rgba(59, 130, 246, 0.3)',
  },
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '25px',
    padding: '10px',
  },
  card: {
    backgroundColor: 'white',
    padding: '22px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
  },
  statusBadge: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  executiveBadge: {
    position: 'absolute',
    top: '15px',
    left: '15px',
    backgroundColor: '#e0f2fe',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#0369a1',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginTop: '40px',
    marginBottom: '20px',
  },
  infoItem: {
    marginBottom: '8px',
  },
  infoLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '1rem',
    color: '#1e293b',
    fontWeight: '600',
  },
  actionSection: {
    marginTop: '20px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '20px',
  },
  dropdown: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '0.95rem',
    color: '#334155',
    marginBottom: '15px',
    cursor: 'pointer',
    transition: 'border 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
    },
  },
  nameInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '0.95rem',
    color: '#334155',
    marginBottom: '15px',
    transition: 'border 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
    },
  },
  updateBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.95rem',
    transition: 'background-color 0.2s, transform 0.1s',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },
  successMsg: {
    marginTop: '12px',
    color: '#10b981',
    fontWeight: '600',
    fontSize: '0.9rem',
    textAlign: 'center',
    animation: 'fadeIn 0.3s',
  },
  noAppointments: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '1.1rem',
    marginTop: '60px',
    gridColumn: '1/-1',
  },
  loading: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '1rem',
    marginTop: '40px',
    gridColumn: '1/-1',
  },
};

const statusColors = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  assigned: { bg: '#dbeafe', text: '#1e40af' },
  contacted: { bg: '#e0f2fe', text: '#0369a1' },
  'in progress': { bg: '#ede9fe', text: '#5b21b6' },
  completed: { bg: '#dcfce7', text: '#166534' },
  cancelled: { bg: '#fee2e2', text: '#991b1b' },
  'sale closed': { bg: '#bbf7d0', text: '#166534' },
  postponded: { bg: '#f5f5f5', text: '#525252' },
};

const AppointmentStatus = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [updatedStatus, setUpdatedStatus] = useState({});
  const [saleClosedByName, setSaleClosedByName] = useState({});
  const [successMap, setSuccessMap] = useState({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/appointments');
        setAppointments(response.data);
        setFilteredAppointments(response.data);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(
        appointments.filter((appt) => appt.status === activeFilter)
      );
    }
  }, [activeFilter, appointments]);

  const handleStatusChange = (id, newStatus) => {
    setUpdatedStatus((prev) => ({
      ...prev,
      [id]: newStatus,
    }));
  };

  const handleNameChange = (id, name) => {
    setSaleClosedByName((prev) => ({
      ...prev,
      [id]: name,
    }));
  };

  const updateStatus = async (id) => {
    try {
      const requestData = {
        status: updatedStatus[id] || appointments.find(a => a._id === id).status,
      };

      if ((updatedStatus[id] === 'sale closed' || appointments.find(a => a._id === id).status === 'sale closed')) {
        requestData.closedBy = saleClosedByName[id] || '';
      }

      const response = await axios.put(`/api/appointments/appointments/${id}/status`, requestData);
      
      if (response.status === 200) {
        setAppointments(prev =>
          prev.map(appt =>
            appt._id === id ? { 
              ...appt, 
              status: updatedStatus[id] || appt.status,
              ...((updatedStatus[id] === 'sale closed' || appt.status === 'sale closed') && { 
                closedBy: saleClosedByName[id] || appt.closedBy 
              })
            } : appt
          )
        );
        setSuccessMap((prev) => ({ ...prev, [id]: true }));
        setTimeout(() => {
          setSuccessMap((prev) => ({ ...prev, [id]: false }));
        }, 2500);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      console.log('Error details:', {
        url: error.config.url,
        data: error.config.data,
        response: error.response?.data
      });
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  };

  const statusFilters = [
    { value: 'all', label: 'All Appointments' },
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'in progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'postponded', label: 'Postponed' },
    { value: 'sale closed', label: 'Sale Closed' },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Appointment Status</h1>
        <p style={styles.subtitle}>Manage and track all appointments in one place</p>
      </div>

      <div style={styles.filterContainer}>
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            style={{
              ...styles.filterButton,
              ...(activeFilter === filter.value ? styles.activeFilter : {}),
            }}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={styles.loading}>Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <div style={styles.noAppointments}>
          No {activeFilter === 'all' ? '' : activeFilter} appointments found
        </div>
      ) : (
        <div style={styles.cardContainer}>
          {filteredAppointments.map((appt) => (
            <div key={appt._id} style={styles.card}>
              <div style={{
                ...styles.statusBadge,
                backgroundColor: statusColors[appt.status]?.bg || '#e2e8f0',
                color: statusColors[appt.status]?.text || '#475569',
              }}>
                {appt.status}
              </div>
              
              {appt.executiveName && (
                <div style={styles.executiveBadge}>
                  {appt.executiveName}
                </div>
              )}
              
              <div style={styles.infoGrid}>
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
                  <div style={styles.infoLabel}>Date</div>
                  <div style={styles.infoValue}>{appt.date}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Time</div>
                  <div style={styles.infoValue}>{appt.time}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Venue</div>
                  <div style={styles.infoValue}>{appt.venue}</div>
                </div>
              </div>
              
              <div style={styles.actionSection}>
                <select
                  style={styles.dropdown}
                  value={updatedStatus[appt._id] || appt.status}
                  onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                >
                  {statusFilters.slice(1).map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>

                {(updatedStatus[appt._id] === 'sale closed' || appt.status === 'sale closed') && (
                  <input
                    type="text"
                    placeholder="Closed by (name)"
                    value={saleClosedByName[appt._id] || appt.closedBy || ''}
                    onChange={(e) => handleNameChange(appt._id, e.target.value)}
                    style={styles.nameInput}
                  />
                )}

                <button
                  style={styles.updateBtn}
                  onClick={() => updateStatus(appt._id)}
                >
                  Update Status
                </button>
                
                {successMap[appt._id] && (
                  <div style={styles.successMsg}>✓ Status updated successfully</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentStatus;