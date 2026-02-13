import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ExecutiveDashboard from "../Executive/ExecutiveDashboard";
import ViewOrders from "../Admin/ViewOrders";
import Appointment from "../Executive/Appointment";
import OrderForm from "./OrderForm";
import Pricelist from "../Service/Pricelist";
import ViewAppointments from "../Executive/ViewAppointments";
import Prospective from "./Prospective";
import ViewProspective from "../Admin/Viewprospective";
import DigitalMarketingOrderForm from "../Executive/Digitalform";
import Record from "./Record";
import ViewRecord from "./ViewRecord";
import AutoLogout from "../mainpage/AutoLogout";
import PendingPayment from "../Admin/PendingPayment";
import "../Executive/order.css";
import TeleCRM from "./TeleCRM";
import WhatsAppDashboard from "../Admin/WhatsApp";
import { FaWhatsapp } from "react-icons/fa";

function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState("executive-dashboard");
  const [selectedExecutive] = useState(
    localStorage.getItem("userName") || "Executive"
  );

  const [targetData, setTargetData] = useState({
    target: 0,
    achieved: 0,
    formattedTarget: "₹0",
    formattedAchieved: "₹0",
  });

  const [loading, setLoading] = useState(true);
  const [orderNumber, setOrderNumber] = useState("");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [existingOrderData, setExistingOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedFormType, setSelectedFormType] = useState("order");
  const [showLogoutOptions, setShowLogoutOptions] = useState(false);
  const [activeDuration, setActiveDuration] = useState("00:00:00");
  const [isSessionActive, setIsSessionActive] = useState(true);
  const timerRef = useRef(null);
  
  // WhatsApp dashboard state
  const [showWhatsAppDashboard, setShowWhatsAppDashboard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Executive Summary Modal State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [dailySummary, setDailySummary] = useState({
    callsMade: 0,
    ordersClosed: 0,
    whatsappMessages: 0,
    appointments: 0,
    prospects: 0,
    totalSales: 0,
    pendingPaymentCount: 0,
    totalPendingAmount: 0,
    target: 0,
    achieved: 0,
    conversionRate: 0,
    averageOrderValue: 0,
    loading: true
  });
  
  const [pendingPaymentData, setPendingPaymentData] = useState({
    count: 0,
    amount: 0,
    loading: true
  });

  const userRole = localStorage.getItem("userRole") || "executive";
  const logoutRef = useRef(null);
  
  useEffect(() => {
    if (!localStorage.getItem('loginTime')) {
      localStorage.setItem('loginTime', new Date().toISOString());
    }
    updateDuration();
    timerRef.current = setInterval(updateDuration, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Fetch unread WhatsApp messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('/api/whatsapp/unread-count');
        setUnreadCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch daily executive summary - FIXED FOR TODAY'S DATA
  const fetchDailySummary = async () => {
    try {
      setDailySummary(prev => ({ ...prev, loading: true }));
      
      const today = new Date();
      // Set to beginning of today in local timezone
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const executiveName = selectedExecutive;
      const todayStr = today.toISOString().split('T')[0];
      
      // 1. Get performance records (calls, WhatsApp) for today
      let callsMade = 0;
      let whatsappMessages = 0;
      
      try {
        // Fetch today's performance record data using RecordForm API
        const recordResponse = await axios.get('/api/reports', {
          params: {
            executiveName: executiveName,
            date: todayStr
          }
        });
        
        if (recordResponse.data) {
          // If data is array, find today's record
          if (Array.isArray(recordResponse.data)) {
            const todayRecord = recordResponse.data.find(record => {
              const recordDate = new Date(record.date).toISOString().split('T')[0];
              return recordDate === todayStr;
            });
            
            if (todayRecord) {
              callsMade = parseInt(todayRecord.totalCalls) || 0;
              whatsappMessages = parseInt(todayRecord.whatsapp) || 0;
            }
          } else if (recordResponse.data.totalCalls !== undefined) {
            // If data is object (single record)
            callsMade = parseInt(recordResponse.data.totalCalls) || 0;
            whatsappMessages = parseInt(recordResponse.data.whatsapp) || 0;
          }
        }
      } catch (recordError) {
        console.error('Error fetching performance records:', recordError);
        // Try alternative endpoint for today's data
        try {
          const altResponse = await axios.get(`/api/reports/today?executive=${executiveName}`);
          if (altResponse.data) {
            callsMade = parseInt(altResponse.data.totalCalls) || 0;
            whatsappMessages = parseInt(altResponse.data.whatsapp) || 0;
          }
        } catch (altError) {
          console.error('Alternative API also failed:', altError);
        }
      }
      
      // 2. Get orders closed today
      let ordersClosed = 0;
      let totalSales = 0;
      
      try {
        // Use today's date range for orders
        const ordersResponse = await axios.get('/api/orders', {
          params: {
            executive: executiveName,
            startDate: todayStart.toISOString(),
            endDate: tomorrow.toISOString()
          }
        });
        
        const ordersToday = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
        ordersClosed = ordersToday.length;
        
        // Calculate total sales from orders
        totalSales = ordersToday.reduce((sum, order) => {
          return sum + (order.totalAmount || order.total || 0);
        }, 0);
        
      } catch (orderError) {
        console.error('Error fetching orders:', orderError);
        // Fallback: Try alternative approach
        try {
          const fallbackResponse = await axios.get(`/api/executive/${executiveName}`);
          const fallbackData = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];
          
          // Filter today's orders using local date comparison
          const todayFormatted = today.toLocaleDateString('en-IN');
          const todayOrders = fallbackData.filter(order => {
            const orderDate = new Date(order.orderDate || order.createdAt);
            return orderDate.toLocaleDateString('en-IN') === todayFormatted;
          });
          
          ordersClosed = todayOrders.length;
          totalSales = todayOrders.reduce((sum, order) => {
            return sum + (order.totalAmount || order.total || 0);
          }, 0);
          
        } catch (fallbackError) {
          console.error('Fallback order fetch error:', fallbackError);
        }
      }
      
      // 3. Calculate pending payments for today
      let pendingPaymentCount = 0;
      let totalPendingAmount = 0;
      
      try {
        const pendingResponse = await axios.get('/api/orders/pending-payments');
        const pendingOrders = Array.isArray(pendingResponse.data) ? pendingResponse.data : [];
        
        // Filter by executive and today's orders
        const executivePending = pendingOrders.filter(order => 
          order?.executive?.toLowerCase() === executiveName.toLowerCase() && 
          order?.balance > 0
        );
        
        pendingPaymentCount = executivePending.length;
        totalPendingAmount = executivePending.reduce((sum, order) => sum + (order?.balance || 0), 0);
        
      } catch (pendingError) {
        console.error('Error fetching pending payments:', pendingError);
      }
      
      // 4. Get target data
      let target = 0;
      let achieved = 0;
      
      try {
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        
        const targetResponse = await axios.get(`/api/get-target/${executiveName}/${currentMonth}/${currentYear}`);
        target = targetResponse.data?.target || 0;
        
        // Calculate achieved amount
        achieved = totalSales;
        
      } catch (targetError) {
        console.error('Error fetching target:', targetError);
      }
      
      // 5. Get prospects for today
      let prospects = 0;
      
      try {
        // Use today's date for prospects
        const prospectsResponse = await axios.get('/api/prospects', {
          params: {
            executiveName: executiveName,
            date: todayStr
          }
        });
        
        if (Array.isArray(prospectsResponse.data)) {
          prospects = prospectsResponse.data.length;
        }
      } catch (prospectsError) {
        console.error('Error fetching prospects:', prospectsError);
        // Try alternative endpoint
        try {
          const altProspectsResponse = await axios.get(`/api/prospects/today?executive=${executiveName}`);
          if (Array.isArray(altProspectsResponse.data)) {
            prospects = altProspectsResponse.data.length;
          } else if (altProspectsResponse.data) {
            prospects = 1; // Single prospect object
          }
        } catch (altError) {
          console.error('Alternative prospect API failed:', altError);
        }
      }
      
      // 6. Calculate conversion rate
      const conversionRate = callsMade > 0 ? Math.round((ordersClosed / callsMade) * 100) : 0;
      
      // 7. Calculate average order value
      const averageOrderValue = ordersClosed > 0 ? Math.round(totalSales / ordersClosed) : 0;
      
      setDailySummary({
        callsMade,
        ordersClosed,
        whatsappMessages,
        appointments: 0,
        prospects,
        totalSales,
        pendingPaymentCount,
        totalPendingAmount,
        target,
        achieved,
        conversionRate,
        averageOrderValue,
        loading: false
      });
      
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      setDailySummary(prev => ({ 
        ...prev, 
        loading: false,
        ordersClosed: 0,
        totalSales: 0,
        prospects: 0
      }));
    }
  };

  const fetchPendingPayments = async () => {
    try {
      setPendingPaymentData(prev => ({ ...prev, loading: true }));
      const res = await axios.get('/api/orders', {
        params: {
          _: new Date().getTime()
        }
      });
      
      const executivePendingOrders = res.data.filter(order => 
        order?.executive?.toLowerCase() === selectedExecutive.toLowerCase() && 
        order?.balance > 0
      );
      
      const totalPendingAmount = executivePendingOrders.reduce((sum, order) => sum + (order?.balance || 0), 0);
      
      setPendingPaymentData({
        count: executivePendingOrders.length,
        amount: totalPendingAmount,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      setPendingPaymentData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (selectedExecutive) {
      fetchPendingPayments();
      const interval = setInterval(fetchPendingPayments, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedExecutive]);

  useEffect(() => {
    const saleClosedData = localStorage.getItem('saleClosedAppointmentData');
    if (saleClosedData) {
      try {
        const appointmentData = JSON.parse(saleClosedData);
        setExistingOrderData(appointmentData);
        setShowOrderForm(true);
        setActiveTab('order');
        
        if (appointmentData.phoneNumber) {
          setOrderNumber(appointmentData.phoneNumber);
        }

        localStorage.removeItem('saleClosedAppointmentData');
      } catch (error) {
        console.error('Error parsing appointment data:', error);
      }
    }
  }, []);

  const updateDuration = () => {
    const storedTime = localStorage.getItem('loginTime');
    if (!storedTime) return;

    const loginTime = new Date(storedTime);
    const now = new Date();
    const diff = now - loginTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
    
    setActiveDuration(`${hours}:${minutes}:${seconds}`);
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveDuration("00:00:00");
    localStorage.removeItem('loginTime');
  };

  // Handle activity selection from dropdown
  const handleActivitySelection = async (activity) => {
    try {
      // Stop the timer for any selection
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Disable AutoLogout by marking session as inactive
      setIsSessionActive(false);

      // Send activity to server
      const userName = localStorage.getItem("userName");
      const userRole = localStorage.getItem("userRole");
      
      await axios.post("/api/log-activity", {
        username: userName,
        role: userRole,
        activityType: activity === "Logout" ? "logout" : "break",
        reason: activity,
        loginTime: localStorage.getItem('loginTime'),
        duration: activeDuration
      });

      // For logout only, show summary and then logout
      if (activity === "Logout") {
        // Fetch daily summary before logout
        await fetchDailySummary();
        // Show summary modal
        setShowSummaryModal(true);
      }
    } catch (error) {
      console.error("Error during activity selection:", error);
      if (activity === "Logout") {
        // Still show summary even if fetch fails
        setShowSummaryModal(true);
      }
    }
  };

  // Handle final logout after viewing summary
  const handleFinalLogout = () => {
    resetTimer();
    localStorage.clear();
    setShowSummaryModal(false);
    window.location.href = "/";
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close logout dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target)) {
        setShowLogoutOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch target data
  useEffect(() => {
    const fetchTargetData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/executive/${selectedExecutive}`);
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
        setLoading(false);
      }
    };

    if (selectedExecutive) {
      fetchTargetData();
      const interval = setInterval(fetchTargetData, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedExecutive]);

  // Get profile initials
  const getProfileInitials = (name) =>
    name
      .split(" ")
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");

  // Calculate target percentage
  const targetPercentage =
    targetData.target > 0
      ? Math.min(
          100,
          Math.round((targetData.achieved / targetData.target) * 100)
        )
      : 0;

  // Handle search
  const handleSearch = async () => {
    if (orderNumber.length !== 10) {
      setSearchError("Please enter exactly 10 digits");
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      if (selectedFormType === "order") {
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
        setShowOrderForm(true);
        setExistingOrderData(null);
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status === 404 &&
        selectedFormType === "order"
      ) {
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

  // Get progress gradient color
  const getProgressGradient = (percentage) => {
    if (percentage <= 30) return "linear-gradient(to right, #ff4e50, #ff0000)";
    if (percentage <= 50) return "linear-gradient(to right, #ffa751, #ff6a00)";
    if (percentage <= 80)
      return "linear-gradient(to right, rgb(32, 210, 118), rgb(111, 192, 141))";
    return "linear-gradient(to right, rgb(16, 231, 34), rgb(11, 222, 25))";
  };

  // Get blink class for progress
  const getBlinkClass = (percentage) => {
    return percentage < 100 ? "blink-progress" : "";
  };

  // Handle pending payment click
  const handlePendingPaymentClick = () => {
    setActiveTab("pending-payments");
  };

  // Add styles for WhatsApp button and Summary Modal
  const styles = {
    whatsappButton: {
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      width: '60px',
      height: '60px',
      backgroundColor: '#25D366',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      border: 'none',
    },
    whatsappIcon: {
      fontSize: '32px',
      color: 'white',
    },
    unreadBadge: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      backgroundColor: '#FF3B30',
      color: 'white',
      borderRadius: '50%',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 'bold',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    },
    // Ultra Compact Summary Modal Styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '400px',
      width: '100%',
      color: '#333',
      boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
    },
    modalHeader: {
      textAlign: 'center',
      marginBottom: '15px',
      paddingBottom: '10px',
      borderBottom: '1px solid #e0e0e0',
    },
    modalTitle: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '3px',
      color: '#2c3e50',
    },
    modalSubtitle: {
      fontSize: '11px',
      color: '#7f8c8d',
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '10px',
      marginBottom: '15px',
    },
    metricItem: {
      textAlign: 'center',
    },
    metricIcon: {
      fontSize: '14px',
      marginBottom: '3px',
    },
    metricValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2c3e50',
      lineHeight: '1.2',
    },
    metricLabel: {
      fontSize: '10px',
      color: '#7f8c8d',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
    },
    salesBox: {
      backgroundColor: '#f8f9fa',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '15px',
      textAlign: 'center',
      border: '1px solid #e9ecef',
    },
    salesAmount: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#27ae60',
      margin: '3px 0',
    },
    salesLabel: {
      fontSize: '12px',
      color: '#7f8c8d',
      fontWeight: '500',
    },
    logoutButton: {
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      padding: '10px',
      fontSize: '13px',
      borderRadius: '5px',
      cursor: 'pointer',
      width: '100%',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    loadingSpinner: {
      textAlign: 'center',
      padding: '20px',
    },
  };

  // Add CSS for the modal
  const modalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .modal-animation {
      animation: fadeIn 0.15s ease-out;
    }
  `;

  return (
    <div className="app-container">
      {isSessionActive && <AutoLogout />}
      
      {/* Add modal styles */}
      <style>{modalStyles}</style>
      
      {/* Executive Summary Modal - Ultra Compact Version */}
      {showSummaryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="modal-animation">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Daily Summary</h2>
              <p style={styles.modalSubtitle}>{selectedExecutive} • {new Date().toLocaleDateString('en-IN', { 
                day: 'numeric',
                month: 'short'
              })} • TODAY</p>
            </div>
            
            {dailySummary.loading ? (
              <div style={styles.loadingSpinner}>
                <div className="spinner-border text-primary" style={{ width: '16px', height: '16px' }} role="status"></div>
                <p style={{ marginTop: '10px', color: '#95a5a6', fontSize: '11px' }}>Loading...</p>
              </div>
            ) : (
              <>
                <div style={styles.metricsGrid}>
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#3498db'}}>📞</div>
                    <div style={styles.metricValue}>{dailySummary.callsMade}</div>
                    <div style={styles.metricLabel}>Calls</div>
                  </div>
                  
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#25D366'}}>💬</div>
                    <div style={styles.metricValue}>{dailySummary.whatsappMessages}</div>
                    <div style={styles.metricLabel}>WhatsApp</div>
                  </div>
                  
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#2ecc71'}}>💰</div>
                    <div style={styles.metricValue}>{dailySummary.ordersClosed}</div>
                    <div style={styles.metricLabel}>Orders</div>
                  </div>
                  
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#e74c3c'}}>👥</div>
                    <div style={styles.metricValue}>{dailySummary.prospects}</div>
                    <div style={styles.metricLabel}>Prospects</div>
                  </div>
                </div>
                
                <div style={styles.salesBox}>
                  <div style={styles.salesLabel}>Today's Sales</div>
                  <div style={styles.salesAmount}>
                    ₹{dailySummary.totalSales.toLocaleString('en-IN')}
                  </div>
                </div>
                
                <button 
                  onClick={handleFinalLogout}
                  style={styles.logoutButton}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Navbar */}
      <div className="navbar">
        <button
          className="toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        
        <h1
          className="navbar-title"
          style={{
            background: "linear-gradient(to right, #4facfe, #00f2fe)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome {selectedExecutive}
        </h1>

        <div className="navbar-right">
          {/* Professional Session Timer Card */}
          <div className="session-timer-card">
            <div className="timer-icon-container">
              <svg className="timer-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z" />
              </svg>
            </div>
            <div className="timer-content">
              <div className="timer-label">Active Session</div>
              <div className="timer-value">{activeDuration}</div>
            </div>
          </div>

          {/* Pending Payment Notification */}
          {pendingPaymentData.count > 0 && (
            <div 
              className="pending-payment-notification"
              onClick={handlePendingPaymentClick}
              style={{
                backgroundColor: '#e74c3c',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginRight: '15px',
                boxShadow: '0 2px 4px rgba(231, 76, 60, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#c0392b';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#e74c3c';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <span>⚠️</span>
              <span>
                {selectedExecutive}, you have {pendingPaymentData.count} pending payments
                <br />
                <small>Total: ₹{pendingPaymentData.amount.toLocaleString()}</small>
              </span>
            </div>
          )}

          <div
            className="target-display blink"
            title={`${targetPercentage}% achieved (${targetData.formattedAchieved} / ${targetData.formattedTarget})`}
          >
            <div className="target-header">
              <span className="target-icon">🎯 Target:</span>
            </div>
            <div className="target-progress-container">
              <span className="target-text">
                {loading
                  ? "Loading..."
                  : `${targetData.formattedAchieved} / ${targetData.formattedTarget}`}
              </span>
              <div className="progress-bar">
                {!loading && (
                  <div
                    className={`progress-fill ${getBlinkClass(
                      targetPercentage
                    )}`}
                    style={{
                      width: `${targetPercentage}%`,
                      backgroundImage: getProgressGradient(targetPercentage),
                    }}
                  ></div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-icon" title={selectedExecutive}>
            <span className="profile-icon-symbol">
              {getProfileInitials(selectedExecutive)}
            </span>
          </div>

          <div ref={logoutRef} className="logout-container">
            <button 
              className="logout-btn" 
              onClick={() => setShowLogoutOptions(!showLogoutOptions)}
            >
              Logout
            </button>
            {showLogoutOptions && (
              <div className="logout-options-dropdown">
                <button onClick={() => handleActivitySelection("Short Break")}>
                  Short Break
                </button>
                <button onClick={() => handleActivitySelection("Team Meeting")}>
                  Team Meeting
                </button>
                <button onClick={() => handleActivitySelection("Client Meeting")}>
                  Client Meeting
                </button>
                <button onClick={() => handleActivitySelection("Lunch Break")}>
                  Lunch Break
                </button>
                <button onClick={() => handleActivitySelection("Logout")}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-content">
          <div className="nav-menu">
            {[
              { key: "executive-dashboard", icon: "🏠", text: "Dashboard" },
              { key: "record", icon: "📊", text: "Performance Record" },
              { key: "viewRecord", icon: "📈", text: "View Records" }, 
              { key: "order", icon: "📝", text: "Create Order ➕" },
              { key: "viewOrders", icon: "📋", text: "View Orders" },
              { key: "appointment", icon: "📅", text: "Create Appointment ➕" },
              { key: "viewAppointments", icon: "📂", text: "View Appointments" },
              { key: "prospective", icon: "🔍", text: "Create Prospects ➕" },
              { key: "viewProspects", icon: "👁️", text: "View Prospects" },
              { key: "price-list", icon: "💰", text: "Price List" },
              { key: "pending-payments", icon: "💰", text: "Pending Payments" },
              { key: "tele", icon: "📞", text: "Tele-CRM" },
            ].map(({ key, icon, text }) => (
              <div
                key={key}
                className={`nav-item ${activeTab === key ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(key);
                  if (key === "order") {
                    setShowOrderForm(false);
                    setOrderNumber("");
                  }
                }}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-text">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? "" : "expanded"}`}>
        <div className="form-container">
          {activeTab === "executive-dashboard" && (
            <>
              <ExecutiveDashboard />
            </>
          )}

          {activeTab === "record" && <Record />}
          {activeTab === "tele" && <TeleCRM />}
          {activeTab === "appointment" && <Appointment />}
          {activeTab === "viewOrders" && <ViewOrders userRole={userRole} />}
          {activeTab === "price-list" && <Pricelist />}
          {activeTab === "viewAppointments" && <ViewAppointments />}
          {activeTab === "prospective" && <Prospective />}
          {activeTab === "viewProspects" && <ViewProspective />}
          {activeTab === "viewRecord" && <ViewRecord />}
          {activeTab === "pending-payments" && (
            <PendingPayment executiveFilter={selectedExecutive} />
          )}

          {activeTab === "order" && !showOrderForm && (
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

                <div className="form-type-selector">
                  <label>
                    <input
                      type="radio"
                      name="formType"
                      value="order"
                      checked={selectedFormType === "order"}
                      onChange={() => setSelectedFormType("order")}
                    />
                    Order Form
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="formType"
                      value="Digitalform"
                      checked={selectedFormType === "Digitalform"}
                      onChange={() => setSelectedFormType("Digitalform")}
                    />
                    Digital Marketing Form
                  </label>
                </div>

                {searchError && (
                  <div className="error-message">{searchError}</div>
                )}
                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  className="search-button"
                >
                  {isLoading
                    ? "Searching..."
                    : selectedFormType === "order"
                    ? "Search Orders"
                    : "Create Digital Order"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "order" &&
            showOrderForm &&
            selectedFormType === "order" && (
              <OrderForm
                orderNumber={orderNumber}
                existingData={existingOrderData}
                onNewOrder={() => setExistingOrderData(null)}
                onBack={() => setShowOrderForm(false)}
                onSuccess={() => {
                  setActiveTab("executive-dashboard");
                  setShowOrderForm(false);
                }}
              />
            )}

          {activeTab === "order" &&
            showOrderForm &&
            selectedFormType === "Digitalform" && (
              <div>
                <button
                  onClick={() => setShowOrderForm(false)}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    marginBottom: "20px",
                  }}
                >
                  Back
                </button>
                <DigitalMarketingOrderForm />
              </div>
            )}
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <button
        style={styles.whatsappButton}
        onClick={() => setShowWhatsAppDashboard(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.4)';
        }}
      >
        <FaWhatsapp style={styles.whatsappIcon} />
        {unreadCount > 0 && (
          <div style={styles.unreadBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* WhatsApp Dashboard Modal */}
      {showWhatsAppDashboard && (
        <WhatsAppDashboard
          onClose={() => setShowWhatsAppDashboard(false)}
          unreadCount={unreadCount}
          onMarkAsRead={() => setUnreadCount(0)}
        />
      )}
    </div>
  );
}

export default Admin;