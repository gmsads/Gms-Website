import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DesignPauseReports = () => {
  const [designs, setDesigns] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [pauseDetails, setPauseDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    fetchDesignsWithPauses();
  }, [filterStatus, filterDate, filterMonth, filterYear]);

  const fetchDesignsWithPauses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/design-requests');
      
      // Extract available years from designs
      const years = extractAvailableYears(response.data);
      setAvailableYears(years);
      
      // Filter designs based on status filter
      let filteredDesigns = response.data;
      if (filterStatus !== 'all') {
        filteredDesigns = filteredDesigns.filter(design => design.status === filterStatus);
      }
      
      // Apply date filter if not 'all'
      if (filterDate !== 'all') {
        filteredDesigns = filteredDesigns.filter(design => {
          return isDesignInDateRange(design, filterDate);
        });
      }
      
      // Apply month filter if not 'all'
      if (filterMonth !== 'all') {
        filteredDesigns = filteredDesigns.filter(design => {
          return isDesignInMonth(design, filterMonth);
        });
      }
      
      // Apply year filter if not 'all'
      if (filterYear !== 'all') {
        filteredDesigns = filteredDesigns.filter(design => {
          return isDesignInYear(design, filterYear);
        });
      }
      
      // Further filter to only designs that have pauses
      const designsWithPauses = filteredDesigns.filter(design => 
        design.pauses && design.pauses.length > 0
      );
      
      setDesigns(designsWithPauses);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching designs:', err);
      setLoading(false);
    }
  };

  // Extract unique years from designs
  const extractAvailableYears = (designs) => {
    const years = new Set();
    designs.forEach(design => {
      if (design.createdAt) {
        const year = new Date(design.createdAt).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Function to check if a design falls within the selected date range
  const isDesignInDateRange = (design, dateRange) => {
    const now = new Date();
    const designDate = new Date(design.createdAt || design.updatedAt);
    
    switch(dateRange) {
      case 'today':
        return isSameDay(designDate, now);
      case 'yesterday':
        { const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return isSameDay(designDate, yesterday); }
      case 'this-week':
        return getWeek(designDate) === getWeek(now) && designDate.getFullYear() === now.getFullYear();
      case 'last-week':
        { const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        return getWeek(designDate) === getWeek(lastWeek) && designDate.getFullYear() === lastWeek.getFullYear(); }
      case 'this-month':
        return designDate.getMonth() === now.getMonth() && designDate.getFullYear() === now.getFullYear();
      case 'last-month':
        { const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return designDate.getMonth() === lastMonth.getMonth() && designDate.getFullYear() === lastMonth.getFullYear(); }
      default:
        return true;
    }
  };

  // Function to check if a design is in the selected month
  const isDesignInMonth = (design, month) => {
    if (!design.createdAt) return false;
    const designDate = new Date(design.createdAt);
    return designDate.getMonth() === parseInt(month);
  };

  // Function to check if a design is in the selected year
  const isDesignInYear = (design, year) => {
    if (!design.createdAt) return false;
    const designDate = new Date(design.createdAt);
    return designDate.getFullYear() === parseInt(year);
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  // Helper function to get week number
  const getWeek = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const fetchPauseDetails = async (designId) => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/design-requests/${designId}/pauses`);
      setPauseDetails(response.data);
      setSelectedDesign(designId);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pause details:', err);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const calculateTotalDesignTime = (design) => {
    if (!design.pauses) return 'N/A';
    
    const totalPauseTime = design.totalPauseTime || 0;
    const timeUsed = design.timeUsedBeforePause || '00:00';
    
    return `${timeUsed} (with ${formatSeconds(totalPauseTime)} paused)`;
  };

  const formatSeconds = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Internal CSS - with additional styles for the date filters
  const styles = `
    .pause-reports-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    .pause-reports-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e1e5e9;
    }
    
    .pause-reports-title {
      color: #2c3e50;
      margin: 0;
      font-size: 28px;
    }
    
    .filters-container {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .filter-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .filter-label {
      font-weight: 600;
      color: #5a6778;
      white-space: nowrap;
      font-size: 14px;
    }
    
    .status-filter, .date-filter, .month-filter, .year-filter {
      padding: 8px 12px;
      border: 1px solid #d1d8e0;
      border-radius: 6px;
      background-color: white;
      font-size: 14px;
      min-width: 120px;
    }
    
    .designs-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .design-card {
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 18px;
      background-color: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .design-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .design-card h3 {
      margin-top: 0;
      margin-bottom: 12px;
      color: #2c3e50;
      font-size: 18px;
    }
    
    .design-card p {
      margin: 6px 0;
      color: #5a6778;
      font-size: 14px;
    }
    
    .design-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f1f3f5;
    }
    
    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .status-in-progress {
      background-color: #ffeaa7;
      color: #d35400;
    }
    
    .status-completed {
      background-color: #d5f5e3;
      color: #27ae60;
    }
    
    .status-paused {
      background-color: #f8d7da;
      color: #c0392b;
    }
    
    .view-details-btn {
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
      width: 100%;
      margin-top: 12px;
    }
    
    .view-details-btn:hover {
      background-color: #2980b9;
    }
    
    .pause-details-panel {
      background-color: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-top: 24px;
    }
    
    .pause-details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e1e5e9;
    }
    
    .pause-details-title {
      color: #2c3e50;
      margin: 0;
    }
    
    .pause-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .summary-card {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    
    .summary-value {
      font-size: 24px;
      font-weight: 700;
      color: #2c3e50;
      margin: 8px 0;
    }
    
    .summary-label {
      color: #5a6778;
      font-size: 14px;
    }
    
    .pauses-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    
    .pauses-table th {
      background-color: #f1f3f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #5a6778;
      border-bottom: 2px solid #e1e5e9;
    }
    
    .pauses-table td {
      padding: 12px;
      border-bottom: 1px solid #e1e5e9;
      color: #5a6778;
    }
    
    .pauses-table tr:hover {
      background-color: #f8f9fa;
    }
    
    .loading-spinner {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }
    
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #5a6778;
    }
    
    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .filter-reset {
      background-color: #e74c3c;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      margin-top: 24px;
      align-self: flex-end;
    }
    
    .filter-reset:hover {
      background-color: #c0392b;
    }
  `;

  // Function to reset all filters
  const resetFilters = () => {
    setFilterStatus('all');
    setFilterDate('all');
    setFilterMonth('all');
    setFilterYear('all');
  };

  return (
    <>
      <style>{styles}</style>
      <div className="pause-reports-container">
        <div className="pause-reports-header">
          <h1 className="pause-reports-title">Design Interruption Reports</h1>
        </div>
        
        <div className="filters-container">
          <div className="filter-row">
            <div className="filter-group">
              <span className="filter-label">Status</span>
              <select 
                className="status-filter"
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="in-progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="filter-group">
              <span className="filter-label">Date Range</span>
              <select 
                className="date-filter"
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This Week</option>
                <option value="last-week">Last Week</option>
                <option value="this-month">This Month</option>
                <option value="last-month">Last Month</option>
              </select>
            </div>
            
            <div className="filter-group">
              <span className="filter-label">Month</span>
              <select 
                className="month-filter"
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="all">All Months</option>
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <span className="filter-label">Year</span>
              <select 
                className="year-filter"
                value={filterYear} 
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="all">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button className="filter-reset" onClick={resetFilters}>
            Reset Filters
          </button>
        </div>
        
        <div className="designs-list">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : designs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⏸️</div>
              <h3>No interrupted designs found</h3>
              <p>There are no design tasks with recorded interruptions for the selected filters.</p>
            </div>
          ) : (
            designs.map(design => (
              <div key={design._id} className="design-card">
                <h3>{design.businessName}</h3>
                <p><strong>Client:</strong> {design.contactPerson}</p>
                <p><strong>Requirements:</strong> {design.requirements.substring(0, 60)}{design.requirements.length > 60 ? '...' : ''}</p>
                <p><strong>Created:</strong> {formatDate(design.createdAt)}</p>
                <p><strong>Total Time Used:</strong> {calculateTotalDesignTime(design)}</p>
                
                <div className="design-meta">
                  <span className={`status-badge status-${design.status}`}>
                    {design.status.replace('-', ' ')}
                  </span>
                  <span>{design.pauses.length} interruption(s)</span>
                </div>
                
                <button 
                  className="view-details-btn"
                  onClick={() => fetchPauseDetails(design._id)}
                >
                  View Interruption Details
                </button>
              </div>
            ))
          )}
        </div>

        {pauseDetails && selectedDesign && (
          <div className="pause-details-panel">
            <div className="pause-details-header">
              <h2 className="pause-details-title">Interruption Details: {pauseDetails.businessName}</h2>
              <button onClick={() => setPauseDetails(null)}>Close</button>
            </div>
            
            <div className="pause-summary">
              <div className="summary-card">
                <div className="summary-value">{pauseDetails.pauses.length}</div>
                <div className="summary-label">Total Interruptions</div>
              </div>
              
              <div className="summary-card">
                <div className="summary-value">{pauseDetails.totalPauseTimeFormatted}</div>
                <div className="summary-label">Total Paused Time</div>
              </div>
              
              <div className="summary-card">
                <div className="summary-value">
                  {pauseDetails.pauses.filter(p => !p.resumeTime).length}
                </div>
                <div className="summary-label">Active Pauses</div>
              </div>
            </div>
            
            <h3>Interruption History</h3>
            {pauseDetails.pauses.length > 0 ? (
              <table className="pauses-table">
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Time Used Before Pause</th>
                    <th>Pause Time</th>
                    <th>Resume Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {pauseDetails.pauses.map((pause, index) => (
                    <tr key={index}>
                      <td>{pause.reason}</td>
                      <td>{pause.timeUsedBeforePause}</td>
                      <td>{formatDate(pause.pauseTime)}</td>
                      <td>{pause.resumeTime ? formatDate(pause.resumeTime) : 'Still paused'}</td>
                      <td>{pause.duration ? `${formatSeconds(pause.duration)}` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No interruption records found for this design.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default DesignPauseReports;