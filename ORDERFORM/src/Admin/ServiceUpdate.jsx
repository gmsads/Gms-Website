import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const STATUS = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  INSTALLATION_PENDING: 'Installation Pending',
  DESIGN_PENDING: 'Design Pending',
  PRINTING: 'Printing',
  CUSTOMIZE: 'Customize'
};

const ServiceUpdate = () => {
  // State declarations
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [serviceExecutives, setServiceExecutives] = useState([]);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [showAssignSuccess, setShowAssignSuccess] = useState(false);
  const [assignedInfo, setAssignedInfo] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // Initialize remarks from localStorage
  const [remarks, setRemarks] = useState(() => {
    const savedRemarks = localStorage.getItem('serviceRemarks');
    return savedRemarks ? JSON.parse(savedRemarks) : {};
  });
  
  // Initialize statuses from localStorage
  const [localStatuses, setLocalStatuses] = useState(() => {
    const savedStatuses = localStorage.getItem('serviceStatuses');
    return savedStatuses ? JSON.parse(savedStatuses) : {};
  });

  const currentUser = localStorage.getItem('userName') || '';

  // Helper function to generate unique row keys
  const generateRowKey = (orderId, rowIndex) => `${orderId}-${rowIndex}`;

  // Component styles
  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px',
    },
    searchContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px',
    },
    searchInput: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '14px',
      minWidth: '250px',
    },
    card: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      marginBottom: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #003366',
    },
    creatorInfo: {
      backgroundColor: '#e9f5ff',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '15px',
      borderLeft: '4px solid #003366',
    },
    field: {
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
    },
    label: {
      fontWeight: 'bold',
      minWidth: '150px',
      color: '#333',
    },
    value: {
      flex: '1',
    },
    serviceStatus: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 'bold',
      display: 'inline-block',
    },
    statusPending: {
      backgroundColor: '#FFF3E0',
      color: '#E65100',
    },
    statusCompleted: {
      backgroundColor: '#E8F5E9',
      color: '#2E7D32',
    },
    statusInstallationPending: {
      backgroundColor: '#E3F2FD',
      color: '#1565C0',
    },
    statusDesignPending: {
      backgroundColor: '#F3E5F5',
      color: '#6A1B9A',
    },
    statusPrinting: {
      backgroundColor: '#FFECB3',
      color: '#FF8F00',
    },
    statusCustomize: {
      backgroundColor: '#DCE775',
      color: '#827717',
    },
    noServices: {
      textAlign: 'center',
      padding: '40px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      fontSize: '18px',
    },
    userBadge: {
      backgroundColor: '#003366',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '14px',
    },
    loading: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '18px',
    },
    dropdown: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      backgroundColor: '#fff',
      fontSize: '14px',
      flex: '1',
      cursor: 'pointer',
    },
    refreshButton: {
      padding: '8px 16px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginLeft: '10px',
    },
    error: {
      color: '#d32f2f',
      backgroundColor: '#fdecea',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '20px',
    },
    deliveryDateHighlight: {
      backgroundColor: '#fff8e1',
      padding: '8px',
      borderRadius: '4px',
      marginBottom: '15px',
      fontWeight: 'bold',
    },
    remarkInput: {
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      width: '100%',
      marginTop: '5px'
    },
    remarkContainer: {
      marginTop: '10px'
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '5px',
      marginLeft: '5px',
    },
    assignButton: {
      padding: '8px 16px',
      backgroundColor: '#FF9800',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '10px',
    },
    assignSection: {
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#FFF3E0',
      borderRadius: '4px',
      border: '1px dashed #FF9800',
    },
    successPopup: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#4BB543',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px',
    },
    successTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    successItem: {
      display: 'flex',
      gap: '10px'
    },
    successLabel: {
      fontWeight: 'bold',
      minWidth: '120px'
    },
    closeButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '16px'
    },
    assignedInfo: {
      backgroundColor: '#e8f5e9',
      padding: '8px',
      borderRadius: '4px',
      marginTop: '10px',
      fontSize: '14px'
    },
  };

  // Get status style based on status value
  const getStatusStyle = (status) => {
    const baseStyle = styles.serviceStatus;
    switch(status) {
      case STATUS.COMPLETED: return { ...baseStyle, ...styles.statusCompleted };
      case STATUS.INSTALLATION_PENDING: return { ...baseStyle, ...styles.statusInstallationPending };
      case STATUS.DESIGN_PENDING: return { ...baseStyle, ...styles.statusDesignPending };
      case STATUS.PRINTING: return { ...baseStyle, ...styles.statusPrinting };
      case STATUS.CUSTOMIZE: return { ...baseStyle, ...styles.statusCustomize };
      default: return { ...baseStyle, ...styles.statusPending };
    }
  };

  // Fetch service executives
  useEffect(() => {
    const fetchExecutives = async () => {
      try {
        const response = await axios.get('/api/service-executives');
        setServiceExecutives(response.data);
      } catch (err) {
        console.error('Failed to fetch service executives', err);
      }
    };
    
    fetchExecutives();
  }, []);

  // Handle status change
  const handleStatusChange = async (orderId, originalIndex, newStatus) => {
    try {
      setLoading(true);
      
      const rowKey = `${orderId}-${originalIndex}`;
      
      // Update local status
      const updatedStatuses = {
        ...localStatuses,
        [rowKey]: newStatus
      };
      setLocalStatuses(updatedStatuses);
      localStorage.setItem('serviceStatuses', JSON.stringify(updatedStatuses));

      // Update UI optimistically
      setAllOrders(prevOrders => 
        prevOrders.map(order => {
          if (order._id === orderId) {
            const updatedRows = order.rows.map((row, idx) => 
              idx === originalIndex 
                ? { 
                    ...row, 
                    status: newStatus,
                    isCompleted: newStatus === STATUS.COMPLETED,
                    updatedAt: new Date().toISOString(),
                    remark: remarks[rowKey] || ''
                  } 
                : row
            );
            return { ...order, rows: updatedRows };
          }
          return order;
        })
      );

      // API call to update status
      await axios.put('/api/update-status', {
        orderId,
        rowIndex: originalIndex,
        newStatus,
        updatedBy: currentUser,
        remark: remarks[rowKey] || ''
      });

      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      setRefreshTrigger(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Handle remark input change
  const handleRemarkChange = (orderId, rowIndex, value) => {
    const key = `${orderId}-${rowIndex}`;
    setRemarks(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle saving remark
  const handleSaveRemark = (orderId, rowIndex) => {
    const key = `${orderId}-${rowIndex}`;
    const currentRemark = remarks[key] || '';
    
    // Update localStorage
    const updatedRemarks = {
      ...JSON.parse(localStorage.getItem('serviceRemarks') || '{}'),
      [key]: currentRemark
    };
    localStorage.setItem('serviceRemarks', JSON.stringify(updatedRemarks));

    // Optionally send to API
    // axios.put('/api/update-remark', {
    //   orderId,
    //   rowIndex,
    //   remark: currentRemark
    // });
  };

  // Handle service assignment
  const handleAssignService = async (orderId, rowIndex) => {
    if (!selectedExecutive) {
      alert('Please select a service executive');
      return;
    }

    const executive = serviceExecutives.find(exec => exec._id === selectedExecutive);

    try {
      await axios.put(`/api/orders/${orderId}`, {
        [`rows.${rowIndex}.assignedExecutive`]: executive.name,
        [`rows.${rowIndex}.assignedExecutiveId`]: executive._id,
        [`rows.${rowIndex}.assignedExecutivePhone`]: executive.phone,
        [`rows.${rowIndex}.assignedAt`]: new Date().toISOString()
      });

      // Refresh orders - use the existing endpoint as fallback
      try {
        const ordersRes = await axios.get('/api/orders/all-services');
        const formattedData = ordersRes.data.map(order => ({
          ...order,
          rows: order.rows.map((row, idx) => ({
            ...row,
            originalIndex: idx,
            rowKey: generateRowKey(order._id, idx),
          }))
        }));
        
        setAllOrders(formattedData);
      } catch (err) {
        // If the all-services endpoint doesn't exist, fall back to the regular orders endpoint
        console.log('Fallback to regular orders endpoint');
        const ordersRes = await axios.get('/api/orders');
        const formattedData = ordersRes.data.map(order => ({
          ...order,
          rows: order.rows.map((row, idx) => ({
            ...row,
            originalIndex: idx,
            rowKey: generateRowKey(order._id, idx),
          }))
        }));
        
        setAllOrders(formattedData);
      }
      
      // Set success info
      const order = allOrders.find(o => o._id === orderId);
      setAssignedInfo({
        orderNo: order.orderNo,
        executiveName: executive.name,
        executivePhone: executive.phone,
        requirement: order.rows[rowIndex].requirement
      });
      
      setShowAssignSuccess(true);
      setSelectedExecutive('');
      setAssigningOrder(null);
      
      setTimeout(() => setShowAssignSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Assignment failed');
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Show ALL orders (not filtered by executive)
  const allOrdersWithStatus = useMemo(() => {
    return allOrders
      .map(order => ({
        ...order,
        rows: order.rows.map((row) => {
          const rowKey = generateRowKey(order._id, row.originalIndex);
          const displayStatus = localStatuses[rowKey] || row.status || STATUS.PENDING;
          
          return {
            ...row,
            originalIndex: order.rows.findIndex(r => r._id === row._id),
            rowKey,
            displayStatus
          };
        })
      }))
      .filter(order => order.rows.length > 0);
  }, [allOrders, localStatuses]);

  // Sort orders by creation date (newest first) and filter by search term
  const sortedAndFilteredOrders = useMemo(() => {
    // First sort orders by creation date (newest first)
    const sortedOrders = [...allOrdersWithStatus].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.orderDate || 0);
      const dateB = new Date(b.createdAt || b.orderDate || 0);
      return dateB - dateA; // Newest first
    });

    // If no search term, return all sorted orders
    if (!searchTerm.trim()) return sortedOrders;

    // Filter orders based on search term
    const searchLower = searchTerm.toLowerCase();
    return sortedOrders
      .map(order => ({
        ...order,
        rows: order.rows.filter(row => {
          // Search through various fields
          return (
            (order.orderNo && order.orderNo.toLowerCase().includes(searchLower)) ||
            (order.business && order.business.toLowerCase().includes(searchLower)) ||
            (order.contactPerson && order.contactPerson.toLowerCase().includes(searchLower)) ||
            (row.requirement && row.requirement.toLowerCase().includes(searchLower)) ||
            (row.displayStatus && row.displayStatus.toLowerCase().includes(searchLower)) ||
            (row.assignedExecutive && row.assignedExecutive.toLowerCase().includes(searchLower))
          );
        })
      }))
      .filter(order => order.rows.length > 0);
  }, [allOrdersWithStatus, searchTerm]);

  // Fetch ALL orders data (with fallback if all-services endpoint doesn't exist)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!currentUser) return;

        // Try the all-services endpoint first
        try {
          const response = await axios.get('/api/orders/all-services');
          const formattedData = response.data.map(order => ({
            ...order,
            rows: order.rows.map((row, idx) => ({
              ...row,
              originalIndex: idx,
              rowKey: generateRowKey(order._id, idx),
            }))
          }));

          setAllOrders(formattedData);
        } catch (err) {
          // If all-services endpoint doesn't exist, fall back to the regular orders endpoint
          console.log('Using fallback endpoint: /api/orders');
          const response = await axios.get('/api/orders');
          const formattedData = response.data.map(order => ({
            ...order,
            rows: order.rows.map((row, idx) => ({
              ...row,
              originalIndex: idx,
              rowKey: generateRowKey(order._id, idx),
            }))
          }));

          setAllOrders(formattedData);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, refreshTrigger]);

  // Listen for changes in localStorage to sync with ViewServices
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'serviceRemarks') {
        setRemarks(JSON.parse(e.newValue || '{}'));
      } else if (e.key === 'serviceStatuses') {
        setLocalStatuses(JSON.parse(e.newValue || '{}'));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading && !error) return <div style={styles.loading}>Loading services...</div>;
  if (!currentUser) return <div style={styles.container}>Please login to view services</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>All Services - Update Dashboard</h2>
        <div>
          <span style={styles.userBadge}>{currentUser}</span>
          <button 
            style={styles.refreshButton}
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Search input */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by order number, business, contact, requirement, status, or executive..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')}>Clear</button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showAssignSuccess && (
        <div style={styles.successPopup}>
          <button 
            style={styles.closeButton} 
            onClick={() => setShowAssignSuccess(false)}
          >
            ×
          </button>
          <div style={styles.successTitle}>
            <span>✓</span>
            Service Assigned Successfully!
          </div>
          <div style={styles.successItem}>
            <span style={styles.successLabel}>Order No:</span>
            <span>{assignedInfo.orderNo}</span>
          </div>
          <div style={styles.successItem}>
            <span style={styles.successLabel}>Assigned To:</span>
            <span>{assignedInfo.executiveName}</span>
          </div>
          <div style={styles.successItem}>
            <span style={styles.successLabel}>Phone:</span>
            <span>{assignedInfo.executivePhone}</span>
          </div>
          <div style={styles.successItem}>
            <span style={styles.successLabel}>Service:</span>
            <span>{assignedInfo.requirement}</span>
          </div>
        </div>
      )}

      {sortedAndFilteredOrders.length === 0 ? (
        <div style={styles.noServices}>
          {searchTerm ? 'No services match your search' : 'No services found'}
        </div>
      ) : (
        sortedAndFilteredOrders.flatMap(order =>
          order.rows.map(row => {
            const rowKey = `${order._id}-${row.originalIndex}`;
            const displayStatus = localStatuses[rowKey] || row.status || STATUS.PENDING;
            
            return (
              <div key={row.rowKey} style={styles.card}>
                <div style={styles.creatorInfo}>
                  <div style={styles.field}>
                    <span style={styles.label}>Created by:</span>
                    <span style={styles.value}>{order.executive || 'Not specified'}</span>
                  </div>
                  <div style={styles.field}>
                    <span style={styles.label}>Created at:</span>
                    <span style={styles.value}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Not specified'}
                    </span>
                  </div>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Order Number:</span>
                  <span style={styles.value}>{order.orderNo}</span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Delivery Date:</span>
                  <span style={styles.deliveryDateHighlight}>
                    {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Business:</span>
                  <span style={styles.value}>{order.business || 'N/A'}</span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Contact Person:</span>
                  <span style={styles.value}>
                    {order.contactPerson || 'N/A'} ({order.phone || 'No phone'})
                  </span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Requirement:</span>
                  <span style={styles.value}>{row.requirement || 'No details'}</span>
                </div>

                {row.assignedExecutive && (
                  <div style={styles.field}>
                    <span style={styles.label}>Assigned Executive:</span>
                    <span style={styles.value}>
                      {row.assignedExecutive} ({row.assignedExecutivePhone || 'No phone'})
                    </span>
                  </div>
                )}

                <div style={styles.field}>
                  <span style={styles.label}>Current Status:</span>
                  <span style={getStatusStyle(displayStatus)}>
                    {displayStatus}
                  </span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Update Status:</span>
                  <select
                    style={styles.dropdown}
                    value={displayStatus}
                    onChange={(e) => handleStatusChange(order._id, row.originalIndex, e.target.value)}
                    disabled={loading}
                  >
                    {Object.values(STATUS).map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.remarkContainer}>
                  <div style={styles.label}>Remark:</div>
                  <input
                    type="text"
                    style={styles.remarkInput}
                    value={remarks[rowKey] || ''}
                    onChange={(e) => handleRemarkChange(order._id, row.originalIndex, e.target.value)}
                    placeholder="Add any remarks here..."
                  />
                  <button 
                    style={styles.saveButton}
                    onClick={() => handleSaveRemark(order._id, row.originalIndex)}
                    disabled={loading}
                  >
                    Save Remark
                  </button>
                </div>

                {/* Show assignment section for all services */}
                <div style={styles.assignSection}>
                  <div style={styles.field}>
                    <span style={styles.label}>Assign Service Executive:</span>
                    <select
                      style={styles.dropdown}
                      value={assigningOrder === rowKey ? selectedExecutive : ''}
                      onChange={(e) => {
                        setSelectedExecutive(e.target.value);
                        setAssigningOrder(rowKey);
                      }}
                    >
                      <option value="">Select Service Executive</option>
                      {serviceExecutives.map(executive => (
                        <option key={executive._id} value={executive._id}>
                          {executive.name} ({executive.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    style={styles.assignButton}
                    disabled={!selectedExecutive || assigningOrder !== rowKey}
                    onClick={() => handleAssignService(order._id, row.originalIndex)}
                  >
                    {row.assignedExecutive ? 'Reassign Service' : 'Assign Service'}
                  </button>
                </div>
              </div>
            );
          })
        )
      )}
    </div>
  );
};

export default ServiceUpdate;