import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import AutoLogout from "../mainpage/AutoLogout";
import OrderForm from "../Executive/OrderForm";
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
import { Pie, Bar, Line, Doughnut } from 'react-chartjs-2';

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
  const [hoveredItem, setHoveredItem] = useState('');
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetData, setTargetData] = useState({
    target: 0,
    achieved: 0,
    formattedTarget: "₹0",
    formattedAchieved: "₹0",
  });
  
  // Dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingStatus: 0,
    serviceStatus: 0,
    appointments: 0,
    prospective: 0,
    completedOrders: 0,
    inProgressOrders: 0,
    cancelledOrders: 0,
    monthlyRevenue: [0, 0, 0, 0, 0, 0],
    weeklyOrders: [0, 0, 0, 0, 0, 0, 0],
    revenueGrowth: 0,
    ordersGrowth: 0
  });
  
  // Phone validation states
  const [orderNumber, setOrderNumber] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    navbar: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '60px',
      backgroundColor: '#003366',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 2,
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    navLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    navCenter: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '20px',
      fontWeight: 'bold',
      letterSpacing: '1px',
    },
    profileContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginRight: '40px',
    },
    profileIcon: {
      width: '35px',
      height: '35px',
      borderRadius: '50%',
      backgroundColor: '#fff',
      color: '#003366',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    logoutButton: {
      backgroundColor: 'transparent',
      color: '#fff',
      border: '1px solid #fff',
      padding: '6px 15px',
      cursor: 'pointer',
      borderRadius: '4px',
      fontSize: '14px',
      transition: '0.3s',
      ':hover': {
        backgroundColor: '#fff',
        color: '#003366',
      },
    },
    sidebar: {
      width: sidebarOpen ? '240px' : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'hidden',
      transition: '0.3s',
      paddingTop: '60px',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 1,
      boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    },
    sidebarItem: {
      padding: '14px 20px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      color: 'white',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: '0.3s',
      fontSize: '14px',
    },
    content: {
      marginLeft: sidebarOpen ? '240px' : '0',
      marginTop: '60px',
      padding: '25px',
      transition: 'margin-left 0.3s',
      width: '100%',
      height: 'calc(100vh - 60px)',
      overflowY: 'auto',
      backgroundColor: '#f5f7fa',
    },
    // Dashboard Cards
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer',
      border: '1px solid #eef2f6',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
      },
    },
    statIcon: {
      width: '52px',
      height: '52px',
      borderRadius: '12px',
      backgroundColor: '#e8f0fe',
      color: '#003366',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '26px',
    },
    statContent: {
      flex: 1,
    },
    statLabel: {
      fontSize: '13px',
      color: '#6c757d',
      marginBottom: '5px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    statValue: {
      fontSize: '26px',
      fontWeight: '600',
      color: '#1a2634',
      marginBottom: '5px',
    },
    statTrend: {
      fontSize: '12px',
      color: '#28a745',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    // Charts Grid
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '25px',
      marginBottom: '30px',
    },
    chartCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #eef2f6',
    },
    chartTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a2634',
      marginBottom: '15px',
      paddingBottom: '10px',
      borderBottom: '2px solid #eef2f6',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    // Target Card
    targetCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      marginBottom: '30px',
      border: '1px solid #eef2f6',
    },
    targetHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
    },
    targetTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1a2634',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    targetValues: {
      fontSize: '15px',
      color: '#6c757d',
      fontWeight: '500',
    },
    progressBar: {
      height: '10px',
      backgroundColor: '#e9ecef',
      borderRadius: '6px',
      overflow: 'hidden',
      marginTop: '10px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#003366',
      borderRadius: '6px',
      transition: 'width 0.3s ease',
    },
    // Recent Orders
    recentOrdersCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #eef2f6',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a2634',
      marginBottom: '20px',
      paddingBottom: '10px',
      borderBottom: '2px solid #003366',
    },
    ordersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '15px',
    },
    orderCard: {
      border: '1px solid #eef2f6',
      borderRadius: '8px',
      padding: '15px',
      backgroundColor: '#fafbfc',
      transition: '0.2s',
      ':hover': {
        boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
      },
    },
    orderHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
    },
    orderId: {
      fontWeight: '600',
      color: '#003366',
      fontSize: '14px',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
    },
    orderInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '8px',
      fontSize: '13px',
    },
    infoLabel: {
      color: '#6c757d',
    },
    infoValue: {
      fontWeight: '500',
      color: '#1a2634',
    },
    // Phone Search
    phoneSearchContainer: {
      maxWidth: '450px',
      margin: '50px auto',
      padding: '35px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    phoneSearchBox: {
      width: '100%',
    },
    searchTitle: {
      fontSize: '22px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '10px',
    },
    searchSubtitle: {
      fontSize: '14px',
      color: '#6c757d',
      marginBottom: '25px',
    },
    phoneInput: {
      width: '100%',
      padding: '14px',
      border: '2px solid #eef2f6',
      borderRadius: '8px',
      fontSize: '16px',
      marginBottom: '15px',
      transition: '0.2s',
      ':focus': {
        outline: 'none',
        borderColor: '#003366',
      },
    },
    searchButton: {
      width: '100%',
      padding: '14px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: '0.3s',
      ':hover': {
        backgroundColor: '#004c99',
      },
      ':disabled': {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
      },
    },
    errorMessage: {
      color: '#dc3545',
      fontSize: '14px',
      marginBottom: '10px',
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
      fontSize: '24px',
      fontWeight: '600',
      color: '#1a2634',
      marginBottom: '25px',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      flexWrap: 'wrap',
      gap: '15px',
    },
    dateFilter: {
      padding: '8px 12px',
      border: '1px solid #eef2f6',
      borderRadius: '6px',
      fontSize: '14px',
      color: '#1a2634',
    },
  };

  // Add keyframes for spinner
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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
  `;
  document.head.appendChild(styleSheet);

  useEffect(() => {
    checkAuthentication();
    fetchUserData();
    fetchRecentOrders();
    fetchTargetData();
    fetchDashboardStats();
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
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const userName = localStorage.getItem('userName');
      const res = await axios.get('/api/orders', { params: { executive: userName, limit: 10 } });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // In a real app, this would be an API call
      // For now, calculate from orders data
      const userName = localStorage.getItem('userName');
      const res = await axios.get('/api/orders', { params: { executive: userName } });
      const allOrders = res.data;
      
      const totalRevenue = allOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
      const serviceOrders = allOrders.filter(o => o.status === 'in-progress' || o.status === 'assigned-to-service').length;
      const completedOrders = allOrders.filter(o => o.status === 'completed').length;
      const cancelledOrders = allOrders.filter(o => o.status === 'cancelled').length;
      
      // Mock data for appointments and prospective
      const appointments = 12;
      const prospective = 34;
      
      // Monthly revenue mock data
      const monthlyRevenue = [45000, 52000, 48000, 61000, 58000, 72000];
      
      // Weekly orders mock data
      const weeklyOrders = [8, 12, 15, 10, 18, 14, 9];
      
      setDashboardStats({
        totalRevenue,
        totalOrders: allOrders.length,
        pendingStatus: pendingOrders,
        serviceStatus: serviceOrders,
        appointments,
        prospective,
        completedOrders,
        inProgressOrders: serviceOrders,
        cancelledOrders,
        monthlyRevenue,
        weeklyOrders,
        revenueGrowth: 12.5,
        ordersGrowth: 8.2
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      // Set mock data if API fails
      setDashboardStats({
        totalRevenue: 1250000,
        totalOrders: 156,
        pendingStatus: 23,
        serviceStatus: 45,
        appointments: 12,
        prospective: 34,
        completedOrders: 78,
        inProgressOrders: 45,
        cancelledOrders: 10,
        monthlyRevenue: [85000, 92000, 88000, 95000, 102000, 125000],
        weeklyOrders: [12, 18, 22, 15, 24, 19, 14],
        revenueGrowth: 12.5,
        ordersGrowth: 8.2
      });
    }
  };

  const fetchTargetData = async () => {
    try {
      setLoading(true);
      const currentExecutive = localStorage.getItem('userName') || '';
      const response = await axios.get(`/api/executive/${currentExecutive}`);
      const data = response.data;

      let totalTarget = 0;
      let totalAchieved = 0;

      if (Array.isArray(data)) {
        data.forEach((order) => {
          if (order.target) totalTarget = parseFloat(order.target) || 0;
          if (order.rows) {
            order.rows.forEach((row) => {
              totalAchieved += parseFloat(row.total || 0);
            });
          }
        });
      } else if (data && typeof data === "object") {
        if (data.target) totalTarget = parseFloat(data.target) || 0;
        if (data.rows) {
          data.rows.forEach((row) => {
            totalAchieved += parseFloat(row.total || 0);
          });
        }
      }

      setTargetData({
        target: totalTarget,
        achieved: totalAchieved,
        formattedTarget: `₹${(totalTarget / 100000).toFixed(1)}L`,
        formattedAchieved: `₹${(totalAchieved / 100000).toFixed(1)}L`,
      });
    } catch (error) {
      console.error("Error fetching target data:", error);
      setTargetData({
        target: 1000000,
        achieved: 750000,
        formattedTarget: "₹10L",
        formattedAchieved: "₹7.5L",
      });
    } finally {
      setLoading(false);
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const linkStyle = (item) => ({
    ...styles.sidebarItem,
    backgroundColor:
      hoveredItem === item || location.pathname.includes(item.toLowerCase().replace(' ', '-'))
        ? '#004c99'
        : 'transparent',
    fontWeight:
      location.pathname.includes(item.toLowerCase().replace(' ', '-')) ? '600' : 'normal',
  });

  const targetPercentage =
    targetData.target > 0
      ? Math.min(100, Math.round((targetData.achieved / targetData.target) * 100))
      : 0;

  const getProfileInitials = (name) =>
    name
      ? name.split(" ").map((part) => part[0]?.toUpperCase() || "").join("").substring(0, 2)
      : "AG";

  // Chart configurations
  const orderStatusData = {
    labels: ['Completed', 'In Progress', 'Pending', 'Cancelled'],
    datasets: [
      {
        data: [
          dashboardStats.completedOrders,
          dashboardStats.inProgressOrders,
          dashboardStats.pendingStatus,
          dashboardStats.cancelledOrders
        ],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#6c757d'],
        borderColor: ['#218838', '#e0a800', '#c82333', '#5a6268'],
        borderWidth: 1,
      },
    ],
  };

  const revenueDistributionData = {
    labels: ['Revenue', 'Pending', 'In Service', 'Appointments', 'Prospective'],
    datasets: [
      {
        data: [
          dashboardStats.totalRevenue / 1000,
          dashboardStats.pendingStatus * 25000,
          dashboardStats.serviceStatus * 35000,
          dashboardStats.appointments * 15000,
          dashboardStats.prospective * 10000
        ],
        backgroundColor: ['#003366', '#ffc107', '#17a2b8', '#28a745', '#6f42c1'],
        borderColor: ['#002244', '#e0a800', '#138496', '#218838', '#5a32a3'],
        borderWidth: 1,
      },
    ],
  };

  const monthlyRevenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: dashboardStats.monthlyRevenue,
        backgroundColor: '#003366',
        borderRadius: 6,
      },
    ],
  };

  const weeklyOrdersData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Orders',
        data: dashboardStats.weeklyOrders,
        borderColor: '#003366',
        backgroundColor: 'rgba(0, 51, 102, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#003366',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
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
          boxWidth: 12,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
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
        callbacks: {
          label: function(context) {
            return `₹${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString();
          }
        }
      }
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: {
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
          stepSize: 5,
        }
      }
    },
  };

  const stats = [
    { label: 'Total Revenue', value: `₹${(dashboardStats.totalRevenue / 100000).toFixed(1)}L`, icon: '💰', trend: `+${dashboardStats.revenueGrowth}%` },
    { label: 'Total Orders', value: dashboardStats.totalOrders, icon: '📦', trend: `+${dashboardStats.ordersGrowth}%` },
    { label: 'Pending', value: dashboardStats.pendingStatus, icon: '⏳', trend: '' },
    { label: 'In Service', value: dashboardStats.serviceStatus, icon: '🛠️', trend: '' },
    { label: 'Appointments', value: dashboardStats.appointments, icon: '📅', trend: '' },
    { label: 'Prospective', value: dashboardStats.prospective, icon: '👥', trend: '' },
  ];

  const menuItems = [
    { path: '/agent-dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/agent-dashboard/create-order', label: 'Create Order', icon: '➕' },
    { path: '/total-revenue', label: 'Total Revenue', icon: '💰' },
    { path: '/total-orders', label: 'Total Orders', icon: '📦' },
    { path: '/pending-status', label: 'Pending Status', icon: '⏳' },
    { path: '/service-status', label: 'Service Status', icon: '🛠️' },
    { path: '/appointments', label: 'Appointments', icon: '📅' },
    { path: '/prospective', label: 'Prospective', icon: '👥' },
  ];

  return (
    <div>
      <AutoLogout />
      
      {/* Navbar */}
      <div style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={{ fontSize: '24px', cursor: 'pointer' }} onClick={toggleSidebar}>
            &#9776;
          </span>
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
        {/* Sidebar */}
        <div style={styles.sidebar}>
          {menuItems.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              style={linkStyle(label)}
              onMouseEnter={() => setHoveredItem(label)}
              onMouseLeave={() => setHoveredItem('')}
            >
              <span style={{ fontSize: '18px', width: '24px' }}>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          {/* Dashboard Home */}
          {location.pathname === '/agent-dashboard' && (
            <>
              <div style={styles.summaryRow}>
                <div style={styles.welcomeMessage}>
                  Welcome back, {user?.name || 'Agent'}! 👋
                </div>
                <select style={styles.dateFilter}>
                  <option>Last 30 Days</option>
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>This Quarter</option>
                  <option>This Year</option>
                </select>
              </div>

           

              {/* Charts Section */}
              <div style={styles.chartsGrid}>
                {/* Order Status Pie Chart */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>
                    <span>📊</span> Total Revenue 
                  </h3>
                  <div style={{ height: '300px' }}>
                    <Pie data={orderStatusData} options={pieOptions} />
                  </div>
                </div>

                {/* Revenue Distribution Doughnut Chart */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>
                    <span>💰</span> Revenue Distribution
                  </h3>
                  <div style={{ height: '300px' }}>
                    <Doughnut data={revenueDistributionData} options={pieOptions} />
                  </div>
                </div>

                {/* Monthly Revenue Bar Chart */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>
                    <span>📈</span> Monthly Revenue Trend
                  </h3>
                  <div style={{ height: '300px' }}>
                    <Bar data={monthlyRevenueData} options={barOptions} />
                  </div>
                </div>

                {/* Weekly Orders Line Chart */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>
                    <span>📉</span> Weekly Orders
                  </h3>
                  <div style={{ height: '300px' }}>
                    <Line data={weeklyOrdersData} options={lineOptions} />
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div style={styles.recentOrdersCard}>
                <h3 style={styles.sectionTitle}>Recent Orders</h3>
                {orders.length > 0 ? (
                  <div style={styles.ordersGrid}>
                    {orders.slice(0, 6).map(order => (
                      <div key={order._id} style={styles.orderCard}>
                        <div style={styles.orderHeader}>
                          <span style={styles.orderId}>#{order.orderId || 'N/A'}</span>
                          <span className={`status-badge ${order.status?.toLowerCase()}`} style={styles.statusBadge}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                        <div style={styles.orderInfo}>
                          <span style={styles.infoLabel}>Customer:</span>
                          <span style={styles.infoValue}>{order.customerName || 'N/A'}</span>
                        </div>
                        <div style={styles.orderInfo}>
                          <span style={styles.infoLabel}>Amount:</span>
                          <span style={styles.infoValue}>₹{order.amount?.toLocaleString('en-IN') || '0'}</span>
                        </div>
                        <div style={styles.orderInfo}>
                          <span style={styles.infoLabel}>Date:</span>
                          <span style={styles.infoValue}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#6c757d', textAlign: 'center', padding: '30px' }}>
                    No recent orders found
                  </p>
                )}
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
                  type="text"
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

          {/* Other routes */}
          {location.pathname !== '/agent-dashboard' && 
           location.pathname !== '/agent-dashboard/create-order' && 
           <Outlet />}
        </div>
      </div>
    </div>
  );
}

export default AgentDashboard;