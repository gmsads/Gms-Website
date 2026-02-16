// src/components/HRDashboard/ViewHRReports.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ViewHRReports() {
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportDetails, setShowReportDetails] = useState(false);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('');
  const [hrNameFilter, setHrNameFilter] = useState('');
  const [uniqueHRNames, setUniqueHRNames] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [reportsPerPage] = useState(10);

  useEffect(() => {
    fetchAllReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allReports, dateFilter, hrNameFilter]);

  const fetchAllReports = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/hr-reports/all');
      const reports = response.data;
      
      // Sort by date (newest first)
      const sortedReports = reports.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setAllReports(sortedReports);
      setFilteredReports(sortedReports);
      
      // Extract unique HR names for filter dropdown
      const names = [...new Set(reports.map(report => report.hrName))];
      setUniqueHRNames(names);
      
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to fetch reports. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allReports];
    
    // Apply date filter
    if (dateFilter) {
      filtered = filtered.filter(report => 
        new Date(report.date).toDateString() === new Date(dateFilter).toDateString()
      );
    }
    
    // Apply HR name filter
    if (hrNameFilter) {
      filtered = filtered.filter(report => 
        report.hrName === hrNameFilter
      );
    }
    
    setFilteredReports(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setDateFilter('');
    setHrNameFilter('');
  };

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const closeReportDetails = () => {
    setShowReportDetails(false);
    setSelectedReport(null);
  };

  // Pagination logic
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text, maxLength = 40) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const styles = {
    container: {
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      boxSizing: 'border-box',
    },
    header: {
      marginBottom: '30px',
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#003366',
      margin: '0 0 10px 0',
    },
    subtitle: {
      fontSize: '16px',
      color: '#666',
      margin: 0,
    },
    filterSection: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      padding: '20px',
      marginBottom: '20px',
    },
    filterTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#003366',
      marginBottom: '15px',
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '15px',
      alignItems: 'end',
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
    },
    filterLabel: {
      fontSize: '14px',
      fontWeight: '500',
      color: '#555',
    },
    filterInput: {
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      width: '100%',
      boxSizing: 'border-box',
    },
    filterSelect: {
      padding: '10px 12px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      fontSize: '14px',
      width: '100%',
      boxSizing: 'border-box',
      backgroundColor: 'white',
    },
    filterActions: {
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    },
    applyButton: {
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
    },
    clearButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
    },
    statsBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '15px',
      flexWrap: 'wrap',
      gap: '10px',
    },
    statsText: {
      fontSize: '14px',
      color: '#666',
    },
    statsCount: {
      fontWeight: '600',
      color: '#003366',
    },
    tableContainer: {
      overflowX: 'auto',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      backgroundColor: 'white',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: '1200px',
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
      ':hover': {
        backgroundColor: '#f5f5f5',
      },
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
    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      marginTop: '20px',
      flexWrap: 'wrap',
    },
    pageButton: {
      backgroundColor: 'white',
      border: '1px solid #ddd',
      padding: '8px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      minWidth: '40px',
    },
    activePageButton: {
      backgroundColor: '#003366',
      color: 'white',
      borderColor: '#003366',
    },
    pageInfo: {
      fontSize: '14px',
      color: '#666',
      margin: '0 10px',
    },
    // Modal styles
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
    detailModal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '700px',
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
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#003366',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '28px',
      cursor: 'pointer',
      color: '#999',
    },
    hrInfoBar: {
      backgroundColor: '#e8f0fe',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
    },
    hrInfoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    hrIcon: {
      fontSize: '20px',
      color: '#003366',
    },
    hrInfoLabel: {
      fontSize: '14px',
      color: '#666',
    },
    hrInfoValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#003366',
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#003366',
      margin: '20px 0 15px 0',
      paddingBottom: '5px',
      borderBottom: '1px solid #003366',
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
      backgroundColor: '#f8f9fa',
      padding: '10px',
      borderRadius: '6px',
    },
    noData: {
      textAlign: 'center',
      padding: '50px',
      color: '#666',
      fontStyle: 'italic',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    loadingText: {
      textAlign: 'center',
      padding: '50px',
      color: '#666',
      fontSize: '16px',
    },
    errorText: {
      textAlign: 'center',
      padding: '20px',
      color: '#dc3545',
      backgroundColor: '#f8d7da',
      borderRadius: '8px',
      marginBottom: '20px',
    },
  };

  if (isLoading) {
    return <div style={styles.loadingText}>Loading reports...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <div style={styles.popupOverlay} onClick={closeReportDetails}>
          <div style={styles.detailModal} onClick={e => e.stopPropagation()}>
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>Report Details</h3>
              <button style={styles.closeButton} onClick={closeReportDetails}>×</button>
            </div>
            
            {/* HR Info */}
            <div style={styles.hrInfoBar}>
              <div style={styles.hrInfoItem}>
                <span style={styles.hrIcon}>👤</span>
                <div>
                  <span style={styles.hrInfoLabel}>HR Name:</span>
                  <span style={styles.hrInfoValue}> {selectedReport.hrName}</span>
                </div>
              </div>
              <div style={styles.hrInfoItem}>
                <span style={styles.hrIcon}>📅</span>
                <div>
                  <span style={styles.hrInfoLabel}>Report Date:</span>
                  <span style={styles.hrInfoValue}> {formatDate(selectedReport.date)}</span>
                </div>
              </div>
              <div style={styles.hrInfoItem}>
                <span style={styles.hrIcon}>⏰</span>
                <div>
                  <span style={styles.hrInfoLabel}>Submitted:</span>
                  <span style={styles.hrInfoValue}> {formatDateTime(selectedReport.submittedAt)}</span>
                </div>
              </div>
            </div>

            {/* Recruitment & Interviews */}
            <h4 style={styles.sectionTitle}>Recruitment & Interviews</h4>
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

            {/* Work Activities */}
            <h4 style={styles.sectionTitle}>Work Activities</h4>
            {selectedReport.tasksCompleted ? (
              <div style={styles.detailField}>
                <div style={styles.detailFieldLabel}>Tasks Completed</div>
                <div style={styles.detailTextValue}>{selectedReport.tasksCompleted}</div>
              </div>
            ) : (
              <div style={styles.detailFieldValue}>No tasks recorded</div>
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

            {/* Employee Management */}
            <h4 style={styles.sectionTitle}>Employee Management</h4>
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

            {/* Challenges & Plans */}
            {selectedReport.challenges && (
              <>
                <h4 style={styles.sectionTitle}>Challenges</h4>
                <div style={styles.detailTextValue}>{selectedReport.challenges}</div>
              </>
            )}
            
            {selectedReport.tomorrowPlan && (
              <>
                <h4 style={styles.sectionTitle}>Tomorrow's Plan</h4>
                <div style={styles.detailTextValue}>{selectedReport.tomorrowPlan}</div>
              </>
            )}
            
            {selectedReport.additionalNotes && (
              <>
                <h4 style={styles.sectionTitle}>Additional Notes</h4>
                <div style={styles.detailTextValue}>{selectedReport.additionalNotes}</div>
              </>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                style={styles.applyButton}
                onClick={closeReportDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.header}>
        <h1 style={styles.title}>HR Reports Overview</h1>
        <p style={styles.subtitle}>View and analyze all reports submitted by HR team</p>
      </div>

      {/* Error Message */}
      {error && <div style={styles.errorText}>{error}</div>}

      {/* Filter Section */}
      <div style={styles.filterSection}>
        <h3 style={styles.filterTitle}>Filter Reports</h3>
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={styles.filterInput}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>HR Name</label>
            <select
              value={hrNameFilter}
              onChange={(e) => setHrNameFilter(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All HR</option>
              {uniqueHRNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterActions}>
            <button onClick={applyFilters} style={styles.applyButton}>
              Apply Filters
            </button>
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsBar}>
        <span style={styles.statsText}>
          Showing <span style={styles.statsCount}>{currentReports.length}</span> of{' '}
          <span style={styles.statsCount}>{filteredReports.length}</span> reports
        </span>
      </div>

      {/* Reports Table */}
      {filteredReports.length === 0 ? (
        <div style={styles.noData}>
          No reports found matching your criteria.
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>HR Name</th>
                  <th style={styles.th}>Interviews</th>
                  <th style={styles.th}>Scheduled</th>
                  <th style={styles.th}>Contacted</th>
                  <th style={styles.th}>Offers</th>
                  <th style={styles.th}>Accepted</th>
                  <th style={styles.th}>Onboarded</th>
                  <th style={styles.th}>Queries</th>
                  <th style={styles.th}>Documents</th>
                  <th style={styles.th}>Tasks</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentReports.map((report) => (
                  <tr 
                    key={report._id}
                    style={styles.tr}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={styles.td}>{formatDate(report.date)}</td>
                    <td style={styles.td}>{report.hrName}</td>
                    <td style={styles.td}>{report.interviewsTaken || 0}</td>
                    <td style={styles.td}>{report.interviewsScheduled || 0}</td>
                    <td style={styles.td}>{report.candidatesContacted || 0}</td>
                    <td style={styles.td}>{report.offersMade || 0}</td>
                    <td style={styles.td}>{report.offersAccepted || 0}</td>
                    <td style={styles.td}>{report.newEmployeesOnboarded || 0}</td>
                    <td style={styles.td}>{report.employeeQueries || 0}</td>
                    <td style={styles.td}>{report.documentVerifications || 0}</td>
                    <td style={styles.td}>{truncateText(report.tasksCompleted)}</td>
                    <td style={styles.td}>
                      <button 
                        style={styles.viewButton}
                        onClick={() => handleViewReport(report)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.pageButton}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                // Show only current page and neighbors
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      style={{
                        ...styles.pageButton,
                        ...(currentPage === pageNum ? styles.activePageButton : {})
                      }}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (
                  pageNum === currentPage - 3 ||
                  pageNum === currentPage + 3
                ) {
                  return <span key={pageNum} style={styles.pageInfo}>...</span>;
                }
                return null;
              })}
              
              <button
                style={styles.pageButton}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ViewHRReports;