import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import AutoLogout from '../mainpage/AutoLogout';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import OrderForm from '../Executive/OrderForm';

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement
);

function SalesDashboard({ loggedInUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutReason, setLogoutReason] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const [loginTime, setLoginTime] = useState('');
  const [showReportReminder, setShowReportReminder] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const location = useLocation();

  // Order form related states
  const [orderNumber, setOrderNumber] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Check for mobile view on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize login time and set up reminder timer
  useEffect(() => {
    const storedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentTime = new Date().toISOString();
    
    const initialLoginTime = storedUserData.loginTime || currentTime;
    setLoginTime(initialLoginTime);
    
    if (!storedUserData.loginTime) {
      localStorage.setItem('userData', JSON.stringify({
        ...storedUserData,
        loginTime: initialLoginTime,
        username: loggedInUser || 'Vinay'
      }));
    }

    const reminderTimer = setTimeout(() => {
      setShowReportReminder(true);
    }, 30 * 60 * 1000);

    const fetchInteractions = async () => {
      try {
        const response = await axios.get('/api/interactions');
        setInteractions(response.data);
      } catch (error) {
        console.error('Error fetching interactions:', error);
      }
    };
    fetchInteractions();

    // Set initial sidebar state based on screen size
    setIsMobile(window.innerWidth < 768);
    setSidebarOpen(window.innerWidth >= 768);

    return () => clearTimeout(reminderTimer);
  }, [loggedInUser]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const linkStyle = (item) => ({
    ...styles.sidebarItem,
    backgroundColor:
      hoveredItem === item || location.pathname.includes(item.toLowerCase())
        ? '#005599'
        : 'transparent',
    fontWeight:
      location.pathname.includes(item.toLowerCase()) ? 'bold' : 'normal',
  });

  const handleLogout = async () => {
    if (!logoutReason.trim()) {
      setLogoutError('Please provide a logout reason');
      return;
    }

    try {
      const logoutTime = new Date().toISOString();
      const sessionDuration = Math.floor(
        (new Date(logoutTime)) - new Date(loginTime)
      ) / 1000;
      
      const logoutData = {
        username: loggedInUser || 'Vinay',
        loginTime,
        logoutTime,
        sessionDuration: `${sessionDuration} seconds`,
        reason: logoutReason
      };

      await axios.post('/api/logout-history', logoutData);
      
      const history = JSON.parse(localStorage.getItem('LogoutHistory')) || [];
      history.push(logoutData);
      localStorage.setItem('LogoutHistory', JSON.stringify(history));

      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      navigate('/');
    } catch (error) {
      console.error('Error saving logout reason:', error);
      setLogoutError('Failed to logout. Please try again.');
    }
  };

  const handleCreateReport = () => {
    setShowReportReminder(false);
    navigate('/it-dashboard/hour');
  };

  const handleReminderClose = () => {
    setShowReportReminder(false);
    setTimeout(() => {
      setShowReportReminder(true);
    }, 30 * 60 * 1000);
  };

  const handleMonthChange = (increment) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };

  // Handle search for orders
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

  // Handle chart click to view daily reports
  const handleChartClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const monthStart = startOfMonth(selectedDate);
      const clickedDate = new Date(monthStart);
      clickedDate.setDate(monthStart.getDate() + index);
      
      const formattedDate = format(clickedDate, 'yyyy-MM-dd');
      const dayReports = interactions.filter(interaction => 
        format(new Date(interaction.createdAt), 'yyyy-MM-dd') === formattedDate
      );
      
      if (dayReports.length > 0) {
        navigate('/it-dashboard/hour-reeport', { 
          state: { 
            filteredReports: dayReports,
            selectedDate: formattedDate 
          } 
        });
      }
    }
  };

  const getChartData = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const dailyCounts = daysInMonth.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = interactions.filter(interaction => 
        format(new Date(interaction.createdAt), 'yyyy-MM-dd') === dayStr
      ).length;
      return { date: dayStr, count };
    });

    return {
      labels: dailyCounts.map(item => format(new Date(item.date), 'd MMM')),
      datasets: [
        {
          label: 'Daily Reports',
          data: dailyCounts.map(item => item.count),
          backgroundColor: '#003366',
          borderColor: '#003366',
          borderWidth: 1,
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0
        }
      }
    },
    onClick: handleChartClick
  };

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    },
    sidebar: {
      width: sidebarOpen ? (isMobile ? '80%' : '250px') : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'hidden',
      transition: '0.3s',
      paddingTop: '60px',
      position: isMobile ? 'fixed' : 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 100,
      boxShadow: isMobile && sidebarOpen ? '5px 0 15px rgba(0,0,0,0.3)' : 'none',
    },
    content: {
      marginLeft: sidebarOpen ? (isMobile ? '0' : '250px') : '0',
      marginTop: '60px',
      padding: '20px',
      transition: 'margin-left 0.3s',
      width: '100%',
      height: 'calc(100vh - 60px)',
      overflowY: 'auto',
      backgroundColor: '#f4f4f4',
      position: 'relative',
    },
    sidebarItem: {
      padding: '15px 25px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      display: 'block',
      transition: '0.3s',
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
      zIndex: 101,
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
      fontSize: isMobile ? '16px' : '20px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: isMobile ? '40%' : 'none',
    },
    profileContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginRight: isMobile ? '10px' : '40px',
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
    },
    logoutButton: {
      backgroundColor: 'transparent',
      color: '#fff',
      border: '1px solid #fff',
      padding: '6px 10px',
      cursor: 'pointer',
      borderRadius: '5px',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: 'rgba(255,255,255,0.1)',
      },
    },
    chartCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      margin: '20px auto',
      width: isMobile ? '95%' : '80%',
      maxWidth: '900px',
    },
    chartTitle: {
      marginBottom: '20px',
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: 'bold',
      color: '#003366',
      textAlign: 'center',
    },
    statsContainer: {
      display: 'flex',
      justifyContent: 'space-around',
      flexWrap: 'wrap',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      minWidth: isMobile ? '40%' : '200px',
      textAlign: 'center',
      flex: isMobile ? '1 1 40%' : '0 0 auto',
    },
    statValue: {
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      color: '#003366',
      margin: '10px 0',
    },
    statLabel: {
      color: '#666',
      fontSize: isMobile ? '12px' : '14px',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '10px',
      width: isMobile ? '90%' : '450px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    },
    modalHeader: {
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: '600',
      marginBottom: '20px',
      color: '#1e293b',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      borderRadius: '6px',
      border: '1px solid #cbd5e1',
      minHeight: '100px',
      marginBottom: '15px',
      fontFamily: 'inherit',
      resize: 'vertical',
      transition: 'border-color 0.2s',
      ':focus': {
        outline: 'none',
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      },
    },
    errorText: {
      color: '#dc2626',
      fontSize: '14px',
      marginBottom: '15px',
    },
    modalButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '10px',
    },
    cancelButton: {
      backgroundColor: '#e2e8f0',
      color: '#334155',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '6px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      ':hover': {
        backgroundColor: '#cbd5e1',
      },
    },
    confirmButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '6px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      ':hover': {
        backgroundColor: '#2563eb',
      },
    },
    reminderModal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
      zIndex: 2000,
      maxWidth: '500px',
      width: isMobile ? '90%' : '80%',
      textAlign: 'center'
    },
    reminderTitle: {
      fontSize: isMobile ? '20px' : '24px',
      marginBottom: '20px',
      color: '#003366'
    },
    reminderButtons: {
      display: 'flex',
      justifyContent: 'center',
      gap: '15px',
      marginTop: '20px'
    },
    reminderButton: {
      padding: '10px 20px',
      borderRadius: '5px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold'
    },
    createButton: {
      backgroundColor: '#003366',
      color: 'white'
    },
    laterButton: {
      backgroundColor: '#f0f0f0',
      color: '#333'
    },
    dateControls: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      marginBottom: '20px',
      flexWrap: 'wrap',
    },
    dateButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: isMobile ? '12px' : '14px',
      whiteSpace: 'nowrap',
    },
    currentMonthText: {
      fontWeight: 'bold',
      fontSize: isMobile ? '14px' : '16px',
      textAlign: 'center',
      width: '100%',
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 99,
      display: isMobile && sidebarOpen ? 'block' : 'none',
    },
    phoneSearchContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '300px',
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
    },
    errorMessage: {
      color: 'red',
      marginBottom: '15px',
    },
    searchButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '16px',
      transition: 'background-color 0.3s',
      ':hover': {
        backgroundColor: '#005599',
      },
      ':disabled': {
        backgroundColor: '#cccccc',
        cursor: 'not-allowed',
      },
    },
  };

  const stats = [
    { label: 'Total Reports', value: interactions.length, trend: 'up' },
    { label: 'Today\'s Reports', value: interactions.filter(i => 
      format(new Date(i.createdAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length, 
      trend: 'up' 
    },
    { label: 'This Month', value: interactions.filter(i => 
      format(new Date(i.createdAt), 'yyyy-MM') === format(selectedDate, 'yyyy-MM')).length, 
      trend: 'up' 
    },
    { label: 'Avg Daily', value: Math.round(interactions.length / 
      (new Date() - new Date(interactions[0]?.createdAt || new Date())) * 1000 * 60 * 60 * 24), 
      trend: 'up' 
    },
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
        <div style={styles.navCenter}>SALES DASHBOARD</div>
        <div style={styles.profileContainer}>
          <div style={styles.profileIcon}>
            {(loggedInUser || 'Vinay').charAt(0).toUpperCase()}
          </div>
          <button 
            style={styles.logoutButton} 
            onClick={() => setShowLogoutModal(true)}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div style={styles.overlay} onClick={closeSidebar} />
      )}

      {/* Report Reminder Modal */}
      {showReportReminder && (
        <div style={styles.reminderModal}>
          <h2 style={styles.reminderTitle}>Time to Create Your Hourly Report</h2>
          <p>It's been 30 minutes since your last report. Please take a moment to document your recent activities.</p>
          <div style={styles.reminderButtons}>
            <button 
              style={{...styles.reminderButton, ...styles.createButton}}
              onClick={handleCreateReport}
            >
              Create Report Now
            </button>
            <button 
              style={{...styles.reminderButton, ...styles.laterButton}}
              onClick={handleReminderClose}
            >
              Remind Me Later
            </button>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>Logout Confirmation</div>
            <p>Please provide a reason for logging out:</p>
            <textarea
              style={styles.textarea}
              value={logoutReason}
              onChange={(e) => {
                setLogoutReason(e.target.value);
                setLogoutError('');
              }}
              placeholder="Enter logout reason (required)"
            />
            {logoutError && <div style={styles.errorText}>{logoutError}</div>}
            <div style={styles.modalButtons}>
              <button 
                style={styles.cancelButton}
                onClick={() => {
                  setShowLogoutModal(false);
                  setLogoutError('');
                  setLogoutReason('');
                }}
              >
                Cancel
              </button>
              <button 
                style={styles.confirmButton}
                onClick={handleLogout}
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <NavLink 
            to="/it-dashboard" 
            style={linkStyle('dashboard')} 
            onMouseEnter={() => setHoveredItem('dashboard')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Dashboard
          </NavLink>
                <NavLink 
            to="/it-dashboard/schedule" 
            style={linkStyle('schedule')} 
            onMouseEnter={() => setHoveredItem('schedule')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Schedule Day ➕
          </NavLink>
          <NavLink 
            to="/it-dashboard/hour" 
            style={linkStyle('hour')} 
            onMouseEnter={() => setHoveredItem('hour')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Create Hour Report ➕
          </NavLink>
         
          <NavLink 
            to="/it-dashboard/hour-reeport" 
            style={linkStyle('hour-reeport')} 
            onMouseEnter={() => setHoveredItem('hour-reeport')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            View Hour Report
          </NavLink>
          <NavLink 
            to="/it-dashboard/create-order" 
            style={linkStyle('create-order')} 
            onMouseEnter={() => setHoveredItem('create-order')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={() => {
              closeSidebar();
              setShowOrderForm(false);
              setOrderNumber("");
            }}
          >
            Create Order ➕
          </NavLink>
          <NavLink 
            to="/it-dashboard/view-orders" 
            style={linkStyle('view-orders')} 
            onMouseEnter={() => setHoveredItem('view-orders')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            View All Orders
          </NavLink>
          <NavLink 
            to="/it-dashboard/create-prospect" 
            style={linkStyle('create-prospect')} 
            onMouseEnter={() => setHoveredItem('create-prospect')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Create Prospect ➕
          </NavLink>
          <NavLink 
            to="/it-dashboard/view-prospects" 
            style={linkStyle('view-prospects')} 
            onMouseEnter={() => setHoveredItem('view-prospects')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            View Prospects
          </NavLink>
          <NavLink 
            to="/it-dashboard/appointments" 
            style={linkStyle('appointments')} 
            onMouseEnter={() => setHoveredItem('appointments')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Create Appointment ➕
          </NavLink>
          <NavLink 
            to="/it-dashboard/view-appointments" 
            style={linkStyle('view-appointments')} 
            onMouseEnter={() => setHoveredItem('view-appointments')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            View Appointments
          </NavLink>
          <NavLink 
            to="/it-dashboard/price-list" 
            style={linkStyle('price-list')} 
            onMouseEnter={() => setHoveredItem('price-list')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Price List
          </NavLink>
          <NavLink 
            to="/it-dashboard/logout-history" 
            style={linkStyle('logout-history')} 
            onMouseEnter={() => setHoveredItem('logout-history')} 
            onMouseLeave={() => setHoveredItem('')}
            onClick={closeSidebar}
          >
            Logout History
          </NavLink>
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          {location.pathname === '/it-dashboard' ? (
            <>
              <div style={styles.statsContainer}>
                {stats.map((stat, index) => (
                  <div key={index} style={styles.statCard}>
                    <div style={styles.statLabel}>{stat.label}</div>
                    <div style={styles.statValue}>{stat.value}</div>
                    <div style={{ color: stat.trend === 'up' ? 'green' : 'red' }}>
                      {stat.trend === 'up' ? '↑' : '↓'} 
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.chartCard}>
                <div style={styles.chartTitle}>Daily Interaction Reports - {format(selectedDate, 'MMMM yyyy')}</div>
                <div style={styles.dateControls}>
                  <button 
                    style={styles.dateButton}
                    onClick={() => handleMonthChange(-1)}
                  >
                    Previous Month
                  </button>
                  <span style={styles.currentMonthText}>{format(selectedDate, 'MMMM yyyy')}</span>
                  <button 
                    style={styles.dateButton}
                    onClick={() => handleMonthChange(1)}
                  >
                    Next Month
                  </button>
                </div>
                <div style={{ height: '400px' }}>
                  <Bar data={getChartData()} options={chartOptions} />
                </div>
              </div>
            </>
          ) : location.pathname === '/it-dashboard/create-order' && !showOrderForm ? (
            <div style={styles.phoneSearchContainer}>
              <div style={styles.phoneSearchBox}>
                <h3>Enter Phone Number:</h3>
                <div style={styles.formGroup}>
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
                  />
                </div>

                {searchError && (
                  <div style={styles.errorMessage}>{searchError}</div>
                )}
                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  style={styles.searchButton}
                >
                  {isLoading ? "Searching..." : "Search Orders"}
                </button>
              </div>
            </div>
          ) : location.pathname === '/it-dashboard/create-order' && showOrderForm ? (
            <OrderForm
              orderNumber={orderNumber}
              existingData={existingOrderData}
              onNewOrder={() => setExistingOrderData(null)}
              onBack={() => setShowOrderForm(false)}
              onSuccess={() => {
                navigate('/it-dashboard');
                setShowOrderForm(false);
              }}
            />
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;