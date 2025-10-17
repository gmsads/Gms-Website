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
  // State declarations (keep your existing state declarations)
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  
  // Separate state for current remark input and remarks history
  const [currentRemarks, setCurrentRemarks] = useState({});
  const [remarksHistory, setRemarksHistory] = useState(() => {
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

  // Component styles - UPDATED FILTER STYLES
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
    // UPDATED: More compact filter container
    compactFilterContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      padding: '12px 15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      fontSize: '13px',
    },
    compactFilterGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    compactFilterLabel: {
      fontWeight: '600',
      fontSize: '13px',
      color: '#003366',
      whiteSpace: 'nowrap',
    },
    compactFilterSelect: {
      padding: '6px 8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '13px',
      minWidth: '110px',
      height: '32px',
      backgroundColor: 'white',
    },
    compactSearchInput: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '13px',
      minWidth: '180px',
      height: '32px',
    },
    filterDivider: {
      width: '1px',
      height: '20px',
      backgroundColor: '#ddd',
      margin: '0 5px',
    },
    // Keep all your existing styles below...
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
    remarksHistory: {
      marginTop: '10px',
      maxHeight: '200px',
      overflowY: 'auto',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      padding: '10px',
      backgroundColor: '#fafafa',
    },
    remarkItem: {
      padding: '8px',
      marginBottom: '8px',
      borderLeft: '3px solid #4CAF50',
      backgroundColor: 'white',
      borderRadius: '4px',
    },
    remarkText: {
      marginBottom: '4px',
      fontSize: '14px',
    },
    remarkTimestamp: {
      fontSize: '12px',
      color: '#666',
      fontStyle: 'italic',
    },
    noRemarks: {
      fontSize: '14px',
      color: '#999',
      textAlign: 'center',
      padding: '10px',
    },
    cardsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
      gap: '20px',
      marginTop: '20px',
    },
    serviceCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    serviceCardHover: {
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
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

  // Generate years from 2020 to 2030
  const availableYears = useMemo(() => {
    const years = [];
    for (let year = 2020; year <= 2030; year++) {
      years.push(year);
    }
    return years.sort((a, b) => b - a); // Sort descending (newest first)
  }, []);

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
                    updatedAt: new Date().toISOString()
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
        updatedBy: currentUser
      });

      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
      setRefreshTrigger(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // Handle current remark input change
  const handleCurrentRemarkChange = (orderId, rowIndex, value) => {
    const key = `${orderId}-${rowIndex}`;
    setCurrentRemarks(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle saving remark with timestamp
  const handleSaveRemark = (orderId, rowIndex) => {
    const key = `${orderId}-${rowIndex}`;
    const currentRemark = currentRemarks[key] || '';
    
    if (!currentRemark.trim()) {
      alert('Please enter a remark before saving');
      return;
    }

    const timestamp = new Date().toISOString();
    const newRemarkEntry = {
      text: currentRemark,
      timestamp: timestamp,
      user: currentUser
    };

    // Get existing remarks from localStorage
    const savedRemarks = JSON.parse(localStorage.getItem('serviceRemarks') || '{}');
    
    // Initialize or update remarks array for this row
    const existingRemarks = savedRemarks[key] || [];
    const updatedRemarks = [newRemarkEntry, ...existingRemarks]; // Newest first
    
    // Update localStorage
    const updatedRemarksData = {
      ...savedRemarks,
      [key]: updatedRemarks
    };
    
    localStorage.setItem('serviceRemarks', JSON.stringify(updatedRemarksData));
    setRemarksHistory(updatedRemarksData);

    // Clear the current input field
    setCurrentRemarks(prev => ({
      ...prev,
      [key]: ''
    }));

    // Optionally send to API
    // axios.put('/api/update-remark', {
    //   orderId,
    //   rowIndex,
    //   remarks: updatedRemarks
    // });

    console.log('Remark saved:', newRemarkEntry);
  };

  // Get remarks history for a specific row
  const getRemarksForRow = (orderId, rowIndex) => {
    const key = `${orderId}-${rowIndex}`;
    return remarksHistory[key] || [];
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  // Get available months from orders data (keeping this for dynamic months if needed)
  const availableMonths = useMemo(() => {
    const months = new Set();
    
    allOrders.forEach(order => {
      const orderDate = order.createdAt || order.orderDate;
      if (orderDate) {
        const month = new Date(orderDate).getMonth() + 1; // getMonth() returns 0-11
        months.add(month);
      }
    });
    
    return Array.from(months).sort((a, b) => a - b); // Sort ascending
  }, [allOrders]);

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

  // Sort orders by creation date (newest first) and filter by search term, status, year and month
  const sortedAndFilteredOrders = useMemo(() => {
    // First sort orders by creation date (newest first)
    const sortedOrders = [...allOrdersWithStatus].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.orderDate || 0);
      const dateB = new Date(b.createdAt || b.orderDate || 0);
      return dateB - dateA; // Newest first
    });

    // Filter orders based on search term, status filter, year filter, and month filter
    const searchLower = searchTerm.toLowerCase();
    
    return sortedOrders
      .map(order => ({
        ...order,
        rows: order.rows.filter(row => {
          const displayStatus = localStatuses[`${order._id}-${row.originalIndex}`] || row.status || STATUS.PENDING;
          const orderDate = order.createdAt || order.orderDate;
          const orderYear = orderDate ? new Date(orderDate).getFullYear() : null;
          const orderMonth = orderDate ? new Date(orderDate).getMonth() + 1 : null;
          
          // Apply status filter
          let statusMatch = true;
          if (statusFilter === 'PENDING') {
            statusMatch = displayStatus !== STATUS.COMPLETED;
          } else if (statusFilter === 'COMPLETED') {
            statusMatch = displayStatus === STATUS.COMPLETED;
          }
          
          // Apply year filter
          let yearMatch = true;
          if (yearFilter !== 'ALL' && orderYear) {
            yearMatch = orderYear.toString() === yearFilter;
          }
          
          // Apply month filter
          let monthMatch = true;
          if (monthFilter !== 'ALL' && orderMonth) {
            monthMatch = orderMonth.toString() === monthFilter;
          }
          
          // Apply search filter
          const searchMatch = !searchTerm.trim() || 
            (order.orderNo && order.orderNo.toLowerCase().includes(searchLower)) ||
            (order.business && order.business.toLowerCase().includes(searchLower)) ||
            (order.contactPerson && order.contactPerson.toLowerCase().includes(searchLower)) ||
            (row.requirement && row.requirement.toLowerCase().includes(searchLower)) ||
            (displayStatus && displayStatus.toLowerCase().includes(searchLower)) ||
            (row.assignedExecutive && row.assignedExecutive.toLowerCase().includes(searchLower));
          
          return statusMatch && yearMatch && monthMatch && searchMatch;
        })
      }))
      .filter(order => order.rows.length > 0);
  }, [allOrdersWithStatus, searchTerm, statusFilter, yearFilter, monthFilter, localStatuses]);

  // Count services by status for display
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      pending: 0,
      completed: 0
    };

    allOrdersWithStatus.forEach(order => {
      order.rows.forEach(row => {
        const displayStatus = localStatuses[`${order._id}-${row.originalIndex}`] || row.status || STATUS.PENDING;
        counts.all++;
        if (displayStatus === STATUS.COMPLETED) {
          counts.completed++;
        } else {
          counts.pending++;
        }
      });
    });

    return counts;
  }, [allOrdersWithStatus, localStatuses]);

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
          // If the all-services endpoint doesn't exist, fall back to the regular orders endpoint
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
        setRemarksHistory(JSON.parse(e.newValue || '{}'));
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

      {/* UPDATED: More compact and better aligned filter container */}
      <div style={styles.compactFilterContainer}>
        {/* Search Group */}
        <div style={styles.compactFilterGroup}>
          <label style={styles.compactFilterLabel}>Search:</label>
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.compactSearchInput}
          />
        </div>

        <div style={styles.filterDivider}></div>

        {/* Status Filter Group */}
        <div style={styles.compactFilterGroup}>
          <label style={styles.compactFilterLabel}>Status:</label>
          <select
            style={styles.compactFilterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All ({statusCounts.all})</option>
            <option value="PENDING">Pending ({statusCounts.pending})</option>
            <option value="COMPLETED">Completed ({statusCounts.completed})</option>
          </select>
        </div>

        <div style={styles.filterDivider}></div>

        {/* Year Filter Group */}
        <div style={styles.compactFilterGroup}>
          <label style={styles.compactFilterLabel}>Year:</label>
          <select
            style={styles.compactFilterSelect}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="ALL">All Years</option>
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterDivider}></div>

        {/* Month Filter Group */}
        <div style={styles.compactFilterGroup}>
          <label style={styles.compactFilterLabel}>Month:</label>
          <select
            style={styles.compactFilterSelect}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="ALL">All Months</option>
            <option value="1">Jan</option>
            <option value="2">Feb</option>
            <option value="3">Mar</option>
            <option value="4">Apr</option>
            <option value="5">May</option>
            <option value="6">Jun</option>
            <option value="7">Jul</option>
            <option value="8">Aug</option>
            <option value="9">Sep</option>
            <option value="10">Oct</option>
            <option value="11">Nov</option>
            <option value="12">Dec</option>
          </select>
        </div>
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

      <div style={styles.cardsContainer}>
        {sortedAndFilteredOrders.length === 0 ? (
          <div style={styles.noServices}>
            {searchTerm || statusFilter !== 'ALL' || yearFilter !== 'ALL' || monthFilter !== 'ALL'
              ? `No ${statusFilter.toLowerCase() !== 'all' ? statusFilter.toLowerCase() : ''} services match your filters` 
              : 'No services found'
            }
          </div>
        ) : (
          sortedAndFilteredOrders.flatMap(order =>
            order.rows.map(row => {
              const rowKey = `${order._id}-${row.originalIndex}`;
              const displayStatus = localStatuses[rowKey] || row.status || STATUS.PENDING;
              const rowRemarksHistory = getRemarksForRow(order._id, row.originalIndex);
              
              return (
                <div key={row.rowKey} style={{...styles.serviceCard, ...styles.serviceCardHover}}>
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
                    <div style={styles.label}>Add Remark:</div>
                    <input
                      type="text"
                      style={styles.remarkInput}
                      value={currentRemarks[rowKey] || ''}
                      onChange={(e) => handleCurrentRemarkChange(order._id, row.originalIndex, e.target.value)}
                      placeholder="Add a new remark here..."
                    />
                    <button 
                      style={styles.saveButton}
                      onClick={() => handleSaveRemark(order._id, row.originalIndex)}
                      disabled={loading}
                    >
                      Save Remark
                    </button>

                    {/* Remarks History */}
                    {rowRemarksHistory.length > 0 && (
                      <div style={styles.remarksHistory}>
                        <div style={styles.label}>Remarks History:</div>
                        {rowRemarksHistory.map((remark, index) => (
                          <div key={index} style={styles.remarkItem}>
                            <div style={styles.remarkText}>{remark.text}</div>
                            <div style={styles.remarkTimestamp}>
                              {formatTimestamp(remark.timestamp)} by {remark.user || 'Unknown'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
    </div>
  );
};

export default ServiceUpdate;