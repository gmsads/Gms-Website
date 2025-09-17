import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

const DailyRecord = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, records]);

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
    const term = searchTerm.toLowerCase();
    const filtered = records.filter((record) =>
      Object.values(record).some((value) =>
        String(value).toLowerCase().includes(term)
      )
    );
    setFilteredRecords(filtered);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Daily Reports</h1>

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
          No records found.
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          maxHeight: '400px',   // limit height so body scrolls
          overflowY: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '600px'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#1976d2',  // darker blue header row
                borderBottom: '1px solid #ddd'
              }}>
                <th style={{
                  padding: '12px 15px',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#003366', // match row bg
                  color: '#fff',              // white text
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
