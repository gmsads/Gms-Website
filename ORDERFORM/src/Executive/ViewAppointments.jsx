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
  statusCompleted: {
    color: '#003366',
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
};

const ViewAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const currentUser = localStorage.getItem('userName');

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/appointments');
      const filteredData = response.data
        .filter(appt => appt.executiveName === currentUser)
        .filter(appt => filter === 'all' || appt.status === filter)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setAppointments(filteredData);
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

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`/api/appointments/${id}/status`, {
        status: newStatus
      });
      fetchAppointments();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status');
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
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
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
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
              <th style={styles.th}>Actions</th>
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
                    ...(appt.status === 'pending' && styles.statusPending),
                    ...(appt.status === 'assigned' && styles.statusAssigned),
                    ...(appt.status === 'completed' && styles.statusCompleted),
                  }}>
                    {appt.status}
                  </td>
                  <td style={styles.td}>
                    {appt.status === 'pending' && (
                      <button
                        style={{ ...styles.button, backgroundColor: '#4CAF50' }}
                        onClick={() => handleStatusChange(appt._id, 'assigned')}
                      >
                        Assign
                      </button>
                    )}
                    {appt.status === 'assigned' && (
                      <button
                        style={{ ...styles.button, backgroundColor: '#003366' }}
                        onClick={() => handleStatusChange(appt._id, 'completed')}
                      >
                        Complete
                      </button>
                    )}
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