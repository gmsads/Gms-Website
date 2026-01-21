import React, { useState, useEffect } from 'react';

const AdminBreakDashboard = () => {
  const [executives, setExecutives] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeExecutives, setActiveExecutives] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalBreaks: 0,
    totalBreakTime: 0,
    avgBreakDuration: 0,
    activeOnBreak: 0,
    totalExecutives: 0
  });

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    setFilterDate(getTodayDate());
    fetchData();
  }, []);

  useEffect(() => {
    if (filterDate) {
      fetchData();
    }
  }, [filterDate, selectedExecutive]);

  const fetchData = () => {
    setLoading(true);
    
    // Fetch executives status
    const executivesData = JSON.parse(localStorage.getItem('telecrm_executives') || '[]');
    setExecutives(executivesData);
    
    // Fetch breaks data
    const breaksData = JSON.parse(localStorage.getItem('telecrm_breaks') || '[]');
    
    // Filter breaks by date
    let filteredBreaks = breaksData;
    if (filterDate) {
      filteredBreaks = breaksData.filter(breakRecord => 
        breakRecord.createdAt?.includes(filterDate) || 
        breakRecord.start_time?.includes(filterDate)
      );
    }
    
    // Filter by executive if selected
    if (selectedExecutive) {
      filteredBreaks = filteredBreaks.filter(breakRecord => 
        breakRecord.executive_name?.toLowerCase().includes(selectedExecutive.toLowerCase())
      );
    }
    
    setBreaks(filteredBreaks);
    
    // Fetch call logs for the same date
    const callLogsData = JSON.parse(localStorage.getItem('telecrm_calllogs') || '[]');
    let filteredCallLogs = callLogsData;
    if (filterDate) {
      filteredCallLogs = callLogsData.filter(log => 
        log.createdAt?.includes(filterDate)
      );
    }
    
    if (selectedExecutive) {
      filteredCallLogs = filteredCallLogs.filter(log => 
        log.executive_name?.toLowerCase().includes(selectedExecutive.toLowerCase())
      );
    }
    
    setCallLogs(filteredCallLogs);
    
    // Calculate active executives (those with call logs today)
    const activeExecs = executivesData.filter(exec => 
      filteredCallLogs.some(log => log.executive_name === exec.name)
    );
    setActiveExecutives(activeExecs);
    
    // Calculate summary statistics
    const totalBreaks = filteredBreaks.length;
    const endedBreaks = filteredBreaks.filter(b => b.status === 'ended');
    const totalBreakTime = endedBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const avgBreakDuration = endedBreaks.length > 0 ? Math.round(totalBreakTime / endedBreaks.length) : 0;
    const activeOnBreak = filteredBreaks.filter(b => b.status === 'active').length;
    
    setSummaryStats({
      totalBreaks,
      totalBreakTime,
      avgBreakDuration,
      activeOnBreak,
      totalExecutives: activeExecs.length
    });
    
    setLoading(false);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleExportData = () => {
    const dataToExport = {
      date: filterDate,
      summary: summaryStats,
      executives: executives,
      breaks: breaks,
      callLogs: callLogs
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `break-report-${filterDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getExecutiveCallStats = (executiveName) => {
    const executiveBreaks = breaks.filter(b => b.executive_name === executiveName);
    const executiveCalls = callLogs.filter(c => c.executive_name === executiveName);
    
    const totalBreakTime = executiveBreaks
      .filter(b => b.status === 'ended')
      .reduce((sum, b) => sum + (b.duration || 0), 0);
    
    const totalCallTime = executiveCalls.reduce((sum, c) => sum + (c.call_end_duration || 0), 0);
    
    return {
      totalBreaks: executiveBreaks.length,
      totalBreakTime,
      totalCalls: executiveCalls.length,
      totalCallTime,
      breakPercentage: totalCallTime > 0 ? Math.round((totalBreakTime / (totalCallTime + totalBreakTime)) * 100) : 0
    };
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Tele Callers Break  Timings Monitoring Dashboard</h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Monitor executive breaks during calling periods
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRefresh}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleExportData}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                📊 Export Data
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Select Date
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Filter by Executive
            </label>
            <select
              value={selectedExecutive}
              onChange={(e) => setSelectedExecutive(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">All Executives</option>
              {executives.map((exec, index) => (
                <option key={index} value={exec.name}>
                  {exec.name} ({exec.phone})
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '0 0 auto' }}>
            <button
              onClick={() => {
                setFilterDate(getTodayDate());
                setSelectedExecutive('');
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#3498db' }}>
              {summaryStats.totalExecutives}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Active Executives Today
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#ffc107' }}>
              {summaryStats.totalBreaks}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Total Breaks Taken
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#28a745' }}>
              {formatDuration(summaryStats.totalBreakTime)}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Total Break Time
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc3545' }}>
              {summaryStats.activeOnBreak}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
              Currently on Break
            </div>
          </div>
        </div>

        {/* Executive Performance */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>
              Executive Break Analysis ({filterDate})
            </h3>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading data...
            </div>
          ) : activeExecutives.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No executive activity found for selected date
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Executive
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Current Status
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Total Breaks
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Total Break Time
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Total Calls
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Total Call Time
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Break % of Total Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeExecutives.map((exec, index) => {
                    const stats = getExecutiveCallStats(exec.name);
                    
                    return (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <td style={{ padding: '12px 15px' }}>
                          <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                            {exec.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {exec.phone}
                          </div>
                        </td>
                        <td style={{ padding: '12px 15px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: exec.status === 'on_break' ? '#fff3cd' : '#d4edda',
                            color: exec.status === 'on_break' ? '#856404' : '#155724',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}>
                            {exec.status || 'active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', fontWeight: '500', color: '#ffc107' }}>
                          {stats.totalBreaks}
                        </td>
                        <td style={{ padding: '12px 15px', fontWeight: '500', color: '#28a745' }}>
                          {formatDuration(stats.totalBreakTime)}
                        </td>
                        <td style={{ padding: '12px 15px', fontWeight: '500', color: '#3498db' }}>
                          {stats.totalCalls}
                        </td>
                        <td style={{ padding: '12px 15px', fontWeight: '500', color: '#6c757d' }}>
                          {formatDuration(stats.totalCallTime)}
                        </td>
                        <td style={{ padding: '12px 15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                height: '8px',
                                backgroundColor: '#e9ecef',
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${stats.breakPercentage}%`,
                                  height: '100%',
                                  backgroundColor: stats.breakPercentage > 30 ? '#dc3545' : 
                                                  stats.breakPercentage > 20 ? '#ffc107' : '#28a745',
                                  borderRadius: '4px'
                                }} />
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '500', minWidth: '40px' }}>
                              {stats.breakPercentage}%
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Break Details Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ margin: 0, color: '#2c3e50' }}>
              Break Details
            </h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
              All breaks taken by executives
            </p>
          </div>
          
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Loading break details...
            </div>
          ) : breaks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No breaks recorded for selected date/filter
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Executive
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Break Type
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Reason
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Start Time
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      End Time
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Duration
                    </th>
                    <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#2c3e50', borderBottom: '1px solid #e0e0e0' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {breaks.map((breakRecord, index) => {
                    const duration = breakRecord.status === 'active' 
                      ? Math.floor((new Date() - new Date(breakRecord.start_time)) / 1000)
                      : breakRecord.duration || 0;
                    
                    return (
                      <tr key={index} style={{
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <td style={{ padding: '12px 15px' }}>
                          <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                            {breakRecord.executive_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {breakRecord.executive_phone}
                          </div>
                        </td>
                        <td style={{ padding: '12px 15px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: '#e7f3ff',
                            color: '#3498db',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}>
                            {breakRecord.break_type}
                          </span>
                        </td>
                        <td style={{ padding: '12px 15px', color: '#666' }}>
                          {breakRecord.reason || '-'}
                        </td>
                        <td style={{ padding: '12px 15px', color: '#666' }}>
                          {formatDate(breakRecord.start_time)}
                        </td>
                        <td style={{ padding: '12px 15px', color: '#666' }}>
                          {breakRecord.end_time ? formatDate(breakRecord.end_time) : '-'}
                        </td>
                        <td style={{ padding: '12px 15px', fontWeight: '500', color: '#28a745' }}>
                          {formatDuration(duration)}
                        </td>
                        <td style={{ padding: '12px 15px' }}>
                          <span style={{
                            padding: '4px 8px',
                            backgroundColor: breakRecord.status === 'active' ? '#fff3cd' : '#d4edda',
                            color: breakRecord.status === 'active' ? '#856404' : '#155724',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            textTransform: 'capitalize'
                          }}>
                            {breakRecord.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Call vs Break Timeline Visualization */}
        {activeExecutives.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            marginTop: '20px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>
              Daily Activity Timeline
            </h3>
            
            {activeExecutives.slice(0, 3).map((exec) => {
              const execBreaks = breaks.filter(b => b.executive_name === exec.name);
              const execCalls = callLogs.filter(c => c.executive_name === exec.name);
              
              if (execBreaks.length === 0 && execCalls.length === 0) return null;
              
              // Create time slots for the day (9 AM to 6 PM)
              const timeSlots = [];
              for (let hour = 9; hour <= 18; hour++) {
                timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
              }
              
              return (
                <div key={exec.name} style={{ marginBottom: '30px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <h4 style={{ margin: 0, color: '#2c3e50' }}>{exec.name}</h4>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {execBreaks.length} breaks • {execCalls.length} calls
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    height: '60px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Time slots */}
                    {timeSlots.map((time, index) => (
                      <div key={index} style={{
                        flex: 1,
                        borderRight: index < timeSlots.length - 1 ? '1px solid #e0e0e0' : 'none',
                        position: 'relative'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-20px',
                          left: '0',
                          width: '100%',
                          fontSize: '10px',
                          color: '#999',
                          textAlign: 'center'
                        }}>
                          {time}
                        </div>
                      </div>
                    ))}
                    
                    {/* Break periods */}
                    {execBreaks.map((breakRecord, index) => {
                      const startTime = new Date(breakRecord.start_time);
                      const startHour = startTime.getHours();
                      const startMinute = startTime.getMinutes();
                      
                      // Calculate position (9 AM = 0%, 6 PM = 100%)
                      const startPosition = ((startHour - 9) * 60 + startMinute) / (9 * 60) * 100;
                      
                      const endTime = breakRecord.end_time ? new Date(breakRecord.end_time) : new Date();
                      const endHour = endTime.getHours();
                      const endMinute = endTime.getMinutes();
                      const endPosition = ((endHour - 9) * 60 + endMinute) / (9 * 60) * 100;
                      
                      const width = Math.max(1, endPosition - startPosition);
                      
                      return (
                        <div
                          key={index}
                          style={{
                            position: 'absolute',
                            left: `${startPosition}%`,
                            width: `${width}%`,
                            height: '100%',
                            backgroundColor: breakRecord.status === 'active' ? '#ffc107' : '#ffc10790',
                            border: '1px solid #ffc107',
                            borderRadius: '2px',
                            zIndex: 2
                          }}
                          title={`${breakRecord.break_type}: ${formatDuration(breakRecord.duration || Math.floor((endTime - startTime) / 1000))}`}
                        />
                      );
                    })}
                    
                    {/* Call periods */}
                    {execCalls.slice(0, 10).map((call, index) => {
                      const callTime = new Date(call.createdAt);
                      const callHour = callTime.getHours();
                      const callMinute = callTime.getMinutes();
                      
                      // Calculate position
                      const position = ((callHour - 9) * 60 + callMinute) / (9 * 60) * 100;
                      
                      return (
                        <div
                          key={index}
                          style={{
                            position: 'absolute',
                            left: `${position}%`,
                            width: '2px',
                            height: '100%',
                            backgroundColor: '#28a745',
                            zIndex: 3
                          }}
                          title={`Call: ${formatDuration(call.call_end_duration || 0)}`}
                        />
                      );
                    })}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '15px', height: '15px', backgroundColor: '#ffc107', borderRadius: '2px' }} />
                      <span>Break Periods</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '2px', height: '15px', backgroundColor: '#28a745' }} />
                      <span>Call Times</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend and Help */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          fontSize: '14px',
          color: '#666'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Dashboard Guide</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '5px' }}>Break Percentage</div>
              <div style={{ fontSize: '12px' }}>
                • <span style={{ color: '#28a745' }}>Green (&lt;20%)</span>: Optimal break time<br />
                • <span style={{ color: '#ffc107' }}>Yellow (20-30%)</span>: Moderate break time<br />
                • <span style={{ color: '#dc3545' }}>Red (&gt;30%)</span>: Excessive break time
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '5px' }}>Data Sources</div>
              <div style={{ fontSize: '12px' }}>
                • Breaks: When executives use "Take a Break"<br />
                • Calls: When executives make/receive calls<br />
                • Data updates in real-time
              </div>
            </div>
            <div>
              <div style={{ fontWeight: '500', marginBottom: '5px' }}>Tips for Admins</div>
              <div style={{ fontSize: '12px' }}>
                • Monitor executives with high break percentages<br />
                • Check break reasons for patterns<br />
                • Use date filter to analyze specific days
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBreakDashboard;