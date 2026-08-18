import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const UnitAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [dateFilter, setDateFilter] = useState('');
  const [todayFilter, setTodayFilter] = useState(false);
  const [employeeNameFilter, setEmployeeNameFilter] = useState('');
  
  const [sortConfig, setSortConfig] = useState({ key: 'loginTime', direction: 'descending' });
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelData, setExcelData] = useState([]);

  // Available years for filter
  const availableYears = Array.from({ length: 6 }, (_, i) =>
    (new Date().getFullYear() - i).toString()
  );

  // Months for filter
  const months = [
    { value: 'all', name: 'All Months' },
    { value: '1', name: 'January' },
    { value: '2', name: 'February' },
    { value: '3', name: 'March' },
    { value: '4', name: 'April' },
    { value: '5', name: 'May' },
    { value: '6', name: 'June' },
    { value: '7', name: 'July' },
    { value: '8', name: 'August' },
    { value: '9', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' }
  ];

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:5000/api/attendance/employee';

      // Build query parameters
      const params = new URLSearchParams();
      
      if (yearFilter && yearFilter !== 'all') {
        params.append('year', yearFilter);
      }
      
      if (monthFilter && monthFilter !== 'all') {
        params.append('month', monthFilter);
      }
      
      if (dateFilter) {
        params.append('date', dateFilter);
      }
      
      if (todayFilter) {
        const today = new Date().toISOString().split('T')[0];
        params.append('date', today);
      }

      // Add employee name filter - FIXED: Only send if not empty
      if (employeeNameFilter && employeeNameFilter.trim() !== '') {
        params.append('employeeName', employeeNameFilter.trim());
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log('Fetching attendance from:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success) {
        let records = Array.isArray(data.data) ? data.data : [];
        
        // CLIENT-SIDE NAME FILTERING (as backup if backend filtering doesn't work)
        if (employeeNameFilter && employeeNameFilter.trim() !== '') {
          const searchTerm = employeeNameFilter.trim().toLowerCase();
          records = records.filter(record => 
            record.employeeName && 
            record.employeeName.toLowerCase().includes(searchTerm)
          );
          console.log(`Filtered to ${records.length} records for name: ${searchTerm}`);
        }
        
        console.log(`Processing ${records.length} records`);
        
        const sortedRecords = records.sort((a, b) => {
          return new Date(b.loginTime) - new Date(a.loginTime);
        });
        
        setAttendanceRecords(sortedRecords);
        toast.success(`Loaded ${sortedRecords.length} attendance records`);
      } else {
        toast.error(data.message || 'Failed to load attendance records');
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      toast.error('Failed to load attendance records. Make sure backend is running.');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced fetch with client-side filtering as fallback
  const fetchAttendanceWithClientFiltering = async () => {
    try {
      setLoading(true);
      
      // First, fetch all records without name filter
      let url = 'http://localhost:5000/api/attendance/employee';
      const params = new URLSearchParams();
      
      if (yearFilter && yearFilter !== 'all') {
        params.append('year', yearFilter);
      }
      
      if (monthFilter && monthFilter !== 'all') {
        params.append('month', monthFilter);
      }
      
      if (dateFilter) {
        params.append('date', dateFilter);
      }
      
      if (todayFilter) {
        const today = new Date().toISOString().split('T')[0];
        params.append('date', today);
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log('Fetching all records from:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        let records = Array.isArray(data.data) ? data.data : [];
        
        // Apply client-side name filtering
        if (employeeNameFilter && employeeNameFilter.trim() !== '') {
          const searchTerm = employeeNameFilter.trim().toLowerCase();
          records = records.filter(record => 
            record.employeeName && 
            record.employeeName.toLowerCase().includes(searchTerm)
          );
          console.log(`Client-side filtered to ${records.length} records for name: ${searchTerm}`);
        }
        
        const sortedRecords = records.sort((a, b) => {
          return new Date(b.loginTime) - new Date(a.loginTime);
        });
        
        setAttendanceRecords(sortedRecords);
        toast.success(`Loaded ${sortedRecords.length} attendance records`);
      } else {
        toast.error(data.message || 'Failed to load attendance records');
        setAttendanceRecords([]);
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
      toast.error('Failed to load attendance records. Make sure backend is running.');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Load records on component mount
  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedRecords = [...attendanceRecords].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];
      
      if (key === 'loginTime' || key === 'date') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    setAttendanceRecords(sortedRecords);
  };

  // Prepare Excel data
  const prepareExcelData = () => {
    return attendanceRecords.map(record => ({
      'Employee Name': record.employeeName,
      'Employee Code': record.employeeCode || 'N/A',
      'Date': new Date(record.date).toLocaleDateString(),
      'Login Time': new Date(record.loginTime).toLocaleString(),
      'Status': record.status,
      'Work Hours': record.workHours || 'N/A',
      'Location': record.location || 'Manufacturing Unit',
      'Department': record.department || 'N/A'
    }));
  };

  // Show Excel preview
  const showExcelView = () => {
    if (attendanceRecords.length === 0) {
      toast.error('No records to export');
      return;
    }

    const data = prepareExcelData();
    setExcelData(data);
    setShowExcelPreview(true);
  };

  // Download Excel file
  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Unit Attendance');
    
    const fileName = `unit_attendance_${yearFilter}_${monthFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success('Excel file downloaded successfully!');
    setShowExcelPreview(false);
  };

  // Close Excel preview
  const closeExcelPreview = () => {
    setShowExcelPreview(false);
    setExcelData([]);
  };

  // Reset all filters
  const resetFilters = () => {
    setYearFilter(currentYear);
    setMonthFilter(currentMonth);
    setDateFilter('');
    setTodayFilter(false);
    setEmployeeNameFilter('');
  };

  // Apply filters - using client-side filtering as fallback
  const applyFilters = () => {
    fetchAttendanceWithClientFiltering();
  };

  // Quick apply when name filter changes (optional)
  const handleNameFilterChange = (e) => {
    setEmployeeNameFilter(e.target.value);
    // You can add a debounce here for real-time filtering
  };

  // Quick search button
  const quickSearchByName = () => {
    if (employeeNameFilter.trim() === '') {
      fetchAttendanceRecords();
    } else {
      fetchAttendanceWithClientFiltering();
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(record => record.status === 'present').length;
    const late = attendanceRecords.filter(record => record.status === 'late').length;
    const absent = attendanceRecords.filter(record => record.status === 'absent').length;
    
    return { total, present, late, absent };
  };

  const stats = calculateStats();

  return (
    <div className="unit-attendance-container">
      <div className="header-section">
        <h2>Manufacturing Unit - Employee Attendance</h2>
        <p className="subtitle">View and manage employee attendance records</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Records</div>
        </div>
        <div className="stat-card present">
          <div className="stat-value">{stats.present}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card late">
          <div className="stat-value">{stats.late}</div>
          <div className="stat-label">Late</div>
        </div>
        <div className="stat-card absent">
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filter Records</h3>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="yearFilter">Year:</label>
            <select
              id="yearFilter"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="monthFilter">Month:</label>
            <select
              id="monthFilter"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
            >
              {months.map(month => (
                <option key={month.value} value={month.value}>
                  {month.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="dateFilter">Specific Date:</label>
            <input
              type="date"
              id="dateFilter"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setTodayFilter(false);
              }}
            />
          </div>

          <div className="filter-group employee-name-filter">
            <label htmlFor="employeeNameFilter">Employee Name:</label>
            <div className="name-filter-input-group">
              <input
                type="text"
                id="employeeNameFilter"
                value={employeeNameFilter}
                onChange={handleNameFilterChange}
                placeholder="Enter employee name..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    quickSearchByName();
                  }
                }}
              />
              {employeeNameFilter && (
                <button 
                  className="clear-name-btn"
                  onClick={() => setEmployeeNameFilter('')}
                  title="Clear name filter"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="todayFilter" className="checkbox-label">
              <input
                type="checkbox"
                id="todayFilter"
                checked={todayFilter}
                onChange={(e) => {
                  setTodayFilter(e.target.checked);
                  if (e.target.checked) setDateFilter('');
                }}
              />
              Today Only
            </label>
          </div>
        </div>

        <div className="filter-actions">
          <button onClick={applyFilters} className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Apply Filters'}
          </button>
          <button onClick={resetFilters} className="btn btn-secondary">
            Reset Filters
          </button>
          <button onClick={showExcelView} className="btn btn-success" disabled={attendanceRecords.length === 0}>
            Export Excel
          </button>
          {employeeNameFilter && (
            <button onClick={quickSearchByName} className="btn btn-info">
              Search Name
            </button>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="records-section">
        <div className="section-header">
          <h3>Attendance Records</h3>
          <div className="records-count">
            Showing {attendanceRecords.length} records
            {employeeNameFilter && (
              <span className="filter-indicator"> for "{employeeNameFilter}"</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-records">
            <div className="loading-spinner"></div>
            <p>Loading attendance records...</p>
          </div>
        ) : (
          <div className="records-table-container">
            <table className="records-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('employeeName')}>
                    Employee Name {sortConfig.key === 'employeeName' &&
                      (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('employeeCode')}>
                    Employee Code {sortConfig.key === 'employeeCode' &&
                      (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('date')}>
                    Date {sortConfig.key === 'date' &&
                      (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('loginTime')}>
                    Login Time {sortConfig.key === 'loginTime' &&
                      (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('status')}>
                    Status {sortConfig.key === 'status' &&
                      (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                  </th>
                  <th>Work Hours</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record._id || record.id}>
                    <td className="employee-name">
                      {record.employeeName}
                      {employeeNameFilter && record.employeeName.toLowerCase().includes(employeeNameFilter.toLowerCase()) && (
                        <span className="name-match-indicator"> 🔍</span>
                      )}
                    </td>
                    <td className="employee-code">{record.employeeCode || 'N/A'}</td>
                    <td className="date">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="login-time">{new Date(record.loginTime).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${record.status}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="work-hours">{record.workHours || 'N/A'}</td>
                    <td className="location">{record.location || 'Manufacturing Unit'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {attendanceRecords.length === 0 && !loading && (
              <div className="no-records">
                <p>
                  {employeeNameFilter 
                    ? `No attendance records found for employee "${employeeNameFilter}" with the selected filters.`
                    : 'No attendance records found for the selected filters.'
                  }
                </p>
                <button onClick={resetFilters} className="btn btn-primary">
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Excel Preview Modal */}
      {showExcelPreview && (
        <div className="excel-preview-modal">
          <div className="excel-preview-content">
            <div className="excel-preview-header">
              <h3>Excel Export Preview</h3>
              <button onClick={closeExcelPreview} className="close-btn">&times;</button>
            </div>

            <div className="excel-table-container">
              <table className="excel-preview-table">
                <thead>
                  <tr>
                    {excelData.length > 0 && Object.keys(excelData[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="excel-preview-actions">
              <button onClick={downloadExcel} className="btn btn-success">
                Download Excel
              </button>
              <button onClick={closeExcelPreview} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .unit-attendance-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background-color: #f8f9fa;
          min-height: 100vh;
        }
        
        .header-section {
          text-align: center;
          margin-bottom: 30px;
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header-section h2 {
          color: #2c3e50;
          margin-bottom: 8px;
          font-size: 28px;
        }
        
        .subtitle {
          color: #6c757d;
          font-size: 16px;
          margin: 0;
        }
        
        /* Statistics Cards */
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: white;
          padding: 25px 20px;
          border-radius: 10px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-left: 4px solid #007bff;
        }
        
        .stat-card.total { border-left-color: #007bff; }
        .stat-card.present { border-left-color: #28a745; }
        .stat-card.late { border-left-color: #ffc107; }
        .stat-card.absent { border-left-color: #dc3545; }
        
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 8px;
        }
        
        .stat-label {
          color: #6c757d;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Filters Section */
        .filters-section {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .filters-section h3 {
          color: #2c3e50;
          margin-bottom: 20px;
          font-size: 20px;
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
        }
        
        .employee-name-filter {
          grid-column: span 2;
        }
        
        .name-filter-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .name-filter-input-group input {
          padding-right: 35px;
          width: 100%;
        }
        
        .clear-name-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          color: #6c757d;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .clear-name-btn:hover {
          color: #dc3545;
        }
        
        .filter-group label {
          font-weight: 600;
          margin-bottom: 8px;
          color: #495057;
          font-size: 14px;
        }
        
        .filter-group select,
        .filter-group input {
          padding: 10px 12px;
          border: 1px solid #ced4da;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          margin-top: 8px;
        }
        
        .filter-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        /* Records Section */
        .records-section {
          background: white;
          padding: 25px;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .section-header h3 {
          color: #2c3e50;
          margin: 0;
          font-size: 20px;
        }
        
        .records-count {
          color: #6c757d;
          font-size: 14px;
          background: #e9ecef;
          padding: 6px 12px;
          border-radius: 15px;
        }
        
        .filter-indicator {
          color: #007bff;
          font-weight: 600;
        }
        
        .name-match-indicator {
          margin-left: 5px;
          font-size: 12px;
        }
        
        /* Buttons */
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s ease;
          min-width: 100px;
        }
        
        .btn-primary { background-color: #007bff; color: white; }
        .btn-success { background-color: #28a745; color: white; }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-info { background-color: #17a2b8; color: white; }
        
        .btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Table Styles */
        .records-table-container {
          overflow-x: auto;
          border: 1px solid #e9ecef;
          border-radius: 8px;
        }
        
        .records-table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
          min-width: 800px;
        }
        
        .records-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #495057;
          padding: 15px 12px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }
        
        .records-table th:hover {
          background-color: #e9ecef;
        }
        
        .records-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
          white-space: nowrap;
        }
        
        .records-table tr:hover {
          background-color: #f8f9fa;
        }
        
        /* Status Badges */
        .status-badge {
          padding: 6px 12px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .status-badge.present {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-badge.absent {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .status-badge.late {
          background-color: #fff3cd;
          color: #856404;
        }
        
        /* Loading and No Records */
        .loading-records {
          padding: 60px 20px;
          text-align: center;
          color: #6c757d;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .no-records {
          padding: 60px 20px;
          text-align: center;
          color: #6c757d;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        
        .no-records p {
          margin-bottom: 20px;
          font-size: 16px;
        }
        
        /* Excel Preview Styles */
        .excel-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .excel-preview-content {
          background-color: white;
          border-radius: 8px;
          width: 95%;
          max-width: 1200px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .excel-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6c757d;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .excel-table-container {
          overflow: auto;
          flex: 1;
          padding: 0;
        }
        
        .excel-preview-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .excel-preview-table th,
        .excel-preview-table td {
          padding: 12px;
          border: 1px solid #dee2e6;
          text-align: left;
          white-space: nowrap;
        }
        
        .excel-preview-table th {
          background-color: #e9ecef;
          font-weight: bold;
          position: sticky;
          top: 0;
        }
        
        .excel-preview-actions {
          padding: 20px;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .unit-attendance-container {
            padding: 15px;
          }
          
          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .employee-name-filter {
            grid-column: span 1;
          }
          
          .filter-actions {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
          }
          
          .section-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
        }
        
        @media (max-width: 480px) {
          .stats-cards {
            grid-template-columns: 1fr;
          }
          
          .stat-value {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default UnitAttendance;