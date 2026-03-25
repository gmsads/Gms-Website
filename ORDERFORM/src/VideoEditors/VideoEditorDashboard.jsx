import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
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

function VideoEditorDashboard({ loggedInUser }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState('');
  const [videoData, setVideoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayVideos, setDayVideos] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const [stats, setStats] = useState({
    totalVideos: 0,
    completedVideos: 0,
    pendingVideos: 0,
    inProgressVideos: 0
  });
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
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center',
      transition: 'transform 0.3s',
    },
    statValue: {
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#003366',
      marginBottom: '10px',
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
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
      flexWrap: 'wrap',
    },
    weekButton: {
      padding: '8px 15px',
      backgroundColor: '#f0f0f0',
      border: '1px solid #ddd',
      borderRadius: '5px',
      cursor: 'pointer',
    },
    activeWeekButton: {
      backgroundColor: '#003366',
      color: 'white',
    },
    videosTable: {
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
      marginLeft: '5px',
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
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'capitalize',
      display: 'inline-block',
    },
    priorityBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'capitalize',
      display: 'inline-block',
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
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');
  

    if (!isLoggedIn || role !== 'Video Editor') {
      navigate('/');
      return;
    }

    fetchVideoData();
    fetchStats();
  }, [navigate]);

  const fetchVideoData = async () => {
    try {
      const editorName = localStorage.getItem('userName');
      const response = await axios.get('/api/video-editor-tasks', {
        params: { editorName: editorName }
      });
      setVideoData(response.data);
      setLoading(false);
      
      // Set the current week by default
      const today = new Date();
      setSelectedWeek(getWeek(today));
    } catch (error) {
      console.error('Error fetching video data:', error);
      // Sample data for demonstration
      const sampleData = [
        { id: 1, title: 'Corporate Video - Client A', status: 'pending', deadline: '2025-04-15', priority: 'high', requestDate: '2025-03-20', businessName: 'Client A', contactPerson: 'John Doe', phoneNumber: '1234567890', requirements: 'Corporate video editing, 5 minutes duration' },
        { id: 2, title: 'Product Demo Video', status: 'in-progress', deadline: '2025-04-10', priority: 'medium', requestDate: '2025-03-21', businessName: 'Tech Corp', contactPerson: 'Jane Smith', phoneNumber: '0987654321', requirements: 'Product demonstration, 3 minutes' },
        { id: 3, title: 'Social Media Ads', status: 'completed', deadline: '2025-04-05', priority: 'low', requestDate: '2025-03-22', businessName: 'Social Media Co', contactPerson: 'Mike Johnson', phoneNumber: '1122334455', requirements: 'Short ads for social media, 30 seconds each' },
        { id: 4, title: 'Event Highlight Reel', status: 'pending', deadline: '2025-04-20', priority: 'high', requestDate: '2025-03-23', businessName: 'Event Management', contactPerson: 'Sarah Williams', phoneNumber: '5544332211', requirements: 'Event highlights, 10 minutes' }
      ];
      setVideoData(sampleData);
      setLoading(false);
      setSelectedWeek(getWeek(new Date()));
    }
  };

  const fetchStats = async () => {
    try {
      const editorName = localStorage.getItem('userName');
      const response = await axios.get('/api/video-editor-stats', {
        params: { name: editorName }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats
      setStats({
        totalVideos: 12,
        completedVideos: 5,
        pendingVideos: 4,
        inProgressVideos: 3
      });
    }
  };

  const getWeeksInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
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

  const getWeeklyVideoData = (weekNumber) => {
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
      return videoData.filter(video => 
        video.requestDate && isSameDay(new Date(video.requestDate), day) &&
        video.status === 'completed'
      ).length;
    });
    
    const inProgressCount = daysOfWeek.map(day => {
      return videoData.filter(video => 
        video.requestDate && isSameDay(new Date(video.requestDate), day) &&
        video.status === 'in-progress'
      ).length;
    });
    
    const pendingCount = daysOfWeek.map(day => {
      return videoData.filter(video => 
        video.requestDate && isSameDay(new Date(video.requestDate), day) &&
        video.status === 'pending'
      ).length;
    });
    
    return { dayNames, dayDates, completedCount, inProgressCount, pendingCount };
  };

  const { dayNames, dayDates, completedCount, inProgressCount, pendingCount } = selectedWeek ? 
    getWeeklyVideoData(selectedWeek) : 
    { dayNames: [], dayDates: [], completedCount: [], inProgressCount: [], pendingCount: [] };

  const handleBarClick = (elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const selectedDate = dayDates[index];
      const videosForDay = videoData.filter(video => 
        video.requestDate && isSameDay(new Date(video.requestDate), selectedDate)
      );
      setSelectedDay(format(selectedDate, 'EEEE, dd/MM/yyyy'));
      setDayVideos(videosForDay);
    }
  };

  const chartData = {
    labels: dayNames.map((name, i) => `${name}\n${format(dayDates[i], 'dd/MM/yyyy')}`),
    datasets: [
      {
        label: 'Completed',
        data: completedCount,
        backgroundColor: '#4CAF50',
        borderColor: '#388E3C',
        borderWidth: 1,
      },
      {
        label: 'In Progress',
        data: inProgressCount,
        backgroundColor: '#FF9800',
        borderColor: '#F57C00',
        borderWidth: 1,
      },
      {
        label: 'Pending',
        data: pendingCount,
        backgroundColor: '#F44336',
        borderColor: '#D32F2F',
        borderWidth: 1,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { 
        position: 'top',
      },
      title: {
        display: true,
        text: selectedWeek ? `Videos Assigned in Week ${selectedWeek}, ${format(currentMonth, 'yyyy')}` : 'Select a week to view data',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            return `${label}: ${context.parsed.y} video(s)`;
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
    onClick: (event, elements) => {
      handleBarClick(elements);
    }
  };

  const renderYearSelector = () => {
    const years = Array.from({ length: 61 }, (_, i) => 2000 + i);

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
                  setCurrentMonth(setYear(currentMonth, year));
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
    setDayVideos([]);
  };

  const renderCalendar = () => {
    const weeks = getWeeksInMonth();

    return (
      <div>
        {renderYearSelector()}
        <div style={styles.calendarHeader}>
          <button style={styles.monthNavButton} onClick={handlePrevMonth}>
            &lt; Prev
          </button>
          <div style={styles.monthTitle}>
            {format(currentMonth, 'MMMM yyyy')}
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
                ...(!week.isCurrentMonth ? { opacity: 0.6 } : {})
              }}
              onClick={() => handleWeekSelect(week.weekNumber)}
            >
              Week {week.weekNumber}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#28a745';
      case 'in-progress': return '#ffc107';
      case 'pending': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading dashboard...</div>
      </div>
    );
  }

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

        <div style={styles.navCenter}>VIDEO EDITOR DASHBOARD</div>

        <div style={styles.profileContainer}>
          <div style={styles.profileIcon}>
            {loggedInUser?.charAt(0).toUpperCase() || 'V'}
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
            to="/video-editor-dashboard"
            style={linkStyle('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/video-editor-dashboard/assigned-videos"
            style={linkStyle('assigned-videos')}
            onMouseEnter={() => setHoveredItem('assigned-videos')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Assigned Videos
          </NavLink>
          <NavLink
            to="/video-editor-dashboard/upload-video"
            style={linkStyle('upload-video')}
            onMouseEnter={() => setHoveredItem('upload-video')}
            onMouseLeave={() => setHoveredItem('')}
          >
            Upload Video
          </NavLink>
          <NavLink
            to="/video-editor-dashboard/my-work"
            style={linkStyle('my-work')}
            onMouseEnter={() => setHoveredItem('my-work')}
            onMouseLeave={() => setHoveredItem('')}
          >
            My Work
          </NavLink>
        </div>

        {/* Main Content */}
        <div style={styles.content}>
          <Outlet />

          {location.pathname === '/video-editor-dashboard' && (
            <>
              {/* Stats Cards */}
              <div style={styles.statsContainer}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.totalVideos}</div>
                  <div style={styles.statLabel}>Total Videos</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.completedVideos}</div>
                  <div style={styles.statLabel}>Completed</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.inProgressVideos}</div>
                  <div style={styles.statLabel}>In Progress</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.pendingVideos}</div>
                  <div style={styles.statLabel}>Pending</div>
                </div>
              </div>

              {/* Chart Card */}
              <div style={styles.chartCard}>
                {renderCalendar()}
                <Bar data={chartData} options={chartOptions} />
              </div>

              {/* Table Card - Only shown when a day is selected */}
              {selectedDay && (
                <div style={styles.tableCard}>
                  <h3 style={styles.tableTitle}>Videos assigned on {selectedDay}</h3>
                  <table style={styles.videosTable}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Business</th>
                        <th style={styles.tableHeader}>Contact</th>
                        <th style={styles.tableHeader}>Requirements</th>
                        <th style={styles.tableHeader}>Status</th>
                        <th style={styles.tableHeader}>Priority</th>
                        <th style={styles.tableHeader}>Deadline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayVideos.length > 0 ? (
                        dayVideos.map((video, index) => (
                          <tr key={index} style={styles.tableRow}>
                            <td style={styles.tableCell}>{video.businessName || 'N/A'}</td>
                            <td style={styles.tableCell}>
                              {video.contactPerson || 'N/A'}<br/>
                              {video.phoneNumber || ''}
                            </td>
                            <td style={styles.tableCell}>{video.requirements || video.title}</td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: getStatusColor(video.status)
                              }}>
                                {video.status}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.priorityBadge,
                                backgroundColor: getPriorityColor(video.priority)
                              }}>
                                {video.priority}
                              </span>
                            </td>
                            <td style={styles.tableCell}>{video.deadline}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={styles.tableCell}>No videos assigned on this day</td>
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

export default VideoEditorDashboard;