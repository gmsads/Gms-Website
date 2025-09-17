import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  LineElement,
  PointElement,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AutoLogout from "../mainpage/AutoLogout";
// Register ChartJS components
ChartJS.register(
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale
);

function VendorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());

  // Mock data for charts
  const chartData = {
    monthlyOrders: [12, 19, 8, 15, 12, 18, 10, 14, 16, 12, 20, 15],
    paidOrders: 120,
    pendingPayments: 35
  };

  // Only show dashboard cards when on the exact vendor-dashboard path
  const showDashboardCards = location.pathname === '/vendor-dashboard' && 
                           !location.pathname.endsWith('/vendor-dashboard/');

  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      overflow: 'hidden',
      position: 'relative',
    },
    sidebar: {
      width: sidebarOpen ? '220px' : '0',
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
      height: '90vh',
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '25px',
      margin: '25px auto',
      maxWidth: '900px',
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '25px',
      minHeight: '380px',
      width: '100%',
      boxSizing: 'border-box',
      textAlign: 'center',
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '15px',
    },
    yearSelectorWrapper: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '20px 0',
      gap: '15px',
    },
    yearSelectorLabel: {
      fontWeight: '600',
      color: '#003366',
      fontSize: '16px',
    },
    yearSelector: {
      padding: '8px 12px',
      fontSize: '14px',
      borderRadius: '6px',
      border: '1px solid #ddd',
      backgroundColor: 'white',
    },
    chartContainer: {
      width: '100%',
      height: '220px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '15px 0',
    },
    totalCount: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003366',
      marginTop: '15px',
    },
  };

  const linkStyle = (name) => ({ isActive }) => ({
    ...styles.sidebarItem,
    ...(isActive ? styles.activeSidebarItem : {}),
    ...(hoveredItem === name ? styles.hoverEffect : {}),
  });

  // Responsive sidebar effect
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          onClick={() => navigate('/vendor-dashboard')}
        >
          VENDOR DASHBOARD
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
            {(localStorage.getItem('userName') || 'V').charAt(0).toUpperCase()}
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
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <NavLink
            to="/vendor-dashboard"
            end  // This ensures exact matching for the dashboard route
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="view-orders"
            style={linkStyle('view-orders')}
            onMouseEnter={() => setHoveredItem('view-orders')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Orders
          </NavLink>
          <NavLink
            to="payment"
            style={linkStyle('payment')}
            onMouseEnter={() => setHoveredItem('payment')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Payment
          </NavLink>
        </div>

        {/* Main Content Area */}
        <div style={styles.content}>
          {/* Only show either the dashboard cards or the outlet content */}
          {showDashboardCards ? (
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
                  {Array.from({ length: 5 }, (_, i) => year - 2 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.dashboardCards}>
                {/* Total Orders Card */}
                <div style={styles.card}>
                  <div style={styles.cardTitle}>Total Orders ({year})</div>
                  <div style={styles.chartContainer}>
                    <Bar
                      data={{
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        datasets: [{
                          label: 'Orders',
                          data: chartData.monthlyOrders,
                          backgroundColor: 'rgba(54, 162, 235, 0.7)',
                          borderColor: 'rgba(54, 162, 235, 1)',
                          borderWidth: 1,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <div style={styles.totalCount}>
                    {chartData.monthlyOrders.reduce((a, b) => a + b, 0)} Total
                  </div>
                </div>

                {/* Payment Status Card */}
                <div style={styles.card}>
                  <div style={styles.cardTitle}>Payment Status</div>
                  <div style={styles.chartContainer}>
                    <Doughnut
                      data={{
                        labels: ['Paid', 'Pending'],
                        datasets: [{
                          data: [chartData.paidOrders, chartData.pendingPayments],
                          backgroundColor: ['#4CAF50', '#F44336'],
                          borderWidth: 1,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom'
                          }
                        }
                      }}
                    />
                  </div>
                  <div style={styles.totalCount}>
                    {chartData.pendingPayments} Pending
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorDashboard;