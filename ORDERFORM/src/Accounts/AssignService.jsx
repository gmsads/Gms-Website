import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function AssignService() {
  // State declarations
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [serviceExecutives, setServiceExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignedInfo, setAssignedInfo] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [assignmentStrategy, setAssignmentStrategy] = useState('round-robin');
  const [specificExecutive, setSpecificExecutive] = useState('');
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const [selectedExecutiveForInactive, setSelectedExecutiveForInactive] = useState(null);
  const [inactiveReason, setInactiveReason] = useState('');
  const [showExecutiveStatusPopup, setShowExecutiveStatusPopup] = useState(false);
  const [executiveStatusMessage, setExecutiveStatusMessage] = useState('');

  // NEW STATES for status and remarks (from ServiceUpdate)
  const [currentRemarks, setCurrentRemarks] = useState({});
  const [remarksHistory, setRemarksHistory] = useState(() => {
    const savedRemarks = localStorage.getItem('serviceRemarks');
    return savedRemarks ? JSON.parse(savedRemarks) : {};
  });
  const [localStatuses, setLocalStatuses] = useState(() => {
    const savedStatuses = localStorage.getItem('serviceStatuses');
    return savedStatuses ? JSON.parse(savedStatuses) : {};
  });

  // REMOVED: Status filter state
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');

  // Status constants (from ServiceUpdate)
  const STATUS = {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    INSTALLATION_PENDING: 'Installation Pending',
    DESIGN_PENDING: 'Design Pending',
    PRINTING: 'Printing',
    CUSTOMIZE: 'Customize'
  };

  const currentUser = localStorage.getItem('userName') || '';

  // Refs for tracking assignment state
  const lastAssignedIndexRef = useRef(-1);
  const isAutoAssigningRef = useRef(false);

  // Helper function to generate unique row keys (from ServiceUpdate)
  const generateRowKey = (orderId, rowIndex) => `${orderId}-${rowIndex}`;

  // Generate years from 2020 to 2030
  const availableYears = ['ALL', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'];

  // Months data
  const availableMonths = [
    { value: 'ALL', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Load last assigned index from localStorage on component mount
  useEffect(() => {
    const savedIndex = localStorage.getItem('lastAssignedExecutiveIndex');
    if (savedIndex !== null) {
      lastAssignedIndexRef.current = parseInt(savedIndex);
    }
  }, []);

  // Fetch orders and executives data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersRes, executivesRes] = await Promise.all([
          axios.get('/api/orders/pending-services'),
          axios.get('/api/service-executives')
        ]);
        
        // Filter only active executives for assignment
        const activeExecutives = executivesRes.data.filter(exec => exec.active !== false);
        
        // Sort orders by creation date (newest first)
        const sortedOrders = ordersRes.data.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dateCreated || Date.now());
          const dateB = new Date(b.createdAt || b.dateCreated || Date.now());
          return dateB - dateA;
        });
        
        // Format orders with row keys (like ServiceUpdate)
        const formattedOrders = sortedOrders.map(order => ({
          ...order,
          rows: order.rows.map((row, idx) => ({
            ...row,
            originalIndex: idx,
            rowKey: generateRowKey(order._id, idx),
          }))
        }));
        
        setOrders(formattedOrders);
        setFilteredOrders(formattedOrders);
        setServiceExecutives(executivesRes.data); // Store all executives for display
        
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch data');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [autoAssignEnabled, assignmentStrategy, specificExecutive]);

  // Auto-assign services when data is loaded and auto-assign is enabled
  useEffect(() => {
    const activeExecutives = getActiveExecutives();
    if (autoAssignEnabled && activeExecutives.length > 0 && orders.length > 0 && !isAutoAssigningRef.current) {
      autoAssignAllServices();
    }
  }, [orders, serviceExecutives, autoAssignEnabled]);

  // UPDATED: Filter orders based on search term and filters (removed status filter)
  useEffect(() => {
    const filterOrders = () => {
      if (orders.length === 0) return;

      const searchLower = searchTerm.toLowerCase();
      
      const filtered = orders
        .map(order => ({
          ...order,
          rows: order.rows.filter(row => {
            if (row.isCompleted) return false;

            const rowKey = `${order._id}-${row.originalIndex}`;
            const displayStatus = localStatuses[rowKey] || row.status || STATUS.PENDING;
            
            // Get order date for year/month filtering
            const orderDate = order.createdAt || order.orderDate;
            const orderYear = orderDate ? new Date(orderDate).getFullYear().toString() : null;
            const orderMonth = orderDate ? (new Date(orderDate).getMonth() + 1).toString() : null;

            // REMOVED: Status filter logic

            // Apply year filter
            let yearMatch = true;
            if (yearFilter !== 'ALL' && orderYear) {
              yearMatch = orderYear === yearFilter;
            }

            // Apply month filter
            let monthMatch = true;
            if (monthFilter !== 'ALL' && orderMonth) {
              monthMatch = orderMonth === monthFilter;
            }

            // Apply search filter - search across all relevant fields
            const searchMatch = !searchTerm.trim() || 
              (order.orderNo && order.orderNo.toLowerCase().includes(searchLower)) ||
              (order.business && order.business.toLowerCase().includes(searchLower)) ||
              (order.contactPerson && order.contactPerson.toLowerCase().includes(searchLower)) ||
              (order.phone && order.phone.includes(searchTerm)) ||
              (order.executive && order.executive.toLowerCase().includes(searchLower)) ||
              (row.requirement && row.requirement.toLowerCase().includes(searchLower)) ||
              (row.assignedExecutive && row.assignedExecutive.toLowerCase().includes(searchLower)) ||
              (displayStatus && displayStatus.toLowerCase().includes(searchLower)) ||
              (row.quantity && row.quantity.toString().includes(searchTerm));

            return yearMatch && monthMatch && searchMatch;
          })
        }))
        .filter(order => order.rows.length > 0);

      setFilteredOrders(filtered);
    };

    filterOrders();
  }, [searchTerm, yearFilter, monthFilter, orders, localStatuses]); // REMOVED: statusFilter from dependencies

  // Get active executives only
  const getActiveExecutives = () => {
    return serviceExecutives.filter(exec => exec.active !== false);
  };

  // Simple round-robin function (only uses active executives)
  const getNextExecutive = () => {
    const activeExecutives = getActiveExecutives();
    if (activeExecutives.length === 0) return null;
    
    if (assignmentStrategy === 'specific-executive') {
      if (!specificExecutive) {
        showExecutiveStatusMessage('Please select a specific executive for assignment');
        return null;
      }
      return activeExecutives.find(exec => exec._id === specificExecutive);
    }
    
    // Round-robin: get next executive in sequence from active executives
    const nextIndex = (lastAssignedIndexRef.current + 1) % activeExecutives.length;
    return activeExecutives[nextIndex];
  };

  // Show executive status message in popup
  const showExecutiveStatusMessage = (message) => {
    setExecutiveStatusMessage(message);
    setShowExecutiveStatusPopup(true);
    setTimeout(() => {
      setShowExecutiveStatusPopup(false);
    }, 3000);
  };

  // Auto-assign all unassigned services (only to active executives)
  const autoAssignAllServices = async () => {
    const activeExecutives = getActiveExecutives();
    if (activeExecutives.length === 0 || isAutoAssigningRef.current) return;
    
    isAutoAssigningRef.current = true;
    
    try {
      const unassignedServices = [];
      
      // Find all unassigned services
      orders.forEach(order => {
        order.rows.forEach((row, rowIndex) => {
          if (!row.isCompleted && !row.assignedExecutive) {
            unassignedServices.push({
              orderId: order._id,
              rowIndex,
              orderNo: order.orderNo,
              requirement: row.requirement
            });
          }
        });
      });

      if (unassignedServices.length === 0) {
        console.log('No unassigned services found');
        return;
      }

      console.log(`Found ${unassignedServices.length} unassigned services`);

      let hasChanges = false;

      for (const service of unassignedServices) {
        const executive = getNextExecutive();
        if (!executive) continue;

        console.log(`Assigning ${service.orderNo} to ${executive.name}`);

        try {
          await axios.put(`/api/orders/${service.orderId}`, {
            [`rows.${service.rowIndex}.assignedExecutive`]: executive.name,
            [`rows.${service.rowIndex}.assignedExecutiveId`]: executive._id,
            [`rows.${service.rowIndex}.assignedExecutivePhone`]: executive.phone,
            [`rows.${service.rowIndex}.assignedAt`]: new Date().toISOString()
          });

          // Update the last assigned index for round-robin
          if (assignmentStrategy === 'round-robin') {
            const executiveIndex = activeExecutives.findIndex(exec => exec._id === executive._id);
            if (executiveIndex !== -1) {
              lastAssignedIndexRef.current = executiveIndex;
              localStorage.setItem('lastAssignedExecutiveIndex', executiveIndex.toString());
            }
          }

          hasChanges = true;

          setAssignedInfo({
            orderNo: service.orderNo,
            executiveName: executive.name,
            executivePhone: executive.phone,
            requirement: service.requirement
          });

        } catch (err) {
          console.error(`Failed to assign ${service.orderNo}:`, err);
        }
      }

      if (hasChanges) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        // Refresh orders
        const ordersRes = await axios.get('/api/orders/pending-services');
        const sortedOrders = ordersRes.data.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dateCreated || Date.now());
          const dateB = new Date(b.createdAt || b.dateCreated || Date.now());
          return dateB - dateA;
        });
        
        // Format orders with row keys
        const formattedOrders = sortedOrders.map(order => ({
          ...order,
          rows: order.rows.map((row, idx) => ({
            ...row,
            originalIndex: idx,
            rowKey: generateRowKey(order._id, idx),
          }))
        }));
        
        setOrders(formattedOrders);
      }

    } catch (err) {
      console.error('Auto-assign error:', err);
    } finally {
      isAutoAssigningRef.current = false;
    }
  };

  // NEW: Handle status change (from ServiceUpdate)
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
      setOrders(prevOrders => 
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
    } finally {
      setLoading(false);
    }
  };

  // NEW: Handle current remark input change (from ServiceUpdate)
  const handleCurrentRemarkChange = (orderId, rowIndex, value) => {
    const key = `${orderId}-${rowIndex}`;
    setCurrentRemarks(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // NEW: Handle saving remark with timestamp (from ServiceUpdate)
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

    console.log('Remark saved:', newRemarkEntry);
  };

  // NEW: Get remarks history for a specific row (from ServiceUpdate)
  const getRemarksForRow = (orderId, rowIndex) => {
    const key = `${orderId}-${rowIndex}`;
    return remarksHistory[key] || [];
  };

  // NEW: Format timestamp for display (from ServiceUpdate)
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

  // Manual assignment function (only active executives in dropdown)
  const handleAssignService = async (orderId, rowIndex) => {
    if (!selectedExecutive) {
      showExecutiveStatusMessage('Please select a service executive');
      return;
    }

    const executive = getActiveExecutives().find(exec => exec._id === selectedExecutive);

    try {
      await axios.put(`/api/orders/${orderId}`, {
        [`rows.${rowIndex}.assignedExecutive`]: executive.name,
        [`rows.${rowIndex}.assignedExecutiveId`]: executive._id,
        [`rows.${rowIndex}.assignedExecutivePhone`]: executive.phone,
        [`rows.${rowIndex}.assignedAt`]: new Date().toISOString()
      });

      // Refresh orders after assignment
      const ordersRes = await axios.get('/api/orders/pending-services');
      const sortedOrders = ordersRes.data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated || Date.now());
        const dateB = new Date(b.createdAt || b.dateCreated || Date.now());
        return dateB - dateA;
      });
      
      // Format orders with row keys
      const formattedOrders = sortedOrders.map(order => ({
        ...order,
        rows: order.rows.map((row, idx) => ({
          ...row,
          originalIndex: idx,
          rowKey: generateRowKey(order._id, idx),
        }))
      }));
      
      setOrders(formattedOrders);
      
      const order = orders.find(o => o._id === orderId);
      setAssignedInfo({
        orderNo: order.orderNo,
        executiveName: executive.name,
        executivePhone: executive.phone,
        requirement: order.rows[rowIndex].requirement
      });
      
      setShowSuccess(true);
      setSelectedExecutive('');
      setSelectedOrder(null);
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      showExecutiveStatusMessage(err.response?.data?.error || 'Assignment failed');
    }
  };

  // Mark executive as inactive
  const handleMarkInactive = async (executiveId) => {
    if (!inactiveReason.trim()) {
      showExecutiveStatusMessage('Please provide a reason for making executive inactive');
      return;
    }

    try {
      await axios.put(`/api/service-executives/${executiveId}/status`, {
        active: false,
        inactiveReason: inactiveReason
      });

      // Refresh executives list
      const executivesRes = await axios.get('/api/service-executives');
      setServiceExecutives(executivesRes.data);
      
      setShowInactiveModal(false);
      setSelectedExecutiveForInactive(null);
      setInactiveReason('');
      
      showExecutiveStatusMessage('Executive marked as inactive successfully');
    } catch (err) {
      showExecutiveStatusMessage('Failed to update executive status');
      console.error('Error marking executive inactive:', err);
    }
  };

  // Mark executive as active
  const handleMarkActive = async (executiveId) => {
    try {
      await axios.put(`/api/service-executives/${executiveId}/status`, {
        active: true
      });

      // Refresh executives list
      const executivesRes = await axios.get('/api/service-executives');
      setServiceExecutives(executivesRes.data);
      
      showExecutiveStatusMessage('Executive activated successfully');
    } catch (err) {
      showExecutiveStatusMessage('Failed to activate executive');
      console.error('Error activating executive:', err);
    }
  };

  // NEW: Get status style based on status value (from ServiceUpdate)
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

  // Styles definition
  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    },
    controls: {
      backgroundColor: '#f5f5f5',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '15px',
      alignItems: 'center'
    },
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    label: {
      fontWeight: 'bold',
      minWidth: '150px',
      color: '#333'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ced4da',
      minWidth: '200px',
      fontSize: '14px'
    },
    checkbox: {
      marginRight: '5px'
    },
    searchContainer: {
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px'
    },
    searchInput: {
      padding: '10px 15px',
      borderRadius: '4px',
      border: '1px solid #ced4da',
      minWidth: '300px',
      fontSize: '14px'
    },
    searchButton: {
      padding: '10px 15px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px'
    },
    // UPDATED: Filter container styles (removed status filter)
    filterContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    filterGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    filterLabel: {
      fontWeight: '600',
      fontSize: '14px',
      color: '#003366',
      whiteSpace: 'nowrap'
    },
    filterSelect: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '14px',
      minWidth: '150px'
    },
    filterDivider: {
      width: '1px',
      height: '30px',
      backgroundColor: '#ddd',
      margin: '0 10px'
    },
    card: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      marginBottom: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #003366'
    },
    creatorInfo: {
      backgroundColor: '#e9f5ff',
      padding: '10px',
      borderRadius: '4px',
      marginBottom: '15px',
      borderLeft: '4px solid #003366'
    },
    field: {
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center'
    },
    value: {
      flex: 1
    },
    button: {
      padding: '8px 16px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease'
    },
    buttonHover: {
      backgroundColor: '#002244'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      backgroundColor: '#cccccc'
    },
    heading: {
      color: '#003366',
      marginBottom: '20px'
    },
    error: {
      color: '#dc3545',
      margin: '10px 0'
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
      animation: 'slideIn 0.5s forwards'
    },
    executiveStatusPopup: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: '#003366',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px',
      animation: 'slideIn 0.5s forwards'
    },
    successTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    successIcon: {
      fontSize: '24px'
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
    timestamp: {
      fontSize: '12px',
      color: '#666',
      marginTop: '5px',
      textAlign: 'right'
    },
    noResults: {
      padding: '20px',
      textAlign: 'center',
      color: '#666',
      fontSize: '16px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px'
    },
    autoAssignedBadge: {
      backgroundColor: '#4BB543',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      marginLeft: '10px'
    },
    executiveInfo: {
      backgroundColor: '#e8f5e9',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      borderLeft: '4px solid #4caf50'
    },
    executiveItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px',
      margin: '5px 0',
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      borderLeft: '4px solid #4caf50'
    },
    inactiveExecutiveItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px',
      margin: '5px 0',
      backgroundColor: '#ffeaa7',
      borderRadius: '4px',
      borderLeft: '4px solid #e17055'
    },
    executiveActions: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    },
    inactiveBadge: {
      backgroundColor: '#e17055',
      color: 'white',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      marginLeft: '10px'
    },
    reasonBadge: {
      backgroundColor: '#fff3cd',
      color: '#856404',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      border: '1px solid #ffeaa7',
      fontStyle: 'italic'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      width: '400px',
      maxWidth: '90vw'
    },
    textArea: {
      width: '100%',
      height: '100px',
      padding: '10px',
      borderRadius: '4px',
      border: '1px solid #ced4da',
      margin: '10px 0',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif'
    },
    modalTitle: {
      color: '#003366',
      marginBottom: '15px'
    },
    modalActions: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '15px'
    },
    // NEW STYLES from ServiceUpdate for status and remarks
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
    dropdown: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      backgroundColor: '#fff',
      fontSize: '14px',
      flex: '1',
      cursor: 'pointer',
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
    // NEW: Quantity field style
    quantityField: {
      backgroundColor: '#e3f2fd',
      padding: '6px 10px',
      borderRadius: '4px',
      fontWeight: 'bold',
      display: 'inline-block',
    },
    // NEW: Results count style
    resultsCount: {
      marginBottom: '15px',
      fontSize: '14px',
      color: '#666',
      fontStyle: 'italic'
    }
  };

  // Add CSS animation for success popup
  const slideInAnimation = `
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

  if (loading) return <div style={styles.container}>Loading orders...</div>;
  if (error) return <div style={{...styles.container, ...styles.error}}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      {/* Add CSS animation */}
      <style>{slideInAnimation}</style>
      
      <h2 style={styles.heading}>Assign Service Executive</h2>

      {/* Controls Section */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={autoAssignEnabled}
              onChange={(e) => setAutoAssignEnabled(e.target.checked)}
              style={styles.checkbox}
            />
            Auto Assign
          </label>
        </div>
        
        {autoAssignEnabled && (
          <>
            <div style={styles.controlGroup}>
              <label style={styles.label}>Assignment Strategy:</label>
              <select
                style={styles.select}
                value={assignmentStrategy}
                onChange={(e) => setAssignmentStrategy(e.target.value)}
              >
                <option value="round-robin">Round Robin</option>
                <option value="specific-executive">Specific Executive</option>
              </select>
            </div>
            
            {assignmentStrategy === 'specific-executive' && (
              <div style={styles.controlGroup}>
                <label style={styles.label}>Select Executive:</label>
                <select
                  style={styles.select}
                  value={specificExecutive}
                  onChange={(e) => setSpecificExecutive(e.target.value)}
                >
                  <option value="">Select Executive</option>
                  {getActiveExecutives().map(executive => (
                    <option key={executive._id} value={executive._id}>
                      {executive.name} ({executive.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Executives List Section */}
      <div style={styles.executiveInfo}>
        <strong>Available Executives:</strong>
        {serviceExecutives.length > 0 ? (
          serviceExecutives.map((exec) => (
            <div 
              key={exec._id} 
              style={exec.active === false ? styles.inactiveExecutiveItem : styles.executiveItem}
            >
              <div style={{flex: 1}}>
                <div style={{fontWeight: 'bold', marginBottom: '5px'}}>
                  {exec.name} ({exec.phone})
                </div>
                {exec.active === false && (
                  <div style={{fontSize: '12px', color: '#666'}}>
                    <span style={styles.inactiveBadge}>INACTIVE</span>
                    {exec.inactiveReason && ` - Reason: ${exec.inactiveReason}`}
                    {exec.inactiveSince && ` - Since: ${new Date(exec.inactiveSince).toLocaleDateString()}`}
                  </div>
                )}
              </div>
              <div style={styles.executiveActions}>
                {exec.active === false ? (
                  <button
                    style={{...styles.button, backgroundColor: '#4caf50'}}
                    onClick={() => handleMarkActive(exec._id)}
                  >
                    Activate
                  </button>
                ) : (
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    {exec.inactiveReason && (
                      <span style={styles.reasonBadge}>
                        Previous reason: {exec.inactiveReason}
                      </span>
                    )}
                    <button
                      style={{...styles.button, backgroundColor: '#e17055'}}
                      onClick={() => {
                        setSelectedExecutiveForInactive(exec);
                        setShowInactiveModal(true);
                        setInactiveReason(exec.inactiveReason || ''); // Pre-fill existing reason
                      }}
                    >
                      Mark Inactive
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div>No executives available</div>
        )}
        {autoAssignEnabled && assignmentStrategy === 'round-robin' && (
          <div style={{marginTop: '10px'}}>
            <strong>Next Executive:</strong> {
              getActiveExecutives().length > 0 
                ? getActiveExecutives()[(lastAssignedIndexRef.current + 1) % getActiveExecutives().length]?.name 
                : 'None'
            }
          </div>
        )}
      </div>

      {/* NEW: Search and Filter Section */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by order no, business, contact, phone, executive, requirement, status, quantity..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          style={styles.searchButton}
          onClick={() => {
            // Search is handled by useEffect
          }}
        >
          Search
        </button>
      </div>

      {/* UPDATED: Filter Container (removed status filter) */}
      <div style={styles.filterContainer}>
        {/* Year Filter */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Year:</label>
          <select
            style={styles.filterSelect}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterDivider}></div>

        {/* Month Filter */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Month:</label>
          <select
            style={styles.filterSelect}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            {availableMonths.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterDivider}></div>

        {/* Clear Filters Button */}
        <button
          style={styles.button}
          onClick={() => {
            setSearchTerm('');
            setYearFilter('ALL');
            setMonthFilter('ALL');
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Results Count */}
      {filteredOrders.length > 0 && (
        <div style={styles.resultsCount}>
          Showing {filteredOrders.reduce((count, order) => count + order.rows.length, 0)} services
          {searchTerm && ` for "${searchTerm}"`}
          {yearFilter !== 'ALL' && ` in year ${yearFilter}`}
          {monthFilter !== 'ALL' && ` in ${availableMonths.find(m => m.value === monthFilter)?.label}`}
        </div>
      )}

      {/* Service Assignment Success Popup */}
      {showSuccess && (
        <div style={styles.successPopup}>
          <button 
            style={styles.closeButton} 
            onClick={() => setShowSuccess(false)}
          >
            ×
          </button>
          <div style={styles.successTitle}>
            <span style={styles.successIcon}>✓</span>
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

      {/* Executive Status Popup */}
      {showExecutiveStatusPopup && (
        <div style={styles.executiveStatusPopup}>
          <button 
            style={styles.closeButton} 
            onClick={() => setShowExecutiveStatusPopup(false)}
          >
            ×
          </button>
          <div style={styles.successTitle}>
            <span style={styles.successIcon}>ℹ</span>
            Executive Status
          </div>
          <div style={styles.successItem}>
            {executiveStatusMessage}
          </div>
        </div>
      )}

      {/* Inactive Reason Modal */}
      {showInactiveModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Mark Executive as Inactive</h3>
            <p>Executive: <strong>{selectedExecutiveForInactive?.name}</strong></p>
            <label>Reason for making inactive:</label>
            <textarea
              style={styles.textArea}
              value={inactiveReason}
              onChange={(e) => setInactiveReason(e.target.value)}
              placeholder="Enter reason for making this executive inactive..."
            />
            <div style={styles.modalActions}>
              <button
                style={{...styles.button, backgroundColor: '#6c757d'}}
                onClick={() => {
                  setShowInactiveModal(false);
                  setSelectedExecutiveForInactive(null);
                  setInactiveReason('');
                }}
              >
                Cancel
              </button>
              <button
                style={{...styles.button, backgroundColor: '#e17055'}}
                onClick={() => handleMarkInactive(selectedExecutiveForInactive._id)}
              >
                Confirm Inactive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div style={styles.noResults}>
          {searchTerm || yearFilter !== 'ALL' || monthFilter !== 'ALL'
            ? `No services match your current filters` 
            : 'No pending services found'
          }
          <br />
          {searchTerm && <div>Search term: "{searchTerm}"</div>}
          {yearFilter !== 'ALL' && <div>Year: {yearFilter}</div>}
          {monthFilter !== 'ALL' && <div>Month: {availableMonths.find(m => m.value === monthFilter)?.label}</div>}
        </div>
      ) : (
        filteredOrders.map(order =>
          order.rows.map((row, rowIndex) => {
            if (row.isCompleted) return null;

            const rowKey = `${order._id}-${row.originalIndex}`;
            const displayStatus = localStatuses[rowKey] || row.status || STATUS.PENDING;
            const rowRemarksHistory = getRemarksForRow(order._id, row.originalIndex);

            return (
              <div key={`${order._id}-${rowIndex}`} style={styles.card}>
                <div style={styles.creatorInfo}>
                  <div style={styles.field}>
                    <span style={styles.label}>Created by Executive:</span>
                    <span style={styles.value}>
                      {order.executive || 'Not specified'}
                      {row.assignedExecutive && (
                        <span style={styles.autoAssignedBadge}>
                          Assigned to: {row.assignedExecutive}
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={styles.timestamp}>
                    Created: {new Date(order.createdAt).toLocaleString()}
                    {row.assignedAt && (
                      <span> • Assigned: {new Date(row.assignedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div style={styles.field}>
                  <span style={styles.label}>Order Number:</span>
                  <span style={styles.value}>{order.orderNo}</span>
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

                {/* NEW: Quantity Field */}
                <div style={styles.field}>
                  <span style={styles.label}>Quantity:</span>
                  <span style={styles.quantityField}>
                    {row.quantity || '1'}
                  </span>
                </div>
                
                <div style={styles.field}>
                  <span style={styles.label}>Delivery Date:</span>
                  <span style={styles.value}>
                    {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>

                {/* NEW: Current Status Field */}
                <div style={styles.field}>
                  <span style={styles.label}>Current Status:</span>
                  <span style={getStatusStyle(displayStatus)}>
                    {displayStatus}
                  </span>
                </div>

                {/* NEW: Update Status Field */}
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

                {/* NEW: Add Remark Field */}
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

                  {/* NEW: Remarks History */}
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

                {/* UPDATED: Assign Service Executive Section - Show for both assigned and unassigned services */}
                <div style={styles.assignSection}>
                  <div style={styles.field}>
                    <span style={styles.label}>
                      {row.assignedExecutive ? 'Reassign Service Executive:' : 'Assign Service Executive:'}
                    </span>
                    <select
                      style={styles.dropdown}
                      value={selectedOrder === rowKey ? selectedExecutive : ''}
                      onChange={(e) => {
                        setSelectedExecutive(e.target.value);
                        setSelectedOrder(rowKey);
                      }}
                    >
                      <option value="">Select Service Executive</option>
                      {getActiveExecutives().map(executive => (
                        <option key={executive._id} value={executive._id}>
                          {executive.name} ({executive.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    style={styles.assignButton}
                    disabled={!selectedExecutive || selectedOrder !== rowKey}
                    onClick={() => handleAssignService(order._id, row.originalIndex)}
                  >
                    {row.assignedExecutive ? 'Reassign Service' : 'Assign Service'}
                  </button>

                  {/* Show assigned executive info if already assigned */}
                  {row.assignedExecutive && (
                    <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '4px'}}>
                      <strong>Currently Assigned:</strong> {row.assignedExecutive} 
                      {row.assignedExecutivePhone && ` (${row.assignedExecutivePhone})`}
                      {row.assignedAt && ` - Assigned on: ${new Date(row.assignedAt).toLocaleString()}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )
      )}
    </div>
  );
}

export default AssignService;