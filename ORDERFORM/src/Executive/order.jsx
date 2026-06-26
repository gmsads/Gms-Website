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
import { FaBars, FaTimes } from "react-icons/fa";
import LeaveRequest from './LeaveRequest';
import ViewRequest from './ViewLeaveRequests';
import Parties from "../Admin/Parties";
import Quotation from "../Admin/Quotation";
import GMSLogo from '../assets/GMS_LOGO_.png';

function Admin() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState("executive-dashboard");
  const [selectedExecutive] = useState(
    localStorage.getItem("userName") || "Executive"
  );
  const [userRole] = useState(localStorage.getItem("userRole") || "executive");

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
  
  const [showWhatsAppDashboard, setShowWhatsAppDashboard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [dailySummary, setDailySummary] = useState({
    callsMade: 0,
    followUps: 0,
    whatsappMessages: 0,
    ordersClosed: 0,
    totalSales: 0,
    visits: 0,
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

  const logoutRef = useRef(null);
  
  const userRoleLower = (userRole || "").toLowerCase();
  const executiveNameLower = (selectedExecutive || "").toLowerCase();
  
  const isFieldExecutive = 
    userRoleLower === 'field' ||
    userRoleLower === 'fieldexecutive' ||
    userRoleLower === 'field-executive' ||
    userRoleLower === 'field executive' ||
    userRoleLower.includes('field') ||
    executiveNameLower.includes('field') ||
    executiveNameLower.includes('fieldexecutive') ||
    executiveNameLower.includes('field-executive') ||
    executiveNameLower.includes('field executive') ||
    localStorage.getItem('userType') === 'field' ||
    false;
  
  const isWithinRestrictedHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = (currentHour * 60) + currentMinute;
    
    const startTimeInMinutes = (17 * 60) + 30;
    const endTimeInMinutes = (19 * 60) + 0;
    
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  };
  
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

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('/api/whatsapp/unread-count', {
          params: {
            executive: selectedExecutive
          }
        });
        setUnreadCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [selectedExecutive]);

  const fetchDailySummary = async () => {
    try {
      setDailySummary(prev => ({ ...prev, loading: true }));
      
      const executiveName = selectedExecutive;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      let callsMade = 0;
      let followUps = 0;
      let whatsappFromReports = 0;
      
      try {
        const response = await axios.get('/api/reports/executive-records', {
          params: {
            executive: executiveName
          }
        });
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          const todayRecord = response.data.find(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === todayStr;
          });
          
          if (todayRecord) {
            callsMade = parseInt(todayRecord.totalCalls) || 0;
            followUps = parseInt(todayRecord.followUps) || 0;
            whatsappFromReports = parseInt(todayRecord.whatsapp) || 0;
          }
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
        
        try {
          const allReports = JSON.parse(localStorage.getItem('dailyReports') || '[]');
          const todayReport = allReports.find(report => 
            report.executiveName === executiveName && 
            report.date === todayStr
          );
          
          if (todayReport) {
            callsMade = parseInt(todayReport.totalCalls) || 0;
            followUps = parseInt(todayReport.followUps) || 0;
            whatsappFromReports = parseInt(todayReport.whatsapp) || 0;
          }
        } catch (localError) {
          console.error('Error reading from localStorage:', localError);
        }
      }
      
      let ordersClosed = 0;
      let totalSales = 0;
      
      try {
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const ordersResponse = await axios.get('/api/orders', {
          params: {
            executive: executiveName,
            _: new Date().getTime()
          }
        });
        
        const ordersToday = Array.isArray(ordersResponse.data) ? ordersResponse.data.filter(order => {
          if (!order.orderDate) return false;
          const orderDate = new Date(order.orderDate);
          return orderDate >= todayStart && orderDate < tomorrow;
        }) : [];
        
        ordersClosed = ordersToday.length;
        
        totalSales = ordersToday.reduce((sum, order) => {
          let orderTotal = order.totalAmount || 0;
          if (orderTotal === 0 && order.rows && Array.isArray(order.rows)) {
            orderTotal = order.rows.reduce((rowSum, row) => {
              return rowSum + (parseFloat(row.total) || 0);
            }, 0);
          }
          return sum + orderTotal;
        }, 0);
        
      } catch (orderError) {
        console.error('Error fetching orders:', orderError);
      }
      
      let whatsappMessages = whatsappFromReports;
      
      try {
        const whatsappResponse = await axios.get('/api/whatsapp/today', {
          params: { executive: executiveName }
        }).catch(() => ({ data: { count: 0 } }));
        whatsappMessages += (whatsappResponse.data?.count || 0);
      } catch (whatsappError) {
        console.log('WhatsApp API not available');
      }
      
      let visits = 0;
      
      try {
        const todayVisitsKey = `fieldVisits_${executiveName}_${todayStr}`;
        const todayVisitsData = localStorage.getItem(todayVisitsKey);
        
        if (todayVisitsData) {
          try {
            const parsedVisits = JSON.parse(todayVisitsData);
            if (Array.isArray(parsedVisits)) {
              visits = parsedVisits.length;
            }
          } catch (e) {
            console.error('Error parsing todayVisitsData:', e);
          }
        }
        
        if (visits === 0) {
          const storedData = localStorage.getItem('fieldExecutiveData');
          if (storedData) {
            try {
              const fieldData = JSON.parse(storedData);
              if (fieldData.activities && Array.isArray(fieldData.activities)) {
                const todayVisits = fieldData.activities.filter(activity => {
                  if (!activity || !activity.date) return false;
                  let activityDateStr = new Date(activity.date).toISOString().split('T')[0];
                  const matchesExecutive = !activity.executive || activity.executive === executiveName || activity.executiveName === executiveName;
                  return activityDateStr === todayStr && matchesExecutive;
                });
                visits = todayVisits.length;
              }
            } catch (e) {
              console.error('Error parsing field data:', e);
            }
          }
        }
      } catch (storageError) {
        console.error('Error reading from localStorage:', storageError);
      }
      
      let pendingPaymentCount = 0;
      let totalPendingAmount = 0;
      try {
        const pendingResponse = await axios.get('/api/orders/pending-payments');
        const pendingOrders = Array.isArray(pendingResponse.data) ? pendingResponse.data : [];
        const executivePending = pendingOrders.filter(order => 
          order?.executive?.toLowerCase() === executiveName.toLowerCase() && order?.balance > 0
        );
        pendingPaymentCount = executivePending.length;
        totalPendingAmount = executivePending.reduce((sum, order) => sum + (order?.balance || 0), 0);
      } catch (pendingError) {
        console.error('Error fetching pending payments:', pendingError);
      }
      
      let target = 0;
      let achieved = totalSales;
      try {
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const targetResponse = await axios.get(`/api/get-target/${executiveName}/${currentMonth}/${currentYear}`);
        target = targetResponse.data?.target || 0;
      } catch (targetError) {
        console.error('Error fetching target:', targetError);
      }
      
      const conversionRate = callsMade > 0 ? Math.round((ordersClosed / callsMade) * 100) : 0;
      const averageOrderValue = ordersClosed > 0 ? Math.round(totalSales / ordersClosed) : 0;
      
      setDailySummary({
        callsMade: callsMade,
        followUps: followUps,
        whatsappMessages: whatsappMessages,
        ordersClosed: ordersClosed,
        totalSales: totalSales,
        pendingPaymentCount: pendingPaymentCount,
        totalPendingAmount: totalPendingAmount,
        target: target,
        achieved: achieved,
        conversionRate: conversionRate,
        averageOrderValue: averageOrderValue,
        visits: visits,
        loading: false
      });
      
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      setDailySummary(prev => ({ 
        ...prev, 
        loading: false,
        visits: 0,
        totalSales: 0,
        ordersClosed: 0
      }));
    }
  };

  const hasFilledTodayReport = async () => {
    const executiveName = selectedExecutive;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    try {
      const response = await axios.get('/api/reports/executive-records', {
        params: {
          executive: executiveName
        }
      });
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        const todayRecord = response.data.find(record => {
          const recordDate = new Date(record.date).toISOString().split('T')[0];
          return recordDate === todayStr;
        });
        
        if (todayRecord && (todayRecord.totalCalls > 0 || todayRecord.followUps > 0 || todayRecord.whatsapp > 0)) {
          return true;
        }
      }
    } catch (apiError) {
      console.log('API check failed, checking localStorage...');
    }
    
    try {
      const allReports = JSON.parse(localStorage.getItem('dailyReports') || '[]');
      const todayReport = allReports.find(report => 
        report.executiveName === executiveName && 
        report.date === todayStr
      );
      
      if (todayReport && (todayReport.totalCalls > 0 || todayReport.followUps > 0 || todayReport.whatsapp > 0)) {
        return true;
      }
    } catch (localError) {
      console.error('Error checking localStorage:', localError);
    }
    
    return false;
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

  const handleActivitySelection = async (activity) => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsSessionActive(false);

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

      if (activity === "Logout") {
        const withinRestrictedHours = isWithinRestrictedHours();
        
        if (withinRestrictedHours) {
          const hasReport = await hasFilledTodayReport();
          
          if (!hasReport) {
            alert('⚠️ Please fill your Performance Record before logging out! (5:30 PM - 7:00 PM only)');
            setActiveTab('record');
            setShowLogoutOptions(false);
            
            setIsSessionActive(true);
            if (!timerRef.current) {
              timerRef.current = setInterval(updateDuration, 1000);
            }
            return;
          }
        } else {
          console.log('✅ Outside restricted hours, allowing logout without report check');
        }
        
        await fetchDailySummary();
        setShowSummaryModal(true);
      }
    } catch (error) {
      console.error("Error during activity selection:", error);
      if (activity === "Logout") {
        const withinRestrictedHours = isWithinRestrictedHours();
        
        if (withinRestrictedHours) {
          const hasReport = await hasFilledTodayReport();
          
          if (!hasReport) {
            alert('⚠️ Please fill your Performance Record before logging out! (5:30 PM - 7:00 PM only)');
            setActiveTab('record');
            setShowLogoutOptions(false);
            setIsSessionActive(true);
            if (!timerRef.current) {
              timerRef.current = setInterval(updateDuration, 1000);
            }
            return;
          }
        } else {
          console.log('✅ Outside restricted hours, allowing logout without report check');
        }
        
        await fetchDailySummary();
        setShowSummaryModal(true);
      }
    }
  };

  const handleFinalLogout = () => {
    resetTimer();
    
    localStorage.removeItem('loginTime');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
    localStorage.removeItem('authToken');
    
    setShowSummaryModal(false);
    window.location.href = "/";
  };

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
            
            const clientType = (order.clientType || '').toLowerCase().trim();
            
            if (clientType === 'retail' || clientType === 'new') {
              if (order.rows) {
                order.rows.forEach((row) => {
                  totalAchieved += parseFloat(row.total || 0);
                });
              }
            }
          });
        } else if (data && typeof data === "object") {
          if (data.target) totalTarget = parseFloat(data.target) || 0;
          
          const clientType = (data.clientType || '').toLowerCase().trim();
          
          if (clientType === 'retail' || clientType === 'new') {
            if (data.rows) {
              data.rows.forEach((row) => {
                totalAchieved += parseFloat(row.total || 0);
              });
            }
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
  
  const getProfileInitials = (name) =>
    name
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .join("");

  const targetPercentage =
    targetData.target > 0
      ? Math.min(
          100,
          Math.round((targetData.achieved / targetData.target) * 100)
        )
      : 0;

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

  const getProgressGradient = (percentage) => {
    if (percentage <= 30) return "linear-gradient(to right, #ff4e50, #ff0000)";
    if (percentage <= 50) return "linear-gradient(to right, #ffa751, #ff6a00)";
    if (percentage <= 80)
      return "linear-gradient(to right, rgb(32, 210, 118), rgb(111, 192, 141))";
    return "linear-gradient(to right, rgb(16, 231, 34), rgb(11, 222, 25))";
  };

  const getBlinkClass = (percentage) => {
    return percentage < 100 ? "blink-progress" : "";
  };

  const handlePendingPaymentClick = () => {
    setActiveTab("pending-payments");
  };

  // Close sidebar function for mobile
  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  // Function to handle navigation back to dashboard from children components
  const handleNavigateToDashboard = (tabName = "executive-dashboard") => {
    setActiveTab(tabName);
    closeSidebarOnMobile();
  };

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
      maxWidth: '500px',
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
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '3px',
      color: '#2c3e50',
    },
    modalSubtitle: {
      fontSize: '12px',
      color: '#7f8c8d',
    },
    metricsGrid: {
      display: 'grid',
      gridTemplateColumns: isFieldExecutive ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)',
      gap: '8px',
      marginBottom: '15px',
    },
    metricItem: {
      textAlign: 'center',
      padding: '8px 5px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
    },
    metricIcon: {
      fontSize: '18px',
      marginBottom: '4px',
    },
    metricValue: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#2c3e50',
      lineHeight: '1.2',
    },
    metricLabel: {
      fontSize: '10px',
      color: '#7f8c8d',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      fontWeight: '500',
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
      fontSize: '24px',
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
      padding: '12px',
      fontSize: '14px',
      borderRadius: '6px',
      cursor: 'pointer',
      width: '100%',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    loadingSpinner: {
      textAlign: 'center',
      padding: '30px',
    },
    hamburgerButton: {
      display: window.innerWidth <= 768 ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      width: '40px',
      height: '40px',
      borderRadius: '10px',
      cursor: 'pointer',
      marginRight: '12px',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
      transition: 'all 0.3s ease',
    },
  };

  const modalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .modal-animation {
      animation: fadeIn 0.15s ease-out;
    }
    
    .blink-progress {
      animation: blink 1s infinite;
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;

  return (
    <div className="app-container">
      {isSessionActive && <AutoLogout />}
      
      <style>{modalStyles}</style>
      
      {/* Executive Summary Modal */}
      {showSummaryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="modal-animation">
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Daily Summary</h2>
              <p style={styles.modalSubtitle}>
                {selectedExecutive} • {new Date().toLocaleDateString('en-IN', { 
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })} • TODAY
                {isFieldExecutive && ' • Field Executive'}
              </p>
            </div>
            
            {dailySummary.loading ? (
              <div style={styles.loadingSpinner}>
                <div className="spinner-border text-primary" style={{ width: '20px', height: '20px' }} role="status"></div>
                <p style={{ marginTop: '10px', color: '#95a5a6', fontSize: '12px' }}>Loading your daily summary...</p>
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
                    <div style={{...styles.metricIcon, color: '#f39c12'}}>🔄</div>
                    <div style={styles.metricValue}>{dailySummary.followUps}</div>
                    <div style={styles.metricLabel}>Follow-ups</div>
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
                    <div style={{...styles.metricIcon, color: '#1abc9c'}}>🚶</div>
                    <div style={styles.metricValue}>{dailySummary.visits}</div>
                    <div style={styles.metricLabel}>Visits</div>
                  </div>
                </div>
                
                <div style={styles.salesBox}>
                  <div style={styles.salesLabel}>Today's Sales</div>
                  <div style={styles.salesAmount}>
                    ₹{dailySummary.totalSales.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#7f8c8d', marginTop: '5px' }}>
                    Conversion: {dailySummary.conversionRate}% | Avg Order: ₹{dailySummary.averageOrderValue.toLocaleString('en-IN')}
                  </div>
                </div>
                
                {dailySummary.pendingPaymentCount > 0 && (
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeeba',
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '10px',
                    fontSize: '11px',
                    color: '#856404',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>⚠️</span>
                    <span>
                      You have {dailySummary.pendingPaymentCount} pending payment(s) 
                      totaling ₹{dailySummary.totalPendingAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                
                <button 
                  onClick={handleFinalLogout}
                  style={styles.logoutButton}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2980b9';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#3498db';
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div style={styles.overlay} onClick={closeSidebarOnMobile} />
      )}
      
      {/* Navbar */}
      <div className="navbar">
        {/* Hamburger Menu Button for Mobile */}
        <button 
          style={styles.hamburgerButton}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
          }}
        >
          {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
        
        {/* Company Logo - Navigates to Dashboard when clicked */}
        <img 
          src={GMSLogo} 
          alt="GMS Logo" 
          className="toggle-btn"
          onClick={() => {
            setActiveTab("executive-dashboard");
            closeSidebarOnMobile();
          }}
          style={{
            width: '90px',
            height: '90px',
            objectFit: 'contain',
            cursor: 'pointer',
            borderRadius: '8px'
          }}
        />
        
        <h1
          className="navbar-title"
          style={{
            background: "linear-gradient(to right, #4facfe, #00f2fe)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: window.innerWidth <= 768 ? '16px' : '24px',
            flex: 1,
            marginLeft: '10px'
          }}
        >
          Welcome {selectedExecutive} {isFieldExecutive ? "(Field Executive)" : ""}
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
                fontSize: window.innerWidth <= 768 ? '10px' : '14px',
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
                {window.innerWidth <= 768 ? `${pendingPaymentData.count}` : `${selectedExecutive}, you have ${pendingPaymentData.count} pending payments`}
                {window.innerWidth <= 768 ? '' : <br />}
                {window.innerWidth <= 768 ? `₹${pendingPaymentData.amount.toLocaleString()}` : <small>Total: ₹{pendingPaymentData.amount.toLocaleString()}</small>}
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

      {/* Sidebar - With proper mobile visibility */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-content" style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '20px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #f1f1f1'
        }}>
          {/* Nav Menu */}
          <div className="nav-menu" style={{ marginTop: '0' }}>
            {[
              { key: "executive-dashboard", icon: "🏠", text: "Dashboard" },
                 { key: "tele", icon: "📞", text: "My Leads" },
              { key: "record", icon: "📊", text: "Performance Record" },
              { key: "viewRecord", icon: "📈", text: "View Records" }, 
              { key: "order", icon: "📝", text: "Create Order ➕" },
              { key: "viewOrders", icon: "📋", text: "View Orders" },
              { key: "parties", icon: "👥", text: "Parties" },
              { key: "quotation", icon: "💬", text: "Quotation" },
              { key: "appointment", icon: "📅", text: "Create Appointment ➕" },
              { key: "viewAppointments", icon: "📂", text: "View Appointments" },
              { key: "prospective", icon: "🔍", text: "Create Prospects ➕" },
              { key: "viewProspects", icon: "👁️", text: "View Prospects" },
              { key: "leave-request", icon: "📋", text: "Leave Request" },
              { key: "view-leave", icon: "📂", text: "View Leave Request" },
              { key: "price-list", icon: "💰", text: "Price List" },
              { key: "pending-payments", icon: "💰", text: "Pending Payments" },
           
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
                  closeSidebarOnMobile();
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
            <ExecutiveDashboard 
              executiveName={selectedExecutive} 
              onNavigateToPendingPayments={() => setActiveTab("pending-payments")}
              onNavigateToFollowUps={() => setActiveTab("follow-ups")}
              onNavigateToAppointments={() => setActiveTab("viewAppointments")}
              onNavigateToTab={handleNavigateToDashboard}
            />
          )}

          {activeTab === "record" && <Record executiveName={selectedExecutive} />}
          {activeTab === "tele" && <TeleCRM executiveName={selectedExecutive} />}
          {activeTab === "appointment" && <Appointment executiveName={selectedExecutive} />}
          {activeTab === "viewOrders" && <ViewOrders userRole={userRole} executiveName={selectedExecutive} />}
          {activeTab === "price-list" && <Pricelist />}
          {activeTab === "viewAppointments" && <ViewAppointments executiveName={selectedExecutive} />}
          
          {/* Pass onBackToDashboard prop to Prospective */}
          {activeTab === "prospective" && (
            <Prospective 
              executiveName={selectedExecutive}
              onBackToDashboard={() => handleNavigateToDashboard("executive-dashboard")}
            />
          )}
          
          {activeTab === "leave-request" && <LeaveRequest executiveName={selectedExecutive} />}
          {activeTab === "view-leave" && <ViewRequest executiveName={selectedExecutive} />}
          {activeTab === "viewProspects" && <ViewProspective executiveName={selectedExecutive} />}
          {activeTab === "viewRecord" && <ViewRecord executiveName={selectedExecutive} />}
          {activeTab === "pending-payments" && (
            <PendingPayment executiveFilter={selectedExecutive} />
          )}
          
          {activeTab === "parties" && <Parties executiveName={selectedExecutive} />}
          {activeTab === "quotation" && <Quotation executiveName={selectedExecutive} />}

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
                executiveName={selectedExecutive}
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
                <DigitalMarketingOrderForm executiveName={selectedExecutive} />
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
          executiveName={selectedExecutive}
        />
      )}
    </div>
  );
}

export default Admin;