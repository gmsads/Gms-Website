// SuperAdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SuperAdminDashboard() {
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ clientId: '', clientName: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is Super Admin
    const role = localStorage.getItem('role');
    if (role !== 'SuperAdmin') {
      navigate('/');
      return;
    }
    
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleCreateClient = async () => {
    try {
      await axios.post('/api/create-client', newClient);
      alert('Client created successfully!');
      setNewClient({ clientId: '', clientName: '' });
      fetchClients();
    } catch (error) {
      alert('Error creating client: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={styles.container}>
      <h1>Super Admin Dashboard</h1>
      
      <div style={styles.createClientCard}>
        <h2>Create New Client</h2>
        <input
          placeholder="Client ID (e.g., GMS)"
          value={newClient.clientId}
          onChange={(e) => setNewClient({...newClient, clientId: e.target.value})}
          style={styles.input}
        />
        <input
          placeholder="Client Name"
          value={newClient.clientName}
          onChange={(e) => setNewClient({...newClient, clientName: e.target.value})}
          style={styles.input}
        />
        <button onClick={handleCreateClient} style={styles.button}>
          Create Client
        </button>
      </div>

      <div style={styles.clientsList}>
        <h2>All Clients ({clients.length})</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Client ID</th>
              <th>Client Name</th>
              <th>Created</th>
              <th>Status</th>
              <th>Subscription</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client._id}>
                <td>{client.clientId}</td>
                <td>{client.clientName}</td>
                <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                <td>
                  <span style={{
                    color: client.isActive ? 'green' : 'red',
                    fontWeight: 'bold'
                  }}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{client.subscription}</td>
                <td>
                  <button 
                    onClick={() => navigate(`/client-details/${client.clientId}`)}
                    style={styles.viewButton}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  createClientCard: {
    background: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '16px'
  },
  button: {
    background: '#003366',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  clientsList: {
    marginTop: '30px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px'
  },
  viewButton: {
    background: '#28a745',
    color: 'white',
    padding: '5px 10px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default SuperAdminDashboard;