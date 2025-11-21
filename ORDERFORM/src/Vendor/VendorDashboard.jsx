import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import AutoLogout from "../mainpage/AutoLogout";
import axios from 'axios';

function VendorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [hoveredItem, setHoveredItem] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [vendorData, setVendorData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Vendor categories mapping
  const vendorCategories = [
    { id: 'mobile-vans', name: 'Mobile Vans' },
    { id: 'try-cycles', name: 'Try Cycles' },
    { id: 'digital-wall', name: 'Digital Wall Pasting' },
    { id: 'pole-boards', name: 'Pole Boards Installation' },
    { id: 'rounds', name: 'Rounds' },
  ];

  // Fetch vendor data for logged-in vendor
  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setIsLoading(true);
        const vendorPhone = localStorage.getItem('vendorPhone') || localStorage.getItem('userPhone') || localStorage.getItem('userName');
        
        if (!vendorPhone) {
          setError('No vendor identification found. Please login again.');
          setIsLoading(false);
          return;
        }

        // Search vendors by phone number
        const response = await axios.get('http://localhost:5000/api/vendors');
        const vendor = response.data.find(v => 
          v.contact === vendorPhone || 
          v.name === vendorPhone ||
          v.contact.includes(vendorPhone)
        );

        if (vendor) {
          setVendorData(vendor);
          // Store vendor ID for future use
          localStorage.setItem('vendorId', vendor._id);
          setError('');
        } else {
          setError('Vendor profile not found. Please contact administrator.');
        }

      } catch (err) {
        setError('Failed to fetch vendor data. Please try again later.');
        console.error('Error fetching vendor data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorData();
  }, []);

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
    vendorDetailsCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      padding: '30px',
      margin: '20px auto',
      maxWidth: '800px',
    },
    vendorHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      borderBottom: '2px solid #003366',
      paddingBottom: '15px',
    },
    vendorTitle: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#003366',
      margin: 0,
    },
    vendorCategory: {
      fontSize: '16px',
      color: '#666',
      backgroundColor: '#e6f3ff',
      padding: '8px 15px',
      borderRadius: '20px',
      fontWeight: '500',
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
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '12px',
    },
    detailLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#666',
      marginBottom: '5px',
    },
    detailValue: {
      fontSize: '16px',
      color: '#333',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: '1px solid #e9ecef',
    },
    amountDisplay: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#2E8B57',
    },
    ratingDisplay: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#FFA500',
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

  // Only show dashboard cards when on the exact vendor-dashboard path
  const showDashboardCards = location.pathname === '/vendor-dashboard' && 
                           !location.pathname.endsWith('/vendor-dashboard/');

  // Responsive sidebar effect
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render vendor details similar to admin view
  const renderVendorDetails = () => {
    if (!vendorData) return null;

    return (
      <div style={styles.vendorDetailsCard}>
        <div style={styles.vendorHeader}>
          <h1 style={styles.vendorTitle}>{vendorData.name}</h1>
          <div style={styles.vendorCategory}>
            {vendorCategories.find(c => c.id === vendorData.category)?.name || vendorData.category}
          </div>
        </div>

        {/* Basic Information Section */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>Basic Information</h3>
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Contact Number</span>
              <span style={styles.detailValue}>{vendorData.contact}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Location</span>
              <span style={styles.detailValue}>{vendorData.location}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Service Amount</span>
              <span style={{...styles.detailValue, ...styles.amountDisplay}}>
                ₹{vendorData.amount}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Available From</span>
              <span style={styles.detailValue}>
                {new Date(vendorData.availability).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Service Details Section */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>Service Details</h3>
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Address</span>
              <span style={styles.detailValue}>
                {vendorData.details?.address || 'Not provided'}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Services Offered</span>
              <span style={styles.detailValue}>
                {vendorData.details?.services || 'Not provided'}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Rating</span>
              <span style={{...styles.detailValue, ...styles.ratingDisplay}}>
                {vendorData.details?.rating || '0'}/5
              </span>
            </div>
          </div>
        </div>

        {/* Additional Notes Section */}
        {vendorData.details?.notes && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>Additional Notes</h3>
            <div style={styles.detailItem}>
              <span style={styles.detailValue}>
                {vendorData.details.notes}
              </span>
            </div>
          </div>
        )}
      </div>
    );
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
            {(vendorData?.name?.charAt(0) || localStorage.getItem('userName') || 'V').toUpperCase()}
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
            end
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
          {isLoading ? (
            <div style={styles.loadingText}>Loading your vendor profile...</div>
          ) : error ? (
            <div style={styles.errorText}>{error}</div>
          ) : showDashboardCards ? (
            <>
              {/* Vendor Details Card - Only shows vendor profile */}
              {renderVendorDetails()}
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