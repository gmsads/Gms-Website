/* eslint-disable no-unused-vars */
// src/components/HRDashboard/DailyHRReport.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DailyHRReport() {
  const [hrInfo, setHrInfo] = useState({
    hrId: '',
    hrName: ''
  });

  const [reportData, setReportData] = useState({
    date: new Date().toISOString().split('T')[0],
    // Interview tracking
    interviewsTaken: '',
    interviewsScheduled: '',
    candidatesContacted: '',
    offersMade: '',
    offersAccepted: '',
    // Work activities
    tasksCompleted: '',
    tasksInProgress: '',
    meetings: '',
    // Employee management
    newEmployeesOnboarded: '',
    employeeQueries: '',
    documentVerifications: '',
    // Challenges and plans
    challenges: '',
    tomorrowPlan: '',
    additionalNotes: ''
  });
  
  const [previousReports, setPreviousReports] = useState([]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHRInfo();
    fetchPreviousReports();
  }, []);

  const fetchHRInfo = async () => {
    try {
      setIsLoading(true);
      const hrId = localStorage.getItem('hrId');
      const userName = localStorage.getItem('userName');
      
      // Try to fetch HR details from employees API
      try {
        const response = await axios.get('/api/employees');
        const employeesData = response.data;
        
        // Find HR in the data
        let currentHR = null;
        if (employeesData.HR) {
          currentHR = employeesData.HR.find(emp => 
            emp._id === hrId || emp.name === userName || emp.username === userName
          );
        }

        if (currentHR) {
          setHrInfo({
            hrId: currentHR._id || hrId,
            hrName: currentHR.name || currentHR.username || userName
          });
        } else {
          // Fallback to localStorage
          setHrInfo({
            hrId: hrId || '',
            hrName: userName || 'HR User'
          });
        }
      } catch (err) {
        // Fallback to localStorage
        setHrInfo({
          hrId: hrId || '',
          hrName: userName || 'HR User'
        });
      }
    } catch (err) {
      console.error('Error fetching HR info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreviousReports = async () => {
    try {
      const hrId = localStorage.getItem('hrId');
      if (!hrId) return;
      
      const response = await axios.get(`/api/hr-reports?hrId=${hrId}`);
      setPreviousReports(response.data);
    } catch (err) {
      console.error('Error fetching previous reports:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate mandatory fields
    if (!reportData.date) {
      setMessage({
        type: 'error',
        text: 'Please select a report date'
      });
      return;
    }
    
    if (!reportData.tasksCompleted.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter the tasks you completed today'
      });
      return;
    }
    
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const reportToSubmit = {
        ...reportData,
        hrId: hrInfo.hrId,
        hrName: hrInfo.hrName,
        submittedAt: new Date().toISOString()
      };

      await axios.post('/api/hr-reports', reportToSubmit);
      
      // Show success popup
      setShowSuccessPopup(true);
      
      // Hide popup after 3 seconds
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 3000);

      // Reset form but keep today's date
      setReportData({
        date: new Date().toISOString().split('T')[0],
        interviewsTaken: '',
        interviewsScheduled: '',
        candidatesContacted: '',
        offersMade: '',
        offersAccepted: '',
        tasksCompleted: '',
        tasksInProgress: '',
        meetings: '',
        newEmployeesOnboarded: '',
        employeeQueries: '',
        documentVerifications: '',
        challenges: '',
        tomorrowPlan: '',
        additionalNotes: ''
      });

      // Refresh previous reports
      fetchPreviousReports();

    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to submit report. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const closeReportDetails = () => {
    setShowReportDetails(false);
    setSelectedReport(null);
  };

  const styles = {
    container: {
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '10px',
      boxSizing: 'border-box',
    },
    header: {
      display: 'flex',
      flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
      justifyContent: 'space-between',
      alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
      marginBottom: '20px',
      gap: '10px',
    },
    title: {
      fontSize: 'clamp(20px, 5vw, 28px)',
      fontWeight: 'bold',
      color: '#003366',
      margin: 0,
      textAlign: window.innerWidth <= 768 ? 'center' : 'left',
    },
    hrInfoBar: {
      backgroundColor: '#e8f0fe',
      padding: '12px 20px',
      borderRadius: '10px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      border: '1px solid #00336620',
    },
    hrInfoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    hrInfoLabel: {
      fontSize: '14px',
      color: '#666',
      fontWeight: '500',
    },
    hrInfoValue: {
      fontSize: '16px',
      color: '#003366',
      fontWeight: '600',
    },
    hrIcon: {
      fontSize: '20px',
      color: '#003366',
    },
    toggleButton: {
      backgroundColor: showPrevious ? '#dc3545' : '#28a745',
      color: 'white',
      border: 'none',
      padding: '12px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      width: window.innerWidth <= 768 ? '100%' : 'auto',
    },
    formCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      padding: window.innerWidth <= 768 ? '15px' : '30px',
      marginBottom: '20px',
    },
    sectionTitle: {
      fontSize: 'clamp(16px, 4vw, 20px)',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '15px',
      paddingBottom: '8px',
      borderBottom: '2px solid #003366',
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '15px',
    },
    label: {
      display: 'block',
      marginBottom: '5px',
      fontWeight: '600',
      color: '#333',
      fontSize: 'clamp(13px, 3.5vw, 14px)',
    },
    mandatoryStar: {
      color: '#dc3545',
      marginLeft: '4px',
      fontSize: '16px',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '16px',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '16px',
      minHeight: '80px',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
    },
    numberInput: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '16px',
      boxSizing: 'border-box',
    },
    dateInput: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: '#f8f9fa',
      boxSizing: 'border-box',
    },
    submitButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '15px 20px',
      borderRadius: '8px',
      fontSize: 'clamp(14px, 4vw, 16px)',
      fontWeight: '600',
      cursor: 'pointer',
      width: '100%',
      marginTop: '10px',
    },
    submitButtonDisabled: {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed',
    },
    message: {
      padding: '12px 15px',
      borderRadius: '8px',
      marginBottom: '15px',
      textAlign: 'center',
      fontSize: '14px',
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      border: '1px solid #c3e6cb',
    },
    errorMessage: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
      border: '1px solid #f5c6cb',
    },
    // Popup styles
    popupOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    popup: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '400px',
      width: '90%',
      textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    },
    popupIcon: {
      fontSize: '60px',
      color: '#28a745',
      marginBottom: '15px',
    },
    popupTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '10px',
    },
    popupMessage: {
      fontSize: '16px',
      color: '#666',
      marginBottom: '20px',
    },
    popupButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '10px 30px',
      borderRadius: '8px',
      fontSize: '16px',
      cursor: 'pointer',
    },
    // Table styles
    tableContainer: {
      overflowX: 'auto',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      minWidth: '900px',
    },
    th: {
      backgroundColor: '#003366',
      color: 'white',
      padding: '15px 10px',
      textAlign: 'left',
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '12px 10px',
      borderBottom: '1px solid #eee',
      fontSize: '14px',
      color: '#333',
    },
    tr: {
      cursor: 'pointer',
      transition: 'background 0.2s',
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
    // Detail modal styles
    detailModal: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: 1001,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    },
    detailHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '10px',
      borderBottom: '2px solid #003366',
    },
    detailTitle: {
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#003366',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#999',
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px',
      marginBottom: '20px',
    },
    detailField: {
      marginBottom: '15px',
    },
    detailFieldLabel: {
      fontSize: '12px',
      color: '#666',
      marginBottom: '3px',
    },
    detailFieldValue: {
      fontSize: '16px',
      fontWeight: '500',
      color: '#333',
    },
    detailTextValue: {
      fontSize: '14px',
      color: '#333',
      lineHeight: '1.5',
      whiteSpace: 'pre-wrap',
    },
    noReports: {
      textAlign: 'center',
      padding: '40px 15px',
      color: '#666',
      fontStyle: 'italic',
      fontSize: '14px',
      backgroundColor: 'white',
      borderRadius: '12px',
    },
    loadingText: {
      textAlign: 'center',
      padding: '40px',
      color: '#666',
      fontSize: '16px',
    },
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const truncateText = (text, maxLength = 30) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (isLoading) {
    return <div style={styles.loadingText}>Loading HR information...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Success Popup */}
      {showSuccessPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popup}>
            <div style={styles.popupIcon}>✅</div>
            <h3 style={styles.popupTitle}>Success!</h3>
            <p style={styles.popupMessage}>Your daily report has been submitted successfully.</p>
            <button 
              style={styles.popupButton}
              onClick={() => setShowSuccessPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <div style={styles.popupOverlay} onClick={closeReportDetails}>
          <div style={styles.detailModal} onClick={e => e.stopPropagation()}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>Report Details</h3>
              <button style={styles.closeButton} onClick={closeReportDetails}>×</button>
            </div>
            
            {/* HR Name in Details */}
            <div style={{ ...styles.hrInfoBar, marginBottom: '20px', backgroundColor: '#f0f7ff' }}>
              <div style={styles.hrInfoItem}>
                <span style={styles.hrIcon}>👤</span>
                <div>
                  <span style={styles.hrInfoLabel}>HR Name:</span>
                  <span style={styles.hrInfoValue}> {selectedReport.hrName}</span>
                </div>
              </div>
            </div>

            <div style={styles.detailField}>
              <div style={styles.detailFieldLabel}>Date</div>
              <div style={styles.detailFieldValue}>
                {new Date(selectedReport.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            <h4 style={{ ...styles.sectionTitle, fontSize: '16px', marginTop: '20px' }}>Recruitment & Interviews</h4>
            <div style={styles.detailGrid}>
              <div>
                <div style={styles.detailFieldLabel}>Interviews Taken</div>
                <div style={styles.detailFieldValue}>{selectedReport.interviewsTaken || 0}</div>
              </div>
              <div>
                <div style={styles.detailFieldLabel}>Interviews Scheduled</div>
                <div style={styles.detailFieldValue}>{selectedReport.interviewsScheduled || 0}</div>
              </div>
              <div>
                <div style={styles.detailFieldLabel}>Candidates Contacted</div>
                <div style={styles.detailFieldValue}>{selectedReport.candidatesContacted || 0}</div>
              </div>
              <div>
                <div style={styles.detailFieldLabel}>Offers Made</div>
                <div style={styles.detailFieldValue}>{selectedReport.offersMade || 0}</div>
              </div>
              <div>
                <div style={styles.detailFieldLabel}>Offers Accepted</div>
                <div style={styles.detailFieldValue}>{selectedReport.offersAccepted || 0}</div>
              </div>
            </div>

            <h4 style={{ ...styles.sectionTitle, fontSize: '16px' }}>Work Activities</h4>
            {selectedReport.tasksCompleted && (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Tasks Completed</div>
                <div style={styles.detailTextValue}>{selectedReport.tasksCompleted}</div>
              </div>
            )}
            {selectedReport.tasksInProgress && (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Tasks In Progress</div>
                <div style={styles.detailTextValue}>{selectedReport.tasksInProgress}</div>
              </div>
            )}
            {selectedReport.meetings && (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Meetings</div>
                <div style={styles.detailTextValue}>{selectedReport.meetings}</div>
              </div>
            )}

            <h4 style={{ ...styles.sectionTitle, fontSize: '16px' }}>Employee Management</h4>
            <div style={styles.detailGrid}>
              <div>
                <div style={styles.detailFieldLabel}>New Employees Onboarded</div>
                <div style={styles.detailFieldValue}>{selectedReport.newEmployeesOnboarded || 0}</div>
              </div>
              <div>
                <div style={styles.detailFieldLabel}>Employee Queries</div>
                <div style={styles.detailFieldValue}>{selectedReport.employeeQueries || 0}</div>
              </div>
              <div>
                <div style={styles.detailFieldLabel}>Documents Verified</div>
                <div style={styles.detailFieldValue}>{selectedReport.documentVerifications || 0}</div>
              </div>
            </div>

            {selectedReport.challenges && (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Challenges</div>
                <div style={styles.detailTextValue}>{selectedReport.challenges}</div>
              </div>
            )}
            
            {selectedReport.tomorrowPlan && (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Tomorrow's Plan</div>
                <div style={styles.detailTextValue}>{selectedReport.tomorrowPlan}</div>
              </div>
            )}
            
            {selectedReport.additionalNotes && (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Additional Notes</div>
                <div style={styles.detailTextValue}>{selectedReport.additionalNotes}</div>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                style={styles.popupButton}
                onClick={closeReportDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <h1 style={styles.title}>Daily HR Report</h1>
        <button 
          style={styles.toggleButton}
          onClick={() => setShowPrevious(!showPrevious)}
        >
          {showPrevious ? 'Hide Previous Reports' : 'View Previous Reports'}
        </button>
      </div>

      {/* HR Info Bar - Only Name */}
      <div style={styles.hrInfoBar}>
        <div style={styles.hrInfoItem}>
          <span style={styles.hrIcon}>👤</span>
          <div>
            <span style={styles.hrInfoLabel}>HR Name:</span>
            <span style={styles.hrInfoValue}> {hrInfo.hrName}</span>
          </div>
        </div>
      </div>

      {/* Report Form */}
      <form onSubmit={handleSubmit} style={styles.formCard}>
        {message.text && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.successMessage : styles.errorMessage)
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>
            Report Date <span style={styles.mandatoryStar}>*</span>
          </label>
          <input
            type="date"
            name="date"
            value={reportData.date}
            onChange={handleChange}
            style={styles.dateInput}
            required
          />
        </div>

        {/* Interview and Recruitment Section */}
        <h3 style={styles.sectionTitle}>Recruitment & Interviews</h3>
        <div style={styles.gridContainer}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Interviews Taken Today</label>
            <input
              type="number"
              name="interviewsTaken"
              value={reportData.interviewsTaken}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Interviews Scheduled</label>
            <input
              type="number"
              name="interviewsScheduled"
              value={reportData.interviewsScheduled}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Candidates Contacted</label>
            <input
              type="number"
              name="candidatesContacted"
              value={reportData.candidatesContacted}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Offers Made</label>
            <input
              type="number"
              name="offersMade"
              value={reportData.offersMade}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Offers Accepted</label>
            <input
              type="number"
              name="offersAccepted"
              value={reportData.offersAccepted}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>
        </div>

        {/* Work Activities Section */}
        <h3 style={styles.sectionTitle}>Work Activities</h3>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Tasks Completed Today <span style={styles.mandatoryStar}>*</span>
          </label>
          <textarea
            name="tasksCompleted"
            value={reportData.tasksCompleted}
            onChange={handleChange}
            style={styles.textarea}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Tasks In Progress</label>
          <textarea
            name="tasksInProgress"
            value={reportData.tasksInProgress}
            onChange={handleChange}
            style={styles.textarea}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Meetings Attended</label>
          <textarea
            name="meetings"
            value={reportData.meetings}
            onChange={handleChange}
            style={styles.textarea}
          />
        </div>

        {/* Employee Management Section */}
        <h3 style={styles.sectionTitle}>Employee Management</h3>
        <div style={styles.gridContainer}>
          <div style={styles.formGroup}>
            <label style={styles.label}>New Employees Onboarded</label>
            <input
              type="number"
              name="newEmployeesOnboarded"
              value={reportData.newEmployeesOnboarded}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Employee Queries Handled</label>
            <input
              type="number"
              name="employeeQueries"
              value={reportData.employeeQueries}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Documents Verified</label>
            <input
              type="number"
              name="documentVerifications"
              value={reportData.documentVerifications}
              onChange={handleChange}
              min="0"
              style={styles.numberInput}
            />
          </div>
        </div>

     
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...styles.submitButton,
            ...(isSubmitting ? styles.submitButtonDisabled : {})
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Daily Report'}
        </button>
      </form>

      {/* Previous Reports Section - Table View */}
      {showPrevious && (
        <div style={styles.previousReportsSection}>
          <h2 style={{ ...styles.title, fontSize: 'clamp(18px, 4vw, 22px)', marginBottom: '15px' }}>
            Previous Reports
          </h2>
          
          {previousReports.length === 0 ? (
            <div style={styles.noReports}>
              No previous reports found.
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>HR Name</th>
                    <th style={styles.th}>Interviews</th>
                    <th style={styles.th}>Scheduled</th>
                    <th style={styles.th}>Offers</th>
                    <th style={styles.th}>Accepted</th>
                    <th style={styles.th}>Onboarded</th>
                    <th style={styles.th}>Tasks</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {previousReports.map((report, index) => (
                    <tr 
                      key={report._id || index}
                      style={styles.tr}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={styles.td}>{formatDate(report.date)}</td>
                      <td style={styles.td}>{report.hrName || 'N/A'}</td>
                      <td style={styles.td}>{report.interviewsTaken || 0}</td>
                      <td style={styles.td}>{report.interviewsScheduled || 0}</td>
                      <td style={styles.td}>{report.offersMade || 0}</td>
                      <td style={styles.td}>{report.offersAccepted || 0}</td>
                      <td style={styles.td}>{report.newEmployeesOnboarded || 0}</td>
                      <td style={styles.td}>{truncateText(report.tasksCompleted)}</td>
                      <td style={styles.td}>
                        <button 
                          style={styles.viewButton}
                          onClick={() => handleViewReport(report)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DailyHRReport;