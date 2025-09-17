import React, { useState, useEffect } from 'react';

const Ledger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [newPayments, setNewPayments] = useState({});
  const [paymentSuccess, setPaymentSuccess] = useState(null); // Added for success message
  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => setAllOrders(data))
      .catch(err => console.error('Fetch error:', err));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchTerm.trim().toLowerCase();

    if (term.length < 3) {
      setFilteredOrders([]);
      return;
    }

    const filtered = allOrders.filter(order =>
      order.business?.toLowerCase().includes(term) ||
      order.orderNo?.toLowerCase().includes(term) ||
      order.clientType?.toLowerCase().includes(term)
    );
    setFilteredOrders(filtered);
  };

  const handlePaymentChange = (orderId, field, value) => {
    setNewPayments(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value,
        // Initialize date with today's date if not already set
        date: field === 'date' ? value : (prev[orderId]?.date || new Date().toISOString().split('T')[0])
      }
    }));
  };

 const applyPayment = async (orderId) => {
    const payment = newPayments[orderId];
    if (!payment?.amount || !payment.method) return alert("Please enter amount and method");

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
      
      // Set success message with remaining balance
      setPaymentSuccess({
        orderId,
        message: `Payment of ₹${payment.amount} added successfully!`,
        balance: updatedOrder.balance
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => setPaymentSuccess(null), 5000);

      const updateOrders = orders =>
        orders.map(order => (order._id === orderId ? updatedOrder : order));

      setFilteredOrders(updateOrders);
      setAllOrders(updateOrders);
      setNewPayments(prev => ({ ...prev, [orderId]: {} }));

    } catch (err) {
      console.error('Payment update failed:', err);
      alert('Failed to update payment. Try again later.');
    }
  };

  const groupedOrders = filteredOrders.reduce((acc, order) => {
    acc[order.business] = acc[order.business] || [];
    acc[order.business].push(order);
    return acc;
  }, {});

  const calculateTotal = (order) => {
    return order.rows?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Ledger Management</h2>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by Business, Order No or Client Type..."
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchButton}>Search Ledger</button>
      </form>

      {Object.keys(groupedOrders).length === 0 && (
        <p style={{ textAlign: 'center', marginTop: 20, color: '#555' }}>No orders to display.</p>
      )}

      {Object.entries(groupedOrders).map(([business, orders]) => (
        <div key={business}>
          <h3 style={styles.businessHeader}>{business}</h3>

          {orders.map(order => {
            const orderTotal = calculateTotal(order);
            return (
              <div key={order._id} style={styles.card}>
                <div style={styles.topRow}>
                  <div style={styles.header}>
                    <p><strong>Order No:</strong> {order.orderNo}</p>
                    <p><strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
                    <p><strong>Total Amount:</strong> ₹{orderTotal.toFixed(2)}</p>
                    <p><strong>Total Advance:</strong> ₹{order.advance || 0}</p>
                    <p><strong>Balance:</strong>{' '}
                      <span style={{ color: order.balance > 0 ? '#dc3545' : '#28a745', fontWeight: '700' }}>
                        ₹{order.balance || 0}
                      </span>
                    </p>
                  </div>

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
                      <p>No payment history yet.</p>
                    )}
                  </div>
                </div>

                <div>
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
                          <td colSpan="3" style={{ ...styles.tableCell, textAlign: 'right', fontWeight: 'bold' }}>Total:</td>
                          <td style={{ ...styles.tableCell, fontWeight: 'bold' }}>₹{orderTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

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
      />
      <select
        value={newPayments[order._id]?.method || ''}
        onChange={e => handlePaymentChange(order._id, 'method', e.target.value)}
        style={styles.inputSmall}
      >
        <option value="">Method</option>
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

      {newPayments[order._id]?.method === 'UPI' && (
        <select
          value={newPayments[order._id]?.upiNumber || ''}
          onChange={e => handlePaymentChange(order._id, 'upiNumber', e.target.value)}
          style={styles.inputSmall}
        >
          <option value="">Select UPI Number</option>
          <option value="9985330008@Chary">9985330008@Chary</option>
          <option value="9985330004@Swathi">9985330004@Swathi</option>
          <option value="924642893@VenkatGupta">924642893@VenkatGupta</option>
        </select>
      )}

      {newPayments[order._id]?.method === 'Cheque' && (
        <input
          type="text"
          placeholder="Cheque Number"
          maxLength={6}
          value={newPayments[order._id]?.chequeNumber || ''}
          onChange={e => handlePaymentChange(order._id, 'chequeNumber', e.target.value)}
          style={styles.inputSmall}
        />
      )}

      <button
        onClick={() => applyPayment(order._id)}
        style={styles.addButton}
      >
        Add Payment
      </button>
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
    maxWidth: '900px',
    margin: '30px auto',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  title: {
    textAlign: 'center',
    color: '#003366',
    marginBottom: 30,
  },
  searchForm: {
    marginBottom: 30,
  },
  searchInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderRadius: 6,
    border: '1px solid #ccc',
    boxSizing: 'border-box',
  },
  searchButton: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#003366',
    color: '#fff',
    padding: 12,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: 16,
  },
  businessHeader: {
    marginTop: 40,
    fontSize: 20,
    fontWeight: '700',
    color: '#003366',
    borderBottom: '2px solid #003366',
    paddingBottom: 5,
  },
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 25,
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: '20px',
    flexWrap: 'wrap',
  },
  header: {
    flex: '1 1 400px',
    minWidth: 300,
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
    successOverlay: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '20px 30px',
      borderRadius: '8px',
      border: '1px solid #c3e6cb',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#155724',
      cursor: 'pointer',
      fontSize: '20px',
      fontWeight: 'bold',
      padding: '0 5px'
    },
    overlayBackdrop: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.2)',
      zIndex: 999
    },
  paymentHistoryCard: {
    flex: '0 0 350px',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)',
    maxHeight: 250,
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
    fontFamily: 'monospace',
  },
  paymentLabel: {
    fontFamily: "Arial",
    fontWeight: '200',
    width: '120px',
    color: '#333',
    whiteSpace: 'nowrap',
  },
  paymentValue: {
     fontFamily: "Arial",
    fontWeight: '200',
    flex: 1,
    color: '#222',
  },
  paymentDivider: {
    height: '1px',
    background: '#eee',
    margin: '10px 0 5px 0',
  },
  paymentRecord: {
    backgroundColor: '#fff',
    padding: 10,
    border: '1px solid #ccc',
    borderRadius: 6,
    marginBottom: 10,
    fontSize: 14,
  },
  tableContainer: {
    overflowX: 'auto',
    marginTop: 10,
  },
  requirementsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#f4f4f4',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '10px 15px',
    textAlign: 'left',
  },
  tableCell: {
    padding: '10px 15px',
    borderBottom: '1px solid #ddd',
  },
  paymentForm: {
    marginTop: 20,
  },
  inputGroup: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  inputSmall: {
    flex: '1 1 120px',
    padding: 8,
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ccc',
  },
  addButton: {
    backgroundColor: '#28a745',
    color: '#fff',
    padding: '8px 16px',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: 14,
  }
};

export default Ledger;