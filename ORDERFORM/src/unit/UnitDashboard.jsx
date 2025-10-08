import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

function UnitDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    navigate('/');
  };

  const showDashboardCards = location.pathname === '/unit-dashboard';

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      position: 'relative',
    },
    sidebar: {
      width: sidebarOpen ? '250px' : '0',
      backgroundColor: '#2c3e50',
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
      backgroundColor: '#ecf0f1',
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
      backgroundColor: '#34495e',
    },
    activeSidebarItem: {
      backgroundColor: '#1abc9c',
    },
    navbar: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#2c3e50',
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
    dashboardContent: {
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '30px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    welcomeText: {
      fontSize: '2rem',
      color: '#2c3e50',
      marginBottom: '20px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginTop: '30px',
    },
    statCard: {
      backgroundColor: '#3498db',
      color: 'white',
      padding: '20px',
      borderRadius: '8px',
      textAlign: 'center',
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      marginBottom: '10px',
    },
    statLabel: {
      fontSize: '1rem',
      opacity: 0.9,
    }
  };

  const linkStyle = (name) => ({ isActive }) => ({
    ...styles.sidebarItem,
    ...(isActive ? styles.activeSidebarItem : {}),
    ...(hoveredItem === name ? styles.hoverEffect : {}),
  });

  return (
    <div>
      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.burger} onClick={toggleSidebar}>
          &#9776;
        </span>
        <span style={styles.brand}>UNIT DASHBOARD</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#1abc9c',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            userSelect: 'none',
          }}>
            U
          </div>
        </div>
      </div>

      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <NavLink
            to="/unit-dashboard"
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="employee-face"
            style={linkStyle('employee-face')}
            onMouseEnter={() => setHoveredItem('employee-face')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Attendance
          </NavLink>
             <NavLink
            to="employee-login"
            style={linkStyle('employee-login')}
            onMouseEnter={() => setHoveredItem('employee-login')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
         Employee Login
          </NavLink>
           
          <NavLink
            to="record"
            style={linkStyle('record')}
            onMouseEnter={() => setHoveredItem('record')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Create Daily Report +
          </NavLink>
          <NavLink
            to="hour"
            style={linkStyle('hour')}
            onMouseEnter={() => setHoveredItem('hour')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            Hour Report +
          </NavLink>
          <NavLink
            to="hour-reeport"
            style={linkStyle('hour-reeport')}
            onMouseEnter={() => setHoveredItem('hour-reeport')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleSidebarClick}
          >
            View Hour Report
          </NavLink>
          
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#e74c3c',
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              margin: '20px',
              width: 'calc(100% - 40px)',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Logout
          </button>
        </div>

        {/* Main Content Area */}
        <div style={styles.content}>
          {/* Show Outlet for other routes */}
          <Outlet />

          {/* Show dashboard cards only on the main dashboard route */}
          {showDashboardCards && (
            <div style={styles.dashboardContent}>
              <h1 style={styles.welcomeText}>Welcome to Unit Dashboard</h1>
              <p style={{ color: '#7f8c8d', fontSize: '1.2rem', marginBottom: '30px' }}>
                Manage your unit operations efficiently
              </p>
              
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>12</div>
                  <div style={styles.statLabel}>Today's Tasks</div>
                </div>
                <div style={{...styles.statCard, backgroundColor: '#2ecc71'}}>
                  <div style={styles.statNumber}>8</div>
                  <div style={styles.statLabel}>Completed</div>
                </div>
                <div style={{...styles.statCard, backgroundColor: '#e74c3c'}}>
                  <div style={styles.statNumber}>4</div>
                  <div style={styles.statLabel}>Pending</div>
                </div>
                <div style={{...styles.statCard, backgroundColor: '#f39c12'}}>
                  <div style={styles.statNumber}>95%</div>
                  <div style={styles.statLabel}>Efficiency</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UnitDashboard;