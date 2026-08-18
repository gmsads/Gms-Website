// src/components/ViewLeaveRequests.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ViewLeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  
  const userRole = localStorage.getItem('userRole') || 'executive';
  const executiveName = localStorage.getItem('userName') || '';
  const adminName = localStorage.getItem('userName') || 'Admin';

  const [stats, setStats] = useState({
    total: 0,
    totalDays: 0,
    pending: { count: 0, days: 0 },
    approved: { count: 0, days: 0 },
    rejected: { count: 0, days: 0 },
    executives: 0
  });

  useEffect(() => {
    fetchLeaves();
  }, []);

  useEffect(() => {
    filterLeaves();
  }, [leaves, filter, searchTerm]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      let response;
      
      // Different API endpoints based on user role
      if (userRole === 'admin') {
        // Admin sees all leave requests
        response = await axios.get('/api/admin/leave-requests');
      } else {
        // Executive sees only their own
        response = await axios.get(`/api/leave-requests/${executiveName}`);
      }
      
      setLeaves(response.data);
      calculateStats(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching leaves:', error);
      setError('Failed to fetch leave requests');
      
      // Set mock data for testing if backend fails
      if (userRole === 'admin') {
        setMockData();
      }
    } finally {
      setLoading(false);
    }
  };

  // Mock data for testing if backend is not ready
  const setMockData = () => {
    const mockLeaves = [
      {
        _id: '1',
        executiveName: 'John Doe',
        appliedOn: '2024-02-01T10:30:00',
        startDate: '2024-02-15',
        endDate: '2024-02-17',
        numberOfDays: 3,
        reason: 'Family function',
        status: 'pending',
        reviewedBy: null,
        comments: ''
      },
      {
        _id: '2',
        executiveName: 'Jane Smith',
        appliedOn: '2024-02-02T14:45:00',
        startDate: '2024-02-20',
        endDate: '2024-02-20',
        numberOfDays: 1,
        reason: 'Doctor appointment',
        status: 'approved',
        reviewedBy: 'Admin',
        comments: 'Approved'
      },
      {
        _id: '3',
        executiveName: 'Mike Johnson',
        appliedOn: '2024-02-03T09:15:00',
        startDate: '2024-02-25',
        endDate: '2024-02-28',
        numberOfDays: 4,
        reason: 'Vacation',
        status: 'rejected',
        reviewedBy: 'Admin',
        comments: 'Too many leaves already taken'
      }
    ];
    setLeaves(mockLeaves);
    calculateStats(mockLeaves);
  };

  const calculateStats = (data) => {
    if (userRole === 'admin') {
      // Admin stats
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
    } else {
      // Executive stats
      const totalDays = data.reduce((sum, l) => sum + l.numberOfDays, 0);
      const pendingDays = data.filter(l => l.status === 'pending').reduce((sum, l) => sum + l.numberOfDays, 0);
      const approvedDays = data.filter(l => l.status === 'approved').reduce((sum, l) => sum + l.numberOfDays, 0);
      const rejectedDays = data.filter(l => l.status === 'rejected').reduce((sum, l) => sum + l.numberOfDays, 0);

      setStats({
        total: data.length,
        totalDays,
        pending: { 
          count: data.filter(l => l.status === 'pending').length,
          days: pendingDays
        },
        approved: { 
          count: data.filter(l => l.status === 'approved').length,
          days: approvedDays
        },
        rejected: { 
          count: data.filter(l => l.status === 'rejected').length,
          days: rejectedDays
        },
        executives: 1
      });
    }
  };

  const filterLeaves = () => {
    let filtered = [...leaves];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(l => l.status === filter);
    }

    // Apply search filter (only for admin)
    if (userRole === 'admin' && searchTerm) {
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
        // Update the local state
        const updatedLeaves = leaves.map(leave => 
          leave._id === leaveId || leave.id === leaveId
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
      setError('Failed to update leave request');
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

  const styles = {
    container: {
      padding: '30px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
    },
    titleSection: {
      flex: 1,
    },
    title: {
      margin: 0,
      color: '#2c3e50',
      fontSize: '2rem',
      fontWeight: '600',
    },
    subtitle: {
      color: '#7f8c8d',
      marginTop: '5px',
      fontSize: '1rem',
    },
    refreshBtn: {
      padding: '10px 20px',
      backgroundColor: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.95rem',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      transition: 'all 0.3s',
    },
    statsContainer: {
      display: 'grid',
      gridTemplateColumns: userRole === 'admin' ? 'repeat(6, 1fr)' : 'repeat(4, 1fr)',
      gap: '15px',
      marginBottom: '30px',
    },
    statCard: {
      backgroundColor: 'white',
      padding: '15px',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    statValue: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#2c3e50',
      marginBottom: '3px',
    },
    statLabel: {
      color: '#7f8c8d',
      fontSize: '0.8rem',
      textTransform: 'uppercase',
    },
    statDays: {
      fontSize: '0.8rem',
      color: '#667eea',
      marginTop: '3px',
    },
    filtersSection: {
      display: 'flex',
      gap: '15px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    searchBox: {
      flex: 1,
      padding: '12px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      outline: 'none',
      minWidth: '250px',
      display: userRole === 'admin' ? 'block' : 'none',
    },
    filterContainer: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
    },
    filterBtn: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '25px',
      cursor: 'pointer',
      fontSize: '0.95rem',
      fontWeight: '500',
      transition: 'all 0.3s',
    },
    filterBtnActive: {
      backgroundColor: '#667eea',
      color: 'white',
    },
    filterBtnInactive: {
      backgroundColor: 'white',
      color: '#666',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
    loadingContainer: {
      textAlign: 'center',
      padding: '60px',
      backgroundColor: 'white',
      borderRadius: '12px',
      color: '#666',
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #f5c6cb',
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px',
      backgroundColor: 'white',
      borderRadius: '12px',
      color: '#999',
      fontSize: '1.1rem',
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '12px',
      overflow: 'auto',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: userRole === 'admin' ? '1300px' : '1000px',
    },
    th: {
      textAlign: 'left',
      padding: '15px',
      backgroundColor: '#f8f9fa',
      color: '#495057',
      fontWeight: '600',
      fontSize: '0.95rem',
      borderBottom: '2px solid #dee2e6',
      position: 'sticky',
      top: 0,
      background: '#f8f9fa',
    },
    td: {
      padding: '15px',
      borderBottom: '1px solid #e9ecef',
      color: '#495057',
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: '500',
      display: 'inline-block',
    },
    actionBtn: {
      padding: '6px 12px',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '0.85rem',
      fontWeight: '500',
      margin: '0 3px',
      transition: 'all 0.3s',
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
      gap: '5px',
      flexWrap: 'wrap',
    },
    // Modal Styles
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
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '80vh',
      overflowY: 'auto',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #f0f0f0',
    },
    modalTitle: {
      margin: 0,
      color: '#2c3e50',
      fontSize: '1.3rem',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#95a5a6',
    },
    modalBody: {
      marginBottom: '20px',
    },
    detailRow: {
      marginBottom: '15px',
    },
    detailLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '5px',
      fontSize: '0.9rem',
    },
    detailValue: {
      color: '#34495e',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      fontSize: '0.95rem',
    },
    reviewForm: {
      marginTop: '20px',
    },
    radioGroup: {
      display: 'flex',
      gap: '20px',
      marginBottom: '20px',
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      cursor: 'pointer',
    },
    commentBox: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      marginBottom: '20px',
      resize: 'vertical',
      minHeight: '100px',
    },
    modalActions: {
      display: 'flex',
      gap: '15px',
    },
    submitBtn: {
      flex: 1,
      padding: '12px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
    },
    cancelBtn: {
      flex: 1,
      padding: '12px',
      backgroundColor: '#95a5a6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
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
          <h1 style={styles.title}>
            {userRole === 'admin' ? 'All Leave Requests' : 'My Leave Requests'}
          </h1>
          <p style={styles.subtitle}>
            {userRole === 'admin' 
              ? 'Manage and review all employee leave requests'
              : 'View and track your leave requests'}
          </p>
        </div>
        <button 
          style={styles.refreshBtn} 
          onClick={fetchLeaves}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#5a67d8'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Requests</div>
          {userRole !== 'admin' && <div style={styles.statDays}>{stats.totalDays} days</div>}
        </div>
        
        {userRole === 'admin' && (
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.totalDays}</div>
            <div style={styles.statLabel}>Total Days</div>
          </div>
        )}

        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#f39c12'}}>{stats.pending.count}</div>
          <div style={styles.statLabel}>Pending</div>
          <div style={styles.statDays}>{stats.pending.days} days</div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#2ecc71'}}>{stats.approved.count}</div>
          <div style={styles.statLabel}>Approved</div>
          <div style={styles.statDays}>{stats.approved.days} days</div>
        </div>

        <div style={styles.statCard}>
          <div style={{...styles.statValue, color: '#e74c3c'}}>{stats.rejected.count}</div>
          <div style={styles.statLabel}>Rejected</div>
          <div style={styles.statDays}>{stats.rejected.days} days</div>
        </div>

        {userRole === 'admin' && (
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.executives}</div>
            <div style={styles.statLabel}>Executives</div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div style={styles.filtersSection}>
        {userRole === 'admin' && (
          <input
            type="text"
            style={styles.searchBox}
            placeholder="Search by executive name or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        )}
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
              {type.charAt(0).toUpperCase() + type.slice(1)} 
              {type === 'all' ? ` (${leaves.length})` : ` (${leaves.filter(l => l.status === type).length})`}
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
                <th style={styles.th}>Applied On</th>
                {userRole === 'admin' && <th style={styles.th}>Executive</th>}
                <th style={styles.th}>Start Date</th>
                <th style={styles.th}>End Date</th>
                <th style={styles.th}>Days</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Reviewed By</th>
                <th style={styles.th}>Comments</th>
                {userRole === 'admin' && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((leave) => (
                <tr key={leave._id || leave.id}>
                  <td style={styles.td}>{formatDate(leave.appliedOn)}</td>
                  {userRole === 'admin' && (
                    <td style={styles.td}>
                      <strong>{leave.executiveName}</strong>
                    </td>
                  )}
                  <td style={styles.td}>{formatDate(leave.startDate)}</td>
                  <td style={styles.td}>{formatDate(leave.endDate)}</td>
                  <td style={styles.td}>{leave.numberOfDays}</td>
                  <td style={styles.td}>{leave.reason}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusBgColor(leave.status),
                      color: getStatusColor(leave.status),
                      border: `1px solid ${getStatusColor(leave.status)}`,
                    }}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </td>
                  <td style={styles.td}>{leave.reviewedBy || '-'}</td>
                  <td style={styles.td}>{leave.comments || '-'}</td>
                  {userRole === 'admin' && (
                    <td style={styles.td}>
                      {leave.status === 'pending' ? (
                        <div style={styles.actionGroup}>
                          <button
                            style={{...styles.actionBtn, ...styles.approveBtn, ...(processingId === (leave._id || leave.id) ? styles.disabledBtn : {})}}
                            onClick={() => handleQuickAction(leave._id || leave.id, 'approve')}
                            disabled={processingId === (leave._id || leave.id)}
                            onMouseEnter={(e) => !processingId && (e.target.style.backgroundColor = '#27ae60')}
                            onMouseLeave={(e) => !processingId && (e.target.style.backgroundColor = '#2ecc71')}
                          >
                            ✓ Approve
                          </button>
                          <button
                            style={{...styles.actionBtn, ...styles.rejectBtn, ...(processingId === (leave._id || leave.id) ? styles.disabledBtn : {})}}
                            onClick={() => handleQuickAction(leave._id || leave.id, 'reject')}
                            disabled={processingId === (leave._id || leave.id)}
                            onMouseEnter={(e) => !processingId && (e.target.style.backgroundColor = '#c0392b')}
                            onMouseLeave={(e) => !processingId && (e.target.style.backgroundColor = '#e74c3c')}
                          >
                            ✗ Reject
                          </button>
                          <button
                            style={{...styles.actionBtn, ...styles.reviewBtn, ...(processingId === (leave._id || leave.id) ? styles.disabledBtn : {})}}
                            onClick={() => handleReview(leave)}
                            disabled={processingId === (leave._id || leave.id)}
                          >
                            📝 Review
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#95a5a6', fontSize: '0.85rem' }}>
                          {leave.status === 'approved' ? '✓ Processed' : '✗ Processed'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal - Only for Admin */}
      {showReviewModal && selectedLeave && userRole === 'admin' && (
        <ReviewModal
          leave={selectedLeave}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedLeave(null);
          }}
          onSubmit={handleReviewSubmit}
          processing={processingId === (selectedLeave._id || selectedLeave.id)}
        />
      )}
    </div>
  );
}

// Review Modal Component
function ReviewModal({ leave, onClose, onSubmit, processing }) {
  const [status, setStatus] = useState('approved');
  const [comments, setComments] = useState('');

  const handleSubmit = () => {
    onSubmit(leave._id || leave.id, status, comments);
  };

  const styles = {
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
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '80vh',
      overflowY: 'auto',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #f0f0f0',
    },
    modalTitle: {
      margin: 0,
      color: '#2c3e50',
      fontSize: '1.3rem',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#95a5a6',
    },
    detailRow: {
      marginBottom: '15px',
    },
    detailLabel: {
      fontWeight: '600',
      color: '#2c3e50',
      marginBottom: '5px',
      fontSize: '0.9rem',
    },
    detailValue: {
      color: '#34495e',
      padding: '8px 12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      fontSize: '0.95rem',
    },
    reviewForm: {
      marginTop: '20px',
    },
    radioGroup: {
      display: 'flex',
      gap: '20px',
      marginBottom: '20px',
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      cursor: 'pointer',
    },
    commentBox: {
      width: '100%',
      padding: '12px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '0.95rem',
      marginBottom: '20px',
      resize: 'vertical',
      minHeight: '100px',
    },
    modalActions: {
      display: 'flex',
      gap: '15px',
    },
    submitBtn: {
      flex: 1,
      padding: '12px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
    },
    cancelBtn: {
      flex: 1,
      padding: '12px',
      backgroundColor: '#95a5a6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
    },
    disabledBtn: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Review Leave Request</h3>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div>
          <div style={styles.detailRow}>
            <div style={styles.detailLabel}>Executive:</div>
            <div style={styles.detailValue}>{leave.executiveName}</div>
          </div>
          <div style={styles.detailRow}>
            <div style={styles.detailLabel}>Dates:</div>
            <div style={styles.detailValue}>
              {formatDate(leave.startDate)} to {formatDate(leave.endDate)} ({leave.numberOfDays} days)
            </div>
          </div>
          <div style={styles.detailRow}>
            <div style={styles.detailLabel}>Reason:</div>
            <div style={styles.detailValue}>{leave.reason}</div>
          </div>

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
                onClick={onClose}
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                style={{...styles.submitBtn, ...(processing ? styles.disabledBtn : {})}} 
                onClick={handleSubmit}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewLeaveRequests;