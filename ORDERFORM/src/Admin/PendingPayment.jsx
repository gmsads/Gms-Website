import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

function PendingPayment() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Cash',
    reference: '',
    note: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Filter states
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Generate year options
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, year, selectedMonth, searchTerm]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        params: {
          _: new Date().getTime() // Cache buster
        }
      });
      const pendingPayments = res.data.filter(order => order && order.balance > 0);
      setOrders(pendingPayments);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!orders.length) return;

    let result = [...orders];

    // Filter by year and month if they have orderDate
    result = result.filter(order => {
      if (!order.orderDate) return true;
      
      const orderDate = new Date(order.orderDate);
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();
      
      // Check year filter
      if (orderYear !== year) {
        return false;
      }
      
      // Check month filter if selected
      if (selectedMonth !== null && orderMonth !== selectedMonth) {
        return false;
      }
      
      return true;
    });

    // Apply search term filter if exists
    if (searchTerm) {
      result = result.filter(order => {
        const valuesToSearch = [
          order.executive,
          order.business,
          order.contactPerson,
          `${order.contactCode || ''} ${order.phone || ''}`,
          order.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0,
          order.advance,
          order.balance,
        ];

        return valuesToSearch.some(val =>
          String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredOrders(result);
  };

  const handleRecordPayment = (order) => {
    setCurrentOrder(order);
    setPaymentData({
      date: new Date().toISOString().split('T')[0],
      amount: order.balance > 0 ? order.balance.toString() : '',
      method: 'Cash',
      reference: '',
      note: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    setPaymentLoading(true);
    try {
      const paymentAmount = parseFloat(paymentData.amount);
      
      if (!paymentAmount || isNaN(paymentAmount)) {
        alert('Please enter a valid payment amount');
        return;
      }

      if (paymentAmount <= 0) {
        alert('Payment amount must be greater than 0');
        return;
      }

      if (paymentAmount > parseFloat(currentOrder.balance)) {
        alert(`Payment amount (₹${paymentAmount}) cannot exceed current balance (₹${currentOrder.balance})`);
        return;
      }

      const paymentPayload = {
        date: paymentData.date,
        amount: paymentAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        note: paymentData.note
      };

      await axios.post(`/api/orders/${currentOrder._id}/record-payment`, paymentPayload);
      
      // Refresh the orders list
      await fetchOrders();
      
      setShowPaymentModal(false);
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleExportToExcel = () => {
    const exportData = filteredOrders.map((order, orderIndex) => ({
      'S.No': orderIndex + 1,
      'Executive': order?.executive || '',
      'Business': order?.business || '',
      'Customer': order?.contactPerson || '',
      'Contact': `${order?.contactCode || ''} ${order?.phone || ''}`.trim(),
      'Total': order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0) || 0,
      'Advance': order?.advance || 0,
      'Balance': order?.balance || 0,
      'Order Date': order?.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
    }));
  
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingPayments');
    XLSX.writeFile(workbook, 'pending_payments.xlsx');
  };

  // Calculate total pending amount with null checks
  const totalPendingAmount = filteredOrders.reduce((sum, order) => sum + (order?.balance || 0), 0);

  // Updated styles with proper hover syntax
  const styles = {
    container: {
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '100%',
      overflowX: 'auto',
    },
    title: {
      textAlign: 'center',
      margin: '0 0 20px 0',
      color: '#2c3e50',
      fontSize: '24px',
      fontWeight: '600',
    },
    summaryBox: {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '12px',
      margin: '0 auto 20px auto',
      maxWidth: '400px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    summaryContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: '14px',
      color: '#7f8c8d',
      fontWeight: '600',
    },
    summaryAmount: {
      fontSize: '18px',
      color: '#e74c3c',
      fontWeight: 'bold',
    },
    summaryCount: {
      fontSize: '14px',
      color: '#3498db',
      backgroundColor: '#ebf5fb',
      padding: '4px 8px',
      borderRadius: '12px',
    },
    filterContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      marginBottom: '20px',
      backgroundColor: '#fff',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    searchContainer: {
      display: 'flex',
      justifyContent: 'center',
    },
    searchInput: {
      padding: '10px 15px',
      width: '100%',
      maxWidth: '500px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '14px',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
    },
    yearMonthContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap',
    },
    selectWrapper: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    filterLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      fontSize: '14px',
    },
    filterSelect: {
      padding: '8px 12px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      backgroundColor: '#fff',
      fontSize: '14px',
      cursor: 'pointer',
    },
    clearFilterButton: {
      padding: '8px 12px',
      backgroundColor: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#c0392b',
      },
    },
    loading: {
      textAlign: 'center',
      padding: '20px',
      color: '#7f8c8d',
      fontSize: '16px',
    },
    noData: {
      textAlign: 'center',
      padding: '20px',
      color: '#7f8c8d',
      fontSize: '16px',
    },
    tableContainer: {
      width: '100%',
      overflowX: 'auto',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: '#ffffff',
      fontSize: '14px',
    },
    tableHeader: {
      backgroundColor: '#3498db',
      color: '#ffffff',
    },
    th: {
      padding: '12px 8px',
      textAlign: 'left',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '10px 8px',
      borderBottom: '1px solid #ecf0f1',
      whiteSpace: 'nowrap',
    },
    evenRow: {
      backgroundColor: '#ffffff',
    },
    oddRow: {
      backgroundColor: '#f8f9fa',
    },
    balanceCell: {
      color: '#e74c3c',
      fontWeight: '600',
    },
    payButton: {
      backgroundColor: '#9b59b6',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#8e44ad',
      },
    },
    footerButtons: {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      marginTop: '20px',
    },
    excelButton: {
      backgroundColor: '#16a085',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#1abc9c',
      },
    },
    backButton: {
      backgroundColor: '#7f8c8d',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      ':hover': {
        backgroundColor: '#95a5a6',
      },
    },
    // Payment modal styles
    paymentModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    paymentModalContent: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '8px',
      width: '500px',
      maxWidth: '95%',
      maxHeight: '90vh',
      overflowY: 'auto',
    },
    paymentModalTitle: {
      marginTop: 0,
      textAlign: 'center',
      color: '#2c3e50',
    },
    paymentFormGroup: {
      marginBottom: '15px',
    },
    paymentFormLabel: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '500',
    },
    paymentFormInput: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
    },
    paymentFormTextarea: {
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      minHeight: '60px',
    },
    paymentFormButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
      marginTop: '20px',
    },
    paymentCancelButton: {
      padding: '8px 16px',
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    paymentSubmitButton: {
      padding: '8px 16px',
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: 'bold',
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Pending Payments</h2>

      {/* Compact Summary Box */}
      <div style={styles.summaryBox}>
        <div style={styles.summaryContent}>
          <span style={styles.summaryLabel}>Total Pending:</span>
          <span style={styles.summaryAmount}>₹{totalPendingAmount.toLocaleString()}</span>
          <span style={styles.summaryCount}>{filteredOrders.length} orders</span>
        </div>
      </div>

      {/* Filter Container */}
      <div style={styles.filterContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.yearMonthContainer}>
          <div style={styles.selectWrapper}>
            <label htmlFor="year-select" style={styles.filterLabel}>
              Year:
            </label>
            <select
              id="year-select"
              value={year}
              onChange={(e) => {
                setYear(parseInt(e.target.value));
                setSelectedMonth(null);
              }}
              style={styles.filterSelect}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.selectWrapper}>
            <label htmlFor="month-select" style={styles.filterLabel}>
              Month:
            </label>
            <select
              id="month-select"
              value={selectedMonth !== null ? selectedMonth + 1 : ''}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedMonth(value ? parseInt(value) - 1 : null);
              }}
              style={styles.filterSelect}
            >
              <option value="">All Months</option>
              {monthLabels.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          
          {selectedMonth !== null && (
            <button 
              onClick={() => setSelectedMonth(null)}
              style={styles.clearFilterButton}
            >
              Clear Month Filter
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading pending payments...</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                {['S.I', 'Executive', 'Business', 'Customer', 'Contact', 'Total', 'Advance', 'Balance', 'Action'].map((header) => (
                  <th key={header} style={styles.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={styles.noData}>
                    No pending payments found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => (
                  <tr key={order?._id || index} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{order?.executive || ''}</td>
                    <td style={styles.td}>{order?.business || ''}</td>
                    <td style={styles.td}>{order?.contactPerson || ''}</td>
                    <td style={styles.td}>{order?.contactCode || ''} {order?.phone || ''}</td>
                    <td style={styles.td}>₹{(order?.rows?.reduce((sum, r) => sum + (r?.total || 0), 0)?.toLocaleString() || '0')}</td>
                    <td style={styles.td}>₹{(order?.advance || 0).toLocaleString()}</td>
                    <td style={{...styles.td, ...styles.balanceCell}}>₹{(order?.balance || 0).toLocaleString()}</td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleRecordPayment(order)}
                        style={styles.payButton}
                        disabled={order?.balance <= 0}
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.footerButtons}>
        <button onClick={handleExportToExcel} style={styles.excelButton}>
          Export to Excel
        </button>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          Back
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && currentOrder && (
        <div style={styles.paymentModal}>
          <div style={styles.paymentModalContent}>
            <h3 style={styles.paymentModalTitle}>Record Payment</h3>
            
            <div style={styles.paymentFormGroup}>
              <label style={styles.paymentFormLabel}>Pending Amount</label>
              <input
                type="text"
                value={`₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                readOnly
                style={{
                  ...styles.paymentFormInput,
                  backgroundColor: '#f5f5f5',
                  fontWeight: 'bold',
                  color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71',
                }}
              />
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Amount to Pay *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentChange}
                  placeholder={`Enter amount (max: ₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                  style={styles.paymentFormInput}
                  required
                  min="0.01"
                  step="0.01"
                  max={currentOrder.balance || 0}
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Payment Date *</label>
                <input
                  type="date"
                  name="date"
                  value={paymentData.date}
                  onChange={handlePaymentChange}
                  style={styles.paymentFormInput}
                  required
                />
              </div>

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Payment Method *</label>
                <select
                  name="method"
                  value={paymentData.method}
                  onChange={handlePaymentChange}
                  style={styles.paymentFormInput}
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {['Cheque', 'Bank Transfer', 'UPI'].includes(paymentData.method) && (
                <div style={styles.paymentFormGroup}>
                  <label style={styles.paymentFormLabel}>
                    {paymentData.method === 'Cheque' ? 'Cheque Number' :
                     paymentData.method === 'UPI' ? 'UPI Reference' : 'Transaction ID'} *
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={paymentData.reference}
                    onChange={handlePaymentChange}
                    style={styles.paymentFormInput}
                    required
                  />
                </div>
              )}

              <div style={styles.paymentFormGroup}>
                <label style={styles.paymentFormLabel}>Notes</label>
                <textarea
                  name="note"
                  value={paymentData.note}
                  onChange={handlePaymentChange}
                  style={styles.paymentFormTextarea}
                  placeholder="Additional payment details"
                />
              </div>

              <div style={styles.paymentFormButtons}>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={styles.paymentCancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  style={{
                    ...styles.paymentSubmitButton,
                    opacity: paymentLoading ? 0.7 : 1
                  }}
                >
                  {paymentLoading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PendingPayment;