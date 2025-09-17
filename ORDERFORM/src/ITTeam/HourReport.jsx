import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO, startOfDay, isSameDay } from 'date-fns';

const HourReport = () => {
  const [interactions, setInteractions] = useState([]);
  const [filteredInteractions, setFilteredInteractions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateTexts, setUpdateTexts] = useState({});
  const [activeUpdateId, setActiveUpdateId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedExecutive, setSelectedExecutive] = useState('');

  const formatIndianPhoneNumber = (phoneNumber) => {
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

  const uniqueExecutives = [...new Set(
    interactions.map(i => i.executiveName).filter(name => name)
  )].sort();

  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        const response = await axios.get('/api/interactions');
        setInteractions(response.data);
        setFilteredInteractions(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInteractions();
  }, []);

  useEffect(() => {
    let results = interactions;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(interaction => 
        interaction.customerName?.toLowerCase().includes(term) ||
        interaction.businessName?.toLowerCase().includes(term) ||
        interaction.phoneNumber?.includes(term) ||
        interaction.topicDiscussed?.toLowerCase().includes(term) ||
        interaction.executiveName?.toLowerCase().includes(term) ||
        interaction.updates?.some(update => 
          update.text.toLowerCase().includes(term)
      ));
    }
    
    if (selectedDate) {
      const selectedDay = startOfDay(selectedDate);
      results = results.filter(interaction => 
        isSameDay(parseISO(interaction.createdAt), selectedDay)
      );
    }
    
    if (selectedExecutive) {
      results = results.filter(interaction => 
        interaction.executiveName === selectedExecutive
      );
    }
    
    setFilteredInteractions(results);
  }, [searchTerm, selectedDate, selectedExecutive, interactions]);

  const handleUpdateChange = (id, text) => {
    setUpdateTexts(prev => ({ ...prev, [id]: text }));
  };

  const submitUpdate = async (id) => {
    try {
      const text = updateTexts[id];
      if (!text || !text.trim()) return;

      const response = await axios.patch(`/api/interactions/${id}/updates`, {
        text: text.trim()
      });

      setInteractions(prev => prev.map(interaction => 
        interaction._id === id ? response.data : interaction
      ));

      setUpdateTexts(prev => ({ ...prev, [id]: '' }));
      setActiveUpdateId(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDate(null);
    setSelectedExecutive('');
  };

  if (isLoading) return <div>Loading interactions...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Interaction Report</h1>
      
      <div style={styles.filterContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by customer, business, phone, executive, or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
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
     
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.headerCell}>Date & Time</th>
              <th style={styles.headerCell}>Executive</th>
              <th style={styles.headerCell}>Time Since Previous</th>
              <th style={styles.headerCell}>Business</th>
              <th style={styles.headerCell}>Customer</th>
              <th style={styles.headerCell}>Phone</th>
              <th style={styles.headerCell}>Topic</th>
              <th style={styles.headerCell}>Updates</th>
              <th style={styles.headerCell}>Add Update</th>
            </tr>
          </thead>
          <tbody>
            {filteredInteractions.length > 0 ? (
              filteredInteractions.map((interaction) => (
                <tr key={interaction._id} style={styles.row}>
                  <td style={styles.cell}>
                    {format(parseISO(interaction.createdAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td style={styles.cell}>{interaction.executiveName}</td>
                  <td style={styles.cell}>{interaction.timeSinceLast}</td>
                  <td style={styles.cell}>{interaction.businessName}</td>
                  <td style={styles.cell}>{interaction.customerName}</td>
                  <td style={styles.cell}>
                    {formatIndianPhoneNumber(interaction.phoneNumber)}
                  </td>
                  <td style={styles.cell}>{interaction.topicDiscussed}</td>
                  <td style={styles.cell}>
                    {interaction.updates?.map((update, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        <small>
                          {format(parseISO(update.updatedAt), "MMM d, h:mm a")}: 
                          <br />
                          {update.text}
                        </small>
                      </div>
                    ))}
                  </td>
                  <td style={styles.cell}>
                    {activeUpdateId === interaction._id ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <textarea
                          value={updateTexts[interaction._id] || ''}
                          onChange={(e) => handleUpdateChange(interaction._id, e.target.value)}
                          style={{ 
                            width: '100%', 
                            minHeight: '60px',
                            padding: '8px',
                            marginBottom: '4px'
                          }}
                          placeholder="Enter your update..."
                        />
                        <div>
                          <button 
                            onClick={() => submitUpdate(interaction._id)}
                            style={styles.updateButton}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => setActiveUpdateId(null)}
                            style={{ ...styles.updateButton, marginLeft: '4px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setActiveUpdateId(interaction._id)}
                        style={styles.updateButton}
                      >
                        Add Update
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                  No interactions found matching your criteria
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
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 1rem',
    fontFamily: "'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
  },
  title: {
    fontSize: '2rem',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '0.5rem'
  },
  filterContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '1.5rem',
    alignItems: 'center'
  },
  searchContainer: {
    flex: '1',
    minWidth: '300px'
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem'
  },
  dateContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  dateInput: {
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem'
  },
  clearDateButton: {
    position: 'absolute',
    right: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#777'
  },
  selectContainer: {
    minWidth: '200px'
  },
  selectInput: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '1rem',
    backgroundColor: 'white'
  },
  clearButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  updateButton: {
    padding: '4px 8px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  tableWrapper: {
    maxHeight: '500px',
    overflowY: 'auto',
    overflowX: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white'
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#003366',
    borderBottom: '2px solid #e0e0e0',
    padding: '1rem',
    textAlign: 'left',
    fontWeight: '600',
    color: 'white',
    fontSize: '0.875rem',
    zIndex: 2
  },
  row: {
    borderBottom: '1px solid #f0f0f0'
  },
  cell: {
    padding: '1rem',
    fontSize: '0.9375rem',
    color: '#333'
  }
};

export default HourReport;
