import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import AutoLogout from "../mainpage/AutoLogout";
import axios from 'axios';

function HRDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [hrData, setHrData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    newJoinees: 0,
    totalDepartments: 0
  });

  useEffect(() => {
    fetchHRData();
    fetchEmployeeStats();
  }, []);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const fetchHRData = async () => {
    try {
      setIsLoading(true);
      const userName = localStorage.getItem('userName');
      
      if (!userName) {
        setError('No user identification found. Please login again.');
        setIsLoading(false);
        return;
      }

      // Fetch HR profile
      const response = await axios.get('/api/employees');
      const employeesData = response.data;
      
      // Find current HR user
      let currentHR = null;
      if (employeesData.HR) {
        currentHR = employeesData.HR.find(emp => 
          emp.name === userName || emp.username === userName
        );
      }

      if (currentHR) {
        setHrData(currentHR);
        localStorage.setItem('hrId', currentHR._id);
        setError('');
      } else {
        // If not found in HR, create default HR data
        setHrData({
          name: userName,
          username: userName,
          role: 'HR',
          email: '',
          phone: '',
          joiningDate: new Date().toISOString(),
          active: true
        });
      }

    } catch (err) {
      console.error('Error fetching HR data:', err);
      setError('Failed to fetch HR data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeStats = async () => {
    try {
      const response = await axios.get('/api/employees');
      const employeesData = response.data;
      
      // Flatten all employees
      let allEmployees = [];
      let departmentCount = 0;
      
      Object.keys(employeesData).forEach(role => {
        if (employeesData[role].length > 0) {
          departmentCount++;
          const roleEmployees = employeesData[role].map(emp => ({
            ...emp,
            role: role
          }));
          allEmployees = [...allEmployees, ...roleEmployees];
        }
      });

      // Calculate stats
      const total = allEmployees.length;
      const active = allEmployees.filter(emp => emp.active !== false).length;
      const inactive = total - active;
      
      // New joinees (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newJoinees = allEmployees.filter(emp => {
        if (emp.joiningDate) {
          const joinDate = new Date(emp.joiningDate);
          return joinDate >= thirtyDaysAgo;
        }
        return false;
      }).length;

      setStats({
        totalEmployees: total,
        activeEmployees: active,
        inactiveEmployees: inactive,
        newJoinees: newJoinees,
        totalDepartments: departmentCount
      });

    } catch (err) {
      console.error('Error fetching employee stats:', err);
    }
  };

  const styles = {
   container: {
  display: 'flex',
  minHeight: '100vh',
  height: '100vh', // Add fixed height
  position: 'relative',
  overflow: 'hidden', // Prevent double scrollbars
},
    sidebar: {
      width: sidebarOpen ? '220px' : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'auto',
      transition: 'width 0.3s',
      paddingTop: '60px',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
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
    content: {
      marginLeft: sidebarOpen ? '250px' : '0',
      marginTop: '60px',
      padding: '20px',
      transition: 'margin-left 0.3s',
      width: '100%',
      minHeight: 'calc(100vh - 60px)',
      overflowY: 'auto',
      backgroundColor: '#f4f4f4',
      boxSizing: 'border-box',
      
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
    hrDetailsCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      padding: '30px',
      margin: '20px auto',
      maxWidth: '900px',
    },
    hrHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      borderBottom: '2px solid #003366',
      paddingBottom: '15px',
    },
    hrTitle: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#003366',
      margin: 0,
    },
    hrRole: {
      fontSize: '16px',
      color: '#666',
      backgroundColor: '#e6f3ff',
      padding: '8px 15px',
      borderRadius: '20px',
      fontWeight: '500',
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: '#fff',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'transform 0.2s',
      cursor: 'pointer',
    },
    statInfo: {
      flex: 1,
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '5px',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#003366',
    },
    statIcon: {
      fontSize: '40px',
      color: '#4a90e2',
      opacity: 0.6,
    },
    detailSection: {
      marginBottom: '25px',
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '15px',
      borderLeft: '4px solid #003366',
      paddingLeft: '10px',
    },
    departmentGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '15px',
      marginTop: '10px',
    },
    departmentCard: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    },
    departmentName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '5px',
    },
    departmentCount: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003366',
    },
    quickActions: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginTop: '20px',
    },
    actionButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '15px 20px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      transition: 'background 0.3s',
    },
    loadingText: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '18px',
      color: '#666',
    },
    errorText: {
      textAlign: 'center',
      padding: '40px',
      fontSize: '18px',
      color: '#dc3545',
      backgroundColor: '#f8d7da',
      borderRadius: '8px',
      margin: '20px',
    },
  };

  const linkStyle = (name) => ({ isActive }) => ({
    ...styles.sidebarItem,
    ...(isActive ? styles.activeSidebarItem : {}),
    ...(hoveredItem === name ? styles.hoverEffect : {}),
  });

  // Check if current route is the main dashboard (index route)
  const isDashboardRoute = location.pathname === '/hr-dashboard' || location.pathname === '/hr-dashboard/';

  // Responsive sidebar effect
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Render HR details (dashboard view) - MOVED NAME BESIDE WELCOME
  const renderHRDetails = () => {
    if (!hrData) return null;

    return (
      <>
        {/* Statistics Cards */}
        <div style={styles.statsContainer}>
          <div 
            style={styles.statCard}
            onClick={() => navigate('employees')}
          >
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Total Employees</div>
              <div style={styles.statValue}>{stats.totalEmployees}</div>
            </div>
            <span style={styles.statIcon}>👥</span>
          </div>
          <div 
            style={styles.statCard}
            onClick={() => navigate('employees?status=active')}
          >
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Active Employees</div>
              <div style={styles.statValue}>{stats.activeEmployees}</div>
            </div>
            <span style={styles.statIcon}>✅</span>
          </div>
          <div 
            style={styles.statCard}
            onClick={() => navigate('employees?status=inactive')}
          >
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Inactive Employees</div>
              <div style={styles.statValue}>{stats.inactiveEmployees}</div>
            </div>
            <span style={styles.statIcon}>❌</span>
          </div>
          <div 
            style={styles.statCard}
            onClick={() => navigate('view-performance')}
          >
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>New Joinees (30 days)</div>
              <div style={styles.statValue}>{stats.newJoinees}</div>
            </div>
            <span style={styles.statIcon}>🆕</span>
          </div>
        </div>

        {/* HR Dashboard Card - NAME MOVED BESIDE WELCOME */}
        <div style={styles.hrDetailsCard}>
          <div style={styles.hrHeader}>
            <h1 style={styles.hrTitle}>
              Welcome {hrData.name || hrData.username}
            </h1>
            {/* Removed the separate div for name */}
          </div>

          {/* Department Overview - Keep as is */}
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>Department Overview</h3>
            <div style={styles.departmentGrid}>
              <div style={styles.departmentCard}>
                <span style={styles.departmentName}>Total Departments</span>
                <span style={styles.departmentCount}>{stats.totalDepartments}</span>
              </div>
              <div style={styles.departmentCard}>
                <span style={styles.departmentName}>Active Rate</span>
                <span style={styles.departmentCount}>
                  {stats.totalEmployees > 0 
                    ? Math.round((stats.activeEmployees / stats.totalEmployees) * 100) 
                    : 0}%
                </span>
              </div>
              <div style={styles.departmentCard}>
                <span style={styles.departmentName}>Inactive Rate</span>
                <span style={styles.departmentCount}>
                  {stats.totalEmployees > 0 
                    ? Math.round((stats.inactiveEmployees / stats.totalEmployees) * 100) 
                    : 0}%
                </span>
              </div>
              <div style={styles.departmentCard}>
                <span style={styles.departmentName}>New Joinee Rate</span>
                <span style={styles.departmentCount}>
                  {stats.totalEmployees > 0 
                    ? Math.round((stats.newJoinees / stats.totalEmployees) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions - Keep as is */}
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>Quick Actions</h3>
            <div style={styles.quickActions}>
              <button 
                style={styles.actionButton}
                onClick={() => navigate('add-employee')}
              >
                ➕ Add New Employee
              </button>
              <button 
                style={styles.actionButton}
                onClick={() => navigate('employees')}
              >
                📋 View All Employees
              </button>
              <button 
                style={styles.actionButton}
                onClick={() => navigate('view-performance')}
              >
                📊 View Performance
              </button>
              <button 
                style={styles.actionButton}
                onClick={() => navigate('attendance')}
              >
                📝 Attendance
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Handle sidebar item click on mobile
  const handleSidebarItemClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div>
      {/* Navbar */}
      <AutoLogout />
      <div style={styles.navbar}>
        <span style={styles.burger} onClick={() => setSidebarOpen(!sidebarOpen)}>
          &#9776;
        </span>
        <span
          style={{
            ...styles.brand,
            cursor: 'pointer',
          }}
          onClick={() => {
            navigate('/hr-dashboard');
            if (window.innerWidth <= 768) {
              setSidebarOpen(false);
            }
          }}
        >
          HR DASHBOARD
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            {(hrData?.name?.charAt(0) || localStorage.getItem('userName') || 'H').toUpperCase()}
          </div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.replace('/');
            }}
            style={{
              backgroundColor: '#ff4d4d',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={styles.container}>
        {/* Sidebar - Updated with correct routes */}
        <div style={styles.sidebar}>
          <NavLink
            to="/hr-dashboard"
            end
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarItemClick}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/hr-dashboard/employees"
            style={linkStyle('employees')}
            onMouseEnter={() => setHoveredItem('employees')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarItemClick}
          >
            All Employees
          </NavLink>
          <NavLink
            to="/hr-dashboard/add-employee"
            style={linkStyle('add-employee')}
            onMouseEnter={() => setHoveredItem('add-employee')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarItemClick}
          >
            Add Employee
          </NavLink>
          <NavLink
            to="/hr-dashboard/view-performance"
            style={linkStyle('view-performance')}
            onMouseEnter={() => setHoveredItem('view-performance')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarItemClick}
          >
            View Performance
          </NavLink>
          <NavLink
            to="/hr-dashboard/attendance"
            style={linkStyle('attendance')}
            onMouseEnter={() => setHoveredItem('attendance')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarItemClick}
          >
            Attendance
          </NavLink>
        </div>

        {/* Main Content Area - Now using Outlet for nested routes */}
        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loadingText}>Loading HR dashboard...</div>
          ) : error ? (
            <div style={styles.errorText}>{error}</div>
          ) : isDashboardRoute ? (
            renderHRDetails()
          ) : (
            <Outlet context={{ hrData, stats, fetchEmployeeStats }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default HRDashboard;