import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Ledger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
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
          const filtered = data.filter(order => 
            order.business?.toLowerCase() === decodedBusiness.toLowerCase()
          );
          setFilteredOrders(filtered);
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

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();

    if (term.length < 1) {
      setFilteredOrders([]);
      // Update URL without business parameter when search is cleared
      navigate('/admin-dashboard/ledger');
      return;
    }

    const filtered = allOrders.filter(order =>
      order.business?.toLowerCase().includes(term) ||
      order.orderNo?.toLowerCase().includes(term) ||
      order.clientType?.toLowerCase().includes(term) ||
      order.contactPerson?.toLowerCase().includes(term) ||
      order.phone?.toLowerCase().includes(term)
    );
    setFilteredOrders(filtered);
    
    // Update URL with search term
    navigate(`/admin-dashboard/ledger?business=${encodeURIComponent(term)}`);
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

      setFilteredOrders(updateOrders);
      setAllOrders(updateOrders);
      
      // Clear payment form for this order
      setNewPayments(prev => ({ ...prev, [orderId]: {} }));

    } catch (err) {
      console.error('Payment update failed:', err);
      alert('Failed to update payment. Please try again later.');
    }
  };

  // Group orders by business
  const groupedOrders = filteredOrders.reduce((acc, order) => {
    const business = order.business || 'Unknown Business';
    acc[business] = acc[business] || [];
    acc[business].push(order);
    return acc;
  }, {});

  // Calculate total amount for an order
  const calculateTotal = (order) => {
    return order.rows?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0) || 0;
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredOrders([]);
    navigate('/admin-dashboard/ledger');
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
      <h2 style={styles.title}>Ledger Management</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
          Found {filteredOrders.length} order(s) for "{searchTerm}"
        </div>
      )}

      {/* No Results Message */}
      {Object.keys(groupedOrders).length === 0 && searchTerm && (
        <div style={styles.noResults}>
          <p>No orders found for "{searchTerm}"</p>
          <button onClick={clearSearch} style={styles.clearSearchButton}>
            Clear Search
          </button>
        </div>
      )}

      {Object.keys(groupedOrders).length === 0 && !searchTerm && (
        <p style={styles.initialMessage}>
          Enter a business name, order number, or contact details to search the ledger.
        </p>
      )}

      {/* Grouped Orders Display */}
      {Object.entries(groupedOrders).map(([business, orders]) => (
        <div key={business} style={styles.businessSection}>
          <h3 style={styles.businessHeader}>
            {business}
            <span style={styles.orderCount}>({orders.length} order(s))</span>
          </h3>

          {orders.map(order => {
            const orderTotal = calculateTotal(order);
            return (
              <div key={order._id} style={styles.card}>
                {/* Order Header and Payment History */}
                <div style={styles.topRow}>
                  <div style={styles.header}>
                    <p><strong>Order No:</strong> {order.orderNo}</p>
                    <p><strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
                    <p><strong>Contact Person:</strong> {order.contactPerson || 'N/A'}</p>
                    <p><strong>Phone:</strong> {order.contactCode || '+91'} {order.phone || 'N/A'}</p>
                    <p><strong>Total Amount:</strong> ₹{orderTotal.toFixed(2)}</p>
                    <p><strong>Total Advance:</strong> ₹{order.advance || 0}</p>
                    <p><strong>Balance:</strong>{' '}
                      <span style={{ 
                        color: order.balance > 0 ? '#dc3545' : '#28a745', 
                        fontWeight: '700' 
                      }}>
                        ₹{order.balance || 0}
                      </span>
                    </p>
                  </div>

                  {/* Payment History */}
                  <div style={styles.paymentHistoryCard}>
                    <h4 style={{ marginTop: 0, marginBottom: 15 }}>Payment History</h4>
                    {order.paymentHistory?.length > 0 ? (
                      <div style={styles.paymentHistoryList}>
                        {order.paymentHistory.map((p, idx) => (
                          <div key={idx} style={styles.paymentItem}>
                            <div style={styles.paymentField}>
                              <span style={styles.paymentLabel}>Date:</span>
                              <span style={styles.paymentValue}>{new Date(p.date).toLocaleDateString()}</span>
                            </div>
                            <div style={styles.paymentField}>
                              <span style={styles.paymentLabel}>Amount:</span>
                              <span style={styles.paymentValue}>₹{p.amount}</span>
                            </div>
                            <div style={styles.paymentField}>
                              <span style={styles.paymentLabel}>Method:</span>
                              <span style={styles.paymentValue}>{p.method}</span>
                            </div>
                            {p.method === 'UPI' && p.upiNumber && (
                              <div style={styles.paymentField}>
                                <span style={styles.paymentLabel}>UPI Number:</span>
                                <span style={styles.paymentValue}>{p.upiNumber}</span>
                              </div>
                            )}
                            {p.method === 'Cheque' && p.chequeNumber && (
                              <div style={styles.paymentField}>
                                <span style={styles.paymentLabel}>Cheque No:</span>
                                <span style={styles.paymentValue}>{p.chequeNumber}</span>
                              </div>
                            )}
                            {idx < order.paymentHistory.length - 1 && <div style={styles.paymentDivider} />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.noPaymentHistory}>No payment history yet.</p>
                    )}
                  </div>
                </div>

                {/* Requirements Table */}
                <div style={styles.requirementsSection}>
                  <h4>Requirements</h4>
                  <div style={styles.tableContainer}>
                    <table style={styles.requirementsTable}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>Requirement</th>
                          <th style={styles.tableHeader}>Quantity</th>
                          <th style={styles.tableHeader}>Rate</th>
                          <th style={styles.tableHeader}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.rows?.map((row, idx) => (
                          <tr key={idx}>
                            <td style={styles.tableCell}>{row.requirement}</td>
                            <td style={styles.tableCell}>{row.quantity}</td>
                            <td style={styles.tableCell}>₹{row.rate}</td>
                            <td style={styles.tableCell}>₹{row.total}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan="3" style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>
                            Total:
                          </td>
                          <td style={{ ...styles.tableCell, fontWeight: 'bold' }}>
                            ₹{orderTotal.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Form for Orders with Balance */}
                {order.balance > 0 && (
                  <div style={styles.paymentForm}>
                    <h4>Add Payment</h4>
                    <div style={styles.inputGroup}>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={newPayments[order._id]?.amount ?? order.balance}
                        onChange={e => handlePaymentChange(order._id, 'amount', e.target.value)}
                        style={styles.inputSmall}
                        min="0.01"
                        step="0.01"
                        max={order.balance}
                      />
                      <select
                        value={newPayments[order._id]?.method || ''}
                        onChange={e => handlePaymentChange(order._id, 'method', e.target.value)}
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
                        value={newPayments[order._id]?.date || new Date().toISOString().split('T')[0]}
                        onChange={e => handlePaymentChange(order._id, 'date', e.target.value)}
                        style={styles.inputSmall}
                      />

                      {/* UPI Number Selection */}
                      {newPayments[order._id]?.method === 'UPI' && (
                        <select
                          value={newPayments[order._id]?.upiNumber || ''}
                          onChange={e => handlePaymentChange(order._id, 'upiNumber', e.target.value)}
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
                      {newPayments[order._id]?.method === 'Cheque' && (
                        <input
                          type="text"
                          placeholder="Cheque Number"
                          maxLength={6}
                          value={newPayments[order._id]?.chequeNumber || ''}
                          onChange={e => handlePaymentChange(order._id, 'chequeNumber', e.target.value)}
                          style={styles.inputSmall}
                          required
                        />
                      )}

                      <button
                        onClick={() => applyPayment(order._id)}
                        style={styles.addButton}
                        disabled={!newPayments[order._id]?.amount || !newPayments[order._id]?.method}
                      >
                        Add Payment
                      </button>
                    </div>
                    
                    {/* Success Message */}
                    {paymentSuccess?.orderId === order._id && (
                      <div style={styles.successMessage}>
                        <div>
                          {paymentSuccess.message} Remaining balance: ₹{paymentSuccess.balance}
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
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
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
  businessSection: {
    marginBottom: '40px',
  },
  businessHeader: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#003366',
    borderBottom: '2px solid #003366',
    paddingBottom: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderCount: {
    fontSize: '14px',
    fontWeight: 'normal',
    color: '#666',
  },
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '25px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    backgroundColor: '#fafafa',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  header: {
    flex: '1 1 400px',
    minWidth: '300px',
    fontSize: '14px',
  },
  paymentHistoryCard: {
    flex: '0 0 350px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)',
    maxHeight: '250px',
    overflowY: 'auto',
  },
  paymentHistoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  paymentItem: {
    backgroundColor: '#fff',
    padding: '12px 15px',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  paymentField: {
    display: 'flex',
    marginBottom: '5px',
  },
  paymentLabel: {
    fontWeight: '600',
    width: '120px',
    color: '#333',
    whiteSpace: 'nowrap',
  },
  paymentValue: {
    flex: '1',
    color: '#222',
  },
  paymentDivider: {
    height: '1px',
    background: '#eee',
    margin: '10px 0 5px 0',
  },
  noPaymentHistory: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: '20px 0',
  },
  requirementsSection: {
    marginBottom: '20px',
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: '10px',
  },
  requirementsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: '600',
  },
  tableCell: {
    padding: '10px 15px',
    borderBottom: '1px solid #ddd',
  },
  paymentForm: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e0e0e0',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  inputSmall: {
    flex: '1 1 120px',
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