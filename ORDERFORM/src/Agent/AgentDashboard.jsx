import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';

function AgentDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    target: 0,
    achieved: 0,
    pendingPayments: 0,
    pendingServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Check screen size and auto-close sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    checkAuthentication();
    fetchUserData();
    fetchAgentStats();
    fetchRecentOrders();
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

  const fetchAgentStats = async () => {
    try {
      const userName = localStorage.getItem('userName');
      const res = await axios.get('/api/executive-dashboard-data', {
        params: { executiveName: userName, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      const userName = localStorage.getItem('userName');
      const res = await axios.get('/api/orders', { params: { executive: userName, limit: 10 } });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavLinkClick = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  if (loading) return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f4f4f4'
    }}>
      <p>Loading Dashboard...</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Navbar */}
      <div style={{
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
        zIndex: 1000,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          flex: 1
        }}>
          <div style={{
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
          }} onClick={toggleSidebar}>
            {sidebarOpen ? '✕' : '☰'}
          </div>
          
          <div style={{
            background: 'linear-gradient(to right, #ff7e5f, #feb47b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            fontSize: isMobile ? '16px' : '18px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            AGENT DASHBOARD
          </div>
        </div>

        {/* User Info and Logout */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '15px',
          justifyContent: 'flex-end',
          flex: 1
        }}>
          {!isMobile && (
            <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>
              Welcome, {user?.name}
            </span>
          )}
          <button 
            onClick={handleLogout} 
            style={{ 
              padding: '8px 16px', 
              cursor: 'pointer',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              marginRight :'40px'
            }}
          >
            {isMobile ? 'Logout' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobile && sidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            top: '60px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 998,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: isMobile ? (sidebarOpen ? '250px' : '0') : (sidebarOpen ? '250px' : '0'),
        backgroundColor: '#003366',
        color: '#fff',
        overflowX: 'hidden',
        transition: 'width 0.3s ease',
        paddingTop: '20px',
        position: 'fixed',
        top: '60px',
        bottom: 0,
        left: 0,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isMobile && sidebarOpen ? '2px 0 5px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* User Info in Sidebar for Mobile */}
        {isMobile && (
          <div style={{
            padding: '15px 25px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '10px'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{user?.name}</div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>{user?.role}</div>
          </div>
        )}

        <NavLink
          to="/agent-dashboard"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
            } : {})
          })}
          onClick={handleNavLinkClick}
          end
        >
          Dashboard
        </NavLink>
        
        <NavLink
          to="/agent-dashboard/orders"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
            } : {})
          })}
          onClick={handleNavLinkClick}
        >
          Orders
        </NavLink>

        <NavLink
          to="/agent-dashboard/profile"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
            } : {})
          })}
          onClick={handleNavLinkClick}
        >
          Profile
        </NavLink>

        <NavLink
          to="/agent-dashboard/reports"
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
            } : {})
          })}
          onClick={handleNavLinkClick}
        >
          Reports
        </NavLink>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginLeft: isMobile ? '0' : (sidebarOpen ? '250px' : '0'),
        marginTop: '60px',
        padding: '20px',
        transition: 'margin-left 0.3s ease',
        width: '100%',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        backgroundColor: '#f4f4f4',
      }}>
        {/* Mobile-only tabs for better mobile navigation */}
        {isMobile && (
          <div style={{ 
            marginBottom: '20px', 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {['dashboard', 'orders', 'profile', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  navigate(`/agent-dashboard${tab === 'dashboard' ? '' : '/' + tab}`);
                }}
                style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  backgroundColor: activeTab === tab ? '#003366' : '#ccc',
                  color: activeTab === tab ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '12px',
                  flex: '1 0 auto',
                  minWidth: '80px'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ color: '#003366', marginBottom: '20px', fontSize: isMobile ? '20px' : '24px' }}>Dashboard Overview</h2>
            
            {/* Stats Cards - Responsive grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px', 
              marginBottom: '30px' 
            }}>
              {Object.keys(stats).map(key => (
                <div key={key} style={{ 
                  padding: isMobile ? '15px' : '20px', 
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: isMobile ? '12px' : '14px',
                    color: '#666',
                    marginBottom: '10px',
                    textTransform: 'capitalize'
                  }}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </div>
                  <div style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 'bold',
                    color: '#003366'
                  }}>
                    {stats[key]}
                  </div>
                </div>
              ))}
            </div>

            <h2 style={{ color: '#003366', marginBottom: '15px', fontSize: isMobile ? '18px' : '20px' }}>Recent Orders</h2>
            {orders.length > 0 ? orders.map(order => (
              <div key={order._id} style={{ 
                border: '1px solid #ddd',
                padding: isMobile ? '12px' : '15px', 
                marginBottom: '10px', 
                borderRadius: '5px',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <p style={{ margin: '5px 0', fontSize: isMobile ? '14px' : '16px' }}>
                  <strong>Order #{order.orderId}</strong> - {order.customerName}
                </p>
                <p style={{ margin: '5px 0', fontSize: isMobile ? '12px' : '14px' }}>
                  Status: {order.status}
                </p>
              </div>
            )) : <p>No orders found</p>}
          </div>
        )}

        {activeTab === 'orders' && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#003366', fontSize: isMobile ? '20px' : '24px' }}>Order Management</h2>
            <p>Order management functionality coming soon...</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#003366', marginBottom: '20px', fontSize: isMobile ? '20px' : '24px' }}>Profile Information</h2>
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Role:</strong> {user?.role}</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#003366', fontSize: isMobile ? '20px' : '24px' }}>Reports</h2>
            <p>Reports functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentDashboard;