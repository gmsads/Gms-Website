import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';

const HourReport = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const formatIndianPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return 'Not provided';
    
    const cleaned = (phoneNumber || '').toString().replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }
    return phoneNumber;
  };

  // Get unique executives for filter dropdown
  const uniqueExecutives = [...new Set(
    records.map(r => r.executiveName).filter(name => name)
  )].sort();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/api/interactions');
        setRecords(response.data);
        setFilteredRecords(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, []);

  useEffect(() => {
    let results = records;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(record => 
        record.executiveName?.toLowerCase().includes(term) ||
        record.phoneNumber?.includes(term) ||
        record.topicDiscussed?.toLowerCase().includes(term) ||
        record.remark?.toLowerCase().includes(term)
      );
    }
    
    // Apply date filter
    if (selectedDate) {
      const selectedDay = startOfDay(selectedDate);
      results = results.filter(record => 
        isSameDay(parseISO(record.createdAt), selectedDay)
      );
    }
    
    // Apply executive filter
    if (selectedExecutive) {
      results = results.filter(record => 
        record.executiveName === selectedExecutive
      );
    }
    
    // Apply sorting
    results = sortRecords(results, sortConfig.key, sortConfig.direction);
    
    setFilteredRecords(results);
  }, [searchTerm, selectedDate, selectedExecutive, records, sortConfig]);

  const sortRecords = (recordsToSort, key, direction) => {
    return [...recordsToSort].sort((a, b) => {
      if (key === 'createdAt') {
        const dateA = new Date(a[key]).getTime();
        const dateB = new Date(b[key]).getTime();
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      let valueA = a[key] || '';
      let valueB = b[key] || '';
      
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      if (valueA < valueB) return direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDate(null);
    setSelectedExecutive('');
  };

  const exportToCSV = () => {
    const headers = ['Date & Time', 'Executive', 'Phone Number', 'Topic Discussed', 'Remarks'];
    const csvData = filteredRecords.map(record => [
      format(parseISO(record.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      record.executiveName,
      record.phoneNumber || 'Not provided',
      record.topicDiscussed,
      record.remark || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `hour_records_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading hour records...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h3>Error Loading Records</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Hour Records Report</h1>
        <button onClick={exportToCSV} style={styles.exportButton}>
          📥 Export to CSV
        </button>
      </div>
      
      <div style={styles.filterContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by executive, phone, topic, or remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={styles.clearInputButton}
            >
              ×
            </button>
          )}
        </div>
        
        <div style={styles.dateContainer}>
          <input
            type="date"
            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
            style={styles.dateInput}
          />
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate(null)}
              style={styles.clearDateButton}
            >
              ×
            </button>
          )}
        </div>

        <div style={styles.selectContainer}>
          <select
            value={selectedExecutive}
            onChange={(e) => setSelectedExecutive(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">All Executives</option>
            {uniqueExecutives.map((executive, index) => (
              <option key={index} value={executive}>
                {executive}
              </option>
            ))}
          </select>
        </div>
        
        {(searchTerm || selectedDate || selectedExecutive) && (
          <button 
            onClick={clearFilters}
            style={styles.clearButton}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Records:</span>
          <span style={styles.statValue}>{records.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Filtered:</span>
          <span style={styles.statValue}>{filteredRecords.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Executives:</span>
          <span style={styles.statValue}>{uniqueExecutives.length}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>With Phone:</span>
          <span style={styles.statValue}>
            {records.filter(r => r.phoneNumber).length}
          </span>
        </div>
      </div>
     
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.headerCell} onClick={() => handleSort('createdAt')}>
                Date & Time {getSortIcon('createdAt')}
              </th>
              <th style={styles.headerCell} onClick={() => handleSort('executiveName')}>
                Executive {getSortIcon('executiveName')}
              </th>
              <th style={styles.headerCell}>Phone Number</th>
              <th style={styles.headerCell} onClick={() => handleSort('topicDiscussed')}>
                Topic Discussed {getSortIcon('topicDiscussed')}
              </th>
              <th style={styles.headerCell}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <tr key={record._id} style={styles.row}>
                  <td style={styles.cell}>
                    {format(parseISO(record.createdAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td style={styles.cell}>
                    <strong>{record.executiveName}</strong>
                  </td>
                  <td style={styles.cell}>
                    {record.phoneNumber ? (
                      <a href={`tel:${record.phoneNumber}`} style={styles.phoneLink}>
                        {formatIndianPhoneNumber(record.phoneNumber)}
                      </a>
                    ) : (
                      <span style={styles.noData}>—</span>
                    )}
                  </td>
                  <td style={styles.cell}>
                    <div style={styles.topicCell}>
                      {record.topicDiscussed}
                    </div>
                  </td>
                  <td style={styles.cell}>
                    {record.remark ? (
                      <div style={styles.remarkCell}>
                        {record.remark}
                      </div>
                    ) : (
                      <span style={styles.noData}>—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={styles.noResultsCell}>
                  <div style={styles.noResultsContent}>
                    <p>No records found matching your criteria</p>
                    <button onClick={clearFilters} style={styles.clearFiltersButton}>
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '2rem auto',
    padding: '0 1.5rem',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#1a202c',
    margin: 0
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#48bb78',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #3182ce',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '2rem',
    backgroundColor: '#fff5f5',
    borderRadius: '8px',
    maxWidth: '500px',
    margin: '2rem auto'
  },
  retryButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '1rem'
  },
  filterContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    padding: '1rem',
    borderRadius: '8px'
  },
  searchContainer: {
    flex: '2',
    minWidth: '300px',
    position: 'relative'
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem',
    paddingRight: '2rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease'
  },
  clearInputButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    color: '#a0aec0',
    padding: '4px 8px'
  },
  dateContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: '200px'
  },
  dateInput: {
    width: '100%',
    padding: '0.75rem',
    paddingRight: '2rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem'
  },
  clearDateButton: {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.2rem',
    color: '#a0aec0'
  },
  selectContainer: {
    minWidth: '200px',
    flex: '1'
  },
  selectInput: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    fontSize: '0.95rem',
    backgroundColor: 'white'
  },
  clearButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  statCard: {
    backgroundColor: '#f7fafc',
    padding: '0.75rem',
    borderRadius: '6px',
    textAlign: 'center',
    border: '1px solid #e2e8f0'
  },
  statLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#718096',
    marginBottom: '0.25rem'
  },
  statValue: {
    display: 'block',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#2d3748'
  },
  tableWrapper: {
    maxHeight: '600px',
    overflowY: 'auto',
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    minWidth: '800px'
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#2c5282',
    borderBottom: '2px solid #e2e8f0',
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: 'white',
    fontSize: '0.875rem',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  },
  row: {
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.2s ease'
  },
  cell: {
    padding: '1rem',
    fontSize: '0.9375rem',
    color: '#2d3748',
    verticalAlign: 'top'
  },
  topicCell: {
    maxWidth: '300px',
    overflowWrap: 'break-word',
    wordBreak: 'break-word'
  },
  remarkCell: {
    maxWidth: '250px',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    color: '#718096',
    fontSize: '0.875rem'
  },
  phoneLink: {
    color: '#3182ce',
    textDecoration: 'none',
    fontWeight: '500'
  },
  noData: {
    color: '#a0aec0',
    fontSize: '0.875rem',
    fontStyle: 'italic'
  },
  noResultsCell: {
    textAlign: 'center',
    padding: '3rem'
  },
  noResultsContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem'
  },
  clearFiltersButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

// Add keyframe animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  tr:hover {
    background-color: #f7fafc;
  }
  
  button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;
document.head.appendChild(styleSheet);

export default HourReport;