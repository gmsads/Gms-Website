import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const AttendanceComponent = ({ employees = [] }) => {
  // State for storing attendance data
  const [attendanceData, setAttendanceData] = useState([]);
  
  // State for loading status
  const [loading, setLoading] = useState(true);
  
  // State for error handling
  const [error, setError] = useState(null);
  
  // State for selected month (default: current month)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // State for selected employee
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // State for view mode (month/year)
  const [viewMode, setViewMode] = useState('month');
  
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for edit attendance modal
  const [editAttendanceModal, setEditAttendanceModal] = useState({
    isOpen: false,
    date: '',
    employee: null,
    status: 'present',
    notes: ''
  });

  // Sort employees alphabetically by name with null checks
  const sortedEmployees = [...employees]
    .filter(employee => employee && employee.name)
    .sort((a, b) => {
      if (!a.name) return 1;
      if (!b.name) return -1;
      return a.name.localeCompare(b.name);
    });

  // Filter employees based on search term
  const filteredEmployees = sortedEmployees.filter(employee =>
    employee.name && employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get active employees only
  const activeEmployees = filteredEmployees.filter(e => e && e.active) || [];

  // Fetch attendance data when month or employee changes
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        let url = `/api/attendance?month=${selectedMonth}`;
        if (selectedEmployee && selectedEmployee._id) {
          url += `&employeeId=${selectedEmployee._id}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch attendance data');
        const data = await response.json();
        setAttendanceData(data || []);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [selectedMonth, selectedEmployee]);

  // Function to download attendance report as Excel
  const downloadAttendanceReport = () => {
    if (!attendanceData.length) {
      alert('No attendance data to download');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      attendanceData.map(record => {
        const employee = employees.find(e => e && e._id === record.employeeId) || {};
        return {
          'Employee Name': employee.name || 'Unknown',
          'Date': new Date(record.date).toLocaleDateString(),
          'Status': record.status,
          'Notes': record.notes || 'N/A'
        };
      })
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `attendance_report_${selectedMonth}.xlsx`);
  };

  // Function to handle editing attendance
  const handleEditAttendance = (date, employee) => {
    if (!employee || !date) return;

    const existingRecord = attendanceData.find(record => {
      const recordDate = new Date(record.date);
      const recordDateStr = formatDateToYYYYMMDD(recordDate);
      return record.employeeId === employee._id && recordDateStr === date;
    });

    setEditAttendanceModal({
      isOpen: true,
      date,
      employee,
      status: existingRecord?.status || 'present',
      notes: existingRecord?.notes || ''
    });
  };

  // Function to save attendance changes
  const handleSaveAttendance = async () => {
    try {
      if (!editAttendanceModal.employee || !editAttendanceModal.date) {
        throw new Error('Invalid attendance data');
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: editAttendanceModal.employee._id,
          date: editAttendanceModal.date,
          status: editAttendanceModal.status,
          notes: editAttendanceModal.notes
        })
      });

      if (!response.ok) throw new Error('Failed to update attendance');

      // Refresh data after saving
      const updatedResponse = await fetch(`/api/attendance?month=${selectedMonth}&employeeId=${editAttendanceModal.employee._id}`);
      const updatedData = await updatedResponse.json();
      setAttendanceData(updatedData || []);

      // Close modal
      setEditAttendanceModal({
        isOpen: false,
        date: '',
        employee: null,
        status: 'present',
        notes: ''
      });
    } catch (err) {
      console.error('Error saving attendance:', err);
      alert(err.message);
    }
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to check if a date is Sunday
  const isSunday = (dateStr) => {
    const date = new Date(dateStr);
    return date.getDay() === 0;
  };

  // Show loading state
  if (loading) return <div className="loading">Loading attendance data...</div>;
  
  // Show error state
  if (error) return <div className="error">Error: {error}</div>;

  // Day names for calendar header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Function to render month view calendar
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();

    return (
      <div className="calendar-view">
        {/* Day names header row */}
        <div className="day-names-row">
          {dayNames.map(day => (
            <div key={day} className="day-name-cell">{day}</div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="days-grid">
          {/* Empty cells for days before the 1st of month */}
          {Array(firstDay).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="day-cell empty"></div>
          ))}

          {/* Actual days of the month */}
          {daysInMonth.map((date, i) => {
            const record = attendanceData.find(record => {
              const recordDate = new Date(record.date);
              const recordDateStr = formatDateToYYYYMMDD(recordDate);
              return recordDateStr === date;
            });

            // Determine cell class based on status and day
            let cellClass = 'day-cell';
            if (isSunday(date)) {
              cellClass += ' sunday';
            }
            if (record?.status) {
              cellClass += ` ${record.status}`;
            }

            // Get status display text
            let statusDisplay = '';
            switch (record?.status) {
              case 'present':
                statusDisplay = 'Present';
                break;
              case 'absent':
                statusDisplay = 'Absent';
                break;
              case 'half-day':
                statusDisplay = 'Half Day';
                break;
              case 'holiday':
                statusDisplay = 'Holiday';
                break;
              default:
                statusDisplay = '';
            }

            return (
              <div
                key={date}
                className={cellClass}
                onClick={() => handleEditAttendance(date, selectedEmployee)}
              >
                <div className="day-number">{i + 1}</div>
                {record?.status && (
                  <div className="day-status">
                    {statusDisplay}
                  </div>
                )}
                {/* Display notes if they exist */}
                {record?.notes && (
                  <div className="day-notes" title={record.notes}>
                    {record.notes.length > 20 ? record.notes.substring(0, 20) + '...' : record.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to render year view
  const renderYearView = () => {
    const [year] = selectedMonth.split('-').map(Number);
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(year, i, 1);
      return {
        name: monthDate.toLocaleString('default', { month: 'long' }),
        shortName: monthDate.toLocaleString('default', { month: 'short' }),
        year: monthDate.getFullYear(),
        month: i + 1,
        monthStr: `${year}-${String(i + 1).padStart(2, '0')}`
      };
    });

    return (
      <div className="year-view">
        <h3>Attendance Summary for {year}</h3>
        <div className="year-grid">
          {months.map((month, i) => {
            // Filter attendance data for this month
            const monthData = attendanceData.filter(record => {
              const recordDate = new Date(record.date);
              return (
                recordDate.getFullYear() === year &&
                recordDate.getMonth() + 1 === month.month
              );
            });

            const presentCount = monthData.filter(r => r.status === 'present').length;
            const absentCount = monthData.filter(r => r.status === 'absent').length;
            const halfDayCount = monthData.filter(r => r.status === 'half-day').length;
            const holidayCount = monthData.filter(r => r.status === 'holiday').length;

            return (
              <div
                key={i}
                className="month-cell"
                onClick={() => {
                  setSelectedMonth(month.monthStr);
                  setViewMode('month');
                }}
              >
                <div className="month-name">{month.shortName}</div>
                <div className="month-stats">
                  <div className="stat present">P: {presentCount}</div>
                  <div className="stat absent">A: {absentCount}</div>
                  <div className="stat half-day">H: {halfDayCount}</div>
                  <div className="stat holiday">HD: {holidayCount}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Function to render attendance summary section
  const renderSummarySection = () => {
    if (!selectedEmployee) return null;

    const presentCount = attendanceData.filter(r => r.status === 'present').length;
    const absentCount = attendanceData.filter(r => r.status === 'absent').length;
    const halfDayCount = attendanceData.filter(r => r.status === 'half-day').length;
    const holidayCount = attendanceData.filter(r => r.status === 'holiday').length;
    const totalDays = new Date(
      new Date(selectedMonth + '-01').getFullYear(),
      new Date(selectedMonth + '-01').getMonth() + 1,
      0
    ).getDate();

    return (
      <div className="summary-section">
        <h4>Attendance Summary for {selectedEmployee.name}</h4>
        <div className="summary-line">
          <div className="summary-item">
            <span className="summary-label">Month:</span>
            <span className="summary-value">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Days:</span>
            <span className="summary-value">{totalDays}</span>
          </div>
          <div className="summary-item present">
            <span className="summary-label">Present:</span>
            <span className="summary-value">{presentCount}</span>
          </div>
          <div className="summary-item absent">
            <span className="summary-label">Absent:</span>
            <span className="summary-value">{absentCount}</span>
          </div>
          <div className="summary-item half-day">
            <span className="summary-label">Half Day:</span>
            <span className="summary-value">{halfDayCount}</span>
          </div>
          <div className="summary-item holiday">
            <span className="summary-label">Holiday:</span>
            <span className="summary-value">{holidayCount}</span>
          </div>
        </div>
      </div>
    );
  };

  // Main component render
  return (
    <div className="attendance-component">
      <h2>Employee Attendance</h2>

      {/* Controls section */}
      <div className="controls">
        <div className="month-selector">
          {/* View mode selector */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="month">Month View</option>
            <option value="year">Year View</option>
          </select>

          {/* Month navigation for month view */}
          {viewMode === 'month' && (
            <div className="month-navigation">
              <button
                className="nav-button prev-button"
                onClick={() => {
                  const [year, month] = selectedMonth.split('-').map(Number);
                  const prevMonth = month === 1 ? 12 : month - 1;
                  const prevYear = month === 1 ? year - 1 : year;
                  setSelectedMonth(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
                }}
              >
                &lt; Previous
              </button>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />

              <button
                className="nav-button next-button"
                onClick={() => {
                  const [year, month] = selectedMonth.split('-').map(Number);
                  const nextMonth = month === 12 ? 1 : month + 1;
                  const nextYear = month === 12 ? year + 1 : year;
                  setSelectedMonth(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
                }}
                disabled={selectedMonth >= new Date().toISOString().slice(0, 7)}
              >
                Next &gt;
              </button>
            </div>
          )}
          
          {/* Year selector for year view */}
          {viewMode === 'year' && (
            <input
              type="number"
              value={selectedMonth.split('-')[0]}
              onChange={(e) => setSelectedMonth(`${e.target.value}-01`)}
              min="2000"
              max="2100"
            />
          )}
        </div>
        
        {/* Download button */}
        <button onClick={downloadAttendanceReport} className="download-button">
          Download Attendance
        </button>
      </div>

      {/* Main attendance container */}
      <div className="attendance-container">
        {/* Employee list sidebar */}
        <div className="employee-list">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <h3>Employees ({activeEmployees.length})</h3>
          <ul>
            {activeEmployees.map(employee => (
              <li
                key={employee._id}
                onClick={() => setSelectedEmployee(employee)}
                className={selectedEmployee?._id === employee._id ? 'selected' : ''}
              >
                {employee.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Attendance details main area */}
        <div className="attendance-details">
          {selectedEmployee ? (
            <>
              {renderSummarySection()}
              {viewMode === 'month' ? renderMonthView() : renderYearView()}
            </>
          ) : (
            <h2 className="blink-heading">
              Select an employee to view the complete attendance details 
            </h2>
          )}
        </div>
      </div>

      {/* Edit Attendance Modal */}
      {editAttendanceModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Attendance for {editAttendanceModal.employee?.name}</h3>
              <p>{new Date(editAttendanceModal.date).toLocaleDateString()}</p>
              <button
                className="close-button"
                onClick={() => setEditAttendanceModal({
                  isOpen: false,
                  date: '',
                  employee: null,
                  status: 'present',
                  notes: ''
                })}
              >
                &times;
              </button>
            </div>

            <div className="form-container">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editAttendanceModal.status}
                  onChange={(e) => setEditAttendanceModal(prev => ({
                    ...prev,
                    status: e.target.value
                  }))}
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="half-day">Half Day</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editAttendanceModal.notes}
                  onChange={(e) => setEditAttendanceModal(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  rows="3"
                  placeholder="Add notes for this attendance record..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={() => setEditAttendanceModal({
                  isOpen: false,
                  date: '',
                  employee: null,
                  status: 'present',
                  notes: ''
                })}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleSaveAttendance}
              >
                Save Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Styles */}
      <style>{`
        .attendance-component {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        .controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          gap: 15px;
          flex-wrap: wrap;
        }
        
        .month-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .month-selector select,
        .month-selector input {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 14px;
        }
        
        .month-navigation {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .nav-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .prev-button {
          background: #003366;
          color: white;
        }
        
        .next-button {
          background: #4CAF50;
          color: white;
        }
        
        .nav-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .nav-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .download-button {
          background: #FF9800;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .download-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .attendance-container {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        
        .employee-list {
          flex: 1;
          max-width: 280px;
          border-right: 1px solid #e0e0e0;
          padding-right: 20px;
        }
        
        .search-container {
          margin-bottom: 15px;
        }
        
        .search-container input {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 14px;
        }
        
        .employee-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 600px;
          overflow-y: auto;
        }
        
        .employee-list li {
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          transition: all 0.2s;
          border-radius: 6px;
          margin-bottom: 4px;
        }
        
        .employee-list li:hover {
          background-color: #f5f5f5;
          transform: translateX(2px);
        }
        
        .employee-list li.selected {
          background-color: #003366;
          color: white;
          font-weight: 500;
        }
        
        .attendance-details {
          flex: 3;
        }
        
        .summary-section {
          margin-bottom: 20px;
          padding: 20px;
          background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
          border-radius: 12px;
          border: 1px solid #e0e0e0;
        }
        
        .summary-section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #003366;
          font-size: 1.2rem;
        }
        
        .summary-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .summary-item {
          flex: 1;
          min-width: 100px;
          text-align: center;
          padding: 12px;
          border-radius: 8px;
          background: white;
          border: 1px solid #e0e0e0;
          transition: all 0.2s;
        }
        
        .summary-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .summary-item.present {
          border-color: #4CAF50;
          background-color: #e8f5e9;
        }
        
        .summary-item.absent {
          border-color: #F44336;
          background-color: #ffebee;
        }
        
        .summary-item.half-day {
          border-color: #FF9800;
          background-color: #fff3e0;
        }
        
        .summary-item.holiday {
          border-color: #9C27B0;
          background-color: #f3e5f5;
        }
        
        .summary-label {
          font-weight: bold;
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-size: 0.85rem;
        }
        
        .summary-value {
          font-size: 1.3rem;
          color: #003366;
          font-weight: 700;
        }
        
        .calendar-view {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .day-names-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        
        .day-name-cell {
          text-align: center;
          font-weight: bold;
          padding: 12px;
          font-size: 0.9rem;
          color: #555;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        
        .day-cell {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px 8px;
          min-height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
          background: white;
        }
        
        .day-cell:hover:not(.empty) {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-color: #003366;
        }
        
        .day-cell.empty {
          background-color: #fafafa;
          cursor: default;
          border-color: #f0f0f0;
        }
        
        /* Status-specific styles */
        .day-cell.present {
          background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          border-color: #4CAF50;
        }
        
        .day-cell.absent {
          background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
          border-color: #F44336;
        }
        
        .day-cell.half-day {
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          border-color: #FF9800;
        }
        
        .day-cell.holiday {
          background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
          border-color: #9C27B0;
        }
        
        .day-cell.sunday {
          background: linear-gradient(135deg, #e6f2ff 0%, #cce5ff 100%);
          border-color: #4d94ff;
        }
        
        /* Combined styles */
        .day-cell.sunday.present {
          background: linear-gradient(135deg, #d9f2d9 0%, #b8e6b8 100%);
        }
        
        .day-cell.sunday.absent {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
        }
        
        .day-cell.sunday.half-day {
          background: linear-gradient(135deg, #ffe6cc 0%, #ffd9b3 100%);
        }
        
        .day-cell.sunday.holiday {
          background: linear-gradient(135deg, #e8d9f0 0%, #d9c8e6 100%);
        }
        
        .day-number {
          font-weight: bold;
          font-size: 1rem;
          margin-bottom: 6px;
          color: #333;
        }
        
        .day-status {
          font-size: 0.75rem;
          margin-top: 4px;
          font-weight: 500;
          text-transform: capitalize;
        }
        
        .day-notes {
          font-size: 0.65rem;
          color: #666;
          text-align: center;
          word-wrap: break-word;
          margin-top: 4px;
          padding: 2px 4px;
          background: rgba(255,255,255,0.7);
          border-radius: 4px;
          max-width: 100%;
        }
        
        .year-view {
          margin-top: 20px;
        }
        
        .year-view h3 {
          color: #003366;
          margin-bottom: 20px;
        }
        
        .year-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }
        
        .month-cell {
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        
        .month-cell:hover {
          background-color: #f8f9fa;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .month-name {
          font-weight: bold;
          font-size: 1.1rem;
          color: #003366;
          margin-bottom: 12px;
        }
        
        .month-stats {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 0.7rem;
        }
        
        .month-stats .stat {
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 500;
        }
        
        .month-stats .present {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .month-stats .absent {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .month-stats .half-day {
          background-color: #fff3e0;
          color: #e65100;
        }
        
        .month-stats .holiday {
          background-color: #f3e5f5;
          color: #6a1b9a;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.2s;
        }
        
        .modal-content {
          background: white;
          padding: 25px;
          border-radius: 12px;
          width: 450px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          animation: slideUp 0.3s;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }
        
        .modal-header h3 {
          color: #003366;
          margin: 0;
          font-size: 1.3rem;
        }
        
        .modal-header p {
          margin: 5px 0 0;
          color: #666;
          font-size: 0.9rem;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
          padding: 0 10px;
          transition: color 0.2s;
        }
        
        .close-button:hover {
          color: #333;
        }
        
        .form-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .form-group {
          flex: 1;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: #555;
          font-size: 0.9rem;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #003366;
        }
        
        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid #f0f0f0;
        }
        
        .cancel-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #f5f5f5;
          color: #555;
          border: 1px solid #ddd;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .cancel-button:hover {
          background: #e0e0e0;
        }
        
        .save-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #003366;
          color: white;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .save-button:hover {
          background: #004c99;
          transform: translateY(-1px);
        }
        
        .loading {
          padding: 40px;
          text-align: center;
          font-size: 1.1rem;
          color: #666;
        }
        
        .error {
          padding: 40px;
          color: #F44336;
          text-align: center;
          font-size: 1.1rem;
        }
        
        .blink-heading {
          font-family: Arial, sans-serif;
          font-size: 24px;
          font-weight: bold;
          color: rgb(221, 34, 181);
          text-align: center;
          margin: 40px 0;
          animation: blink 1.5s infinite;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @media (max-width: 768px) {
          .attendance-container {
            flex-direction: column;
          }
          
          .employee-list {
            max-width: 100%;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          
          .summary-line {
            flex-direction: column;
          }
          
          .summary-item {
            width: 100%;
          }
          
          .year-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .days-grid {
            gap: 4px;
          }
          
          .day-cell {
            min-height: 70px;
            padding: 6px 4px;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to get all days in a month
function getDaysInMonth(monthStr) {
  if (!monthStr) return [];

  const [year, month] = monthStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return [];

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = String(i).padStart(2, '0');
    days.push(`${year}-${String(month).padStart(2, '0')}-${dayStr}`);
  }

  return days;
}

export default AttendanceComponent;