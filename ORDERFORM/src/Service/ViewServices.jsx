import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const STATUS = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  ONBOARDING: 'Onboarding',
  INSTALLATION_PENDING: 'Installation Pending',
  DESIGN_PENDING: 'Design Pending',
  PRINTING: 'Printing',
  CUSTOMIZE: 'Customize'
};

const ViewServices = () => {
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

  // Updated Component styles - More compact and grid-friendly
  const styles = {
    container: {
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#f5f7fa',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1a237e',
      margin: '0',
    },
    searchContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '25px',
      position: 'relative',
    },
    searchInput: {
      padding: '12px 16px 12px 42px',
      borderRadius: '12px',
      border: '2px solid #e0e0e0',
      fontSize: '15px',
      width: '100%',
      maxWidth: '500px',
      backgroundColor: 'white',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    searchIcon: {
      position: 'absolute',
      left: '15px',
      color: '#666',
    },
    clearButton: {
      position: 'absolute',
      right: '15px',
      background: 'none',
      border: 'none',
      color: '#666',
      cursor: 'pointer',
      fontSize: '18px',
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '20px',
      marginTop: '20px',
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      border: '1px solid #e8eaf6',
      transition: 'all 0.3s ease',
      height: 'fit-content',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
    },
    cardHeader: {
      borderBottom: '2px solid #f0f2ff',
      paddingBottom: '12px',
      marginBottom: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    orderNumber: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#1a237e',
      backgroundColor: '#e8eaf6',
      padding: '4px 10px',
      borderRadius: '20px',
    },
    deliveryDate: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#5c6bc0',
      backgroundColor: '#f0f2ff',
      padding: '4px 10px',
      borderRadius: '20px',
    },
    creatorInfo: {
      backgroundColor: '#f0f7ff',
      padding: '10px',
      borderRadius: '10px',
      marginBottom: '15px',
      fontSize: '12px',
      color: '#1565c0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    creatorLabel: {
      fontWeight: '600',
      marginRight: '8px',
    },
    field: {
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'flex-start',
    },
    label: {
      fontWeight: '600',
      minWidth: '120px',
      color: '#444',
      fontSize: '13px',
      opacity: 0.8,
    },
    value: {
      flex: '1',
      fontSize: '14px',
      color: '#222',
      fontWeight: '500',
      wordBreak: 'break-word',
    },
    serviceStatus: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      display: 'inline-block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
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
      backgroundColor: '#E6EE9C',
      color: '#827717',
    },
    noServices: {
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: 'white',
      borderRadius: '16px',
      fontSize: '18px',
      color: '#666',
      gridColumn: '1 / -1',
      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    },
    userBadge: {
      backgroundColor: '#1a237e',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    loading: {
      textAlign: 'center',
      padding: '60px 20px',
      fontSize: '18px',
      color: '#666',
      gridColumn: '1 / -1',
    },
    dropdown: {
      padding: '8px 12px',
      borderRadius: '10px',
      border: '2px solid #e0e0e0',
      backgroundColor: 'white',
      fontSize: '14px',
      flex: '1',
      cursor: 'pointer',
      transition: 'border-color 0.3s ease',
      '&:focus': {
        outline: 'none',
        borderColor: '#5c6bc0',
      },
    },
    refreshButton: {
      padding: '10px 20px',
      backgroundColor: '#1a237e',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: '#0d1844',
        transform: 'translateY(-2px)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    error: {
      color: '#d32f2f',
      backgroundColor: '#ffebee',
      padding: '15px',
      borderRadius: '12px',
      marginBottom: '25px',
      gridColumn: '1 / -1',
      fontSize: '14px',
    },
    remarkInput: {
      padding: '10px',
      borderRadius: '10px',
      border: '2px solid #e0e0e0',
      width: '100%',
      fontSize: '14px',
      transition: 'border-color 0.3s ease',
      marginTop: '5px',
      '&:focus': {
        outline: 'none',
        borderColor: '#5c6bc0',
      },
    },
    remarkContainer: {
      marginTop: '15px',
      paddingTop: '15px',
      borderTop: '2px dashed #f0f2ff',
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      marginTop: '8px',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: '#388e3c',
        transform: 'translateY(-2px)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    assignButton: {
      padding: '10px 20px',
      backgroundColor: '#FF9800',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      marginTop: '12px',
      fontSize: '14px',
      fontWeight: '600',
      width: '100%',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: '#F57C00',
        transform: 'translateY(-2px)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    assignSection: {
      marginTop: '20px',
      padding: '15px',
      backgroundColor: '#FFF8E1',
      borderRadius: '12px',
      border: '2px dashed #FFB300',
    },
    successPopup: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#4BB543',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '350px',
      animation: 'slideIn 0.3s ease',
    },
    successTitle: {
      fontSize: '16px',
      fontWeight: '700',
      marginBottom: '5px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    successItem: {
      display: 'flex',
      gap: '10px',
      fontSize: '14px',
    },
    successLabel: {
      fontWeight: '600',
      minWidth: '100px',
      opacity: 0.9,
    },
    closeButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'none',
      border: 'none',
      color: 'white',
      cursor: 'pointer',
      fontSize: '18px',
      padding: '5px',
      '&:hover': {
        opacity: 0.8,
      },
    },
    statusIndicator: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '6px',
      height: '100%',
      borderTopLeftRadius: '16px',
      borderBottomLeftRadius: '16px',
    },
    statusDropdown: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginTop: '10px',
    },
    badge: {
      padding: '3px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: '#e0e0e0',
      color: '#666',
    },
    requirementBadge: {
      backgroundColor: '#E3F2FD',
      color: '#1565C0',
    },
    contactBadge: {
      backgroundColor: '#F3E5F5',
      color: '#7B1FA2',
    },
  };

  // Add keyframes for animation
  const keyframesStyle = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;

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

  // Get status indicator color
  const getStatusIndicatorColor = (status) => {
    switch(status) {
      case STATUS.COMPLETED: return '#2E7D32';
      case STATUS.INSTALLATION_PENDING: return '#1565C0';
      case STATUS.DESIGN_PENDING: return '#6A1B9A';
      case STATUS.PRINTING: return '#FF8F00';
      case STATUS.CUSTOMIZE: return '#827717';
      default: return '#E65100';
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

      // Refresh orders
      const ordersRes = await axios.get('/api/orders/pending-services');
      const formattedData = ordersRes.data.map(order => ({
        ...order,
        rows: order.rows.map((row, idx) => ({
          ...row,
          originalIndex: idx,
          rowKey: generateRowKey(order._id, idx),
        }))
      }));
      
      setAllOrders(formattedData);
      
      // Set success info
      const order = allOrders.find(o => o._id === orderId);
      setAssignedInfo({
        orderNo: order.orderNo,
        executiveName: executive.name,
        executivePhone: executive.phone,
        requirement: order.rows[rowIndex].requirement,
        quantity: order.rows[rowIndex].quantity || 'N/A'
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

  // Filter orders assigned to current user OR unassigned orders
  const assignedOrders = useMemo(() => {
    return allOrders
      .map(order => ({
        ...order,
        rows: order.rows
          // Show orders assigned to current user OR unassigned orders
          .filter(row => !row.assignedExecutive || row.assignedExecutive === currentUser)
          .map((row) => {
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
  }, [allOrders, currentUser, localStatuses]);

  // Sort orders by creation date (newest first) and filter by search term
  const sortedAndFilteredOrders = useMemo(() => {
    // First sort orders by creation date (newest first)
    const sortedOrders = [...assignedOrders].sort((a, b) => {
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
            (row.quantity && row.quantity.toString().toLowerCase().includes(searchLower))
          );
        })
      }))
      .filter(order => order.rows.length > 0);
  }, [assignedOrders, searchTerm]);

  // Flatten rows for grid display
  const flattenedServices = useMemo(() => {
    const services = [];
    sortedAndFilteredOrders.forEach(order => {
      order.rows.forEach(row => {
        services.push({
          ...row,
          order,
          rowKey: row.rowKey,
          displayStatus: row.displayStatus
        });
      });
    });
    return services;
  }, [sortedAndFilteredOrders]);

  // Fetch orders data
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!currentUser) return;

        const response = await axios.get('/api/orders/pending-services');
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
        setError(err.response?.data?.message || err.message || 'Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, refreshTrigger]);

  if (loading && !error) return <div style={styles.loading}>Loading services...</div>;
  if (!currentUser) return <div style={styles.container}>Please login to view services</div>;

  return (
    <div style={styles.container}>
      {/* Add keyframes style */}
      <style>{keyframesStyle}</style>

      <div style={styles.header}>
        <h2 style={styles.title}>My Services Dashboard</h2>
        <div>
          <span style={styles.userBadge}>
            👤 {currentUser}
          </span>
          <button 
            style={styles.refreshButton}
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Search input */}
      <div style={styles.searchContainer}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          placeholder="Search by order number, business, contact, requirement, quantity, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        {searchTerm && (
          <button 
            style={styles.clearButton}
            onClick={() => setSearchTerm('')}
          >
            ✕
          </button>
        )}
      </div>

      {error && <div style={styles.error}>❌ {error}</div>}

      {showAssignSuccess && (
        <div style={styles.successPopup}>
          <button 
            style={styles.closeButton} 
            onClick={() => setShowAssignSuccess(false)}
          >
            ×
          </button>
          <div style={styles.successTitle}>
            <span>✅</span>
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
          <div style={styles.successItem}>
            <span style={styles.successLabel}>Quantity:</span>
            <span>{assignedInfo.quantity}</span>
          </div>
        </div>
      )}

      <div style={styles.gridContainer}>
        {flattenedServices.length === 0 ? (
          <div style={styles.noServices}>
            {searchTerm ? 'No services match your search' : 'No services assigned to you'}
          </div>
        ) : (
          flattenedServices.map((service, index) => {
            const rowKey = service.rowKey;
            const displayStatus = service.displayStatus;
            const order = service.order;
            const indicatorColor = getStatusIndicatorColor(displayStatus);
            
            return (
              <div key={rowKey} style={styles.card}>
                {/* Status indicator bar */}
                <div 
                  style={{
                    ...styles.statusIndicator,
                    backgroundColor: indicatorColor
                  }}
                />
                
                <div style={styles.cardHeader}>
                  <div style={styles.orderNumber}>
                    #{order.orderNo || 'N/A'}
                  </div>
                  <div style={styles.deliveryDate}>
                    📅 {service.deliveryDate ? new Date(service.deliveryDate).toLocaleDateString() : 'No date'}
                  </div>
                </div>

                <div style={styles.creatorInfo}>
                  <div>
                    <span style={styles.creatorLabel}>Created by:</span>
                    <span>{order.executive || 'Not specified'}</span>
                  </div>
                  <div>
                    {new Date(order.createdAt || order.orderDate || '').toLocaleDateString()}
                  </div>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Business:</span>
                  <span style={styles.value}>{order.business || 'N/A'}</span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Contact:</span>
                  <span style={styles.value}>
                    <div>{order.contactPerson || 'N/A'}</div>
                    <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                      📞 {order.phone || 'No phone'}
                    </div>
                  </span>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Requirement:</span>
                  <span style={styles.value}>
                    {service.requirement || 'No details'}
                    {service.quantity && (
                      <span style={{...styles.badge, ...styles.requirementBadge, marginLeft: '8px'}}>
                        Qty: {service.quantity}
                      </span>
                    )}
                  </span>
                </div>

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
                    onChange={(e) => handleStatusChange(order._id, service.originalIndex, e.target.value)}
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
                  <div style={{...styles.label, marginBottom: '5px'}}>Remark:</div>
                  <input
                    type="text"
                    style={styles.remarkInput}
                    value={remarks[rowKey] || ''}
                    onChange={(e) => handleRemarkChange(order._id, service.originalIndex, e.target.value)}
                    placeholder="Add any remarks here..."
                  />
                  <button 
                    style={styles.saveButton}
                    onClick={() => handleSaveRemark(order._id, service.originalIndex)}
                    disabled={loading}
                  >
                    💾 Save Remark
                  </button>
                </div>

                {/* Always show the assignment section for unassigned services */}
                {(!service.assignedExecutive || service.assignedExecutive === currentUser) && (
                  <div style={styles.assignSection}>
                    <div style={{fontSize: '13px', fontWeight: '600', color: '#FF6F00', marginBottom: '8px'}}>
                      Assign Service Executive:
                    </div>
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

                    <button
                      style={styles.assignButton}
                      disabled={!selectedExecutive || assigningOrder !== rowKey}
                      onClick={() => handleAssignService(order._id, service.originalIndex)}
                    >
                      👥 Assign Service
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ViewServices;