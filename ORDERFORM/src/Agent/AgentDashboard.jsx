/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AutoLogout from "../mainpage/AutoLogout";
import OrderForm from "../Executive/OrderForm";
import ViewOrders from "../Admin/ViewOrders";
import Quotation from "../Admin/Quotation";
import Prospective from "../Executive/Prospective";
import ViewProspective from "../Admin/Viewprospective";
import PriceList from "../Service/Pricelist";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Import the logo
import GMSLogo from '../assets/GMS_LOGO_.png';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement,
  Filler
);

function AgentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const [user, setUser] = useState(null);
  const [, setOrders] = useState([]);
  const [, setLoading] = useState(true);
  
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Dashboard statistics - Real data from backend
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalPaid: 0,
    totalOrders: 0,
    pendingPayments: 0,
    pendingPaymentAmount: 0,
    prospects: 0,
    completedOrders: 0,
    monthlyOrders: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  });
  
  // Phone validation states
  const [orderNumber, setOrderNumber] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Generate month options
  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    yearOptions.push(i);
  }

  // Handle filter changes
  useEffect(() => {
    if (user?.name) {
      fetchDashboardStats();
      fetchRecentOrders();
    }
  }, [selectedMonth, selectedYear, user]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      if (!mobile) {
        setMobileMenuOpen(false);
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const handleLogoClick = () => {
    navigate('/agent-dashboard');
    if (isMobile && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Add global styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-tap-highlight-color: transparent;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      .status-badge.completed {
        background-color: #d4edda;
        color: #155724;
      }
      .status-badge.pending {
        background-color: #fff3cd;
        color: #856404;
      }
      .status-badge.in-progress {
        background-color: #cce5ff;
        color: #004085;
      }
      .status-badge.cancelled {
        background-color: #f8d7da;
        color: #721c24;
      }
      .status-badge.service {
        background-color: #d1ecf1;
        color: #0c5460;
      }
      
      @media (max-width: 768px) {
        .status-badge {
          font-size: 10px;
          padding: 3px 8px;
        }
        
        ::-webkit-scrollbar {
          width: 3px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #003366;
          border-radius: 3px;
        }
      }
      
      @media (max-width: 480px) {
        .chart-container canvas {
          max-height: 250px !important;
        }
      }
      
      .sidebar-slide {
        animation: slideIn 0.3s ease-out;
      }
      
      .overlay-fade {
        animation: fadeIn 0.3s ease-out;
      }
      
      button, .clickable {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      button:active {
        transform: scale(0.98);
      }
      
      input:focus {
        outline: none;
        border-color: #003366 !important;
        box-shadow: 0 0 0 2px rgba(0, 51, 102, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      backgroundColor: '#f5f7fa',
    },
    navbar: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      height: isMobile ? '56px' : '60px',
      backgroundColor: '#003366',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 12px' : '0 20px',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      boxSizing: 'border-box',
    },
    navLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '10px' : '15px',
      minWidth: isMobile ? 'auto' : '200px',
    },
    logoIcon: {
      width: isMobile ? '32px' : '75px',
      height: isMobile ? '32px' : '75px',
      cursor: 'pointer',
      objectFit: 'contain',
      borderRadius: isMobile ? '6px' : '14px',
    },
    menuButton: {
      display: isMobile ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      fontSize: '20px',
      cursor: 'pointer',
      color: '#fff',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: '8px',
      border: 'none',
      transition: 'all 0.2s ease',
    },
    navCenter: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: isMobile ? '11px' : '20px',
      fontWeight: 'bold',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    },
    profileContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '8px' : '15px',
      justifyContent: 'flex-end',
      minWidth: isMobile ? 'auto' : '200px',
    },
    profileIcon: {
      width: isMobile ? '32px' : '35px',
      height: isMobile ? '32px' : '35px',
      borderRadius: '50%',
      backgroundColor: '#fff',
      color: '#003366',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: 'bold',
      fontSize: isMobile ? '12px' : '16px',
      cursor: 'pointer',
    },
    logoutButton: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: '#fff',
      border: 'none',
      padding: isMobile ? '6px 12px' : '6px 15px',
      cursor: 'pointer',
      borderRadius: '6px',
      fontSize: isMobile ? '11px' : '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
    },
    sidebar: {
      width: (isMobile ? mobileMenuOpen : sidebarOpen) ? '280px' : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'hidden',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      paddingTop: isMobile ? '56px' : '60px',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 999,
      boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
    },
    sidebarItem: {
      padding: isMobile ? '14px 20px' : '14px 20px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      color: 'white',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      transition: 'all 0.2s ease',
      fontSize: isMobile ? '14px' : '14px',
      fontWeight: '500',
    },
    content: {
      marginLeft: (isMobile ? 0 : (sidebarOpen ? '280px' : '0')),
      marginTop: isMobile ? '56px' : '60px',
      padding: isMobile ? '16px' : '25px',
      transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      width: '100%',
      height: 'calc(100vh - 56px)',
      overflowY: 'auto',
      backgroundColor: '#f5f7fa',
      boxSizing: 'border-box',
    },
    mobileOverlay: {
      position: 'fixed',
      top: isMobile ? '56px' : '60px',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 998,
      display: (isMobile && mobileMenuOpen) ? 'block' : 'none',
      animation: 'fadeIn 0.3s ease-out',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '12px' : '20px',
      marginBottom: '20px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: isMobile ? '14px' : '20px',
      borderRadius: isMobile ? '12px' : '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '10px' : '15px',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      border: '1px solid #eef2f6',
    },
    statIcon: {
      width: isMobile ? '44px' : '52px',
      height: isMobile ? '44px' : '52px',
      borderRadius: isMobile ? '10px' : '12px',
      backgroundColor: '#e8f0fe',
      color: '#003366',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '22px' : '26px',
    },
    statContent: {
      flex: 1,
    },
    statLabel: {
      fontSize: isMobile ? '10px' : '13px',
      color: '#6c757d',
      marginBottom: '4px',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      fontWeight: '500',
    },
    statValue: {
      fontSize: isMobile ? '18px' : '26px',
      fontWeight: '700',
      color: '#1a2634',
      marginBottom: '2px',
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? '16px' : '25px',
      marginBottom: '20px',
    },
    chartCard: {
      backgroundColor: 'white',
      padding: isMobile ? '16px' : '20px',
      borderRadius: isMobile ? '12px' : '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #eef2f6',
    },
    chartTitle: {
      fontSize: isMobile ? '15px' : '16px',
      fontWeight: '600',
      color: '#1a2634',
      marginBottom: '15px',
      paddingBottom: '10px',
      borderBottom: '2px solid #eef2f6',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    chartWrapper: {
      height: isMobile ? '250px' : '300px',
      position: 'relative',
    },
    phoneSearchContainer: {
      maxWidth: '500px',
      margin: isMobile ? '20px auto' : '50px auto',
      padding: isMobile ? '24px' : '35px',
      backgroundColor: 'white',
      borderRadius: isMobile ? '16px' : '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      textAlign: 'center',
    },
    phoneSearchBox: {
      width: '100%',
    },
    searchTitle: {
      fontSize: isMobile ? '20px' : '22px',
      fontWeight: '700',
      color: '#003366',
      marginBottom: '8px',
    },
    searchSubtitle: {
      fontSize: isMobile ? '13px' : '14px',
      color: '#6c757d',
      marginBottom: '24px',
    },
    phoneInput: {
      width: '100%',
      padding: isMobile ? '14px' : '14px',
      border: '2px solid #eef2f6',
      borderRadius: '10px',
      fontSize: '16px',
      marginBottom: '16px',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
    },
    searchButton: {
      width: '100%',
      padding: isMobile ? '14px' : '14px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    errorMessage: {
      color: '#dc3545',
      fontSize: '13px',
      marginBottom: '12px',
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '20px',
      height: '20px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #003366',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    welcomeMessage: {
      fontSize: isMobile ? '18px' : '24px',
      fontWeight: '700',
      color: '#1a2634',
      marginBottom: '15px',
    },
    summaryRow: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      marginBottom: '20px',
      gap: '12px',
    },
    emptyState: {
      color: '#6c757d',
      textAlign: 'center',
      padding: '40px 20px',
      fontSize: '14px',
    },
    filterContainer: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    filterSelect: {
      padding: '8px 12px',
      border: '1px solid #eef2f6',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#1a2634',
      backgroundColor: 'white',
      cursor: 'pointer',
      outline: 'none',
      minWidth: '120px',
    },
  };

  useEffect(() => {
    checkAuthentication();
    fetchUserData();
   
  }, []);

  const checkAuthentication = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');
    const userName = localStorage.getItem('userName');

    const agentRoles = ['Executive', 'FieldExecutive', 'fieldexecutive', 'Unit', 'Agent'];
    if (!isLoggedIn || !agentRoles.includes(role)) {
      navigate('/');
      return;
    }

    setUser({ name: userName, role });
  };

  const fetchUserData = async () => {
    try {
      const userName = localStorage.getItem('userName');
      const res = await axios.get('/api/user-profile', { params: { name: userName } });
      setUser(res.data);
      fetchDashboardStats();
      fetchRecentOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const userName = localStorage.getItem('userName');
      const res = await axios.get('/api/orders', { 
        params: { 
          executive: userName, 
          month: selectedMonth,
          year: selectedYear,
          limit: 10 
        } 
      });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const userName = localStorage.getItem('userName');
      
      // Fetch orders with month/year filter
      const res = await axios.get('/api/orders', { 
        params: { 
          executive: userName,
          month: selectedMonth,
          year: selectedYear
        } 
      });
      const allOrders = res.data || [];
      
      console.log('Orders fetched:', allOrders.length);
      
      // Initialize variables
      let totalRevenue = 0;
      let totalPaid = 0;
      let pendingPayments = 0;
      let pendingPaymentAmount = 0;
      let totalOrders = allOrders.length;
      let completedOrders = 0;
      
      allOrders.forEach((order) => {
        // Calculate order total from rows
        let orderTotal = 0;
        if (order.rows && Array.isArray(order.rows) && order.rows.length > 0) {
          orderTotal = order.rows.reduce((sum, row) => {
            return sum + (parseFloat(row.total) || 0);
          }, 0);
        }
        
        // Use discounted total if available, otherwise use orderTotal
        const finalAmount = parseFloat(order.discountedTotal) || orderTotal || parseFloat(order.totalAmount) || 0;
        totalRevenue += finalAmount;
        
        // Calculate paid amount (advance)
        const advance = parseFloat(order.advance) || 0;
        totalPaid += advance;
        
        // Calculate pending (balance)
        const balance = parseFloat(order.balance) || 0;
        if (balance > 0) {
          pendingPayments++;
          pendingPaymentAmount += balance;
        }
        
        // Count completed orders
        if (order.status === 'completed' || order.status === 'Completed') {
          completedOrders++;
        }
      });
      
      // Get prospects count
      let prospects = 0;
      try {
        const prospectsRes = await axios.get('/api/prospective-clients', { 
          params: { userName: userName }
        });
        prospects = prospectsRes.data?.length || 0;
      } catch (e) {
        console.log('Prospects API not available');
      }
      
      // Calculate monthly orders for the selected year (all 12 months)
      const monthlyOrders = [];
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(selectedYear, i, 1);
        const monthEnd = new Date(selectedYear, i + 1, 0);
        
        const monthOrders = allOrders.filter(order => {
          if (!order.orderDate) return false;
          const orderDate = new Date(order.orderDate);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        
        monthlyOrders.push(monthOrders.length);
      }
      
      console.log('Dashboard Stats:', {
        totalRevenue,
        totalPaid,
        totalOrders,
        pendingPayments,
        pendingPaymentAmount,
        prospects,
        completedOrders
      });
      
      setDashboardStats({
        totalRevenue,
        totalPaid,
        totalOrders,
        pendingPayments,
        pendingPaymentAmount,
        prospects,
        completedOrders,
        monthlyOrders
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setDashboardStats({
        totalRevenue: 0,
        totalPaid: 0,
        totalOrders: 0,
        pendingPayments: 0,
        pendingPaymentAmount: 0,
        prospects: 0,
        completedOrders: 0,
        monthlyOrders: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      });
    }
  };

  const handleSearch = async () => {
    if (orderNumber.length !== 10) {
      setSearchError("Please enter exactly 10 digits");
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      const response = await axios.get(`/api/by-phone?phone=${orderNumber}`);

      if (response.data) {
        setShowOrderForm(true);

        if (response.data.order) {
          setExistingOrderData(response.data.order);
        } else {
          setExistingOrderData(null);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
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

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const linkStyle = (item) => ({
    ...styles.sidebarItem,
    backgroundColor:
      hoveredItem === item || location.pathname.includes(item.toLowerCase().replace(' ', '-'))
        ? '#004c99'
        : 'transparent',
    fontWeight:
      location.pathname.includes(item.toLowerCase().replace(' ', '-')) ? '600' : 'normal',
  });

  const getProfileInitials = (name) =>
    name
      ? name.split(" ").map((part) => part[0]?.toUpperCase() || "").join("").substring(0, 2)
      : "AG";

  // Pending Payment Chart - Shows Paid vs Pending amounts
  const pendingPaymentData = {
    labels: ['Paid', 'Pending'],
    datasets: [
      {
        data: [
          dashboardStats.totalPaid,
          dashboardStats.pendingPaymentAmount
        ],
        backgroundColor: ['#28a745', '#dc3545'],
        borderColor: ['#218838', '#c82333'],
        borderWidth: 1,
      },
    ],
  };

  // Total Orders Bar Chart - Monthly orders
  const monthlyOrdersData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: `Orders (${selectedYear})`,
        data: dashboardStats.monthlyOrders,
        backgroundColor: '#003366',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: isMobile ? 10 : 12,
          padding: isMobile ? 10 : 15,
          font: { size: isMobile ? 10 : 12 },
          usePointStyle: true,
        }
      },
      tooltip: {
        bodyFont: { size: isMobile ? 11 : 12 },
        titleFont: { size: isMobile ? 12 : 13 },
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            const formattedValue = value >= 1000 ? `₹${(value / 1000).toFixed(1)}K` : `₹${value}`;
            return `${label}: ${formattedValue} (${percentage}%)`;
          }
        }
      }
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        bodyFont: { size: isMobile ? 11 : 12 },
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} orders`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: { size: isMobile ? 10 : 11 },
        },
        grid: {
          display: true,
          drawBorder: false,
        }
      },
      x: {
        ticks: {
          font: { size: isMobile ? 10 : 11 },
        },
        grid: {
          display: false,
        }
      }
    },
  };

  // Stats cards - 4 cards with real data from backend
  const stats = [
  
    { label: 'Total Orders', value: dashboardStats.totalOrders, icon: '📦' },
    { label: 'Pending Payments', value: dashboardStats.pendingPayments, icon: '⏳' },
  ];

  // Menu items
  const menuItems = [
    { path: '/agent-dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/agent-dashboard/create-order', label: 'Create Order', icon: '➕' },
    { path: '/agent-dashboard/view-orders', label: 'View Orders', icon: '📋' },
    { path: '/agent-dashboard/create-prospect', label: 'Create Prospect', icon: '🔍' },
    { path: '/agent-dashboard/view-prospects', label: 'View Prospects', icon: '👁️' },
    { path: '/agent-dashboard/quotation', label: 'Quotation', icon: '💬' },
    { path: '/agent-dashboard/price-list', label: 'Price List', icon: '💰' },
  ];

  return (
    <div>
      <AutoLogout />
      
      {/* Navbar */}
      <div style={styles.navbar}>
        <div style={styles.navLeft}>
          <div style={styles.menuButton} onClick={toggleSidebar}>
            {mobileMenuOpen ? '✕' : '☰'}
          </div>
          
          <img 
            src={GMSLogo} 
            alt="GMS Logo" 
            style={styles.logoIcon}
            onClick={handleLogoClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.transition = 'transform 0.2s';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
        </div>

        <div style={styles.navCenter}>AGENT DASHBOARD</div>

        <div style={styles.profileContainer}>
          <div style={styles.profileIcon}>
            {getProfileInitials(user?.name)}
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />

        <div style={styles.sidebar}>
          {menuItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              style={linkStyle(label)}
              onMouseEnter={() => setHoveredItem(label)}
              onMouseLeave={() => setHoveredItem('')}
              onClick={() => {
                if (isMobile) {
                  setMobileMenuOpen(false);
                }
              }}
            >
              <span style={{ fontSize: '18px', width: '24px' }}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div style={styles.content}>
          {location.pathname === '/agent-dashboard' && (
            <>
              <div style={styles.summaryRow}>
                <div style={styles.welcomeMessage}>
                  Welcome back, {user?.name?.split(' ')[0] || 'Agent'}! 👋
                </div>
                
                {/* Month/Year Filter */}
                <div style={styles.filterContainer}>
                  <select 
                    style={styles.filterSelect}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  >
                    {monthOptions.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  
                  <select 
                    style={styles.filterSelect}
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  >
                    {yearOptions.map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats Cards - 4 cards with real data */}
              <div style={styles.statsGrid}>
                {stats.map((stat, idx) => (
                  <div key={idx} style={styles.statCard}>
                    <div style={styles.statIcon}>{stat.icon}</div>
                    <div style={styles.statContent}>
                      <div style={styles.statLabel}>{stat.label}</div>
                      <div style={styles.statValue}>{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Section - 2 charts side by side */}
              <div style={styles.chartsGrid}>
                {/* Pending Payment Chart */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>
                    <span>💰</span> Pending Payments
                  </h3>
                  <div style={styles.chartWrapper}>
                    <Pie data={pendingPaymentData} options={pieOptions} />
                  </div>
                  <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '13px', color: '#6c757d' }}>
                    Pending Amount: ₹{dashboardStats.pendingPaymentAmount.toLocaleString()}
                  </div>
                </div>

                {/* Total Orders Chart */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>
                    <span>📊</span> Total Orders - {selectedYear}
                  </h3>
                  <div style={styles.chartWrapper}>
                    <Bar data={monthlyOrdersData} options={barOptions} />
                  </div>
                  <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '13px', color: '#6c757d' }}>
                    Total Orders: {dashboardStats.totalOrders}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Create Order - Phone validation */}
          {location.pathname === '/agent-dashboard/create-order' && !showOrderForm && (
            <div style={styles.phoneSearchContainer}>
              <div style={styles.phoneSearchBox}>
                <h2 style={styles.searchTitle}>Create New Order</h2>
                <p style={styles.searchSubtitle}>Enter customer's phone number to begin</p>
                <input
                  type="tel"
                  value={orderNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 10) {
                      setOrderNumber(val);
                      if (searchError) setSearchError("");
                    }
                  }}
                  placeholder="10 digit phone number"
                  maxLength={10}
                  style={styles.phoneInput}
                  inputMode="numeric"
                />

                {searchError && (
                  <div style={styles.errorMessage}>{searchError}</div>
                )}
                
                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  style={styles.searchButton}
                >
                  {isLoading ? (
                    <span style={styles.loadingSpinner}></span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Order Form */}
          {location.pathname === '/agent-dashboard/create-order' && showOrderForm && (
            <OrderForm
              orderNumber={orderNumber}
              existingData={existingOrderData}
              onNewOrder={() => setExistingOrderData(null)}
              onBack={() => {
                setShowOrderForm(false);
                setOrderNumber('');
                setExistingOrderData(null);
              }}
              onSuccess={() => {
                setShowOrderForm(false);
                setOrderNumber('');
                setExistingOrderData(null);
                navigate('/agent-dashboard');
                fetchRecentOrders();
                fetchDashboardStats();
              }}
            />
          )}

          {/* View Orders */}
          {location.pathname === '/agent-dashboard/view-orders' && (
            <ViewOrders 
              userRole="Agent" 
              executiveName={user?.name} 
            />
          )}

          {/* Create Prospect */}
          {location.pathname === '/agent-dashboard/create-prospect' && (
            <Prospective 
              executiveName={user?.name}
              onBackToDashboard={() => {
                navigate('/agent-dashboard');
              }}
            />
          )}

          {/* View Prospects */}
          {location.pathname === '/agent-dashboard/view-prospects' && (
            <ViewProspective executiveName={user?.name} />
          )}

          {/* Quotation */}
          {location.pathname === '/agent-dashboard/quotation' && (
            <Quotation executiveName={user?.name} />
          )}

          {/* Price List */}
          {location.pathname === '/agent-dashboard/price-list' && (
            <PriceList />
          )}

          {/* Other routes */}
          {location.pathname !== '/agent-dashboard' && 
           location.pathname !== '/agent-dashboard/create-order' &&
           location.pathname !== '/agent-dashboard/view-orders' &&
           location.pathname !== '/agent-dashboard/create-prospect' &&
           location.pathname !== '/agent-dashboard/view-prospects' &&
           location.pathname !== '/agent-dashboard/quotation' &&
           location.pathname !== '/agent-dashboard/price-list' && 
           <Outlet />}
        </div>
      </div>
    </div>
  );
}

export default AgentDashboard;