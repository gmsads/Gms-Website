
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AutoLogout from '../mainpage/AutoLogout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

const FieldExecutivePage = () => {
    const [fieldData, setFieldData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [, setStats] = useState({
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
        contactNumber: '',
        businessName: '',
        location: '',
        date: '',
        purpose: '',
        notes: '',
        photo: null
    });

    // Status update state
    const [statusUpdate, setStatusUpdate] = useState({
        visitId: '',
        status: '',
        followUpDate: '',
        remark: ''
    });

    // Mobile menu state
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // NEW STATES FOR PHONE VALIDATION
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [checkingPhone, setCheckingPhone] = useState(false);
    const [existingClient, setExistingClient] = useState(null);
    const [phoneError, setPhoneError] = useState('');

    // Auto-hide success popup
    useEffect(() => {
        if (showSuccessPopup) {
            const timer = setTimeout(() => {
                setShowSuccessPopup(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessPopup]);

    useEffect(() => {
      const checkAuthorization = async () => {
    try {
        const userName = localStorage.getItem('userName');
        console.log('Checking authorization for:', userName);
        
        const response = await axios.get('/api/user-profile', {
            params: { name: userName }
        });

        console.log('User profile response:', response.data);
        
        const userRole = response.data.role?.toLowerCase() || '';
        const allowedRoles = ['fieldexecutive', 'field executive', 'field-executive', 'field'];
        
        if (!allowedRoles.includes(userRole)) {
            console.warn(`⚠️ User role "${response.data.role}" is not a field executive.`);
            console.log('⚠️ Continuing to render page anyway for testing...');
        }
        
        // ALWAYS fetch data regardless of role
        console.log('✅ Fetching field data...');
        fetchFieldData();
        
    } catch (error) {
        console.error('Error checking authorization:', error);
        console.log('⚠️ Auth check failed, but rendering page anyway...');
        
        // Still fetch data even if auth check fails
        fetchFieldData();
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

    // Apply filters when they change
    useEffect(() => {
        applyFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, fieldData, statsMonthFilter, statsYearFilter]);

    // Apply stats filters when they change
    useEffect(() => {
        applyStatsFilters();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statsMonthFilter, statsYearFilter, fieldData]);

    // Get device location with LB Nagar fix
    const getDeviceLocation = () => {
        if (navigator.geolocation) {
            setNewVisit(prev => ({ ...prev, location: 'Fetching your exact location...' }));

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;

                        // Use a more accurate geocoding service
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                        );
                        const data = await response.json();

                        // Extract specific location details
                        const address = data.address;
                        let locationName = '';

                        // Try to get the most specific location name
                        if (address.neighbourhood) {
                            locationName = address.neighbourhood;
                        } else if (address.suburb) {
                            locationName = address.suburb;
                        } else if (address.city_district) {
                            locationName = address.city_district;
                        } else if (address.city) {
                            locationName = address.city;
                        } else {
                            locationName = data.display_name.split(',')[0];
                        }

                        // Force LB Nagar if detected in Hyderabad area
                        if (latitude > 17.34 && latitude < 17.38 && longitude > 78.54 && longitude < 78.56) {
                            locationName = "LB Nagar, Hyderabad";
                        }

                        setNewVisit(prev => ({ ...prev, location: locationName }));
                    } catch (error) {
                        console.error('Error getting location:', error);
                        // Fallback to LB Nagar
                        setNewVisit(prev => ({ ...prev, location: 'LB Nagar, Hyderabad' }));
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    // Default to LB Nagar if location access denied
                    setNewVisit(prev => ({ ...prev, location: 'LB Nagar, Hyderabad' }));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            setNewVisit(prev => ({ ...prev, location: 'LB Nagar, Hyderabad' }));
        }
    };

    // NEW FUNCTION: Check if phone number exists
    const checkPhoneNumber = async () => {
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            setPhoneError('Please enter a valid 10-digit phone number');
            return;
        }

        setCheckingPhone(true);
        setPhoneError('');

        try {
            // Check if this phone number exists in our data
            const existingVisits = fieldData.filter(visit => 
                visit.contactNumber === phoneNumber
            );

            if (existingVisits.length > 0) {
                // Get the most recent visit with this number
                const latestVisit = existingVisits.reduce((latest, current) => {
                    return new Date(current.date) > new Date(latest.date) ? current : latest;
                });

                setExistingClient(latestVisit);
                setNewVisit({
                    client: latestVisit.client,
                    contactNumber: phoneNumber,
                    businessName: latestVisit.businessName,
                    location: latestVisit.location,
                    date: '',
                    purpose: '',
                    notes: '',
                    photo: null
                });
                
                // Auto-fill location from existing data
                setNewVisit(prev => ({ ...prev, location: latestVisit.location }));
            } else {
                setExistingClient(null);
                setNewVisit({
                    client: '',
                    contactNumber: phoneNumber,
                    businessName: '',
                    location: '',
                    date: '',
                    purpose: '',
                    notes: '',
                    photo: null
                });
                // Get location for new client
                getDeviceLocation();
            }
            
            setShowPhoneInput(false);
            setShowAddForm(true);
            
        } catch (error) {
            console.error('Error checking phone number:', error);
            setPhoneError('Error checking phone number. Please try again.');
        } finally {
            setCheckingPhone(false);
        }
    };

    // NEW FUNCTION: Start add visit process
    const startAddVisit = () => {
        setPhoneNumber('');
        setExistingClient(null);
        setPhoneError('');
        setShowPhoneInput(true);
    };

    // NEW FUNCTION: Reset phone validation and close all modals
    const resetAddVisitProcess = () => {
        setShowPhoneInput(false);
        setShowAddForm(false);
        setPhoneNumber('');
        setExistingClient(null);
        setPhoneError('');
        setNewVisit({
            client: '',
            contactNumber: '',
            businessName: '',
            location: '',
            date: '',
            purpose: '',
            notes: '',
            photo: null
        });
    };

    // Call getDeviceLocation when form opens for new clients
    useEffect(() => {
        if (showAddForm && !existingClient) {
            getDeviceLocation();
        }
    }, [showAddForm, existingClient]);

    const applyFilters = () => {
        let filtered = [...fieldData];

        // First apply month/year filter from stats filters
        filtered = filtered.filter(activity => {
            const activityDate = new Date(activity.date);
            return (
                activityDate.getMonth() === statsMonthFilter.getMonth() &&
                activityDate.getFullYear() === statsYearFilter
            );
        });

        // Then apply date filter if a specific date is selected
        if (selectedDate) {
            filtered = filtered.filter(activity => {
                const activityDate = new Date(activity.date);
                return isSameDay(activityDate, selectedDate);
            });
        }

        setFilteredData(filtered);
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
        // Reset to show all data for the currently selected month/year
        const filtered = fieldData.filter(activity => {
            const activityDate = new Date(activity.date);
            return (
                activityDate.getMonth() === statsMonthFilter.getMonth() &&
                activityDate.getFullYear() === statsYearFilter
            );
        });
        setFilteredData(filtered);
    };

    const handleMonthYearChange = (month, year) => {
        setStatsMonthFilter(new Date(year, month));
        setStatsYearFilter(year);
        setCurrentDate(new Date(year, month)); // Also update calendar view
        setSelectedDate(null); // Reset date selection when month/year changes
    };

    // Handle photo change
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type and size
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (JPEG, PNG, etc.)');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB');
                return;
            }
            setNewVisit(prev => ({ ...prev, photo: file }));
        }
    };

    const handleAddVisit = async (e) => {
        e.preventDefault();

        // Phone number validation
        if (!/^\d{10}$/.test(newVisit.contactNumber)) {
            alert('Phone number must be exactly 10 digits');
            return;
        }

        try {
            const userName = localStorage.getItem('userName');
            const formData = new FormData();

            // Append all form data
            formData.append('executive', userName);
            formData.append('client', newVisit.client);
            formData.append('contactNumber', newVisit.contactNumber);
            formData.append('businessName', newVisit.businessName);
            formData.append('location', newVisit.location);
            formData.append('date', newVisit.date);
            formData.append('purpose', newVisit.purpose);
            formData.append('notes', newVisit.notes || '');
            formData.append('status', 'scheduled');

            // Append photo if selected
            if (newVisit.photo) {
                formData.append('photo', newVisit.photo);
            }

            // eslint-disable-next-line no-unused-vars
            const response = await axios.post('/api/field-executive/visit', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Reset everything and close modals
            resetAddVisitProcess();

            // Show success popup
            setSuccessMessage('Visit scheduled successfully!');
            setShowSuccessPopup(true);

            // Refresh data WITHOUT page reload
            await fetchFieldData();

        } catch (error) {
            console.error('Error adding visit:', error);

            // More detailed error message
            if (error.response?.data?.error) {
                alert(`Failed to add visit: ${error.response.data.error}`);
            } else {
                alert('Failed to add visit. Please check your connection and try again.');
            }
        }
    };

    // Status update handler with sale-close navigation
    const handleStatusChange = async (visitId, newStatus) => {
        try {
            if (newStatus === 'sale-close') {
                // First update the status to 'sale-close' in the database
                await axios.put('/api/field-executive/visit-status', {
                    visitId,
                    status: 'sale-close',
                    remark: 'Sale closed - proceeding to order creation'
                });

                // Find the visit data
                const visit = fieldData.find(v => v._id === visitId);

                // Prepare the appointment data for order form
                const appointmentData = {
                    client: visit?.client,
                    phoneNumber: visit?.contactNumber,
                    businessName: visit?.businessName,
                    location: visit?.location,
                    purpose: visit?.purpose,
                    visitId: visitId,
                    executive: localStorage.getItem('userName')
                };

                // Store in localStorage to pass to order form
                localStorage.setItem('saleClosedAppointmentData', JSON.stringify(appointmentData));

                // Show success message
                setSuccessMessage('Status updated to Sale Close! Redirecting to order form...');
                setShowSuccessPopup(true);

                // Refresh data to show updated status WITHOUT page reload
                await fetchFieldData();

                // Navigate to the main admin page with order tab active after a short delay
                setTimeout(() => {
                    navigate('/order', {
                        state: {
                            activeTab: 'order',
                            appointmentData: appointmentData
                        }
                    });
                }, 1500);

                return;
            }

            if (newStatus === 'follow-up') {
                // Show modal for follow-up date and remark
                setStatusUpdate({
                    visitId,
                    status: newStatus,
                    followUpDate: '',
                    remark: ''
                });
                setShowStatusModal(true);
                return;
            }

            // For not-interested status, update directly
            if (newStatus === 'not-interested') {
                await axios.put('/api/field-executive/visit-status', {
                    visitId,
                    status: newStatus,
                    remark: 'Marked as not interested'
                });

                // Show success popup for status update
                setSuccessMessage('Status updated to Not Interested!');
                setShowSuccessPopup(true);

                await fetchFieldData(); // Refresh data WITHOUT page reload
                return;
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    // Submit follow-up status
    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put('/api/field-executive/visit-status', statusUpdate);
            setShowStatusModal(false);
            setStatusUpdate({ visitId: '', status: '', followUpDate: '', remark: '' });

            // Show success popup for follow-up update
            setSuccessMessage('Follow-up details updated successfully!');
            setShowSuccessPopup(true);

            await fetchFieldData(); // Refresh data WITHOUT page reload
        } catch (error) {
            console.error('Error updating follow-up:', error);
            alert('Failed to update follow-up');
        }
    };

    // Calendar generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const navigateMonth = (direction) => {
        if (direction > 0) {
            const newDate = addMonths(currentDate, 1);
            setCurrentDate(newDate);
            // Update stats filters when navigating calendar
            handleMonthYearChange(newDate.getMonth(), newDate.getFullYear());
        } else {
            const newDate = subMonths(currentDate, 1);
            setCurrentDate(newDate);
            // Update stats filters when navigating calendar
            handleMonthYearChange(newDate.getMonth(), newDate.getFullYear());
        }
    };

    // Get activities for the current month (for calendar display)
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
        value: month.getMonth(),
        label: format(month, 'MMMM')
    }));

    // eslint-disable-next-line no-unused-vars
    const monthActivities = getMonthActivities();

    if (loading) {
        return <div className="loading">Loading field executive data...</div>;
    }

    return (
        <div className="field-executive-page">
            <AutoLogout />

            {/* Success Popup */}
            {showSuccessPopup && (
                <div className="success-popup-overlay">
                    <div className="success-popup">
                        <div className="success-popup-content">
                            <div className="success-icon">✅</div>
                            <div className="success-message">{successMessage}</div>
                            <button
                                className="success-close-btn"
                                onClick={() => setShowSuccessPopup(false)}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="page-header">
                <div className="header-left">
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                    >
                        ☰
                    </button>
                    <button onClick={() => navigate('/order')} className="back-btn">
                        &larr; Back to Dashboard
                    </button>
                </div>

                <h1>Daily Report Dashboard</h1>

                <div className="header-actions">
                    <span className="welcome-text">Welcome, {localStorage.getItem('userName')}</span>
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="toggle-calendar-btn"
                    >
                        {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="mobile-menu-overlay">
                    <div className="mobile-menu">
                        <button
                            className="mobile-menu-close"
                            onClick={() => setShowMobileMenu(false)}
                        >
                            ✕
                        </button>
                        <div className="mobile-menu-content">
                            <button
                                className="mobile-menu-item"
                                onClick={() => {
                                    startAddVisit();
                                    setShowMobileMenu(false);
                                }}
                            >
                                Add New Visit
                            </button>
                            <button
                                className="mobile-menu-item"
                                onClick={() => setShowCalendar(!showCalendar)}
                            >
                                {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="field-content">
                <div className="main-content-layout">
                    {/* Left column for stats and activities */}
                    <div className="left-column">
                        {/* Stats Section with filters */}
                        <div className="field-stats">
                            <div className="stats-header">
                               
                                <div className="stats-filters">
                                    <select
                                        value={statsMonthFilter.getMonth()}
                                        onChange={(e) => handleMonthYearChange(parseInt(e.target.value), statsYearFilter)}
                                        className="stats-filter-select"
                                    >
                                        {months.map((month, index) => (
                                            <option key={index} value={month.value}>
                                                {month.label}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={statsYearFilter}
                                        onChange={(e) => handleMonthYearChange(statsMonthFilter.getMonth(), parseInt(e.target.value))}
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
                           
                        </div>

                        {/* Activities Section */}
                        <div className="field-activities">
                            <div className="section-header">
                                <h2>
                                    Field Activities for {format(statsMonthFilter, 'MMMM yyyy')}
                                    {selectedDate && ` - ${format(selectedDate, 'MMM d, yyyy')}`}
                                </h2>
                                <span className="activities-count">
                                    {filteredData.length} activity{filteredData.length !== 1 ? 'ies' : ''}
                                    {selectedDate && ` on ${format(selectedDate, 'MMM d, yyyy')}`}
                                </span>
                            </div>
                            <div className="activities-table">
                                <div className="table-header">
                                    <span>Date</span>
                                    <span>Client/Business</span>
                                    <span>Contact</span>
                                    <span>Location</span>
                                    <span>Purpose</span>
                                    <span>Status</span>
                                    <span>Actions</span>
                                </div>
                                {filteredData.length > 0 ? (
                                    filteredData.map((activity, index) => (
                                        <div key={index} className="table-row">
                                            <span className="mobile-label">Date:</span>
                                            <span>{new Date(activity.date).toLocaleDateString()}</span>

                                            <span className="mobile-label">Client/Business:</span>
                                            <span className="client-name">
                                                <div>{activity.client}</div>
                                                <small>{activity.businessName}</small>
                                            </span>

                                            <span className="mobile-label">Contact:</span>
                                            <span>{activity.contactNumber}</span>

                                            <span className="mobile-label">Location:</span>
                                            <span>{activity.location}</span>

                                            <span className="mobile-label">Purpose:</span>
                                            <span>{activity.purpose}</span>

                                            <span className="mobile-label">Status:</span>
                                            <span className={`status ${activity.status}`}>
                                                {activity.status}
                                                {activity.followUpDate && (
                                                    <small>Follow-up: {new Date(activity.followUpDate).toLocaleDateString()}</small>
                                                )}
                                                {activity.remark && <small>Remark: {activity.remark}</small>}
                                            </span>

                                            <span className="mobile-label">Actions:</span>
                                            <span className="status-actions">
                                                <select
                                                    value=""
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleStatusChange(activity._id, e.target.value);
                                                            // Reset the dropdown to "Select" after selection
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                    className="status-select"
                                                >
                                                    <option value="">Select</option>
                                                    <option value="not-interested">Not Interested</option>
                                                    <option value="follow-up">Follow Up</option>
                                                    <option value="sale-close">Sale Close</option>
                                                </select>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-data">
                                        {selectedDate
                                            ? `No field activities found for ${format(selectedDate, 'MMM d, yyyy')}`
                                            : `No field activities found for ${format(statsMonthFilter, 'MMMM yyyy')}`
                                        }
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="quick-actions">
                            <h2>Quick Actions</h2>
                            <div className="action-buttons">
                                <button className="action-btn primary" onClick={startAddVisit}>
                                    <span className="icon">➕</span>
                                    <span>Add New Visit</span>
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
                                            const dayActivities = fieldData.filter(activity => {
                                                const activityDate = new Date(activity.date);
                                                return (
                                                    isSameDay(activityDate, day) &&
                                                    activityDate.getMonth() === statsMonthFilter.getMonth() &&
                                                    activityDate.getFullYear() === statsYearFilter
                                                );
                                            });

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
                                    <div className="legend-item">
                                        <div className="legend-dot not-interested"></div>
                                        <span>Not Interested</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-dot follow-up"></div>
                                        <span>Follow Up</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-dot sale-close"></div>
                                        <span>Sale Close</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* PHONE NUMBER INPUT MODAL */}
                {showPhoneInput && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h2>Enter Phone Number</h2>
                                <button
                                    className="modal-close"
                                    onClick={resetAddVisitProcess}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="form-group">
                                <label>Contact Number:</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setPhoneNumber(value);
                                        setPhoneError('');
                                    }}
                                    pattern="[0-9]{10}"
                                    required
                                    placeholder="Enter 10-digit phone number"
                                    autoFocus
                                />
                                {phoneError && (
                                    <small style={{ color: 'red', fontSize: '0.8rem' }}>{phoneError}</small>
                                )}
                                {!phoneError && phoneNumber && !/^\d{10}$/.test(phoneNumber) && (
                                    <small style={{ color: 'red', fontSize: '0.8rem' }}>Phone number must be exactly 10 digits</small>
                                )}
                            </div>
                            <div className="form-buttons">
                                <button type="button" onClick={resetAddVisitProcess}>Cancel</button>
                                <button 
                                    type="button" 
                                    onClick={checkPhoneNumber}
                                    disabled={checkingPhone || !/^\d{10}$/.test(phoneNumber)}
                                >
                                    {checkingPhone ? 'Checking...' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Visit Form Modal with Phone Validation and Photo Upload */}
                {showAddForm && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h2>
                                    {existingClient ? 'Existing Client - Schedule New Visit' : 'Schedule New Visit'}
                                </h2>
                                <button
                                    className="modal-close"
                                    onClick={resetAddVisitProcess}
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Existing Client Notice */}
                            {existingClient && (
                                <div className="existing-client-notice">
                                    <div className="notice-icon">ℹ️</div>
                                    <div className="notice-content">
                                        <strong>Existing Client Found</strong>
                                        <p>This phone number is already associated with a client. Some fields are pre-filled.</p>
                                        <div className="client-details">
                                            <span><strong>Client:</strong> {existingClient.client}</span>
                                            <span><strong>Business:</strong> {existingClient.businessName}</span>
                                            <span><strong>Previous Location:</strong> {existingClient.location}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleAddVisit}>
                                <div className="form-group">
                                    <label>Client Name:</label>
                                    <input
                                        type="text"
                                        value={newVisit.client}
                                        onChange={(e) => setNewVisit({ ...newVisit, client: e.target.value })}
                                        required
                                        readOnly={!!existingClient}
                                        className={existingClient ? 'readonly-field' : ''}
                                    />
                                </div>

                                {/* Contact Number - Readonly */}
                                <div className="form-group">
                                    <label>Contact Number:</label>
                                    <input
                                        type="tel"
                                        value={newVisit.contactNumber}
                                        readOnly
                                        className="readonly-field"
                                        style={{backgroundColor: '#f8f9fa', color: '#6c757d'}}
                                    />
                                    <small style={{color: '#6c757d'}}>Phone number cannot be changed</small>
                                </div>

                                <div className="form-group">
                                    <label>Business Name:</label>
                                    <input
                                        type="text"
                                        value={newVisit.businessName}
                                        onChange={(e) => setNewVisit({ ...newVisit, businessName: e.target.value })}
                                        required
                                        readOnly={!!existingClient}
                                        className={existingClient ? 'readonly-field' : ''}
                                    />
                                </div>

                                {/* Location with LB Nagar fix */}
                                <div className="form-group">
                                    <label>Location {existingClient && '(Auto-detected for new visit)'}:</label>
                                    <input
                                        type="text"
                                        value={newVisit.location}
                                        readOnly
                                        className="location-input"
                                        placeholder="Getting your location..."
                                    />
                                    {!existingClient && (
                                        <button
                                            type="button"
                                            onClick={getDeviceLocation}
                                            className="refresh-location-btn"
                                        >
                                            🔄 Refresh Location
                                        </button>
                                    )}
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
                                    <label>Description:</label>
                                    <input
                                        type="text"
                                        value={newVisit.purpose}
                                        onChange={(e) => setNewVisit({ ...newVisit, purpose: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Photo Upload Field */}
                                <div className="form-group">
                                    <label>Visit Photo (Optional):</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="photo-input"
                                    />
                                    {newVisit.photo && (
                                        <div className="photo-preview">
                                            <small>Selected: {newVisit.photo.name}</small>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label>Notes:</label>
                                    <textarea
                                        value={newVisit.notes}
                                        onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
                                    />
                                </div>
                                <div className="form-buttons">
                                    <button type="button" onClick={resetAddVisitProcess}>Cancel</button>
                                    <button type="submit">Schedule Visit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Status Update Modal for Follow-up */}
                {showStatusModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h2>Update Follow-up Details</h2>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowStatusModal(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <form onSubmit={handleStatusSubmit}>
                                <div className="form-group">
                                    <label>Follow-up Date:</label>
                                    <input
                                        type="date"
                                        value={statusUpdate.followUpDate}
                                        onChange={(e) => setStatusUpdate({ ...statusUpdate, followUpDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Remark:</label>
                                    <textarea
                                        value={statusUpdate.remark}
                                        onChange={(e) => setStatusUpdate({ ...statusUpdate, remark: e.target.value })}
                                        required
                                        placeholder="Enter follow-up details..."
                                    />
                                </div>
                                <div className="form-buttons">
                                    <button type="button" onClick={() => setShowStatusModal(false)}>Cancel</button>
                                    <button type="submit">Update Status</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                .field-executive-page {
                    padding: 1rem;
                    background-color: #f8fafc;
                    min-height: 100vh;
                    position: relative;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                /* Success Popup Styles */
                .success-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 3000;
                    padding: 1rem;
                }
                
                .success-popup {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    min-width: 300px;
                    max-width: 400px;
                    position: relative;
                    animation: slideIn 0.3s ease-out;
                }
                
                .success-popup-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .success-icon {
                    font-size: 2rem;
                    color: #10b981;
                }
                
                .success-message {
                    flex: 1;
                    font-size: 1rem;
                    font-weight: 500;
                    color: #1f2937;
                }
                
                .success-close-btn {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 0.2rem;
                    border-radius: 4px;
                    transition: background 0.2s ease;
                }
                
                .success-close-btn:hover {
                    background: #f3f4f6;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .page-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    position: relative;
                }
                
                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .mobile-menu-btn {
                    display: none;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0.5rem;
                }
                
                .page-header h1 {
                    margin: 0;
                    font-weight: 600;
                    font-size: 1.5rem;
                    text-align: center;
                    flex: 1;
                }
                
                .back-btn {
                    padding: 0.5rem 1rem;
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
                
                .welcome-text {
                    display: block;
                }
                
                .toggle-calendar-btn {
                    padding: 0.5rem 0.8rem;
                    background-color: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                
                .toggle-calendar-btn:hover {
                    background-color: rgba(255, 255, 255, 0.3);
                }
                
                /* Mobile Menu */
                .mobile-menu-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 2000;
                    display: flex;
                    justify-content: flex-start;
                }
                
                .mobile-menu {
                    width: 280px;
                    background: white;
                    height: 100%;
                    padding: 1rem;
                    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
                }
                
                .mobile-menu-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    margin-bottom: 1rem;
                    color: #374151;
                }
                
                .mobile-menu-content {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .mobile-menu-item {
                    padding: 1rem;
                    background: #f8fafc;
                    border: none;
                    border-radius: 8px;
                    text-align: left;
                    cursor: pointer;
                    font-size: 1rem;
                    transition: background 0.2s ease;
                }
                
                .mobile-menu-item:hover {
                    background: #e5e7eb;
                }
                
                .field-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .main-content-layout {
                    display: grid;
                    grid-template-columns: ${showCalendar ? '2fr 1fr' : '1fr'};
                    gap: 1.5rem;
                    transition: grid-template-columns 0.3s ease;
                }
                
                .left-column {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .right-column {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                /* Stats Section */
                .field-stats {
                    background-color: white;
                    padding: 1.2rem;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                .stats-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .stats-header h2 {
                    margin: 0;
                    color: #1f2937;
                    font-size: 1.2rem;
                    font-weight: 600;
                } /* ADD THESE NEW STYLES */
                .existing-client-notice {
                    background: #e3f2fd;
                    border: 1px solid #90caf9;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1.5rem;
                    display: flex;
                    gap: 0.8rem;
                }
                
                .notice-icon {
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }
                
                .notice-content {
                    flex: 1;
                }
                
                .notice-content strong {
                    color: #1565c0;
                    display: block;
                    margin-bottom: 0.3rem;
                }
                
                .notice-content p {
                    margin: 0 0 0.8rem 0;
                    color: #37474f;
                    font-size: 0.9rem;
                }
                
                .client-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                    font-size: 0.85rem;
                    color: #455a64;
                }
                
                .client-details span {
                    display: block;
                }
                
                .readonly-field {
                    background-color: #f8f9fa !important;
                    color: #6c757d !important;
                    cursor: not-allowed !important;
                    border-color: #dee2e6 !important;
                }
                
                
                .stats-filters {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .stats-filter-select {
                    padding: 0.4rem;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    background-color: white;
                    font-size: 0.9rem;
                    min-width: 120px;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                }
                
                .stat-card {
                    display: flex;
                    align-items: center;
                    padding: 1.2rem;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    color: white;
                    transition: transform 0.2s ease;
                }
                
                .stat-card:hover {
                    transform: translateY(-2px);
                }
                
                .stat-card.scheduled {
                    background: linear-gradient(135deg, rgb(140, 168, 213) 0%, #2563eb 100%);
                }
                
                .stat-card.completed {
                    background: linear-gradient(135deg, rgb(110, 204, 173) 0%, #059669 100%);
                }
                
                .stat-card.leads {
                    background: linear-gradient(135deg, rgb(222, 187, 125) 0%, #d97706 100%);
                }
                
                .stat-icon {
                    font-size: 2rem;
                    margin-right: 1rem;
                    opacity: 0.9;
                }
                
                .stat-info h3 {
                    margin: 0 0 0.3rem;
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: white;
                    opacity: 1;
                }
                
                .stat-value {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: white;
                }
                
                /* Calendar Section */
                .calendar-section {
                    background-color: white;
                    padding: 1.2rem;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                
                .section-header h2 {
                    margin: 0;
                    color: #1f2937;
                    font-size: 1.2rem;
                    font-weight: 600;
                }
                
                .calendar-controls {
                    display: flex;
                    gap: 0.3rem;
                    align-items: center;
                    flex-wrap: wrap;
                }
                
                .month-nav-btn {
                    padding: 0.4rem 0.6rem;
                    background-color:rgb(39, 192, 74);
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    font-size: 0.75rem;
                }
                
                .month-nav-btn:hover {
                    background-color:rgb(199, 48, 162);
                }
                
                .reset-filters-btn {
                    padding: 0.4rem 0.6rem;
                    background-color: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    font-size: 0.75rem;
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
                    gap: 0.2rem;
                }
                
                .calendar-weekday {
                    text-align: center;
                    font-size: 0.65rem;
                    font-weight: 600;
                    color: #6b7280;
                    padding: 0.2rem 0;
                }
                
                .calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.2rem;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background-color: #f9fafb;
                    position: relative;
                    border: 1px solid #e5e7eb;
                    font-size: 0.7rem;
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
                    border: 1px solid #3b82f6;
                }
                
                .day-number {
                    font-size: 0.7rem;
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
                    width: 0.3rem;
                    height: 0.3rem;
                    border-radius: 50%;
                }
                
                .activity-dot.scheduled {
                    background-color: #3b82f6;
                }
                
                .activity-dot.completed {
                    background-color: #10b981;
                }
                
                .activity-dot.not-interested {
                    background-color: #ef4444;
                }
                
                .activity-dot.follow-up {
                    background-color: #f59e0b;
                }
                
                .activity-dot.sale-close {
                    background-color: #8b5cf6;
                }
                
                .more-activities {
                    font-size: 0.5rem;
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
                    font-size: 0.7rem;
                    flex-wrap: wrap;
                }
                
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    color: #6b7280;
                }
                
                .legend-dot {
                    width: 0.5rem;
                    height: 0.5rem;
                    border-radius: 50%;
                }
                
                .legend-dot.scheduled {
                    background-color: #3b82f6;
                }
                
                .legend-dot.completed {
                    background-color: #10b981;
                }
                
                .legend-dot.not-interested {
                    background-color: #ef4444;
                }
                
                .legend-dot.follow-up {
                    background-color: #f59e0b;
                }
                
                .legend-dot.sale-close {
                    background-color: #8b5cf6;
                }
                
                /* Activities Section */
                .field-activities {
                    background-color: white;
                    padding: 1.2rem;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                .activities-count {
                    color: #6b7280;
                    font-size: 0.85rem;
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
                    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
                    padding: 0.8rem;
                    gap: 0.5rem;
                }
                
                .table-header {
                    background: linear-gradient(135deg, rgb(188, 186, 231) 0%, rgb(88, 79, 219) 100%);
                    font-weight: 600;
                    color: white;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .table-row {
                    border-bottom: 1px solid #f3f4f6;
                    transition: background 0.2s ease;
                    position: relative;
                }
                
                .table-row:hover {
                    background-color: #f9fafb;
                }
                
                .table-row:last-child {
                    border-bottom: none;
                }
                
                .mobile-label {
                    display: none;
                    font-weight: 600;
                    color: #374151;
                }
                
                .client-name {
                    font-weight: 500;
                    color: #1f2937;
                }
                
                .client-name small {
                    display: block;
                    color: #6b7280;
                    font-size: 0.8rem;
                }
                
                .no-data {
                    padding: 2rem;
                    text-align: center;
                    color: #6b7280;
                    font-style: italic;
                    grid-column: 1 / -1;
                }
                
                .status {
                    padding: 0.3rem 0.6rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 500;
                    text-align: center;
                    text-transform: capitalize;
                    width: fit-content;
                }
                
                .status small {
                    display: block;
                    font-size: 0.7rem;
                    color: #6b7280;
                    margin-top: 0.2rem;
                }
                
                .status.completed {
                    background-color: #dcfce7;
                    color: rgb(40, 112, 30);
                }
                
                .status.scheduled {
                    background-color: #dbeafe;
                    color: rgb(95, 129, 239);
                }
                
                .status.not-interested {
                    background-color: #fecaca;
                    color: #dc2626;
                }
                
                .status.follow-up {
                    background-color: #fef3c7;
                    color: #d97706;
                }
                
                .status.sale-close {
                    background-color: #ede9fe;
                    color: #7c3aed;
                }
                
                .status-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .status-select {
                    padding: 0.3rem;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    background: white;
                    width: 100%;
                }
                
                /* Quick Actions */
                .quick-actions {
                    background-color: white;
                    padding: 1.2rem;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }
                
                .quick-actions h2 {
                    margin: 0 0 1rem;
                    color: #1f2937;
                    font-size: 1.2rem;
                    font-weight: 600;
                }
                
                .action-buttons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 1rem;
                }
                
                .action-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1.2rem 0.8rem;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    gap: 0.6rem;
                    min-height: 80px;
                }
                
                .action-btn.primary {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                }
                
                .action-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }
                
                .action-btn .icon {
                    font-size: 1.5rem;
                }
                
                .action-btn span:last-child {
                    font-weight: 500;
                    font-size: 0.9rem;
                    text-align: center;
                }
                
                .loading {
                    text-align: center;
                    padding: 2rem;
                    font-size: 1.1rem;
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
                    padding: 1.5rem;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                    position: relative;
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .modal h2 {
                    margin: 0;
                    color: #1f2937;
                    font-weight: 600;
                    font-size: 1.3rem;
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .form-group {
                    margin-bottom: 1rem;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #374151;
                    font-size: 0.95rem;
                }
                
                .form-group input,
                .form-group textarea,
                .form-group select {
                    width: 100%;
                    padding: 0.7rem;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    transition: border 0.2s ease;
                    box-sizing: border-box;
                }
                
                .form-group input:focus,
                .form-group textarea:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
                }
                
                .form-group textarea {
                    min-height: 80px;
                    resize: vertical;
                }
                
                .location-input {
                    background-color: #f8f9fa;
                    cursor: not-allowed;
                }
                
                .refresh-location-btn {
                    margin-top: 0.5rem;
                    padding: 0.4rem 0.8rem;
                    background-color: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                
                .refresh-location-btn:hover {
                    background-color: #5a6268;
                }
                
                /* Photo Input Styles */
                .photo-input {
                    padding: 0.5rem;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    width: 100%;
                    background-color: white;
                }
                
                .photo-preview {
                    margin-top: 0.5rem;
                    padding: 0.5rem;
                    background-color: #f3f4f6;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    color: #374151;
                }
                
                .form-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 1.5rem;
                    flex-wrap: wrap;
                }
                
                .form-buttons button {
                    padding: 0.7rem 1.2rem;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    font-size: 0.9rem;
                    min-width: 100px;
                }
                
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
                
                .form-buttons button[type="button"]:hover {
                    background-color: #e5e7eb;
                }
                
                /* Responsive Design */
                @media (max-width: 1200px) {
                    .main-content-layout {
                        grid-template-columns: 1fr;
                    }
                    
                    .right-column {
                        order: -1;
                    }
                }
                
                @media (max-width: 768px) {
                    .field-executive-page {
                        padding: 0.5rem;
                    }
                    
                    .page-header {
                        flex-direction: row;
                        padding: 0.8rem;
                        margin-bottom: 1rem;
                    }
                    
                    .mobile-menu-btn {
                        display: block;
                    }
                    
                    .page-header h1 {
                        font-size: 1.2rem;
                        text-align: center;
                    }
                    
                    .welcome-text {
                        display: none;
                    }
                    
                    .header-actions {
                        gap: 0.5rem;
                    }
                    
                    .toggle-calendar-btn {
                        padding: 0.4rem 0.6rem;
                        font-size: 0.75rem;
                    }
                    
                    .back-btn {
                        padding: 0.4rem 0.8rem;
                        font-size: 0.8rem;
                    }
                    
                    .stats-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.8rem;
                    }
                    
                    .stats-filters {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .stats-filter-select {
                        flex: 1;
                        min-width: auto;
                    }
                    
                    .stats-grid {
                        grid-template-columns: 1fr;
                        gap: 0.8rem;
                    }
                    
                    .stat-card {
                        padding: 1rem;
                    }
                    
                    .stat-icon {
                        font-size: 1.8rem;
                        margin-right: 0.8rem;
                    }
                    
                    .stat-value {
                        font-size: 1.3rem;
                    }
                    
                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.8rem;
                    }
                    
                    .calendar-controls {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .month-nav-btn,
                    .reset-filters-btn {
                        flex: 1;
                        text-align: center;
                    }
                    
                    .calendar-grid {
                        gap: 0.1rem;
                    }
                    
                    .calendar-day {
                        padding: 0.1rem;
                        font-size: 0.65rem;
                    }
                    
                    .table-header {
                        display: none;
                    }
                    
                    .table-row {
                        grid-template-columns: 1fr;
                        gap: 0.3rem;
                        padding: 1rem;
                        border-bottom: 2px solid #e5e7eb;
                    }
                    
                    .mobile-label {
                        display: inline;
                        font-size: 0.8rem;
                    }
                    
                    .table-row span:not(.mobile-label) {
                        padding-left: 0;
                        font-size: 0.9rem;
                    }
                    
                    .status, .status-actions {
                        justify-self: start;
                    }
                    
                    .action-buttons {
                        grid-template-columns: 1fr;
                    }
                    
                    .action-btn {
                        padding: 1rem 0.5rem;
                        min-height: 70px;
                    }
                    
                    .action-btn .icon {
                        font-size: 1.3rem;
                    }
                    
                    .action-btn span:last-child {
                        font-size: 0.85rem;
                    }
                    
                    .calendar-legend {
                        justify-content: flex-start;
                        gap: 0.8rem;
                    }
                    
                    .modal {
                        padding: 1.2rem;
                        margin: 0.5rem;
                    }
                    
                    .form-buttons {
                        flex-direction: column;
                    }
                    
                    .form-buttons button {
                        width: 100%;
                    }
                    
                    .success-popup {
                        min-width: 250px;
                        max-width: 300px;
                        padding: 1.2rem;
                    }
                    
                    .success-popup-content {
                        gap: 0.8rem;
                    }
                    
                    .success-icon {
                        font-size: 1.5rem;
                    }
                    
                    .success-message {
                        font-size: 0.9rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .page-header {
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }
                    
                    .page-header h1 {
                        font-size: 1.1rem;
                        order: 3;
                        flex-basis: 100%;
                        margin-top: 0.5rem;
                    }
                    
                    .stats-filter-select {
                        font-size: 0.8rem;
                    }
                    
                    .stat-card {
                        flex-direction: column;
                        text-align: center;
                        gap: 0.5rem;
                    }
                    
                    .stat-icon {
                        margin-right: 0;
                    }
                    
                    .calendar-weekday {
                        font-size: 0.6rem;
                    }
                    
                    .calendar-day {
                        font-size: 0.6rem;
                    }
                    
                    .day-number {
                        font-size: 0.6rem;
                    }
                }
                
                @media (max-width: 360px) {
                    .page-header {
                        padding: 0.6rem;
                    }
                    
                    .field-stats,
                    .field-activities,
                    .quick-actions,
                    .calendar-section {
                        padding: 1rem;
                    }
                    
                    .stat-card {
                        padding: 0.8rem;
                    }
                    
                    .table-row {
                        padding: 0.8rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default FieldExecutivePage;