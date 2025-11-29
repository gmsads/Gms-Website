import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Ledger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [clientTimeline, setClientTimeline] = useState({});
  const [newPayments, setNewPayments] = useState({});
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch all orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        const data = await response.json();
        setAllOrders(data);
        
        // Check if there's a business parameter in URL
        const urlParams = new URLSearchParams(location.search);
        const businessFromUrl = urlParams.get('business');
        
        if (businessFromUrl) {
          const decodedBusiness = decodeURIComponent(businessFromUrl);
          setSearchTerm(decodedBusiness);
          // Auto-filter for this business
          performSearch(data, decodedBusiness);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        alert('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [location.search]);

  // Calculate total amount for an order
  const calculateTotal = (order) => {
    return order.rows?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0) || 0;
  };

  // Validate and parse date safely
  const safeParseDate = (dateString) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    // Check if date is valid
    return isNaN(date.getTime()) ? null : date;
  };

  // Format date safely for display
  const formatDateSafe = (dateString) => {
    const date = safeParseDate(dateString);
    return date ? date.toLocaleDateString() : 'Invalid Date';
  };

  // Organize client data into timeline
  const organizeClientTimeline = (orders) => {
    const timeline = {};
    
    orders.forEach(order => {
      const business = order.business || 'Unknown Business';
      
      if (!timeline[business]) {
        timeline[business] = {
          clientInfo: {
            business: business,
            contactPerson: order.contactPerson,
            phone: order.phone,
            contactCode: order.contactCode,
            clientType: order.clientType
          },
          timeline: []
        };
      }

      // Add order entry
      const orderTotal = calculateTotal(order);
      const currentBalance = order.balance !== undefined ? order.balance : orderTotal - (order.advance || 0);
      
      timeline[business].timeline.push({
        type: 'order',
        date: order.orderDate,
        orderNo: order.orderNo,
        requirements: order.rows || [],
        totalAmount: orderTotal,
        advance: order.advance || 0,
        balance: currentBalance,
        orderId: order._id
      });

      // Add payment entries
      if (order.advance > 0) {
        timeline[business].timeline.push({
          type: 'advance_payment',
          date: order.orderDate,
          orderNo: order.orderNo,
          amount: order.advance,
          method: 'Advance',
          orderId: order._id
        });
      }

      // Add regular payments
      if (order.paymentHistory && order.paymentHistory.length > 0) {
        order.paymentHistory.forEach(payment => {
          timeline[business].timeline.push({
            type: 'payment',
            date: payment.date,
            orderNo: order.orderNo,
            amount: payment.amount,
            method: payment.method,
            upiNumber: payment.upiNumber,
            chequeNumber: payment.chequeNumber,
            orderId: order._id
          });
        });
      }
    });

    // Sort timeline by date (newest first) with safe date parsing
    Object.keys(timeline).forEach(business => {
      timeline[business].timeline.sort((a, b) => {
        const dateA = safeParseDate(a.date) || new Date(0);
        const dateB = safeParseDate(b.date) || new Date(0);
        return dateB - dateA;
      });
    });

    return timeline;
  };

  // Perform search with partial matching
  const performSearch = (orders, term) => {
    const searchTerm = term.trim().toLowerCase();

    if (searchTerm.length < 1) {
      setFilteredOrders([]);
      setClientTimeline({});
      return;
    }

    const filtered = orders.filter(order => {
      // Check all fields for partial matches
      const businessMatch = order.business?.toLowerCase().includes(searchTerm);
      const orderNoMatch = order.orderNo?.toLowerCase().includes(searchTerm);
      const clientTypeMatch = order.clientType?.toLowerCase().includes(searchTerm);
      const contactPersonMatch = order.contactPerson?.toLowerCase().includes(searchTerm);
      const phoneMatch = order.phone?.toLowerCase().includes(searchTerm);
      
      // Return true if any field matches
      return businessMatch || orderNoMatch || clientTypeMatch || contactPersonMatch || phoneMatch;
    });
    
    setFilteredOrders(filtered);
    setClientTimeline(organizeClientTimeline(filtered));
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (searchTerm.trim().length < 1) {
      setFilteredOrders([]);
      setClientTimeline({});
      // Update URL without business parameter when search is cleared
      navigate('/admin-dashboard/ledger');
      return;
    }

    performSearch(allOrders, searchTerm);
    
    // Update URL with search term
    navigate(`/admin-dashboard/ledger?business=${encodeURIComponent(searchTerm)}`);
  };

  // Handle real-time search as user types
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Perform search immediately as user types
    if (value.trim().length > 0) {
      performSearch(allOrders, value);
    } else {
      setFilteredOrders([]);
      setClientTimeline({});
    }
  };

  // Handle payment input changes
  const handlePaymentChange = (orderId, field, value) => {
    setNewPayments(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value,
        date: field === 'date' ? value : (prev[orderId]?.date || new Date().toISOString().split('T')[0])
      }
    }));
  };

  // Apply payment to order
  const applyPayment = async (orderId) => {
    const payment = newPayments[orderId];
    if (!payment?.amount || !payment.method) {
      alert("Please enter amount and select payment method");
      return;
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/add-payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payment.amount),
          method: payment.method,
          upiNumber: payment.upiNumber || undefined,
          chequeNumber: payment.chequeNumber || undefined,
          date: payment.date || new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error('Failed to update payment');

      const updatedOrder = await res.json();
      
      // Show success message
      setPaymentSuccess({
        orderId,
        message: `Payment of ₹${payment.amount} added successfully!`,
        balance: updatedOrder.balance
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => setPaymentSuccess(null), 5000);

      // Update orders in state
      const updateOrders = orders =>
        orders.map(order => (order._id === orderId ? updatedOrder : order));

      const updatedAllOrders = updateOrders(allOrders);
      const updatedFilteredOrders = updateOrders(filteredOrders);

      setFilteredOrders(updatedFilteredOrders);
      setAllOrders(updatedAllOrders);
      setClientTimeline(organizeClientTimeline(updatedFilteredOrders));
      
      // Clear payment form for this order
      setNewPayments(prev => ({ ...prev, [orderId]: {} }));

    } catch (err) {
      console.error('Payment update failed:', err);
      alert('Failed to update payment. Please try again later.');
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredOrders([]);
    setClientTimeline({});
    navigate('/admin-dashboard/ledger');
  };

  // Get current balance for an order with null safety
  const getCurrentBalance = (orderId) => {
    const order = allOrders.find(o => o._id === orderId);
    if (!order) {
      console.warn(`Order with ID ${orderId} not found`);
      return 0; // Return 0 instead of null/undefined
    }
    
    // Calculate balance if not present in order object
    if (order.balance !== undefined) {
      return order.balance;
    }
    
    // Fallback calculation
    const orderTotal = calculateTotal(order);
    const advance = order.advance || 0;
    const paidAmount = order.paymentHistory?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    return orderTotal - advance - paidAmount;
  };

  // Calculate total payable for a client
  const calculateTotalPayable = (timeline) => {
    let total = 0;
    timeline.forEach(entry => {
      if (entry.type === 'order') {
        total += entry.totalAmount;
      }
    });
    return total;
  };

  // Get date range for a client with safe date handling
  const getDateRange = (timeline) => {
    if (timeline.length === 0) return { start: 'N/A', end: 'N/A' };
    
    const validDates = timeline
      .map(entry => safeParseDate(entry.date))
      .filter(date => date !== null);
    
    if (validDates.length === 0) return { start: 'N/A', end: 'N/A' };
    
    const startDate = new Date(Math.min(...validDates));
    const endDate = new Date(Math.max(...validDates));
    
    // Format dates safely without toISOString
    const formatDateForDisplay = (date) => {
      return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    };
    
    return {
      start: formatDateForDisplay(startDate),
      end: formatDateForDisplay(endDate)
    };
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading ledger data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Client Transaction Timeline</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by Business, Order No, Client Type, Contact Person or Phone..."
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              style={styles.clearButton}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <button type="submit" style={styles.searchButton}>
          Search Ledger
        </button>
      </form>

      {/* Results Count */}
      {filteredOrders.length > 0 && (
        <div style={styles.resultsCount}>
          Found {filteredOrders.length} order(s) matching "{searchTerm}"
        </div>
      )}

      {/* No Results Message */}
      {Object.keys(clientTimeline).length === 0 && searchTerm && (
        <div style={styles.noResults}>
          <p>No orders found matching "{searchTerm}"</p>
          <button onClick={clearSearch} style={styles.clearSearchButton}>
            Clear Search
          </button>
        </div>
      )}

      {Object.keys(clientTimeline).length === 0 && !searchTerm && (
        <p style={styles.initialMessage}>
          Enter a business name, order number, or contact details to search the ledger.
        </p>
      )}

      {/* Client Timeline Display */}
      {Object.entries(clientTimeline).map(([business, clientData]) => {
        const totalPayable = calculateTotalPayable(clientData.timeline);
        const dateRange = getDateRange(clientData.timeline);
        
        return (
          <div key={business} style={styles.clientSection}>
            {/* Client Header */}
            <div style={styles.clientHeader}>
              <h3 style={styles.businessName}>{business}</h3>
              <div style={styles.clientInfo}>
                <p><strong>Contact:</strong> {clientData.clientInfo.contactPerson || 'N/A'}</p>
                <p><strong>Phone:</strong> {clientData.clientInfo.contactCode || '+91'} {clientData.clientInfo.phone || 'N/A'}</p>
                <p><strong>Type:</strong> {clientData.clientInfo.clientType || 'N/A'}</p>
              </div>
            </div>

            {/* Header Content from Screenshot */}
            <div style={styles.headerContent}>
              <div style={styles.addressSection}>
                <p style={styles.toText}>To,</p>
                <p style={styles.companyName}>{business}</p>
                <p style={styles.location}>Hyd</p>
              </div>
              
              <div style={styles.dateAmountSection}>
                <p style={styles.dateRange}>
                  {dateRange.start} - {dateRange.end}
                </p>
                <p style={styles.totalPayable}>
                  Total Payable: <strong>₹{totalPayable.toFixed(2)}</strong>
                </p>
              </div>
            </div>

            {/* Timeline Table */}
            <div style={styles.timelineContainer}>
              <table style={styles.timelineTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Order No</th>
                    <th style={styles.tableHeader}>Requirements</th>
                    <th style={styles.tableHeader}>Amount</th>
                    <th style={styles.tableHeader}>Payment Method</th>
                    <th style={styles.tableHeader}>Balance</th>
                    <th style={styles.tableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clientData.timeline.map((entry, index) => {
                    const currentBalance = getCurrentBalance(entry.orderId);
                    const displayBalance = currentBalance !== null && currentBalance !== undefined 
                      ? currentBalance.toFixed(2) 
                      : '0.00';

                    return (
                      <React.Fragment key={index}>
                        {entry.type === 'order' ? (
                          // Order Row
                          <tr style={styles.orderRow}>
                            <td style={styles.tableCell}>
                              {formatDateSafe(entry.date)}
                            </td>
                            <td style={styles.tableCell}>
                              <strong>{entry.orderNo}</strong>
                            </td>
                            <td style={styles.tableCell}>
                              <div style={styles.requirementsList}>
                                {entry.requirements.map((req, idx) => (
                                  <div key={idx} style={styles.requirementItem}>
                                    {req.requirement} - {req.quantity} × ₹{req.rate} = ₹{req.total}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <strong>₹{entry.totalAmount.toFixed(2)}</strong>
                            </td>
                            <td style={styles.tableCell}>-</td>
                            <td style={styles.tableCell}>
                              <span style={{ 
                                color: currentBalance > 0 ? '#dc3545' : '#28a745',
                                fontWeight: '600'
                              }}>
                                ₹{displayBalance}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              {currentBalance > 0 && (
                                <button
                                  style={styles.payButton}
                                  onClick={() => {
                                    setNewPayments(prev => ({
                                      ...prev,
                                      [entry.orderId]: {
                                        amount: currentBalance,
                                        method: '',
                                        date: new Date().toISOString().split('T')[0]
                                      }
                                    }));
                                    document.getElementById(`payment-${entry.orderId}`)?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                >
                                  Add Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          // Payment Row
                          <tr style={entry.type === 'advance_payment' ? styles.advanceRow : styles.paymentRow}>
                            <td style={styles.tableCell}>
                              {formatDateSafe(entry.date)}
                            </td>
                            <td style={styles.tableCell}>
                              {entry.orderNo}
                            </td>
                            <td style={styles.tableCell}>
                              {entry.type === 'advance_payment' ? 'Advance Payment' : 'Payment Received'}
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{ color: '#28a745', fontWeight: '600' }}>
                                ₹{entry.amount?.toFixed(2) || '0.00'}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              {entry.method}
                              {entry.upiNumber && ` (${entry.upiNumber})`}
                              {entry.chequeNumber && ` (Cheque #${entry.chequeNumber})`}
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{ fontWeight: '600' }}>
                                ₹{displayBalance}
                              </span>
                            </td>
                            <td style={styles.tableCell}>-</td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Payment Forms for orders with balance */}
            {clientData.timeline
              .filter(entry => entry.type === 'order')
              .map(orderEntry => {
                const currentBalance = getCurrentBalance(orderEntry.orderId);
                
                return currentBalance > 0 ? (
                  <div key={orderEntry.orderId} id={`payment-${orderEntry.orderId}`} style={styles.paymentFormSection}>
                    <h4>Add Payment for Order {orderEntry.orderNo}</h4>
                    <div style={styles.paymentForm}>
                      <div style={styles.inputGroup}>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={newPayments[orderEntry.orderId]?.amount ?? currentBalance}
                          onChange={e => handlePaymentChange(orderEntry.orderId, 'amount', e.target.value)}
                          style={styles.inputSmall}
                          min="0.01"
                          step="0.01"
                          max={currentBalance}
                        />
                        <select
                          value={newPayments[orderEntry.orderId]?.method || ''}
                          onChange={e => handlePaymentChange(orderEntry.orderId, 'method', e.target.value)}
                          style={styles.inputSmall}
                          required
                        >
                          <option value="">Select Method</option>
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Cheque">Cheque</option>
                        </select>
                        
                        <input
                          type="date"
                          value={newPayments[orderEntry.orderId]?.date || new Date().toISOString().split('T')[0]}
                          onChange={e => handlePaymentChange(orderEntry.orderId, 'date', e.target.value)}
                          style={styles.inputSmall}
                        />

                        {/* UPI Number Selection */}
                        {newPayments[orderEntry.orderId]?.method === 'UPI' && (
                          <select
                            value={newPayments[orderEntry.orderId]?.upiNumber || ''}
                            onChange={e => handlePaymentChange(orderEntry.orderId, 'upiNumber', e.target.value)}
                            style={styles.inputSmall}
                            required
                          >
                            <option value="">Select UPI Number</option>
                            <option value="9985330008@Chary">9985330008@Chary</option>
                            <option value="9985330004@Swathi">9985330004@Swathi</option>
                            <option value="924642893@VenkatGupta">924642893@VenkatGupta</option>
                          </select>
                        )}

                        {/* Cheque Number Input */}
                        {newPayments[orderEntry.orderId]?.method === 'Cheque' && (
                          <input
                            type="text"
                            placeholder="Cheque Number"
                            maxLength={6}
                            value={newPayments[orderEntry.orderId]?.chequeNumber || ''}
                            onChange={e => handlePaymentChange(orderEntry.orderId, 'chequeNumber', e.target.value)}
                            style={styles.inputSmall}
                            required
                          />
                        )}

                        <button
                          onClick={() => applyPayment(orderEntry.orderId)}
                          style={styles.addButton}
                          disabled={!newPayments[orderEntry.orderId]?.amount || !newPayments[orderEntry.orderId]?.method}
                        >
                          Add Payment
                        </button>
                      </div>
                      
                      {/* Success Message */}
                      {paymentSuccess?.orderId === orderEntry.orderId && (
                        <div style={styles.successMessage}>
                          <div>
                            {paymentSuccess.message} Remaining balance: ₹{paymentSuccess.balance?.toFixed(2) || '0.00'}
                          </div>
                          <button 
                            style={styles.closeButton}
                            onClick={() => setPaymentSuccess(null)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })}
          </div>
        );
      })}
    </div>
  );
};

// ... (styles remain exactly the same as previous code)
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  title: {
    textAlign: 'center',
    color: '#003366',
    marginBottom: '30px',
    fontSize: '28px',
    fontWeight: 'bold',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
  },
  searchForm: {
    marginBottom: '30px',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: '10px',
  },
  searchInput: {
    width: '100%',
    padding: '12px 40px 12px 15px',
    fontSize: '16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  clearButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#ccc',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: '100%',
    backgroundColor: '#003366',
    color: '#fff',
    padding: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
  },
  resultsCount: {
    backgroundColor: '#e3f2fd',
    padding: '10px 15px',
    borderRadius: '6px',
    marginBottom: '20px',
    color: '#003366',
    fontWeight: '500',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  clearSearchButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  initialMessage: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: '40px',
  },
  clientSection: {
    marginBottom: '40px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  clientHeader: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  businessName: {
    margin: '0 0 10px 0',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  clientInfo: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    fontSize: '14px',
  },
  headerContent: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #dee2e6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  addressSection: {
    flex: '1',
    minWidth: '200px',
  },
  toText: {
    margin: '0 0 5px 0',
    fontSize: '14px',
    color: '#666',
  },
  companyName: {
    margin: '0 0 5px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#003366',
  },
  location: {
    margin: '0',
    fontSize: '14px',
    color: '#666',
  },
  dateAmountSection: {
    textAlign: 'right',
    flex: '1',
    minWidth: '200px',
  },
  dateRange: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#666',
  },
  totalPayable: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#003366',
  },
  timelineContainer: {
    overflowX: 'auto',
  },
  timelineTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
    color: '#003366',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: '600',
    borderBottom: '2px solid #dee2e6',
    whiteSpace: 'nowrap',
  },
  tableCell: {
    padding: '12px 15px',
    borderBottom: '1px solid #dee2e6',
    verticalAlign: 'top',
  },
  orderRow: {
    backgroundColor: '#f8f9fa',
    borderLeft: '4px solid #003366',
  },
  paymentRow: {
    backgroundColor: '#f0fff0',
    borderLeft: '4px solid #28a745',
  },
  advanceRow: {
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
  },
  requirementsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  requirementItem: {
    padding: '4px 0',
    borderBottom: '1px dashed #eee',
    fontSize: '13px',
  },
  payButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  paymentFormSection: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #dee2e6',
  },
  paymentForm: {
    marginTop: '10px',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  inputSmall: {
    flex: '1 1 150px',
    padding: '8px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    minWidth: '120px',
  },
  addButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    minWidth: '120px',
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '10px 15px',
    borderRadius: '4px',
    margin: '10px 0',
    border: '1px solid #c3e6cb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#155724',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: 'bold',
    padding: '0 5px'
  }
};

export default Ledger;