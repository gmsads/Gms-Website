import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AnniversaryList = () => {
  const [birthdayList, setBirthdayList] = useState([]);
  const [anniversaryList, setAnniversaryList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch all orders
      const response = await axios.get('/api/orders');
      const orders = response.data;
      
      // Filter and process birthdays
      const birthdays = orders
        .filter(order => order.birthDate && order.birthDate !== null)
        .map(order => ({
          id: order._id,
          clientName: order.contactPerson,
          businessName: order.business,
          birthDate: order.birthDate,
          phone: order.phone,
          executive: order.executive,
          orderDate: order.orderDate
        }))
        .sort((a, b) => {
          // Sort by month and day
          const dateA = new Date(a.birthDate);
          const dateB = new Date(b.birthDate);
          const monthDayA = `${dateA.getMonth()}-${dateA.getDate()}`;
          const monthDayB = `${dateB.getMonth()}-${dateB.getDate()}`;
          return monthDayA.localeCompare(monthDayB);
        });
      
      // Filter and process anniversaries (using anniversaryDate field from order)
      const anniversaries = orders
        .filter(order => order.anniversaryDate && order.anniversaryDate !== null)
        .map(order => ({
          id: order._id,
          clientName: order.contactPerson,
          businessName: order.business,
          anniversaryDate: order.anniversaryDate,
          phone: order.phone,
          executive: order.executive,
          orderDate: order.orderDate
        }))
        .sort((a, b) => {
          // Sort by month and day
          const dateA = new Date(a.anniversaryDate);
          const dateB = new Date(b.anniversaryDate);
          const monthDayA = `${dateA.getMonth()}-${dateA.getDate()}`;
          const monthDayB = `${dateB.getMonth()}-${dateB.getDate()}`;
          return monthDayA.localeCompare(monthDayB);
        });
      
      setBirthdayList(birthdays);
      setAnniversaryList(anniversaries);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatMonthDay = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long'
    });
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateYearsSince = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    let years = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      years--;
    }
    return years > 0 ? `${years} year${years !== 1 ? 's' : ''}` : 'Less than a year';
  };

  const isThisMonth = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date.getMonth() === today.getMonth();
  };

  const isThisWeek = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const currentYear = today.getFullYear();
    const birthDateThisYear = new Date(currentYear, date.getMonth(), date.getDate());
    const diffDays = Math.ceil((birthDateThisYear - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading special dates...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '10px' }}>
        Client Special Dates
      </h2>

      {/* Birthday List Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ 
          marginBottom: '15px', 
          color: '#4CAF50',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span> Birthdays</span>
          <span style={{ 
            fontSize: '14px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '12px' 
          }}>
            {birthdayList.length} clients
          </span>
        </h3>
        
        {birthdayList.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No birthdays recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#4CAF50', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Client Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Business Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Birth Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Age</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Executive</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {birthdayList.map((item, index) => {
                  const thisMonth = isThisMonth(item.birthDate);
                  const thisWeek = isThisWeek(item.birthDate);
                  let status = '';
                  let statusColor = '#666';
                  
                  if (thisWeek) {
                    status = 'Coming Soon!';
                    statusColor = '#FF9800';
                  } else if (thisMonth) {
                    status = 'This Month';
                    statusColor = '#2196F3';
                  } else {
                    status = 'Upcoming';
                    statusColor = '#666';
                  }
                  
                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid #ddd',
                        backgroundColor: thisWeek ? '#FFF3E0' : (index % 2 === 0 ? '#f9f9f9' : 'white')
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.clientName}</td>
                      <td style={{ padding: '12px' }}>{item.businessName}</td>
                      <td style={{ padding: '12px' }}>
                        {formatMonthDay(item.birthDate)}
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                          ({formatDate(item.birthDate)})
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{calculateAge(item.birthDate)} years</td>
                      <td style={{ padding: '12px' }}>{item.phone || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{item.executive || 'N/A'}</td>
                      <td style={{ padding: '12px', color: statusColor, fontWeight: thisWeek ? 'bold' : 'normal' }}>
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anniversary List Section */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          marginBottom: '15px', 
          color: '#FF9800',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span> Anniversaries</span>
          <span style={{ 
            fontSize: '14px', 
            backgroundColor: '#FF9800', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '12px' 
          }}>
            {anniversaryList.length} clients
          </span>
        </h3>
        
        {anniversaryList.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No anniversaries recorded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ backgroundColor: '#FF9800', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Client Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Business Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Anniversary Date</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Years Completed</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Phone</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Executive</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {anniversaryList.map((item, index) => {
                  const thisMonth = isThisMonth(item.anniversaryDate);
                  const thisWeek = isThisWeek(item.anniversaryDate);
                  let status = '';
                  let statusColor = '#666';
                  
                  if (thisWeek) {
                    status = 'Coming Soon!';
                    statusColor = '#FF9800';
                  } else if (thisMonth) {
                    status = 'This Month';
                    statusColor = '#2196F3';
                  } else {
                    status = 'Upcoming';
                    statusColor = '#666';
                  }
                  
                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: '1px solid #ddd',
                        backgroundColor: thisWeek ? '#FFF3E0' : (index % 2 === 0 ? '#f9f9f9' : 'white')
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{item.clientName}</td>
                      <td style={{ padding: '12px' }}>{item.businessName}</td>
                      <td style={{ padding: '12px' }}>
                        {formatMonthDay(item.anniversaryDate)}
                        <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>
                          ({formatDate(item.anniversaryDate)})
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{calculateYearsSince(item.anniversaryDate)}</td>
                      <td style={{ padding: '12px' }}>{item.phone || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{item.executive || 'N/A'}</td>
                      <td style={{ padding: '12px', color: statusColor, fontWeight: thisWeek ? 'bold' : 'normal' }}>
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          table {
            font-size: 10px !important;
          }
          th, td {
            padding: 6px !important;
          }
        }
        
        @media (max-width: 768px) {
          th, td {
            padding: 8px !important;
            font-size: 12px !important;
          }
          h2, h3 {
            font-size: 18px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AnniversaryList;