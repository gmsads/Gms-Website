import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function AssignService() {
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

  // Use ref to track the last assigned executive index
  const lastAssignedIndexRef = useRef(-1);
  const isAutoAssigningRef = useRef(false);

  // Load last assigned index from localStorage on component mount
  useEffect(() => {
    const savedIndex = localStorage.getItem('lastAssignedExecutiveIndex');
    if (savedIndex !== null) {
      lastAssignedIndexRef.current = parseInt(savedIndex);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ordersRes, executivesRes] = await Promise.all([
          axios.get('/api/orders/pending-services'),
          axios.get('/api/service-executives')
        ]);
        
        // Filter only active executives
        const activeExecutives = executivesRes.data.filter(exec => exec.active !== false);
        
        // Sort orders by creation date (newest first)
        const sortedOrders = ordersRes.data.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dateCreated || Date.now());
          const dateB = new Date(b.createdAt || b.dateCreated || Date.now());
          return dateB - dateA;
        });
        
        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
        setServiceExecutives(activeExecutives);
        
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
    if (autoAssignEnabled && serviceExecutives.length > 0 && orders.length > 0 && !isAutoAssigningRef.current) {
      autoAssignAllServices();
    }
  }, [orders, serviceExecutives, autoAssignEnabled]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => 
        order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.contactPerson && order.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.phone && order.phone.includes(searchTerm)) ||
        order.rows.some(row => 
          row.requirement && row.requirement.toLowerCase().includes(searchTerm.toLowerCase())
      ));
      setFilteredOrders(filtered);
    }
  }, [searchTerm, orders]);

  // Simple round-robin function
  const getNextExecutive = () => {
    if (serviceExecutives.length === 0) return null;
    
    if (assignmentStrategy === 'specific-executive') {
      if (!specificExecutive) {
        alert('Please select a specific executive for assignment');
        return null;
      }
      return serviceExecutives.find(exec => exec._id === specificExecutive);
    }
    
    // Round-robin: get next executive in sequence
    const nextIndex = (lastAssignedIndexRef.current + 1) % serviceExecutives.length;
    return serviceExecutives[nextIndex];
  };

  // Auto-assign all unassigned services
  const autoAssignAllServices = async () => {
    if (serviceExecutives.length === 0 || isAutoAssigningRef.current) return;
    
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
            const executiveIndex = serviceExecutives.findIndex(exec => exec._id === executive._id);
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
        
        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
      }

    } catch (err) {
      console.error('Auto-assign error:', err);
    } finally {
      isAutoAssigningRef.current = false;
    }
  };

  // Manual assignment function
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

      // Refresh orders after assignment
      const ordersRes = await axios.get('/api/orders/pending-services');
      const sortedOrders = ordersRes.data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated || Date.now());
        const dateB = new Date(b.createdAt || b.dateCreated || Date.now());
        return dateB - dateA;
      });
      
      setOrders(sortedOrders);
      setFilteredOrders(sortedOrders);
      
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
      alert(err.response?.data?.error || 'Assignment failed');
    }
  };

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
      alignItems: 'center'
    },
    searchInput: {
      padding: '10px 15px',
      borderRadius: '4px',
      border: '1px solid #ced4da',
      minWidth: '300px',
      fontSize: '14px',
      marginRight: '10px'
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
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: '#002244'
      }
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
      fontSize: '16px'
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
      padding: '10px',
      borderRadius: '4px',
      marginTop: '10px',
      borderLeft: '4px solid #4caf50'
    }
  };

  if (loading) return <div style={styles.container}>Loading orders...</div>;
  if (error) return <div style={{...styles.container, ...styles.error}}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Assign Service Executive</h2>

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
                  {serviceExecutives.map(executive => (
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

      <div style={styles.executiveInfo}>
        <strong>Available Executives:</strong>
        {serviceExecutives.length > 0 ? (
          serviceExecutives.map((exec, index) => (
            <div key={exec._id}>
              {index + 1}. {exec.name} ({exec.phone}) {exec.active === false ? '(Inactive)' : ''}
            </div>
          ))
        ) : (
          <div>No executives available</div>
        )}
        {autoAssignEnabled && assignmentStrategy === 'round-robin' && (
          <div style={{marginTop: '10px'}}>
            <strong>Next Executive:</strong> {
              serviceExecutives.length > 0 
                ? serviceExecutives[(lastAssignedIndexRef.current + 1) % serviceExecutives.length]?.name 
                : 'None'
            }
          </div>
        )}
      </div>

      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by order no, contact, phone, or requirement"
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button 
          style={styles.searchButton}
          onClick={() => {
            // Trigger search (already handled by useEffect)
          }}
        >
          Search
        </button>
      </div>

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

      {filteredOrders.length === 0 ? (
        <div style={styles.noResults}>
          {searchTerm ? 'No matching orders found' : 'No pending services found'}
        </div>
      ) : (
        filteredOrders.map(order =>
          order.rows.map((row, rowIndex) => {
            if (row.isCompleted) return null;

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
                
                <div style={styles.field}>
                  <span style={styles.label}>Delivery Date:</span>
                  <span style={styles.value}>
                    {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>

                {!row.assignedExecutive && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={styles.field}>
                      <span style={styles.label}>Assign To:</span>
                      <select
                        style={styles.select}
                        value={selectedOrder === `${order._id}-${rowIndex}` ? selectedExecutive : ''}
                        onChange={(e) => {
                          setSelectedExecutive(e.target.value);
                          setSelectedOrder(`${order._id}-${rowIndex}`);
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

                    <div style={{...styles.field, marginTop: '10px'}}>
                      <span style={styles.label}></span>
                      <button
                        style={{
                          ...styles.button,
                          ...(!selectedExecutive || selectedOrder !== `${order._id}-${rowIndex}` ? styles.buttonDisabled : {})
                        }}
                        disabled={!selectedExecutive || selectedOrder !== `${order._id}-${rowIndex}`}
                        onClick={() => handleAssignService(order._id, rowIndex)}
                      >
                        Assign Service
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )
      )}
    </div>
  );
}

export default AssignService;