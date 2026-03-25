import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AssignedVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAssignedVideos();
  }, []);

  const fetchAssignedVideos = async () => {
    try {
      const editorName = localStorage.getItem('userName');
      const response = await axios.get('/api/video-editor-tasks', {
        params: { editorName: editorName }
      });
      setVideos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching videos:', error);
      // Sample data
      setVideos([
        { id: 1, title: 'Corporate Video - Client A', status: 'pending', deadline: '2025-04-15', priority: 'high', businessName: 'Client A', contactPerson: 'John Doe', phone: '1234567890', requirements: 'Corporate video editing, 5 minutes duration', assignedDate: '2025-03-20' },
        { id: 2, title: 'Product Demo Video', status: 'in-progress', deadline: '2025-04-10', priority: 'medium', businessName: 'Tech Corp', contactPerson: 'Jane Smith', phone: '0987654321', requirements: 'Product demonstration, 3 minutes', assignedDate: '2025-03-21' },
        { id: 3, title: 'Social Media Ads', status: 'completed', deadline: '2025-04-05', priority: 'low', businessName: 'Social Media Co', contactPerson: 'Mike Johnson', phone: '1122334455', requirements: 'Short ads for social media, 30 seconds each', assignedDate: '2025-03-22' },
        { id: 4, title: 'Event Highlight Reel', status: 'pending', deadline: '2025-04-20', priority: 'high', businessName: 'Event Management', contactPerson: 'Sarah Williams', phone: '5544332211', requirements: 'Event highlights, 10 minutes', assignedDate: '2025-03-23' }
      ]);
      setLoading(false);
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

  const handleUpdateStatus = async (videoId, newStatus) => {
    try {
      await axios.put(`/api/video-editor-task/${videoId}`, { status: newStatus });
      fetchAssignedVideos();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const filteredVideos = statusFilter === 'all' 
    ? videos 
    : videos.filter(video => video.status === statusFilter);

  const styles = {
    container: {
      padding: '20px',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      flexWrap: 'wrap',
      gap: '15px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003366',
      margin: 0,
    },
    filterContainer: {
      display: 'flex',
      gap: '10px',
    },
    filterButton: {
      padding: '8px 16px',
      border: '1px solid #ddd',
      borderRadius: '5px',
      cursor: 'pointer',
      backgroundColor: '#fff',
      transition: 'all 0.3s',
    },
    activeFilter: {
      backgroundColor: '#003366',
      color: 'white',
      borderColor: '#003366',
    },
    tableContainer: {
      overflowX: 'auto',
      backgroundColor: 'white',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
    },
    th: {
      textAlign: 'left',
      padding: '15px',
      backgroundColor: '#003366',
      color: 'white',
      fontWeight: 'bold',
    },
    td: {
      padding: '12px 15px',
      borderBottom: '1px solid #eee',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
      textTransform: 'capitalize',
    },
    priorityBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
      textTransform: 'capitalize',
    },
    viewButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
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
    modalRow: {
      marginBottom: '15px',
    },
    modalLabel: {
      fontWeight: 'bold',
      marginBottom: '5px',
      display: 'block',
    },
    modalValue: {
      color: '#666',
    },
    select: {
      width: '100%',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #ccc',
      fontSize: '14px',
      marginTop: '5px',
    },
    updateButton: {
      backgroundColor: '#28a745',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '14px',
      marginTop: '20px',
      width: '100%',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#666',
    },
  };

  if (loading) {
    return <div style={styles.loading}>Loading assigned videos...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Assigned Videos</h2>
        <div style={styles.filterContainer}>
          <button 
            style={{...styles.filterButton, ...(statusFilter === 'all' ? styles.activeFilter : {})}}
            onClick={() => setStatusFilter('all')}
          >
            All
          </button>
          <button 
            style={{...styles.filterButton, ...(statusFilter === 'pending' ? styles.activeFilter : {})}}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button 
            style={{...styles.filterButton, ...(statusFilter === 'in-progress' ? styles.activeFilter : {})}}
            onClick={() => setStatusFilter('in-progress')}
          >
            In Progress
          </button>
          <button 
            style={{...styles.filterButton, ...(statusFilter === 'completed' ? styles.activeFilter : {})}}
            onClick={() => setStatusFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Business</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Priority</th>
              <th style={styles.th}>Deadline</th>
              <th style={styles.th}>Assigned Date</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredVideos.map(video => (
              <tr key={video.id}>
                <td style={styles.td}>{video.title}</td>
                <td style={styles.td}>{video.businessName}</td>
                <td style={styles.td}>
                  <span style={{...styles.statusBadge, backgroundColor: getStatusColor(video.status)}}>
                    {video.status}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{...styles.priorityBadge, backgroundColor: getPriorityColor(video.priority)}}>
                    {video.priority}
                  </span>
                </td>
                <td style={styles.td}>{video.deadline}</td>
                <td style={styles.td}>{video.assignedDate}</td>
                <td style={styles.td}>
                  <button style={styles.viewButton} onClick={() => {
                    setSelectedVideo(video);
                    setShowModal(true);
                  }}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedVideo && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}></div>
          <div style={styles.modal}>
            <button style={styles.modalClose} onClick={() => setShowModal(false)}>&times;</button>
            <h2 style={styles.modalTitle}>{selectedVideo.title}</h2>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Business:</label>
              <div style={styles.modalValue}>{selectedVideo.businessName}</div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Contact Person:</label>
              <div style={styles.modalValue}>{selectedVideo.contactPerson}</div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Phone:</label>
              <div style={styles.modalValue}>{selectedVideo.phone}</div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Requirements:</label>
              <div style={styles.modalValue}>{selectedVideo.requirements}</div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Deadline:</label>
              <div style={styles.modalValue}>{selectedVideo.deadline}</div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Priority:</label>
              <div style={styles.modalValue}>
                <span style={{...styles.priorityBadge, backgroundColor: getPriorityColor(selectedVideo.priority)}}>
                  {selectedVideo.priority}
                </span>
              </div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Current Status:</label>
              <div style={styles.modalValue}>
                <span style={{...styles.statusBadge, backgroundColor: getStatusColor(selectedVideo.status)}}>
                  {selectedVideo.status}
                </span>
              </div>
            </div>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Update Status:</label>
              <select 
                style={styles.select}
                value={selectedVideo.status}
                onChange={(e) => handleUpdateStatus(selectedVideo.id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AssignedVideos;