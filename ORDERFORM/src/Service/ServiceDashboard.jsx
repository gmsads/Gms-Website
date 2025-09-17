import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
} from 'chart.js';
import axios from 'axios';
import OrderForm from '../Executive/OrderForm';
import AutoLogout from "../mainpage/AutoLogout";

// Register ChartJS components
ChartJS.register(
  ArcElement,
  ChartJSTooltip,
  ChartJSLegend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

// Month names for display
const monthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [, setSelectedWeek] = useState(null);
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

  // Get current executive from localStorage
  const currentExecutive = localStorage.getItem('userName') || '';
  const username = currentExecutive || 'Service Executive';

  // Router hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Toggle sidebar visibility
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Check if current route is dashboard home
  const isDashboardHome = location.pathname === '/service-dashboard';

  // Generate year options for dropdown (current year ±5 years)
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

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

  // Helper functions for date checking
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isTomorrow = (date) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    );
  };

  const isNextWeek = (date) => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekRange = getWeekRange(nextWeek);
    return date >= nextWeekRange.start && date <= nextWeekRange.end;
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
            inProgress: 0,
            totalServices: totalPending + totalCompleted
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

  // Handle status toggle for current executive's services only
  const handleStatusToggle = async (orderId, rowIndex, currentStatus) => {
    try {
      // First update the UI optimistically
      const updatedStatus = !currentStatus;

      // Update the main services state
      setServices(prevServices =>
        prevServices.map(service => {
          if (service._id === orderId) {
            const updatedRows = [...service.rows];
            updatedRows[rowIndex] = {
              ...updatedRows[rowIndex],
              isCompleted: updatedStatus,
              status: updatedStatus ? 'Completed' : 'Pending'
            };
            return { ...service, rows: updatedRows };
          }
          return service;
        })
      );

      // Find and update the service in the appropriate filtered lists
      const findServiceInLists = () => {
        const lists = [
          todaysServices,
          tomorrowsServices,
          nextWeekServices,
          pendingServices,
          completedServices
        ];

        for (const list of lists) {
          const foundService = list.find(
            s => s.id === orderId && s.rowIndex === rowIndex
          );
          if (foundService) return { ...foundService, isCompleted: updatedStatus, status: updatedStatus ? 'Completed' : 'Pending' };
        }
        return null;
      };

      const updatedService = findServiceInLists();

      // Update all filtered lists
      const updateFilteredList = (list, shouldInclude) => {
        return list.filter(service =>
          !(service.id === orderId && service.rowIndex === rowIndex)
        ).concat(shouldInclude && updatedService ? [updatedService] : []);
      };

      setTodaysServices(prev =>
        updateFilteredList(prev, !updatedStatus && updatedService?.date && isToday(new Date(updatedService.date)))
      );
      setTomorrowsServices(prev =>
        updateFilteredList(prev, !updatedStatus && updatedService?.date && isTomorrow(new Date(updatedService.date)))
      );
      setNextWeekServices(prev =>
        updateFilteredList(prev, !updatedStatus && updatedService?.date && isNextWeek(new Date(updatedService.date)))
      );
      setPendingServices(prev =>
        updateFilteredList(prev, !updatedStatus)
      );
      setCompletedServices(prev =>
        updateFilteredList(prev, updatedStatus)
      );

      // Update stats
      setStats(prev => ({
        ...prev,
        totalPending: updatedStatus ? prev.totalPending - 1 : prev.totalPending + 1,
        totalCompleted: updatedStatus ? prev.totalCompleted + 1 : prev.totalCompleted - 1
      }));

      // Make the API call after UI updates
      const response = await axios.put(
        `/api/orders/${orderId}/rows/${rowIndex}/status`,
        {
          isCompleted: updatedStatus,
          status: updatedStatus ? 'Completed' : 'Pending',
          updatedBy: currentExecutive
        }
      );

      // If the API call fails, revert the changes
      if (!response.data?.success) {
        throw new Error('API update failed');
      }

    } catch (error) {
      console.error('Error updating status:', error);

      // Revert the UI changes if the API call fails
      setServices(prevServices =>
        prevServices.map(service => {
          if (service._id === orderId) {
            const updatedRows = [...service.rows];
            updatedRows[rowIndex] = {
              ...updatedRows[rowIndex],
              isCompleted: !currentStatus, // Revert to original status
              status: currentStatus ? 'Completed' : 'Pending'
            };
            return { ...service, rows: updatedRows };
          }
          return service;
        })
      );

      // Show error message to user
      alert('Failed to update status. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/');
  };

  // Data for service status chart (for current executive only)
  const serviceStatusData = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [
      {
        data: [stats.totalPending, stats.inProgress, stats.totalCompleted],
        backgroundColor: ['#4CAF50', '#FFA500', '#FF0000'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 1,
      },
    ],
  };

  // Data for service trends chart (for current executive only)
  const serviceTrendsData = {
    labels: selectedMonth !== null
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'].slice(
        0, mockWeeklyData[selectedMonth]?.length || 4
      )
      : monthLabels,
    datasets: [
      {
        label: selectedMonth !== null ? 'Weekly Services' : 'Monthly Services',
        data: selectedMonth !== null
          ? mockWeeklyData[selectedMonth] || [0, 0, 0, 0]
          : monthlyServiceData,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Handle pie chart click to navigate to appropriate service list
  const handlePieChartClick = (event, elements) => {
    if (elements.length > 0) {
      const clickedIndex = elements[0].index;
      let status = '';

      switch (clickedIndex) {
        case 0:
          status = 'Pending';
          break;
        case 1:
          status = 'In Progress';
          break;
        case 2:
          status = 'Completed';
          break;
        default:
          return;
      }

      navigate(`/service-dashboard/view-services?status=${status.toLowerCase().replace(' ', '-')}`);
    }
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

  // Get blink class for progress
  const getBlinkClass = (percentage) => {
    return percentage < 100 ? "blink-progress" : "";
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

  // Main render
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <AutoLogout />
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
        zIndex: 2,
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          fontSize: '24px',
          cursor: 'pointer',
          padding: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '40px',
        }} onClick={toggleSidebar}>
          {sidebarOpen ? '☰' : '≡'}
        </div>
        <div style={{
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
            padding: '8px 12px',
            borderRadius: '6px',
            minWidth: '200px',
          }}>
            <div style={{
              fontSize: '12px',
              marginBottom: '4px',
              opacity: 0.8,
            }}>🎯 Target:</div>
            <div style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '4px',
            }}>
              {targetLoading 
                ? "Loading..." 
                : `${targetData.formattedAchieved} / ${targetData.formattedTarget}`
              }
            </div>
            <div style={{
              height: '6px',
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
          }}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Sidebar */}
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
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <NavLink
          to="/service-dashboard"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
          end
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/service-dashboard/expenses"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Create Expense ➕
        </NavLink>
        <NavLink
          to="/service-dashboard/view-services"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View Services
        </NavLink>
        <NavLink
          to="/service-dashboard/pending-services"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Pending Services
        </NavLink>
        <NavLink
          to="/service-dashboard/daily-record"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
        Create Daily Report ➕
        </NavLink>
        <NavLink
          to="/service-dashboard/daily-report"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
        View Daily Report
        </NavLink>

        <NavLink
          to="/service-dashboard/hour"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Create Report ➕
        </NavLink>
        <NavLink
          to="/service-dashboard/hour-reeport"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View Report
        </NavLink>
        <NavLink
          to="/service-dashboard/create-order"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Create Order ➕
        </NavLink>
        <NavLink
          to="/service-dashboard/view-orders"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
         View Orders
        </NavLink>
        <NavLink
          to="/service-dashboard/design-updates"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Design Updates
        </NavLink>
        <NavLink
          to="/service-dashboard/appointments"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Appointments
        </NavLink>
        <NavLink
          to="/service-dashboard/ledger"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Ledger
        </NavLink>
        <NavLink
          to="/service-dashboard/view-appointments"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View Appointments
        </NavLink>
        <NavLink
          to="/service-dashboard/prospects"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Prospects ➕
        </NavLink>
        <NavLink
          to="/service-dashboard/view-prospective"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          View Prospects
        </NavLink>
        <NavLink
          to="/service-dashboard/vendors"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Vendors
        </NavLink>
        <NavLink
          to="/service-dashboard/price-list"
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
            ...(isActive ? {
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontWeight: 'bold',
              fontSize: '16px',
            } : {})
          })}
        >
          Price List
        </NavLink>
        <button
          style={{
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
          }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{
        marginLeft: sidebarOpen ? '250px' : '0',
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
            {/* Year and Month Selector */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              marginBottom: '15px',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              <label htmlFor="year-select" style={{
                fontWeight: 'bold',
                color: '#003366',
                fontSize: '14px',
              }}>
                Select Year:
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
                  padding: '5px',
                  fontSize: '14px',
                  width: '80px',
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <label htmlFor="month-select" style={{
                fontWeight: 'bold',
                color: '#003366',
                fontSize: '14px',
              }}>
                Select Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth !== null ? selectedMonth + 1 : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedMonth(value ? parseInt(value) - 1 : null);
                  setSelectedWeek(null);
                }}
                style={{
                  padding: '5px',
                  fontSize: '14px',
                  width: '100px',
                }}
              >
                <option value="">All Months</option>
                {monthLabels.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>

            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>Pending Services</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#4CAF50'
                }}>{stats.totalPending}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Require attention</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>In Progress</div>
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
              }}>
                <div>Completed</div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: '10px 0',
                  color: '#FF0000'
                }}>{stats.totalCompleted}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>Finished this period</div>
              </div>
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}>
                <div>Total Services</div>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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

            {/* First Row of Charts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
            }}>
              {/* Service Status Overview */}
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '10px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#003366',
                minHeight: '350px',
              }}>
                <div>Service Status {selectedMonth !== null ? `(${monthLabels[selectedMonth]})` : ''}</div>
                <div style={{
                  width: '100%',
                  height: '180px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  margin: '15px 0'
                }}>
                  <Doughnut
                    data={serviceStatusData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            boxWidth: 15,
                            padding: 15
                          }
                        },
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
                      },
                      onClick: handlePieChartClick
                    }}
                  />
                </div>
                <div style={{
                  fontSize: '40px',
                  color: '#002244',
                  marginTop: '10px'
                }}>
                  {stats.totalServices}
                </div>
              </div>

              {/* Service Trends Chart */}
              <div style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginTop: '20px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    marginBottom: '10px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#003366',
                  }}>
                    {selectedMonth !== null
                      ? `Service Trends - ${monthLabels[selectedMonth]} ${year}`
                      : 'Monthly Service Trends'}
                  </div>
                </div>
                <div style={{
                  height: '250px',
                  position: 'relative',
                  marginBottom: '10px'
                }}>
                  <Bar
                    data={serviceTrendsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context) =>
                              `${selectedMonth !== null ? 'Week' : 'Month'} ${context.label}: ${context.raw}`
                          }
                        }
                      },
                      onClick: (event, elements) => {
                        if (elements.length > 0) {
                          if (selectedMonth !== null) {
                            navigate(`/service-dashboard/view-services?week=${elements[0].index + 1}&month=${selectedMonth + 1}&year=${year}`);
                          } else {
                            navigate(`/service-dashboard/view-services?month=${elements[0].index + 1}&year=${year}`);
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { precision: 0 }
                        }
                      }
                    }}
                  />
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
                      marginTop: '10px',
                      fontSize: '12px'
                    }}
                  >
                    View All Months
                  </button>
                )}
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
                    width: '200px',
                    marginRight: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
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
                    marginTop: '10px'
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