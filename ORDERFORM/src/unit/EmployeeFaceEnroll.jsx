import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const EmployeeFaceEnroll = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [usingFallback, setUsingFallback] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [showRecords, setShowRecords] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  
  // Filters
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [dateFilter, setDateFilter] = useState('');
  const [todayFilter, setTodayFilter] = useState(false);
  
  const [sortConfig, setSortConfig] = useState({ key: 'loginTime', direction: 'descending' });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
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

 // Enhanced duplicate check with detailed logging
const hasEmployeeLoggedInToday = (empName) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLogins = JSON.parse(localStorage.getItem('todayEmployeeLogins') || '{}');

  console.log('Checking duplicates for:', empName);
  console.log('Today logins:', todayLogins[today] || []);

  if (!todayLogins[today]) return false;

  const isDuplicate = todayLogins[today].some(name =>
    name.toLowerCase() === empName.toLowerCase()
  );
  
  console.log('Is duplicate:', isDuplicate);
  return isDuplicate;
};

// Enhanced record function
const recordEmployeeLogin = (empName) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLogins = JSON.parse(localStorage.getItem('todayEmployeeLogins') || '{}');

  if (!todayLogins[today]) {
    todayLogins[today] = [];
  }

  const employeeExists = todayLogins[today].some(name =>
    name.toLowerCase() === empName.toLowerCase()
  );

  if (!employeeExists) {
    todayLogins[today].push(empName);
    localStorage.setItem('todayEmployeeLogins', JSON.stringify(todayLogins));
    console.log('Recorded login for:', empName);
  } else {
    console.log('Employee already recorded today:', empName);
  }
};

 

  // Initialize the component
  useEffect(() => {
    const storedEmployeeName = localStorage.getItem('currentEmployeeName');
    if (storedEmployeeName) {
      setEmployeeName(storedEmployeeName);
    }

    setUsingFallback(true);
    toast.info("Using photo capture mode for attendance");

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      setRecordsLoading(true);
      let url = 'http://localhost:5000/api/attendance/employee';
  
      // Build query parameters - FIXED LOGIC
      const params = new URLSearchParams();
      
      // Always send year and month, handle "all" on backend
      if (yearFilter && yearFilter !== 'all') {
        params.append('year', yearFilter);
      }
      
      if (monthFilter) {
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
  
      console.log('Fetching attendance from:', url);
  
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
  
      const data = await response.json();
      console.log('API Response:', data);
  
      if (data.success) {
        const records = Array.isArray(data.data) ? data.data : [];
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
      setRecordsLoading(false);
    }
  };
  // Prepare Excel data
  const prepareExcelData = () => {
    return attendanceRecords.map(record => ({
      'Employee Name': record.employeeName,
      'Employee Code': record.employeeCode,
      'Date': new Date(record.date).toLocaleDateString(),
      'Login Time': new Date(record.loginTime).toLocaleString(),
      'Status': record.status,
      'Work Hours': record.workHours || 0,
      'Location': record.location || 'Manufacturing Unit'
    }));
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedRecords = [...attendanceRecords].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    setAttendanceRecords(sortedRecords);
  };

  // Toggle records view
  const toggleRecordsView = () => {
    if (!showRecords) {
      fetchAttendanceRecords();
    }
    setShowRecords(!showRecords);
  };

  // Start camera
  const startCamera = async () => {
    try {
      setLoading(true);
      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraActive(true);
          setLoading(false);
          setCameraError(null);
          toast.success("Camera activated successfully!");
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setLoading(false);
      setCameraActive(false);

      if (err.name === 'NotFoundError') {
        setCameraError('Camera not found. Please check if a camera is connected.');
        toast.error('Camera not found.');
      } else if (err.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
        toast.error('Camera permission denied.');
      } else if (err.name === 'NotSupportedError') {
        setCameraError('Camera not supported in this browser.');
        toast.error('Camera not supported.');
      } else {
        setCameraError(`Camera error: ${err.message}`);
        toast.error(`Camera error: ${err.message}`);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    toast.info("Camera turned off");
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      console.error("Cannot capture photo: Camera not ready");
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const photoData = canvas.toDataURL('image/jpeg', 0.8);
      console.log("Photo captured successfully");
      return photoData;
    } catch (error) {
      console.error("Error capturing photo:", error);
      return null;
    }
  };

 
 // Mark attendance with photo - IMPROVED DUPLICATE CHECKING
const markAttendanceWithPhoto = async () => {
  if (!cameraActive) {
    toast.error("Please start the camera first");
    return;
  }

  if (!employeeName || employeeName.trim() === '') {
    toast.error("Please enter your Employee Name");
    return;
  }

  const trimmedName = employeeName.trim();

  // Enhanced duplicate check with popup confirmation
  if (hasEmployeeLoggedInToday(trimmedName)) {
    // Show custom confirmation popup instead of simple toast
    const confirmed = window.confirm(
      `⚠️ ATTENTION: ${trimmedName} has already logged in today.\n\n` +
      `Do you want to mark attendance again?\n\n` +
      `✅ Only use this if it's a different person with the same name.\n` +
      `❌ Cancel if this is the same person.`
    );
    
    if (!confirmed) {
      toast.warning("Attendance marking cancelled.");
      return;
    }
    // If confirmed, proceed with marking attendance (for cases where multiple people have same name)
  }

  try {
    setLoading(true);

    const photoData = capturePhoto();

    if (!photoData) {
      toast.error("Could not capture photo. Please try again.");
      setLoading(false);
      return;
    }

    console.log("Sending attendance request for:", trimmedName);

    const response = await fetch('http://localhost:5000/api/attendance/mark-employee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeName: trimmedName,
        image: photoData,
        timestamp: new Date().toISOString()
      })
    });

    // Check response status before parsing JSON
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', errorText);
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    console.log('Attendance response:', data);

    if (data.success) {
      // Record the login in localStorage
      recordEmployeeLogin(trimmedName);
      // Save employee name for future use
      localStorage.setItem('currentEmployeeName', trimmedName);
      
      toast.success(`🎉 Attendance recorded for ${data.name || trimmedName}!`);
      
      if (showRecords) {
        fetchAttendanceRecords(); // Refresh the records view
      }
      
      stopCamera();
      setEmployeeName(''); // Clear the input for next use
    } else {
      // Handle specific backend duplicate error
      if (data.message && data.message.includes('already marked')) {
        toast.error(`❌ ${data.message}`);
        // Update localStorage to reflect this
        recordEmployeeLogin(trimmedName);
      } else {
        toast.error(data.message || 'Attendance recording failed.');
      }
    }
  } catch (err) {
    console.error("Attendance error:", err);
    
    if (err.message.includes('404')) {
      toast.error("Server endpoint not found. Please check backend connection.");
    } else if (err.message.includes('500')) {
      toast.error("Server error. Please try again.");
    } else {
      toast.error("Error recording attendance. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      toast.success("Camera permission granted! Now click 'Start Camera'.");
      setCameraError(null);
    } catch (err) {
      console.error("Permission request failed:", err);
      toast.error("Camera permission denied. Please allow camera access.");
      setCameraError('Camera permission denied. Please allow camera access.');
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setYearFilter(currentYear);
    setMonthFilter(currentMonth);
    setDateFilter('');
    setTodayFilter(false);
    fetchAttendanceRecords();
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
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Attendance');
    
    const fileName = `employee_attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success('Excel file downloaded successfully!');
    setShowExcelPreview(false);
  };

  // Close Excel preview
  const closeExcelPreview = () => {
    setShowExcelPreview(false);
    setExcelData([]);
  };

  const canMarkAttendance = cameraActive && employeeName;

  return (
    <div className="attendance-container">
      <h2>FLEX Manufacturing - Employee Attendance</h2>

      <div className="status-section">
        <div className={`status-indicator ${usingFallback ? 'fallback' : 'loaded'}`}>
          {usingFallback ? '✓ Photo Capture Mode Active' : '✓ Face Recognition Active'}
        </div>
        {loading && <div className="loading-spinner"></div>}
      </div>

      {usingFallback && (
        <div className="fallback-notice">
          <p>📸 Using photo capture mode for attendance recording</p>
        </div>
      )}

      <div className="employee-id-section">
        <label htmlFor="employeeName">Employee Name:</label>
        <input
          type="text"
          id="employeeName"
          value={employeeName}
          onChange={(e) => setEmployeeName(e.target.value)}
          placeholder="Enter your full name as registered"
          required
        />
        <p className="help-text">
          Please enter your full name exactly as it appears in the system
        </p>
      </div>

      <div className="video-section">
        <video
          ref={videoRef}
          id="video"
          width="400"
          height="300"
          autoPlay
          muted
          playsInline
          style={{ display: cameraActive ? 'block' : 'none' }}
        />
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        {!cameraActive && (
          <div className="camera-placeholder">
            {cameraError ? (
              <div className="camera-error">
                <p>❌ {cameraError}</p>
                <button onClick={requestCameraPermission} className="btn btn-warning">
                  Grant Camera Permission
                </button>
              </div>
            ) : (
              <p>Camera not active. Click "Start Camera" to begin.</p>
            )}
          </div>
        )}
      </div>

      <div className="controls">
        <button
          onClick={startCamera}
          disabled={loading || cameraActive}
          className="btn btn-primary"
        >
          {loading ? 'Starting...' : 'Start Camera'}
        </button>
        <button
          onClick={markAttendanceWithPhoto}
          disabled={loading || !canMarkAttendance}
          className="btn btn-success"
        >
          {loading ? 'Processing...' : 'Capture Photo & Mark Attendance'}
        </button>
        <button
          onClick={stopCamera}
          disabled={!cameraActive}
          className="btn btn-secondary"
        >
          Stop Camera
        </button>
        <button
          onClick={toggleRecordsView}
          className="btn btn-info"
        >
          {showRecords ? 'Hide Records' : 'View Records'}
        </button>
      </div>

      {cameraError && (
        <div className="error-section">
          <h3>Camera Access Issue</h3>
          <p>{cameraError}</p>
          <div className="troubleshooting-steps">
            <h4>How to fix:</h4>
            <ol>
              <li>Check if your device has a camera</li>
              <li>Ensure camera permissions are allowed</li>
              <li>Make sure no other application is using the camera</li>
              <li>Try refreshing the page</li>
              <li>Use a different browser (Chrome recommended)</li>
            </ol>
          </div>
        </div>
      )}

      {showRecords && (
        <div className="records-section">
          <h3>Employee Attendance Records</h3>

          <div className="filters">
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

            <button onClick={fetchAttendanceRecords} className="btn btn-primary">
              Apply Filters
            </button>
            <button onClick={resetFilters} className="btn btn-secondary">
              Reset Filters
            </button>
            <button onClick={showExcelView} className="btn btn-success" disabled={attendanceRecords.length === 0}>
              Export Excel
            </button>
          </div>

          {recordsLoading ? (
            <div className="loading-records">Loading records...</div>
          ) : (
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('employeeName')}>
                      Employee Name {sortConfig.key === 'employeeName' &&
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
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record._id}>
                      <td>{record.employeeName}</td>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{new Date(record.loginTime).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${record.status}`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {attendanceRecords.length === 0 && (
                <div className="no-records">
                  <p>No attendance records found for the selected filters.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
      
        .attendance-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        h2 {
          color: #2c3e50;
          margin-bottom: 20px;
          text-align: center;
        }
        
        .status-section {
          margin: 20px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        
        .status-indicator {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 500;
        }
        
        .status-indicator.loaded {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .status-indicator.fallback {
          background-color: #e2e3e5;
          color: #383d41;
          border: 1px solid #d6d8db;
        }
        
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .fallback-notice {
          background-color: #e2e3e5;
          border: 1px solid #d6d8db;
          color: #383d41;
          padding: 12px;
          border-radius: 6px;
          margin: 10px 0;
          text-align: center;
        }
        
        .employee-id-section {
          margin: 20px 0;
        }
        
        .employee-id-section label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
          color: #495057;
        }
        
        .employee-id-section input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .help-text {
          font-size: 0.9em;
          color: #6c757d;
          margin-top: 5px;
          font-style: italic;
        }
        
        .video-section {
          margin: 20px 0;
          position: relative;
          text-align: center;
        }
        
        .video-section video {
          border: 2px solid #dee2e6;
          border-radius: 8px;
          background: #000;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .camera-placeholder {
          width: 400px;
          height: 300px;
          border: 2px dashed #dee2e6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8f9fa;
          color: #6c757d;
          font-style: italic;
          margin: 0 auto;
          flex-direction: column;
          gap: 15px;
        }
        
        .camera-error {
          color: #dc3545;
          text-align: center;
        }
        
        .controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          min-width: 140px;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        
        .btn-primary { background-color: #007bff; color: white; }
        .btn-success { background-color: #28a745; color: white; }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-info { background-color: #17a2b8; color: white; }
        .btn-warning { background-color: #ffc107; color: black; }
        
        .btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-section {
          margin: 20px 0;
          padding: 15px;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          text-align: left;
          color: #721c24;
        }
        
        .records-section {
          margin: 30px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #17a2b8;
        }
        
        .filters {
          margin-bottom: 20px;
          display: flex;
          gap: 15px;
          align-items: end;
          flex-wrap: wrap;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          text-align: left;
        }
        
        .filter-group label {
          font-weight: bold;
          margin-bottom: 5px;
          color: #495057;
          font-size: 14px;
        }
        
        .filter-group select,
        .filter-group input {
          padding: 8px 12px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 14px;
          min-width: 120px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        
        .records-table-container {
          overflow-x: auto;
          margin-top: 20px;
        }
        
        .records-table {
          width: 100%;
          border-collapse: collapse;
          background-color: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .records-table th {
          background-color: #e9ecef;
          font-weight: bold;
          color: #495057;
          padding: 12px 15px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          cursor: pointer;
          user-select: none;
        }
        
        .records-table th:hover {
          background-color: #dee2e6;
        }
        
        .records-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        
        .records-table tr:hover {
          background-color: #f8f9fa;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
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
        
        .loading-records, .no-records {
          padding: 40px;
          text-align: center;
          color: #6c757d;
          font-style: italic;
          background-color: white;
          border-radius: 8px;
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
          width: 90%;
          max-width: 1000px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .excel-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6c757d;
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
          padding: 10px 12px;
          border: 1px solid #dee2e6;
          text-align: left;
        }
        
        .excel-preview-table th {
          background-color: #e9ecef;
          font-weight: bold;
          position: sticky;
          top: 0;
        }
        
        .excel-preview-actions {
          padding: 15px 20px;
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        
        @media (max-width: 768px) {
          .attendance-container {
            padding: 15px;
          }
          
          .controls {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
          }
          
          .video-section video,
          .camera-placeholder {
            width: 100%;
            height: auto;
            max-height: 300px;
          }
          
          .filters {
            flex-direction: column;
            align-items: stretch;
          }
          
          .filter-group select,
          .filter-group input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeFaceEnroll;