import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../Executive/OrderForm';
import DigitalMarketingOrderForm from '../Executive/Digitalform';
import axios from 'axios';
import AutoLogout from "../mainpage/AutoLogout";
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
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, PolarArea, Line } from 'react-chartjs-2';

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
  LinearScale,
  RadialLinearScale
);

function SalesDashboard() {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [prospectiveData, setProspectiveData] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  // Dashboard data states
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Order search states
  const [orderNumber, setOrderNumber] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedFormType, setSelectedFormType] = useState('order'); // 'order' or 'digital'

  // Month labels
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Responsive sidebar effect
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    // In your fetchDashboardData function:
    // Update your fetchDashboardData function
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('year', year);
        if (selectedMonth !== null) {
          params.append('month', selectedMonth + 1);
        }
        if (selectedWeek !== null) {
          params.append('week', selectedWeek);
        }

        const [chartRes, prospectRes, reportRes] = await Promise.all([
          axios.get(`/api/dashboard/chart-data?${params.toString()}`),
          axios.get('/api/prospective-clients/stats'),
          axios.get(`/api/reports/report-chart-data?${params.toString()}`)
        ]);

        setChartData({
          ...chartRes.data,
          reportChartData: reportRes.data
        });
        setProspectiveData(prospectRes.data);
      } catch (err) {
        console.error('API Error:', err.response?.data || err.message);
        setChartData(null);
        setProspectiveData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedMonth]);

  // Handle order search
  const handleSearch = async () => {
    if (orderNumber.length !== 10) {
      setSearchError('Please enter exactly 10 digits');
      return;
    }

    setIsSearchLoading(true);
    setSearchError('');

    try {
      if (selectedFormType === 'order') {
        const response = await axios.get(`/api/by-phone?phone=${orderNumber}`);

        if (response.data) {
          setShowOrderForm(true);

          if (response.data.order) {
            setExistingOrderData(response.data.order);
          } else {
            setExistingOrderData(null);
          }
        }
      } else {
        // For digital marketing form, just open the form
        setShowOrderForm(true);
        setExistingOrderData(null);
      }
    } catch (error) {
      if (error.response?.status === 404 && selectedFormType === 'order') {
        setShowOrderForm(true);
        setExistingOrderData(null);
      } else {
        console.error('Search failed:', error);
        setSearchError(error.response?.data?.message || 'Failed to search. Please try again.');
      }
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Helper functions
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const showDashboardCards = location.pathname === '/admin-dashboard';

  const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

  // Calculate dashboard metrics

  const pendingPayments = safeArray(chartData?.pendingPayments);
  const pendingServices = safeArray(chartData?.pendingServices);
  const appointments = safeArray(chartData?.appointments);
  const clientTypes = chartData?.clientTypes || {};

  // Generate year options
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

  // Handle chart clicks
  const handleChartClick = (chartType) => {
    if (chartType === 'pending-payment') {
      navigate('/admin-dashboard/pending-payment');
    } else if (chartType === 'pending-service') {
      navigate('/admin-dashboard/pending-service');
    }
  };

  const handleCreateOrderClick = (e) => {
    e.preventDefault();
    setShowOrderForm(false);
    setOrderNumber('');
    navigate('create-order');
  };

  // Styles
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
      // Add these new styles:
  weekButtonsContainer: {
    marginTop: '10px',
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    '@media (max-width: 768px)': {
      gap: '3px',
    }
  },
  weekButton: {
    padding: '3px 6px',
    fontSize: '12px',
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    '@media (max-width: 768px)': {
      padding: '2px 4px',
      fontSize: '10px',
    }
  },
  activeWeekButton: {
    backgroundColor: '#003366',
    color: 'white',
  },
  viewAllButton: {
    padding: '3px 6px',
    fontSize: '12px',
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    '@media (max-width: 768px)': {
      padding: '2px 4px',
      fontSize: '10px',
    }
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
    monthSelector: {
      padding: '5px',
      fontSize: '14px',
      width: '100px',
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
    },
    phoneInputContainer: {
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    },
    phoneInput: {
      padding: '8px',
      fontSize: '1rem',
      width: '200px',
      marginRight: '10px',
      border: '1px solid #ccc',
      borderRadius: '4px'
    },
    searchButton: {
      padding: '8px 16px',
      fontSize: '1rem',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    errorText: {
      color: 'red',
      marginTop: '8px'
    },
    formTypeContainer: {
      margin: '15px 0',
      display: 'flex',
      gap: '20px'
    },
    formTypeLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      cursor: 'pointer'
    },
    formTypeRadio: {
      marginRight: '5px'
    },
    monthHighlight: {
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      border: '2px solid rgba(54, 162, 235, 0.8)'
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
           <AutoLogout />
      <div style={styles.navbar}>
        <span style={styles.burger} onClick={toggleSidebar}>
          &#9776;
        </span>
        <span
          style={{
            ...styles.brand,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            ':hover': {
              opacity: 0.8
            }
          }}
          onClick={() => navigate('/sales-manager-dashboard')}
        >
          GLOBAL MARKETING SOLUTION
        </span>
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
            {(localStorage.getItem('userName') || 'A')
              .split(' ')
              .map((w) => w[0]?.toUpperCase())
              .join('')}
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
            to="/sales-manager-dashboard"
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Dashboard
          </NavLink>
           <NavLink
            to="price-list"
            style={linkStyle('price-list')}
            onMouseEnter={() => setHoveredItem('price-list')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Price List
          </NavLink>
          <NavLink
            to="Employees"
            style={linkStyle('Employees')}
            onMouseEnter={() => setHoveredItem('Employees')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Employees
          </NavLink>
          <NavLink
            to="daily-report"
            style={linkStyle('daily-report')}
            onMouseEnter={() => setHoveredItem('daily-report')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Daily Report
          </NavLink>
          <NavLink
            to="executives-logins"
            style={linkStyle('executives-logins')}
            onMouseEnter={() => setHoveredItem('executives-logins')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Executive Login Time
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
            to="create-order"
            style={linkStyle('create-order')}
            onMouseEnter={() => setHoveredItem('create-orders')}
            onMouseLeave={() => setHoveredItem('')}
            onClick={handleCreateOrderClick}
          >
            Create-Order ➕
          </NavLink>
          <NavLink
            to="add-executive"
            style={linkStyle('add-executive')}
            onMouseEnter={() => setHoveredItem('add-executive')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Add Employee
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
            to="view-design"
            style={linkStyle('view-design')}
            onMouseEnter={() => setHoveredItem('view-design')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Design
          </NavLink>
          <NavLink
            to="prospects"
            style={linkStyle('prospects')}
            onMouseEnter={() => setHoveredItem('prospects')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create Prospects +
          </NavLink>
          <NavLink
            to="appointments"
            style={linkStyle('appointments')}
            onMouseEnter={() => setHoveredItem('appointments')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create Appointments +
          </NavLink>
          <NavLink
            to="select-appointment"
            style={linkStyle('appointments')}
            onMouseEnter={() => setHoveredItem('appointments')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Appointments
          </NavLink>
          <NavLink
            to="activity"
            style={linkStyle('activity')}
            onMouseEnter={() => setHoveredItem('activity')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Target
          </NavLink>
          <NavLink
            to="ledger"
            style={linkStyle('ledger')}
            onMouseEnter={() => setHoveredItem('ledger')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Ledger
          </NavLink>
          
          <NavLink
            to="view-prospective"
            style={linkStyle('view-prospective')}
            onMouseEnter={() => setHoveredItem('view-prospective')}
            onMouseLeave={() => setHoveredItem('')}
          >
            View Prospects
          </NavLink>
          <NavLink
            to="create-anniversary"
            style={linkStyle('create-anniversary')}
            onMouseEnter={() => setHoveredItem('create-anniversary')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Create-Anniversary
          </NavLink>
          <NavLink
            to="anniversary-list"
            style={linkStyle('anniversary-list')}
            onMouseEnter={() => setHoveredItem('anniversary-list')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Anniversary-List
          </NavLink>
        </div>

        {/* Main Content Area */}
        <div style={styles.content}>
          {location.pathname.includes('create-order') ? (
            <>
              {!showOrderForm ? (
                <div style={styles.phoneInputContainer}>
                  <label htmlFor="order-number" style={{ display: 'block', marginBottom: '8px' }}>
                    Enter Phone Number
                  </label>
                  <input
                    id="order-number"
                    type="text"
                    value={orderNumber}
                    maxLength={10}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setOrderNumber(value);
                        if (searchError) setSearchError('');
                      }
                    }}
                    placeholder="Enter 10-digit number"
                    style={styles.phoneInput}
                  />

                  {/* Form Type Selection */}
                  <div style={styles.formTypeContainer}>
                    <label style={styles.formTypeLabel}>
                      <input
                        type="radio"
                        name="formType"
                        value="order"
                        checked={selectedFormType === 'order'}
                        onChange={() => setSelectedFormType('order')}
                        style={styles.formTypeRadio}
                      />
                      Order Form
                    </label>
                    <label style={styles.formTypeLabel}>
                      <input
                        type="radio"
                        name="formType"
                        value="digital"
                        checked={selectedFormType === 'digital'}
                        onChange={() => setSelectedFormType('digital')}
                        style={styles.formTypeRadio}
                      />
                      Digital Marketing Form
                    </label>
                  </div>

                  <button
                    onClick={handleSearch}
                    disabled={isSearchLoading || orderNumber.length !== 10}
                    style={styles.searchButton}
                  >
                    {isSearchLoading ? 'Searching...' :
                      selectedFormType === 'order' ? 'Search Orders' : 'Create Digital Order'}
                  </button>
                  {searchError && (
                    <div style={styles.errorText}>
                      {searchError}
                    </div>
                  )}
                </div>
              ) : (
                selectedFormType === 'order' ? (
                  <OrderForm
                    orderNumber={orderNumber}
                    existingData={existingOrderData}
                    onBack={() => {
                      setShowOrderForm(false);
                      setOrderNumber('');
                      setExistingOrderData(null);
                    }}
                    onSuccess={() => {
                      setShowOrderForm(false);
                      setOrderNumber('');
                      setExistingOrderData(null);
                    }}
                    isAdmin={true}
                  />
                ) : (
                  <div>
                    <button
                      onClick={() => setShowOrderForm(false)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        marginBottom: '20px'
                      }}
                    >
                      Back
                    </button>
                    <DigitalMarketingOrderForm
                      isAdmin={true}
                      onSuccess={() => {
                        setShowOrderForm(false);
                        setOrderNumber('');
                      }}
                    />
                  </div>
                )
              )}
            </>
          ) : (
            <>
              <Outlet />
              {showDashboardCards && (
                <>
                  {/* Year and Month Selector */}
                  {/* Month Selector in the filter section */}
                  <div style={styles.yearSelectorWrapper}>
                    <label htmlFor="year-select" style={styles.yearSelectorLabel}>
                      Select Year:
                    </label>
                    <select
                      id="year-select"
                      value={year}
                      onChange={(e) => {
                        setYear(parseInt(e.target.value));
                        setSelectedMonth(null); // Reset month when year changes
                      }}
                      style={styles.yearSelector}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="month-select" style={styles.yearSelectorLabel}>
                      Select Month:
                    </label>
                    <select
                      id="month-select"
                      value={selectedMonth !== null ? selectedMonth + 1 : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedMonth(value ? parseInt(value) - 1 : null);
                      }}
                      style={styles.monthSelector}
                    >
                      <option value="">All Months</option>
                      {monthLabels.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
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
                      {/* Total Orders Bar Chart */}


                      {/* Total Orders Bar Chart */}
                      <div style={styles.card}>
                        <div>Total Orders {selectedMonth !== null ? `(${monthLabels[selectedMonth]} - Weekly)` : '(Monthly)'}</div>
                        <div style={styles.chartContainer}>
                          <Bar
                            data={{
                              labels: selectedMonth !== null
                                ? chartData?.weeklyOrders?.map((_, i) => `Week ${i + 1}`) || ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']
                                : monthLabels,
                              datasets: [
                                {
                                  label: 'Total Orders',
                                  data: selectedMonth !== null
                                    ? chartData?.weeklyOrders?.map(w => w.count) || []
                                    : safeArray(chartData?.totalOrdersByMonth),
                                  backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                  borderColor: 'rgba(54, 162, 235, 1)',
                                  borderWidth: 1,
                                  barPercentage: 0.8,
                                  categoryPercentage: 0.9
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  callbacks: {
                                    label: (context) => `Orders: ${context.raw}`
                                  }
                                }
                              },
                              onClick: (_, elements) => {
                                if (elements.length > 0) {
                                  if (selectedMonth === null) {
                                    // Navigate to month view
                                    navigate(`/admin-dashboard/view-orders?month=${elements[0].index + 1}&year=${year}`);
                                  } else {
                                    // Navigate to week view
                                    const weekNumber = elements[0].index + 1;
                                    navigate(`/admin-dashboard/view-orders?month=${selectedMonth + 1}&year=${year}&week=${weekNumber}`);
                                  }
                                }
                              },
                              scales: {
                                x: {
                                  grid: { display: false },
                                  ticks: { autoSkip: false }
                                },
                                y: {
                                  beginAtZero: true,
                                  ticks: { precision: 0, stepSize: 1 },
                                  grid: { color: 'rgba(0,0,0,0.05)' }
                                }
                              }
                            }}
                          />
                        </div>
                        <div style={styles.number}>
                          {selectedMonth !== null
                            ? chartData?.weeklyOrders?.reduce((sum, w) => sum + w.count, 0) || 0
                            : safeArray(chartData?.totalOrdersByMonth).reduce((a, b) => a + b, 0)}
                        </div>
                        {selectedMonth !== null && (
                          <button
                            onClick={() => setSelectedMonth(null)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#003366',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginTop: '10px'
                            }}
                          >
                            View All Months
                          </button>
                        )}
                      </div>

                      {/* Pending Payment */}
                      <div style={styles.card}>
                        <div>Payment Status {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
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
                        <div>Service Status {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
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

                      {/* Appointments PolarArea */}
                      <div style={styles.card}>
                        <div>Appointments {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
                        <div style={styles.pieChart}>
                          <PolarArea
                            data={{
                              labels: ['Done', 'Upcoming'],
                              datasets: [
                                {
                                  data: appointments,
                                  backgroundColor: ['red', 'green'],
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { position: 'right' } },
                            }}
                          />
                        </div>
                        <div style={styles.number}>{appointments[1]}</div>
                      </div>

                      {/* Client Types Bar Chart */}
                      <div style={styles.card}>
                        <div>Client Overview {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
                        <div style={styles.chartContainer}>
                          <Bar
                            data={{
                              labels: ['New', 'Renewal', 'Agent'],
                              datasets: [{
                                label: 'Client Types',
                                data: [
                                  clientTypes.New || 0,
                                  clientTypes.Renewal || 0,
                                  clientTypes.Agent || 0,
                                ],
                                backgroundColor: [
                                  '#36A2EB', // New - blue
                                  '#4BC0C0', // Renewal - teal
                                  '#FFCE56', // Agent - yellow
                                ],
                                borderColor: [
                                  '#2a8fcc',
                                  '#3ba8a8',
                                  '#e6b949'
                                ],
                                borderWidth: 1
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  display: false
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function (context) {
                                      return `${context.label}: ${context.raw}`;
                                    }
                                  }
                                }
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  grid: {
                                    color: 'rgba(0,0,0,0.05)'
                                  }
                                },
                                x: {
                                  grid: {
                                    display: false
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                        <div style={styles.number}>
                          {(clientTypes.New || 0) +
                            (clientTypes.Renewal || 0) +
                            (clientTypes.Agent || 0)}
                        </div>
                      </div>

                      {/* Agents Doughnut */}
                      <div style={styles.card}>
                        <div>Agents {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
                        <div style={styles.chartContainer}>
                          <Doughnut
                            data={{
                              labels: ['Agents'],
                              datasets: [
                                {
                                  label: 'Agents',
                                  data: [clientTypes.Agent || 0],
                                  backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                                  borderColor: '#fff',
                                  borderWidth: 2,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  display: true,
                                  position: 'bottom',
                                },
                              },
                            }}
                          />
                        </div>
                        <div style={styles.number}>{clientTypes.Agent || 0}</div>
                      </div>

                      {/* Prospective Clients Doughnut */}
                      <div style={styles.card}>
                        <div>Prospective Clients {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
                        <div style={styles.pieChart}>
                          {prospectiveData ? (
                            <Doughnut
                              data={{
                                labels: Object.keys(prospectiveData),
                                datasets: [{
                                  data: Object.values(prospectiveData),
                                  backgroundColor: [
                                    '#FF6384', // Hot
                                    '#36A2EB', // Warm
                                    '#FFCE56', // Cold
                                    '#4BC0C0', // Converted
                                    '#9966FF', // Lost
                                  ],
                                }],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'right',
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: function (context) {
                                        const label = context.label || '';
                                        const value = context.raw || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: ${value} (${percentage}%)`;
                                      }
                                    }
                                  }
                                },
                                onClick: (event, elements) => {
                                  if (elements.length > 0) {
                                    const index = elements[0].index;
                                    const status = Object.keys(prospectiveData)[index];
                                    navigate(`/admin-dashboard/view-prospective?status=${status}`);
                                  }
                                },
                              }}
                            />
                          ) : (
                            <div>Loading prospective data...</div>
                          )}
                        </div>
                        <div style={styles.number}>
                          {prospectiveData ? Object.values(prospectiveData).reduce((a, b) => a + b, 0) : 0}
                        </div>
                      </div>

                      {/* Daily/Weekly/Monthly Report Chart */}
               <div style={styles.card}>
  <div>
    {selectedMonth !== null ? (
      <>
        <div>Employee Activity ({monthLabels[selectedMonth]} {year})</div>
        <div style={styles.weekButtonsContainer}>
          {[1, 2, 3, 4, 5].map((weekNum) => (
            <button
              key={weekNum}
              onClick={() => setSelectedWeek(weekNum)}
              style={{
                ...styles.weekButton,
                ...(selectedWeek === weekNum ? styles.activeWeekButton : {})
              }}
            >
              W{weekNum}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedWeek(null);
              setSelectedMonth(null);
            }}
            style={styles.viewAllButton}
          >
            All Months
          </button>
        </div>
      </>
    ) : (
      `Employee Activity (${year})`
    )}
  </div>
  <div style={styles.chartContainer}>
                          {chartData?.reportChartData ? (
                            <Line
                              data={{
                                labels: chartData.reportChartData.labels,
                                datasets: [
                                  {
                                    label: 'Total Reports',
                                    data: chartData.reportChartData.reportCounts,
                                    borderColor: 'rgba(54, 162, 235, 1)',
                                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                    tension: 0.1,
                                    yAxisID: 'y'
                                  },
                                  {
                                    label: 'Active Employees',
                                    data: chartData.reportChartData.activeEmployees,
                                    borderColor: 'rgba(255, 99, 132, 1)',
                                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                    tension: 0.1,
                                    yAxisID: 'y1'
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                interaction: {
                                  mode: 'index',
                                  intersect: false
                                },
                                plugins: {
                                  tooltip: {
                                    callbacks: {
                                      label: function (context) {
                                        return `${context.dataset.label}: ${context.raw}`;
                                      }
                                    }
                                  }
                                },
                                scales: {
                                  y: {
                                    type: 'linear',
                                    display: true,
                                    position: 'left',
                                    title: {
                                      display: true,
                                      text: 'Total Reports'
                                    }
                                  },
                                  y1: {
                                    type: 'linear',
                                    display: true,
                                    position: 'right',
                                    title: {
                                      display: true,
                                      text: 'Active Employees'
                                    },
                                    grid: {
                                      drawOnChartArea: false
                                    }
                                  }
                                },
                                onClick: (_, elements) => {
                                  if (elements.length > 0) {
                                    const index = elements[0].index;
                                    if (selectedMonth && !selectedWeek) {
                                      // Navigate to specific day in month view
                                      navigate(`/admin-dashboard/daily-report?day=${index + 1}&month=${selectedMonth + 1}&year=${year}`);
                                    } else if (selectedWeek) {
                                      // Navigate to specific day in week view
                                      navigate(`/admin-dashboard/daily-report?date=${new Date(year, selectedMonth, index + 1 + (selectedWeek - 1) * 7).toISOString()}`);
                                    } else {
                                      // Navigate to month view
                                      navigate(`/admin-dashboard/daily-report?month=${index + 1}&year=${year}`);
                                    }
                                  }
                                }
                              }}
                            />
                          ) : (
                            <div>Loading report data...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;