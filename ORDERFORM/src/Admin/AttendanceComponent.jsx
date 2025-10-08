import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const AttendanceComponent = ({ employees = [] }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [editAttendanceModal, setEditAttendanceModal] = useState({
    isOpen: false,
    date: '',
    employee: null,
    status: 'present',
    notes: ''
  });

  // Sort employees alphabetically
  const sortedEmployees = [...employees].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Filter employees based on search term
  const filteredEmployees = sortedEmployees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = filteredEmployees.filter(e => e?.active) || [];

  // Fetch attendance data when month or employee changes
  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        let url = `/api/attendance?month=${selectedMonth}`;
        if (selectedEmployee) {
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

  const downloadAttendanceReport = () => {
    if (!attendanceData.length) {
      alert('No attendance data to download');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(
      attendanceData.map(record => {
        const employee = employees.find(e => e._id === record.employeeId) || {};
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

      // Refresh data
      const updatedResponse = await fetch(`/api/attendance?month=${selectedMonth}&employeeId=${editAttendanceModal.employee._id}`);
      const updatedData = await updatedResponse.json();
      setAttendanceData(updatedData || []);

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

  if (loading) return <div className="loading">Loading attendance data...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // Get day names for the header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();

    return (
      <div className="calendar-view">
        {/* Day names header */}
        <div className="day-names-row">
          {dayNames.map(day => (
            <div key={day} className="day-name-cell">{day}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="days-grid">
          {/* Empty cells for days before the 1st */}
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

            return (
              <div
                key={date}
                className={`day-cell ${record?.status || ''}`}
                onClick={() => handleEditAttendance(date, selectedEmployee)}
              >
                <div className="day-number">{i + 1}</div>
                <div className="day-status">{record?.status || ''}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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
            const leaveCount = monthData.filter(r => r.status === 'leave').length;

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
                  <div className="stat present">{presentCount}P</div>
                  <div className="stat absent">{absentCount}A</div>
                  <div className="stat half-day">{halfDayCount}H</div>
                  <div className="stat leave">{leaveCount}L</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSummarySection = () => {
    if (!selectedEmployee) return null;

    const presentCount = attendanceData.filter(r => r.status === 'present').length;
    const absentCount = attendanceData.filter(r => r.status === 'absent').length;
    const halfDayCount = attendanceData.filter(r => r.status === 'half-day').length;
    const leaveCount = attendanceData.filter(r => r.status === 'leave').length;
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
          <div className="summary-item leave">
            <span className="summary-label">Leave:</span>
            <span className="summary-value">{leaveCount}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="attendance-component">
      <h2>Employee Attendance</h2>

      <div className="controls">
        <div className="month-selector">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
          >
            <option value="month">Month View</option>
            <option value="year">Year View</option>
          </select>

          {viewMode === 'month' && (
            <div className="month-navigation">
              <button
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
        <button onClick={downloadAttendanceReport} className="download-button">
          Download Attendance
        </button>
      </div>

      <div className="attendance-container">
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

      {editAttendanceModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Attendance for {editAttendanceModal.employee.name}</h3>
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
                  <option value="leave">Leave</option>
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

      <style>{`
        .attendance-component {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
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
        
        .month-selector select {
          padding: 5px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .month-selector input {
          padding: 5px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .month-navigation {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .month-navigation button {
          padding: 5px 10px;
          background: #f0f0f0;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .month-navigation button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .download-button {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .attendance-container {
          display: flex;
          gap: 20px;
          margin-top: 20px;
        }
        
        .employee-list {
          flex: 1;
          max-width: 250px;
          border-right: 1px solid #ddd;
          padding-right: 20px;
        }
        
        .search-container {
          margin-bottom: 15px;
        }
        
        .search-container input {
          width: 100%;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .employee-list ul {
          list-style: none;
          padding: 0;
          margin: 0;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .employee-list li {
          padding: 10px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }
        
        .employee-list li:hover {
          background-color: #f5f5f5;
        }
        
        .employee-list li.selected {
          background-color: #003366;
          color: white;
        }
        
        .attendance-details {
          flex: 3;
        }
        
        .summary-section {
          margin-bottom: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #ddd;
        }
        
        .summary-section h4 {
          margin-top: 0;
          margin-bottom: 15px;
          color: #003366;
          font-size: 1.1rem;
        }
        
        .summary-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
          overflow-x: auto;
          padding-bottom: 5px;
        }
        
        .summary-item {
          flex: 1;
          min-width: 120px;
          text-align: center;
          padding: 10px;
          border-radius: 6px;
          background: white;
          border: 1px solid #ddd;
          white-space: nowrap;
        }
        
        .summary-item.present {
          border-color: #4CAF50;
          background-color: #e6f7e6;
        }
        
        .summary-item.absent {
          border-color: #F44336;
          background-color: #fde8e8;
        }
        
        .summary-item.half-day {
          border-color: #FF9800;
          background-color: #fff3e0;
        }
        
        .summary-item.leave {
          border-color: #2196F3;
          background-color: #e3f2fd;
        }
        
        .summary-label {
          font-weight: bold;
          display: block;
          margin-bottom: 5px;
          color: #555;
          font-size: 0.9rem;
        }
        
        .summary-value {
          font-size: 1.1rem;
          color: #003366;
          font-weight: 600;
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
          padding: 5px;
          font-size: 0.9rem;
          color: #555;
        }
        
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        
        .day-cell {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        
        .day-cell.empty {
          background-color: #f9f9f9;
          cursor: default;
        }
        
        .day-cell.present {
          background-color: #e6f7e6;
          border-color: #4CAF50;
        }
        
        .day-cell.absent {
          background-color: #fde8e8;
          border-color: #F44336;
        }
        
        .day-cell.half-day {
          background-color: #fff3e0;
          border-color: #FF9800;
        }
        
        .day-cell.leave {
          background-color: #e3f2fd;
          border-color: #2196F3;
        }
        
        .day-number {
          font-weight: bold;
        }
        
        .day-status {
          font-size: 0.8rem;
          text-transform: capitalize;
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
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .month-cell:hover {
          background-color: #f5f5f5;
          transform: scale(1.05);
        }
        
        .month-name {
          font-weight: bold;
          font-size: 1.2rem;
          color: #003366;
        }
        
        .month-stats {
          display: flex;
          justify-content: space-around;
          margin-top: 8px;
          font-size: 0.8rem;
        }
        
        .month-stats .stat {
          padding: 2px 5px;
          border-radius: 3px;
        }
        
        .month-stats .present {
          background-color: #e6f7e6;
          color: #2e7d32;
        }
        
        .month-stats .absent {
          background-color: #fde8e8;
          color: #c62828;
        }
        
        .month-stats .half-day {
          background-color: #fff3e0;
          color: #e65100;
        }
        
        .month-stats .leave {
          background-color: #e3f2fd;
          color: #1565c0;
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
        }
        
        .modal-content {
          background: white;
          padding: 20px 30px;
          border-radius: 12px;
          width: 400px;
          max-width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eaeaea;
        }
        
        .modal-header h3 {
          color: #003366;
          margin: 0;
          font-size: 1.4rem;
        }
        
        .modal-header p {
          margin: 5px 0 0;
          color: #666;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
          padding: 0 10px;
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
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 0.95rem;
        }
        
        .form-group textarea {
          min-height: 80px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid #eaeaea;
        }
        
        .cancel-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #f5f5f5;
          color: #555;
          border: 1px solid #ddd;
          cursor: pointer;
          font-weight: 500;
        }
        
        .save-button {
          padding: 10px 20px;
          border-radius: 6px;
          background: #003366;
          color: white;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
        
        .loading {
          padding: 20px;
          text-align: center;
        }
        
        .error {
          padding: 20px;
          color: red;
          text-align: center;
        }
        
        .blink-heading {
          font-family: Arial, sans-serif;
          font-size: 24px;
          font-weight: bold;
          position: center;
          color: rgb(221, 34, 181);
          text-align: center;
          margin: 20px 0;
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

function getDaysInMonth(monthStr) {
  if (!monthStr) return [];

  const [year, month] = monthStr.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return [];

  // Use UTC to avoid timezone issues
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = [];

  for (let i = 1; i <= daysInMonth; i++) {
    // Create date string in YYYY-MM-DD format
    const dayStr = String(i).padStart(2, '0');
    days.push(`${year}-${String(month).padStart(2, '0')}-${dayStr}`);
  }

  return days;
}

export default AttendanceComponent;