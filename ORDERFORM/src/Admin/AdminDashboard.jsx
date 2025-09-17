import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import OrderForm from '../Executive/OrderForm';
import DigitalMarketingOrderForm from '../Executive/Digitalform';
import axios from 'axios';
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

function AdminDashboard() {
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const [openSections, setOpenSections] = useState({
    general: false,
    sales: false,
    services: false,
    clients: false,
    events: false
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [prospectiveData, setProspectiveData] = useState(null);
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
  const [selectedFormType, setSelectedFormType] = useState('order');

  // Month labels
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  // Toggle sidebar section
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Close sidebar on mobile when clicking a menu item
  const handleMenuItemClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Responsive sidebar effect
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth > 768;
      setSidebarOpen(isDesktop);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('year', year);
        if (selectedMonth !== null) {
          params.append('month', selectedMonth + 1);
        }

        const [chartRes, prospectRes] = await Promise.all([
          axios.get(`/api/dashboard/chart-data?${params.toString()}`),
          axios.get(`/api/prospective-clients/stats?${params.toString()}`) // Updated to include date filters
        ]);

        setChartData(chartRes.data);
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
          setExistingOrderData(response.data.order || null);
        }
      } else {
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
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const showDashboardCards = location.pathname === '/admin-dashboard';
  const safeArray = (arr) => (Array.isArray(arr) ? arr : []);

  // Calculate dashboard metrics
  const pendingPayments = safeArray(chartData?.pendingPayments);
  const pendingServices = safeArray(chartData?.pendingServices);
  const appointments = safeArray(chartData?.appointments);
  const clientTypes = chartData?.clientTypes || { New: 0, Renewal: 0, Agent: 0, 'Renewal-Agent': 0 };

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
    handleMenuItemClick();
  };

  // Get time period text for display
  const getTimePeriodText = () => {
    if (selectedMonth !== null) {
      return `${monthLabels[selectedMonth]} ${year}`;
    }
    return `Year ${year}`;
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
      width: sidebarOpen ? '250px' : '0',
      background: 'linear-gradient(to bottom, #001529, #003366)',
      color: '#fff',
      overflowX: 'hidden',
      transition: 'width 0.3s',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 10,
      height: '100vh',
      boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
    },
    sidebarHeader: {
      padding: '20px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#fff',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '10px',
      background: 'rgba(0,0,0,0.1)',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sidebarSection: {
      marginBottom: '5px',
    },
    sidebarSectionTitle: {
      padding: '12px 20px',
      fontSize: '14px',
      fontWeight: '600',
      color: 'rgba(255,255,255,0.8)',
      textTransform: 'uppercase',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      background: 'rgba(0,0,0,0.1)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      ':hover': {
        background: 'rgba(0,0,0,0.2)',
      }
    },
    sidebarItem: {
      padding: '12px 30px',
      cursor: 'pointer',
      color: 'rgba(255,255,255,0.8)',
      textDecoration: 'none',
      display: 'block',
      transition: 'all 0.3s',
      fontSize: '14px',
      borderLeft: '3px solid transparent',
      background: 'rgba(0,0,0,0.05)',
    },
    hoverEffect: { 
      background: 'rgba(255,255,255,0.1)',
      borderLeft: '3px solid #1890ff',
    },
    activeSidebarItem: { 
      background: 'rgba(255,255,255,0.1)',
      borderLeft: '3px solid #1890ff',
      fontWeight: '600',
    },
    content: {
      marginLeft: sidebarOpen ? '250px' : '0',
      padding: '20px',
      transition: 'margin-left 0.3s',
      width: '100%',
      minHeight: '100vh',
      overflowY: 'auto',
      background: 'linear-gradient(to bottom right, #f0f2f5, #e6e9ed)',
      boxSizing: 'border-box',
    },
    burger: {
      fontSize: '24px',
      marginRight: '20px',
      cursor: 'pointer',
      color: '#fff',
      position: 'fixed',
      left: '10px',
      top: '15px',
      zIndex: 30,
      display: window.innerWidth <= 768 ? 'block' : 'none',
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
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
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
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      gap: '10px',
      flexWrap: 'wrap',
      background: 'white',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
      border: '1px solid #d9d9d9',
      borderRadius: '4px'
    },
    monthSelector: {
      padding: '5px',
      fontSize: '14px',
      width: '100px',
      border: '1px solid #d9d9d9',
      borderRadius: '4px'
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
    userControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    profileBadge: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: 'linear-gradient(to bottom right, #1890ff, #0050b3)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      userSelect: 'none',
      cursor: 'pointer',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    logoutButton: {
      background: 'linear-gradient(to bottom right, #ff4d4f, #cf1322)',
      color: '#fff',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      fontSize: '14px',
      transition: 'all 0.3s',
      ':hover': {
        opacity: 0.9,
      },
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    dropdownIcon: {
      transition: 'transform 0.3s',
      fontSize: '12px'
    },
    mobileMenuButton: {
      position: 'fixed',
      left: '10px',
      top: '15px',
      zIndex: 30,
      fontSize: '24px',
      cursor: 'pointer',
      color: '#003366',
      display: window.innerWidth <= 768 ? 'block' : 'none',
      background: 'white',
      borderRadius: '4px',
      padding: '5px 10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    timePeriodText: {
      fontSize: '14px',
      color: '#666',
      marginTop: '5px',
      fontStyle: 'italic'
    }
  };

  const linkStyle = (name) => ({ isActive }) => ({
    ...styles.sidebarItem,
    ...(isActive ? styles.activeSidebarItem : {}),
    ...(hoveredItem === name ? styles.hoverEffect : {}),
  });

  return (
    <div style={styles.container}>
      {/* Mobile menu button */}
      {window.innerWidth <= 768 && (
        <div 
          style={styles.mobileMenuButton}
          onClick={toggleSidebar}
        >
          ☰
        </div>
      )}

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader} onClick={() => {
          navigate('/admin-dashboard');
          handleMenuItemClick();
        }}>
          GLOBAL MARKETING SOLUTIONS
        </div>
        
        {/* GENERAL Section */}
        <div style={styles.sidebarSection}>
          <div 
            style={styles.sidebarSectionTitle}
            onClick={() => toggleSection('general')}
          >
          Dashboard
            <span style={{
              ...styles.dropdownIcon,
              transform: openSections.general ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
          {openSections.general && (
            <>
              <NavLink 
                to="/admin-dashboard" 
                style={linkStyle('dashboard')} 
                onMouseEnter={() => setHoveredItem('dashboard')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="price-list" 
                style={linkStyle('price-list')} 
                onMouseEnter={() => setHoveredItem('price-list')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Price List
              </NavLink>
              <NavLink 
                to="hour-reeport" 
                style={linkStyle('hour-reeport')} 
                onMouseEnter={() => setHoveredItem('hour-reeport')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                View Hour Report 
              </NavLink>
              <NavLink 
                to="Employees" 
                style={linkStyle('Employees')} 
                onMouseEnter={() => setHoveredItem('Employees')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Employees
              </NavLink>
              <NavLink 
                to="daily-report" 
                style={linkStyle('daily-report')} 
                onMouseEnter={() => setHoveredItem('daily-report')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Daily Report
              </NavLink>
            </>
          )}
        </div>

        {/* SALES Section */}
        <div style={styles.sidebarSection}>
          <div 
            style={styles.sidebarSectionTitle}
            onClick={() => toggleSection('sales')}
          >
            SALES
            <span style={{
              ...styles.dropdownIcon,
              transform: openSections.sales ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
          {openSections.sales && (
            <>
              <NavLink 
                to="executives-logins" 
                style={linkStyle('executives-logins')} 
                onMouseEnter={() => setHoveredItem('executives-logins')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Executive Login Time
              </NavLink>
              <NavLink 
                to="view-orders" 
                style={linkStyle('view-orders')} 
                onMouseEnter={() => setHoveredItem('view-orders')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
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
                onClick={handleMenuItemClick}
              >
                Add Employee
              </NavLink>
              <NavLink 
                to="performance" 
                style={linkStyle('performance')} 
                onMouseEnter={() => setHoveredItem('performance')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                View Performance
              </NavLink>
            </>
          )}
        </div>

        {/* SERVICES Section */}
        <div style={styles.sidebarSection}>
          <div 
            style={styles.sidebarSectionTitle}
            onClick={() => toggleSection('services')}
          >
            SERVICES
            <span style={{
              ...styles.dropdownIcon,
              transform: openSections.services ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
          {openSections.services && (
            <>
              <NavLink 
                to="assign-service" 
                style={linkStyle('assign-service')} 
                onMouseEnter={() => setHoveredItem('assign-service')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Assign Service
              </NavLink>
              <NavLink 
                to="service-update" 
                style={linkStyle('service-update')} 
                onMouseEnter={() => setHoveredItem('service-update')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Service Updates
              </NavLink>
              <NavLink 
                to="pending-payment" 
                style={linkStyle('pending-payment')} 
                onMouseEnter={() => setHoveredItem('pending-payment')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Pending Payment
              </NavLink>
              <NavLink 
                to="pending-service" 
                style={linkStyle('pending-service')} 
                onMouseEnter={() => setHoveredItem('pending-service')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Pending Service
              </NavLink>
              <NavLink 
                to="view-design" 
                style={linkStyle('view-design')} 
                onMouseEnter={() => setHoveredItem('view-design')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                View Design
              </NavLink>
               <NavLink
            to="design-report"
            style={linkStyle('design-report')}
            onMouseEnter={() => setHoveredItem('design-report')}
            onMouseLeave={() => setHoveredItem('')}
          >
          DesignReports
          </NavLink>
            </>
          )}
        </div>

        {/* CLIENTS Section */}
        <div style={styles.sidebarSection}>
          <div 
            style={styles.sidebarSectionTitle}
            onClick={() => toggleSection('clients')}
          >
            CLIENTS
            <span style={{
              ...styles.dropdownIcon,
              transform: openSections.clients ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
          {openSections.clients && (
            <>
              <NavLink 
                to="prospects" 
                style={linkStyle('prospects')} 
                onMouseEnter={() => setHoveredItem('prospects')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Create Prospects +
              </NavLink>
              <NavLink 
                to="appointments" 
                style={linkStyle('appointments')} 
                onMouseEnter={() => setHoveredItem('appointments')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Create Appointments +
              </NavLink>
              <NavLink 
                to="select-appointment" 
                style={linkStyle('select-appointment')} 
                onMouseEnter={() => setHoveredItem('select-appointment')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                View Appointments
              </NavLink>
              <NavLink 
                to="activity" 
                style={linkStyle('activity')} 
                onMouseEnter={() => setHoveredItem('activity')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Target
              </NavLink>
              <NavLink
                to="view-expenses"
                style={linkStyle('view-expenses')}
                onMouseEnter={() => setHoveredItem('view-expenses')}
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                View-Expenses
              </NavLink>
              <NavLink 
                to="ledger" 
                style={linkStyle('ledger')} 
                onMouseEnter={() => setHoveredItem('ledger')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Ledger
              </NavLink>
              <NavLink 
                to="inventory" 
                style={linkStyle('inventory')} 
                onMouseEnter={() => setHoveredItem('inventory')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Inventory
              </NavLink>
              <NavLink 
                to="view-prospective" 
                style={linkStyle('view-prospective')} 
                onMouseEnter={() => setHoveredItem('view-prospective')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                View Prospects
              </NavLink>
            </>
          )}
        </div>

        {/* EVENTS Section */}
        <div style={styles.sidebarSection}>
          <div 
            style={styles.sidebarSectionTitle}
            onClick={() => toggleSection('events')}
          >
            EVENTS
            <span style={{
              ...styles.dropdownIcon,
              transform: openSections.events ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ▼
            </span>
          </div>
          {openSections.events && (
            <>
              <NavLink 
                to="create-anniversary" 
                style={linkStyle('create-anniversary')} 
                onMouseEnter={() => setHoveredItem('create-anniversary')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Create-Anniversary
              </NavLink>
              <NavLink 
                to="anniversary-list" 
                style={linkStyle('anniversary-list')} 
                onMouseEnter={() => setHoveredItem('anniversary-list')} 
                onMouseLeave={() => setHoveredItem('')}
                onClick={handleMenuItemClick}
              >
                Anniversary-List
              </NavLink>
            </>
          )}
        </div>
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
                {/* Year and Month Selector with User Controls */}
                <div style={styles.yearSelectorWrapper}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label htmlFor="year-select" style={styles.yearSelectorLabel}>
                      Select Year:
                    </label>
                    <select
                      id="year-select"
                      value={year}
                      onChange={(e) => {
                        setYear(parseInt(e.target.value));
                        setSelectedMonth(null);
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
                  
                  <div style={styles.userControls}>
                    <div 
                      style={styles.profileBadge}
                      onClick={() => navigate('/admin-dashboard/profile')}
                    >
                      {(localStorage.getItem('userName') || 'A')
                        .split(' ')
                        .map((w) => w[0]?.toUpperCase())
                        .join('')}
                    </div>
                    <button
                      style={styles.logoutButton}
                      onClick={() => {
                        localStorage.clear();
                        window.location.replace('/');
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div>Loading dashboard data...</div>
                ) : !chartData ? (
                  <div>Error loading dashboard data.</div>
                ) : (
                  <div style={styles.dashboardCards}>
                    {/* Total Orders Bar Chart */}
                    <div style={styles.card}>
                      <div>Total Orders {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : '(Monthly)'}</div>
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
                                  navigate(`/admin-dashboard/view-orders?month=${elements[0].index + 1}&year=${year}`);
                                } else {
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
                            onClick: (event, elements) => {
                              if (elements.length > 0) {
                                const queryParams = selectedMonth !== null
                                  ? `?month=${selectedMonth + 1}&year=${year}`
                                  : '';
                                navigate(`/admin-dashboard/appointment-status${queryParams}`);
                              }
                            },
                          }}
                        />
                        <div
                          style={{
                            ...styles.clickableSection,
                            pointerEvents: appointments[1] > 0 ? 'auto' : 'none'
                          }}
                          onClick={() => {
                            if (appointments[1] > 0) {
                              const queryParams = selectedMonth !== null
                                ? `?month=${selectedMonth + 1}&year=${year}`
                                : '';
                              navigate(`/admin-dashboard/appointment-status${queryParams}`);
                            }
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
                            labels: ['New', 'Renewal', 'Agent', 'Renewal-Agent'],
                            datasets: [{
                              label: 'Client Types',
                              data: [
                                clientTypes.New || 0,
                                clientTypes.Renewal || 0,
                                clientTypes.Agent || 0,
                                clientTypes['Renewal-Agent'] || 0,
                              ],
                              backgroundColor: [
                                '#36A2EB',
                                '#4BC0C0',
                                '#FFCE56',
                                '#9966FF',
                              ],
                              borderColor: [
                                '#2a8fcc',
                                '#3ba8a8',
                                '#e6b949',
                                '#7d5bbe'
                              ],
                              borderWidth: 1
                            }],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
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
                                grid: { color: 'rgba(0,0,0,0.05)' }
                              },
                              x: {
                                grid: { display: false }
                              }
                            },
                            onClick: (event, elements) => {
                              if (elements.length > 0) {
                                const clientTypes = ['New', 'Renewal', 'Agent', 'Renewal-Agent'];
                                const selectedType = clientTypes[elements[0].index];

                                const queryParams = new URLSearchParams();
                                queryParams.append('clientType', selectedType);

                                if (selectedMonth !== null) {
                                  queryParams.append('month', selectedMonth + 1);
                                }
                                if (year) {
                                  queryParams.append('year', year);
                                }

                                navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
                              }
                            }
                          }}
                        />
                      </div>
                      <div style={styles.number}>
                        {(clientTypes.New || 0) +
                          (clientTypes.Renewal || 0) +
                          (clientTypes.Agent || 0) +
                          (clientTypes['Renewal-Agent'] || 0)}
                      </div>
                    </div>

                    {/* Agent Orders Chart */}
                    <div style={styles.card}>
                      <div>Agent Orders {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : '(Monthly)'}</div>
                      {loading ? (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          Loading agent data...
                        </div>
                      ) : (
                        <>
                          <div style={styles.chartContainer}>
                            <Bar
                              data={{
                                labels: selectedMonth !== null
                                  ? chartData?.weeklyAgentOrders?.map((_, i) => `Week ${i + 1}`) || 
                                    Array.from({ length: 5 }, (_, i) => `Week ${i + 1}`)
                                  : monthLabels,
                                datasets: [
                                  {
                                    label: 'Agent Orders',
                                    data: selectedMonth !== null
                                      ? chartData?.weeklyAgentOrders?.map(w => w?.count || 0) || 
                                        Array(5).fill(0)
                                      : safeArray(chartData?.agentOrdersByMonth || Array(12).fill(0)),
                                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                                    borderColor: 'rgba(255, 206, 86, 1)',
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
                                      label: (context) => `Agent Orders: ${context.raw}`
                                    }
                                  }
                                },
                                onClick: (_, elements) => {
                                  if (elements && elements.length > 0) {
                                    const queryParams = new URLSearchParams();
                                    queryParams.append('clientType', 'Agent');

                                    if (selectedMonth === null) {
                                      queryParams.append('month', elements[0].index + 1);
                                    } else {
                                      const weekNumber = elements[0].index + 1;
                                      queryParams.append('month', selectedMonth + 1);
                                      queryParams.append('week', weekNumber);
                                    }
                                    queryParams.append('year', year);

                                    navigate(`/admin-dashboard/view-orders?${queryParams.toString()}`);
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
                              ? (chartData?.weeklyAgentOrders?.reduce((sum, w) => sum + (w?.count || 0), 0) || 0)
                              : safeArray(chartData?.agentOrdersByMonth).reduce((a, b) => a + b, 0)}
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
                        </>
                      )}
                    </div>

                    {/* Prospective Clients Doughnut */}
                    <div style={styles.card}>
                      <div>Prospective Clients {getTimePeriodText()}</div>
                      <div style={styles.pieChart}>
                        {prospectiveData ? (
                          <Doughnut
                            data={{
                              labels: Object.keys(prospectiveData).filter(key => key !== 'timePeriod'),
                              datasets: [{
                                data: Object.entries(prospectiveData)
                                  .filter(([key]) => key !== 'timePeriod')
                                  .map(([, value]) => value),
                                backgroundColor: [
                                  '#FF6384',
                                  '#36A2EB',
                                  '#FFCE56',
                                  '#4BC0C0',
                                  '#9966FF',
                                ],
                              }],
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'right' },
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
                                  const status = Object.keys(prospectiveData).filter(key => key !== 'timePeriod')[index];
                                  const queryParams = new URLSearchParams();
                                  queryParams.append('status', status);
                                  
                                  if (year) queryParams.append('year', year);
                                  if (selectedMonth !== null) queryParams.append('month', selectedMonth + 1);
                                  
                                  navigate(`/admin-dashboard/view-prospective?${queryParams.toString()}`);
                                }
                              },
                            }}
                          />
                        ) : (
                          <div>Loading prospective data...</div>
                        )}
                      </div>
                      <div style={styles.number}>
                        {prospectiveData ? 
                          Object.entries(prospectiveData)
                            .filter(([key]) => key !== 'timePeriod')
                            .reduce((sum, [, value]) => sum + value, 0) 
                          : 0}
                      </div>
                      <div style={styles.timePeriodText}>
                        {prospectiveData?.timePeriod?.month 
                          ? `${monthLabels[prospectiveData.timePeriod.month - 1]} ${prospectiveData.timePeriod.year}`
                          : `Year ${prospectiveData?.timePeriod?.year || year}`}
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
  );
}

export default AdminDashboard;