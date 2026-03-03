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
import LeaveRequest from './LeaveRequest';
import ViewRequest from './ViewLeaveRequests'

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
  
  // WhatsApp dashboard state
  const [showWhatsAppDashboard, setShowWhatsAppDashboard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Executive Summary Modal State
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
  
  // ===== CHECK IF USER IS FIELD EXECUTIVE =====
  const userRoleLower = (userRole || "").toLowerCase();
  const executiveNameLower = (selectedExecutive || "").toLowerCase();
  
  console.log('👤 User role from localStorage:', userRole);
  console.log('👤 User role lowercase:', userRoleLower);
  console.log('👤 Executive name:', selectedExecutive);
  
  // More comprehensive check for field executive
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
  
  console.log('👤 FINAL Is Field Executive:', isFieldExecutive);
  
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

  // Debug effect
  useEffect(() => {
    console.log('📊 Current dailySummary state:', dailySummary);
    console.log('👤 User role:', userRole);
    console.log('👤 FINAL Is Field Executive:', isFieldExecutive);
    console.log('🚶 Visits count in state:', dailySummary.visits);
  }, [dailySummary, userRole, isFieldExecutive]);

  // ===== FETCH DAILY SUMMARY WITH ONLY TODAY'S VISITS =====
  const fetchDailySummary = async () => {
    try {
      setDailySummary(prev => ({ ...prev, loading: true }));
      
      const executiveName = selectedExecutive;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      console.log(`📊 Fetching REAL daily summary for ${executiveName} on ${todayStr}`);
      console.log('👤 FINAL Is Field Executive:', isFieldExecutive);
      
      // ===== 1. GET DATA FROM RECORDFORM =====
      let callsMade = 0;
      let followUps = 0;
      let whatsappFromReports = 0;
      
      try {
        console.log('🔍 Fetching records from API: /api/reports/executive-records');
        const response = await axios.get('/api/reports/executive-records', {
          params: {
            executive: executiveName
          }
        });
        
        console.log('✅ API Response:', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          const todayRecord = response.data.find(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === todayStr;
          });
          
          if (todayRecord) {
            callsMade = parseInt(todayRecord.totalCalls) || 0;
            followUps = parseInt(todayRecord.followUps) || 0;
            whatsappFromReports = parseInt(todayRecord.whatsapp) || 0;
            
            console.log('✅ Found today\'s record from API:', { 
              callsMade, 
              followUps, 
              whatsapp: whatsappFromReports 
            });
          } else {
            console.log('⚠️ No record found for today in API response');
          }
        } else {
          console.log('⚠️ No records found in API response');
        }
      } catch (apiError) {
        console.error('❌ Error fetching from API:', apiError);
        
        console.log('⚠️ API failed, trying localStorage as fallback...');
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
            console.log('✅ Found fallback data in localStorage:', todayReport);
          }
        } catch (localError) {
          console.error('Error reading from localStorage:', localError);
        }
      }
      
      console.log('📞 FINAL RecordForm data - Calls:', callsMade, 'Follow-ups:', followUps, 'WhatsApp:', whatsappFromReports);
      
      // ===== 2. GET ORDERS CLOSED TODAY =====
      let ordersClosed = 0;
      let totalSales = 0;
      
      try {
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        console.log('📅 Fetching orders for date range:', {
          todayStart: todayStart.toISOString(),
          tomorrow: tomorrow.toISOString()
        });
        
        const ordersResponse = await axios.get('/api/orders', {
          params: {
            executive: executiveName,
            _: new Date().getTime() // Prevent caching
          }
        });
        
        console.log('📦 All orders for executive:', ordersResponse.data.length);
        
        // Filter orders for today only
        const ordersToday = Array.isArray(ordersResponse.data) ? ordersResponse.data.filter(order => {
          if (!order.orderDate) return false;
          
          const orderDate = new Date(order.orderDate);
          const isToday = orderDate >= todayStart && orderDate < tomorrow;
          
          if (isToday) {
            console.log('✅ Found today\'s order:', {
              orderNo: order.orderNo,
              orderDate: order.orderDate,
              totalAmount: order.totalAmount,
              rows: order.rows
            });
          }
          
          return isToday;
        }) : [];
        
        ordersClosed = ordersToday.length;
        
        // Calculate total sales - Check both totalAmount and rows total
        totalSales = ordersToday.reduce((sum, order) => {
          // Try to get totalAmount directly
          let orderTotal = order.totalAmount || 0;
          
          // If totalAmount is 0, try to calculate from rows
          if (orderTotal === 0 && order.rows && Array.isArray(order.rows)) {
            orderTotal = order.rows.reduce((rowSum, row) => {
              return rowSum + (parseFloat(row.total) || 0);
            }, 0);
            console.log(`💰 Calculated total from rows for order ${order.orderNo}:`, orderTotal);
          }
          
          console.log(`💰 Order ${order.orderNo} total:`, orderTotal);
          return sum + orderTotal;
        }, 0);
        
        console.log('✅ Found orders today:', ordersClosed, 'Total sales:', totalSales);
        
        // Log each order's details for debugging
        ordersToday.forEach((order, index) => {
          console.log(`📋 Order ${index + 1}:`, {
            orderNo: order.orderNo,
            totalAmount: order.totalAmount,
            rowsTotal: order.rows?.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0),
            status: order.status
          });
        });
        
      } catch (orderError) {
        console.error('❌ Error fetching orders:', orderError);
        console.error('Error details:', orderError.response?.data || orderError.message);
      }
      
      // ===== 3. GET WHATSAPP MESSAGES =====
      let whatsappMessages = whatsappFromReports;
      
      try {
        const whatsappResponse = await axios.get('/api/whatsapp/today', {
          params: { executive: executiveName }
        }).catch(() => ({ data: { count: 0 } }));
        whatsappMessages += (whatsappResponse.data?.count || 0);
      } catch (whatsappError) {
        console.log('WhatsApp API not available');
      }
      
      // ===== 4. GET ONLY TODAY'S VISITS FROM FIELD EXECUTIVE PAGE =====
      let visits = 0;
      
      // ONLY get visits for TODAY, not all visits
      console.log('🔍 FETCHING TODAY\'S VISITS ONLY FROM FIELD EXECUTIVE DATA FOR:', executiveName);
      
      try {
        // METHOD 1: Get from fieldVisits_ specific key (this is the most reliable - saved by FieldExecutivePage)
        const todayVisitsKey = `fieldVisits_${executiveName}_${todayStr}`;
        const todayVisitsData = localStorage.getItem(todayVisitsKey);
        console.log(`📦 ${todayVisitsKey}:`, todayVisitsData ? 'Found' : 'Not found');
        
        if (todayVisitsData) {
          try {
            const parsedVisits = JSON.parse(todayVisitsData);
            if (Array.isArray(parsedVisits)) {
              visits = parsedVisits.length;
              console.log('✅ Found today\'s visits from fieldVisits key:', visits);
            }
          } catch (e) {
            console.error('❌ Error parsing todayVisitsData:', e);
          }
        }
        
        // METHOD 2: Get from fieldExecutiveData in localStorage and filter for today only
        if (visits === 0) {
          const storedData = localStorage.getItem('fieldExecutiveData');
          console.log('📦 fieldExecutiveData from localStorage:', storedData ? 'Found' : 'Not found');
          
          if (storedData) {
            try {
              const fieldData = JSON.parse(storedData);
              console.log('📊 Parsed field data:', fieldData);
              
              if (fieldData.activities && Array.isArray(fieldData.activities)) {
                console.log('📋 Total activities in storage:', fieldData.activities.length);
                
                // Filter activities for TODAY ONLY
                const todayVisits = fieldData.activities.filter(activity => {
                  if (!activity || !activity.date) return false;
                  
                  let activityDateStr;
                  try {
                    activityDateStr = new Date(activity.date).toISOString().split('T')[0];
                  } catch (e) {
                    console.error('Error parsing activity date:', e);
                    return false;
                  }
                  
                  // Also check if this activity belongs to current executive
                  const matchesExecutive = 
                    !activity.executive || 
                    activity.executive === executiveName || 
                    activity.executiveName === executiveName;
                  
                  const isToday = activityDateStr === todayStr;
                  
                  if (isToday && matchesExecutive) {
                    console.log('✅ Found today\'s visit:', activity.client || activity.businessName);
                  }
                  
                  return isToday && matchesExecutive;
                });
                
                visits = todayVisits.length;
                console.log('✅ Found field visits for TODAY only from fieldExecutiveData:', visits);
              }
            } catch (e) {
              console.error('❌ Error parsing field data:', e);
            }
          }
        }
        
        // METHOD 3: Check for visits in fieldData array and filter for today only
        if (visits === 0) {
          const fieldDataArray = localStorage.getItem('fieldData');
          console.log('📦 fieldData:', fieldDataArray ? 'Found' : 'Not found');
          
          if (fieldDataArray) {
            try {
              const parsed = JSON.parse(fieldDataArray);
              if (Array.isArray(parsed)) {
                const todayVisits = parsed.filter(visit => {
                  if (!visit || !visit.date) return false;
                  
                  let visitDateStr;
                  try {
                    visitDateStr = new Date(visit.date).toISOString().split('T')[0];
                  } catch (e) {
                    return false;
                  }
                  
                  const matchesExecutive = 
                    !visit.executive || 
                    visit.executive === executiveName || 
                    visit.executiveName === executiveName;
                  
                  // Only count if it's TODAY
                  return visitDateStr === todayStr && matchesExecutive;
                });
                
                if (todayVisits.length > 0) {
                  visits += todayVisits.length;
                  console.log('✅ Found visits for TODAY only in fieldData:', todayVisits.length);
                }
              }
            } catch (e) {
              console.error('Error parsing fieldData:', e);
            }
          }
        }
        
        // METHOD 4: Check for any visit-related keys and filter for today only
        if (visits === 0) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.toLowerCase().includes('visit') || key.toLowerCase().includes('field')) && key.includes(todayStr)) {
              try {
                const value = localStorage.getItem(key);
                if (value) {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    const executiveVisits = parsed.filter(v => {
                      if (!v || !v.date) return false;
                      
                      let visitDateStr;
                      try {
                        visitDateStr = new Date(v.date).toISOString().split('T')[0];
                      } catch (e) {
                        return false;
                      }
                      
                      const matchesExecutive = 
                        !v.executive || 
                        v.executive === executiveName || 
                        v.executiveName === executiveName;
                      
                      // Already filtered by key containing todayStr, but double-check
                      return visitDateStr === todayStr && matchesExecutive;
                    });
                    
                    if (executiveVisits.length > 0) {
                      visits += executiveVisits.length;
                      console.log(`✅ Found visits for TODAY in key ${key}:`, executiveVisits.length);
                    }
                  }
                }
              } catch (e) {
                // Skip if not parseable
              }
            }
          }
        }
        
      } catch (storageError) {
        console.error('❌ Error reading from localStorage:', storageError);
      }
      
      console.log('🚶 FINAL TODAY\'S VISITS COUNT:', visits);
      
      // ===== 5. GET PENDING PAYMENTS =====
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
      
      // ===== 6. GET TARGET DATA =====
      let target = 0;
      let achieved = totalSales; // Use today's sales for achieved
      try {
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();
        const targetResponse = await axios.get(`/api/get-target/${executiveName}/${currentMonth}/${currentYear}`);
        target = targetResponse.data?.target || 0;
      } catch (targetError) {
        console.error('Error fetching target:', targetError);
      }
      
      // Calculate metrics
      const conversionRate = callsMade > 0 ? Math.round((ordersClosed / callsMade) * 100) : 0;
      const averageOrderValue = ordersClosed > 0 ? Math.round(totalSales / ordersClosed) : 0;
      
      console.log('📊 FINAL DAILY SUMMARY (TODAY ONLY):', {
        callsMade: callsMade,
        followUps: followUps,
        whatsappMessages: whatsappMessages,
        ordersClosed: ordersClosed,
        totalSales: totalSales,
        visits: visits,
        pendingPaymentCount: pendingPaymentCount,
        totalPendingAmount: totalPendingAmount,
        isFieldExecutive: isFieldExecutive
      });
      
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
      console.error('❌ Error fetching daily summary:', error);
      setDailySummary(prev => ({ 
        ...prev, 
        loading: false,
        visits: 0,
        totalSales: 0,
        ordersClosed: 0
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
        // Fetch the latest daily summary including visits before showing modal
        await fetchDailySummary();
        setShowSummaryModal(true);
      }
    } catch (error) {
      console.error("Error during activity selection:", error);
      if (activity === "Logout") {
        // Still try to show summary even if API fails
        await fetchDailySummary();
        setShowSummaryModal(true);
      }
    }
  };

  // ===== FIXED: Don't clear all localStorage, only session items =====
  const handleFinalLogout = () => {
    resetTimer();
    
    // DON'T clear all localStorage - this was deleting the field visits data
    // localStorage.clear(); // REMOVE THIS LINE
    
    // Instead, only remove session-related items
    localStorage.removeItem('loginTime');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
    localStorage.removeItem('authToken'); // if you have this
    // Keep fieldExecutiveData and fieldVisits_* in localStorage
    
    setShowSummaryModal(false);
    window.location.href = "/";
  };

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
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

  const getProfileInitials = (name) =>
    name
      .split(" ")
      .map((part) => part[0]?.toUpperCase() || "")
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

  // ===== STYLES OBJECT WITH CONDITIONAL GRID =====
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
      // FORCE SHOW 5 COLUMNS FOR FIELD EXECUTIVES TO INCLUDE VISITS
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
  };

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
      
      <style>{modalStyles}</style>
      
      {/* Executive Summary Modal - Shows Daily Summary with Today's Visits */}
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
                  {/* Calls */}
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#3498db'}}>📞</div>
                    <div style={styles.metricValue}>{dailySummary.callsMade}</div>
                    <div style={styles.metricLabel}>Calls</div>
                  </div>
                  
                  {/* Follow-ups */}
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#f39c12'}}>🔄</div>
                    <div style={styles.metricValue}>{dailySummary.followUps}</div>
                    <div style={styles.metricLabel}>Follow-ups</div>
                  </div>
                  
                  {/* WhatsApp */}
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#25D366'}}>💬</div>
                    <div style={styles.metricValue}>{dailySummary.whatsappMessages}</div>
                    <div style={styles.metricLabel}>WhatsApp</div>
                  </div>
                  
                  {/* Orders */}
                  <div style={styles.metricItem}>
                    <div style={{...styles.metricIcon, color: '#2ecc71'}}>💰</div>
                    <div style={styles.metricValue}>{dailySummary.ordersClosed}</div>
                    <div style={styles.metricLabel}>Orders</div>
                  </div>
                  
                  {/* VISITS - Shows Today's Visits Only */}
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
                
                {/* Pending Payments Alert */}
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

      {/* Sidebar - UPDATED WITH SCROLLING */}
      <div className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-content" style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '20px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #f1f1f1'
        }}>
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
             { key: "leave-request", icon: "📋", text: "Leave Request" },
{ key: "view-leave", icon: "📂", text: "View Leave Request" },
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
            <ExecutiveDashboard 
              executiveName={selectedExecutive} 
              onNavigateToPendingPayments={() => setActiveTab("pending-payments")}
              onNavigateToFollowUps={() => setActiveTab("follow-ups")}
              onNavigateToAppointments={() => setActiveTab("viewAppointments")}
            />
          )}

          {activeTab === "record" && <Record executiveName={selectedExecutive} />}
          {activeTab === "tele" && <TeleCRM executiveName={selectedExecutive} />}
          {activeTab === "appointment" && <Appointment executiveName={selectedExecutive} />}
          {activeTab === "viewOrders" && <ViewOrders userRole={userRole} executiveName={selectedExecutive} />}
          {activeTab === "price-list" && <Pricelist />}
          {activeTab === "viewAppointments" && <ViewAppointments executiveName={selectedExecutive} />}
          {activeTab === "prospective" && <Prospective executiveName={selectedExecutive} />}
          {activeTab === "leave-request" && <LeaveRequest executiveName={selectedExecutive} />}
          {activeTab === "view-leave" && <ViewRequest executiveName={selectedExecutive} />}
          {activeTab === "viewProspects" && <ViewProspective executiveName={selectedExecutive} />}
          {activeTab === "viewRecord" && <ViewRecord executiveName={selectedExecutive} />}
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