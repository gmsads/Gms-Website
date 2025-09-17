import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AutoLogout from '../mainpage/AutoLogout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval, isSameYear } from 'date-fns';

const FieldExecutivePage = () => {
    const [fieldData, setFieldData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);
    const [stats, setStats] = useState({
        scheduled: 0,
        completed: 0,
        leads: 0
    });
    const [filteredStats, setFilteredStats] = useState({
        scheduled: 0,
        completed: 0,
        leads: 0
    });

    // Calendar states
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);

    // Stats filter states
    const [statsMonthFilter, setStatsMonthFilter] = useState(new Date());
    const [statsYearFilter, setStatsYearFilter] = useState(new Date().getFullYear());

    const navigate = useNavigate();

    // Form states
    const [newVisit, setNewVisit] = useState({
        client: '',
        location: '',
        date: '',
        purpose: '',
        notes: ''
    });

    const [newReport, setNewReport] = useState({
        visitId: '',
        outcome: '',
        details: '',
        leads: 0
    });

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                const userName = localStorage.getItem('userName');
                const response = await axios.get('/api/user-profile', {
                    params: { name: userName }
                });

                if (response.data.role.toLowerCase() !== 'fieldexecutive') {
                    navigate('/dashboard');
                } else {
                    fetchFieldData();
                }
            } catch (error) {
                console.error('Error checking authorization:', error);
                navigate('/login');
            }
        };

        checkAuthorization();
    }, [navigate]);

    const fetchFieldData = async () => {
        try {
            const userName = localStorage.getItem('userName');
            const response = await axios.get('/api/field-executive/data', {
                params: { executive: userName }
            });

            setFieldData(response.data.activities || []);
            setFilteredData(response.data.activities || []);

            // Calculate stats from the data
            const scheduled = response.data.activities.filter(a => a.status === 'scheduled').length;
            const completed = response.data.activities.filter(a => a.status === 'completed').length;
            const leads = response.data.leads || 0;

            setStats({ scheduled, completed, leads });
            setFilteredStats({ scheduled, completed, leads });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching field executive data:', error);
            setLoading(false);
        }
    };

    const handleBackToDashboard = () => {
        navigate('/executive-dashboard');
    };

    // Apply filters when they change
    useEffect(() => {
        applyFilters();
    }, [selectedDate, fieldData]);

    // Apply stats filters when they change
    useEffect(() => {
        applyStatsFilters();
    }, [statsMonthFilter, statsYearFilter, fieldData]);

    const applyFilters = () => {
        let filtered = [...fieldData];

        // Apply date filter if a date is selected
        if (selectedDate) {
            filtered = filtered.filter(activity => {
                const activityDate = new Date(activity.date);
                return isSameDay(activityDate, selectedDate);
            });
        }

        setFilteredData(filtered);

        // Update filtered stats
        const scheduled = filtered.filter(a => a.status === 'scheduled').length;
        const completed = filtered.filter(a => a.status === 'completed').length;

        setFilteredStats({
            scheduled,
            completed,
            leads: stats.leads
        });
    };

    const applyStatsFilters = () => {
        // Filter activities based on selected month and year
        const filteredActivities = fieldData.filter(activity => {
            const activityDate = new Date(activity.date);
            return (
                activityDate.getMonth() === statsMonthFilter.getMonth() &&
                activityDate.getFullYear() === statsYearFilter
            );
        });

        // Calculate filtered stats
        const scheduled = filteredActivities.filter(a => a.status === 'scheduled').length;
        const completed = filteredActivities.filter(a => a.status === 'completed').length;

        // For leads, we need to get the leads count for the selected period
        const leads = Math.round(completed * 0.7); // Example calculation

        setFilteredStats({ scheduled, completed, leads });
    };

    const handleDateSelect = (day) => {
        setSelectedDate(day);
    };

    const resetFilters = () => {
        setSelectedDate(null);
        setFilteredData(fieldData);
        setFilteredStats(stats);
    };

    const handleAddVisit = async (e) => {
        e.preventDefault();
        try {
            const userName = localStorage.getItem('userName');
            await axios.post('/api/field-executive/visit', {
                ...newVisit,
                executive: userName,
                status: 'scheduled'
            });

            setShowAddForm(false);
            setNewVisit({
                client: '',
                location: '',
                date: '',
                purpose: '',
                notes: ''
            });

            // Refresh data
            fetchFieldData();
        } catch (error) {
            console.error('Error adding visit:', error);
            alert('Failed to add visit. Please try again.');
        }
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        try {
            const userName = localStorage.getItem('userName');

            await axios.post('/api/field-executive/report', {
                ...newReport,
                executive: userName,
                leads: Number.isNaN(newReport.leads) ? 0 : newReport.leads,
            });

            setShowReportForm(false);
            setNewReport({
                visitId: '',
                outcome: '',
                details: '',
                leads: 0
            });

            // Refresh data
            fetchFieldData();
        } catch (error) {
            console.error('Error submitting report:', error.response?.data || error.message);
            alert(error.response?.data?.error || 'Failed to submit report. Please try again.');
        }
    };

    // Calendar generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const navigateMonth = (direction) => {
        if (direction > 0) {
            setCurrentDate(addMonths(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    // Get activities for the current month
    const getMonthActivities = () => {
        return fieldData.filter(activity => {
            const activityDate = new Date(activity.date);
            return isSameMonth(activityDate, currentDate);
        });
    };

    // Generate years for dropdown
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

    // Generate months for dropdown
    const months = eachMonthOfInterval({
        start: startOfYear(new Date()),
        end: endOfYear(new Date())
    }).map(month => ({
        value: month,
        label: format(month, 'MMMM')
    }));

    const monthActivities = getMonthActivities();

    if (loading) {
        return <div className="loading">Loading field executive data...</div>;
    }

    return (
        <div className="field-executive-page">
            <AutoLogout />

            <header className="page-header">
                <button onClick={() => navigate('/order')} className="back-btn">
                    &larr; Back to Dashboard
                </button>
                <h1>Field Executive Dashboard</h1>
                <div className="header-actions">
                    <span>Welcome, {localStorage.getItem('userName')}</span>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="toggle-calendar-btn"
                    >
                        {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                    </button>
                </div>
            </header>

            <main className="field-content">
                <div className="main-content-layout">
                    {/* Left column for stats and activities */}
                    <div className="left-column">
                        {/* Stats Section with filters */}
                        <div className="field-stats">
                            <div className="stats-header">
                                <h2>Performance Metrics</h2>
                                <div className="stats-filters">
                                    <select
                                        value={statsMonthFilter.getMonth()}
                                        onChange={(e) => setStatsMonthFilter(new Date(statsYearFilter, e.target.value))}
                                        className="stats-filter-select"
                                    >
                                        {months.map((month, index) => (
                                            <option key={index} value={index}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={statsYearFilter}
                                        onChange={(e) => setStatsYearFilter(parseInt(e.target.value))}
                                        className="stats-filter-select"
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card scheduled">
                                    <div className="stat-icon">📅</div>
                                    <div className="stat-info">
                                        <h3>Scheduled Visits</h3>
                                        <p className="stat-value">{filteredStats.scheduled}</p>
                                    </div>
                                </div>
                                <div className="stat-card completed">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-info">
                                        <h3>Completed Visits</h3>
                                        <p className="stat-value">{filteredStats.completed}</p>
                                    </div>
                                </div>
                                <div className="stat-card leads">
                                    <div className="stat-icon">🔥</div>
                                    <div className="stat-info">
                                        <h3>Leads Generated</h3>
                                        <p className="stat-value">{filteredStats.leads}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activities Section */}
                        <div className="field-activities">
                            <div className="section-header">
                                <h2>Field Activities {selectedDate ? `for ${format(selectedDate, 'MMM d, yyyy')}` : `in ${format(currentDate, 'MMMM yyyy')}`}</h2>
                                <span className="activities-count">{filteredData.length} of {monthActivities.length} activities</span>
                            </div>
                            <div className="activities-table">
                                <div className="table-header">
                                    <span>Date</span>
                                    <span>Client</span>
                                    <span>Location</span>
                                    <span>Purpose</span>
                                    <span>Status</span>
                                </div>
                                {filteredData.length > 0 ? (
                                    filteredData.map((activity, index) => (
                                        <div key={index} className="table-row">
                                            <span>{new Date(activity.date).toLocaleDateString()}</span>
                                            <span className="client-name">{activity.client}</span>
                                            <span>{activity.location}</span>
                                            <span>{activity.purpose}</span>
                                            <span className={`status ${activity.status}`}>
                                                {activity.status}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-data">
                                        {selectedDate
                                            ? `No field activities found for ${format(selectedDate, 'MMM d, yyyy')}`
                                            : `No field activities found for ${format(currentDate, 'MMMM yyyy')}`
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="quick-actions">
                            <h2>Quick Actions</h2>
                            <div className="action-buttons">
                                <button className="action-btn primary" onClick={() => setShowAddForm(true)}>
                                    <span className="icon">➕</span>
                                    <span>Add New Visit</span>
                                </button>
                                <button className="action-btn secondary" onClick={() => setShowReportForm(true)}>
                                    <span className="icon">📝</span>
                                    <span>Submit Report</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right column for calendar - conditionally rendered */}
                    {showCalendar && (
                        <div className="right-column">
                            {/* Calendar Section */}
                            <div className="calendar-section">
                                <div className="section-header">
                                    <h2>Calendar View - {format(currentDate, 'MMMM yyyy')}</h2>
                                    <div className="calendar-controls">
                                        <button onClick={() => navigateMonth(-1)} className="month-nav-btn">&lt; Prev</button>
                                        <button onClick={resetFilters} className="reset-filters-btn">
                                            Show All
                                        </button>
                                        <button onClick={() => navigateMonth(1)} className="month-nav-btn">Next &gt;</button>
                                    </div>
                                </div>
                                <div className="calendar-container">
                                    <div className="calendar-grid">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="calendar-weekday">{day}</div>
                                        ))}
                                        {daysInMonth.map(day => {
                                            const dayActivities = fieldData.filter(activity =>
                                                isSameDay(new Date(activity.date), day)
                                            );

                                            const isSelected = selectedDate && isSameDay(day, selectedDate);
                                            const isCurrentMonth = isSameMonth(day, currentDate);

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    className={`calendar-day ${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'other-month' : ''} ${dayActivities.length > 0 ? 'has-activities' : ''}`}
                                                    onClick={() => isCurrentMonth && handleDateSelect(day)}
                                                >
                                                    <span className="day-number">{format(day, 'd')}</span>
                                                    {dayActivities.length > 0 && (
                                                        <div className="day-activities">
                                                            {dayActivities.slice(0, 3).map((activity, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`activity-dot ${activity.status}`}
                                                                    title={`${activity.client} - ${activity.status}`}
                                                                ></div>
                                                            ))}
                                                            {dayActivities.length > 3 && (
                                                                <span className="more-activities">+{dayActivities.length - 3}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="calendar-legend">
                                    <div className="legend-item">
                                        <div className="legend-dot scheduled"></div>
                                        <span>Scheduled</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-dot completed"></div>
                                        <span>Completed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Visit Form Modal */}
                {showAddForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h2>Schedule New Visit</h2>
                            <form onSubmit={handleAddVisit}>
                                <div className="form-group">
                                    <label>Client Name:</label>
                                    <input
                                        type="text"
                                        value={newVisit.client}
                                        onChange={(e) => setNewVisit({ ...newVisit, client: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Location:</label>
                                    <input
                                        type="text"
                                        value={newVisit.location}
                                        onChange={(e) => setNewVisit({ ...newVisit, location: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date:</label>
                                    <input
                                        type="date"
                                        value={newVisit.date}
                                        onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Purpose:</label>
                                    <input
                                        type="text"
                                        value={newVisit.purpose}
                                        onChange={(e) => setNewVisit({ ...newVisit, purpose: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes:</label>
                                    <textarea
                                        value={newVisit.notes}
                                        onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
                                    />
                                </div>
                                <div className="form-buttons">
                                    <button type="button" onClick={() => setShowAddForm(false)}>Cancel</button>
                                    <button type="submit">Schedule Visit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Submit Report Form Modal */}
                {showReportForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <h2>Submit Visit Report</h2>
                            <form onSubmit={handleSubmitReport}>
                                <div className="form-group">
                                    <label>Visit ID:</label>
                                    <select
                                        value={newReport.visitId}
                                        onChange={(e) => setNewReport({ ...newReport, visitId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select a visit</option>
                                        {fieldData
                                            .filter(activity => activity.status === 'scheduled')
                                            .map(activity => (
                                                <option key={activity._id} value={activity._id}>
                                                    {activity.client} - {new Date(activity.date).toLocaleDateString()}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Outcome:</label>
                                    <input
                                        type="text"
                                        value={newReport.outcome}
                                        onChange={(e) => setNewReport({ ...newReport, outcome: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Details:</label>
                                    <textarea
                                        value={newReport.details}
                                        onChange={(e) => setNewReport({ ...newReport, details: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Leads Generated:</label>
                                    <input
                                        type="number"
                                        value={newReport.leads}
                                        onChange={(e) => setNewReport({ ...newReport, leads: parseInt(e.target.value) })}
                                        min="0"
                                    />
                                </div>
                                <div className="form-buttons">
                                    <button type="button" onClick={() => setShowReportForm(false)}>Cancel</button>
                                    <button type="submit">Submit Report</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
        .field-executive-page {
          padding: 1.5rem;
          background-color: #f8fafc;
          min-height: 100vh;
          position: relative;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          padding: 1.2rem 1.5rem;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .page-header h1 {
          margin: 0;
          font-weight: 600;
          font-size: 1.8rem;
        }
        
        .back-btn {
          padding: 0.6rem 1.2rem;
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .back-btn:hover {
          background-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-weight: 500;
        }
        
        .toggle-calendar-btn {
          padding: 0.6rem 1rem;
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .toggle-calendar-btn:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .field-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .main-content-layout {
          display: grid;
          grid-template-columns: ${showCalendar ? '2fr 1fr' : '1fr'};
          gap: 2rem;
          transition: grid-template-columns 0.3s ease;
        }
        
        .left-column {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .right-column {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        /* Stats Section */
        .field-stats {
          background-color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        
        .stats-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .stats-filters {
          display: flex;
          gap: 0.5rem;
        }
        
        .stats-filter-select {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background-color: white;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.2rem;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          color: white;
          transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-3px);
        }
        
        .stat-card.scheduled {
          background: linear-gradient(135deg,rgb(140, 168, 213) 0%, #2563eb 100%);
        }
        
        .stat-card.completed {
          background: linear-gradient(135deg,rgb(110, 204, 173) 0%, #059669 100%);
        }
        
        .stat-card.leads {
          background: linear-gradient(135deg,rgb(222, 187, 125) 0%, #d97706 100%);
        }
        
        .stat-icon {
          font-size: 2.5rem;
          margin-right: 1.2rem;
          opacity: 0.9;
        }
        
       .stat-info h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: white;   /* ✅ force white text */
  opacity: 1;     /* ✅ remove transparency */
}

.stat-value {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: white;   /* ✅ ensure numbers are white */
}

        
        /* Calendar Section */
        .calendar-section {
          background-color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        
        .section-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .calendar-controls {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        
        .month-nav-btn {
          padding: 0.5rem 0.8rem;
          background-color: #f3f4f6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          font-size: 0.8rem;
        }
        
        .month-nav-btn:hover {
          background-color: #e5e7eb;
        }
        
        .reset-filters-btn {
          padding: 0.5rem 0.8rem;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          font-size: 0.8rem;
        }
        
        .reset-filters-btn:hover {
          background-color: #2563eb;
        }
        
        .calendar-container {
          margin-bottom: 1rem;
        }
        
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.3rem;
        }
        
        .calendar-weekday {
          text-align: center;
          font-size: 0.7rem;
          font-weight: 600;
          color: #6b7280;
          padding: 0.3rem 0;
        }
        
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 0.3rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #f9fafb;
          position: relative;
          border: 1px solid #e5e7eb;
          font-size: 0.8rem;
        }
        
        .calendar-day:hover {
          background-color: #e5e7eb;
        }
        
        .calendar-day.selected {
          background-color: #3b82f6;
          color: white;
        }
        
        .calendar-day.other-month {
          color: #9ca3af;
          background-color: #f3f4f6;
          cursor: not-allowed;
        }
        
        .calendar-day.has-activities {
          border: 2px solid #3b82f6;
        }
        
        .day-number {
          font-size: 0.8rem;
          font-weight: 500;
          align-self: flex-start;
        }
        
        .day-activities {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.1rem;
          width: 100%;
        }
        
        .activity-dot {
          width: 0.4rem;
          height: 0.4rem;
          border-radius: 50%;
        }
        
        .activity-dot.scheduled {
          background-color: #3b82f6;
        }
        
        .activity-dot.completed {
          background-color: #10b981;
        }
        
        .more-activities {
          font-size: 0.6rem;
          font-weight: 600;
          color: #6b7280;
        }
        
        .calendar-legend {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.8rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          color: #6b7280;
        }
        
        .legend-dot {
          width: 0.6rem;
          height: 0.6rem;
          border-radius: 50%;
        }
        
        .legend-dot.scheduled {
          background-color: #3b82f6;
        }
        
        .legend-dot.completed {
          background-color:rgb(1, 5, 3);
        }
        
        /* Activities Section */
        .field-activities {
          background-color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .activities-count {
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
        }
        
        .activities-table {
          display: flex;
          flex-direction: column;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .table-header, .table-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
          padding: 1rem;
        }
        
        .table-header {
          background: linear-gradient(135deg,rgb(188, 186, 231) 0%,rgb(88, 79, 219) 100%);
          font-weight: 600;
          color: white;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.2s ease;
        }
        
        .table-row:hover {
          background-color: #f9fafb;
        }
        
        .table-row:last-child {
          border-bottom: none;
        }
        
        .client-name {
          font-weight: 500;
          color: #1f2937;
        }
        
        .no-data {
          padding: 2.5rem;
          text-align: center;
          color: #6b7280;
          font-style: italic;
          grid-column: 1 / -1;
        }
        
        .status {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-align: center;
          text-transform: capitalize;
          width: fit-content;
        }
        
        .status.completed {
          background-color: #dcfce7;
          color:rgb(40, 112, 30);
        }
        
        .status.scheduled {
          background-color: #dbeafe;
          color:rgb(95, 129, 239);
        }
        
        /* Quick Actions */
        .quick-actions {
          background-color: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .quick-actions h2 {
          margin: 0 0 1.2rem;
          color: #1f2937;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .action-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem 1rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          gap: 0.8rem;
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }
        
        .action-btn.secondary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .action-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        
        .action-btn .icon {
          font-size: 1.8rem;
        }
        
        .action-btn span:last-child {
          font-weight: 500;
          font-size: 0.95rem;
        }
        
        .loading {
          text-align: center;
          padding: 3rem;
          font-size: 1.2rem;
          color: #6b7280;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 1rem;
        }
        
        .modal {
          background-color: white;
          padding: 2rem;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }
        
        .modal h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          color: #1f2937;
          font-weight: 600;
        }
        
        .form-group {
          margin-bottom: 1.2rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
          transition: border 0.2s ease;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        
        .form-buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }
        
        .form-buttons button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }        
        .form-buttons button[type="submit"] {
          background-color: #3b82f6
        
        .form-buttons button[type="submit"] {
          background-color: #3b82f6;
          color: white;
        }
        
        .form-buttons button[type="submit"]:hover {
          background-color: #2563eb;
        }
        
        .form-buttons button[type="button"] {
          background-color: #f3f4f6;
          color: #374151;
        }
        
        @media (max-width: 1024px) {
          .main-content-layout {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .field-executive-page {
            padding: 1rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .header-actions {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .section-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .calendar-controls {
            width: 100%;
            justify-content: space-between;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .calendar-grid {
            gap: 0.3rem;
          }
          
          .table-header, .table-row {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          
          .action-buttons {
            grid-template-columns: 1fr;
          }
          
          .calendar-legend {
            flex-wrap: wrap;
            justify-content: flex-start;
          }
        }
      `}</style>
        </div>
    );
};

export default FieldExecutivePage;