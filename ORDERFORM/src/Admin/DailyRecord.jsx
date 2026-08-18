import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const DailyRecord = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  
  // Enhanced filter states
  const [filters, setFilters] = useState({
    year: '',
    month: '',
    executive: '',
    specificDate: ''
  });

  // Get unique executives from records
  const [executives, setExecutives] = useState([]);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      extractExecutives();
    }
  }, [records]);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, records, filters]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/reports');
      setRecords(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch records. Please try again.');
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractExecutives = () => {
    const uniqueExecutives = [...new Set(records.map(record => record.executiveName))];
    setExecutives(uniqueExecutives.sort());
  };

  const filterRecords = () => {
    let filtered = [...records];

    // Apply year filter
    if (filters.year) {
      filtered = filtered.filter(record => {
        const recordYear = new Date(record.date).getFullYear();
        return recordYear === parseInt(filters.year);
      });
    }

    // Apply month filter
    if (filters.month) {
      filtered = filtered.filter(record => {
        const recordMonth = new Date(record.date).getMonth() + 1;
        return recordMonth === parseInt(filters.month);
      });
    }

    // Apply executive filter
    if (filters.executive) {
      filtered = filtered.filter(record => 
        record.executiveName === filters.executive
      );
    }

    // Apply specific date filter
    if (filters.specificDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === filters.specificDate;
      });
    }

    // Apply search term filter (for any field)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((record) =>
        Object.values(record).some((value) =>
          String(value).toLowerCase().includes(term)
        )
      );
    }

    setFilteredRecords(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      year: '',
      month: '',
      executive: '',
      specificDate: ''
    });
    setSearchTerm('');
  };

  const toggleDescription = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const truncateDescription = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get years from 2020 to 2030 for dropdown
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 5; year >= 2020; year--) {
      years.push(year);
    }
    return years;
  };

  // Check if any filter is active
  const isFilterActive = () => {
    return filters.year || filters.month || filters.executive || filters.specificDate || searchTerm;
  };

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.year) count++;
    if (filters.month) count++;
    if (filters.executive) count++;
    if (filters.specificDate) count++;
    if (searchTerm) count++;
    return count;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Daily Reports</h1>

      {/* Filter Controls */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          alignItems: 'end'
        }}>
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
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            >
              <option value="">All Years</option>
              {getYearOptions().map(year => (
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
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
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

          {/* Executive Filter */}
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
              Executive:
            </label>
            <select
              value={filters.executive}
              onChange={(e) => handleFilterChange('executive', e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            >
              <option value="">All Executives</option>
              {executives.map(executive => (
                <option key={executive} value={executive}>{executive}</option>
              ))}
            </select>
          </div>

          {/* Specific Date Filter */}
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
              Specific Date:
            </label>
            <input
              type="date"
              value={filters.specificDate}
              onChange={(e) => handleFilterChange('specificDate', e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                width: '100%'
              }}
            />
          </div>

          {/* Clear Filters Button */}
          {isFilterActive() && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <button
                onClick={clearFilters}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  height: '42px',
                  whiteSpace: 'nowrap'
                }}
              >
                Clear All Filters ({getActiveFiltersCount()})
              </button>
            </div>
          )}
        </div>

        {/* Search input moved inside filter box */}
        <div style={{
          marginTop: '15px',
          borderTop: '1px solid #eee',
          paddingTop: '15px'
        }}>
          <input
            type="text"
            placeholder="Search by any field..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '10px',
              width: '100%',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Active Filters Display */}
        {isFilterActive() && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#e8f4fd',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#2c3e50'
          }}>
            <strong>Active Filters:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
              {filters.year && (
                <span style={styles.filterTag}>Year: {filters.year}</span>
              )}
              {filters.month && (
                <span style={styles.filterTag}>Month: {
                  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(filters.month) - 1]
                }</span>
              )}
              {filters.executive && (
                <span style={styles.filterTag}>Executive: {filters.executive}</span>
              )}
              {filters.specificDate && (
                <span style={styles.filterTag}>Date: {format(new Date(filters.specificDate), 'MMM dd, yyyy')}</span>
              )}
              {searchTerm && (
                <span style={styles.filterTag}>Search: "{searchTerm}"</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div style={{
        marginBottom: '15px',
        color: '#666',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Showing {filteredRecords.length} of {records.length} records</span>
        {filteredRecords.length > 0 && (
          <button
            onClick={fetchRecords}
            style={{
              padding: '5px 10px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#666'
            }}
          >
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div style={{
          color: '#d32f2f',
          backgroundColor: '#fdecea',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div style={{
          padding: '40px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          textAlign: 'center',
          color: '#666'
        }}>
          {isFilterActive() 
            ? 'No records found matching your filters' 
            : 'No records found'
          }
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          maxHeight: '500px',
          overflowY: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '900px'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#1976d2',
                borderBottom: '1px solid #ddd'
              }}>
                <th style={styles.tableHeader}>Executive Name</th>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Total Calls</th>
                <th style={styles.tableHeader}>Follow Ups</th>
                <th style={styles.tableHeader}>WhatsApp</th>
                <th style={styles.tableHeader}>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record._id} style={{ borderBottom: '1px solid #eee', ':hover': { backgroundColor: '#f5f5f5' } }}>
                  <td style={styles.tableCell}>{record.executiveName}</td>
                  <td style={styles.tableCell}>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                  <td style={styles.tableCell}>{record.totalCalls}</td>
                  <td style={styles.tableCell}>{record.followUps}</td>
                  <td style={styles.tableCell}>{record.whatsapp}</td>
                  <td style={{ 
                    ...styles.tableCell,
                    maxWidth: '300px',
                    wordBreak: 'break-word'
                  }}>
                    {record.description ? (
                      <>
                        <span>
                          {expandedRows[record._id] 
                            ? record.description 
                            : truncateDescription(record.description)}
                        </span>
                        {record.description.length > 50 && (
                          <button 
                            onClick={() => toggleDescription(record._id)}
                            style={styles.readMoreButton}
                          >
                            {expandedRows[record._id] ? 'Show less' : 'Read more'}
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>No description</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  tableHeader: {
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    position: 'sticky',
    top: 0,
    backgroundColor: '#003366',
    color: '#fff',
    zIndex: 2
  },
  tableCell: {
    padding: '12px 15px'
  },
  filterTag: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    display: 'inline-block'
  },
  readMoreButton: {
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#003366'
  }
};

export default DailyRecord;