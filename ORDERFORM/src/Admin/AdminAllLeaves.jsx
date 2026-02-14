// src/components/AdminAllLeaves.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminAllLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [stats, setStats] = useState({
    total: 0,
    totalDays: 0,
    pending: { count: 0, days: 0 },
    approved: { count: 0, days: 0 },
    rejected: { count: 0, days: 0 },
    executives: 0
  });

  const adminName = localStorage.getItem('userName') || 'Admin';

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  useEffect(() => {
    filterLeaves();
  }, [leaves, filter, searchTerm]);

  const fetchAllLeaves = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/leave-requests');
      setLeaves(response.data);
      calculateStats(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching leaves:', error);
      setError(error.response?.data?.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const uniqueExecutives = new Set(data.map(l => l.executiveName)).size;
    const pending = data.filter(l => l.status === 'pending').length;
    const approved = data.filter(l => l.status === 'approved').length;
    const rejected = data.filter(l => l.status === 'rejected').length;
    const totalDays = data.reduce((sum, l) => sum + l.numberOfDays, 0);
    const pendingDays = data.filter(l => l.status === 'pending').reduce((sum, l) => sum + l.numberOfDays, 0);
    const approvedDays = data.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.numberOfDays, 0);
    const rejectedDays = data.filter(l => l.status === 'rejected').reduce((sum, l) => sum + l.numberOfDays, 0);

    setStats({
      total: data.length,
      totalDays,
      pending: { count: pending, days: pendingDays },
      approved: { count: approved, days: approvedDays },
      rejected: { count: rejected, days: rejectedDays },
      executives: uniqueExecutives
    });
  };

  const filterLeaves = () => {
    let filtered = [...leaves];

    if (filter !== 'all') {
      filtered = filtered.filter(l => l.status === filter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.executiveName.toLowerCase().includes(term) ||
        l.reason.toLowerCase().includes(term)
      );
    }

    setFilteredLeaves(filtered);
  };

  const handleReview = (leave) => {
    setSelectedLeave(leave);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (leaveId, status, comments) => {
    try {
      setProcessingId(leaveId);
      
      const response = await axios.put(`/api/leave-request/${leaveId}`, {
        status,
        comments,
        reviewedBy: adminName
      });

      if (response.data) {
        const updatedLeaves = leaves.map(leave => 
          leave._id === leaveId
            ? { 
                ...leave, 
                status, 
                comments, 
                reviewedBy: adminName,
                reviewedOn: new Date().toISOString()
              }
            : leave
        );
        
        setLeaves(updatedLeaves);
        calculateStats(updatedLeaves);
        setShowReviewModal(false);
        setSelectedLeave(null);
      }
    } catch (error) {
      console.error('Error reviewing leave:', error);
      setError(error.response?.data?.message || 'Failed to update leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickAction = async (leaveId, action) => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const comments = action === 'approve' ? 'Approved by admin' : 'Rejected by admin';
    await handleReviewSubmit(leaveId, status, comments);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return '#2ecc71';
      case 'rejected': return '#e74c3c';
      case 'pending': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getStatusBgColor = (status) => {
    switch(status) {
      case 'approved': return '#d4edda';
      case 'rejected': return '#f8d7da';
      case 'pending': return '#fff3cd';
      default: return '#e2e3e5';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Mobile responsive styles - Only 4 cards on all devices
  const styles = {
    container: {
      padding: isMobile ? '12px' : '30px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
    },
    header: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'stretch' : 'center',
      marginBottom: isMobile ? '15px' : '30px',
      gap: isMobile ? '12px' : '15px',
    },
    titleSection: {
      flex: 1,
    },
    title: {
      margin: 0,
      color: '#2c3e50',
      fontSize: isMobile ? '1.3rem' : '2rem',
      fontWeight: '600',
    },
    subtitle: {
      color: '#7f8c8d',
      marginTop: isMobile ? '3px' : '5px',
      fontSize: isMobile ? '0.8rem' : '1rem',
    },
    refreshBtn: {
      padding: isMobile ? '8px 16px' : '10px 20px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '5px',
      transition: 'all 0.3s',
      width: isMobile ? '100%' : 'auto',
    },
    // Only 4 cards - consistent on all devices
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: isMobile ? '10px' : '20px',
      marginBottom: isMobile ? '20px' : '30px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: isMobile ? '15px 10px' : '20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      textAlign: 'center',
      transition: 'transform 0.2s ease',
    },
    statValue: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: 'bold',
      color: '#2c3e50',
      lineHeight: '1.2',
      marginBottom: '5px',
    },
    statLabel: {
      color: '#7f8c8d',
      fontSize: isMobile ? '0.75rem' : '0.9rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '500',
    },
    statDays: {
      fontSize: isMobile ? '0.7rem' : '0.85rem',
      color: '#95a5a6',
      marginTop: '5px',
    },
    filtersSection: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '12px' : '15px',
      marginBottom: isMobile ? '20px' : '25px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    searchBox: {
      flex: 1,
      padding: isMobile ? '12px' : '14px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '10px',
      fontSize: isMobile ? '0.9rem' : '1rem',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s ease',
      ':focus': {
        borderColor: '#667eea',
      },
    },
    filterContainer: {
      display: 'flex',
      gap: isMobile ? '8px' : '10px',
      flexWrap: 'wrap',
      width: '100%',
      justifyContent: isMobile ? 'space-between' : 'flex-start',
    },
    filterBtn: {
      padding: isMobile ? '10px 0' : '10px 20px',
      border: 'none',
      borderRadius: '30px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      flex: isMobile ? 1 : 'none',
      textAlign: 'center',
    },
    filterBtnActive: {
      backgroundColor: '#667eea',
      color: 'white',
      boxShadow: '0 4px 10px rgba(102, 126, 234, 0.3)',
    },
    filterBtnInactive: {
      backgroundColor: 'white',
      color: '#666',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      border: '1px solid #e0e0e0',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: isMobile ? '40px' : '60px',
      backgroundColor: 'white',
      borderRadius: '16px',
      color: '#666',
      fontSize: isMobile ? '0.95rem' : '1.1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    },
    errorMessage: {
      backgroundColor: '#fee',
      color: '#e74c3c',
      padding: isMobile ? '12px' : '15px',
      borderRadius: '10px',
      marginBottom: isMobile ? '20px' : '25px',
      border: '1px solid #fcc',
      fontSize: isMobile ? '0.9rem' : '1rem',
      fontWeight: '500',
    },
    emptyState: {
      textAlign: 'center',
      padding: isMobile ? '40px' : '60px',
      backgroundColor: 'white',
      borderRadius: '16px',
      color: '#999',
      fontSize: isMobile ? '1rem' : '1.2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '16px',
      overflow: 'auto',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      WebkitOverflowScrolling: 'touch',
      marginTop: isMobile ? '15px' : '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: isMobile ? '650px' : '1200px',
    },
    th: {
      textAlign: 'left',
      padding: isMobile ? '12px 10px' : '16px',
      backgroundColor: '#f8fafc',
      color: '#2c3e50',
      fontWeight: '600',
      fontSize: isMobile ? '0.75rem' : '0.9rem',
      borderBottom: '2px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      background: '#f8fafc',
      whiteSpace: 'nowrap',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
    },
    td: {
      padding: isMobile ? '12px 10px' : '16px',
      borderBottom: '1px solid #edf2f7',
      color: '#4a5568',
      fontSize: isMobile ? '0.75rem' : '0.9rem',
    },
    statusBadge: {
      padding: isMobile ? '4px 8px' : '6px 12px',
      borderRadius: '20px',
      fontSize: isMobile ? '0.7rem' : '0.85rem',
      fontWeight: '600',
      display: 'inline-block',
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '45px' : '60px',
      textAlign: 'center',
    },
    actionBtn: {
      padding: isMobile ? '6px' : '6px 12px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.7rem' : '0.85rem',
      fontWeight: '500',
      margin: '2px',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap',
      minWidth: isMobile ? '30px' : 'auto',
      aspectRatio: isMobile ? '1/1' : 'auto',
    },
    approveBtn: {
      backgroundColor: '#2ecc71',
      color: 'white',
    },
    rejectBtn: {
      backgroundColor: '#e74c3c',
      color: 'white',
    },
    reviewBtn: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    disabledBtn: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    actionGroup: {
      display: 'flex',
      gap: isMobile ? '4px' : '6px',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    // Modal Styles - Fully Mobile Responsive
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
      padding: isMobile ? '12px' : '20px',
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: isMobile ? '20px' : '30px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: isMobile ? '90vh' : '80vh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isMobile ? '15px' : '20px',
      paddingBottom: isMobile ? '12px' : '15px',
      borderBottom: '2px solid #f0f0f0',
    },
    modalTitle: {
      margin: 0,
      color: '#2c3e50',
      fontSize: isMobile ? '1.2rem' : '1.4rem',
      fontWeight: '600',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: isMobile ? '28px' : '28px',
      cursor: 'pointer',
      color: '#95a5a6',
      padding: '0 8px',
      lineHeight: 1,
    },
    detailRow: {
      marginBottom: isMobile ? '12px' : '16px',
    },
    detailLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '4px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
    },
    detailValue: {
      color: '#34495e',
      padding: isMobile ? '8px 12px' : '10px 14px',
      backgroundColor: '#f8fafc',
      borderRadius: '10px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      wordBreak: 'break-word',
      border: '1px solid #e2e8f0',
    },
    reviewForm: {
      marginTop: isMobile ? '15px' : '20px',
    },
    radioGroup: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '10px' : '20px',
      marginBottom: isMobile ? '15px' : '20px',
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.9rem' : '1rem',
      padding: isMobile ? '8px' : '0',
      backgroundColor: isMobile ? '#f8fafc' : 'transparent',
      borderRadius: isMobile ? '8px' : '0',
    },
    commentBox: {
      width: '100%',
      padding: isMobile ? '12px' : '14px',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: isMobile ? '0.9rem' : '0.95rem',
      marginBottom: isMobile ? '15px' : '20px',
      resize: 'vertical',
      minHeight: isMobile ? '80px' : '100px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      ':focus': {
        borderColor: '#667eea',
        outline: 'none',
      },
    },
    modalActions: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '10px' : '12px',
    },
    submitBtn: {
      flex: 1,
      padding: isMobile ? '14px' : '14px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: isMobile ? '0.95rem' : '1rem',
      transition: 'all 0.2s ease',
    },
    cancelBtn: {
      flex: 1,
      padding: isMobile ? '14px' : '14px',
      backgroundColor: '#95a5a6',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: isMobile ? '0.95rem' : '1rem',
      transition: 'all 0.2s ease',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Leave Requests</h1>
          <p style={styles.subtitle}>
            {isMobile ? 'Manage employee leaves' : 'Manage and review all employee leave requests'}
          </p>
        </div>
        <button 
          style={styles.refreshBtn} 
          onClick={fetchAllLeaves}
        >
          🔄 {isMobile ? '' : 'Refresh'}
        </button>
      </div>

      {/* Only 4 cards - Total, Pending, Approved, Rejected */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total</div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#f39c12'}}>{stats.pending.count}</div>
          <div style={styles.statLabel}>Pending</div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#2ecc71'}}>{stats.approved.count}</div>
          <div style={styles.statLabel}>Approved</div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#e74c3c'}}>{stats.rejected.count}</div>
          <div style={styles.statLabel}>Rejected</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={styles.filtersSection}>
        <input
          type="text"
          style={styles.searchBox}
          placeholder={isMobile ? "Search..." : "Search by name or reason..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div style={styles.filterContainer}>
          {['all', 'pending', 'approved', 'rejected'].map((type) => (
            <button
              key={type}
              style={{
                ...styles.filterBtn,
                ...(filter === type ? styles.filterBtnActive : styles.filterBtnInactive),
              }}
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {filteredLeaves.length === 0 ? (
        <div style={styles.emptyState}>
          No leave requests found
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Applied</th>
                <th style={styles.th}>Executive</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Days</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave._id}>
                  <td style={styles.td}>{formatDate(leave.appliedOn)}</td>
                  <td style={styles.td}>
                    <strong>{isMobile ? leave.executiveName.split(' ')[0] : leave.executiveName}</strong>
                  </td>
                  <td style={styles.td}>
                    {isMobile 
                      ? `${formatDate(leave.startDate).slice(0,5)}-${formatDate(leave.endDate).slice(0,5)}`
                      : `${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}`
                    }
                  </td>
                  <td style={styles.td}>{leave.numberOfDays}</td>
                  <td style={styles.td}>
                    {isMobile 
                      ? leave.reason.substring(0, 8) + (leave.reason.length > 8 ? '…' : '')
                      : leave.reason.substring(0, 20) + (leave.reason.length > 20 ? '…' : '')
                    }
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusBgColor(leave.status),
                      color: getStatusColor(leave.status),
                      border: `1px solid ${getStatusColor(leave.status)}`,
                    }}>
                      {isMobile ? leave.status.charAt(0).toUpperCase() : leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {leave.status === 'pending' ? (
                      <div style={styles.actionGroup}>
                        <button
                          style={{...styles.actionBtn, ...styles.approveBtn, ...(processingId === leave._id ? styles.disabledBtn : {})}}
                          onClick={() => handleQuickAction(leave._id, 'approve')}
                          disabled={processingId === leave._id}
                          title="Approve"
                        >
                          ✓
                        </button>
                        <button
                          style={{...styles.actionBtn, ...styles.rejectBtn, ...(processingId === leave._id ? styles.disabledBtn : {})}}
                          onClick={() => handleQuickAction(leave._id, 'reject')}
                          disabled={processingId === leave._id}
                          title="Reject"
                        >
                          ✗
                        </button>
                        <button
                          style={{...styles.actionBtn, ...styles.reviewBtn, ...(processingId === leave._id ? styles.disabledBtn : {})}}
                          onClick={() => handleReview(leave)}
                          disabled={processingId === leave._id}
                          title="Review"
                        >
                          📝
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#95a5a6', fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
                        {leave.status === 'approved' ? '✓' : '✗'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedLeave && (
        <div style={styles.modalOverlay} onClick={() => setShowReviewModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Review Leave</h3>
              <button style={styles.closeBtn} onClick={() => setShowReviewModal(false)}>×</button>
            </div>

            <div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Executive:</div>
                <div style={styles.detailValue}>{selectedLeave.executiveName}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Applied:</div>
                <div style={styles.detailValue}>{formatDateTime(selectedLeave.appliedOn)}</div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Dates:</div>
                <div style={styles.detailValue}>
                  {formatDate(selectedLeave.startDate)} - {formatDate(selectedLeave.endDate)} ({selectedLeave.numberOfDays} days)
                </div>
              </div>
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>Reason:</div>
                <div style={styles.detailValue}>{selectedLeave.reason}</div>
              </div>

              <ReviewForm
                leave={selectedLeave}
                onSubmit={handleReviewSubmit}
                onCancel={() => setShowReviewModal(false)}
                processing={processingId === selectedLeave._id}
                isMobile={isMobile}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Review Form Component
function ReviewForm({ leave, onSubmit, onCancel, processing, isMobile }) {
  const [status, setStatus] = useState('approved');
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    onSubmit(leave._id, status, comments);
  };

  const styles = {
    reviewForm: {
      marginTop: isMobile ? '15px' : '20px',
    },
    radioGroup: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '10px' : '20px',
      marginBottom: isMobile ? '15px' : '20px',
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.9rem' : '1rem',
      padding: isMobile ? '8px' : '0',
      backgroundColor: isMobile ? '#f8fafc' : 'transparent',
      borderRadius: isMobile ? '8px' : '0',
    },
    commentBox: {
      width: '100%',
      padding: isMobile ? '12px' : '14px',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: isMobile ? '0.9rem' : '0.95rem',
      marginBottom: isMobile ? '15px' : '20px',
      resize: 'vertical',
      minHeight: isMobile ? '80px' : '100px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
    modalActions: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '10px' : '12px',
    },
    submitBtn: {
      flex: 1,
      padding: isMobile ? '14px' : '14px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: isMobile ? '0.95rem' : '1rem',
    },
    cancelBtn: {
      flex: 1,
      padding: isMobile ? '14px' : '14px',
      backgroundColor: '#95a5a6',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: isMobile ? '0.95rem' : '1rem',
    },
    disabledBtn: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.reviewForm}>
      <div style={styles.radioGroup}>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="status"
            value="approved"
            checked={status === 'approved'}
            onChange={(e) => setStatus(e.target.value)}
            disabled={processing}
          />
          Approve
        </label>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="status"
            value="rejected"
            checked={status === 'rejected'}
            onChange={(e) => setStatus(e.target.value)}
            disabled={processing}
          />
          Reject
        </label>
      </div>

      <textarea
        style={styles.commentBox}
        placeholder="Add comments (optional)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        disabled={processing}
      />

      <div style={styles.modalActions}>
        <button 
          style={{...styles.cancelBtn, ...(processing ? styles.disabledBtn : {})}} 
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </button>
        <button 
          style={{...styles.submitBtn, ...(processing ? styles.disabledBtn : {})}} 
          onClick={handleSubmit}
          disabled={processing}
        >
          {processing ? 'Processing...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

export default AdminAllLeaves;