import React, { useState, useEffect } from 'react';
import axios from 'axios';

function MyWork() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMyWork();
  }, []);

  const fetchMyWork = async () => {
    try {
      const editorName = localStorage.getItem('userName');
      const response = await axios.get('/api/my-work', {
        params: { editorName: editorName }
      });
      setVideos(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching my work:', error);
      // Sample data
      setVideos([
        { 
          id: 1, 
          title: 'Corporate Video - Client A', 
          status: 'completed', 
          completedDate: '2025-03-25',
          duration: '5:23',
          fileSize: '245 MB',
          feedback: 'Great work! Client loved it.',
          rating: 5
        },
        { 
          id: 2, 
          title: 'Social Media Ads', 
          status: 'completed', 
          completedDate: '2025-03-20',
          duration: '0:45',
          fileSize: '45 MB',
          feedback: 'Excellent editing skills.',
          rating: 4
        },
        { 
          id: 3, 
          title: 'Product Demo Video', 
          status: 'in-progress', 
          completedDate: null,
          duration: null,
          fileSize: null,
          feedback: null,
          rating: null
        }
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

  const renderStars = (rating) => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ color: i <= rating ? '#ffc107' : '#e4e5e9', fontSize: '18px' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  const styles = {
    container: {
      padding: '20px',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003366',
      marginBottom: '30px',
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    statValue: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#003366',
      marginBottom: '10px',
    },
    statLabel: {
      fontSize: '14px',
      color: '#666',
    },
    videoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '20px',
    },
    videoCard: {
      backgroundColor: 'white',
      borderRadius: '10px',
      overflow: 'hidden',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      transition: 'transform 0.3s',
      cursor: 'pointer',
    },
    videoThumbnail: {
      height: '200px',
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
    },
    videoInfo: {
      padding: '15px',
    },
    videoTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '10px',
      color: '#333',
    },
    videoMeta: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '10px',
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block',
    },
    rating: {
      marginTop: '10px',
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
      maxWidth: '600px',
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
    feedbackBox: {
      backgroundColor: '#f8f9fa',
      padding: '15px',
      borderRadius: '5px',
      marginTop: '10px',
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#666',
    },
  };

  const completedCount = videos.filter(v => v.status === 'completed').length;
  const inProgressCount = videos.filter(v => v.status === 'in-progress').length;
  const avgRating = videos.filter(v => v.rating).reduce((sum, v) => sum + v.rating, 0) / (videos.filter(v => v.rating).length || 1);

  if (loading) {
    return <div style={styles.loading}>Loading your work...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>My Work</h2>
      
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{videos.length}</div>
          <div style={styles.statLabel}>Total Videos</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{completedCount}</div>
          <div style={styles.statLabel}>Completed</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{inProgressCount}</div>
          <div style={styles.statLabel}>In Progress</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{avgRating.toFixed(1)}</div>
          <div style={styles.statLabel}>Average Rating</div>
        </div>
      </div>
      
      <div style={styles.videoGrid}>
        {videos.map(video => (
          <div 
            key={video.id} 
            style={styles.videoCard}
            onClick={() => {
              setSelectedVideo(video);
              setShowModal(true);
            }}
          >
            <div style={styles.videoThumbnail}>
              🎬
            </div>
            <div style={styles.videoInfo}>
              <div style={styles.videoTitle}>{video.title}</div>
              <div style={styles.videoMeta}>
                <span style={{...styles.statusBadge, backgroundColor: getStatusColor(video.status)}}>
                  {video.status}
                </span>
              </div>
              {video.completedDate && (
                <div style={styles.videoMeta}>
                  Completed: {video.completedDate}
                </div>
              )}
              {video.rating && (
                <div style={styles.rating}>
                  {renderStars(video.rating)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {showModal && selectedVideo && (
        <>
          <div style={styles.modalOverlay} onClick={() => setShowModal(false)}></div>
          <div style={styles.modal}>
            <button style={styles.modalClose} onClick={() => setShowModal(false)}>&times;</button>
            <h2 style={styles.modalTitle}>{selectedVideo.title}</h2>
            
            <div style={styles.modalRow}>
              <label style={styles.modalLabel}>Status:</label>
              <div style={styles.modalValue}>
                <span style={{...styles.statusBadge, backgroundColor: getStatusColor(selectedVideo.status)}}>
                  {selectedVideo.status}
                </span>
              </div>
            </div>
            
            {selectedVideo.completedDate && (
              <>
                <div style={styles.modalRow}>
                  <label style={styles.modalLabel}>Completed Date:</label>
                  <div style={styles.modalValue}>{selectedVideo.completedDate}</div>
                </div>
                
                <div style={styles.modalRow}>
                  <label style={styles.modalLabel}>Duration:</label>
                  <div style={styles.modalValue}>{selectedVideo.duration}</div>
                </div>
                
                <div style={styles.modalRow}>
                  <label style={styles.modalLabel}>File Size:</label>
                  <div style={styles.modalValue}>{selectedVideo.fileSize}</div>
                </div>
              </>
            )}
            
            {selectedVideo.feedback && (
              <div style={styles.modalRow}>
                <label style={styles.modalLabel}>Feedback:</label>
                <div style={styles.feedbackBox}>
                  <div style={styles.modalValue}>{selectedVideo.feedback}</div>
                  {selectedVideo.rating && (
                    <div style={styles.rating}>
                      {renderStars(selectedVideo.rating)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MyWork;