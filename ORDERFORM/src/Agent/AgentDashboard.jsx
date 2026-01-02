import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';
import AutoLogout from "../mainpage/AutoLogout";
import OrderForm from "../Executive/OrderForm";

function AgentDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [, setStats] = useState({
    target: 0,
    achieved: 0,
    pendingPayments: 0,
    pendingServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Phone validation states
  const [orderNumber, setOrderNumber] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  
  // Target data state
  const [targetData, setTargetData] = useState({
    target: 0,
    achieved: 0,
    formattedTarget: "₹0",
    formattedAchieved: "₹0",
  });
  const [targetLoading, setTargetLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const logoutRef = useRef(null);

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
    fetchTargetData();
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

  // Fetch target data
  const fetchTargetData = async () => {
    try {
      setTargetLoading(true);
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
        formattedTarget: `₹${totalTarget.toLocaleString("en-IN")}`,
        formattedAchieved: `₹${totalAchieved.toLocaleString("en-IN")}`,
      });
    } catch (error) {
      console.error("Error fetching target data:", error);
      setTargetData({
        target: 100000,
        achieved: 0,
        formattedTarget: "₹100,000",
        formattedAchieved: "₹0",
      });
    } finally {
      setTargetLoading(false);
    }
  };

  // Phone validation and search function
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavLinkClick = (tabKey, path) => {
    // Auto-close sidebar on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    setActiveTab(tabKey);
    
    // Reset order form state when clicking on create-order
    if (tabKey === 'create-order') {
      setShowOrderForm(false);
      setOrderNumber('');
      setExistingOrderData(null);
      setSearchError('');
    }
    
    // Navigate to the path
    navigate(path);
  };

  // Calculate target percentage
  const targetPercentage =
    targetData.target > 0
      ? Math.min(
          100,
          Math.round((targetData.achieved / targetData.target) * 100)
        )
      : 0;

  // Get progress gradient color
  const getProgressGradient = (percentage) => {
    if (percentage <= 30) return "linear-gradient(to right, #ff4e50, #ff0000)";
    if (percentage <= 50) return "linear-gradient(to right, #ffa751, #ff6a00)";
    if (percentage <= 80)
      return "linear-gradient(to right, rgb(32, 210, 118), rgb(111, 192, 141))";
    return "linear-gradient(to right, rgb(16, 231, 34), rgb(11, 222, 25))";
  };

  // Get profile initials
  const getProfileInitials = (name) =>
    name
      ? name.split(" ").map((part) => part[0]?.toUpperCase() || "").join("")
      : "A";

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

  // Menu items configuration - Only 3 items
  const menuItems = [
    { path: '/agent-dashboard', label: 'Dashboard', key: 'dashboard' },
    { path: '/agent-dashboard/create-order', label: 'Create Order', key: 'create-order' },
    { path: '/field-executive', label: 'Field Executive', key: 'field-executive' },
  ];

  return (
    <div className="app-container">
      <AutoLogout />
      
      {/* Navbar */}
      <div className="navbar">
        <button
          className="toggle-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        
        <h1 className="navbar-title">
          AGENT DASHBOARD
        </h1>

        <div className="navbar-right">
          {/* Target Display */}
          <div className="target-display">
            <div className="target-header">
              <span className="target-icon">🎯 Target:</span>
            </div>
            <div className="target-progress-container">
              <span className="target-text">
                {targetLoading
                  ? "Loading..."
                  : `${targetData.formattedAchieved} / ${targetData.formattedTarget}`}
              </span>
              <div className="progress-bar">
                {!targetLoading && (
                  <div
                    className="progress-fill"
                    style={{
                      width: `${targetPercentage}%`,
                      backgroundImage: getProgressGradient(targetPercentage),
                    }}
                  ></div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Icon */}
          <div className="profile-icon" title={user?.name}>
            <span className="profile-icon-symbol">
              {getProfileInitials(user?.name)}
            </span>
          </div>

          {/* Logout Button */}
          <div ref={logoutRef} className="logout-container">
            <button 
              className="logout-btn" 
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-content">
          {/* User Info in Sidebar for Mobile */}
          {isMobile && (
            <div className="sidebar-user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          )}

          <div className="nav-menu">
            {menuItems.map(({ key, label, path }) => (
              <div
                key={key}
                className={`nav-item ${activeTab === key ? "active" : ""}`}
                onClick={() => handleNavLinkClick(key, path)}
              >
                <span className="nav-text">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? "" : "expanded"}`}>
        <div className="form-container">
          {/* Dashboard Home - Only Pie Chart */}
          {location.pathname === '/agent-dashboard' && (
            <div className="dashboard-home">
              <h2 className="dashboard-title">Agent Performance Overview</h2>
              
              {/* Single Pie Chart Container */}
              <div className="pie-chart-container">
                <div className="pie-chart-card">
                  <h3 className="pie-chart-title">Target Achievement</h3>
                  <div className="pie-chart-wrapper">
                    <div className="pie-chart">
                      <div 
                        className="pie-segment achieved"
                        style={{ 
                          '--percentage': `${targetPercentage}%`,
                          '--color': targetPercentage >= 80 ? '#4CAF50' : 
                                    targetPercentage >= 50 ? '#FFA500' : '#FF0000'
                        }}
                      >
                        <div className="pie-center">
                          <span className="percentage">{targetPercentage}%</span>
                          <span className="label">Achieved</span>
                        </div>
                      </div>
                      <div 
                        className="pie-segment remaining"
                        style={{ 
                          '--percentage': `${100 - targetPercentage}%`,
                          '--color': '#e0e0e0'
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="pie-chart-stats">
                    <div className="stat-item">
                      <span className="stat-label">Target:</span>
                      <span className="stat-value">{targetData.formattedTarget}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Achieved:</span>
                      <span className="stat-value">{targetData.formattedAchieved}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Remaining:</span>
                      <span className="stat-value">
                        ₹{(targetData.target - targetData.achieved).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="recent-orders-section">
                <h3 className="section-title">Recent Orders</h3>
                {orders.length > 0 ? (
                  <div className="orders-list">
                    {orders.map(order => (
                      <div key={order._id} className="order-item">
                        <div className="order-header">
                          <strong>Order #{order.orderId}</strong>
                          <span className={`status-badge ${order.status?.toLowerCase()}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="order-details">
                          <span className="customer-name">{order.customerName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-orders">No orders found</p>
                )}
              </div>
            </div>
          )}

          {/* Phone validation for create-order */}
          {location.pathname === '/agent-dashboard/create-order' && !showOrderForm && (
            <div className="phone-search-container">
              <div className="phone-search-box">
                <h3>Enter Phone Number:</h3>
                <div className="form-group">
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
                  <div className="error-message">{searchError}</div>
                )}
                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  className="search-button"
                >
                  {isLoading ? "Searching..." : "Search Orders"}
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
              }}
            />
          )}

          {/* Field Executive Tab Content */}
          {location.pathname === '/field-executive' && (
            <div className="field-executive-content">
              <h2>Field Executive</h2>
              <p>Field Executive content goes here...</p>
            </div>
          )}
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        .app-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 60px;
          background-color: #003366;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 1000;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .toggle-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
        }

        .navbar-title {
          background: linear-gradient(to right, #ff7e5f, #feb47b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .target-display {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
          min-width: 200px;
        }

        .target-header {
          font-size: 12px;
          margin-bottom: 4px;
          opacity: 0.8;
        }

        .target-progress-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .target-text {
          font-size: 14px;
          font-weight: bold;
        }

        .progress-bar {
          height: 6px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .profile-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #fff;
          color: #003366;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .logout-btn {
          padding: 8px 16px;
          cursor: pointer;
          background-color: #d32f2f;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 14px;
        }

        /* Sidebar Overlay for Mobile */
        .sidebar-overlay {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          z-index: 998;
        }

        .sidebar {
          width: ${sidebarOpen ? '200px' : '0'};
          background-color: #003366;
          color: #fff;
          overflow-x: hidden;
          transition: width 0.3s ease;
          padding-top: 20px;
          position: fixed;
          top: 60px;
          bottom: 0;
          left: 0;
          z-index: 999;
          display: flex;
          flex-direction: column;
        }

        .sidebar-user-info {
          padding: 15px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          margin-bottom: 10px;
        }

        .user-name {
          font-weight: bold;
          font-size: 16px;
        }

        .user-role {
          font-size: 14px;
          opacity: 0.8;
        }

        .nav-menu {
          display: flex;
          flex-direction: column;
        }

        .nav-item {
          padding: 18px 20px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          color: white;
          text-decoration: none;
          display: block;
          transition: background-color 0.3s;
          font-size: 16px;
          font-weight: 500;
          text-align: left;
        }

        .nav-item:hover,
        .nav-item.active {
          background-color: rgba(255,255,255,0.2);
          font-weight: bold;
        }

        .nav-text {
          display: block;
        }

        .main-content {
          margin-left: ${sidebarOpen && !isMobile ? '200px' : '0'};
          margin-top: 60px;
          padding: 20px;
          transition: margin-left 0.3s ease;
          width: 100%;
          height: calc(100vh - 60px);
          overflow-y: auto;
          background-color: #f4f4f4;
        }

        /* Dashboard Styles */
        .dashboard-home {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-title {
          color: #003366;
          margin-bottom: 30px;
          text-align: center;
          font-size: ${isMobile ? '20px' : '24px'};
        }

        .pie-chart-container {
          display: flex;
          justify-content: center;
          margin-bottom: 40px;
        }

        .pie-chart-card {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .pie-chart-title {
          color: #003366;
          margin-bottom: 20px;
          font-size: ${isMobile ? '16px' : '18px'};
        }

        .pie-chart-wrapper {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }

        .pie-chart {
          width: ${isMobile ? '150px' : '200px'};
          height: ${isMobile ? '150px' : '200px'};
          border-radius: 50%;
          position: relative;
          background: conic-gradient(
            var(--color) 0% var(--percentage),
            #e0e0e0 var(--percentage) 100%
          );
        }

        .pie-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          width: ${isMobile ? '80px' : '100px'};
          height: ${isMobile ? '80px' : '100px'};
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .percentage {
          font-size: ${isMobile ? '16px' : '20px'};
          font-weight: bold;
          color: #003366;
        }

        .label {
          font-size: ${isMobile ? '10px' : '12px'};
          color: #666;
          margin-top: 5px;
        }

        .pie-chart-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .stat-item {
          text-align: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }

        .stat-value {
          display: block;
          font-size: 14px;
          font-weight: bold;
          color: #003366;
        }

        .recent-orders-section {
          background: white;
          padding: 25px;
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .section-title {
          color: #003366;
          margin-bottom: 20px;
          font-size: ${isMobile ? '16px' : '18px'};
        }

        .orders-list {
          display: grid;
          gap: 15px;
        }

        .order-item {
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }

        .status-badge.completed {
          background: #e6f7e6;
          color: #2e7d32;
        }

        .status-badge.pending {
          background: #fff3e6;
          color: #ff9800;
        }

        .status-badge.in-progress {
          background: #e6f7ff;
          color: #1976d2;
        }

        .customer-name {
          color: #333;
          font-size: 14px;
        }

        .no-orders {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px;
        }

        /* Phone Search Styles */
        .phone-search-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .phone-search-box {
          max-width: 500px;
          width: 100%;
          padding: 30px;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group input {
          width: 100%;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 18px;
          text-align: center;
          outline: none;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          border-color: #003366;
        }

        .error-message {
          color: #d32f2f;
          font-size: 14px;
          margin-bottom: 15px;
          text-align: center;
        }

        .search-button {
          width: 100%;
          padding: 15px;
          background-color: #003366;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .search-button:hover:not(:disabled) {
          background-color: #002244;
        }

        .search-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        /* Field Executive Content */
        .field-executive-content {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          max-width: 800px;
          margin: 0 auto;
        }

        .field-executive-content h2 {
          color: #003366;
          margin-bottom: 20px;
        }

        .field-executive-content p {
          color: #666;
          line-height: 1.6;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .navbar-title {
            font-size: 16px;
          }

          .target-display {
            min-width: 150px;
          }

          .target-text {
            font-size: 12px;
          }

          .pie-chart-card {
            padding: 20px;
          }

          .pie-chart-stats {
            grid-template-columns: 1fr;
          }

          .recent-orders-section {
            padding: 20px;
          }

          .sidebar {
            width: ${sidebarOpen ? '180px' : '0'};
          }
        }

        @media (max-width: 480px) {
          .navbar-right {
            gap: 10px;
          }

          .target-display {
            display: none;
          }

          .pie-chart {
            width: 120px;
            height: 120px;
          }

          .pie-center {
            width: 60px;
            height: 60px;
          }

          .percentage {
            font-size: 14px;
          }

          .label {
            font-size: 9px;
          }

          .nav-item {
            padding: 16px 20px;
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
}

export default AgentDashboard;