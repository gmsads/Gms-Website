import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ViewOrders() {
  // State management
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('');
  const [executiveName, setExecutiveName] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'Cash',
    reference: '',
    note: ''
  });
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [monthFilter, setMonthFilter] = useState(null);
  const [yearFilter, setYearFilter] = useState(2025);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [clientTypeFilter, setClientTypeFilter] = useState(null);

  // Router hooks
  const location = useLocation();
  const navigate = useNavigate();

  // API configuration
  const API_BASE_URL = '/api';
  const API_ENDPOINTS = {
    ORDERS: `${API_BASE_URL}/orders`,
    GET_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
    UPDATE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
    DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`,
    RECORD_PAYMENT: (id) => `${API_BASE_URL}/orders/${id}/record-payment`,
    GET_PAYMENTS: (id) => `${API_BASE_URL}/orders/${id}`,
    IMPORT_ORDERS: `${API_BASE_URL}/orders/import`
  };

  // Format date to DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return dateString;
        }
        if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  // Group orders by month for 2025 only
  const groupOrdersByMonth = (orders) => {
    const grouped = {};
    
    orders.forEach(order => {
      let date;
      
      if (order.orderDate && typeof order.orderDate === 'string') {
        const parts = order.orderDate.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          date = new Date(order.orderDate);
        }
      } else {
        date = new Date(order.orderDate);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid order date:', order.orderDate);
        return;
      }
      
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      if (year !== 2025) return;
      
      const monthStr = month.toString().padStart(2, '0');
      const monthYearKey = `2025-${monthStr}`;
      
      // Initialize the month if it doesn't exist
      if (!grouped[monthYearKey]) {
        const monthYearName = new Date(2025, month - 1).toLocaleString('default', { 
          month: 'long', 
          year: 'numeric' 
        });
        
        grouped[monthYearKey] = {
          name: monthYearName,
          orders: [],
          totals: {
            amount: 0,
            advance: 0,
            balance: 0
          }
        };
      }
      
      let orderAmount = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      const orderAdvance = parseFloat(order.advance) || 0;
      const orderBalance = parseFloat(order.balance) || 0;
      
      grouped[monthYearKey].totals.amount += orderAmount;
      grouped[monthYearKey].totals.advance += orderAdvance;
      grouped[monthYearKey].totals.balance += orderBalance;
      
      grouped[monthYearKey].orders.push(order);
    });
    
    return grouped;
  };

  // Calculate totals for summary cards - MODIFIED TO ONLY INCLUDE REQUESTED TOTALS
  const calculateTotals = () => {
    let totalAmount = 0;
    let totalAdvance = 0;
    let totalBalance = 0;

    orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      if (orderDate.getFullYear() === 2025) {
        order.rows.forEach(row => {
          totalAmount += parseFloat(row.total) || 0;
        });
        totalAdvance += parseFloat(order.advance) || 0;
        totalBalance += parseFloat(order.balance) || 0;
      }
    });

    return {
      totalAmount: totalAmount.toFixed(2),
      totalAdvance: totalAdvance.toFixed(2),
      totalBalance: totalBalance.toFixed(2)
    };
  };

  const { 
    totalAmount, 
    totalAdvance, 
    totalBalance
  } = calculateTotals();

  // Fetch orders on component mount or when filters change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const month = params.get('month');
    const year = params.get('year');
    const clientType = params.get('clientType');
    
    if (month) setMonthFilter(parseInt(month));
    if (year) setYearFilter(parseInt(year));
    if (clientType) setClientTypeFilter(clientType);
    
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    setUserRole(role);
    setExecutiveName(name);
    
    fetchOrders(role, name, month, year, clientType);
  }, [location.search]);

  // Fetch orders from API with filters
  const fetchOrders = async (role, name, month = null, year = null, clientType = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = API_ENDPOINTS.ORDERS;
      const params = new URLSearchParams();
      
      if (role === 'Executive') {
        params.append('executive', name);
      }
      if (month && year) {
        params.append('month', month);
        params.append('year', year);
      }
      if (clientType) {
        params.append('clientType', clientType);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await axios.get(url);
      
      const filteredOrders = res.data.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate.getFullYear() === 2025;
      });
      
      const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate);
        const dateB = new Date(b.orderDate);
        return dateB - dateA;
      });
      
      setOrders(sortedOrders);
      setGroupedOrders(groupOrdersByMonth(sortedOrders));
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders. Please try again.');
      toast.error('Failed to fetch orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setMonthFilter(null);
    setYearFilter(2025);
    setClientTypeFilter(null);
    navigate('/admin-dashboard/view-orders');
  };

  // Clear client type filter only
  const clearClientTypeFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('clientType');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
  };

  // Clear month filter
  const clearMonthFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('month');
    params.delete('year');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
  };

  // Format date for input fields (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }
      
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Prepare order for editing
  const handleEdit = (order) => {
    setEditingOrder({
      ...order,
      orderDate: formatDateForInput(order.orderDate),
      advanceDate: formatDateForInput(order.advanceDate),
      paymentDate: formatDateForInput(order.paymentDate),
      rows: order.rows.map(row => ({
        ...row,
        deliveryDate: formatDateForInput(row.deliveryDate),
        startDate: formatDateForInput(row.startDate),
        endDate: formatDateForInput(row.endDate)
      }))
    });
    setShowModal(true);
  };

  // Handle edit form field changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditingOrder(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes in order row fields
  const handleEditRowChange = (index, field, value) => {
    const updatedRows = [...editingOrder.rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    
    if (field === 'rate' || field === 'quantity') {
      const quantity = parseFloat(updatedRows[index].quantity) || 0;
      const rate = parseFloat(updatedRows[index].rate) || 0;
      updatedRows[index].total = (quantity * rate).toFixed(2);
    }
    
    // Calculate discounted total when discount changes
    if (field === 'discount') {
      const discount = parseFloat(value) || 0;
      const total = parseFloat(editingOrder.total) || 0;
      setEditingOrder(prev => ({
        ...prev,
        discount,
        discountedTotal: (total - discount).toFixed(2)
      }));
    }
    
    setEditingOrder(prev => ({ ...prev, rows: updatedRows }));
  };

  // Submit edited order
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(API_ENDPOINTS.UPDATE_ORDER(editingOrder._id), editingOrder);
      setShowModal(false);
      fetchOrders(userRole, executiveName, monthFilter, yearFilter, clientTypeFilter);
      toast.success('Order updated successfully!');
    } catch (err) {
      console.error('Update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update order');
    }
  };

  // Confirm order deletion
  const confirmDelete = (orderId) => {
    setOrderToDelete(orderId);
    setShowDeleteConfirm(true);
  };

  // Delete order
  const handleDelete = async () => {
    try {
      await axios.delete(API_ENDPOINTS.DELETE_ORDER(orderToDelete));
      setShowDeleteConfirm(false);
      fetchOrders(userRole, executiveName, monthFilter, yearFilter, clientTypeFilter);
      toast.success('Order deleted successfully!');
    } catch (err) {
      console.error('Error deleting order:', err);
      toast.error(err.response?.data?.message || 'Failed to delete order');
    }
  };

  // Prepare payment form
  const handleRecordPayment = async (order) => {
    try {
      setPaymentLoading(true);
      setCurrentOrder(order);
      
      // Get payments history from the order itself
      const payments = order.paymentHistory || [];
      
      setPaymentHistory(payments);
      
      // Set payment form with current balance as default amount
      setPaymentData({
        date: new Date().toISOString().split('T')[0],
        amount: order.balance > 0 ? order.balance.toString() : '',
        method: 'Cash',
        reference: '',
        note: ''
      });
      
      setShowPaymentsModal(true);
    } catch (err) {
      console.error('Error in handleRecordPayment:', err);
      toast.error('Failed to load payment details. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Submit payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!currentOrder) {
      toast.error('No order selected for payment');
      return;
    }

    try {
      const paymentAmount = parseFloat(paymentData.amount);
      
      if (!paymentAmount || isNaN(paymentAmount)) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      if (paymentAmount <= 0) {
        toast.error('Payment amount must be greater than 0');
        return;
      }

      if (paymentAmount > parseFloat(currentOrder.balance)) {
        toast.error(`Payment amount (₹${paymentAmount}) cannot exceed current balance (₹${currentOrder.balance})`);
        return;
      }

      // Create payment payload matching your backend expectations
      const paymentPayload = {
        date: paymentData.date,
        amount: paymentAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        note: paymentData.note
      };

      // Record the payment using the correct endpoint
      await axios.post(
        API_ENDPOINTS.RECORD_PAYMENT(currentOrder._id),
        paymentPayload
      );

      toast.success('Payment recorded successfully!');
      fetchOrders(userRole, executiveName, monthFilter, yearFilter, clientTypeFilter);
      setShowPaymentsModal(false);
    } catch (err) {
      console.error('Error recording payment:', err);
      toast.error(err.response?.data?.error || 'Failed to record payment');
    }
  };

  // Handle payment form changes
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({ ...prev, [name]: value }));
  };

  // Export orders to Excel
  const handleExportToExcel = () => {
    const orders2025 = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate.getFullYear() === 2025;
    });

    const flattenedOrders = orders2025.flatMap(order => 
      order.rows.map(row => ({
        'S.No': orders2025.indexOf(order) + 1,
        'Executive': order.executive,
        'Business': order.business,
        'Customer': order.contactPerson,
        'Location': order.location,
        'Sale Closed By': order.saleClosedBy,
        'Contact': `${order.contactCode} ${order.phone}`,
        'Order No': order.orderNo,
        'Order Date': formatDate(order.orderDate),
        'Client Type': order.clientType,
        'Description': row.description,
        'Requirement': row.requirement,
        'Custom Requirement': row.customRequirement,
        'Qty': row.quantity,
        'Rate': row.rate,
        'Total': row.total,
        'Discount': order.discount,
        'Final Amount': order.discountedTotal,
        'Delivery Date': formatDate(row.deliveryDate),
        'Service Assigned': row.assignedExecutive || 'Not Assigned',
        'Status': row.status,
        'Remark': row.remark,
        'Is Completed': row.isCompleted ? 'Yes' : 'No',
        'Advance': order.advance,
        'Balance': order.balance,
        'Advance Date': formatDate(order.advanceDate),
        'Payment Date': formatDate(order.paymentDate),
        'Payment Method': order.paymentMethod,
        'Cheque Number': order.chequeNumber,
        'Payments': order.paymentHistory ? 
          order.paymentHistory.map(p => `${formatDate(p.date)}: ₹${p.amount} (${p.method})`).join('; ') : ''
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(flattenedOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, 'orders_2025_export.xlsx');
  };

  // Import orders from Excel
  const handleImportFromExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const ordersToImport = jsonData.map(item => ({
          executive: item['Executive'],
          business: item['Business'],
          contactPerson: item['Customer'],
          location: item['Location'],
          saleClosedBy: item['Sale Closed By'],
          contactCode: item['Contact']?.split(' ')[0] || '+91',
          phone: item['Contact']?.split(' ')[1] || '',
          orderNo: item['Order No'] || `ORDER-${Math.random().toString(36).substr(2, 8)}`,
          orderDate: item['Order Date'],
          clientType: item['Client Type'],
          rows: [{
            description: item['Description'],
            requirement: item['Requirement'],
            customRequirement: item['Custom Requirement'],
            quantity: item['Qty'],
            rate: item['Rate'],
            total: item['Total'] || (item['Qty'] * item['Rate']).toFixed(2),
            deliveryDate: item['Delivery Date'],
            assignedExecutive: item['Service Assigned'],
            status: item['Status'],
            remark: item['Remark'],
            isCompleted: item['Is Completed'] === 'Yes'
          }],
          discount: item['Discount'] || 0,
          discountedTotal: item['Final Amount'] || 0,
          advance: item['Advance'] || 0,
          balance: item['Balance'] || 0,
          advanceDate: item['Advance Date'],
          paymentDate: item['Payment Date'],
          paymentMethod: item['Payment Method'] || 'Cash',
          chequeNumber: item['Cheque Number'] || ''
        }));

        await axios.post(API_ENDPOINTS.IMPORT_ORDERS, ordersToImport);
        fetchOrders(userRole, executiveName, monthFilter, yearFilter, clientTypeFilter);
        toast.success('Orders imported successfully!');
      } catch (err) {
        console.error('Error importing orders:', err);
        toast.error('Failed to import orders. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Filter orders for search functionality
  const filterOrders = (order) => (row) => {
    const valuesToSearch = [
      order.executive, order.business, order.contactPerson, order.location, order.saleClosedBy,
      `${order.contactCode} ${order.phone}`, order.orderNo, order.orderDate,
      order.clientType, row.description, row.requirement, row.customRequirement,
      row.quantity, row.rate, row.total, order.discount, order.discountedTotal,
      row.deliveryDate, row.assignedExecutive, row.status, row.remark,
      order.advance, order.balance, order.advanceDate, order.paymentDate,
      order.paymentMethod, order.chequeNumber
    ];
    return valuesToSearch.some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9f9f9'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>Loading orders...</div>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9f9f9',
        flexDirection: 'column'
      }}>
        <div style={{ 
          backgroundColor: '#ffebee',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#c62828' }}>Error Loading Orders</h2>
          <p style={{ margin: '15px 0', color: '#333' }}>{error}</p>
          <button 
            onClick={() => fetchOrders(userRole, executiveName, monthFilter, yearFilter, clientTypeFilter)}
            style={{
              backgroundColor: '#1565c0',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      {/* Toast container */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }} />
      
      {/* Filter Display Section */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '10px',
        marginBottom: '20px',
        backgroundColor: '#e3f2fd',
        padding: '15px',
        borderRadius: '8px'
      }}>
        {(monthFilter || clientTypeFilter) && (
          <h3 style={{ margin: '0 0 10px 0' }}>Active Filters:</h3>
        )}
        
        {monthFilter && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>Month:</strong> {new Date(2025, monthFilter - 1).toLocaleString('default', { month: 'long' })}
            </span>
            <button 
              onClick={clearMonthFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}
        
        {clientTypeFilter && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>Client Type:</strong> {clientTypeFilter}
            </span>
            <button 
              onClick={clearClientTypeFilter}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        )}
        
        {(monthFilter || clientTypeFilter) && (
          <button 
            onClick={clearAllFilters}
            style={{
              alignSelf: 'flex-end',
              backgroundColor: '#003366',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Admin Summary Cards - MODIFIED TO ONLY SHOW REQUESTED CARDS */}
      {userRole === 'Admin' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          {/* Total Amount Card */}
          <div style={{
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(52, 152, 219, 0.3)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>Total Amount</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>₹{totalAmount}</div>
          </div>

          {/* Total Advance Card */}
          <div style={{
            backgroundColor: 'rgba(155, 89, 182, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(155, 89, 182, 0.3)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>Total Advance</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>₹{totalAdvance}</div>
          </div>

          {/* Total Balance Card */}
          <div style={{
            backgroundColor: totalBalance > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: `1px solid ${totalBalance > 0 ? 'rgba(231, 76, 60, 0.3)' : 'rgba(39, 174, 96, 0.3)'}`
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333' }}>Total Balance</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: totalBalance > 0 ? '#e74c3c' : '#27ae60'
            }}>
              ₹{totalBalance}
            </div>
          </div>
        </div>
      )}

      {/* Search and Export/Import Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        {/* Search Input */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '12px 15px', 
              width: '100%', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Export to Excel Button */}
          <button
            onClick={handleExportToExcel}
            disabled={orders.length === 0}
            style={{
              backgroundColor: orders.length === 0 ? '#ccc' : '#16a085',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: orders.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Export to Excel
          </button>

          {/* Import from Excel Button */}
          <button
            onClick={() => document.getElementById('importExcelInput').click()}
            style={{
              backgroundColor: '#2980b9',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Import from Excel
          </button>

          {/* Hidden file input for import */}
          <input
            id="importExcelInput"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleImportFromExcel}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Grouped Orders by Month */}
      {Object.entries(groupedOrders).length > 0 ? (
        Object.entries(groupedOrders)
          .sort(([keyA], [keyB]) => {
            // Extract month numbers from keys
            const monthA = parseInt(keyA.split('-')[1]);
            const monthB = parseInt(keyB.split('-')[1]);
            
            // Sort in descending order (most recent first)
            return monthB - monthA;
          })
          .map(([monthYearKey, group]) => (
          <div key={monthYearKey} style={{ marginBottom: '30px' }}>
            {/* Month Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#218c74',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '8px 8px 0 0',
              marginBottom: '2px'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>{group.name}</h3>
              <div style={{ display: 'flex', gap: '20px' }}>
                {/* Month Total Amount */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Amount</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>₹{group.totals.amount.toLocaleString('en-IN')}</div>
                </div>
                
                {/* Month Total Advance */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Advance</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>₹{group.totals.advance.toLocaleString('en-IN')}</div>
                </div>
                
                {/* Month Total Balance */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Balance</div>
                  <div style={{ 
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: group.totals.balance > 0 ? '#ffeb3b' : 'white'
                  }}>
                    ₹{group.totals.balance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table - MODIFIED TO HAVE STICKY HEADERS */}
            <div style={{ overflowX: 'auto', height: '500px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead style={{ backgroundColor: '#218c74', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>S.No</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Executive</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Business</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Customer</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Location</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Sale Closed By</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Contact</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Order No</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Order Date</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Client Type</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Description</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Requirement</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Qty</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Rate</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Total</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Discount</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' , backgroundColor: '#218c74'}}>Final Amount</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' , backgroundColor: '#218c74'}}>Delivery Date</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Service Assigned</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Status</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' , backgroundColor: '#218c74'}}>Advance</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' , backgroundColor: '#218c74'}}>Balance</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Advance Date</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center' , backgroundColor: '#218c74'}}>Payment Date</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Payment Method</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Cheque Number</th>
                    <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.orders.map((order, orderIndex) =>
                    order.rows.filter(filterOrders(order)).map((row, rowIndex) => (
                      <tr 
                        key={`${order._id}-${rowIndex}`} 
                        style={{ 
                          backgroundColor: (orderIndex + rowIndex) % 2 === 0 ? '#fdfdfd' : '#f5f9fa',
                          borderBottom: '1px solid #eee'
                        }}
                      >
                        {/* Order Data Cells */}
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{orderIndex + 1}</td>
                        <td style={{ padding: '10px 8px' }}>{order.executive}</td>
                        <td style={{ padding: '10px 8px' }}>{order.business}</td>
                        <td style={{ padding: '10px 8px' }}>{order.contactPerson}</td>
                        <td style={{ padding: '10px 8px' }}>{order.location}</td>
                        <td style={{ padding: '10px 8px' }}>{order.saleClosedBy}</td>
                        <td style={{ padding: '10px 8px' }}>{order.contactCode} {order.phone}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{order.orderNo}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{formatDate(order.orderDate)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{order.clientType}</td>
                        <td style={{ padding: '10px 8px' }}>{row.description}</td>
                        <td style={{ padding: '10px 8px' }}>{row.requirement}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{row.quantity}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{row.rate}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>{row.total}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e67e22' }}>{order.discount}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#27ae60' }}>{order.discountedTotal}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{formatDate(row.deliveryDate)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'left' }}>
                          {row.assignedExecutive ? (
                            <span style={{
                              backgroundColor: '#e3f2fd',
                              color: '#1565c0',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {row.assignedExecutive}
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#fff3e0',
                              color: '#e65100',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              Not Assigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{
                            backgroundColor: row.status === 'Completed' ? '#d4edda' : 
                                          row.status === 'In Progress' ? '#fff3cd' : 
                                          row.status === 'Pending' ? '#f8d7da' : '#e2e3e5',
                            color: row.status === 'Completed' ? '#155724' : 
                                  row.status === 'In Progress' ? '#856404' : 
                                  row.status === 'Pending' ? '#721c24' : '#383d41',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            minWidth: '80px'
                          }}>
                            {row.status || 'Not Set'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{order.advance}</td>
                        <td style={{ 
                          padding: '10px 8px', 
                          textAlign: 'right',
                          fontWeight: 'bold',
                          color: order.balance > 0 ? '#e74c3c' : '#2ecc71'
                        }}>
                          {order.balance}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{formatDate(order.advanceDate)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{formatDate(order.paymentDate)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{order.paymentMethod}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>{order.chequeNumber}</td>
                        
                        {/* Action Buttons */}
                        <td style={{ 
                          padding: '10px 8px', 
                          display: 'flex', 
                          gap: '8px', 
                          justifyContent: 'center',
                          flexWrap: 'wrap'
                        }}>
                          {order.balance <= 0 ? (
                            <span style={{
                              backgroundColor: '#2ecc71',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              whiteSpace: 'nowrap'
                            }}>
                              Paid
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => handleRecordPayment(order)}
                                disabled={paymentLoading}
                                style={{
                                  backgroundColor: paymentLoading ? '#bdc3c7' : '#9b59b6',
                                  color: 'white',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {paymentLoading ? 'Loading...' : 'Record Payment'}
                              </button>
                              
                              <button
                                onClick={() => handleEdit(order)}
                                style={{
                                  backgroundColor: '#3498db',
                                  color: 'white',
                                  padding: '6px 12px',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                Edit
                              </button>
                              
                              {userRole === 'Admin' && (
                                <button
                                  onClick={() => confirmDelete(order._id)}
                                  style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#666' }}>No orders found for 2025</h3>
          <p style={{ color: '#999' }}>Try adjusting your search or importing orders</p>
        </div>
      )}
      {/* Payment Modal */}
      {showPaymentsModal && currentOrder && (
        <div style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            width: '500px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>Record Payment</h2>
            
            {/* Order Summary */}
            <div style={{ marginBottom: '20px', border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
              <h3 style={{ marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                Order Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <strong>Order No:</strong> {currentOrder.orderNo}
                </div>
                <div>
                  <strong>Customer:</strong> {currentOrder.contactPerson}
                </div>
                <div>
                  <strong>Location:</strong> {currentOrder.location}
                </div>
                <div>
                  <strong>Sale Closed By:</strong> {currentOrder.saleClosedBy}
                </div>
                <div>
                  <strong>Total Amount:</strong> ₹{currentOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0).toFixed(2)}
                </div>
                <div>
                  <strong>Discount:</strong> ₹{parseFloat(currentOrder.discount || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Final Amount:</strong> ₹{parseFloat(currentOrder.discountedTotal || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Advance Paid:</strong> ₹{parseFloat(currentOrder.advance || 0).toFixed(2)}
                </div>
                <div>
                  <strong>Current Balance:</strong> 
                  <span style={{ color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71', fontWeight: 'bold' }}>
                    ₹{parseFloat(currentOrder.balance || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History Section */}
            {paymentHistory.length > 0 && (
              <div style={{ marginBottom: '20px', border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
                <h3 style={{ marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                  Payment History
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Method</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{formatDate(payment.date)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '8px' }}>{payment.method}</td>
                        <td style={{ padding: '8px' }}>{payment.reference}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '8px' }}>Total Paid:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        ₹{paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px' }} colSpan="2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment Form */}
            <form onSubmit={handlePaymentSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Pending Amount</label>
                <input
                  type="text"
                  value={`₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold',
                    color: currentOrder.balance > 0 ? '#e74c3c' : '#2ecc71',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Amount to Pay *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentData.amount}
                  onChange={handlePaymentChange}
                  placeholder={`Enter amount (max: ₹${currentOrder.balance ? parseFloat(currentOrder.balance).toLocaleString('en-IN') : '0'}`}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                  required
                  min="0.01"
                  step="0.01"
                  max={currentOrder.balance || 0}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Payment Date *</label>
                <input
                  type="date"
                  name="date"
                  value={paymentData.date}
                  onChange={handlePaymentChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Payment Method *</label>
                <select
                  name="method"
                  value={paymentData.method}
                  onChange={handlePaymentChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
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
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                    {paymentData.method === 'Cheque' ? 'Cheque Number' :
                     paymentData.method === 'UPI' ? 'UPI Reference' : 'Transaction ID'} *
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={paymentData.reference}
                    onChange={handlePaymentChange}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                    required
                  />
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Notes</label>
                <textarea
                  name="note"
                  value={paymentData.note}
                  onChange={handlePaymentChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    minHeight: '60px'
                  }}
                  placeholder="Additional payment details"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPaymentsModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showModal && editingOrder && (
        <div style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000
        }}>
          <form onSubmit={handleEditSubmit} style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            minWidth: '700px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Edit Order</h2>

            {/* Order Fields Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              {/* Business Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Business</label>
                <input 
                  name="business" 
                  value={editingOrder.business} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Contact Person Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Person</label>
                <input 
                  name="contactPerson" 
                  value={editingOrder.contactPerson} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Location Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Location</label>
                <input 
                  name="location" 
                  value={editingOrder.location} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Sale Closed By Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Sale Closed By</label>
                <input 
                  name="saleClosedBy" 
                  value={editingOrder.saleClosedBy} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Contact Code Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Code</label>
                <input 
                  name="contactCode" 
                  value={editingOrder.contactCode} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Phone Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
                <input 
                  name="phone" 
                  value={editingOrder.phone} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Order No Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order No</label>
                <input 
                  name="orderNo" 
                  value={editingOrder.orderNo} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Order Date Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order Date</label>
                <input 
                  name="orderDate" 
                  type="date" 
                  value={editingOrder.orderDate} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Client Type Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Client Type</label>
                <select
                  name="clientType"
                  value={editingOrder.clientType}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="New">New</option>
                  <option value="Renewal">Renewal</option>
                  <option value="Agent">Agent</option>
                </select>
              </div>
              
              {/* Discount Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Discount</label>
                <input 
                  name="discount" 
                  type="number" 
                  value={editingOrder.discount} 
                  onChange={(e) => handleEditChange(e)}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Final Amount Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Final Amount</label>
                <input 
                  name="discountedTotal" 
                  type="number" 
                  value={editingOrder.discountedTotal} 
                  readOnly
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ccc',
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold'
                  }}
                />
              </div>
              
              {/* Advance Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Advance</label>
                <input 
                  name="advance" 
                  type="number" 
                  value={editingOrder.advance} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Balance Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Balance</label>
                <input 
                  name="balance" 
                  type="number" 
                  value={editingOrder.balance} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Advance Date Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Advance Date</label>
                <input 
                  name="advanceDate" 
                  type="date" 
                  value={editingOrder.advanceDate} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Payment Date Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Payment Date</label>
                <input 
                  name="paymentDate" 
                  type="date" 
                  value={editingOrder.paymentDate} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Payment Method Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Payment Method</label>
                <input 
                  name="paymentMethod" 
                  value={editingOrder.paymentMethod} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              
              {/* Cheque Number Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Cheque Number</label>
                <input 
                  name="chequeNumber" 
                  value={editingOrder.chequeNumber} 
                  onChange={handleEditChange} 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            {/* Order Items Section */}
            <h3 style={{ marginBottom: '15px' }}>Order Items</h3>
            {editingOrder.rows.map((row, index) => (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
                gap: '15px',
                marginBottom: '15px',
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                {/* Description Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                  <input
                    value={row.description}
                    onChange={(e) => handleEditRowChange(index, 'description', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Requirement Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Requirement</label>
                  <input
                    value={row.requirement}
                    onChange={(e) => handleEditRowChange(index, 'requirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Custom Requirement Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Custom Requirement</label>
                  <input
                    value={row.customRequirement}
                    onChange={(e) => handleEditRowChange(index, 'customRequirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Quantity Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => handleEditRowChange(index, 'quantity', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Rate Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Rate</label>
                  <input
                    type="number"
                    value={row.rate}
                    onChange={(e) => handleEditRowChange(index, 'rate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Delivery Date Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Delivery Date</label>
                  <input
                    type="date"
                    value={row.deliveryDate}
                    onChange={(e) => handleEditRowChange(index, 'deliveryDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Start Date Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Start Date</label>
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => handleEditRowChange(index, 'startDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* End Date Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>End Date</label>
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => handleEditRowChange(index, 'endDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Service Assigned Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Service Assigned To</label>
                  <input
                    value={row.assignedExecutive}
                    onChange={(e) => handleEditRowChange(index, 'assignedExecutive', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    placeholder="Enter service executive name"
                  />
                </div>
                
                {/* Status Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Status</label>
                  <select
                    value={row.status}
                    onChange={(e) => handleEditRowChange(index, 'status', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">Select Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                
                {/* Remark Field */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Remark</label>
                  <input
                    value={row.remark}
                    onChange={(e) => handleEditRowChange(index, 'remark', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>
                
                {/* Is Completed Field */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ marginBottom: '5px' }}>Is Completed:</label>
                  <input
                    type="checkbox"
                    checked={row.isCompleted || false}
                    onChange={(e) => handleEditRowChange(index, 'isCompleted', e.target.checked)}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
              </div>
            ))}

            {/* Form Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          display: 'flex',
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0 }}>Confirm Delete</h3>
            <p>Are you sure you want to delete this order? This action cannot be undone.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewOrders;