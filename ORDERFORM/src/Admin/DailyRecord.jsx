import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const DailyRecord = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({}); // Track expanded description rows
  
  // Filter states
  const [filters, setFilters] = useState({
    year: '',
    month: ''
  });

  useEffect(() => {
    fetchRecords();
  }, []);

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

    // Apply search term filter
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
      month: ''
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

  // Get years from 2010 to 2050 for dropdown
  const getAllYears = () => {
    const years = [];
    for (let year = 2050; year >= 2010; year--) {
      years.push(year);
    }
    return years;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Daily Reports</h1>

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
              {getAllYears().map(year => (
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
          {(filters.year || filters.month) && (
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
        {(filters.year || filters.month) && (
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            backgroundColor: '#e8f4fd',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#2c3e50'
          }}>
            Active Filters: 
            {filters.year && ` Year: ${filters.year}`}
            {filters.month && ` Month: ${filters.month}`}
          </div>
        )}
      </div>

      {/* Search input */}
      <input
        type="text"
        placeholder="Search by any field..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          marginBottom: '20px',
          padding: '10px',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      />

      {/* Results count */}
      <div style={{
        marginBottom: '15px',
        color: '#666',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Showing {filteredRecords.length} of {records.length} records
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
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {searchTerm || filters.year || filters.month 
            ? 'No records found with current filters' 
            : 'No records found'
          }
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '800px' // Increased width to accommodate description column
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#1976d2',
                borderBottom: '1px solid #ddd'
              }}>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366',
                  color: '#fff',
                  zIndex: 2
                }}>Executive Name</th>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366',
                  color: '#fff',
                  zIndex: 2
                }}>Date</th>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366',
                  color: '#fff',
                  zIndex: 2
                }}>Total Calls</th>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366',
                  color: '#fff',
                  zIndex: 2
                }}>Follow Ups</th>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366',
                  color: '#fff',
                  zIndex: 2
                }}>WhatsApp</th>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366',
                  color: '#fff',
                  zIndex: 2
                }}>Description</th> {/* New column */}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 15px' }}>{record.executiveName}</td>
                  <td style={{ padding: '12px 15px' }}>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                  <td style={{ padding: '12px 15px' }}>{record.totalCalls}</td>
                  <td style={{ padding: '12px 15px' }}>{record.followUps}</td>
                  <td style={{ padding: '12px 15px' }}>{record.whatsapp}</td>
                  <td style={{ 
                    padding: '12px 15px',
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
                            style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              backgroundColor: '#f0f0f0',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              color: '#003366'
                            }}
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

export default DailyRecord;