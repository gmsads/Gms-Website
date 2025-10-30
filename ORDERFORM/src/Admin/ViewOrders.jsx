import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function ViewOrders() {
  // State management
  const [orders, setOrders] = useState([]);
  const [groupedOrders, setGroupedOrders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState('');
  const [executiveName, setExecutiveName] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
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
  const [appliedExecutiveFilters, setAppliedExecutiveFilters] = useState({
    executive: '',
    executiveType: '',
    executiveName: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Month filter info state
  const [monthFilterInfo, setMonthFilterInfo] = useState({
    monthCount: 0,
    monthName: '',
    weekCount: 0
  });

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
    IMPORT_ORDERS: `${API_BASE_URL}/orders/import`,
    TRASH_ORDERS: `${API_BASE_URL}/orders/trash`,
    RESTORE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/restore`,
    PERMANENT_DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/permanent`
  };

  // Check if user should see summary cards
  const shouldShowSummaryCards = () => {
    const rolesThatCanSeeCards = ['Admin', 'Account', 'Service Executive'];
    return rolesThatCanSeeCards.includes(userRole);
  };

  // Check if user should see only their own orders
  const shouldSeeOnlyOwnOrders = () => {
    const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
    return !rolesThatCanSeeAll.includes(userRole);
  };

  // Check if user can delete orders (Admin only)
  const canDeleteOrders = () => {
    return userRole === 'Admin';
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

  // Calculate totals for summary cards
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
    totalBalance
  } = calculateTotals();

  // Get user info from localStorage with proper fallbacks
  const getUserInfo = () => {
    try {
      const role = localStorage.getItem('role') || '';
      const name = localStorage.getItem('name') || localStorage.getItem('userName') || '';
      
      console.log('User info from localStorage:', { role, name });
      
      setUserRole(role);
      setExecutiveName(name);
      
      return { role, name };
    } catch (error) {
      console.error('Error getting user info from localStorage:', error);
      return { role: '', name: '' };
    }
  };

  // Fetch orders on component mount or when filters change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const month = params.get('month');
    const year = params.get('year');
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveType = params.get('executiveType');
    const executiveName = params.get('executiveName');
    
    const monthCount = params.get('monthCount');
    const monthName = params.get('monthName');
    const weekCount = params.get('weekCount');

    if (month) setMonthFilter(parseInt(month));
    if (year) setYearFilter(parseInt(year));
    if (clientType) setClientTypeFilter(clientType);

    if (monthCount || monthName || weekCount) {
      setMonthFilterInfo({
        monthCount: monthCount ? parseInt(monthCount) : 0,
        monthName: monthName || '',
        weekCount: weekCount ? parseInt(weekCount) : 0
      });
    }

    if (executive || executiveType || executiveName) {
      setAppliedExecutiveFilters({
        executive,
        executiveType,
        executiveName: executiveName ? decodeURIComponent(executiveName) : ''
      });
    }

    const { role, name } = getUserInfo();

    fetchOrders(role, name, month, year, clientType, executive, executiveName);
  }, [location.search]);

  // Fetch orders from API with proper role-based filtering
  const fetchOrders = async (role, name, month = null, year = null, clientType = null, executive = null, executiveName = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = API_ENDPOINTS.ORDERS;

      console.log('Fetching orders with params:', {
        role, name, month, year, clientType, executive, executiveName
      });

      const queryParams = new URLSearchParams();
      
      // CRITICAL FIX: Filter by executive name for non-privileged users
      const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
      const shouldFilter = role && !rolesThatCanSeeAll.includes(role) && name;
      
      if (shouldFilter) {
        queryParams.append('executive', name);
        console.log('🔒 FILTERING: Showing only orders for executive:', name);
      } else {
        console.log('👑 NO FILTER: Showing all orders for role:', role);
      }

      if (month) queryParams.append('month', month);
      if (year) queryParams.append('year', year);
      if (clientType) queryParams.append('clientType', clientType);
      if (executive) queryParams.append('executive', executive);
      if (executiveName) queryParams.append('executiveName', executiveName);

      console.log('📡 API Call:', `${url}?${queryParams.toString()}`);
      const res = await axios.get(`${url}?${queryParams.toString()}`);
      console.log('📦 Total orders received from API:', res.data.length);

      let filteredOrders = res.data;

      filteredOrders = filteredOrders.filter(order => {
        if (!order.orderDate) return false;
        const orderDate = new Date(order.orderDate);
        if (isNaN(orderDate.getTime())) return false;
        return orderDate.getFullYear() === 2025;
      });

      console.log('📊 Orders after 2025 filter:', filteredOrders.length);

      if (shouldFilter) {
        const userOrders = filteredOrders.filter(order => order.executive === name);
        console.log('🔍 VERIFICATION: User orders count:', userOrders.length);
        console.log('🔍 VERIFICATION: User orders:', userOrders.map(o => ({ 
          orderNo: o.orderNo, 
          executive: o.executive,
          match: o.executive === name 
        })));
      }

      const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate || 0);
        const dateB = new Date(b.orderDate || 0);
        return dateB - dateA;
      });

      setOrders(sortedOrders);
      setGroupedOrders(groupOrdersByMonth(sortedOrders));

      console.log('✅ Final orders count:', sortedOrders.length);
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
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
    setAppliedExecutiveFilters({
      executive: '',
      executiveType: '',
      executiveName: ''
    });
    setMonthFilterInfo({ monthCount: 0, monthName: '', weekCount: 0 });
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
    params.delete('week');
    params.delete('monthCount');
    params.delete('monthName');
    params.delete('weekCount');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    setMonthFilterInfo({ monthCount: 0, monthName: '', weekCount: 0 });
  };

  // Clear executive filter only
  const clearExecutiveFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('executive');
    params.delete('executiveType');
    params.delete('executiveName');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    setAppliedExecutiveFilters({
      executive: '',
      executiveType: '',
      executiveName: ''
    });
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
    if (shouldSeeOnlyOwnOrders() && order.executive !== executiveName) {
      toast.error('You can only edit your own orders');
      return;
    }
    
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
      
      const { role, name } = getUserInfo();
      fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
      
      toast.success('Order updated successfully!');
    } catch (err) {
      console.error('Update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update order');
    }
  };

  // Confirm delete order
  const confirmDelete = (orderId) => {
    const orderToDeleteObj = orders.find(order => order._id === orderId);
    if (shouldSeeOnlyOwnOrders() && orderToDeleteObj && orderToDeleteObj.executive !== executiveName) {
      toast.error('You can only delete your own orders');
      return;
    }
    
    console.log('Confirming delete for order:', orderId);
    setOrderToDelete(orderId);
    setShowDeleteModal(true);
  };

  // Handle delete order
  const handleDelete = async () => {
    try {
      if (!orderToDelete) {
        toast.error('No order selected for deletion');
        return;
      }

      console.log('Attempting to delete order:', orderToDelete);

      const response = await axios.delete(API_ENDPOINTS.DELETE_ORDER(orderToDelete), {
        data: {
          deletedBy: userRole === 'Admin' ? 'Admin' : executiveName,
          reason: 'Deleted from view orders page'
        }
      });

      console.log('Delete successful:', response.data);

      setShowDeleteModal(false);
      setOrderToDelete(null);

      const { role, name } = getUserInfo();
      fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);

      toast.success('Order moved to trash successfully!');
    } catch (err) {
      console.error('Delete error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      let errorMessage = 'Failed to delete order';

      if (err.response?.status === 404) {
        errorMessage = 'Order not found or already deleted';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  };

  // Prepare payment form (modified to include advance in history)
  const handleRecordPayment = async (order) => {
    if (shouldSeeOnlyOwnOrders() && order.executive !== executiveName) {
      toast.error('You can only record payments for your own orders');
      return;
    }
    
    try {
      setPaymentLoading(true);
      setCurrentOrder(order);

      // Create payment history that includes advance
      const payments = [];
      
      // Add advance as first payment if it exists
      if (order.advance > 0) {
        payments.push({
          date: order.advanceDate || order.orderDate,
          amount: order.advance,
          method: 'Advance',
          reference: '',
          note: 'Initial advance payment'
        });
      }
      
      // Add regular payment history
      if (order.paymentHistory) {
        payments.push(...order.paymentHistory);
      }

      setPaymentHistory(payments);

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

  // New function to handle viewing payments only
  const handleViewPayments = async (order) => {
    try {
      setPaymentLoading(true);
      setCurrentOrder(order);

      // Create payment history that includes advance
      const payments = [];
      
      // Add advance as first payment if it exists
      if (order.advance > 0) {
        payments.push({
          date: order.advanceDate || order.orderDate,
          amount: order.advance,
          method: 'Advance',
          reference: '',
          note: 'Initial advance payment'
        });
      }
      
      // Add regular payment history
      if (order.paymentHistory) {
        payments.push(...order.paymentHistory);
      }

      setPaymentHistory(payments);

      // Set payment data to empty since we're just viewing
      setPaymentData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        method: 'Cash',
        reference: '',
        note: ''
      });

      setShowPaymentsModal(true);
    } catch (err) {
      console.error('Error in handleViewPayments:', err);
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

      const paymentPayload = {
        date: paymentData.date,
        amount: paymentAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        note: paymentData.note
      };

      await axios.post(
        API_ENDPOINTS.RECORD_PAYMENT(currentOrder._id),
        paymentPayload
      );

      toast.success('Payment recorded successfully!');
      
      const { role, name } = getUserInfo();
      fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
      
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
    let ordersToExport = orders;
    if (shouldSeeOnlyOwnOrders()) {
      ordersToExport = orders.filter(order => order.executive === executiveName);
    }

    const orders2025 = ordersToExport.filter(order => {
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
        'Created By': order.createdBy || order.executive,
        'Payments': order.paymentHistory ?
          order.paymentHistory.map(p => `${formatDate(p.date)}: ₹${p.amount} (${p.method})`).join('; ') : ''
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(flattenedOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    XLSX.writeFile(workbook, shouldSeeOnlyOwnOrders() ? `my_orders_2025_export.xlsx` : 'orders_2025_export.xlsx');
  };

  // Import orders from Excel
  const handleImportFromExcel = async (e) => {
    if (shouldSeeOnlyOwnOrders()) {
      toast.error('You do not have permission to import orders');
      return;
    }
    
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
          chequeNumber: item['Cheque Number'] || '',
          createdBy: item['Created By'] || item['Executive']
        }));

        await axios.post(API_ENDPOINTS.IMPORT_ORDERS, ordersToImport);
        
        const { role, name } = getUserInfo();
        fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
        
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
      order.executive || '',
      order.business || '',
      order.contactPerson || '',
      order.location || '',
      order.saleClosedBy || '',
      `${order.contactCode || ''} ${order.phone || ''}`,
      order.orderNo || '',
      order.orderDate || '',
      order.clientType || '',
      row.description || '',
      row.requirement || '',
      row.customRequirement || '',
      row.quantity || '',
      row.rate || '',
      row.total || '',
      order.discount || '',
      order.discountedTotal || '',
      row.deliveryDate || '',
      row.assignedExecutive || '',
      row.status || '',
      row.remark || '',
      order.advance || '',
      order.balance || '',
      order.advanceDate || '',
      order.paymentDate || '',
      order.paymentMethod || '',
      order.chequeNumber || '',
      order.createdBy || ''
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
            onClick={() => {
              const { role, name } = getUserInfo();
              fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
            }}
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

      {/* User Role Info Banner */}
      <div style={{
        backgroundColor: shouldSeeOnlyOwnOrders() ? '#e3f2fd' : '#f3e5f5',
        padding: '10px 15px',
        borderRadius: '6px',
        marginBottom: '20px',
        border: `2px solid ${shouldSeeOnlyOwnOrders() ? '#2196f3' : '#9c27b0'}`,
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        {shouldSeeOnlyOwnOrders() 
          ? `👤 Viewing Your Orders Only - ${executiveName || 'User'} (${userRole || 'User'})`
          : `👑 Viewing All Orders - ${userRole || 'Admin'} Role`
        }
      </div>

      {/* Summary Cards - Only show for Admin, Account, and Service Executive */}
      {shouldShowSummaryCards() && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(52, 152, 219, 0.3)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>Total Amount</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>₹{totalAmount}</div>
          </div>

          <div style={{
            backgroundColor: totalBalance > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: `1px solid ${totalBalance > 0 ? 'rgba(231, 76, 60, 0.3)' : 'rgba(39, 174, 96, 0.3)'}`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>Total Balance</div>
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

      {/* Month Filter Info Section */}
      {(monthFilterInfo.monthCount > 0 || monthFilterInfo.weekCount > 0) && (
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #1976d2'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            Filtered Orders Summary
          </h3>
          {monthFilterInfo.monthCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'white',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: 'bold' }}>📊 {monthFilterInfo.monthName}:</span>
              <span style={{
                backgroundColor: '#1976d2',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {monthFilterInfo.monthCount} Orders
              </span>
            </div>
          )}
          {monthFilterInfo.weekCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'white',
              padding: '10px',
              borderRadius: '4px'
            }}>
              <span style={{ fontWeight: 'bold' }}>📅 Week {new URLSearchParams(location.search).get('week')}:</span>
              <span style={{
                backgroundColor: '#2196f3',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: 'bold'
              }}>
                {monthFilterInfo.weekCount} Orders
              </span>
            </div>
          )}
        </div>
      )}

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
        {(monthFilter || clientTypeFilter || appliedExecutiveFilters.executiveName) && (
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

        {appliedExecutiveFilters.executiveName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>
                {appliedExecutiveFilters.executiveType === 'executive' ? 'Sales Executive' :
                  appliedExecutiveFilters.executiveType === 'service' ? 'Service Executive' :
                    appliedExecutiveFilters.executiveType === 'account' ? 'Account Executive' : 'Executive'}:
              </strong> {appliedExecutiveFilters.executiveName}
            </span>
            <button
              onClick={clearExecutiveFilter}
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

        {(monthFilter || clientTypeFilter || appliedExecutiveFilters.executiveName) && (
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

          {/* Import from Excel Button - Only show for Admin, Account, and Service Executive */}
          {!shouldSeeOnlyOwnOrders() && (
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
          )}

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
            const monthA = parseInt(keyA.split('-')[1]);
            const monthB = parseInt(keyB.split('-')[1]);
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
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Amount</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>₹{group.totals.amount.toLocaleString('en-IN')}</div>
                  </div>

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

              {/* Orders Table */}
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
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Final Amount</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Delivery Date</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Service Assigned</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Status</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Created By</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Advance</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Balance</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Advance Date</th>
                      <th style={{ padding: '12px 8px', fontSize: '14px', textAlign: 'center', backgroundColor: '#218c74' }}>Payment Date</th>
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
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{orderIndex + 1}</td>
                          <td style={{ padding: '10px 8px' }}>{order.executive}</td>

                          {/* THIS IS THE CHANGED PART - Business name clickable only for Admin */}
                          <td style={{ padding: '10px 8px' }}>
                            {userRole === 'Admin' ? (
                              <button
                                onClick={() => navigate(`/admin-dashboard/ledger?business=${encodeURIComponent(order.business)}`)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#003366',
                                  cursor: 'pointer',
                                  padding: '4px 8px',
                                  fontSize: 'inherit',
                                  fontFamily: 'inherit',
                                  borderRadius: '4px',
                                  transition: 'all 0.2s ease',
                                  fontWeight: '500'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.backgroundColor = '#e3f2fd';
                                  e.target.style.color = '#003366';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = 'transparent';
                                  e.target.style.color = '#003366';
                                }}
                              >
                                {order.business}
                              </button>
                            ) : (
                              // For non-admin users (executives), just show the business name as plain text
                              <span style={{ color: '#003366', fontWeight: '500' }}>
                                {order.business}
                              </span>
                            )}
                          </td>

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
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {order.createdBy && order.createdBy !== order.executive ? (
                              <span style={{
                                backgroundColor: '#e8f5e8',
                                color: '#2e7d32',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                display: 'inline-block'
                              }}>
                                Admin: {order.createdBy}
                              </span>
                            ) : (
                              <span style={{
                                color: '#666',
                                fontSize: '12px'
                              }}>
                                {order.executive}
                              </span>
                            )}
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
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {order.paymentMethods && order.paymentMethods.length > 0
                              ? order.paymentMethods.join(', ')
                              : 'Not specified'}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{order.chequeNumber}</td>

                          {/* Action Buttons */}
                          <td style={{
                            padding: '10px 8px',
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                          }}>
                            {/* Always show View Payments button */}
                            <button
                              onClick={() => handleViewPayments(order)}
                              disabled={paymentLoading}
                              style={{
                                backgroundColor: '#3498db',
                                color: 'white',
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: paymentLoading ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {paymentLoading ? 'Loading...' : 'View Payments'}
                            </button>

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
                                    backgroundColor: '#f39c12',
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

                                {/* DELETE BUTTON - ONLY SHOW FOR ADMIN USERS */}
                                {canDeleteOrders() && (
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
          <p style={{ color: '#999' }}>
            {shouldSeeOnlyOwnOrders() && `for executive: ${executiveName}`}
            {appliedExecutiveFilters.executiveName && `for executive: ${appliedExecutiveFilters.executiveName}`}
            {appliedExecutiveFilters.executiveName && (monthFilter || clientTypeFilter) && ' and '}
            {monthFilter && `in ${new Date(2025, monthFilter - 1).toLocaleString('default', { month: 'long' })}`}
            {clientTypeFilter && `with client type: ${clientTypeFilter}`}
          </p>
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
            <h2 style={{ marginTop: 0, textAlign: 'center' }}>
              {paymentData.amount ? 'Record Payment' : 'Payment History'}
            </h2>

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
                  <strong>Created By:</strong> {currentOrder.createdBy || currentOrder.executive}
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
                      <th style={{ padding: '8px', textAlign: 'left' }}>Note</th>
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
                        <td style={{ padding: '8px' }}>{payment.note}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '8px' }}>Total Paid:</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        ₹{paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '8px' }} colSpan="3"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {paymentData.amount && (
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
            )}

            {!paymentData.amount && (
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
                  Close
                </button>
                {currentOrder.balance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentData(prev => ({
                        ...prev,
                        amount: currentOrder.balance > 0 ? currentOrder.balance.toString() : ''
                      }));
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#9b59b6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Record New Payment
                  </button>
                )}
              </div>
            )}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Business</label>
                <input
                  name="business"
                  value={editingOrder.business}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Person</label>
                <input
                  name="contactPerson"
                  value={editingOrder.contactPerson}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Location</label>
                <input
                  name="location"
                  value={editingOrder.location}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Sale Closed By</label>
                <input
                  name="saleClosedBy"
                  value={editingOrder.saleClosedBy}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Code</label>
                <input
                  name="contactCode"
                  value={editingOrder.contactCode}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
                <input
                  name="phone"
                  value={editingOrder.phone}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order No</label>
                <input
                  name="orderNo"
                  value={editingOrder.orderNo}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

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

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Created By</label>
                <input
                  name="createdBy"
                  value={editingOrder.createdBy || editingOrder.executive}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    backgroundColor: '#f5f5f5'
                  }}
                />
              </div>

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

              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Payment Method</label>
                <select
                  name="paymentMethods"
                  value={editingOrder.paymentMethods && editingOrder.paymentMethods[0] || ''}
                  onChange={(e) => {
                    const methods = e.target.value ? [e.target.value] : [];
                    setEditingOrder(prev => ({ ...prev, paymentMethods: methods }));
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">Select Payment Method</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <optgroup label="UPI">
                    <option value="9985330008@Chary">9985330008@Chary</option>
                    <option value="9985330004@Swathi">9985330004@Swathi</option>
                    <option value="9553146376@Laxmipathi">9553146376@Laxmipathi</option>
                  </optgroup>
                  <option value="Other">Other</option>
                </select>
              </div>

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
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                  <input
                    value={row.description}
                    onChange={(e) => handleEditRowChange(index, 'description', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Requirement</label>
                  <input
                    value={row.requirement}
                    onChange={(e) => handleEditRowChange(index, 'requirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Custom Requirement</label>
                  <input
                    value={row.customRequirement}
                    onChange={(e) => handleEditRowChange(index, 'customRequirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => handleEditRowChange(index, 'quantity', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Rate</label>
                  <input
                    type="number"
                    value={row.rate}
                    onChange={(e) => handleEditRowChange(index, 'rate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Delivery Date</label>
                  <input
                    type="date"
                    value={row.deliveryDate}
                    onChange={(e) => handleEditRowChange(index, 'deliveryDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Start Date</label>
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => handleEditRowChange(index, 'startDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>End Date</label>
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => handleEditRowChange(index, 'endDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Service Assigned To</label>
                  <input
                    value={row.assignedExecutive}
                    onChange={(e) => handleEditRowChange(index, 'assignedExecutive', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    placeholder="Enter service executive name"
                  />
                </div>

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

                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Remark</label>
                  <input
                    value={row.remark}
                    onChange={(e) => handleEditRowChange(index, 'remark', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

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
      {showDeleteModal && (
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
            padding: '25px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, color: '#e74c3c' }}>Confirm Deletion</h3>
            <p style={{ margin: '20px 0', fontSize: '16px' }}>
              Are you sure you want to delete this order?
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setOrderToDelete(null);
                }}
                style={{
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
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