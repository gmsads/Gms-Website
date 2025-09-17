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
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const location = useLocation();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true);
      try {
        console.log(`Fetching data for year: ${year}`);
        const res = await axios.get(`/api/dashboard/chart-data?year=${year}&_=${Date.now()}`);
        console.log('Data received:', res.data);
        setChartData(res.data);
      } catch (err) {
        console.error('API Error:', err.response?.data || err.message);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchChartData();
  }, [year]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const showDashboardCards = location.pathname === '/account-dashboard';

  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden',
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
    }
  };

  const linkStyle = (name) => ({ isActive }) => ({
    ...styles.sidebarItem,
    ...(isActive ? styles.activeSidebarItem : {}),
    ...(hoveredItem === name ? styles.hoverEffect : {}),
  });

  const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

  const totalOrdersSum = safeArray(chartData?.totalOrdersByMonth).reduce((a, b) => a + b, 0);
  const pendingPayments = safeArray(chartData?.pendingPayments);
  const pendingServices = safeArray(chartData?.pendingServices);
  const clientTypes = chartData?.clientTypes || {};

  const years = [];
  for (let y = 2000; y <= 3000; y++) {
    years.push(y);
  }

  const handleChartClick = (chartType) => {
    if (chartType === 'pending-payment') {
      navigate('pending-payment');
    } else if (chartType === 'pending-service') {
      navigate('pending-service');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  return (
    <div>
        <AutoLogout />
      {/* Navbar */}
      <div style={styles.navbar}>
        <span style={styles.burger} onClick={toggleSidebar}>
          &#9776;
        </span>
        <span style={styles.brand}>ACCOUNTS DASHBOARD</span>
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

      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <NavLink
            to="/account-dashboard"
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="create-order"
            style={linkStyle('create-orders')}
            onMouseEnter={() => setHoveredItem('create-order')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create Order ➕
          </NavLink>
          <NavLink
            to="view-orders"
            style={linkStyle('view-orders')}
            onMouseEnter={() => setHoveredItem('view-orders')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View All Orders
          </NavLink>
          <NavLink
            to="daily-record"
            style={linkStyle('daily-record')}
            onMouseEnter={() => setHoveredItem('daily-record')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create Daily Report ➕
          </NavLink>
          <NavLink
            to="daily-report" 
            style={linkStyle('daily-report')}
            onMouseEnter={() => setHoveredItem('daily-report')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Daily Report 
          </NavLink>
       <NavLink
            to="expenses"
            style={linkStyle('expenses')}
            onMouseEnter={() => setHoveredItem('expenses')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create Expensee
          </NavLink>
            <NavLink
            to="view-expenses"
            style={linkStyle('view-expenses')}
            onMouseEnter={() => setHoveredItem('view-expenses')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Expensee
          </NavLink>
            <NavLink
            to="hour"
            style={linkStyle('hour')}
            onMouseEnter={() => setHoveredItem('hour')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create Report
          </NavLink>
            <NavLink
            to="hour-reeport"
            style={linkStyle('hour-reeport')}
            onMouseEnter={() => setHoveredItem('hour-reeport')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Report
          </NavLink>
          <NavLink
            to="assign-service"
            style={linkStyle('assign-service')}
            onMouseEnter={() => setHoveredItem('assign-service')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Assign Service
          </NavLink>
          <NavLink
            to="pending-payment"
            style={linkStyle('pending-payment')}
            onMouseEnter={() => setHoveredItem('pending-payment')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Pending Payment
          </NavLink>
          <NavLink
            to="pending-service"
            style={linkStyle('pending-service')}
            onMouseEnter={() => setHoveredItem('pending-service')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Pending Service
          </NavLink>
          <NavLink
            to="activity"
            style={linkStyle('activity')}
            onMouseEnter={() => setHoveredItem('activity')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Target
          </NavLink>
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
          <Outlet />

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

                  {/* Pending Payment */}
                  <div style={styles.card}>
                    <div>Pending Payment</div>
                    <div style={styles.pieChart}>
                      <Doughnut
                        data={{
                          labels: ['Paid', 'Pending'],
                          datasets: [
                            {
                              data: pendingPayments,
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
                      <div
                        style={{
                          ...styles.clickableSection,
                          pointerEvents: pendingPayments[1] > 0 ? 'auto' : 'none'
                        }}
                        onClick={() => pendingPayments[1] > 0 && handleChartClick('pending-payment')}
                      />
                    </div>
                    <div style={styles.number}>{pendingPayments[1]}</div>
                  </div>

                  {/* Pending Service */}
                  <div style={styles.card}>
                    <div>Pending Service</div>
                    <div style={styles.pieChart}>
                      <Doughnut
                        data={{
                          labels: ['Completed', 'Pending'],
                          datasets: [
                            {
                              data: pendingServices,
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
                      <div
                        style={{
                          ...styles.clickableSection,
                          pointerEvents: pendingServices[1] > 0 ? 'auto' : 'none'
                        }}
                        onClick={() => pendingServices[1] > 0 && handleChartClick('pending-service')}
                      />
                    </div>
                    <div style={styles.number}>{pendingServices[1]}</div>
                  </div>

                  {/* Client Types Doughnut */}
                  <div style={styles.card}>
                    <div>Client Types</div>
                    <div style={styles.pieChart}>
                      <Doughnut
                        data={{
                          labels: ['New', 'Renewal', 'Agent'],
                          datasets: [{
                            data: [
                              clientTypes.New || 0,
                              clientTypes.Renewal || 0,
                              clientTypes.Agent || 0,
                            ],
                            backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
                          }],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'right' } },
                        }}
                      />
                    </div>
                    <div style={styles.number}>
                      {(clientTypes.New || 0) +
                        (clientTypes.Renewal || 0) +
                        (clientTypes.Agent || 0)}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountDashboard;