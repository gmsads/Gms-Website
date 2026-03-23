import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const VideoEditorDashboard = () => {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    totalVideos: 0,
    completedVideos: 0,
    pendingVideos: 0,
    inProgressVideos: 0
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('userName');

    if (!isLoggedIn || role !== 'Video Editor') {
      navigate('/');
      return;
    }

    setUserName(name);
    fetchDashboardData();
    fetchTasks();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // You can create an API endpoint for video editor stats
      const response = await axios.get('/api/video-editor-stats', {
        params: { name: localStorage.getItem('userName') }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats if API fails
      setStats({
        totalVideos: 12,
        completedVideos: 5,
        pendingVideos: 4,
        inProgressVideos: 3
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/video-editor-tasks', {
        params: { editorName: localStorage.getItem('userName') }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Sample tasks for demonstration
      setTasks([
        { id: 1, title: 'Corporate Video - Client A', status: 'pending', deadline: '2024-04-15', priority: 'high' },
        { id: 2, title: 'Product Demo Video', status: 'in-progress', deadline: '2024-04-10', priority: 'medium' },
        { id: 3, title: 'Social Media Ads', status: 'completed', deadline: '2024-04-05', priority: 'low' },
        { id: 4, title: 'Event Highlight Reel', status: 'pending', deadline: '2024-04-20', priority: 'high' }
      ]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    navigate('/');
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`/api/video-editor-task/${taskId}`, { status: newStatus });
      // Refresh tasks
      fetchTasks();
      fetchDashboardData();
      setShowTaskModal(false);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task status');
    }
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

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.navbarLeft}>
          <h1 style={styles.navbarTitle}>Video Editor Dashboard</h1>
        </div>
        <div style={styles.navbarRight}>
          <span style={styles.userName}>Welcome, {userName}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={styles.mainContent}>
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

        {/* Tasks Section */}
        <div style={styles.tasksSection}>
          <h2 style={styles.sectionTitle}>My Tasks</h2>
          <div style={styles.tasksTable}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Task Title</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Deadline</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} style={styles.tr}>
                    <td style={styles.td}>{task.title}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(task.status)
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.priorityBadge,
                        backgroundColor: getPriorityColor(task.priority)
                      }}>
                        {task.priority}
                      </span>
                    </td>
                    <td style={styles.td}>{task.deadline}</td>
                    <td style={styles.td}>
                      <button 
                        style={styles.viewBtn}
                        onClick={() => handleViewTask(task)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={styles.recentSection}>
          <h2 style={styles.sectionTitle}>Recent Activity</h2>
          <div style={styles.activityList}>
            <div style={styles.activityItem}>
              <div style={styles.activityIcon}>🎬</div>
              <div style={styles.activityContent}>
                <div style={styles.activityTitle}>Completed editing "Corporate Video"</div>
                <div style={styles.activityTime}>2 hours ago</div>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={styles.activityIcon}>🎥</div>
              <div style={styles.activityContent}>
                <div style={styles.activityTitle}>Started working on "Product Demo"</div>
                <div style={styles.activityTime}>Yesterday</div>
              </div>
            </div>
            <div style={styles.activityItem}>
              <div style={styles.activityIcon}>📹</div>
              <div style={styles.activityContent}>
                <div style={styles.activityTitle}>Uploaded final version of "Social Media Ads"</div>
                <div style={styles.activityTime}>2 days ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Modal */}
      {showTaskModal && selectedTask && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowTaskModal(false)}></div>
          <div style={styles.modal}>
            <button style={styles.modalClose} onClick={() => setShowTaskModal(false)}>&times;</button>
            <h2 style={styles.modalTitle}>{selectedTask.title}</h2>
            
            <div style={styles.modalContent}>
              <div style={styles.modalRow}>
                <strong>Status:</strong>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(selectedTask.status),
                  marginLeft: '10px'
                }}>
                  {selectedTask.status}
                </span>
              </div>
              
              <div style={styles.modalRow}>
                <strong>Priority:</strong>
                <span style={{
                  ...styles.priorityBadge,
                  backgroundColor: getPriorityColor(selectedTask.priority),
                  marginLeft: '10px'
                }}>
                  {selectedTask.priority}
                </span>
              </div>
              
              <div style={styles.modalRow}>
                <strong>Deadline:</strong> {selectedTask.deadline}
              </div>
              
              <div style={styles.modalRow}>
                <strong>Description:</strong>
                <p style={styles.modalDescription}>
                  This is a sample description for the video editing task. You can add detailed instructions, 
                  requirements, and notes for the editor here.
                </p>
              </div>

              <div style={styles.modalActions}>
                <label style={styles.label}>Update Status:</label>
                <select 
                  style={styles.select}
                  value={selectedTask.status}
                  onChange={(e) => handleUpdateTaskStatus(selectedTask.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #003366',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  navbar: {
    backgroundColor: '#003366',
    color: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  navbarLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  navbarTitle: {
    fontSize: '24px',
    margin: 0,
  },
  navbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userName: {
    fontSize: '16px',
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.3s',
  },
  mainContent: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
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
  tasksSection: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    marginBottom: '20px',
    color: '#333',
  },
  tasksTable: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
    fontWeight: 'bold',
  },
  tr: {
    borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '12px',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  viewBtn: {
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  recentSection: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '10px',
    borderBottom: '1px solid #f0f0f0',
  },
  activityIcon: {
    fontSize: '24px',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: '14px',
    color: '#333',
    marginBottom: '4px',
  },
  activityTime: {
    fontSize: '12px',
    color: '#999',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '500px',
    zIndex: 1001,
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalClose: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
  },
  modalTitle: {
    fontSize: '24px',
    marginBottom: '20px',
    color: '#003366',
  },
  modalContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  modalRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  modalDescription: {
    marginTop: '5px',
    lineHeight: '1.5',
    color: '#666',
  },
  modalActions: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #dee2e6',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px',
  },
};

// Add this to your global CSS or in a style tag
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default VideoEditorDashboard;