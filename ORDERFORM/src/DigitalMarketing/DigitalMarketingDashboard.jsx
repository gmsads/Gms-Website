import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './Digital.css';
import AutoLogout from "../mainpage/AutoLogout";
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function DigitalMarketingDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userName] = useState(localStorage.getItem('userName') || 'Digital Marketer');
  const [stats, setStats] = useState({
    campaigns: 0,
    leads: 0,
    conversions: 0
  });
  const [orders, setOrders] = useState([]);
  const [, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'view-orders') {
      fetchOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setStats({
        campaigns: 24,
        leads: 156,
        conversions: 42
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      setError('');
      // Replace with your actual API endpoint
      const response = await axios.get('/api/orders', {
        params: {
          role: 'Digital Marketer',
          name: userName
        }
      });
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load orders. Please try again.');
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.replace('/');
  };

  const getProfileInitials = (name) =>
    name.split(' ').map(part => part[0]?.toUpperCase() || '').join('');

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const campaignData = [
    { name: 'Social Media', value: 35 },
    { name: 'Email', value: 25 },
    { name: 'SEO', value: 20 },
    { name: 'PPC', value: 15 },
    { name: 'Content', value: 5 }
  ];

  return (
    <div className="app-container">
      {/* Navbar */}
         <AutoLogout />
      <div className="navbar">
        <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">☰</button>
        <h1 className="navbar-title" style={{ background: 'linear-gradient(to right, #4facfe, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Digital Marketing Dashboard
        </h1>
        <div className="navbar-right">
          <div className="profile-icon" title={userName}>
            <span className="profile-icon-symbol">{getProfileInitials(userName)}</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          <div className="nav-menu">
            <div
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </div>
            <div
              className={`nav-item ${activeTab === 'view-orders' ? 'active' : ''}`}
              onClick={() => setActiveTab('view-orders')}
            >
              <span className="nav-icon">👁️</span>
              <span className="nav-text">View Orders</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-container">
            <h2>Marketing Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Active Campaigns</h3>
                <div className="stat-value">{stats.campaigns}</div>
              </div>
              <div className="stat-card">
                <h3>Total Leads</h3>
                <div className="stat-value">{stats.leads}</div>
              </div>
              <div className="stat-card">
                <h3>Conversions</h3>
                <div className="stat-value">{stats.conversions}</div>
              </div>
            </div>

            <div className="chart-container">
              <h3>Campaign Distribution</h3>
              <div style={{ height: '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={campaignData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {campaignData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value}%`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'view-orders' && (
          <div className="orders-container">
            <div className="orders-header">
              <h2>Digital Marketing Orders</h2>
              <button onClick={fetchOrders} className="refresh-btn" disabled={ordersLoading}>
                {ordersLoading ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {ordersLoading ? (
              <div className="loading-spinner">Loading orders...</div>
            ) : (
              <div className="orders-table-container">
                {orders.length > 0 ? (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Client</th>
                        <th>Date</th>
                        <th>Campaign Type</th>
                        <th>Platform</th>
                        <th>Status</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id}>
                          <td>{order.orderId || 'N/A'}</td>
                          <td>{order.clientName}</td>
                          <td>{formatDate(order.orderDate)}</td>
                          <td>{order.campaignType}</td>
                          <td>{order.platform}</td>
                          <td>
                            <span className={`status-badge ${order.status?.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>₹{order.amount?.toLocaleString('en-IN') || '0'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-orders">
                    No orders found
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DigitalMarketingDashboard;