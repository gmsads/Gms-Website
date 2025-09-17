import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import AutoLogout from '../mainpage/AutoLogout';
import OrderForm from '../Executive/OrderForm';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, ChartJSTooltip, ChartJSLegend);

const ServiceManagerDashboard = ({ loggedInUser }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, setServices] = useState([]);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalCompleted: 0,
    inProgress: 0,
    totalServices: 0
  });
  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const isDashboardHome = location.pathname === '/service-manager-dashboard';

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockServices = [
          { id: 'SRV-1001', status: 'Pending', customer: 'ABC Corp', type: 'Maintenance' },
          { id: 'SRV-1002', status: 'Completed', customer: 'XYZ Ltd', type: 'Installation' },
          { id: 'SRV-1003', status: 'In Progress', customer: 'Global Tech', type: 'Repair' },
          { id: 'SRV-1004', status: 'Pending', customer: 'Acme Inc', type: 'Inspection' },
          { id: 'SRV-1005', status: 'Completed', customer: 'Tech Solutions', type: 'Upgrade' },
        ];

        if (isMounted) {
          setServices(mockServices);
          setStats({
            totalPending: mockServices.filter(s => s.status === 'Pending').length,
            totalCompleted: mockServices.filter(s => s.status === 'Completed').length,
            inProgress: mockServices.filter(s => s.status === 'In Progress').length,
            totalServices: mockServices.length
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = async () => {
    if (orderNumber.length !== 10) {
      setSearchError('Please enter exactly 10 digits');
      return;
    }
    
    setIsLoading(true);
    setSearchError('');
    
    try {
      const response = await axios.get(`/api/by-phone?phone=${orderNumber}`);
      
      if (response.data) {
        setShowOrderForm(true);
        setExistingOrderData(response.data.order || null);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setShowOrderForm(true);
        setExistingOrderData(null);
      } else {
        console.error('Search failed:', error);
        setSearchError(error.response?.data?.message || 'Failed to search. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  // Styles object
  const styles = {
    orderFormContainer: {
      minHeight: 'calc(100vh - 160px)',
      paddingBottom: '40px',
    },
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    },
    sidebar: {
      width: sidebarOpen ? '250px' : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'hidden',
      transition: 'width 0.3s ease',
      paddingTop: '20px',
      position: 'fixed',
      top: '60px',
      bottom: 0,
      left: 0,
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    sidebarItem: {
      padding: '15px 25px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      display: 'block',
      transition: 'background-color 0.3s',
      fontSize: '16px',
      fontWeight: '500',
    },
    activeSidebarItem: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    content: {
      marginLeft: sidebarOpen ? '250px' : '0',
      marginTop: '60px',
      padding: '20px',
      transition: 'margin-left 0.3s ease',
      width: '100%',
      height: 'calc(100vh - 60px)',
      overflowY: 'auto',
      backgroundColor: '#f4f4f4',
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
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    menuButton: {
      fontSize: '24px',
      cursor: 'pointer',
      padding: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '40px',
    },
    welcomeText: {
      background: 'linear-gradient(to right, #ff7e5f, #feb47b)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      fontWeight: 'bold',
      fontSize: '18px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: 'calc(100vw - 200px)',
      textAlign: 'center',
    },
    profileIcon: {
      marginRight:'30px',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: '#fff',
      color: '#003366',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    sidebarLogoutButton: {
      backgroundColor: '#d32f2f',
      color: 'white',
      border: 'none',
      padding: '12px 25px',
      cursor: 'pointer',
      fontSize: '14px',
      marginTop: 'auto',
      marginBottom: '20px',
      marginLeft: '25px',
      marginRight: '25px',
      borderRadius: '5px',
      textAlign: 'center',
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '20px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: '10px 0',
    },
    card: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginTop: '20px',
    },
    cardTitle: {
      marginBottom: '15px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#003366',
    },
    searchContainer: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '500px',
      margin: '0 auto',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    searchInput: {
      width: '100%',
      padding: '10px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      marginBottom: '15px'
    },
    searchButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '10px 15px',
      borderRadius: '4px',
      cursor: 'pointer',
      width: '100%',
      opacity: 1,
      transition: 'opacity 0.3s'
    },
    searchButtonDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed'
    },
    errorText: {
      color: 'red',
      marginBottom: '15px'
    }
  };

  // Chart data with updated colors
  const serviceStatusData = {
    labels: ['Completed', 'Pending', 'In Progress'],
    datasets: [
      {
        data: [stats.totalCompleted, stats.totalPending, stats.inProgress],
        backgroundColor: ['#FF0000', '#4CAF50', '#FFA500'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 1,
      },
    ],
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f4f4f4'
      }}>
        <div>Loading Service Dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <AutoLogout />
      {/* Navbar */}
      <div style={styles.navbar}>
        <div style={styles.menuButton} onClick={toggleSidebar}>
          {sidebarOpen ? '☰' : '≡'}
        </div>
        <div style={styles.welcomeText}>SERVICE MANAGEMENT DASHBOARD</div>
        <div style={styles.profileIcon}>
          {loggedInUser?.charAt(0).toUpperCase() || 'S'}
        </div>
      </div>

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <NavLink
          to="/service-manager-dashboard"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
          end
        >
          Dashboard
        </NavLink>
          <NavLink
          to="/service-manager-dashboard/price-list"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          Price List
        </NavLink>
        <NavLink
          to="/service-manager-dashboard/assign-service"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          Assign Services
        </NavLink>
        <NavLink
          to="/service-manager-dashboard/create-order"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          Create Order ➕
        </NavLink>
        <NavLink
          to="/service-manager-dashboard/appointments"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          Appointments
        </NavLink>
        <NavLink
          to="/service-manager-dashboard/ledger"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          Ledger
        </NavLink>
        <NavLink
          to="/service-manager-dashboard/view-appointments"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          View Appointments
        </NavLink>
        <NavLink
          to="/service-manager-dashboard/prospects"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          Prospects ➕
        </NavLink>
         <NavLink
          to="/service-manager-dashboard/view-prospective"
          style={({ isActive }) => ({
            ...styles.sidebarItem,
            ...(isActive ? styles.activeSidebarItem : {})
          })}
        >
          View Prospects
        </NavLink>
        <button
          style={styles.sidebarLogoutButton}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {isDashboardHome ? (
          <>
            <div style={styles.statsContainer}>
              <div style={styles.statCard}>
                <div>Pending Services</div>
                <div style={{ ...styles.statValue, color: '#4CAF50' }}>{stats.totalPending}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Require attention</div>
              </div>
              <div style={styles.statCard}>
                <div>In Progress</div>
                <div style={{ ...styles.statValue, color: '#FFA500' }}>{stats.inProgress}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Currently being worked on</div>
              </div>
              <div style={styles.statCard}>
                <div>Completed</div>
                <div style={{ ...styles.statValue, color: '#FF0000' }}>{stats.totalCompleted}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Finished this period</div>
              </div>
              <div style={styles.statCard}>
                <div>Total Services</div>
                <div style={{ ...styles.statValue, color: '#003366' }}>{stats.totalServices}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>All service requests</div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>Service Status Overview</div>
              <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
                <Doughnut
                  data={serviceStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right' },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </>
        ) : location.pathname === '/service-manager-dashboard/create-order' ? (
          <>
            {!showOrderForm ? (
              <div style={styles.searchContainer}>
                <h2 style={{ marginBottom: '20px', color: '#003366' }}>Search Customer</h2>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Enter Phone Number:</label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*$/.test(val)) {
                        setOrderNumber(val);
                        if (searchError) setSearchError('');
                      }
                    }}
                    placeholder="10 digit phone number"
                    maxLength={10}
                    style={styles.searchInput}
                  />
                </div>
                {searchError && <div style={styles.errorText}>{searchError}</div>}
                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  style={{
                    ...styles.searchButton,
                    ...((isLoading || orderNumber.length !== 10) ? styles.searchButtonDisabled : {})
                  }}
                >
                  {isLoading ? 'Searching...' : 'Search Customer'}
                </button>
              </div>
            ) : (
              <div style={styles.orderFormContainer}>
                <OrderForm 
                  orderNumber={orderNumber}
                  existingData={existingOrderData}
                  onNewOrder={() => setExistingOrderData(null)}
                  onBack={() => {
                    setShowOrderForm(false);
                    setOrderNumber('');
                  }}
                  onSuccess={() => {
                    setShowOrderForm(false);
                    setOrderNumber('');
                    navigate('/service-manager-dashboard');
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
};

export default ServiceManagerDashboard;