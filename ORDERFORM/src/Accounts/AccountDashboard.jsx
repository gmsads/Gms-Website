import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, PolarArea } from 'react-chartjs-2';
import axios from 'axios';
import AutoLogout from '../mainpage/AutoLogout';
import OrderForm from '../Executive/OrderForm';
import DigitalMarketingOrderForm from '../Executive/Digitalform';

// Register Chart.js components to make them available
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale
);

function AccountDashboard({ loggedInUser }) {
  // State for sidebar open/close - default open on large screens
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  
  // State to track which sidebar item is hovered
  const [hoveredItem, setHoveredItem] = useState('');
  
  // Get current location for routing
  const location = useLocation();
  
  // State for chart data from API
  const [chartData, setChartData] = useState(null);
  
  // Loading state for API calls
  const [loading, setLoading] = useState(true);
  
  // State for selected year filter
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Navigation function
  const navigate = useNavigate();
  
  // State for today's orders count
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  
  // State for pending payments count
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  
  // State to control notification popup visibility
  const [showNotification, setShowNotification] = useState(false);
  
  // State for notification data
  const [notificationData, setNotificationData] = useState({
    todayCount: 0,
    pendingCount: 0
  });

  // States for order form functionality
  const [orderNumber, setOrderNumber] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedFormType, setSelectedFormType] = useState("order");

  // Amount formatting helper function
  const formatAmount = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    
    if (numAmount >= 10000000) {
      // Crores
      return (numAmount / 10000000).toFixed(1) + 'Cr';
    } else if (numAmount >= 100000) {
      // Lakhs
      return (numAmount / 100000).toFixed(1) + 'L';
    } else if (numAmount >= 1000) {
      // Thousands
      return (numAmount / 1000).toFixed(1) + 'K';
    } else {
      // Less than 1000
      return numAmount.toString();
    }
  };

  // Format amount with full display
  const formatAmountFull = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return '₹' + numAmount.toLocaleString('en-IN');
  };

  // Effect to handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effect to fetch chart data when year changes
  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      try {
        console.log(`Fetching data for year: ${year}`);
        const res = await axios.get(`/api/dashboard/chart-data?year=${year}&_=${Date.now()}`);
        console.log('Data received:', res.data);
        
        // Validate and set chart data with proper structure
        const validatedData = {
          totalOrdersByMonth: safeArray(res.data.totalOrdersByMonth),
          pendingPayments: safeArray(res.data.pendingPayments).slice(0, 2),
          pendingServices: safeArray(res.data.pendingServices).slice(0, 2),
          clientTypes: safeObject(res.data.clientTypes)
        };
        
        setChartData(validatedData);
        
        // Also fetch today and pending counts with year filter
        fetchTodayAndPendingCounts();
      } catch (err) {
        console.error('API Error:', err.response?.data || err.message);
        // Set default empty data structure on error
        setChartData({
          totalOrdersByMonth: Array(12).fill(0),
          pendingPayments: [0, 0],
          pendingServices: [0, 0],
          clientTypes: { 
            Retail: { count: 0, amount: 0 },
            Renewal: { count: 0, amount: 0 },
            Agent: { count: 0, amount: 0 },
            'Renewal-Agent': { count: 0, amount: 0 }
          }
        });
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Function to fetch today's orders and pending payments counts
  const fetchTodayAndPendingCounts = async () => {
    try {
      // Fetch all orders from API
      const ordersRes = await axios.get('/api/orders');
      let orders = ordersRes.data;

      // Filter orders by selected year
      orders = orders.filter(order => {
        if (!order.orderDate) return true;
        const orderYear = new Date(order.orderDate).getFullYear();
        return orderYear === year;
      });

      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];

      // Count orders with delivery date today AND balance > 0
      const todayOrders = orders.filter(order => {
        if (!order.rows || !order.rows.length) return false;
        if (order.balance <= 0) return false; // Only orders with pending payments
        
        // Check if any row has delivery date today
        return order.rows.some(row => {
          if (!row.deliveryDate) return false;
          const deliveryDate = new Date(row.deliveryDate);
          const deliveryDateString = deliveryDate.toISOString().split('T')[0];
          return deliveryDateString === todayString;
        });
      });

      // Count orders with pending payments (balance > 0) EXCEPT today's deliveries
      const pendingPayments = orders.filter(order => {
        if (order.balance <= 0) return false;
        
        if (!order.rows || !order.rows.length) return true;
        
        // Check if any row has delivery date today
        const hasTodayDelivery = order.rows.some(row => {
          if (!row.deliveryDate) return false;
          const deliveryDate = new Date(row.deliveryDate);
          const deliveryDateString = deliveryDate.toISOString().split('T')[0];
          return deliveryDateString === todayString;
        });
        
        return !hasTodayDelivery; // Exclude today's deliveries
      });

      // Update state with counts
      setTodayOrdersCount(todayOrders.length);
      setPendingPaymentsCount(pendingPayments.length);

      // Set notification data and show notification if there are pending payments
      if (todayOrders.length > 0 || pendingPayments.length > 0) {
        setNotificationData({
          todayCount: todayOrders.length,
          pendingCount: pendingPayments.length
        });
        setShowNotification(true);
      }
    } catch (err) {
      console.error('Error fetching today and pending counts:', err);
    }
  };

  // Auto-hide notification after 10 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Helper function to safely handle arrays - prevents [object Object] errors
  const safeArray = (arr) => {
    if (!arr || !Array.isArray(arr)) return Array(12).fill(0); // Return array of 12 zeros for monthly data
    return arr.map(item => typeof item === 'number' ? item : 0);
  };

  // Helper function to safely handle objects - prevents [object Object] errors
  const safeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return { 
        Retail: { count: 0, amount: 0 },
        Renewal: { count: 0, amount: 0 },
        Agent: { count: 0, amount: 0 },
        'Renewal-Agent': { count: 0, amount: 0 }
      };
    }
    
    // If clientTypes is already in the new format, return it
    if (obj.Retail && typeof obj.Retail === 'object') {
      return obj;
    }
    
    // If clientTypes is in the old format (just numbers), convert to new format
    return {
      Retail: { count: obj.Retail || 0, amount: 0 },
      Renewal: { count: obj.Renewal || 0, amount: 0 },
      Agent: { count: obj.Agent || 0, amount: 0 },
      'Renewal-Agent': { count: obj['Renewal-Agent'] || 0, amount: 0 }
    };
  };

  // Phone number validation and search function
  const handleSearch = async () => {
    // Validate phone number length
    if (orderNumber.length !== 10) {
      setSearchError("Please enter exactly 10 digits");
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      if (selectedFormType === "order") {
        // Search for existing order by phone
        const response = await axios.get(`/api/by-phone?phone=${orderNumber}`);

        if (response.data) {
          setShowOrderForm(true);

          if (response.data.order) {
            setExistingOrderData(response.data.order);
          } else {
            setExistingOrderData(null);
          }
        }
      } else {
        // For digital marketing form, just show the form
        setShowOrderForm(true);
        setExistingOrderData(null);
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status === 404 &&
        selectedFormType === "order"
      ) {
        // Order not found - create new one
        setShowOrderForm(true);
        setExistingOrderData(null);
      } else {
        console.error("Search failed:", error);
        setSearchError(
          error.response?.data?.message || "Failed to search. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle sidebar open/close
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Close sidebar when clicking on a link on mobile
  const handleSidebarClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Check if we're on the main dashboard route
  const showDashboardCards = location.pathname === '/account-dashboard';

  // Month labels for charts
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Process chart data with safe functions to prevent errors
  const totalOrdersSum = safeArray(chartData?.totalOrdersByMonth).reduce((a, b) => a + b, 0);
  const pendingPayments = safeArray(chartData?.pendingPayments).slice(0, 2); // Ensure only 2 values
  const pendingServices = safeArray(chartData?.pendingServices).slice(0, 2); // Ensure only 2 values
  const clientTypes = safeObject(chartData?.clientTypes);

  // Generate years for dropdown (2000-3000)
  const years = [];
  for (let y = 2000; y <= 3000; y++) {
    years.push(y);
  }

  // Handle chart click navigation
  const handleChartClick = (chartType) => {
    if (chartType === 'pending-payment') {
      navigate('pending-payment');
    } else if (chartType === 'pending-service') {
      navigate('pending-service');
    }
  };

  // Handle today's delivery card click
  const handleTodayCardClick = () => {
    navigate('pending-payment', { 
      state: { 
        filterType: 'today-delivery',
        year: year
      } 
    });
  };

  // Handle pending payments card click
  const handlePendingPaymentsCardClick = () => {
    navigate('pending-payment', { 
      state: { 
        filterType: 'exclude-today',
        year: year
      } 
    });
  };

  // Close notification popup
  const handleCloseNotification = () => {
    setShowNotification(false);
  };

  // View all payments navigation
  const handleViewAllPayments = () => {
    setShowNotification(false);
    navigate('pending-payment', { state: { year: year } });
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  // Check if we're on the create-order route
  const isCreateOrderRoute = location.pathname === '/account-dashboard/create-order';

  // CSS Styles object
  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      position: 'relative',
    },
    sidebar: {
      width: sidebarOpen ? '250px' : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'hidden',
      transition: 'width 0.3s',
      paddingTop: '60px',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
      height: '100vh',
    },
    content: {
      marginLeft: sidebarOpen ? '250px' : '0',
      marginTop: '60px',
      padding: '20px',
      transition: 'margin-left 0.3s',
      width: '100%',
      minHeight: 'calc(100vh - 60px)',
      backgroundColor: '#f4f4f4',
      boxSizing: 'border-box',
      overflowY: 'auto',
      height: 'calc(100vh - 60px)',
      position: 'relative',
    },
    sidebarItem: {
      padding: '15px 25px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      display: 'block',
      transition: 'background 0.3s',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    hoverEffect: {
      backgroundColor: '#002244',
    },
    activeSidebarItem: {
      backgroundColor: '#001933',
    },
    navbar: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#003366',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      zIndex: 20,
      boxSizing: 'border-box',
      height: '60px',
    },
    burger: {
      fontSize: '24px',
      marginRight: '20px',
      cursor: 'pointer',
      display: window.innerWidth <= 768 ? 'block' : 'none',
    },
    brand: {
      fontSize: 'clamp(16px, 4vw, 22px)',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '60%',
    },
    dashboardCards: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginTop: '20px',
      width: '100%',
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#003366',
      padding: '20px',
      minHeight: '350px',
      width: '100%',
      boxSizing: 'border-box',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    },
    cardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
    },
    number: {
      fontSize: '40px',
      color: '#002244',
      marginTop: '10px',
    },
    pieChart: {
      width: '100%',
      height: '180px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    yearSelectorWrapper: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginBottom: '15px',
      gap: '10px',
      flexWrap: 'wrap',
    },
    yearSelectorLabel: {
      fontWeight: 'bold',
      color: '#003366',
      fontSize: '16px',
    },
    yearSelector: {
      padding: '5px',
      fontSize: '14px',
      width: '80px',
    },
    chartContainer: {
      width: '100%',
      height: '220px',
      position: 'relative',
    },
    clickableSection: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: '40px',
      left: 0,
      cursor: 'pointer',
    },
    todayCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'white',
      padding: '20px',
      minHeight: '150px',
      width: '100%',
      boxSizing: 'border-box',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    },
    pendingCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      color: 'white',
      padding: '20px',
      minHeight: '150px',
      width: '100%',
      boxSizing: 'border-box',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: 'linear-gradient(135deg, #c23616 0%, #e84118 100%)',
    },
    smallNumber: {
      fontSize: '32px',
      color: 'white',
      marginTop: '10px',
      fontWeight: 'bold',
    },
    quickStatsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
      width: '100%',
    },
    // Phone search container styles
    phoneSearchContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      width: '100%',
    },
    phoneSearchBox: {
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '500px',
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: '20px',
      textAlign: 'left',
    },
    formTypeSelector: {
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      marginBottom: '20px',
      flexWrap: 'wrap',
    },
    errorMessage: {
      color: 'red',
      marginBottom: '15px',
      fontSize: '14px',
    },
    searchButton: {
      padding: '12px 30px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: 'bold',
      width: '100%',
    },
    searchButtonDisabled: {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
    },
    // Notification Popup Styles
    notificationOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    notificationPopup: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '25px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      textAlign: 'center',
      position: 'relative',
    },
    notificationTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '20px',
      borderBottom: '2px solid #3498db',
      paddingBottom: '10px',
    },
    notificationItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #ecf0f1',
    },
    notificationLabel: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      textAlign: 'left',
    },
    notificationCount: {
      fontSize: '18px',
      fontWeight: 'bold',
      padding: '4px 12px',
      borderRadius: '20px',
      minWidth: '50px',
    },
    todayNotificationCount: {
      backgroundColor: '#ff6b6b',
      color: 'white',
    },
    pendingNotificationCount: {
      backgroundColor: '#c23616',
      color: 'white',
    },
    notificationButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '10px',
      marginTop: '20px',
    },
    closeButton: {
      padding: '10px 20px',
      backgroundColor: '#7f8c8d',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      flex: 1,
    },
    viewAllButton: {
      padding: '10px 20px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      flex: 1,
    },
    closeIcon: {
      position: 'absolute',
      top: '15px',
      right: '15px',
      background: 'none',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#7f8c8d',
      fontWeight: 'bold',
    }
  };

  // Function to style sidebar links with active and hover states
  const linkStyle = (name) => ({ isActive }) => ({
    ...styles.sidebarItem,
    ...(isActive ? styles.activeSidebarItem : {}),
    ...(hoveredItem === name ? styles.hoverEffect : {}),
  });

  return (
    <div>
      {/* Auto logout component for session management */}
      <AutoLogout />
      
      {/* Navbar */}
      <div style={styles.navbar}>
        {/* Hamburger menu for mobile */}
        <span style={styles.burger} onClick={toggleSidebar}>
          &#9776;
        </span>
        {/* Dashboard title */}
        <span style={styles.brand}>ACCOUNTS DASHBOARD</span>
        {/* User avatar */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              color: '#003366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              userSelect: 'none',
            }}
          >
            {(loggedInUser || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Notification Popup */}
      {showNotification && (
        <div style={styles.notificationOverlay}>
          <div style={styles.notificationPopup}>
            <button 
              style={styles.closeIcon}
              onClick={handleCloseNotification}
            >
              ×
            </button>
            <h3 style={styles.notificationTitle}>Payment Reminders</h3>
            
            <div style={styles.notificationItem}>
              <span style={styles.notificationLabel}>Collect Payment (Today's Delivery):</span>
              <span style={{
                ...styles.notificationCount,
                ...styles.todayNotificationCount
              }}>
                {notificationData.todayCount}
              </span>
            </div>
            
            <div style={styles.notificationItem}>
              <span style={styles.notificationLabel}>Payment Collection Pending:</span>
              <span style={{
                ...styles.notificationCount,
                ...styles.pendingNotificationCount
              }}>
                {notificationData.pendingCount}
              </span>
            </div>

            <div style={styles.notificationButtons}>
              <button 
                style={styles.closeButton}
                onClick={handleCloseNotification}
              >
                Close
              </button>
              <button 
                style={styles.viewAllButton}
                onClick={handleViewAllPayments}
              >
                View All Payments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main container with sidebar and content */}
      <div style={styles.container}>
        {/* Sidebar Navigation */}
        <div style={styles.sidebar}>
          {/* Dashboard link */}
          <NavLink
            to="/account-dashboard"
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Dashboard
          </NavLink>
          
          {/* Create Order link */}
          <NavLink
            to="create-order"
            style={linkStyle('create-orders')}
            onMouseEnter={() => setHoveredItem('create-order')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={() => {
              handleSidebarClick();
              // Reset order form state when navigating to create-order
              setShowOrderForm(false);
              setOrderNumber("");
              setSearchError("");
            }}
          >
            Create Order ➕
          </NavLink>
          
          {/* View Orders link */}
          <NavLink
            to="view-orders"
            style={linkStyle('view-orders')}
            onMouseEnter={() => setHoveredItem('view-orders')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            View All Orders
          </NavLink>
          
          {/* Create Daily Report link */}
          <NavLink
            to="daily-record"
            style={linkStyle('daily-record')}
            onMouseEnter={() => setHoveredItem('daily-record')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Create Daily Report ➕
          </NavLink>
          
          {/* View Daily Report link */}
          <NavLink
            to="daily-report" 
            style={linkStyle('daily-report')}
            onMouseEnter={() => setHoveredItem('daily-report')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            View Daily Report 
          </NavLink>
          
          {/* Create Expense link */}
          <NavLink
            to="expenses"
            style={linkStyle('expenses')}
            onMouseEnter={() => setHoveredItem('expenses')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Create Expense
          </NavLink>
             <NavLink
            to="vendors"
            style={linkStyle('vendors')}
            onMouseEnter={() => setHoveredItem('vendors')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
           Vendors
          </NavLink>
          {/* View Expenses link */}
          <NavLink
            to="view-expenses"
            style={linkStyle('view-expenses')}
            onMouseEnter={() => setHoveredItem('view-expenses')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            View Expense
          </NavLink>
          
          {/* Office Inventory link */}
          <NavLink
            to="inventory"
            style={linkStyle('inventory')}
            onMouseEnter={() => setHoveredItem('inventory')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={() => {
              handleSidebarClick();
              // Reset order form state when navigating to create-order
              setShowOrderForm(false);
              setOrderNumber("");
              setSearchError("");
            }}
          >
            Office Inventory
          </NavLink>
          
          {/* Create Report link */}
          <NavLink
            to="hour"
            style={linkStyle('hour')}
            onMouseEnter={() => setHoveredItem('hour')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Create Report
          </NavLink>
          
          {/* View Report link */}
          <NavLink
            to="hour-reeport"
            style={linkStyle('hour-reeport')}
            onMouseEnter={() => setHoveredItem('hour-reeport')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            View Report
          </NavLink>
          
          {/* Assign Service link */}
          <NavLink
            to="assign-service"
            style={linkStyle('assign-service')}
            onMouseEnter={() => setHoveredItem('assign-service')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Assign Service
          </NavLink>
          
          {/* Pending Payment link */}
          <NavLink
            to="pending-payment"
            style={linkStyle('pending-payment')}
            onMouseEnter={() => setHoveredItem('pending-payment')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Pending Payment
          </NavLink>
          
          {/* Pending Service link */}
          <NavLink
            to="pending-service"
            style={linkStyle('pending-service')}
            onMouseEnter={() => setHoveredItem('pending-service')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Pending Service
          </NavLink>
          
          {/* Target link */}
          <NavLink
            to="activity"
            style={linkStyle('activity')}
            onMouseEnter={() => setHoveredItem('activity')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Target
          </NavLink>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#ff4d4d',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginTop:'260px',
              marginLeft:'10px'
            }}
          >
            Logout
          </button>
        </div>

        {/* Main Content Area */}
        <div style={styles.content}>
          {/* Show phone validation OR order form when on create-order route */}
          {isCreateOrderRoute ? (
            <>
              {!showOrderForm ? (
                <div style={styles.phoneSearchContainer}>
                  <div style={styles.phoneSearchBox}>
                    <h3>Enter Phone Number:</h3>
                    <div style={styles.formGroup}>
                      <input
                        type="text"
                        value={orderNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Only allow numbers and limit to 10 digits
                          if (/^\d*$/.test(val) && val.length <= 10) {
                            setOrderNumber(val);
                            if (searchError) setSearchError("");
                          }
                        }}
                        placeholder="10 digit phone number"
                        maxLength={10}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '16px',
                          border: '1px solid #ddd',
                          borderRadius: '5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Form type selector */}
                    <div style={styles.formTypeSelector}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="formType"
                          value="order"
                          checked={selectedFormType === "order"}
                          onChange={() => setSelectedFormType("order")}
                        />
                        Order Form
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input
                          type="radio"
                          name="formType"
                          value="Digitalform"
                          checked={selectedFormType === "Digitalform"}
                          onChange={() => setSelectedFormType("Digitalform")}
                        />
                        Digital Marketing Form
                      </label>
                    </div>

                    {/* Error message display */}
                    {searchError && (
                      <div style={styles.errorMessage}>{searchError}</div>
                    )}
                    
                    {/* Search button */}
                    <button
                      onClick={handleSearch}
                      disabled={isLoading || orderNumber.length !== 10}
                      style={{
                        ...styles.searchButton,
                        ...(isLoading || orderNumber.length !== 10 ? styles.searchButtonDisabled : {})
                      }}
                    >
                      {isLoading
                        ? "Searching..."
                        : selectedFormType === "order"
                        ? "Search Orders"
                        : "Create Digital Order"}
                    </button>
                  </div>
                </div>
              ) : (
                selectedFormType === "order" ? (
                  // Render OrderForm component
                  <OrderForm
                    orderNumber={orderNumber}
                    existingData={existingOrderData}
                    onBack={() => {
                      setShowOrderForm(false);
                      setOrderNumber("");
                      setExistingOrderData(null);
                    }}
                    onSuccess={() => {
                      setShowOrderForm(false);
                      setOrderNumber("");
                      setExistingOrderData(null);
                    }}
                  />
                ) : (
                  // Render Digital Marketing Form
                  <div>
                    <button
                      onClick={() => setShowOrderForm(false)}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        marginBottom: "20px",
                      }}
                    >
                      Back
                    </button>
                    <DigitalMarketingOrderForm />
                  </div>
                )
              )}
            </>
          ) : (
            <>
              {/* Show Outlet for other routes */}
              <Outlet />

              {/* Show dashboard cards only on the main dashboard route */}
              {showDashboardCards && (
                <>
                  {/* Year Selector */}
                  <div style={styles.yearSelectorWrapper}>
                    <label htmlFor="year-select" style={styles.yearSelectorLabel}>
                      Select Year:
                    </label>
                    <select
                      id="year-select"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      style={styles.yearSelector}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Stats Cards - Today and Pending Payments */}
                  <div style={styles.quickStatsContainer}>
                    {/* Today Card */}
                    <div 
                      style={styles.todayCard}
                      onClick={handleTodayCardClick}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                      }}
                    >
                      <div>Collect Payment</div>
                      <div style={styles.smallNumber}>{todayOrdersCount}</div>
                      <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                        Today Delivery Pending Payment
                      </div>
                      <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>
                        Year: {year}
                      </div>
                    </div>

                    {/* Pending Payments Card */}
                    <div 
                      style={styles.pendingCard}
                      onClick={handlePendingPaymentsCardClick}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                      }}
                    >
                      <div>Payment Collection Pending</div>
                      <div style={styles.smallNumber}>{pendingPaymentsCount}</div>
                      <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.9 }}>
                        All Other Pending Payments
                      </div>
                      <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>
                        Year: {year}
                      </div>
                    </div>
                  </div>

                  {/* Loading state */}
                  {loading ? (
                    <div>Loading dashboard data...</div>
                  ) : !chartData ? (
                    <div>Error loading dashboard data.</div>
                  ) : (
                    <div style={styles.dashboardCards}>
                      {/* Total Orders Bar Chart */}
                      <div style={{ ...styles.card, position: 'relative' }}>
                        <div>Total Orders (Monthly)</div>
                        <div style={styles.chartContainer}>
                          <Bar
                            data={{
                              labels: monthLabels,
                              datasets: [
                                {
                                  label: 'Total Orders',
                                  data: safeArray(chartData.totalOrdersByMonth),
                                  backgroundColor: '#36A2EB',
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: false } },
                            }}
                          />
                        </div>
                        <div style={styles.number}>{totalOrdersSum}</div>
                      </div>

                      {/* Pending Payment Doughnut Chart */}
                      <div style={styles.card}>
                        <div>Pending Payment</div>
                        <div style={styles.pieChart}>
                          <Doughnut
                            data={{
                              labels: ['Paid', 'Pending'],
                              datasets: [
                                {
                                  data: pendingPayments.length === 2 ? pendingPayments : [0, 0],
                                  backgroundColor: ['green', 'red'],
                                },
                              ],
                            }}
                            options={{
                              onClick: (e, elements) => {
                                if (elements.length > 0 && elements[0].index === 1) {
                                  handleChartClick('pending-payment');
                                }
                              },
                            }}
                          />
                          {/* Clickable overlay for pending section */}
                          <div
                            style={{
                              ...styles.clickableSection,
                              pointerEvents: (pendingPayments[1] || 0) > 0 ? 'auto' : 'none'
                            }}
                            onClick={() => (pendingPayments[1] || 0) > 0 && handleChartClick('pending-payment')}
                          />
                        </div>
                        <div style={styles.number}>{pendingPayments[1] || 0}</div>
                      </div>

                      {/* Pending Service Doughnut Chart */}
                      <div style={styles.card}>
                        <div>Pending Service</div>
                        <div style={styles.pieChart}>
                          <Doughnut
                            data={{
                              labels: ['Completed', 'Pending'],
                              datasets: [
                                {
                                  data: pendingServices.length === 2 ? pendingServices : [0, 0],
                                  backgroundColor: ['green', 'red'],
                                },
                              ],
                            }}
                            options={{
                              onClick: (e, elements) => {
                                if (elements.length > 0 && elements[0].index === 1) {
                                  handleChartClick('pending-service');
                                }
                              },
                            }}
                          />
                          {/* Clickable overlay for pending section */}
                          <div
                            style={{
                              ...styles.clickableSection,
                              pointerEvents: (pendingServices[1] || 0) > 0 ? 'auto' : 'none'
                            }}
                            onClick={() => (pendingServices[1] || 0) > 0 && handleChartClick('pending-service')}
                          />
                        </div>
                        <div style={styles.number}>{pendingServices[1] || 0}</div>
                      </div>

                      {/* Client Types Doughnut Chart - FIXED VERSION */}
                      <div style={styles.card}>
                        <div>Client Types</div>
                        <div style={styles.pieChart}>
                          <Doughnut
                            data={{
                              labels: ['Retail', 'Renewal', 'Agent', 'Renewal-Agent'],
                              datasets: [{
                                data: [
                                  // Handle both formats: {count, amount} objects or direct numbers
                                  clientTypes.Retail?.count !== undefined ? clientTypes.Retail.count : (clientTypes.Retail || 0),
                                  clientTypes.Renewal?.count !== undefined ? clientTypes.Renewal.count : (clientTypes.Renewal || 0),
                                  clientTypes.Agent?.count !== undefined ? clientTypes.Agent.count : (clientTypes.Agent || 0),
                                  clientTypes['Renewal-Agent']?.count !== undefined ? clientTypes['Renewal-Agent'].count : (clientTypes['Renewal-Agent'] || 0),
                                ],
                                backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#9966FF'],
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { 
                                legend: { position: 'right' },
                                tooltip: {
                                  callbacks: {
                                    label: function (context) {
                                      const clientType = context.label;
                                      const count = context.raw;
                                      
                                      // Handle both formats for amount display
                                      let amount = 0;
                                      if (clientTypes[clientType]?.amount !== undefined) {
                                        amount = clientTypes[clientType].amount;
                                      } else if (clientTypes[clientType]?.count !== undefined) {
                                        amount = clientTypes[clientType].amount || 0;
                                      }
                                      
                                      const formattedAmount = formatAmount(amount);
                                      const fullAmount = formatAmountFull(amount);
                                      return [
                                        `Orders: ${count}`,
                                        `Revenue: ₹${formattedAmount}`,
                                        `Amount: ${fullAmount}`
                                      ];
                                    }
                                  }
                                }
                              },
                            }}
                          />
                        </div>
                        <div style={styles.number}>
                          {(
                            // Handle both formats for total count calculation
                            (clientTypes.Retail?.count !== undefined ? clientTypes.Retail.count : (clientTypes.Retail || 0)) +
                            (clientTypes.Renewal?.count !== undefined ? clientTypes.Renewal.count : (clientTypes.Renewal || 0)) +
                            (clientTypes.Agent?.count !== undefined ? clientTypes.Agent.count : (clientTypes.Agent || 0)) +
                            (clientTypes['Renewal-Agent']?.count !== undefined ? clientTypes['Renewal-Agent'].count : (clientTypes['Renewal-Agent'] || 0))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountDashboard;