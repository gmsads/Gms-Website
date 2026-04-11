// Import the logo
import GMSLogo from '../assets/GMS_LOGO_.png';
import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
} from 'chart.js';
import axios from 'axios';
import OrderForm from '../Executive/OrderForm';
import AutoLogout from "../mainpage/AutoLogout";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartJSTooltip,
  ChartJSLegend
);

// Month names for display
const monthLabels = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Week labels
const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];

// Year options (2024 to 2030)
const yearOptions = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Mock weekly data for the chart
const mockWeeklyData = {
  0: [5, 8, 6, 7, 4],  // January
  1: [7, 9, 8, 6, 5],  // February
  2: [6, 5, 7, 8, 4],  // March
  3: [8, 7, 6, 5, 4],  // April
  4: [7, 6, 8, 5, 4],  // May
  5: [6, 7, 5, 8, 4],  // June
  6: [5, 8, 6, 7, 4],  // July
  7: [7, 9, 8, 6, 5],  // August
  8: [6, 5, 7, 8, 4],  // September
  9: [8, 7, 6, 5, 4],  // October
  10: [7, 6, 8, 5, 4], // November
  11: [6, 7, 5, 8, 4]  // December
};

const ServiceDashboard = () => {
  // State management for component
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [todaysServices, setTodaysServices] = useState([]);
  const [tomorrowsServices, setTomorrowsServices] = useState([]);
  const [nextWeekServices, setNextWeekServices] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [completedServices, setCompletedServices] = useState([]);
  const [monthlyServiceData, setMonthlyServiceData] = useState([]);
  const [, setReportChartData] = useState(null);
  
  // Target data state
  const [targetData, setTargetData] = useState({
    target: 0,
    achieved: 0,
    formattedTarget: "₹0",
    formattedAchieved: "₹0",
  });
  const [targetLoading, setTargetLoading] = useState(true);

  // Dropdown states for sidebar
  const [salesOpen, setSalesOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [additionalOpen, setAdditionalOpen] = useState(true);

  // Get current executive from localStorage
  const currentExecutive = localStorage.getItem('userName') || '';
  const username = currentExecutive || 'Service Executive';

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Logo icon styles
  const logoIconStyle = {
    width: '75px',
    height: '75px',
    cursor: 'pointer',
    objectFit: 'contain',
    marginRight: '15px',
    borderRadius: '14px',
  };

  // Hamburger menu icon styles
  const hamburgerStyle = {
    display: window.innerWidth <= 768 ? 'flex' : 'none',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '30px',
    height: '21px',
    cursor: 'pointer',
    marginRight: '15px',
  };

  const hamburgerLineStyle = {
    width: '100%',
    height: '3px',
    backgroundColor: 'white',
    borderRadius: '2px',
    transition: 'all 0.3s ease',
  };

  // Handle logo click - Navigate to dashboard and close sidebar on mobile
  const handleLogoClick = () => {
    // Check if already on dashboard
    if (location.pathname === '/service-dashboard') {
      // If already on dashboard, refresh the page data
      window.location.reload();
    } else {
      // Navigate to dashboard
      navigate('/service-dashboard');
    }
    // Close sidebar on mobile if open
    if (window.innerWidth <= 768 && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Close sidebar when clicking overlay on mobile
  const closeSidebarOnOverlay = () => {
    if (window.innerWidth <= 768 && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Check if current route is dashboard home
  const isDashboardHome = location.pathname === '/service-dashboard';

  // Helper function to get start of day (00:00:00)
  const getStartOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  };

  // Helper function to get end of day (23:59:59)
  const getEndOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  };

  // Helper function to get start and end of week (Monday to Sunday)
  const getWeekRange = (date) => {
    const start = new Date(date);
    const day = start.getDay() || 7; // Adjust so Monday is 1, Sunday is 7
    if (day !== 1) start.setHours(-24 * (day - 1)); // Go to previous Monday

    const end = new Date(start);
    end.setDate(end.getDate() + 6); // Go to next Sunday

    return {
      start: getStartOfDay(start),
      end: getEndOfDay(end)
    };
  };

  // Filter services by date range for current executive only
  const filterServicesByDate = (services, daysFromToday) => {
    const today = getStartOfDay(new Date());

    if (daysFromToday === -1) {
      // Pending services for current executive only
      return services.filter(service => {
        return service.rows.some(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            (!row.isCompleted || row.status === 'Pending');
        });
      }).map(service => {
        const matchingRow = service.rows.find(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            (!row.isCompleted || row.status === 'Pending');
        });

        return {
          id: service._id,
          orderNo: service.orderNo,
          status: matchingRow.status || (matchingRow.isCompleted ? 'Completed' : 'Pending'),
          customer: service.clientName,
          type: matchingRow.requirement,
          date: matchingRow.deliveryDate,
          phone: service.phone,
          business: service.business,
          contactPerson: service.contactPerson,
          executive: service.executive,
          requirement: matchingRow.requirement,
          description: matchingRow.description,
          assignedExecutive: matchingRow.assignedExecutive || service.executive,
          remark: matchingRow.remark,
          isCompleted: matchingRow.isCompleted,
          rowIndex: service.rows.indexOf(matchingRow)
        };
      });
    }
    else if (daysFromToday === -2) {
      // Completed services for current executive only
      return services.filter(service => {
        return service.rows.some(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive && (row.isCompleted || row.status === 'Completed');
        });
      }).map(service => {
        const matchingRow = service.rows.find(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive && (row.isCompleted || row.status === 'Completed');
        });

        return {
          id: service._id,
          orderNo: service.orderNo,
          status: 'Completed',
          customer: service.clientName,
          type: matchingRow.requirement,
          date: matchingRow.deliveryDate,
          phone: service.phone,
          business: service.business,
          contactPerson: service.contactPerson,
          executive: service.executive,
          requirement: matchingRow.requirement,
          description: matchingRow.description,
          assignedExecutive: matchingRow.assignedExecutive || service.executive,
          remark: matchingRow.remark,
          isCompleted: matchingRow.isCompleted,
          rowIndex: service.rows.indexOf(matchingRow)
        };
      });
    }
    else if (daysFromToday === 0) {
      // Today's services for current executive only
      const start = today;
      const end = getEndOfDay(today);

      return services.filter(service => {
        return service.rows.some(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            row.deliveryDate &&
            new Date(row.deliveryDate) >= start &&
            new Date(row.deliveryDate) <= end;
        });
      }).map(service => {
        const matchingRow = service.rows.find(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            row.deliveryDate &&
            new Date(row.deliveryDate) >= start &&
            new Date(row.deliveryDate) <= end;
        });

        return {
          id: service._id,
          orderNo: service.orderNo,
          status: matchingRow.status || (matchingRow.isCompleted ? 'Completed' : 'Pending'),
          customer: service.clientName,
          type: matchingRow.requirement,
          date: matchingRow.deliveryDate,
          phone: service.phone,
          business: service.business,
          contactPerson: service.contactPerson,
          executive: service.executive,
          requirement: matchingRow.requirement,
          description: matchingRow.description,
          assignedExecutive: matchingRow.assignedExecutive || service.executive,
          remark: matchingRow.remark,
          isCompleted: matchingRow.isCompleted,
          rowIndex: service.rows.indexOf(matchingRow)
        };
      });
    }
    else if (daysFromToday === 1) {
      // Tomorrow's services for current executive only
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = getStartOfDay(tomorrow);
      const end = getEndOfDay(tomorrow);

      return services.filter(service => {
        return service.rows.some(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            row.deliveryDate &&
            new Date(row.deliveryDate) >= start &&
            new Date(row.deliveryDate) <= end;
        });
      }).map(service => {
        const matchingRow = service.rows.find(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            row.deliveryDate &&
            new Date(row.deliveryDate) >= start &&
            new Date(row.deliveryDate) <= end;
        });

        return {
          id: service._id,
          orderNo: service.orderNo,
          status: matchingRow.status || (matchingRow.isCompleted ? 'Completed' : 'Pending'),
          customer: service.clientName,
          type: matchingRow.requirement,
          date: matchingRow.deliveryDate,
          phone: service.phone,
          business: service.business,
          contactPerson: service.contactPerson,
          executive: service.executive,
          requirement: matchingRow.requirement,
          description: matchingRow.description,
          assignedExecutive: matchingRow.assignedExecutive || service.executive,
          remark: matchingRow.remark,
          isCompleted: matchingRow.isCompleted,
          rowIndex: service.rows.indexOf(matchingRow)
        };
      });
    }
    else if (daysFromToday === 7) {
      // Next week's services for current executive only
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const weekRange = getWeekRange(nextWeekStart);

      return services.filter(service => {
        return service.rows.some(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            row.deliveryDate &&
            new Date(row.deliveryDate) >= weekRange.start &&
            new Date(row.deliveryDate) <= weekRange.end;
        });
      }).map(service => {
        const matchingRow = service.rows.find(row => {
          const isAssignedToCurrentExecutive =
            row.assignedExecutive === currentExecutive ||
            (!row.assignedExecutive && service.executive === currentExecutive);

          return isAssignedToCurrentExecutive &&
            row.deliveryDate &&
            new Date(row.deliveryDate) >= weekRange.start &&
            new Date(row.deliveryDate) <= weekRange.end;
        });

        return {
          id: service._id,
          orderNo: service.orderNo,
          status: matchingRow.status || (matchingRow.isCompleted ? 'Completed' : 'Pending'),
          customer: service.clientName,
          type: matchingRow.requirement,
          date: matchingRow.deliveryDate,
          phone: service.phone,
          business: service.business,
          contactPerson: service.contactPerson,
          executive: service.executive,
          requirement: matchingRow.requirement,
          description: matchingRow.description,
          assignedExecutive: matchingRow.assignedExecutive || service.executive,
          remark: matchingRow.remark,
          isCompleted: matchingRow.isCompleted,
          rowIndex: service.rows.indexOf(matchingRow)
        };
      });
    }

    return [];
  };

  // Fetch target data
  const fetchTargetData = async () => {
    try {
      setTargetLoading(true);
      const response = await axios.get(`/api/executive/${currentExecutive}`);
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
      setTargetLoading(false);
    }
  };

  // Fetch data on component mount or when year/month changes
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch target data
        await fetchTargetData();

        // Fetch services data for current executive only
        const response = await axios.get('/api/orders/pending-services', {
          params: { executive: currentExecutive }
        });
        const servicesData = response.data;

        // Calculate stats for current executive only
        const totalPending = servicesData.filter(service =>
          service.rows.some(row => {
            const isAssigned =
              row.assignedExecutive === currentExecutive ||
              (!row.assignedExecutive && service.executive === currentExecutive);
            return isAssigned && (!row.isCompleted && row.status !== 'Completed');
          })
        ).length;

        const totalCompleted = servicesData.filter(service =>
          service.rows.some(row => {
            const isAssigned =
              row.assignedExecutive === currentExecutive ||
              (!row.assignedExecutive && service.executive === currentExecutive);
            return isAssigned && (row.isCompleted || row.status === 'Completed');
          })
        ).length;

        const inProgress = servicesData.filter(service =>
          service.rows.some(row => {
            const isAssigned =
              row.assignedExecutive === currentExecutive ||
              (!row.assignedExecutive && service.executive === currentExecutive);
            return isAssigned && row.status === 'In Progress';
          })
        ).length;

        // Mock monthly service data
        const mockMonthlyData = [12, 19, 15, 8, 12, 15, 18, 14, 16, 12, 10, 14];

        // Mock report chart data
        const mockReportChartData = {
          labels: monthLabels,
          reportCounts: [15, 22, 18, 12, 20, 25, 28, 22, 24, 18, 15, 20],
          activeEmployees: [3, 4, 4, 3, 4, 5, 5, 4, 4, 3, 3, 4]
        };

        if (isMounted) {
          setServices(servicesData);
          setStats({
            totalPending,
            totalCompleted,
            inProgress,
            totalServices: totalPending + totalCompleted + inProgress
          });
          setMonthlyServiceData(mockMonthlyData);
          setReportChartData(mockReportChartData);

          // Filter services for current executive only
          setTodaysServices(filterServicesByDate(servicesData, 0));
          setTomorrowsServices(filterServicesByDate(servicesData, 1));
          setNextWeekServices(filterServicesByDate(servicesData, 7));
          setPendingServices(filterServicesByDate(servicesData, -1));
          setCompletedServices(filterServicesByDate(servicesData, -2));

          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (currentExecutive) {
      fetchData();
      
      // Set up interval to refresh target data every 30 seconds
      const interval = setInterval(fetchTargetData, 30000);
      return () => clearInterval(interval);
    }

    return () => {
      isMounted = false;
    };
  }, [year, selectedMonth, currentExecutive]);

  // Handle search for orders
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

  const handleStatusToggle = async (orderId, rowIndex, currentStatus) => {
    const updatedStatus = !currentStatus;
    const newStatus = updatedStatus ? 'Completed' : 'Pending';

    console.log('🔄 Frontend: Starting status toggle', {
      orderId,
      rowIndex,
      currentStatus,
      updatedStatus,
      newStatus,
      executive: currentExecutive
    });

    // Store original state for rollback
    const originalState = {
      orderId,
      rowIndex,
      status: currentStatus ? 'Completed' : 'Pending',
      isCompleted: currentStatus
    };

    try {
      // 1. Update UI optimistically
      updateUIOptimistically(orderId, rowIndex, updatedStatus, newStatus);

      // 2. Make API call
      console.log('🌐 Making API call...');
      const response = await axios.put(
        `/api/orders/${orderId}/rows/${rowIndex}/status`,
        {
          isCompleted: updatedStatus,
          status: newStatus,
          updatedBy: currentExecutive
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      console.log('✅ API Response:', response.data);

      if (response.data && response.data.success) {
        console.log('🎉 Status updated successfully');
        return;
      } else {
        throw new Error(response.data?.message || 'API returned unsuccessful response');
      }

    } catch (error) {
      console.error('❌ Error in handleStatusToggle:', error);
      
      // Revert UI changes
      revertUIChanges(originalState);
      
      // Show appropriate error message
      showErrorMessage(error, originalState);
    }
  };

  // Helper function to update UI
  const updateUIOptimistically = (orderId, rowIndex, updatedStatus, newStatus) => {
    console.log('🎨 Updating UI optimistically');
    
    // Update main services state
    setServices(prevServices =>
      prevServices.map(service => {
        if (service._id === orderId) {
          const updatedRows = service.rows.map((row, idx) => 
            idx === parseInt(rowIndex) 
              ? {
                  ...row,
                  isCompleted: updatedStatus,
                  status: newStatus,
                  updatedBy: currentExecutive,
                  updatedAt: new Date().toISOString()
                }
              : row
          );
          return { ...service, rows: updatedRows };
        }
        return service;
      })
    );

    // Update filtered lists
    const updateServiceInList = (list) => 
      list.map(service => 
        service.id === orderId && service.rowIndex === parseInt(rowIndex)
          ? { 
              ...service, 
              isCompleted: updatedStatus, 
              status: newStatus,
              updatedAt: new Date().toISOString()
            }
          : service
      );

    setTodaysServices(prev => updateServiceInList(prev));
    setTomorrowsServices(prev => updateServiceInList(prev));
    setNextWeekServices(prev => updateServiceInList(prev));
    setPendingServices(prev => updateServiceInList(prev));
    setCompletedServices(prev => updateServiceInList(prev));

    // Update stats
    setStats(prev => ({
      ...prev,
      totalPending: updatedStatus ? prev.totalPending - 1 : prev.totalPending + 1,
      totalCompleted: updatedStatus ? prev.totalCompleted + 1 : prev.totalCompleted - 1
    }));
  };

  // Helper function to revert UI changes
  const revertUIChanges = (originalState) => {
    console.log('↩️ Reverting UI changes');
    
    const { orderId, rowIndex, status, isCompleted } = originalState;

    setServices(prevServices =>
      prevServices.map(service => {
        if (service._id === orderId) {
          const updatedRows = service.rows.map((row, idx) => 
            idx === parseInt(rowIndex) 
              ? { ...row, isCompleted, status }
              : row
          );
          return { ...service, rows: updatedRows };
        }
        return service;
      })
    );

    const revertServiceInList = (list) => 
      list.map(service => 
        service.id === orderId && service.rowIndex === parseInt(rowIndex)
          ? { ...service, isCompleted, status }
          : service
      );

    setTodaysServices(prev => revertServiceInList(prev));
    setTomorrowsServices(prev => revertServiceInList(prev));
    setNextWeekServices(prev => revertServiceInList(prev));
    setPendingServices(prev => revertServiceInList(prev));
    setCompletedServices(prev => revertServiceInList(prev));

    // Revert stats
    setStats(prev => ({
      ...prev,
      totalPending: isCompleted ? prev.totalPending + 1 : prev.totalPending - 1,
      totalCompleted: isCompleted ? prev.totalCompleted - 1 : prev.totalCompleted + 1
    }));
  };

  // Helper function to show error messages
  const showErrorMessage = (error) => {
    let errorMessage = 'Failed to update status. ';
    
    if (error.response) {
      // Server responded with error status
      const serverMessage = error.response.data?.message;
      if (serverMessage) {
        errorMessage += serverMessage;
      } else {
        errorMessage += `Server error: ${error.response.status}`;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorMessage += 'Network error. Please check your connection.';
    } else {
      // Something else happened
      errorMessage += error.message;
    }

    console.error('💬 Error message:', errorMessage);
    alert(`❌ ${errorMessage}`);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  // Data for service status bar chart (for current executive only)
  const serviceStatusData = {
    labels: ['Completed', 'Pending', 'In Progress'],
    datasets: [
      {
        label: 'Number of Services',
        data: [stats.totalCompleted, stats.totalPending, stats.inProgress],
        backgroundColor: [
          '#4CAF50', // Green for Completed
          '#FF0000', // Red for Pending
          '#FFA500'  // Orange for In Progress
        ],
        borderColor: [
          '#388E3C', // Darker green border
          '#D32F2F', // Darker red border
          '#F57C00'  // Darker orange border
        ],
        borderWidth: 1,
        borderRadius: 5,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  // Data for service trends chart (for current executive only)
  const serviceTrendsData = {
    labels: selectedMonth !== null
      ? weekLabels.slice(0, mockWeeklyData[selectedMonth]?.length || 4)
      : monthLabels,
    datasets: [
      {
        label: selectedMonth !== null ? 'Weekly Services' : 'Monthly Services',
        data: selectedMonth !== null
          ? mockWeeklyData[selectedMonth] || [0, 0, 0, 0, 0]
          : monthlyServiceData,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Calculate target percentage
  const targetPercentage =
    targetData.target > 0
      ? Math.min(
          100,
          Math.round((targetData.achieved / targetData.target) * 100)
        )
      : 0;

  // Get progress gradient color
  const getProgressGradient = (percentage) => {
    if (percentage <= 30) return "linear-gradient(to right, #ff4e50, #ff0000)";
    if (percentage <= 50) return "linear-gradient(to right, #ffa751, #ff6a00)";
    if (percentage <= 80)
      return "linear-gradient(to right, rgb(32, 210, 118), rgb(111, 192, 141))";
    return "linear-gradient(to right, rgb(16, 231, 34), rgb(11, 222, 25))";
  };

  // Service card component for upcoming services
  const ServiceCard = ({ title, services, color }) => {
    const isCompletedCard = title.includes('Completed');

    return (
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          borderBottom: `2px solid ${color}`,
          paddingBottom: '8px'
        }}>
          <h3 style={{
            margin: 0,
            color: color,
            fontSize: '18px'
          }}>{title}</h3>
          <span style={{
            backgroundColor: color,
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '12px'
          }}>
            {services.length}
          </span>
        </div>

        {services.length > 0 ? (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {services.map((service) => (
              <div key={`${service.id}-${service.rowIndex}`} style={{
                padding: '10px',
                borderBottom: '1px solid #eee',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 'bold' }}>Order #: {service.orderNo}</div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor:
                      service.status === 'Completed' ? '#e6f7e6' :
                        service.status === 'In Progress' ? '#e6f7ff' : '#fff3e6',
                    color:
                      service.status === 'Completed' ? '#2e7d32' :
                        service.status === 'In Progress' ? '#1976d2' : '#ff9800',
                    fontSize: '12px'
                  }}>
                    {service.status}
                  </div>
                </div>

                <div style={{ marginTop: '5px' }}>
                  <div><strong>Customer:</strong> {service.customer}</div>
                  <div><strong>Contact:</strong> {service.contactPerson} ({service.phone})</div>
                  <div><strong>Business:</strong> {service.business}</div>
                  <div><strong>Service Type:</strong> {service.type}</div>
                  <div><strong>Requirement:</strong> {service.requirement}</div>
                  <div><strong>Description:</strong> {service.description}</div>
                  {service.date && (
                    <div><strong>Delivery Date:</strong> {new Date(service.date).toLocaleDateString()}</div>
                  )}
                  <div><strong>Assigned Executive:</strong> {service.assignedExecutive}</div>
                </div>

                {service.remark && (
                  <div style={{
                    marginTop: '5px',
                    padding: '5px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    <strong>Remarks:</strong> {service.remark}
                  </div>
                )}

                {!isCompletedCard && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button
                      style={{
                        padding: '5px 10px',
                        backgroundColor: service.status === 'Completed' ? '#4CAF50' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      onClick={() => handleStatusToggle(service.id, service.rowIndex, service.status === 'Completed')}
                    >
                      {service.status === 'Completed' ? 'Mark Pending' : 'Mark Complete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#999',
            fontSize: '14px'
          }}>
            No services scheduled
          </div>
        )}
      </div>
    );
  };

  // Loading state
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

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: window.innerWidth <= 768 ? 10 : 12
          },
          padding: 10
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: window.innerWidth <= 768 ? 10 : 12
          }
        },
        grid: {
          display: true,
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        ticks: {
          font: {
            size: window.innerWidth <= 768 ? 10 : 12
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Main render
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <AutoLogout />
      
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div
          onClick={closeSidebarOnOverlay}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'all 0.3s ease',
          }}
        />
      )}
      
      {/* Navbar */}
      <div style={{
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
        zIndex: 1000,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      }}>
        {/* Hamburger Menu for Mobile */}
        <div style={hamburgerStyle} onClick={toggleSidebar}>
          <div style={hamburgerLineStyle}></div>
          <div style={hamburgerLineStyle}></div>
          <div style={hamburgerLineStyle}></div>
        </div>
        
        {/* Logo */}
        <img 
          src={GMSLogo} 
          alt="GMS Logo" 
          style={logoIconStyle}
          onClick={handleLogoClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.transition = 'transform 0.2s';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />
        
        <div style={{
          background: 'linear-gradient(to right, #ff7e5f, #feb47b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          fontSize: window.innerWidth <= 768 ? '14px' : '18px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100vw - 200px)',
          textAlign: 'center',
        }}>
          SERVICE MANAGEMENT DASHBOARD
        </div>
        
        {/* Target Display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: window.innerWidth <= 768 ? '4px 8px' : '8px 12px',
            borderRadius: '6px',
            minWidth: window.innerWidth <= 768 ? '120px' : '200px',
          }}>
            <div style={{
              fontSize: window.innerWidth <= 768 ? '8px' : '12px',
              marginBottom: '2px',
              opacity: 0.8,
            }}>🎯 Target:</div>
            <div style={{
              fontSize: window.innerWidth <= 768 ? '10px' : '14px',
              fontWeight: 'bold',
              marginBottom: '2px',
            }}>
              {targetLoading 
                ? "Loading..." 
                : `${targetData.formattedAchieved} / ${targetData.formattedTarget}`
              }
            </div>
            <div style={{
              height: window.innerWidth <= 768 ? '3px' : '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}>
              {!targetLoading && (
                <div style={{
                  height: '100%',
                  width: `${targetPercentage}%`,
                  backgroundImage: getProgressGradient(targetPercentage),
                  transition: 'width 0.3s ease',
                }}></div>
              )}
            </div>
          </div>
          
          <div style={{
            marginRight: '30px',
            width: window.innerWidth <= 768 ? '32px' : '36px',
            height: window.innerWidth <= 768 ? '32px' : '36px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            color: '#003366',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: 'bold',
            fontSize: window.innerWidth <= 768 ? '14px' : '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Sidebar with Dropdown */}
      <div style={{
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
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        boxShadow: sidebarOpen && window.innerWidth <= 768 ? '2px 0 10px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* Dashboard Link */}
        <NavLink
          to="/service-dashboard"
          end
          style={({ isActive }) => ({
            padding: '15px 25px',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            display: 'block',
            transition: 'background-color 0.3s',
            fontSize: '16px',
            fontWeight: '500',
            backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
          })}
          onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
        >
          Dashboard
        </NavLink>

        {/* SALES DIVISION Dropdown */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div
            style={{
              padding: '15px 25px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            onClick={() => setSalesOpen(!salesOpen)}
          >
            <span>Sales </span>
            <span style={{ transition: 'transform 0.3s', transform: salesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {salesOpen && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <NavLink
                to="/service-dashboard/create-order"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Create Order ➕
              </NavLink>
              
              <NavLink
                to="/service-dashboard/expenses"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Create Expense ➕
              </NavLink>
              <NavLink
                to="/service-dashboard/field-executive"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
               Field Visits
              </NavLink>
              
              
              <NavLink
                to="/service-dashboard/view-orders"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                View Orders
              </NavLink>
              
              <NavLink
                to="/service-dashboard/view-prospective"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                View Prospects
              </NavLink>
              
              <NavLink
                to="/service-dashboard/view-appointments"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                View Appointments
              </NavLink>
              
              <NavLink
                to="/service-dashboard/daily-record"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Create Daily Report ➕
              </NavLink>
            </div>
          )}
        </div>

        {/* SERVICES DIVISION Dropdown */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div
            style={{
              padding: '15px 25px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            onClick={() => setServicesOpen(!servicesOpen)}
          >
            <span>Services </span>
            <span style={{ transition: 'transform 0.3s', transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {servicesOpen && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <NavLink
                to="/service-dashboard/view-services"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                View Services
              </NavLink>
              
              <NavLink
                to="/service-dashboard/pending-services"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Pending Services
              </NavLink>
              
              <NavLink
                to="/service-dashboard/serviceform"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Mobile Van / Tri-Cycle Service
              </NavLink>
            </div>
          )}
        </div>

        {/* REPORTS DIVISION Dropdown */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div
            style={{
              padding: '15px 25px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            onClick={() => setReportsOpen(!reportsOpen)}
          >
            <span>Reports & Design</span>
            <span style={{ transition: 'transform 0.3s', transform: reportsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {reportsOpen && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <NavLink
                to="/service-dashboard/design-updates"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Design Updates
              </NavLink>
              
              <NavLink
                to="/service-dashboard/ledger"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Ledger
              </NavLink>
              
              <NavLink
                to="/service-dashboard/hour"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Create Report ➕
              </NavLink>
              
              <NavLink
                to="/service-dashboard/hour-reeport"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                View Reports
              </NavLink>
            </div>
          )}
        </div>

        {/* ADDITIONAL DIVISION Dropdown */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.2)',
        }}>
          <div
            style={{
              padding: '15px 25px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
            onClick={() => setAdditionalOpen(!additionalOpen)}
          >
            <span>Additional</span>
            <span style={{ transition: 'transform 0.3s', transform: additionalOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </div>
          
          {additionalOpen && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <NavLink
                to="/service-dashboard/vendors"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Vendors
              </NavLink>
              
              <NavLink
                to="/service-dashboard/price-list"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Price List
              </NavLink>
              
              <NavLink
                to="/service-dashboard/inventory"
                style={({ isActive }) => ({
                  padding: '12px 40px',
                  cursor: 'pointer',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'block',
                  fontSize: '14px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
                })}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                Office Inventory
              </NavLink>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div style={{ marginTop: 'auto', padding: '20px 25px' }}>
          <button
            style={{
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              padding: '12px 0',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%',
              borderRadius: '5px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s',
            }}
            onClick={handleLogout}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#b71c1c'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#d32f2f'}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginLeft: sidebarOpen && window.innerWidth > 768 ? '250px' : '0',
        marginTop: '60px',
        padding: '20px',
        transition: 'margin-left 0.3s ease',
        width: '100%',
        height: 'calc(100vh - 60px)',
        overflowY: 'auto',
        backgroundColor: '#f4f4f4',
      }}>
        {isDashboardHome ? (
          <>
            {/* Stats Cards in a single row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px',
              marginBottom: '20px',
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                borderTop: '4px solid #4CAF50'
              }}>
                <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: '5px' }}>
                  Completed Services
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#4CAF50'
                }}>{stats.totalCompleted}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Successfully delivered</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                borderTop: '4px solid #FF0000'
              }}>
                <div style={{ color: '#FF0000', fontWeight: 'bold', marginBottom: '5px' }}>
                  Pending Services
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#FF0000'
                }}>{stats.totalPending}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Require attention</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                borderTop: '4px solid #FFA500'
              }}>
                <div style={{ color: '#FFA500', fontWeight: 'bold', marginBottom: '5px' }}>
                  In Progress
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#FFA500'
                }}>{stats.inProgress}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Currently being worked on</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                borderTop: '4px solid #003366'
              }}>
                <div style={{ color: '#003366', fontWeight: 'bold', marginBottom: '5px' }}>
                  Total Services
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#003366'
                }}>{stats.totalServices}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>All service requests</div>
              </div>
            </div>

            {/* Upcoming Services Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <ServiceCard
                title="Today's Services"
                services={todaysServices}
                color="#4CAF50"
              />
              <ServiceCard
                title="Tomorrow's Services"
                services={tomorrowsServices}
                color="#2196F3"
              />
              <ServiceCard
                title="Next Week's Services"
                services={nextWeekServices}
                color="#9C27B0"
              />
              <ServiceCard
                title="My Pending Services"
                services={pendingServices}
                color="#FF9800"
              />
              <ServiceCard
                title="My Completed Services"
                services={completedServices}
                color="#607D8B"
              />
            </div>

            {/* Service Status Bar Chart with Filters */}
            <div style={{
              backgroundColor: 'white',
              padding: window.innerWidth <= 768 ? '10px' : '20px',
              borderRadius: '10px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              marginBottom: '20px',
              width: '100%',
              minHeight: window.innerWidth <= 768 ? '350px' : '400px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                borderBottom: '2px solid #f0f0f0',
                paddingBottom: '10px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{
                  fontSize: window.innerWidth <= 768 ? '16px' : '18px',
                  fontWeight: 'bold',
                  color: '#003366',
                }}>
                  Service Status Distribution
                </div>
                
                {/* Filters for the chart only */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}>
                  <label htmlFor="year-select" style={{
                    fontWeight: 'bold',
                    color: '#003366',
                    fontSize: '14px',
                  }}>
                    Year:
                  </label>
                  <select
                    id="year-select"
                    value={year}
                    onChange={(e) => {
                      setYear(parseInt(e.target.value));
                      setSelectedMonth(null);
                      setSelectedWeek(null);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      width: '100px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                    }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <label htmlFor="month-select" style={{
                    fontWeight: 'bold',
                    color: '#003366',
                    fontSize: '14px',
                  }}>
                    Month:
                  </label>
                  <select
                    id="month-select"
                    value={selectedMonth !== null ? selectedMonth : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedMonth(value !== '' ? parseInt(value) : null);
                      setSelectedWeek(null);
                    }}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px',
                      width: '120px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                    }}
                  >
                    <option value="">All Months</option>
                    {monthLabels.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </select>

                  {selectedMonth !== null && (
                    <>
                      <label htmlFor="week-select" style={{
                        fontWeight: 'bold',
                        color: '#003366',
                        fontSize: '14px',
                      }}>
                        Week:
                      </label>
                      <select
                        id="week-select"
                        value={selectedWeek !== null ? selectedWeek : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setSelectedWeek(value !== '' ? parseInt(value) : null);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '14px',
                          width: '100px',
                          borderRadius: '4px',
                          border: '1px solid #ccc',
                        }}
                      >
                        <option value="">All Weeks</option>
                        {weekLabels.map((week, index) => (
                          <option key={week} value={index}>{week}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{
                flex: '1',
                position: 'relative',
                width: '100%',
                height: window.innerWidth <= 768 ? '250px' : '300px'
              }}>
                <Bar
                  data={serviceStatusData}
                  options={chartOptions}
                />
              </div>
              
              <div style={{
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
                borderTop: '1px solid #f0f0f0',
                paddingTop: '15px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#4CAF50',
                    borderRadius: '2px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>Completed: {stats.totalCompleted}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#FF0000',
                    borderRadius: '2px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>Pending: {stats.totalPending}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#FFA500',
                    borderRadius: '2px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>In Progress: {stats.inProgress}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#003366',
                    borderRadius: '2px'
                  }}></div>
                  <span style={{ fontSize: '12px', color: '#666' }}>Total: {stats.totalServices}</span>
                </div>
              </div>
            </div>
          </>
        ) : location.pathname.includes('create-order') ? (
          <>
            {!showOrderForm ? (
              <div style={{
                padding: '20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '20px'
              }}>
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
                  style={{
                    padding: '8px',
                    fontSize: '1rem',
                    width: window.innerWidth <= 768 ? '100%' : '200px',
                    marginRight: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}
                />

                <button
                  onClick={handleSearch}
                  disabled={isLoading || orderNumber.length !== 10}
                  style={{
                    padding: '8px 16px',
                    fontSize: '1rem',
                    backgroundColor: '#003366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: window.innerWidth <= 768 ? '100%' : 'auto'
                  }}
                >
                  {isLoading ? 'Searching...' : 'Search Orders'}
                </button>
                {searchError && (
                  <div style={{
                    color: 'red',
                    marginTop: '8px'
                  }}>
                    {searchError}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ minHeight: 'calc(100vh - 160px)', paddingBottom: '40px' }}>
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
                    navigate('/service-dashboard');
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

export default ServiceDashboard;