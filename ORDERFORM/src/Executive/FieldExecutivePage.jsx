import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AutoLogout from '../mainpage/AutoLogout';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const FieldExecutivePage = () => {
    const [fieldData, setFieldData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [stats, setStats] = useState({ scheduled: 0, saleClosed: 0 });

    // Camera modal states
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [stream, setStream] = useState(null);
    const [currentLocation, setCurrentLocation] = useState(null);

    // Refs
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

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

    // Phone validation states
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [checkingPhone, setCheckingPhone] = useState(false);
    const [existingClient, setExistingClient] = useState(null);
    const [phoneError, setPhoneError] = useState('');

    // Load cached data on mount
    useEffect(() => {
        const cachedData = localStorage.getItem('fieldExecutiveData');
        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                const hoursSinceCache = (Date.now() - timestamp) / (1000 * 60 * 60);
                
                if (hoursSinceCache < 24) {
                    setFieldData(data.activities || []);
                    setFilteredData(data.activities || []);
                    
                    console.log('Loaded cached field data');
                }
            } catch (e) {
                console.error('Error loading cached data:', e);
            }
        }
    }, []);

    // Auto-hide success popup
    useEffect(() => {
        if (showSuccessPopup) {
            const timer = setTimeout(() => {
                setShowSuccessPopup(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessPopup]);

    // Cleanup camera stream
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Authorization check
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

    // Fetch data
    const fetchFieldData = async () => {
        try {
            const userName = localStorage.getItem('userName');
            const response = await axios.get('/api/field-executive/data', {
                params: { executive: userName }
            });

            const activities = response.data.activities || [];
            setFieldData(activities);
            
            // Cache data
            localStorage.setItem('fieldExecutiveData', JSON.stringify({
                data: { activities },
                timestamp: Date.now()
            }));

            setLoading(false);
        } catch (error) {
            console.error('Error fetching field executive data:', error);
            setLoading(false);
        }
    };

    // Calculate stats based on month/year filter
    const calculateFilteredStats = () => {
        // Filter activities based on selected month and year
        const filteredActivities = fieldData.filter(activity => {
            const activityDate = new Date(activity.date);
            return (
                activityDate.getMonth() === statsMonthFilter.getMonth() &&
                activityDate.getFullYear() === statsYearFilter
            );
        });

        // Calculate stats
        const scheduled = filteredActivities.filter(a => a.status === 'scheduled').length;
        const saleClosed = filteredActivities.filter(a => a.status === 'sale-close').length;

        setStats({ scheduled, saleClosed });
    };

    // Update stats when filter changes or data changes
    useEffect(() => {
        calculateFilteredStats();
    }, [statsMonthFilter, statsYearFilter, fieldData]);

    // Apply filters for table display
    useEffect(() => {
        let filtered = [...fieldData];

        filtered = filtered.filter(activity => {
            const activityDate = new Date(activity.date);
            return (
                activityDate.getMonth() === statsMonthFilter.getMonth() &&
                activityDate.getFullYear() === statsYearFilter
            );
        });

        if (selectedDate) {
            filtered = filtered.filter(activity => {
                const activityDate = new Date(activity.date);
                return isSameDay(activityDate, selectedDate);
            });
        }

        setFilteredData(filtered);
    }, [selectedDate, fieldData, statsMonthFilter, statsYearFilter]);

    // Get current location
    const getCurrentLocation = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ latitude: null, longitude: null, locationName: 'Location unavailable' });
                return;
            }

            setNewVisit(prev => ({ ...prev, location: 'Fetching location...' }));

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;

                        // Use reverse geocoding
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                        );
                        const data = await response.json();

                        const address = data.address || {};
                        const area = address.suburb || address.neighbourhood || address.residential || address.city_district || address.quarter;
                        const road = address.road;
                        const city = address.city || address.town || address.village || address.county;
                        const parts = [area, road, city].filter(Boolean);
                        const uniqueParts = [...new Set(parts)];
                        let locationName = uniqueParts.length > 0 
                            ? `${uniqueParts.join(', ')} (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})` 
                            : `${(data.display_name || '').split(',').slice(0, 3).join(', ')} (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

                        const location = {
                            latitude,
                            longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: new Date().toISOString(),
                            locationName
                        };

                        setCurrentLocation(location);
                        setNewVisit(prev => ({ ...prev, location: locationName }));
                        resolve(location);
                    } catch (error) {
                        console.error('Error getting location name:', error);
                        const fallbackLocation = { latitude: 0, longitude: 0, locationName: 'Location unavailable' };
                        setCurrentLocation(fallbackLocation);
                        setNewVisit(prev => ({ ...prev, location: fallbackLocation.locationName }));
                        resolve(fallbackLocation);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    const defaultLocation = { latitude: 0, longitude: 0, locationName: 'Location unavailable' };
                    setCurrentLocation(defaultLocation);
                    setNewVisit(prev => ({ ...prev, location: defaultLocation.locationName }));
                    resolve(defaultLocation);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    // Check phone number
    const checkPhoneNumber = async () => {
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            setPhoneError('Please enter a valid 10-digit phone number');
            return;
        }

        setCheckingPhone(true);
        setPhoneError('');

        try {
            const existingVisits = fieldData.filter(visit => visit.contactNumber === phoneNumber);

            if (existingVisits.length > 0) {
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
                await getCurrentLocation();
            }

            setShowPhoneInput(false);
            setShowAddForm(true);
        } catch (error) {
            console.error('Error checking phone number:', error);
            setPhoneError('Error checking phone number');
        } finally {
            setCheckingPhone(false);
        }
    };

    // Start add visit
    const startAddVisit = () => {
        setPhoneNumber('');
        setExistingClient(null);
        setPhoneError('');
        setShowPhoneInput(true);
    };

    // Reset form
    const resetAddVisitProcess = () => {
        setShowPhoneInput(false);
        setShowAddForm(false);
        setPhoneNumber('');
        setExistingClient(null);
        setPhoneError('');
        setShowCameraModal(false);
        stopCamera();
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
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    // Handle gallery selection
    const handleGallerySelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size should be less than 5MB');
            return;
        }

        const tracedLoc = await getCurrentLocation();
        setNewVisit(prev => ({ ...prev, photo: file, location: tracedLoc.locationName }));
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    // Start camera
    const startCamera = async () => {
        try {
            setShowCameraModal(true);
            await getCurrentLocation();

            setTimeout(async () => {
                try {
                    const constraints = {
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
                    };

                    const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                    setStream(mediaStream);

                    if (videoRef.current) {
                        videoRef.current.srcObject = mediaStream;
                        await videoRef.current.play();
                    }
                } catch (error) {
                    console.error('Error accessing camera:', error);
                    alert('Cannot access camera. Please check permissions.');
                    setShowCameraModal(false);
                }
            }, 500);
        } catch (error) {
            console.error('Error starting camera:', error);
            alert('Camera not supported');
        }
    };

    // Capture photo
    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const freshLocation = await getCurrentLocation();

            canvas.toBlob((blob) => {
                if (blob) {
                    const timestamp = new Date().getTime();
                    const file = new File([blob], `camera_photo_${timestamp}.jpg`, { type: 'image/jpeg' });

                    setNewVisit(prev => ({ 
                        ...prev, 
                        photo: file,
                        location: freshLocation.locationName 
                    }));
                    
                    stopCamera();
                    setShowCameraModal(false);
                    setSuccessMessage('Photo captured!');
                    setShowSuccessPopup(true);
                }
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error('Error capturing photo:', error);
            alert('Error capturing photo');
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Trigger camera
    const triggerCamera = () => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            if (cameraInputRef.current) {
                cameraInputRef.current.click();
            }
        } else {
            startCamera();
        }
    };

    // Add visit
    const handleAddVisit = async (e) => {
        e.preventDefault();

        if (!/^\d{10}$/.test(newVisit.contactNumber)) {
            alert('Phone number must be exactly 10 digits');
            return;
        }

        if (!newVisit.photo) {
            alert('Mandatory Requirement: Please take or attach a live photo of the visit location before submitting!');
            return;
        }

        try {
            const userName = localStorage.getItem('userName');
            const formData = new FormData();

            formData.append('executive', userName);
            formData.append('client', newVisit.client);
            formData.append('contactNumber', newVisit.contactNumber);
            formData.append('businessName', newVisit.businessName);
            formData.append('location', newVisit.location);
            formData.append('date', newVisit.date);
            formData.append('purpose', newVisit.purpose);
            formData.append('notes', newVisit.notes || '');
            formData.append('status', 'scheduled');

            if (newVisit.photo) {
                formData.append('photo', newVisit.photo);
                if (currentLocation) {
                    formData.append('latitude', currentLocation.latitude?.toString() || '');
                    formData.append('longitude', currentLocation.longitude?.toString() || '');
                }
            }

            await axios.post('/api/field-executive/visit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            resetAddVisitProcess();
            setSuccessMessage('Visit scheduled successfully!');
            setShowSuccessPopup(true);
            await fetchFieldData();
        } catch (error) {
            console.error('Error adding visit:', error);
            alert('Failed to add visit');
        }
    };

    // Handle status change
    const handleStatusChange = async (visitId, newStatus) => {
        try {
            if (newStatus === 'sale-close') {
                await axios.put('/api/field-executive/visit-status', {
                    visitId,
                    status: 'sale-close',
                    remark: 'Sale closed'
                });

                const visit = fieldData.find(v => v._id === visitId);
                const appointmentData = {
                    client: visit?.client,
                    phoneNumber: visit?.contactNumber,
                    businessName: visit?.businessName,
                    location: visit?.location,
                    visitId: visitId,
                    executive: localStorage.getItem('userName')
                };

                localStorage.setItem('saleClosedAppointmentData', JSON.stringify(appointmentData));
                setSuccessMessage('Sale closed! Redirecting...');
                setShowSuccessPopup(true);
                
                await fetchFieldData();
                setTimeout(() => navigate('/order', { state: { activeTab: 'order', appointmentData } }), 1500);
                return;
            }

            if (newStatus === 'follow-up') {
                setStatusUpdate({ visitId, status: newStatus, followUpDate: '', remark: '' });
                setShowStatusModal(true);
                return;
            }

            if (newStatus === 'not-interested') {
                await axios.put('/api/field-executive/visit-status', {
                    visitId,
                    status: newStatus,
                    remark: 'Not interested'
                });
                setSuccessMessage('Status updated!');
                setShowSuccessPopup(true);
                await fetchFieldData();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    // Submit follow-up
    const handleStatusSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put('/api/field-executive/visit-status', statusUpdate);
            setShowStatusModal(false);
            setStatusUpdate({ visitId: '', status: '', followUpDate: '', remark: '' });
            setSuccessMessage('Follow-up details saved!');
            setShowSuccessPopup(true);
            await fetchFieldData();
        } catch (error) {
            console.error('Error updating follow-up:', error);
            alert('Failed to update follow-up');
        }
    };

    // Calendar helpers
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const navigateMonth = (direction) => {
        const newDate = direction > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        setCurrentDate(newDate);
        setStatsMonthFilter(newDate);
    };

    const resetFilters = () => {
        setSelectedDate(null);
    };

    const handleDateSelect = (day) => {
        setSelectedDate(day);
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

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
                            <button className="success-close-btn" onClick={() => setShowSuccessPopup(false)}>✕</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Modal */}
            {showCameraModal && (
                <div className="camera-modal-overlay">
                    <div className="camera-modal">
                        <div className="camera-header">
                            <h3>Take Photo</h3>
                            <button className="camera-close-btn" onClick={() => { stopCamera(); setShowCameraModal(false); }}>✕</button>
                        </div>
                        
                        {currentLocation?.locationName && (
                            <div className="camera-location-info">
                                <span className="location-icon">📍</span>
                                <span className="location-text">{currentLocation.locationName}</span>
                            </div>
                        )}
                        
                        <div className="camera-container">
                            <video ref={videoRef} autoPlay playsInline className="camera-video" />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>
                        
                        <div className="camera-controls">
                            <button className="capture-btn" onClick={capturePhoto}>
                                <span className="camera-icon">📷</span> Capture
                            </button>
                            <button className="cancel-btn" onClick={() => { stopCamera(); setShowCameraModal(false); }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="page-header">
                <div className="header-left">
                    <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>☰</button>
                </div>
                <h1>Field Executive Dashboard</h1>
                <div className="header-actions">
                    <span className="welcome-text">Welcome, {localStorage.getItem('userName')}</span>
                    <button onClick={() => setShowCalendar(!showCalendar)} className="toggle-calendar-btn">
                        {showCalendar ? 'Hide' : 'Show'} Calendar
                    </button>
                </div>
            </header>

            {/* Mobile Menu */}
            {showMobileMenu && (
                <div className="mobile-menu-overlay">
                    <div className="mobile-menu">
                        <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>✕</button>
                        <div className="mobile-menu-content">
                            <button className="mobile-menu-item" onClick={() => { startAddVisit(); setShowMobileMenu(false); }}>Add Visit</button>
                            <button className="mobile-menu-item" onClick={() => setShowCalendar(!showCalendar)}>
                                {showCalendar ? 'Hide' : 'Show'} Calendar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="field-content">
                {/* Add Schedule Button - Above the table */}
                <div className="add-schedule-container">
                    <button className="add-schedule-btn" onClick={startAddVisit}>
                        <span className="btn-icon">➕</span> Add New Schedule
                    </button>
                </div>

                <div className="main-content-layout">
                    {/* Left Column */}
                    <div className="left-column">
                        {/* Stats with light colors */}
                        <div className="field-stats">
                            <div className="stats-header">
                                <h2>Performance Overview - {months[statsMonthFilter.getMonth()]} {statsYearFilter}</h2>
                                <div className="stats-filters">
                                    <select 
                                        value={statsMonthFilter.getMonth()} 
                                        onChange={(e) => {
                                            const newDate = new Date(statsYearFilter, parseInt(e.target.value));
                                            setStatsMonthFilter(newDate);
                                            setCurrentDate(newDate); // Also update calendar view
                                        }}
                                    >
                                        {months.map((month, index) => (
                                            <option key={index} value={index}>{month}</option>
                                        ))}
                                    </select>
                                    <select 
                                        value={statsYearFilter} 
                                        onChange={(e) => {
                                            const newYear = parseInt(e.target.value);
                                            setStatsYearFilter(newYear);
                                            // Keep the same month but update year
                                            const newDate = new Date(newYear, statsMonthFilter.getMonth());
                                            setStatsMonthFilter(newDate);
                                            setCurrentDate(newDate); // Also update calendar view
                                        }}
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="stats-grid">
                                <div className="stat-card scheduled">
                                    <div className="stat-icon">📅</div>
                                    <div className="stat-info">
                                        <h3>Scheduled Visits</h3>
                                        <p className="stat-value">{stats.scheduled}</p>
                                    </div>
                                </div>
                                <div className="stat-card sale-closed">
                                    <div className="stat-icon">💰</div>
                                    <div className="stat-info">
                                        <h3>Sales Closed</h3>
                                        <p className="stat-value">{stats.saleClosed}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activities Table */}
                        <div className="field-activities">
                            <div className="section-header">
                                <h2>Visit Schedule - {months[statsMonthFilter.getMonth()]} {statsYearFilter}</h2>
                                <span className="activities-count">{filteredData.length} visits</span>
                            </div>
                            <div className="activities-table">
                                <div className="table-header">
                                    <span>Date</span>
                                    <span>Client/Business</span>
                                    <span>Contact</span>
                                    <span>Purpose</span>
                                    <span>Status</span>
                                    <span>Action</span>
                                </div>
                                {filteredData.length > 0 ? (
                                    filteredData.map((activity, index) => (
                                        <div key={index} className="table-row">
                                            <span className="mobile-label">Date:</span>
                                            <span>{new Date(activity.date).toLocaleDateString()}</span>
                                            
                                            <span className="mobile-label">Client:</span>
                                            <span>
                                                <div className="client-name">{activity.client}</div>
                                                <div className="business-name">{activity.businessName}</div>
                                            </span>
                                            
                                            <span className="mobile-label">Contact:</span>
                                            <span>{activity.contactNumber}</span>
                                            
                                            <span className="mobile-label">Purpose:</span>
                                            <span>{activity.purpose}</span>
                                            
                                            <span className="mobile-label">Status:</span>
                                            <span className={`status ${activity.status}`}>
                                                {activity.status === 'sale-close' ? 'Sale Closed' : activity.status}
                                            </span>
                                            
                                            <span className="mobile-label">Action:</span>
                                            <span className="status-actions">
                                                <select 
                                                    value="" 
                                                    onChange={(e) => e.target.value && handleStatusChange(activity._id, e.target.value)}
                                                    className="status-select"
                                                >
                                                    <option value="">Update Status</option>
                                                    <option value="not-interested">Not Interested</option>
                                                    <option value="follow-up">Follow Up</option>
                                                    <option value="sale-close">Sale Close</option>
                                                </select>
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-data">No visits scheduled for {months[statsMonthFilter.getMonth()]} {statsYearFilter}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Calendar Column */}
                    {showCalendar && (
                        <div className="right-column">
                            <div className="calendar-section">
                                <div className="section-header">
                                    <h2>{format(currentDate, 'MMMM yyyy')}</h2>
                                    <div className="calendar-controls">
                                        <button onClick={() => navigateMonth(-1)} className="month-nav-btn">←</button>
                                        <button onClick={resetFilters} className="reset-filters-btn">Today</button>
                                        <button onClick={() => navigateMonth(1)} className="month-nav-btn">→</button>
                                    </div>
                                </div>
                                <div className="calendar-grid">
                                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => (
                                        <div key={day} className="calendar-weekday">{day}</div>
                                    ))}
                                    {daysInMonth.map(day => {
                                        const dayActivities = fieldData.filter(a => isSameDay(new Date(a.date), day));
                                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                                        return (
                                            <div 
                                                key={day.toString()} 
                                                className={`calendar-day ${isSelected ? 'selected' : ''} ${dayActivities.length > 0 ? 'has-activities' : ''}`}
                                                onClick={() => handleDateSelect(day)}
                                            >
                                                <span className="day-number">{format(day, 'd')}</span>
                                                {dayActivities.length > 0 && (
                                                    <div className="day-activities">
                                                        {dayActivities.slice(0, 2).map((a, idx) => (
                                                            <div key={idx} className={`activity-dot ${a.status}`} title={a.status}></div>
                                                        ))}
                                                        {dayActivities.length > 2 && (
                                                            <span className="more-activities">+{dayActivities.length-2}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="calendar-legend">
                                    <div className="legend-item">
                                        <div className="legend-dot scheduled"></div>
                                        <span>Scheduled</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-dot sale-close"></div>
                                        <span>Sale Closed</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-dot follow-up"></div>
                                        <span>Follow Up</span>
                                    </div>
                                    <div className="legend-item">
                                        <div className="legend-dot not-interested"></div>
                                        <span>Not Interested</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Phone Input Modal */}
                {showPhoneInput && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h2>Enter Phone Number</h2>
                                <button className="modal-close" onClick={resetAddVisitProcess}>✕</button>
                            </div>
                            <div className="form-group">
                                <label>Phone Number:</label>
                                <input 
                                    type="tel" 
                                    value={phoneNumber} 
                                    onChange={(e) => { 
                                        setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); 
                                        setPhoneError(''); 
                                    }}
                                    placeholder="10-digit number" 
                                    autoFocus 
                                />
                                {phoneError && <small className="error-text">{phoneError}</small>}
                            </div>
                            <div className="form-buttons">
                                <button type="button" onClick={resetAddVisitProcess}>Cancel</button>
                                <button 
                                    type="button" 
                                    onClick={checkPhoneNumber} 
                                    disabled={checkingPhone || !/^\d{10}$/.test(phoneNumber)}
                                    className="primary-btn"
                                >
                                    {checkingPhone ? 'Checking...' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Visit Form */}
                {showAddForm && (
                    <div className="modal-overlay">
                        <div className="modal modal-lg">
                            <div className="modal-header">
                                <h2>{existingClient ? 'Schedule Follow-up Visit' : 'Schedule New Visit'}</h2>
                                <button className="modal-close" onClick={resetAddVisitProcess}>✕</button>
                            </div>

                            {existingClient && (
                                <div className="existing-client-notice">
                                    <div className="notice-icon">ℹ️</div>
                                    <div className="notice-content">
                                        <strong>Existing Client Found</strong>
                                        <p>Client details have been pre-filled based on previous visit.</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleAddVisit}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Client Name:</label>
                                        <input 
                                            type="text" 
                                            value={newVisit.client} 
                                            onChange={(e) => setNewVisit({...newVisit, client: e.target.value})} 
                                            required
                                            readOnly={!!existingClient} 
                                            className={existingClient ? 'readonly-field' : ''} 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Phone:</label>
                                        <input 
                                            type="tel" 
                                            value={newVisit.contactNumber} 
                                            readOnly 
                                            className="readonly-field" 
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Business Name:</label>
                                        <input 
                                            type="text" 
                                            value={newVisit.businessName} 
                                            onChange={(e) => setNewVisit({...newVisit, businessName: e.target.value})} 
                                            required
                                            readOnly={!!existingClient} 
                                            className={existingClient ? 'readonly-field' : ''} 
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Date:</label>
                                        <input 
                                            type="date" 
                                            value={newVisit.date} 
                                            onChange={(e) => setNewVisit({...newVisit, date: e.target.value})}
                                            required 
                                            min={new Date().toISOString().split('T')[0]} 
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Location:</label>
                                    <div className="location-input-group">
                                        <input 
                                            type="text" 
                                            value={newVisit.location} 
                                            readOnly 
                                            className="location-input" 
                                        />
                                        {!existingClient && (
                                            <button 
                                                type="button" 
                                                onClick={getCurrentLocation} 
                                                className="refresh-location-btn"
                                                title="Refresh location"
                                            >
                                                ↻
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Purpose:</label>
                                    <input 
                                        type="text" 
                                        value={newVisit.purpose} 
                                        onChange={(e) => setNewVisit({...newVisit, purpose: e.target.value})} 
                                        required 
                                        placeholder="e.g., Site Visit, Installation"
                                    />
                                </div>

                                {/* Photo Upload */}
                                <div className="form-group">
                                    <label>Visit Photo:</label>
                                    <div className="photo-upload-container">
                                        <div className="photo-upload-buttons">
                                            <input 
                                                type="file" 
                                                ref={galleryInputRef} 
                                                onChange={handleGallerySelect} 
                                                accept="image/*" 
                                                style={{ display: 'none' }}
                                                className="hidden-file-input" 
                                                id="gallery-upload" 
                                            />
                                            <input 
                                                type="file" 
                                                ref={cameraInputRef} 
                                                onChange={handleGallerySelect} 
                                                accept="image/*" 
                                                capture="environment" 
                                                style={{ display: 'none' }}
                                                className="hidden-file-input" 
                                                id="camera-capture" 
                                            />
                                            
                                            <label htmlFor="gallery-upload" className="photo-upload-btn gallery-btn">
                                                <span className="btn-icon">📁</span> Choose from Gallery
                                            </label>
                                            
                                            <button type="button" onClick={triggerCamera} className="photo-upload-btn camera-btn">
                                                <span className="btn-icon">📷</span> Take Photo
                                            </button>
                                        </div>
                                        
                                        {newVisit.photo && (
                                            <div className="photo-preview">
                                                <div className="photo-info">
                                                    <span className="photo-name">{newVisit.photo.name}</span>
                                                    <span className="photo-size">({Math.round(newVisit.photo.size / 1024)} KB)</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => setNewVisit(prev => ({...prev, photo: null}))} 
                                                    className="photo-remove-btn"
                                                    title="Remove photo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <small className="photo-hint">
                                        📸 Add a photo of the visit location or client
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label>Notes (Optional):</label>
                                    <textarea 
                                        value={newVisit.notes} 
                                        onChange={(e) => setNewVisit({...newVisit, notes: e.target.value})} 
                                        rows="2"
                                        placeholder="Any additional remarks..."
                                    />
                                </div>

                                <div className="form-buttons">
                                    <button type="button" onClick={resetAddVisitProcess}>Cancel</button>
                                    <button type="submit" className="primary-btn">Schedule Visit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Follow-up Modal */}
                {showStatusModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h2>Schedule Follow-up</h2>
                                <button className="modal-close" onClick={() => setShowStatusModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleStatusSubmit}>
                                <div className="form-group">
                                    <label>Follow-up Date:</label>
                                    <input 
                                        type="date" 
                                        value={statusUpdate.followUpDate} 
                                        onChange={(e) => setStatusUpdate({...statusUpdate, followUpDate: e.target.value})}
                                        required 
                                        min={new Date().toISOString().split('T')[0]} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Remarks:</label>
                                    <textarea 
                                        value={statusUpdate.remark} 
                                        onChange={(e) => setStatusUpdate({...statusUpdate, remark: e.target.value})} 
                                        required 
                                        rows="2"
                                        placeholder="Add follow-up details..."
                                    />
                                </div>
                                <div className="form-buttons">
                                    <button type="button" onClick={() => setShowStatusModal(false)}>Cancel</button>
                                    <button type="submit" className="primary-btn">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                .field-executive-page { 
                    padding: 2rem; 
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
                    min-height: 100vh; 
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    margin: 0 auto;
                    max-width: 1600px;
                }
                
                /* Camera Modal */
                .camera-modal-overlay { 
                    position: fixed; 
                    top: 0; 
                    left: 0; 
                    right: 0; 
                    bottom: 0; 
                    background: rgba(0,0,0,0.95); 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    z-index: 2000; 
                    padding: 2rem; 
                }
                .camera-modal { 
                    background: #1a1a1a; 
                    border-radius: 24px; 
                    width: 100%; 
                    max-width: 600px; 
                    overflow: hidden; 
                    display: flex; 
                    flex-direction: column; 
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                }
                .camera-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    padding: 1.2rem 1.5rem; 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    color: white; 
                }
                .camera-header h3 { 
                    margin: 0; 
                    font-size: 1.2rem; 
                    font-weight: 600;
                }
                .camera-close-btn { 
                    background: rgba(255,255,255,0.2); 
                    border: none; 
                    color: white; 
                    font-size: 1.2rem; 
                    cursor: pointer; 
                    padding: 0.3rem 0.8rem; 
                    border-radius: 8px; 
                }
                .camera-close-btn:hover { 
                    background: rgba(255,255,255,0.3); 
                }
                .camera-location-info { 
                    background: #2d2d2d; 
                    padding: 0.8rem 1.5rem; 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem; 
                    color: white; 
                    border-bottom: 1px solid #404040; 
                }
                .camera-container { 
                    position: relative; 
                    width: 100%; 
                    background: black; 
                    display: flex; 
                    justify-content: center; 
                    min-height: 350px; 
                }
                .camera-video { 
                    width: 100%; 
                    max-height: 60vh; 
                    object-fit: contain; 
                }
                .camera-controls { 
                    display: flex; 
                    gap: 1rem; 
                    padding: 1.5rem; 
                    justify-content: center; 
                    background: #1a1a1a; 
                }
                .capture-btn { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem; 
                    padding: 0.8rem 2rem; 
                    background: linear-gradient(135deg, #10b981, #059669); 
                    color: white; 
                    border: none; 
                    border-radius: 30px; 
                    font-size: 1rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                }
                .cancel-btn { 
                    padding: 0.8rem 2rem; 
                    background: rgba(255,255,255,0.1); 
                    color: white; 
                    border: 1px solid rgba(255,255,255,0.2); 
                    border-radius: 30px; 
                    cursor: pointer; 
                }
                
                /* Success Popup */
                .success-popup-overlay { 
                    position: fixed; 
                    top: 0; 
                    left: 0; 
                    right: 0; 
                    bottom: 0; 
                    background: rgba(0,0,0,0.5); 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    z-index: 3000; 
                }
                .success-popup { 
                    background: white; 
                    padding: 2rem; 
                    border-radius: 20px; 
                    min-width: 300px; 
                    max-width: 400px; 
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                    animation: slideIn 0.3s ease; 
                }
                .success-popup-content { 
                    display: flex; 
                    align-items: center; 
                    gap: 1rem; 
                }
                .success-icon { 
                    font-size: 2.5rem; 
                    color: #10b981; 
                }
                .success-message { 
                    flex: 1; 
                    font-size: 1rem; 
                    color: #1f2937; 
                    font-weight: 500;
                }
                .success-close-btn { 
                    background: #f3f4f6; 
                    border: none; 
                    font-size: 1.2rem; 
                    cursor: pointer; 
                    color: #6b7280; 
                    padding: 0.3rem 0.6rem; 
                    border-radius: 8px; 
                }
                .success-close-btn:hover {
                    background: #e5e7eb;
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
                
                /* Header */
                .page-header { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    margin-bottom: 2rem; 
                    padding: 1.2rem 2rem; 
                    background: #ffffff; 
                    color: #2c3e50; 
                    border: 1px solid #e0e0e0;
                    border-radius: 12px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .header-left { 
                    display: flex; 
                    align-items: center; 
                    gap: 1rem; 
                }
                .mobile-menu-btn { 
                    display: none; 
                    background: #f3f4f6; 
                    border: none; 
                    color: #4b5563; 
                    font-size: 1.2rem; 
                    cursor: pointer; 
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                }
                .back-btn { 
                    padding: 0.6rem 1.2rem; 
                    background: #f8f9fa; 
                    color: #2c3e50; 
                    border: 1px solid #ddd; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-weight: 500;
                }
                .back-btn:hover {
                    background: #e5e7eb;
                }
                .toggle-calendar-btn { 
                    padding: 0.6rem 1.2rem; 
                    background: #3498db; 
                    color: white; 
                    border: none; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-weight: 500;
                }
                .toggle-calendar-btn:hover {
                    background: #2980b9;
                }
                
                /* Add Schedule Button */
                .add-schedule-container {
                    margin-bottom: 2rem;
                }
                .add-schedule-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 1rem 2rem;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 1.1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
                    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
                }
                .add-schedule-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
                }
                .add-schedule-btn .btn-icon {
                    font-size: 1.3rem;
                }
                
                /* Main Layout */
                .main-content-layout { 
                    display: grid; 
                    grid-template-columns: ${showCalendar ? '2fr 1fr' : '1fr'}; 
                    gap: 2rem; 
                }
                
                /* Stats with Light Colors */
                .field-stats { 
                    background: white; 
                    padding: 1.5rem; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                    margin-bottom: 2rem;
                }
                .stats-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 1.5rem; 
                }
                .stats-header h2 { 
                    margin: 0; 
                    font-size: 1.3rem; 
                    color: #1f2937; 
                    font-weight: 600;
                }
                .stats-filters { 
                    display: flex; 
                    gap: 0.8rem; 
                }
                .stats-filters select { 
                    padding: 0.6rem 1rem; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 12px; 
                    background: #f9fafb; 
                    font-size: 0.9rem;
                    color: #4b5563;
                    cursor: pointer;
                }
                .stats-filters select:hover {
                    border-color: #6366f1;
                }
                .stats-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 1.5rem; 
                }
                .stat-card { 
                    display: flex; 
                    align-items: center; 
                    padding: 1.5rem; 
                    border-radius: 20px; 
                    transition: transform 0.2s ease;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                }
                .stat-card.scheduled { 
                    background: linear-gradient(135deg, #e0f2fe, #bae6fd); 
                    border: 1px solid #7dd3fc;
                }
                .stat-card.sale-closed { 
                    background: linear-gradient(135deg, #dcfce7, #bbf7d0); 
                    border: 1px solid #86efac;
                }
                .stat-icon { 
                    font-size: 2.2rem; 
                    margin-right: 1.2rem; 
                }
                .stat-info h3 { 
                    margin: 0 0 0.5rem; 
                    font-size: 0.9rem; 
                    color: #4b5563; 
                }
                .stat-value { 
                    margin: 0; 
                    font-size: 2rem; 
                    font-weight: 700; 
                    color: #1f2937; 
                }
                
                /* Activities Table */
                .field-activities { 
                    background: white; 
                    padding: 1.5rem; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                }
                .section-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 1.5rem; 
                }
                .section-header h2 { 
                    margin: 0; 
                    font-size: 1.3rem; 
                    color: #1f2937; 
                }
                .activities-count { 
                    color: #6b7280; 
                    font-size: 0.9rem; 
                    background: #f3f4f6;
                    padding: 0.4rem 1rem;
                    border-radius: 20px;
                }
                .activities-table { 
                    display: flex; 
                    flex-direction: column; 
                    border: 1px solid #f3f4f6; 
                    border-radius: 16px; 
                    overflow: hidden; 
                }
                .table-header { 
                    display: grid; 
                    grid-template-columns: 1fr 2fr 1fr 1.5fr 1fr 1.2fr; 
                    padding: 1rem; 
                    background: linear-gradient(135deg, #f9fafb, #f3f4f6); 
                    font-weight: 600; 
                    color: #4b5563; 
                    border-bottom: 1px solid #e5e7eb;
                }
                .table-row { 
                    display: grid; 
                    grid-template-columns: 1fr 2fr 1fr 1.5fr 1fr 1.2fr; 
                    padding: 1rem; 
                    border-bottom: 1px solid #f3f4f6; 
                    transition: background 0.2s ease;
                }
                .table-row:hover {
                    background: #f9fafb;
                }
                .table-row:last-child {
                    border-bottom: none;
                }
                .mobile-label { 
                    display: none; 
                }
                .client-name {
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 0.2rem;
                }
                .business-name {
                    font-size: 0.8rem;
                    color: #6b7280;
                }
                .status { 
                    padding: 0.4rem 0.8rem; 
                    border-radius: 30px; 
                    font-size: 0.8rem; 
                    font-weight: 600; 
                    text-align: center; 
                    width: fit-content; 
                }
                .status.scheduled { 
                    background: #dbeafe; 
                    color: #2563eb; 
                }
                .status.completed { 
                    background: #dcfce7; 
                    color: #059669; 
                }
                .status.not-interested { 
                    background: #fee2e2; 
                    color: #dc2626; 
                }
                .status.follow-up { 
                    background: #fef3c7; 
                    color: #d97706; 
                }
                .status.sale-close { 
                    background: #ede9fe; 
                    color: #7c3aed; 
                }
                .status-select { 
                    padding: 0.5rem; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 10px; 
                    font-size: 0.8rem; 
                    background: white;
                    cursor: pointer;
                }
                .status-select:hover {
                    border-color: #6366f1;
                }
                
                /* Calendar */
                .calendar-section { 
                    background: white; 
                    padding: 1.5rem; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
                }
                .calendar-controls { 
                    display: flex; 
                    gap: 0.5rem; 
                }
                .month-nav-btn, .reset-filters-btn { 
                    padding: 0.5rem 1rem; 
                    border: none; 
                    border-radius: 12px; 
                    cursor: pointer; 
                    font-weight: 500;
                }
                .month-nav-btn { 
                    background: #f3f4f6; 
                    color: #4b5563; 
                }
                .month-nav-btn:hover {
                    background: #e5e7eb;
                }
                .reset-filters-btn { 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    color: white; 
                }
                .calendar-grid { 
                    display: grid; 
                    grid-template-columns: repeat(7, 1fr); 
                    gap: 0.5rem; 
                    margin: 1rem 0;
                }
                .calendar-weekday { 
                    text-align: center; 
                    font-size: 0.8rem; 
                    font-weight: 600; 
                    color: #6b7280; 
                    padding: 0.5rem 0; 
                }
                .calendar-day { 
                    aspect-ratio: 1; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    padding: 0.5rem; 
                    border-radius: 12px; 
                    cursor: pointer; 
                    background: #f9fafb; 
                    border: 1px solid #f3f4f6; 
                    font-size: 0.9rem; 
                }
                .calendar-day:hover { 
                    background: #f3f4f6; 
                }
                .calendar-day.selected { 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    color: white; 
                }
                .calendar-day.has-activities { 
                    border: 2px solid #6366f1; 
                }
                .day-activities { 
                    display: flex; 
                    gap: 0.2rem; 
                    margin-top: 0.3rem; 
                }
                .activity-dot { 
                    width: 0.5rem; 
                    height: 0.5rem; 
                    border-radius: 50%; 
                }
                .activity-dot.scheduled { 
                    background: #3b82f6; 
                }
                .activity-dot.completed { 
                    background: #10b981; 
                }
                .activity-dot.not-interested { 
                    background: #ef4444; 
                }
                .activity-dot.follow-up { 
                    background: #f59e0b; 
                }
                .activity-dot.sale-close { 
                    background: #8b5cf6; 
                }
                .more-activities { 
                    font-size: 0.6rem; 
                    color: #6b7280; 
                }
                .calendar-legend { 
                    display: flex; 
                    flex-wrap: wrap; 
                    gap: 1rem; 
                    margin-top: 1.5rem; 
                    padding-top: 1.5rem; 
                    border-top: 1px solid #f3f4f6; 
                }
                .legend-item { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem; 
                    font-size: 0.8rem; 
                    color: #6b7280; 
                }
                .legend-dot { 
                    width: 0.8rem; 
                    height: 0.8rem; 
                    border-radius: 50%; 
                }
                .legend-dot.scheduled { 
                    background: #3b82f6; 
                }
                .legend-dot.sale-close { 
                    background: #8b5cf6; 
                }
                .legend-dot.follow-up { 
                    background: #f59e0b; 
                }
                .legend-dot.not-interested { 
                    background: #ef4444; 
                }
                
                /* Modal */
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
                    padding: 2rem; 
                }
                .modal { 
                    background: white; 
                    padding: 2rem; 
                    border-radius: 24px; 
                    width: 100%; 
                    max-width: 500px; 
                    max-height: 90vh; 
                    overflow-y: auto; 
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                }
                .modal-lg {
                    max-width: 600px;
                }
                .modal-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 2rem; 
                }
                .modal-header h2 { 
                    margin: 0; 
                    font-size: 1.5rem; 
                    color: #1f2937; 
                }
                .modal-close { 
                    background: #f3f4f6; 
                    border: none; 
                    font-size: 1.2rem; 
                    cursor: pointer; 
                    color: #6b7280; 
                    padding: 0.5rem 1rem; 
                    border-radius: 12px; 
                }
                .modal-close:hover {
                    background: #e5e7eb;
                }
                
                /* Form */
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                .form-group { 
                    margin-bottom: 1.2rem; 
                }
                .form-group label { 
                    display: block; 
                    margin-bottom: 0.5rem; 
                    font-weight: 500; 
                    color: #4b5563; 
                }
                .form-group input, 
                .form-group textarea, 
                .form-group select { 
                    width: 100%; 
                    padding: 0.8rem 1rem; 
                    border: 1px solidrgb(120, 160, 241); 
                    border-radius: 14px; 
                    font-size: 0.95rem; 
                    box-sizing: border-box; 
                }
                .form-group input:focus, 
                .form-group textarea:focus, 
                .form-group select:focus { 
                    outline: none; 
                    border-color: #6366f1; 
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); 
                }
                .readonly-field { 
                    background: #f9fafb; 
                    color: #6b7280; 
                    cursor: not-allowed; 
                }
                .location-input-group { 
                    display: flex; 
                    gap: 0.5rem; 
                }
                .location-input { 
                    flex: 1;
                }
                .refresh-location-btn { 
                    padding: 0.8rem 1.2rem; 
                    background: #f3f4f6; 
                    color: #4b5563; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 14px; 
                    cursor: pointer; 
                    font-size: 1.2rem;
                }
                .refresh-location-btn:hover {
                    background: #e5e7eb;
                }
                
                /* Existing Client Notice */
                .existing-client-notice { 
                    background: #eff6ff; 
                    border: 1px solid #bfdbfe; 
                    border-radius: 16px; 
                    padding: 1.2rem; 
                    margin-bottom: 2rem; 
                    display: flex; 
                    gap: 1rem; 
                }
                .notice-icon { 
                    font-size: 1.5rem; 
                }
                .notice-content { 
                    flex: 1; 
                }
                .notice-content strong { 
                    color: #2563eb; 
                    display: block; 
                    margin-bottom: 0.3rem; 
                }
                .notice-content p { 
                    margin: 0; 
                    color: #4b5563; 
                    font-size: 0.9rem; 
                }
                
                /* Photo Upload */
                .hidden-file-input { 
                    display: none !important;
                }
                .photo-upload-buttons { 
                    display: flex; 
                    gap: 1rem; 
                }
                .photo-upload-btn { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 0.5rem; 
                    padding: 0.8rem; 
                    border-radius: 14px; 
                    cursor: pointer; 
                    font-size: 0.9rem; 
                    font-weight: 500; 
                    flex: 1; 
                    border: 2px solid; 
                }
                .photo-upload-btn.gallery-btn { 
                    background: #f8fafc; 
                    color: #4b5563; 
                    border-color: #e5e7eb; 
                }
                .photo-upload-btn.gallery-btn:hover {
                    background: #f1f5f9;
                }
                .photo-upload-btn.camera-btn { 
                    background: #e0f2fe; 
                    color: #0369a1; 
                    border-color: #7dd3fc; 
                }
                .photo-upload-btn.camera-btn:hover {
                    background: #bae6fd;
                }
                .photo-preview { 
                    display: flex; 
                    align-items: center; 
                    justify-content: space-between; 
                    padding: 0.8rem 1rem; 
                    background: #f0fdf4; 
                    border: 1px solid #86efac; 
                    border-radius: 14px; 
                    margin-top: 1rem; 
                }
                .photo-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                }
                .photo-name { 
                    font-size: 0.9rem; 
                    font-weight: 500; 
                    color: #166534; 
                }
                .photo-size {
                    font-size: 0.8rem;
                    color: #15803d;
                }
                .photo-remove-btn { 
                    background: none; 
                    border: none; 
                    color: #dc2626; 
                    font-size: 1.2rem; 
                    cursor: pointer; 
                    padding: 0.3rem 0.6rem;
                    border-radius: 8px;
                }
                .photo-remove-btn:hover {
                    background: #fee2e2;
                }
                .photo-hint {
                    display: block;
                    margin-top: 0.5rem;
                    color: #6b7280;
                    font-size: 0.8rem;
                }
                
                .error-text {
                    color: #dc2626;
                    font-size: 0.8rem;
                    margin-top: 0.3rem;
                    display: block;
                }
                
                .form-buttons { 
                    display: flex; 
                    gap: 1rem; 
                    justify-content: flex-end; 
                    margin-top: 2rem; 
                }
                .form-buttons button { 
                    padding: 0.8rem 2rem; 
                    border: none; 
                    border-radius: 14px; 
                    cursor: pointer; 
                    font-weight: 500; 
                    font-size: 0.95rem;
                }
                .form-buttons button[type="button"] { 
                    background: #f3f4f6; 
                    color: #4b5563; 
                }
                .form-buttons button.primary-btn,
                .form-buttons button[type="submit"] { 
                    background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                    color: white; 
                }
                .form-buttons button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                /* Loading */
                .loading { 
                    text-align: center; 
                    padding: 3rem; 
                    font-size: 1.1rem; 
                    color: #6b7280; 
                }
                
                /* No Data */
                .no-data { 
                    padding: 3rem; 
                    text-align: center; 
                    color: #6b7280; 
                    font-size: 1rem; 
                }
                
                /* Mobile */
                @media (max-width: 1024px) {
                    .field-executive-page {
                        padding: 1.5rem;
                    }
                    .main-content-layout { 
                        grid-template-columns: 1fr; 
                    }
                }
                
                @media (max-width: 768px) {
                    .field-executive-page {
                        padding: 1rem;
                    }
                    
                    .mobile-menu-btn { 
                        display: block; 
                    }
                    .main-content-layout { 
                        grid-template-columns: 1fr; 
                    }
                    .welcome-text, .toggle-calendar-btn { 
                        display: none; 
                    }
                    
                    .page-header h1 {
                        font-size: 1.1rem;
                    }
                    
                    .add-schedule-btn {
                        width: 100%;
                        justify-content: center;
                    }
                    
                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .table-header { 
                        display: none; 
                    }
                    .table-row { 
                        grid-template-columns: 1fr; 
                        gap: 0.5rem; 
                        padding: 1.2rem; 
                    }
                    .mobile-label { 
                        display: inline; 
                        font-weight: 600; 
                        color: #4b5563; 
                        margin-right: 0.5rem;
                    }
                    
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                    
                    .photo-upload-buttons { 
                        flex-direction: column; 
                    }
                    
                    .camera-controls { 
                        flex-direction: column; 
                    }
                    
                    .modal {
                        padding: 1.5rem;
                    }
                    
                    .modal-header h2 {
                        font-size: 1.2rem;
                    }
                }
                
                @media (max-width: 480px) {
                    .field-executive-page {
                        padding: 0.8rem;
                    }
                    
                    .page-header {
                        padding: 1rem;
                    }
                    
                    .stat-card {
                        padding: 1rem;
                    }
                    
                    .stat-icon {
                        font-size: 1.8rem;
                    }
                    
                    .stat-value {
                        font-size: 1.5rem;
                    }
                    
                    .calendar-grid {
                        gap: 0.2rem;
                    }
                    
                    .calendar-day {
                        padding: 0.3rem;
                        font-size: 0.8rem;
                    }
                    
                    .form-buttons {
                        flex-direction: column;
                    }
                    
                    .form-buttons button {
                        width: 100%;
                    }
                    
                    .success-popup {
                        min-width: 250px;
                        padding: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default FieldExecutivePage;