import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ExecutiveLogins() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    axios.get('/api/executiveLogins/all')
      .then(res => setLogs(res.data))
      .catch(err => console.error('Error fetching logs:', err));
  }, []);

  // Format date as "1 Jan 2025"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filter logs to show only the selected date's entries
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.loginTime).toISOString().split('T')[0];
    const matchesName = log.executiveName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = logDate === selectedDate;

    return matchesName && matchesDate;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Executive Login Activity</h2>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={inputStyle}
        />

        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Log Table */}
      <div style={{
        maxHeight: '400px',   // limit height so body scrolls
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr style={{ backgroundColor: '#003366', color: 'white' }}>
              <th style={stickyThStyle}>Executive Name</th>
              <th style={stickyThStyle}>Login Date</th>
              <th style={stickyThStyle}>Login Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log, index) => {
                const formattedDate = formatDate(log.loginTime);
                const timeString = new Date(log.loginTime).toLocaleTimeString([], 
                  { hour: '2-digit', minute: '2-digit', hour12: true });
                return (
                  <tr key={index}>
                    <td style={tdStyle}>{log.executiveName}</td>
                    <td style={tdStyle}>{formattedDate}</td>
                    <td style={tdStyle}>{timeString}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td style={tdStyle} colSpan="3">
                  {logs.length === 0 ? 'No logs available' : 'No logs found for selected date'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  minWidth: '150px',
};

const stickyThStyle = {
  padding: '10px',
  textAlign: 'left',
  border: '1px solid #ddd',
  position: 'sticky',
  top: 0,
  backgroundColor: '#003366',
  color: 'white',
  zIndex: 2
};

const tdStyle = {
  padding: '10px',
  border: '1px solid #ddd'
};

export default ExecutiveLogins;
