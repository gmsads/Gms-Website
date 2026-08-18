import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ExecutiveLogins() {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    year: '',
    month: ''
  });

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

  // Filter logs based on year, month and search term
  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.loginTime);
    const logYear = logDate.getFullYear();
    const logMonth = logDate.getMonth() + 1;
    
    const matchesName = log.executiveName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = !filters.year || logYear === parseInt(filters.year);
    const matchesMonth = !filters.month || logMonth === parseInt(filters.month);

    return matchesName && matchesYear && matchesMonth;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      year: '',
      month: ''
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

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Executive Login Activity</h2>

      {/* Filter Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-end',
          flexWrap: 'wrap'
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <label style={{
              fontWeight: '500',
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              Search Name:
            </label>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                minWidth: '200px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Year Filter */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <label style={{
              fontWeight: '500',
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              Year:
            </label>
            <select
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '120px'
              }}
            >
              <option value="">All Years</option>
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            <label style={{
              fontWeight: '500',
              color: '#2c3e50',
              fontSize: '14px'
            }}>
              Month:
            </label>
            <select
              value={filters.month}
              onChange={(e) => handleFilterChange('month', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '140px'
              }}
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

          {/* Clear Filters Button */}
          {(filters.year || filters.month || searchTerm) && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 16px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                height: '36px'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {(filters.year || filters.month || searchTerm) && (
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            backgroundColor: '#e8f4fd',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#2c3e50'
          }}>
            Active Filters: 
            {searchTerm && ` Name: ${searchTerm}`}
            {filters.year && ` Year: ${filters.year}`}
            {filters.month && ` Month: ${filters.month}`}
          </div>
        )}
      </div>

      {/* Results count */}
      <div style={{
        marginBottom: '15px',
        color: '#666',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Showing {filteredLogs.length} of {logs.length} login records
      </div>

      {/* Log Table */}
      <div style={{
        maxHeight: '400px',
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
                  {logs.length === 0 ? 'No logs available' : 'No logs found with current filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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