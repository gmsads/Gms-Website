// Import necessary React hooks and external libraries
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Main ViewOrders component function
function ViewOrders() {
  // State management for orders data
  const [orders, setOrders] = useState([]); // Stores all orders
  const [groupedOrders, setGroupedOrders] = useState({}); // Orders grouped by month
  const [searchTerm, setSearchTerm] = useState(''); // Search filter term
  const [userRole, setUserRole] = useState(''); // Current user's role
  const [executiveName, setExecutiveName] = useState(''); // Current user's name
  const [editingOrder, setEditingOrder] = useState(null); // Order being edited
  const [showModal, setShowModal] = useState(false); // Edit modal visibility
  const [orderToDelete, setOrderToDelete] = useState(null); // Order marked for deletion
  const [showPaymentsModal, setShowPaymentsModal] = useState(false); // Payments modal visibility
  const [paymentData, setPaymentData] = useState({ // Payment form data
    date: new Date().toISOString().split('T')[0], // Default to today's date
    amount: '', // Payment amount
    method: 'Cash', // Payment method
    reference: '', // Payment reference
    note: '' // Payment notes
  });
  const [currentOrder, setCurrentOrder] = useState(null); // Order currently being viewed
  const [paymentHistory, setPaymentHistory] = useState([]); // Payment history for current order
  const [monthFilter, setMonthFilter] = useState(null); // Month filter value
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear()); // Year filter value (default to current year)
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState(null); // Error state
  const [paymentLoading, setPaymentLoading] = useState(false); // Payment processing state
  const [clientTypeFilter, setClientTypeFilter] = useState(null); // Client type filter
  const [appliedExecutiveFilters, setAppliedExecutiveFilters] = useState({ // Executive filters
    executive: '', // Executive type
    executiveType: '', // Executive category
    executiveName: '' // Executive name
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Delete confirmation modal
  
  // Month navigation states
  const [currentViewMonth, setCurrentViewMonth] = useState(null); // Current month being viewed
  const [currentViewYear, setCurrentViewYear] = useState(new Date().getFullYear()); // Current year being viewed

  // Month filter information state
  const [monthFilterInfo, setMonthFilterInfo] = useState({
    monthCount: 0, // Number of orders in month
    monthName: '', // Month name
    weekCount: 0 // Number of orders in week
  });

  // React Router hooks for navigation and location
  const location = useLocation(); // Get current route location
  const navigate = useNavigate(); // Navigation function

  // API configuration constants
  const API_BASE_URL = '/api'; // Base API URL
  const API_ENDPOINTS = { // API endpoint definitions
    ORDERS: `${API_BASE_URL}/orders`, // Get all orders
    GET_ORDER: (id) => `${API_BASE_URL}/orders/${id}`, // Get specific order
    UPDATE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`, // Update order
    DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}`, // Delete order
    RECORD_PAYMENT: (id) => `${API_BASE_URL}/orders/${id}/record-payment`, // Record payment
    GET_PAYMENTS: (id) => `${API_BASE_URL}/orders/${id}`, // Get payment history
    IMPORT_ORDERS: `${API_BASE_URL}/orders/import`, // Import orders
    TRASH_ORDERS: `${API_BASE_URL}/orders/trash`, // Get trashed orders
    RESTORE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/restore`, // Restore order
    PERMANENT_DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/permanent` // Permanent delete
  };

  // Function to check if user should see summary cards
  const shouldShowSummaryCards = () => {
    // Define roles that can see summary cards
    const rolesThatCanSeeCards = ['Admin', 'Account', 'Service Executive'];
    // Return true if current role is in allowed roles
    return rolesThatCanSeeCards.includes(userRole);
  };

  // Function to check if user should see only their own orders
  const shouldSeeOnlyOwnOrders = () => {
    // Define roles that can see all orders
    const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
    // Return true if current role is NOT in privileged roles
    return !rolesThatCanSeeAll.includes(userRole);
  };

  // Function to check if user can delete orders
  const canDeleteOrders = () => {
    // Only Admin users can delete orders
    return userRole === 'Admin';
  };

  // Function to check if user can export to Excel
  const canExportToExcel = () => {
    // Define roles that can export data
    const rolesThatCanExport = ['Admin', 'Account', 'Service Executive', 'Executive'];
    // Return true if current role can export
    return rolesThatCanExport.includes(userRole);
  };

  // Function to check if user can import from Excel
  const canImportFromExcel = () => {
    const rolesThatCanImport = ['Admin', 'Account', 'Service Executive', 'Executive'];
    return rolesThatCanImport.includes(userRole);
  };

  // Function to format date to DD-MM-YYYY format
  const formatDate = (dateString) => {
    // Return empty string if no date provided
    if (!dateString) return '';

    try {
      // Split date string by hyphens
      const parts = dateString.split('-');
      // Check if already in DD-MM-YYYY format
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return dateString; // Return as-is if already correct format
        }
        // Convert from YYYY-MM-DD to DD-MM-YYYY
        if (parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Create Date object from string
      const date = new Date(dateString);
      // Return original string if invalid date
      if (isNaN(date.getTime())) return dateString;

      // Extract day, month, year and format with leading zeros
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      // Return formatted date string
      return `${day}-${month}-${year}`;
    } catch {
      // Return original string on error
      return dateString;
    }
  };

  // Function to get month name from month number
  const getMonthName = (monthNumber) => {
    return new Date(yearFilter, monthNumber - 1).toLocaleString('default', { month: 'long' });
  };

  // Function to navigate between months
  const navigateToMonth = (direction) => {
    let newMonth = currentViewMonth;
    let newYear = currentViewYear;
    
    if (direction === 'next') {
      newMonth = newMonth === 12 ? 1 : newMonth + 1;
      newYear = newMonth === 1 ? newYear + 1 : newYear;
    } else if (direction === 'prev') {
      newMonth = newMonth === 1 ? 12 : newMonth - 1;
      newYear = newMonth === 12 ? newYear - 1 : newYear;
    }
    
    const params = new URLSearchParams();
    params.set('month', newMonth);
    params.set('year', newYear);
    
    // Remove other filters when navigating months
    params.delete('clientType');
    params.delete('executive');
    params.delete('executiveType');
    params.delete('executiveName');
    params.delete('week');
    params.delete('monthCount');
    params.delete('monthName');
    params.delete('weekCount');
    
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
  };

  // Function to group orders by month for selected year only
  const groupOrdersByMonth = (orders) => {
    // Initialize empty object for grouped orders
    const grouped = {};

    // Iterate through each order
    orders.forEach(order => {
      let date; // Variable to store parsed date

      // Parse order date from string
      if (order.orderDate && typeof order.orderDate === 'string') {
        const parts = order.orderDate.split('-');
        // Handle DD-MM-YYYY format
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          // Handle other date formats
          date = new Date(order.orderDate);
        }
      } else {
        // Handle Date objects
        date = new Date(order.orderDate);
      }

      // Skip if invalid date
      if (isNaN(date.getTime())) {
        console.warn('Invalid order date:', order.orderDate);
        return;
      }

      // Extract month and year from date
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      // Skip orders not from selected year
      if (year !== yearFilter) return;

      // Create month key (e.g., "2026-03")
      const monthStr = month.toString().padStart(2, '0');
      const monthYearKey = `${yearFilter}-${monthStr}`;

      // Initialize month group if it doesn't exist
      if (!grouped[monthYearKey]) {
        // Create formatted month name
        const monthYearName = new Date(yearFilter, month - 1).toLocaleString('default', {
          month: 'long',
          year: 'numeric'
        });

        // Initialize group with name, orders array, and totals
        grouped[monthYearKey] = {
          name: monthYearName,
          orders: [],
          totals: {
            amount: 0, // Total order amount
            received: 0, // Total received payments
            balance: 0 // Total balance due
          }
        };
      }

      // Calculate order total from rows
      let orderAmount = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
      
      // Calculate total received (advance + payment history)
      const orderAdvance = parseFloat(order.advance) || 0;
      let paymentHistoryTotal = 0;
      
      // Sum up payment history amounts
      if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
        paymentHistoryTotal = order.paymentHistory.reduce((sum, payment) => 
          sum + (parseFloat(payment.amount) || 0), 0);
      }
      
      // Calculate received amount and balance
      const orderReceived = orderAdvance + paymentHistoryTotal;
      const orderBalance = orderAmount - orderReceived;

      // Update group totals
      grouped[monthYearKey].totals.amount += orderAmount;
      grouped[monthYearKey].totals.received += orderReceived;
      grouped[monthYearKey].totals.balance += orderBalance;

      // Add order to group
      grouped[monthYearKey].orders.push(order);
    });

    // Return grouped orders
    return grouped;
  };

  // Function to calculate totals for summary cards
  const calculateTotals = () => {
    // Initialize total counters
    let totalAmount = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    // Iterate through all orders
    orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      // Only process orders from selected year
      if (orderDate.getFullYear() === yearFilter) {
        // Calculate order total from rows
        const orderTotal = order.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0);
        totalAmount += orderTotal;
        
        // Calculate total received (advance + all payments)
        const advanceReceived = parseFloat(order.advance) || 0;
        let paymentHistoryTotal = 0;
        
        // Sum payment history
        if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
          paymentHistoryTotal = order.paymentHistory.reduce((sum, payment) => 
            sum + (parseFloat(payment.amount) || 0), 0);
        }
        
        // Update received total
        totalReceived += advanceReceived + paymentHistoryTotal;
        
        // Calculate balance for this order
        const orderBalance = orderTotal - (advanceReceived + paymentHistoryTotal);
        totalBalance += orderBalance;
      }
    });

    // Return formatted totals
    return {
      totalAmount: totalAmount.toFixed(2), // Format to 2 decimal places
      totalReceived: totalReceived.toFixed(2),
      totalBalance: totalBalance.toFixed(2)
    };
  };

  // Calculate totals using the function
  const {
    totalAmount,
    totalReceived,
    totalBalance
  } = calculateTotals();

  // Function to get user info from localStorage
  const getUserInfo = () => {
    try {
      // Get role and name from localStorage with fallbacks
      const role = localStorage.getItem('role') || '';
      const name = localStorage.getItem('name') || localStorage.getItem('userName') || '';
      
      // Log user info for debugging
      console.log('User info from localStorage:', { role, name });
      
      // Update state with user info
      setUserRole(role);
      setExecutiveName(name);
      
      // Return user info
      return { role, name };
    } catch (error) {
      // Log error and return empty values
      console.error('Error getting user info from localStorage:', error);
      return { role: '', name: '' };
    }
  };

  // Function to fetch orders from API with proper role-based filtering
  const fetchOrders = async (role, name, month = null, year = null, clientType = null, executive = null, executiveName = null) => {
    // Set loading state and clear errors
    setLoading(true);
    setError(null);
    try {
      let url = API_ENDPOINTS.ORDERS;

      // Get URL parameters for executive filtering from performance view
      const searchParams = new URLSearchParams(location.search);
      const executiveFromUrl = searchParams.get('executive');
      const executiveTypeFromUrl = searchParams.get('executiveType');
      const executiveNameFromUrl = searchParams.get('executiveName');

      console.log('🔍 Fetching orders with params:', {
        role, 
        name, 
        month, 
        year, 
        clientType, 
        executive, 
        executiveName,
        executiveFromUrl,
        executiveTypeFromUrl,
        executiveNameFromUrl
      });

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // CASE 1: If specific executive filtering is requested from performance view
      if (executiveNameFromUrl) {
        console.log('🎯 Filtering by specific executive from performance view:', executiveNameFromUrl);
        queryParams.append('executive', executiveNameFromUrl);
        queryParams.append('filterByExecutive', 'true');
      }
      // CASE 2: Filter by current user if they're a regular executive
      else {
        const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
        const shouldFilter = role && !rolesThatCanSeeAll.includes(role) && name;
        
        if (shouldFilter) {
          queryParams.append('executive', name);
          console.log('👤 FILTERING: Showing only orders for current executive:', name);
        } else {
          console.log('👑 NO FILTER: Showing all orders for role:', role);
        }
      }

      // Add other filters to query parameters
      if (month) queryParams.append('month', month);
      if (year) queryParams.append('year', year);
      if (clientType) queryParams.append('clientType', clientType);
      if (executive) queryParams.append('executive', executive);
      if (executiveName) queryParams.append('executiveName', executiveName);

      // Log API call for debugging
      console.log('📡 API Call:', `${url}?${queryParams.toString()}`);
      
      // Make API request
      const res = await axios.get(`${url}?${queryParams.toString()}`);
      console.log('📦 Total orders received from API:', res.data.length);

      // Filter orders to only include selected year orders
      let filteredOrders = res.data.filter(order => {
        if (!order.orderDate) return false;
        const orderDate = new Date(order.orderDate);
        if (isNaN(orderDate.getTime())) return false;
        return orderDate.getFullYear() === yearFilter;
      });

      console.log(`📊 Orders after ${yearFilter} filter:`, filteredOrders.length);

      // Verify filtering for debugging
      if (executiveNameFromUrl) {
        const executiveOrders = filteredOrders.filter(order => order.executive === executiveNameFromUrl);
        console.log('🔍 VERIFICATION: Executive orders count:', executiveOrders.length);
        console.log('🔍 VERIFICATION: Executive orders:', executiveOrders.map(o => ({ 
          orderNo: o.orderNo, 
          executive: o.executive,
          match: o.executive === executiveNameFromUrl 
        })));
      }

      // Sort orders by date (newest first)
      const sortedOrders = filteredOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate || 0);
        const dateB = new Date(b.orderDate || 0);
        return dateB - dateA;
      });

      // Update state with fetched and processed orders
      setOrders(sortedOrders);
      setGroupedOrders(groupOrdersByMonth(sortedOrders));

      console.log('✅ Final orders count:', sortedOrders.length);
    } catch (err) {
      // Handle fetch errors
      console.error('❌ Error fetching orders:', err);
      setError('Failed to fetch orders. Please try again.');
      toast.error('Failed to fetch orders. Please try again.');
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  // useEffect hook to fetch orders on component mount or when filters change
  useEffect(() => {
    // Parse URL query parameters
    const params = new URLSearchParams(location.search);
    const month = params.get('month');
    const year = params.get('year');
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveType = params.get('executiveType');
    const executiveName = params.get('executiveName');
    
    // Parse month filter info
    const monthCount = params.get('monthCount');
    const monthName = params.get('monthName');
    const weekCount = params.get('weekCount');

    // Update state with filter values
    if (month) {
      setMonthFilter(parseInt(month));
      setCurrentViewMonth(parseInt(month));
    }
    if (year) {
      setYearFilter(parseInt(year));
      setCurrentViewYear(parseInt(year));
    }
    if (clientType) setClientTypeFilter(clientType);

    // Update month filter info state
    if (monthCount || monthName || weekCount) {
      setMonthFilterInfo({
        monthCount: monthCount ? parseInt(monthCount) : 0,
        monthName: monthName || '',
        weekCount: weekCount ? parseInt(weekCount) : 0
      });
    }

    // Update executive filters state - prioritize performance view filters
    const executiveNameFromUrl = params.get('executiveName');
    if (executiveNameFromUrl) {
      console.log('🎯 Setting executive filter from performance view:', executiveNameFromUrl);
      setAppliedExecutiveFilters({
        executive: executive || '',
        executiveType: executiveType || '',
        executiveName: executiveNameFromUrl ? decodeURIComponent(executiveNameFromUrl) : ''
      });
    } else if (executive || executiveType || executiveName) {
      setAppliedExecutiveFilters({
        executive,
        executiveType,
        executiveName: executiveName ? decodeURIComponent(executiveName) : ''
      });
    }

    // Handle business filter from navigation state (from PendingPayment)
    const businessFilter = location.state?.businessFilter;
    if (businessFilter) {
      setSearchTerm(businessFilter);
    }

    // Get user info and fetch orders
    const { role, name } = getUserInfo();
    fetchOrders(role, name, month, year, clientType, executive, executiveName);
  }, [location.search, location.state, yearFilter]); // Re-run when search params, location state, or yearFilter changes

  // Function to handle year change
  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setYearFilter(newYear);
    setCurrentViewYear(newYear);
    
    // Update URL with new year parameter
    const params = new URLSearchParams(location.search);
    params.set('year', newYear);
    navigate(`/admin-dashboard/view-orders?${params.toString()}`);
    
    // Refresh orders with new year filter
    const { role, name } = getUserInfo();
    const month = params.get('month');
    const clientType = params.get('clientType');
    const executive = params.get('executive');
    const executiveName = params.get('executiveName');
    fetchOrders(role, name, month, newYear, clientType, executive, executiveName);
  };

  // Function to clear all filters
  const clearAllFilters = () => {
    // Reset all filter states
    setMonthFilter(null);
    setYearFilter(new Date().getFullYear());
    setCurrentViewYear(new Date().getFullYear());
    setClientTypeFilter(null);
    setAppliedExecutiveFilters({
      executive: '',
      executiveType: '',
      executiveName: ''
    });
    setMonthFilterInfo({ monthCount: 0, monthName: '', weekCount: 0 });
    setSearchTerm(''); // Clear search term
    setCurrentViewMonth(null); // Clear current view month
    navigate('/admin-dashboard/view-orders'); // Navigate to base URL
  };

  // Function to clear client type filter only
  const clearClientTypeFilter = () => {
    const params = new URLSearchParams(location.search);
    params.delete('clientType'); // Remove client type from URL
    navigate(`/admin-dashboard/view-orders?${params.toString()}`); // Update URL
  };

  // Function to clear month filter
  const clearMonthFilter = () => {
    const params = new URLSearchParams(location.search);
    // Remove all month-related parameters
    params.delete('month');
    params.delete('year');
    params.delete('week');
    params.delete('monthCount');
    params.delete('monthName');
    params.delete('weekCount');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`); // Update URL
    setMonthFilterInfo({ monthCount: 0, monthName: '', weekCount: 0 }); // Reset month info
    setCurrentViewMonth(null); // Clear current view month
  };

  // Function to clear executive filter only
  const clearExecutiveFilter = () => {
    const params = new URLSearchParams(location.search);
    // Remove executive-related parameters
    params.delete('executive');
    params.delete('executiveType');
    params.delete('executiveName');
    navigate(`/admin-dashboard/view-orders?${params.toString()}`); // Update URL
    setAppliedExecutiveFilters({ // Reset executive filters state
      executive: '',
      executiveType: '',
      executiveName: ''
    });
  };

  // Function to clear search filter only
  const clearSearchFilter = () => {
    setSearchTerm(''); // Clear search term
  };

  // Function to format date for input fields (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return ''; // Return empty for null dates

    try {
      // Check if already in YYYY-MM-DD format
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }

      // Convert from DD-MM-YYYY to YYYY-MM-DD
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Create Date object and format to YYYY-MM-DD
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch {
      return ''; // Return empty on error
    }
  };

  // Function to prepare order for editing
  const handleEdit = (order) => {
    // Check if user can edit this order
    if (shouldSeeOnlyOwnOrders() && order.executive !== executiveName) {
      toast.error('You can only edit your own orders');
      return;
    }
    
    // Set editing order with formatted dates
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
    setShowModal(true); // Show edit modal
  };

  // Function to handle edit form field changes
  const handleEditChange = (e) => {
    const { name, value } = e.target; // Get field name and value
    setEditingOrder(prev => ({ ...prev, [name]: value })); // Update editing order
  };

  // Function to handle changes in order row fields
  const handleEditRowChange = (index, field, value) => {
    const updatedRows = [...editingOrder.rows]; // Create copy of rows
    updatedRows[index] = { ...updatedRows[index], [field]: value }; // Update specific row

    // Recalculate total if rate or quantity changes
    if (field === 'rate' || field === 'quantity') {
      const quantity = parseFloat(updatedRows[index].quantity) || 0;
      const rate = parseFloat(updatedRows[index].rate) || 0;
      updatedRows[index].total = (quantity * rate).toFixed(2); // Calculate total
    }

    // Recalculate discounted total if discount changes
    if (field === 'discount') {
      const discount = parseFloat(value) || 0;
      const total = parseFloat(editingOrder.total) || 0;
      setEditingOrder(prev => ({
        ...prev,
        discount,
        discountedTotal: (total - discount).toFixed(2) // Calculate discounted total
      }));
    }

    // Update editing order with new rows
    setEditingOrder(prev => ({ ...prev, rows: updatedRows }));
  };

  // Function to submit edited order
  const handleEditSubmit = async (e) => {
    e.preventDefault(); // Prevent form submission
    try {
      // Send PUT request to update order
      await axios.put(API_ENDPOINTS.UPDATE_ORDER(editingOrder._id), editingOrder);
      setShowModal(false); // Close modal
      
      // Refresh orders list
      const { role, name } = getUserInfo();
      fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
      
      toast.success('Order updated successfully!'); // Show success message
    } catch (err) {
      // Handle update error
      console.error('Update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update order');
    }
  };

  // Function to confirm delete order
  const confirmDelete = (orderId) => {
    // Find order to delete
    const orderToDeleteObj = orders.find(order => order._id === orderId);
    // Check if user can delete this order
    if (shouldSeeOnlyOwnOrders() && orderToDeleteObj && orderToDeleteObj.executive !== executiveName) {
      toast.error('You can only delete your own orders');
      return;
    }
    
    console.log('Confirming delete for order:', orderId);
    setOrderToDelete(orderId); // Set order to delete
    setShowDeleteModal(true); // Show delete confirmation modal
  };

  // Function to handle delete order
  const handleDelete = async () => {
    try {
      // Validate order to delete
      if (!orderToDelete) {
        toast.error('No order selected for deletion');
        return;
      }

      console.log('Attempting to delete order:', orderToDelete);

      // Send DELETE request
      const response = await axios.delete(API_ENDPOINTS.DELETE_ORDER(orderToDelete), {
        data: {
          deletedBy: userRole === 'Admin' ? 'Admin' : executiveName,
          reason: 'Deleted from view orders page'
        }
      });

      console.log('Delete successful:', response.data);

      // Close modal and reset state
      setShowDeleteModal(false);
      setOrderToDelete(null);

      // Refresh orders list
      const { role, name } = getUserInfo();
      fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);

      toast.success('Order moved to trash successfully!'); // Show success message
    } catch (err) {
      // Handle delete error
      console.error('Delete error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });

      // Determine error message
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

      toast.error(errorMessage); // Show error message
    }
  };

  // Function to prepare payment form
  const handleRecordPayment = async (order) => {
    // Check if user can record payment for this order
    if (shouldSeeOnlyOwnOrders() && order.executive !== executiveName) {
      toast.error('You can only record payments for your own orders');
      return;
    }
    
    try {
      setPaymentLoading(true); // Set loading state
      setCurrentOrder(order); // Set current order

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

      setPaymentHistory(payments); // Set payment history

      // Initialize payment form data
      setPaymentData({
        date: new Date().toISOString().split('T')[0],
        amount: order.balance > 0 ? order.balance.toString() : '',
        method: 'Cash',
        reference: '',
        note: ''
      });

      setShowPaymentsModal(true); // Show payments modal
    } catch (err) {
      // Handle payment loading error
      console.error('Error in handleRecordPayment:', err);
      toast.error('Failed to load payment details. Please try again.');
    } finally {
      setPaymentLoading(false); // Reset loading state
    }
  };

  // Function to handle viewing payments only
  const handleViewPayments = async (order) => {
    try {
      setPaymentLoading(true); // Set loading state
      setCurrentOrder(order); // Set current order

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

      setPaymentHistory(payments); // Set payment history

      // Set payment data to empty since we're just viewing
      setPaymentData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        method: 'Cash',
        reference: '',
        note: ''
      });

      setShowPaymentsModal(true); // Show payments modal
    } catch (err) {
      // Handle payment loading error
      console.error('Error in handleViewPayments:', err);
      toast.error('Failed to load payment details. Please try again.');
    } finally {
      setPaymentLoading(false); // Reset loading state
    }
  };

  // Print payment history
  const handlePrintPaymentHistory = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment History - ${currentOrder.orderNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .order-info { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
          .order-info h3 { margin-top: 0; }
          .payment-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .payment-table th, .payment-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .payment-table th { background-color: #f2f2f2; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #e8f5e8; }
          .no-print { display: none; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Payment History</h1>
          <h2>Order: ${currentOrder.orderNo}</h2>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="order-info">
          <h3>Order Summary</h3>
          <p><strong>Customer:</strong> ${currentOrder.contactPerson}</p>
          <p><strong>Business:</strong> ${currentOrder.business}</p>
          <p><strong>Location:</strong> ${currentOrder.location}</p>
          <p><strong>Total Amount:</strong> ₹${currentOrder.rows.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0).toFixed(2)}</p>
          <p><strong>Discount:</strong> ₹${parseFloat(currentOrder.discount || 0).toFixed(2)}</p>
          <p><strong>Final Amount:</strong> ₹${parseFloat(currentOrder.discountedTotal || 0).toFixed(2)}</p>
          <p><strong>Current Balance:</strong> ₹${parseFloat(currentOrder.balance || 0).toFixed(2)}</p>
        </div>
        
        <h3>Payment History</h3>
        <table class="payment-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount (₹)</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${paymentHistory.map((payment, ) => `
              <tr>
                <td>${formatDate(payment.date)}</td>
                <td>${parseFloat(payment.amount || 0).toLocaleString('en-IN')}</td>
                <td>${payment.method}</td>
                <td>${payment.reference || '-'}</td>
                <td>${payment.note || '-'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5"><strong>Total Paid: ₹${paymentHistory.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0).toLocaleString('en-IN')}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Function to submit payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault(); // Prevent form submission
    if (!currentOrder) {
      toast.error('No order selected for payment');
      return;
    }

    try {
      const paymentAmount = parseFloat(paymentData.amount); // Parse payment amount

      // Validate payment amount
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

      // Create payment payload
      const paymentPayload = {
        date: paymentData.date,
        amount: paymentAmount,
        method: paymentData.method,
        reference: paymentData.reference,
        note: paymentData.note
      };

      // Send payment record request
      await axios.post(
        API_ENDPOINTS.RECORD_PAYMENT(currentOrder._id),
        paymentPayload
      );

      toast.success('Payment recorded successfully!'); // Show success message
      
      // Refresh orders list
      const { role, name } = getUserInfo();
      fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
      
      setShowPaymentsModal(false); // Close modal
    } catch (err) {
      // Handle payment error
      console.error('Error recording payment:', err);
      toast.error(err.response?.data?.error || 'Failed to record payment');
    }
  };

  // Function to handle payment form changes
  const handlePaymentChange = (e) => {
    const { name, value } = e.target; // Get field name and value
    setPaymentData(prev => ({ ...prev, [name]: value })); // Update payment data
  };

  // Export orders to Excel
  const handleExportToExcel = () => {
    let ordersToExport = orders;
    // Filter to user's orders only if applicable
    if (shouldSeeOnlyOwnOrders()) {
      ordersToExport = orders.filter(order => order.executive === executiveName);
    }

    // Filter to selected year orders only
    const filteredOrders = ordersToExport.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate.getFullYear() === yearFilter;
    });

    // Flatten orders for Excel export
    const flattenedOrders = filteredOrders.flatMap(order =>
      order.rows.map(row => ({
        'S.No': filteredOrders.indexOf(order) + 1,
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

    // Create Excel workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(flattenedOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    // Generate filename based on user role
    let filename;
    if (shouldSeeOnlyOwnOrders()) {
      filename = `my_orders_${yearFilter}_${executiveName}_export.xlsx`;
    } else {
      filename = `orders_${yearFilter}_export.xlsx`;
    }
    
    // Download Excel file
    XLSX.writeFile(workbook, filename);
    toast.success(`Excel file "${filename}" downloaded successfully!`);
  };

  // Import orders from Excel
  const handleImportFromExcel = async (e) => {
    if (!canImportFromExcel()) {
      toast.error('You do not have permission to import orders');
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;

    // Show confirmation for executives
    if (shouldSeeOnlyOwnOrders()) {
      const confirmed = window.confirm(
        `You are about to import orders. These orders will be assigned to you (${executiveName}). Continue?`
      );
      if (!confirmed) {
        // Reset the file input
        e.target.value = '';
        return;
      }
    }

    // Create file reader
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map Excel data to order format
        const ordersToImport = jsonData.map(item => {
          const baseOrder = {
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
          };

          // For executives, override the executive field with their name
          if (shouldSeeOnlyOwnOrders()) {
            return {
              ...baseOrder,
              executive: executiveName, // Force executive name
              createdBy: executiveName  // Also set created by
            };
          }

          // For admins/service executives, use the executive from Excel or fallback
          return {
            ...baseOrder,
            executive: item['Executive'] || baseOrder.createdBy,
            createdBy: item['Created By'] || item['Executive'] || 'Admin'
          };
        });

        // Send import request
        await axios.post(API_ENDPOINTS.IMPORT_ORDERS, ordersToImport);
        
        // Refresh orders list
        const { role, name } = getUserInfo();
        fetchOrders(role, name, monthFilter, yearFilter, clientTypeFilter, appliedExecutiveFilters.executive, appliedExecutiveFilters.executiveName);
        
        toast.success(`Successfully imported ${ordersToImport.length} orders!`);
        
        // Reset the file input
        document.getElementById('importExcelInput').value = '';
      } catch (err) {
        // Handle import error
        console.error('Error importing orders:', err);
        toast.error('Failed to import orders. Please check the file format.');
        
        // Reset the file input on error too
        document.getElementById('importExcelInput').value = '';
      }
    };
    reader.readAsArrayBuffer(file); // Read file as array buffer
  };

  // Function to filter orders for search functionality
  const filterOrders = (order) => (row) => {
    // Create array of all searchable values
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

    // Check if any value contains search term
    return valuesToSearch.some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Loading state component
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
          <div className="spinner"></div> {/* Spinner element */}
        </div>
      </div>
    );
  }

  // Error state component
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
              // Retry fetching orders
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

  // Main component render
  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
      {/* Toast container for notifications */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }} />

      {/* User Role Info Banner */}
      <div style={{
        backgroundColor: appliedExecutiveFilters.executiveName ? '#fff3cd' : 
                        shouldSeeOnlyOwnOrders() ? '#e3f2fd' : '#f3e5f5',
        padding: '10px 15px',
        borderRadius: '6px',
        marginBottom: '20px',
        border: `2px solid ${
          appliedExecutiveFilters.executiveName ? '#ffc107' : 
          shouldSeeOnlyOwnOrders() ? '#2196f3' : '#9c27b0'
        }`,
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        {appliedExecutiveFilters.executiveName 
          ? `🔍 Viewing Orders for: ${appliedExecutiveFilters.executiveName}`
          : shouldSeeOnlyOwnOrders() 
            ? `👤 Viewing Your Orders Only - ${executiveName || 'User'} (${userRole || 'User'})`
            : `👑 Viewing All Orders - ${userRole || 'Admin'} Role`
        }
      </div>

      {/* Year Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px',
        backgroundColor: '#fff',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold', fontSize: '16px' }}>
          Select Year:
        </label>
        <select
          value={yearFilter}
          onChange={handleYearChange}
          style={{
            padding: '10px 15px',
            borderRadius: '6px',
            border: '2px solid #218c74',
            backgroundColor: 'white',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#218c74',
            minWidth: '120px'
          }}
        >
          <option value={2023}>2023</option>
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
          <option value={2027}>2027</option>
        </select>
        <div style={{
          marginLeft: '20px',
          padding: '10px 15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          fontWeight: 'bold',
          color: '#1976d2'
        }}>
          Currently Viewing: <span style={{ color: '#218c74' }}>{yearFilter}</span>
        </div>
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
          {/* Total Amount Card */}
          <div style={{
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(52, 152, 219, 0.3)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>Total Amount ({yearFilter})</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>₹{totalAmount}</div>
          </div>

          {/* Total Received Card */}
          <div style={{
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: '1px solid rgba(39, 174, 96, 0.3)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>Total Received ({yearFilter})</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>₹{totalReceived}</div>
          </div>

          {/* Total Balance Card */}
          <div style={{
            backgroundColor: totalBalance > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)',
            padding: '20px',
            borderRadius: '12px',
            minWidth: '220px',
            textAlign: 'center',
            border: `1px solid ${totalBalance > 0 ? 'rgba(231, 76, 60, 0.3)' : 'rgba(39, 174, 96, 0.3)'}`,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', color: '#333', fontWeight: 'bold' }}>Total Balance ({yearFilter})</div>
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

      {/* Month Navigation Controls */}
      {currentViewMonth && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #1976d2',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => navigateToMonth('prev')}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ← Prev
            </button>
            
            <select
              value={currentViewMonth}
              onChange={(e) => {
                const newMonth = parseInt(e.target.value);
                const params = new URLSearchParams();
                params.set('month', newMonth);
                params.set('year', currentViewYear);
                
                // Clear other filters
                params.delete('clientType');
                params.delete('executive');
                params.delete('executiveType');
                params.delete('executiveName');
                params.delete('week');
                params.delete('monthCount');
                params.delete('monthName');
                params.delete('weekCount');
                
                navigate(`/admin-dashboard/view-orders?${params.toString()}`);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #1976d2',
                backgroundColor: 'white',
                fontSize: '14px'
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(yearFilter, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => navigateToMonth('next')}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Next →
            </button>
          </div>
          
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h3 style={{ margin: 0, color: '#1976d2' }}>
              {new Date(yearFilter, currentViewMonth - 1).toLocaleString('default', { month: 'long' })} {currentViewYear}
            </h3>
            <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
              {groupedOrders[`${currentViewYear}-${currentViewMonth.toString().padStart(2, '0')}`]?.orders?.length || 0} orders
            </p>
          </div>
          
          <button
            onClick={clearAllFilters}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            View All Orders
          </button>
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
        {(monthFilter || clientTypeFilter || appliedExecutiveFilters.executiveName || searchTerm) && (
          <h3 style={{ margin: '0 0 10px 0' }}>Active Filters:</h3>
        )}

        {/* Month Filter Display */}
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
              <strong>Month:</strong> {new Date(yearFilter, monthFilter - 1).toLocaleString('default', { month: 'long' })}
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

        {/* Client Type Filter Display */}
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

        {/* Executive Filter Display */}
        {appliedExecutiveFilters.executiveName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fff3cd',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ffc107'
          }}>
            <span>
              <strong>
                {appliedExecutiveFilters.executiveType === 'executive' ? '🎯 Sales Executive' :
                  appliedExecutiveFilters.executiveType === 'service' ? '🔧 Service Executive' :
                    appliedExecutiveFilters.executiveType === 'account' ? '📊 Account Executive' : '👤 Executive'}:
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
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Search Term Filter Display */}
        {searchTerm && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <span>
              <strong>Search:</strong> "{searchTerm}"
            </span>
            <button
              onClick={clearSearchFilter}
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

        {/* Clear All Filters Button */}
        {(monthFilter || clientTypeFilter || appliedExecutiveFilters.executiveName || searchTerm) && (
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
          {/* Export to Excel Button - Show for Admin, Account, Service Executive AND regular Executives */}
          {canExportToExcel() && (
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
              Export to Excel ({yearFilter})
            </button>
          )}

          {/* Import from Excel Button - Show for Admin, Account, Service Executive AND regular Executives */}
          {canImportFromExcel() && (
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
            // Sort months in descending order (newest first)
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
                  {/* Total Amount Display */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Amount</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>₹{group.totals.amount.toLocaleString('en-IN')}</div>
                  </div>
                  
                  {/* Total Received Display */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Received</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#ffeb3b' }}>
                      ₹{group.totals.received.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Total Balance Display */}
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

                          {/* Business name - clickable only for Admin */}
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
        // No orders found message
        <div style={{
          textAlign: 'center',
          padding: '40px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ color: '#666' }}>No orders found for {yearFilter}</h3>
          <p style={{ color: '#999' }}>
            {appliedExecutiveFilters.executiveName && `for executive: ${appliedExecutiveFilters.executiveName}`}
            {appliedExecutiveFilters.executiveName && (monthFilter || clientTypeFilter) && ' and '}
            {monthFilter && `in ${new Date(yearFilter, monthFilter - 1).toLocaleString('default', { month: 'long' })}`}
            {clientTypeFilter && `with client type: ${clientTypeFilter}`}
            {searchTerm && `matching search: "${searchTerm}"`}
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

            {/* Order Summary Section */}
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

            {/* Payment Form */}
            {paymentData.amount && (
              <form onSubmit={handlePaymentSubmit}>
                {/* Pending Amount Display */}
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

                {/* Amount to Pay Input */}
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

                {/* Payment Date Input */}
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

                {/* Payment Method Select */}
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

                {/* UPI ID Selection (shown only when UPI method is selected) */}
                {paymentData.method === 'UPI' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>UPI ID *</label>
                    <select
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
                    >
                      <option value="">Select UPI ID</option>
                      <option value="9985330008@Chary">9985330008@Chary</option>
                      <option value="9985330004@Swathi">9985330004@Swathi</option>
                      <option value="9553146376@Laxmipathi">9553146376@Laxmipathi</option>
                      <option value="other">Other UPI</option>
                    </select>
                    {paymentData.reference === 'other' && (
                      <input
                        type="text"
                        placeholder="Enter UPI ID"
                        onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          marginTop: '5px'
                        }}
                        required
                      />
                    )}
                  </div>
                )}

                {/* Cheque Number Input (shown only when Cheque method is selected) */}
                {paymentData.method === 'Cheque' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Cheque Number *</label>
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

                {/* Transaction ID Input (shown only when Bank Transfer method is selected) */}
                {paymentData.method === 'Bank Transfer' && (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Transaction ID *</label>
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

                {/* Payment Notes Textarea */}
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

                {/* Form Action Buttons */}
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

            {/* View Only Mode Actions */}
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
                <button
                  type="button"
                  onClick={handlePrintPaymentHistory}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Print Payment History
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

            {/* Order Details Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              {/* Business Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Business</label>
                <input
                  name="business"
                  value={editingOrder.business}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Contact Person Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Person</label>
                <input
                  name="contactPerson"
                  value={editingOrder.contactPerson}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Location Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Location</label>
                <input
                  name="location"
                  value={editingOrder.location}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Sale Closed By Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Sale Closed By</label>
                <input
                  name="saleClosedBy"
                  value={editingOrder.saleClosedBy}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Contact Code Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Contact Code</label>
                <input
                  name="contactCode"
                  value={editingOrder.contactCode}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Phone Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Phone</label>
                <input
                  name="phone"
                  value={editingOrder.phone}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Order No Input */}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Order No</label>
                <input
                  name="orderNo"
                  value={editingOrder.orderNo}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Order Date Input */}
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

              {/* Client Type Select */}
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

              {/* Created By Display (Read-only) */}
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

              {/* Discount Input */}
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

              {/* Final Amount Display (Read-only) */}
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

              {/* Advance Input */}
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

              {/* Balance Input */}
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

              {/* Advance Date Input */}
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

              {/* Payment Date Input */}
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

              {/* Payment Method Select */}
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

              {/* Cheque Number Input */}
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
                {/* Description Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                  <input
                    value={row.description}
                    onChange={(e) => handleEditRowChange(index, 'description', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Requirement Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Requirement</label>
                  <input
                    value={row.requirement}
                    onChange={(e) => handleEditRowChange(index, 'requirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Custom Requirement Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Custom Requirement</label>
                  <input
                    value={row.customRequirement}
                    onChange={(e) => handleEditRowChange(index, 'customRequirement', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Quantity Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Quantity</label>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => handleEditRowChange(index, 'quantity', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Rate Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Rate</label>
                  <input
                    type="number"
                    value={row.rate}
                    onChange={(e) => handleEditRowChange(index, 'rate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Delivery Date Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Delivery Date</label>
                  <input
                    type="date"
                    value={row.deliveryDate}
                    onChange={(e) => handleEditRowChange(index, 'deliveryDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Start Date Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Start Date</label>
                  <input
                    type="date"
                    value={row.startDate}
                    onChange={(e) => handleEditRowChange(index, 'startDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* End Date Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>End Date</label>
                  <input
                    type="date"
                    value={row.endDate}
                    onChange={(e) => handleEditRowChange(index, 'endDate', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Service Assigned To Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Service Assigned To</label>
                  <input
                    value={row.assignedExecutive}
                    onChange={(e) => handleEditRowChange(index, 'assignedExecutive', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    placeholder="Enter service executive name"
                  />
                </div>

                {/* Status Select */}
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

                {/* Remark Input */}
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Remark</label>
                  <input
                    value={row.remark}
                    onChange={(e) => handleEditRowChange(index, 'remark', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Is Completed Checkbox */}
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

            {/* Form Action Buttons */}
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

// Export the component as default
export default ViewOrders;