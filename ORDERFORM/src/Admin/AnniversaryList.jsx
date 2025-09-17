import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AnniversaryList = () => {
  const [list, setList] = useState([]);

  useEffect(() => {
    axios.get('/api/anniversaries').then(res => setList(res.data));
  }, []);

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  const calculateYears = (startingYear) => {
    const currentYear = new Date().getFullYear();
    const years = currentYear - startingYear;
    return years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : 'New';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#003366' }}>Client Anniversaries</h2>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#003366', color: 'white' }}>
            <th style={{ padding: '12px', textAlign: 'left' }}>Client</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Business</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Anniversary Date</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Years</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Birthday</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Marriage Anniversary</th>
            <th style={{ padding: '12px', textAlign: 'left' }}>Collaboration</th>
          </tr>
        </thead>
        <tbody>
          {list.map(a => (
            <tr key={a._id} style={{ borderBottom: '1px solid #ddd', ':hover': { backgroundColor: '#f5f5f5' } }}>
              <td style={{ padding: '12px' }}>{a.clientName}</td>
              <td style={{ padding: '12px' }}>{a.businessName}</td>
              <td style={{ padding: '12px' }}>{formatDate(a.anniversaryDate)}</td>
              <td style={{ padding: '12px' }}>{calculateYears(a.startingYear)}</td>
              <td style={{ padding: '12px' }}>{formatDate(a.clientBirthday)}</td>
              <td style={{ padding: '12px' }}>{formatDate(a.marriageAnniversaryDate) || 'N/A'}</td>
              <td style={{ padding: '12px' }}>{formatDate(a.collaborationDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnniversaryList;