import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths,
  subMonths,
  getDaysInMonth,
  getWeek,
  isSameMonth,
  getYear,
  setYear
} from 'date-fns';
import AutoLogout from '../mainpage/AutoLogout';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

function DesignerDashboard({ loggedInUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState('');
  const [designData, setDesignData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDesigns, setDayDesigns] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const navigate = useNavigate();
  const location = useLocation();

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
    },
    sidebar: {
      width: sidebarOpen ? '250px' : '0',
      backgroundColor: '#003366',
      color: '#fff',
      overflowX: 'hidden',
      transition: '0.3s',
      paddingTop: '60px',
      position: 'fixed',
      top: 0,
      bottom: 0,
      left: 0,
      zIndex: 1,
    },
    sidebarItem: {
      padding: '15px 25px',
      cursor: 'pointer',
      borderBottom: '1px solid rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      display: 'block',
      transition: '0.3s',
    },
    content: {
      marginLeft: sidebarOpen ? '250px' : '0',
      marginTop: '60px',
      padding: '20px',
      transition: 'margin-left 0.3s',
      width: '100%',
      height: 'calc(100vh - 60px)',
      overflowY: 'auto',
      backgroundColor: '#f4f4f4',
    },
    navbar: {
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
    },
    navLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    navCenter: {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '20px',
      fontWeight: 'bold',
    },
    profileContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      marginRight: '40px',
    },
    profileIcon: {
      width: '35px',
      height: '35px',
      borderRadius: '50%',
      backgroundColor: '#fff',
      color: '#003366',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontWeight: 'bold',
    },
    logoutButton: {
      backgroundColor: 'transparent',
      color: '#fff',
      border: '1px solid #fff',
      padding: '6px 10px',
      cursor: 'pointer',
      borderRadius: '5px',
      fontSize: '14px',
    },
    chartCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginTop: '20px',
      maxWidth: '800px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    chartTitle: {
      marginBottom: '10px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#003366',
    },
    calendarHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    monthTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#003366',
    },
    monthNavButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
    },
    calendarGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '10px',
      marginBottom: '20px',
    },
    calendarDayHeader: {
      textAlign: 'center',
      fontWeight: 'bold',
      padding: '10px',
      backgroundColor: '#f0f0f0',
    },
    calendarDay: {
      textAlign: 'center',
      padding: '10px',
      cursor: 'pointer',
      borderRadius: '5px',
      border: '1px solid #ddd',
    },
    currentDay: {
      backgroundColor: '#003366',
      color: 'white',
    },
    otherMonthDay: {
      color: '#aaa',
    },
    selectedDay: {
      backgroundColor: '#005599',
      color: 'white',
    },
    weekSelector: {
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '20px',
    },
    weekButton: {
      padding: '8px 15px',
      backgroundColor: 'green',
      border: '1px solid #ddd',
      borderRadius: '5px',
      cursor: 'pointer',
    },
    activeWeekButton: {
      backgroundColor: '#003366',
      color: 'white',
    },
    designsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
    },
    tableCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginTop: '20px',
      maxWidth: '95%', 
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    tableTitle: {
      marginBottom: '15px',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#003366',
    },
    tableHeader: {
      backgroundColor: '#003366',
      color: 'white',
      padding: '10px',
      textAlign: 'left',
    },
    tableRow: {
      borderBottom: '1px solid #ddd',
      '&:hover': {
        backgroundColor: '#f5f5f5',
      },
    },
    tableCell: {
      padding: '10px',
    },
    yearSelector: {
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      marginBottom: '15px',
      alignItems: 'center',
    },
    yearButton: {
      padding: '8px 15px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
    },
    activeYearButton: {
      backgroundColor: '#005599',
    },
    yearDropdownContainer: {
      position: 'relative',
      display: 'inline-block',
    },
    yearDropdownButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    calendarIcon: {
      marginLeft: '5px', // Changed from marginRight to marginLeft
      fontSize: '16px',
    },
    yearDropdownContent: {
      position: 'absolute',
      backgroundColor: '#f9f9f9',
      minWidth: '100px',
      maxHeight: '200px',
      overflowY: 'auto',
      boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
      zIndex: 1,
      left: 0,
      top: '100%',
    },
    yearDropdownItem: {
      color: 'black',
      padding: '8px 12px',
      textDecoration: 'none',
      display: 'block',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#003366',
        color: 'white',
      },
    },
    selectedYearItem: {
      backgroundColor: '#005599',
      color: 'white',
    },
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const linkStyle = (item) => ({
    ...styles.sidebarItem,
    backgroundColor:
      hoveredItem === item || location.pathname.includes(item.toLowerCase())
        ? '#005599'
        : 'transparent',
    fontWeight:
      location.pathname.includes(item.toLowerCase()) ? 'bold' : 'normal',
  });

  useEffect(() => {
    const fetchDesignData = async () => {
      try {
        const loggedInUserId = JSON.parse(localStorage.getItem('userData'))?._id;
        const res = await axios.get(`http://localhost:5000/api/design-requests`, {
          params: {
            assignedDesigner: loggedInUserId,
            status: ['in-progress', 'completed', 'assigned-to-service', 'pending']
          }
        });
        setDesignData(res.data);
        setLoading(false);
        
        // Set the current week by default
        const today = new Date();
        setSelectedWeek(getWeek(today));
      } catch (err) {
        console.error('Error fetching design data:', err);
        setLoading(false);
      }
    };
    fetchDesignData();
  }, []);

  const getWeeksInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    // eslint-disable-next-line no-unused-vars
    const daysInMonth = getDaysInMonth(currentMonth);
    
    const weeks = [];
    let currentWeekStart = startOfWeek(start, { weekStartsOn: 1 });
    
    while (currentWeekStart <= end) {
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const weekNumber = getWeek(currentWeekStart);
      
      weeks.push({
        start: currentWeekStart,
        end: currentWeekEnd,
        weekNumber,
        isCurrentMonth: isSameMonth(currentWeekStart, currentMonth)
      });
      
      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  };

  const getWeeklyDesignData = (weekNumber) => {
    if (selectedYear !== 2025) {
      return { 
        dayNames: [], 
        dayDates: [], 
        completedCount: [], 
        inProgressCount: [], 
        pendingCount: [] 
      };
    }
    const weeks = getWeeksInMonth();
    const selectedWeekData = weeks.find(w => w.weekNumber === weekNumber);
    
    if (!selectedWeekData) return { dayNames: [], dayDates: [], completedCount: [], inProgressCount: [], pendingCount: [] };
    
    const daysOfWeek = eachDayOfInterval({ 
      start: selectedWeekData.start, 
      end: selectedWeekData.end 
    });
    const dayNames = daysOfWeek.map(day => format(day, 'EEEE'));
    const dayDates = daysOfWeek.map(day => day);
    
    const completedCount = daysOfWeek.map(day => {
      return designData.filter(design => 
        design.requestDate && isSameDay(new Date(design.requestDate), day) &&
        design.status === 'completed'
      ).length;
    });
    
    
    const inProgressCount = daysOfWeek.map(day => {
      return designData.filter(design => 
        design.requestDate && isSameDay(new Date(design.requestDate), day) &&
        (design.status === 'in-progress' || design.status === 'assigned-to-service')
      ).length;
    });
    
    const pendingCount = daysOfWeek.map(day => {
      return designData.filter(design => 
        design.requestDate && isSameDay(new Date(design.requestDate), day) &&
        design.status === 'pending'
      ).length;
    });
    
    return { dayNames, dayDates, completedCount, inProgressCount, pendingCount };
  };

  const { dayNames, dayDates, completedCount, inProgressCount, pendingCount } = selectedWeek ? 
    getWeeklyDesignData(selectedWeek) : 
    { dayNames: [], dayDates: [], completedCount: [], inProgressCount: [], pendingCount: [] };


  const handleBarClick = (elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const selectedDate = dayDates[index];
      const designsForDay = designData.filter(design => 
        design.requestDate && isSameDay(new Date(design.requestDate), selectedDate)
      );
      setSelectedDay(format(selectedDate, 'EEEE, dd/MM/yyyy'));
      setDayDesigns(designsForDay);
    }
  };

 const chartData = {
    labels: dayNames.map((name, i) => `${name}\n${format(dayDates[i], 'dd/MM/yyyy')}`),
    datasets: [
      {
        label: 'Completed',
        data: completedCount,
        backgroundColor: '#4CAF50', // Green for completed
        borderColor: '#388E3C',
        borderWidth: 1,
      },
      {
        label: 'In Progress',
        data: inProgressCount,
        backgroundColor: '#FF9800', // Orange for in-progress
        borderColor: '#F57C00',
        borderWidth: 1,
      },
      {
        label: 'Pending',
        data: pendingCount,
        backgroundColor: '#F44336', // Red for pending
        borderColor: '#D32F2F',
        borderWidth: 1,
      }
    ],
  };


  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { 
        display: selectedYear === 2025, // Hide legend if not 2025
        position: 'top',
      },
      title: {
        display: true,
        text: selectedYear === 2025 
          ? (selectedWeek ? `Designs Assigned in Week ${selectedWeek}, ${selectedYear}` : 'Select a week to view data')
          : 'No data available for selected year',
        font: {
          size: 16
        }
      },
      tooltip: {
        enabled: selectedYear === 2025, // Disable tooltips if not 2025
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            return `${label}: ${context.parsed.y} design(s)`;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          precision: 0
        },
        stacked: true
      },
      x: {
        stacked: true
      }
    },
    onClick: selectedYear === 2025 ? (event, elements) => {
      handleBarClick(elements);
    } : null
  };
  
  
// Update your renderYearSelector function
const renderYearSelector = () => {
  const years = Array.from({ length: 61 }, (_, i) => 2000 + i); // 2000 to 2060

  return (
    <div style={styles.yearDropdownContainer}>
      <button 
        style={styles.yearDropdownButton}
        onClick={() => setShowYearDropdown(!showYearDropdown)}
      >
        {selectedYear}
        <span role="img" aria-label="calendar" style={styles.calendarIcon}>📅</span>
      </button>
      
      {showYearDropdown && (
        <div style={styles.yearDropdownContent}>
          {years.map(year => (
            <div
              key={year}
              style={{
                ...styles.yearDropdownItem,
                ...(year === selectedYear ? styles.selectedYearItem : {})
              }}
              onClick={() => {
                setSelectedYear(year);
                setShowYearDropdown(false);
              }}
            >
              {year}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleWeekSelect = (weekNumber) => {
    setSelectedWeek(weekNumber);
    setSelectedDay(null);
    setDayDesigns([]);
  };

  const renderCalendar = () => {
    const weeks = getWeeksInMonth();
    // eslint-disable-next-line no-unused-vars
    const today = new Date();
  
    return (
      <div>
        {renderYearSelector()}
        <div style={styles.calendarHeader}>
          <button style={styles.monthNavButton} onClick={handlePrevMonth}>
            &lt; Prev
          </button>
          <div style={styles.monthTitle}>
            {format(setYear(currentMonth, selectedYear), 'MMMM yyyy')}
          </div>
          <button style={styles.monthNavButton} onClick={handleNextMonth}>
            Next &gt;
          </button>
        </div>
  
        <div style={styles.weekSelector}>
          {weeks.map((week, index) => (
            <button
              key={index}
              style={{
                ...styles.weekButton,
                ...(week.weekNumber === selectedWeek ? styles.activeWeekButton : {}),
                ...(!week.isCurrentMonth ? { opacity: 0.6 } : {}),
                ...(selectedYear !== 2025 ? { opacity: 0.5, cursor: 'not-allowed' } : {})
              }}
              onClick={() => selectedYear === 2025 && handleWeekSelect(week.weekNumber)}
              disabled={selectedYear !== 2025}
            >
              Week {week.weekNumber}
            </button>
          ))}
        </div>
      </div>
    );
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
        <div style={styles.navLeft}>
          <span style={{ fontSize: '24px', cursor: 'pointer' }} onClick={toggleSidebar}>
            &#9776;
          </span>
        </div>

        <div style={styles.navCenter}>DESIGNER DASHBOARD</div>

        <div style={styles.profileContainer}>
          <div style={styles.profileIcon}>
            {loggedInUser?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button style={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <NavLink
            to="/designer-dashboard"
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/designer-dashboard/assigned-designs"
            style={linkStyle('assigned-designs')}
            onMouseEnter={() => setHoveredItem('assigned-designs')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Assigned Designs
          </NavLink>
          <NavLink
            to="/designer-dashboard/start-design"
            style={linkStyle('start-design')}
            onMouseEnter={() => setHoveredItem('start-design')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Start Design
          </NavLink>
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          <Outlet />

          {location.pathname === '/designer-dashboard' && (
            <>
              {/* Chart Card */}
              <div style={styles.chartCard}>
                {loading ? (
                  <div>Loading design data...</div>
                ) : (
                  <>
                    {renderCalendar()}
                    <Bar data={chartData} options={chartOptions} />
                  </>
                )}
              </div>

              {/* Table Card - Only shown when a day is selected */}
              {selectedDay && (
                <div style={styles.tableCard}>
                  <h3 style={styles.tableTitle}>Designs assigned on {selectedDay}</h3>
                  <table style={styles.designsTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Business</th>
                        <th style={styles.tableHeader}>Contact</th>
                        <th style={styles.tableHeader}>Requirements</th>
                        <th style={styles.tableHeader}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayDesigns.length > 0 ? (
                        dayDesigns.map((design, index) => (
                          <tr key={index} style={styles.tableRow}>
                            <td style={styles.tableCell}>{design.businessName}</td>
                            <td style={styles.tableCell}>
                              {design.contactPerson}<br/>
                              {design.phoneNumber}
                            </td>
                            <td style={styles.tableCell}>{design.requirements}</td>
                            <td style={styles.tableCell}>
                              <span style={{
                                color: design.status === 'completed' ? 'green' : 
                                      design.status === 'in-progress' ? 'orange' : 
                                      design.status === 'pending' ? 'red' : 'blue',
                                fontWeight: 'bold'
                              }}>
                                {design.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={styles.tableCell}>No designs assigned on this day</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DesignerDashboard;