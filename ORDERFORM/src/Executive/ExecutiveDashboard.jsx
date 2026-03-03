import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { parseISO, isBefore } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import AutoLogout from '../mainpage/AutoLogout';

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

// Custom MonthPicker Component
const MonthPicker = ({ selectedDate, onChange, onClose }) => {
  const months = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const [selectedMonth, setSelectedMonth] = useState(selectedDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(selectedDate.getFullYear());

  const handleApply = () => {
    onChange(new Date(selectedYear, selectedMonth));
    onClose();
  };

  return (
    <div className="month-picker">
      <AutoLogout />
      <div className="month-picker-header">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="month-select"
        >
          {months.map((month, index) => (
            <option key={month} value={index}>{month}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="year-select"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <div className="month-picker-footer">
        <button onClick={onClose} className="cancel-btn">
          Cancel
        </button>
        <button onClick={handleApply} className="apply-btn">
          Apply
        </button>
      </div>
    </div>
  );
};

// Profile Modal Component
const ProfileModal = ({ user, onClose, onSave }) => {
  const [editableUser, setEditableUser] = useState(user);
  const [isActive, setIsActive] = useState(user.active !== false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditableUser(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e) => {
    setIsActive(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userWithStatus = {
        ...editableUser,
        active: isActive
      };
      const success = await onSave(userWithStatus);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Profile Details</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={editableUser.name || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={editableUser.phone || ''}
              onChange={handleChange}
              pattern="[0-9]{10}"
              title="Please enter a 10-digit phone number"
            />
          </div>

          <div className="form-group">
            <label>Role:</label>
            <select
              name="role"
              value={editableUser.role || ''}
              onChange={handleChange}
              required
            >
              <option value="">Select Role</option>
              <option value="executive">Executive</option>
              <option value="fieldexecutive">Field Executive</option>
              <option value="admin">Admin</option>
              <option value="designer">Designer</option>
              <option value="account">Account</option>
              <option value="serviceexecutive">Service Executive</option>
              <option value="servicemanager">Service Manager</option>
              <option value="salesmanager">Sales Manager</option>
              <option value="itteam">IT Team</option>
              <option value="digitalmarketing">Digital Marketing</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="activeStatus"
              checked={isActive}
              onChange={handleStatusChange}
            />
            <label htmlFor="activeStatus">Active User</label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Dashboard Component
const ExecutiveDashboard = ({ 
  executiveName, 
  onNavigateToPendingPayments, 
  onNavigateToAppointments 
}) => {
  const [hasNewAppointments, setHasNewAppointments] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [target, setTarget] = useState(100);
  const [achieved, setAchieved] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [paymentData, setPaymentData] = useState([
    { name: 'Paid', value: 0, fill: '#4CAF50' },
    { name: 'Unpaid', value: 0, fill: '#F44336' },
  ]);
  const [serviceData, setServiceData] = useState([
    { name: 'Services', pending: 0, completed: 0, total: 0 }
  ]);
  const [userName, setUserName] = useState('');
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    phone: '',
    role: ''
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [prospectData, setProspectData] = useState({
    count: 0,
    byStatus: []
  });
  const [isFieldExec, setIsFieldExec] = useState(false);
  const [buttonsLoaded, setButtonsLoaded] = useState(false);

  const navigate = useNavigate();

  // Helper functions
  const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Check if user is a field executive - SIMPLIFIED VERSION
  const checkFieldExecutiveRole = useCallback((role) => {
    if (!role) return false;
    
    const normalizedRole = role.toString().toLowerCase().trim();
    console.log('Checking role for field executive:', normalizedRole);
    
    const fieldExecutiveRoles = [
      'fieldexecutive',
      'field executive', 
      'fieldexec',
      'field',
      'field_executive',
      'field-executive'
    ];
    
    return fieldExecutiveRoles.includes(normalizedRole);
  }, []);

  // Event handlers
  const handleSaveProfile = async (updatedProfile) => {
    try {
      await axios.put('/api/update-profile', {
        name: userProfile.name.trim(),
        updates: updatedProfile
      });
      
      const updatedUserProfile = {
        ...userProfile,
        ...updatedProfile,
        active: updatedProfile.active
      };
      
      setUserProfile(updatedUserProfile);
      
      // Update field executive status when profile is saved
      const fieldExecStatus = checkFieldExecutiveRole(updatedProfile.role);
      setIsFieldExec(fieldExecStatus);
      
      return true;
    } catch (error) {
      console.error("Update failed:", error);
      throw error;
    }
  };

  const handleNewAppointmentsClick = () => {
    if (onNavigateToAppointments) {
      onNavigateToAppointments();
    } else {
      localStorage.setItem('lastSeenAppointmentCount', appointmentCount.toString());
      setHasNewAppointments(false);
      navigate('/new-appointment');
    }
  };

  const handleFollowUpsClick = () => {
    navigate('/followup');
  };

  const handlePendingPaymentsClick = () => {
    if (onNavigateToPendingPayments) {
      onNavigateToPendingPayments();
    } else {
      navigate('/pending-payments', { 
        state: { 
          executiveFilter: selectedExecutive,
          month: selectedDate.getMonth() + 1,
          year: selectedDate.getFullYear()
        } 
      });
    }
  };

  const handleFieldExecutivePage = () => {
    navigate('/field-executive');
  };

  const handleCalendarClick = () => {
    setShowMonthPicker(true);
  };

  const handleMonthYearChange = (date) => {
    console.log('Date changed to:', date);
    console.log('Month:', date.getMonth() + 1, 'Year:', date.getFullYear());
    setSelectedDate(date);
    setShowMonthPicker(false);
  };

  const handleServiceSliceClick = (data) => {
    if (data.name === 'Pending') {
      navigate('/pending-service', { 
        state: { 
          executive: selectedExecutive,
          month: selectedDate.getMonth() + 1,
          year: selectedDate.getFullYear()
        } 
      });
    }
  };

  const handlePaymentSliceClick = (data) => {
    if (data.name === 'Unpaid') {
      navigate('/pending-payment', { 
        state: { 
          executive: selectedExecutive,
          month: selectedDate.getMonth() + 1,
          year: selectedDate.getFullYear()
        } 
      });
    }
  };

  // Data fetching functions - ALL FUNCTIONS NOW USE selectedDate
  const fetchExecutiveData = useCallback(async (executiveName) => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      console.log(`Fetching executive data for ${executiveName} - Month: ${month}, Year: ${year}`);

      const res = await axios.get(`/api/executive/${executiveName}`, {
        params: { month, year }
      });
      const orders = res.data;

      console.log(`Executive data received:`, orders);

      let totalAchieved = 0;
      let executiveTarget = 100;
      let completed = 0;
      let pending = 0;

      orders.forEach(order => {
        if (order.target) executiveTarget = order.target;
        order.rows?.forEach(row => {
          totalAchieved += parseFloat(row.total || 0);
          const deliveryDate = row.deliveryDate ? parseISO(row.deliveryDate) : null;
          const isExpired = deliveryDate && isBefore(deliveryDate, new Date());
          if (row.isCompleted || isExpired) completed++;
          else pending++;
        });
      });

      console.log(`Target: ${executiveTarget}, Achieved: ${totalAchieved}`);
      setTarget(executiveTarget);
      setAchieved(totalAchieved);
      setServiceData([{ name: 'Services', pending, completed, total: pending + completed }]);
    } catch (err) {
      console.error('Error fetching executive data:', err);
    }
  }, [selectedDate]);

  const fetchPendingPayments = useCallback(async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      console.log(`Fetching payments for ${selectedExecutive} - Month: ${month}, Year: ${year}`);

      const res = await axios.get('/api/orders/pending-payments', {
        params: { month, year }
      });
      const orders = res.data.filter(order => order.executive === selectedExecutive);

      const totalAdvance = orders.reduce((sum, o) => sum + parseFloat(o.advance || 0), 0);
      const totalBalance = orders.reduce((sum, o) => sum + parseFloat(o.balance || 0), 0);

      console.log(`Payments - Paid: ${totalAdvance}, Unpaid: ${totalBalance}`);

      setPaymentData([
        { name: 'Paid', value: totalAdvance, fill: '#4CAF50' },
        { name: 'Unpaid', value: totalBalance, fill: '#F44336' },
      ]);
    } catch (err) {
      console.error('Error fetching pending payments:', err);
    }
  }, [selectedExecutive, selectedDate]);

  const fetchAppointmentCount = useCallback(async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      console.log(`Fetching appointments for ${selectedExecutive} - Month: ${month}, Year: ${year}`);

      const res = await axios.get('/api/appointments', {
        params: { month, year }
      });
      const assigned = res.data.filter(
        (appt) => appt.status === 'assigned' && appt.executive === selectedExecutive
      );
      const newCount = assigned.length;
      const storedCount = parseInt(localStorage.getItem('lastSeenAppointmentCount')) || 0;

      console.log(`Appointments count: ${newCount}`);
      setHasNewAppointments(newCount > storedCount);
      setAppointmentCount(newCount);
    } catch (error) {
      console.error('Error fetching appointment count:', error);
    }
  }, [selectedExecutive, selectedDate]);

  const fetchFollowUpCount = useCallback(async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      console.log(`Fetching follow-ups for ${selectedExecutive} - Month: ${month}, Year: ${year}`);

      const res = await axios.get('/api/follow-ups', {
        params: {
          month,
          year,
          executive: selectedExecutive
        }
      });
      const count = res.data.length || 0;
      console.log(`Follow-ups count: ${count}`);
      setFollowUpCount(count);
    } catch (error) {
      console.error('Error fetching follow-up count:', error);
    }
  }, [selectedExecutive, selectedDate]);

  // SIMPLIFIED: Fetch user profile with immediate role detection
  const fetchUserProfile = useCallback(async (executiveName) => {
    try {
      console.log('Fetching profile for:', executiveName);
      const response = await axios.get('/api/user-profile', {
        params: { name: executiveName }
      });

      if (response.data) {
        const userData = {
          name: response.data.name || executiveName,
          phone: response.data.phone || '',
          role: response.data.role || ''
        };
        
        setUserProfile(userData);
        
        // Update field executive status immediately
        const fieldExecStatus = checkFieldExecutiveRole(userData.role);
        console.log('Field executive status determined:', fieldExecStatus);
        setIsFieldExec(fieldExecStatus);
        
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set default values if API fails
      const defaultUserData = {
        name: executiveName,
        phone: '',
        role: ''
      };
      setUserProfile(defaultUserData);
      setIsFieldExec(false);
      return defaultUserData;
    }
  }, [checkFieldExecutiveRole]);

  const fetchProspects = useCallback(async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      console.log(`Fetching prospects for ${selectedExecutive} - Month: ${month}, Year: ${year}, Role: ${userProfile.role}`);

      const res = await axios.get('/api/prospective-clients', {
        params: {
          month,
          year,
          userName: selectedExecutive,
          role: userProfile.role
        }
      });

      const prospects = res.data || [];
      console.log(`Prospects count: ${prospects.length}`);
      
      const statusCount = {};

      prospects.forEach((prospect) => {
        const status = prospect.status || "Unknown";
        statusCount[status] = (statusCount[status] || 0) + 1;
      });

      const byStatus = Object.entries(statusCount).map(
        ([status, count]) => ({
          name: status,
          value: count,
        })
      );

      setProspectData({
        count: prospects.length,
        byStatus,
      });
    } catch (error) {
      console.error('Error fetching prospects:', error);
      setProspectData({
        count: 0,
        byStatus: [],
      });
    }
  }, [selectedExecutive, selectedDate, userProfile.role]);

  // Effect hooks
  useEffect(() => {
    if (achieved >= target && target > 0) {
      setShowCongrats(true);
    } else {
      setShowCongrats(false);
    }
  }, [achieved, target]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize user
  useEffect(() => {
    const loggedInUser = localStorage.getItem('userName');
    console.log('Initializing user:', loggedInUser);
    
    if (loggedInUser) {
      setUserName(loggedInUser);
      setSelectedExecutive(loggedInUser);
      
      // Show buttons immediately while fetching profile in background
      setButtonsLoaded(true);
      
      // Fetch profile in background
      fetchUserProfile(loggedInUser);
    }
  }, [fetchUserProfile]);

  // MAIN DATA FETCHING EFFECT - This triggers when selectedDate changes
  useEffect(() => {
    if (selectedExecutive) {
      console.log('=== FETCHING ALL DATA FOR SELECTED MONTH/YEAR ===');
      console.log('Date:', selectedDate);
      console.log('Month:', selectedDate.getMonth() + 1);
      console.log('Year:', selectedDate.getFullYear());
      
      fetchExecutiveData(selectedExecutive);
      fetchPendingPayments();
      fetchAppointmentCount();
      fetchFollowUpCount();
      fetchProspects();
    }
  }, [
    selectedExecutive, 
    selectedDate,  // This dependency ensures data is refetched when date changes
    fetchExecutiveData, 
    fetchPendingPayments,
    fetchAppointmentCount, 
    fetchFollowUpCount, 
    fetchProspects
  ]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedExecutive) {
        fetchAppointmentCount();
        fetchFollowUpCount();
        fetchProspects();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [
    selectedExecutive, 
    fetchAppointmentCount, 
    fetchFollowUpCount, 
    fetchProspects
  ]);

  // Data for charts
  const pieData = [
    { name: 'Achieved', value: achieved, fill: '#4CAF50' },
    { name: 'Remaining', value: Math.max(0, target - achieved), fill: '#F44336' }
  ];

  const totalPayments = paymentData.reduce((sum, d) => sum + d.value, 0);
  const hasProspectData = prospectData.byStatus.length > 0;

  return (
    <div className="dashboard-container">
      {/* Congratulations Popup */}
      {showCongrats && (
        <div className="congrats-popup">
          <span className="congrats-icon">🎉</span>
          <div>
            <h2>Congratulations!</h2>
            <p>You've reached your target of ₹{target.toLocaleString()} for {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <button onClick={() => setShowCongrats(false)} className="close-popup-btn">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          {/* Name positioned above calendar */}
          <div className="name-calendar-container">
            <h2 className="executive-name">{selectedExecutive}</h2>
            <button onClick={handleCalendarClick} className="calendar-btn">
              <span className="calendar-icon">📅</span>
              <span className="date-display">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Button Container */}
        <div 
          className="mobile-menu-wrapper" 
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '50%',
            paddingTop: '0.5rem'
          }}
        >
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            style={{
              display: 'none',
              background: 'linear-gradient(135deg, #1976d2, #125ea3)',
              border: 'none',
              borderRadius: '5px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.75rem',
              zIndex: 1001,
              color: 'white',
              width: '50px',
              height: '50px',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* BUTTONS CONTAINER - Show all buttons immediately */}
        {buttonsLoaded && (
          <div className={`header-right ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="action-buttons">
              {/* Pending Payments Button - ORANGE COLOR */}
              <button
                onClick={handlePendingPaymentsClick}
                className="pending-payments-btn"
              >
                Pending Payments
              </button>

              {/* Follow Ups Button - PURPLE COLOR */}
              <button
                onClick={handleFollowUpsClick}
                className="follow-ups-btn"
              >
                Follow Ups
                {followUpCount > 0 && (
                  <span className="follow-up-count">
                    {followUpCount}
                  </span>
                )}
              </button>

              {/* New Appointments Button - DEEP BLUE COLOR */}
              <button
                onClick={handleNewAppointmentsClick}
                className="appointments-btn"
              >
                New Appointments
                {appointmentCount > 0 && (
                  <span className={`appointment-count ${hasNewAppointments ? 'new' : ''}`}>
                    {appointmentCount}
                  </span>
                )}
              </button>

              {/* Field Executive Button - TEAL COLOR */}
              {isFieldExec && (
                <button
                  onClick={handleFieldExecutivePage}
                  className="field-executive-btn"
                >
                  Daily Report
                </button>
              )}
            </div>

            {/* User Avatar positioned slightly lower */}
            <div className="user-avatar-container">
              <button
                className="user-avatar"
                onClick={() => setShowProfileModal(true)}
              >
                {getInitials(userName)}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Month/Year Picker */}
      {showMonthPicker && (
        <div className="month-picker-overlay">
          <MonthPicker
            selectedDate={selectedDate}
            onChange={handleMonthYearChange}
            onClose={() => setShowMonthPicker(false)}
          />
        </div>
      )}

      <main className="dashboard-content">
        {/* Target Card - Large */}
        <div className="dashboard-card target-card">
          <div className="card-header">
            <h3>🎯 Target - {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            {achieved >= target && target > 0 && (
              <span className="target-achieved">Target Achieved!</span>
            )}
          </div>
          <div className="target-summary">
            <div className="summary-item">
              <span>Total Target:</span>
              <span className="value">₹{target.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span>Achieved:</span>
              <span className="value">₹{achieved.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span>Period:</span>
              <span className="value">{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 80 : 100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                {achieved > target && (
                  <Pie
                    data={[{ name: 'Extra', value: achieved - target }, { name: 'Remainder', value: achieved }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 90 : 110}
                    outerRadius={isMobile ? 100 : 120}
                    dataKey="value"
                  >
                    <Cell fill="#2196F3" />
                    <Cell fill="transparent" />
                  </Pie>
                )}
                <Tooltip formatter={(value, name) => [`₹${value}`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Services Card - Medium */}
        <div className="dashboard-card services-card">
          <div className="card-header">
            <h3>🛠 Services Status - {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pending', value: serviceData[0]?.pending || 0, fill: '#FF9800' },
                    { name: 'Completed', value: serviceData[0]?.completed || 0, fill: '#4CAF50' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={isMobile ? 60 : 70}
                  dataKey="value"
                  onClick={handleServiceSliceClick}
                >
                  <Cell fill="#FF9800" />
                  <Cell fill="#4CAF50" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card-footer">
            <span>Total: {serviceData[0]?.total || 0}</span>
            <span>Pending: {serviceData[0]?.pending || 0}</span>
            <span>Month: {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Payments Card - Small */}
        <div className="dashboard-card payments-card">
          <div className="card-header">
            <h3>💳 Payment Status - {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={isMobile ? 60 : 70}
                  dataKey="value"
                  onClick={handlePaymentSliceClick}
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`₹${value}`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card-footer">
            <span>Total: ₹{totalPayments.toLocaleString()}</span>
            <span>Unpaid: ₹{(paymentData[1]?.value || 0).toLocaleString()}</span>
            <span>Month: {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Prospects Card - Small */}
        <div className="dashboard-card prospects-card">
          <div className="card-header">
            <h3>👥 Prospects - {selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</h3>
          </div>
          <div className="prospect-chart">
            <h3>Total Prospects: {prospectData.count} for {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            {hasProspectData ? (
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
                <PieChart>
                  <Pie
                    data={prospectData.byStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={isMobile ? 60 : 70}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {prospectData.byStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p>No prospect data available for {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            )}
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          user={userProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* CSS Styles */}
      <style jsx>{`
        :root {
          --primary: #1976d2;
          --primary-dark: #125ea3;
          --secondary: #ff9800;
          --secondary-dark: #f57c00;
          --success: #4CAF50;
          --error: #F44336;
          --info: #2196F3;
          --warning: #FF9800;
          --pending: #FF8C00;
          --pending-dark: #E67E22;
          --text: #333;
          --text-light: #666;
          --border: #ddd;
          --bg: #f5f5f5;
          --card-bg: #ffffff;  
          --shadow: 0 4px 12px rgba(0,0,0,0.08);
          --radius: 12px;
          --transition: all 0.3s ease;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .dashboard-container {
          padding: 1rem;
          background-color: var(--bg);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          overflow-x: hidden;
        }

        /* Header Styles */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 0.5rem 0;
          position: relative;
        }

        .header-left {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          flex: 1;
        }

        /* Name and Calendar Container */
        .name-calendar-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }

        .executive-name {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text);
          word-break: break-word;
          margin: 0;
          line-height: 1.2;
        }

        /* Calendar Button */
        .calendar-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #ff6b6b, #ffa726);
          border: none;
          border-radius: var(--radius);
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: var(--transition);
          white-space: nowrap;
          color: white;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
        }

        .calendar-btn:hover {
          background: linear-gradient(135deg, #ff5252, #ff9800);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }

        .calendar-icon {
          font-size: 1.1rem;
        }

        .date-display {
          font-size: 0.9rem;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          justify-content: flex-end;
          flex: 1;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        /* User Avatar Container - Positioned slightly lower */
        .user-avatar-container {
          display: flex;
          align-items: center;
          margin-top: 0.5rem;
        }

        /* Pending Payments Button - ORANGE COLOR */
        .pending-payments-btn {
          position: relative;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          border: none;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          white-space: nowrap;
          background: linear-gradient(135deg, #FF8C00, #E67E22);
          color: white;
          box-shadow: 0 4px 15px rgba(255, 140, 0, 0.4);
          min-width: 160px;
          justify-content: center;
        }

        .pending-payments-btn:hover {
          background: linear-gradient(135deg, #E67E22, #D35400);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 140, 0, 0.5);
        }

        /* Follow Ups Button - PURPLE COLOR */
        .follow-ups-btn {
          position: relative;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          border: none;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          white-space: nowrap;
          background: linear-gradient(135deg, #7B1FA2, #4A148C);
          color: white;
          box-shadow: 0 4px 15px rgba(123, 31, 162, 0.4);
          min-width: 140px;
          justify-content: center;
        }

        .follow-ups-btn:hover {
          background: linear-gradient(135deg, #6A1B9A, #38006B);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(123, 31, 162, 0.5);
        }

        /* New Appointments Button - DEEP BLUE COLOR */
        .appointments-btn {
          position: relative;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          border: none;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          white-space: nowrap;
          background: linear-gradient(135deg, #1565C0, #0D47A1);
          color: white;
          box-shadow: 0 4px 15px rgba(21, 101, 192, 0.4);
          min-width: 160px;
          justify-content: center;
        }

        .appointments-btn:hover {
          background: linear-gradient(135deg, #0D47A1, #082E63);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(21, 101, 192, 0.5);
        }

        /* Field Executive Button - TEAL COLOR */
        .field-executive-btn {
          position: relative;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius);
          border: none;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          white-space: nowrap;
          background: linear-gradient(135deg, #00796B, #004D40);
          color: white;
          box-shadow: 0 4px 15px rgba(0, 121, 107, 0.4);
          min-width: 150px;
          justify-content: center;
        }

        .field-executive-btn:hover {
          background: linear-gradient(135deg, #00695C, #00332D);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 121, 107, 0.5);
        }

        .appointment-count, .follow-up-count {
          background-color: rgba(255, 255, 255, 0.3);
          color: #fff;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          margin-left: 0.5rem;
          border: 2px solid rgba(255, 255, 255, 0.5);
        }

        .appointment-count.new {
          animation: blink 1s infinite;
          background-color: #ffeb3b;
          color: #333;
        }

        .user-avatar {
          background: linear-gradient(135deg, #1976d2, #125ea3);
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
          cursor: pointer;
          border: none;
          transition: var(--transition);
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
        }

        .user-avatar:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(25, 118, 210, 0.4);
        }

        /* Main Content Styles */
        .dashboard-content {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 1.5rem;
          width: 100%;
        }

        .dashboard-card {
          background-color: var(--card-bg);
          border-radius: var(--radius);
          padding: 1.5rem;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow: hidden;
        }

        .target-card {
          grid-column: 1 / -1;
        }

        .services-card {
          grid-column: span 4;
        }

        .payments-card {
          grid-column: span 4;
        }

        .prospects-card {
          grid-column: span 4;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .card-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text);
        }

        .target-achieved {
          color: var(--success);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .target-summary {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: rgba(0, 0, 0, 0.02);
          border-radius: var(--radius);
          padding: 1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
        }

        .summary-item .value {
          font-weight: 600;
        }

        .chart-container {
          width: 100%;
          min-height: 200px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          font-weight: 600;
          font-size: 0.9rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        /* Prospects Chart Styles */
        .prospect-chart {
          flex: 1;
          width: 100%;
        }

        .prospect-chart h3 {
          margin-bottom: 1rem;
          font-size: 1.1rem;
          color: var(--text);
          text-align: center;
        }

        /* Congratulations Popup */
        .congrats-popup {
          position: fixed;
          top: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          background-color: var(--success);
          color: white;
          padding: 1.25rem;
          border-radius: var(--radius);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          max-width: 90%;
          width: auto;
        }

        .congrats-icon {
          font-size: 1.5rem;
        }

        .congrats-popup h2 {
          font-size: 1.1rem;
          margin-bottom: 0.25rem;
        }

        .congrats-popup p {
          font-size: 0.9rem;
        }

        .close-popup-btn {
          background: none;
          border: 1px solid white;
          color: white;
          border-radius: 50%;
          width: 1.75rem;
          height: 1.75rem;
          cursor: pointer;
          margin-left: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
        }

        /* Month Picker Overlay - Colorful */
        .month-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .month-picker {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: var(--radius);
          padding: 1.5rem;
          box-shadow: var(--shadow);
          width: 300px;
          max-width: 90%;
          color: white;
        }

        .month-picker-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          gap: 0.5rem;
        }

        .month-select,
        .year-select {
          padding: 0.5rem;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background-color: rgba(255, 255, 255, 0.9);
          color: #333;
          flex: 1;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .month-select:focus,
        .year-select:focus {
          outline: none;
          border-color: #ffa726;
          background-color: white;
        }

        .month-picker-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .cancel-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          color: white;
          cursor: pointer;
          transition: var(--transition);
          font-weight: 500;
        }

        .cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .apply-btn, .save-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: none;
          background: #ffa726;
          color: white;
          cursor: pointer;
          transition: var(--transition);
          font-weight: 500;
        }

        .apply-btn:hover, .save-btn:hover {
          background: #ff9800;
          transform: translateY(-1px);
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background-color: var(--card-bg);
          padding: 1.5rem;
          border-radius: var(--radius);
          width: 90%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
        }

        /* Animations */
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Mobile Responsive Styles */
        @media (max-width: 1024px) {
          .services-card {
            grid-column: span 6;
          }
          
          .payments-card,
          .prospects-card {
            grid-column: span 3;
          }
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 0.5rem;
            gap: 1rem;
          }

          .dashboard-header {
            flex-direction: row;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.5rem 0;
          }

          .header-left {
            flex: 1;
            justify-content: flex-start;
          }

          .name-calendar-container {
            gap: 0.25rem;
          }

          .executive-name {
            font-size: 1.2rem;
            text-align: left;
          }

          .calendar-btn {
            padding: 0.5rem 0.8rem;
            font-size: 0.8rem;
          }

          .date-display {
            font-size: 0.8rem;
          }

          /* Mobile Menu Button display for mobile */
          .mobile-menu-btn {
            display: flex !important;
          }

          .mobile-menu-wrapper {
            padding-top: 3.5rem !important;
          }

          .header-right {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
            border-top: 1px solid var(--border);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 1000;
          }

          .header-right.mobile-open {
            display: flex;
          }

          .action-buttons {
            flex-direction: column;
            width: 100%;
            gap: 0.5rem;
          }

          .pending-payments-btn,
          .appointments-btn, 
          .follow-ups-btn, 
          .field-executive-btn {
            width: 100%;
            justify-content: center;
            font-size: 14px;
            padding: 1rem;
          }

          .user-avatar-container {
            align-self: center;
            margin-top: 0;
          }

          .user-avatar {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 1rem;
          }

          .dashboard-content {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .dashboard-card {
            grid-column: 1 / -1 !important;
            padding: 1rem;
          }

          .card-header h3 {
            font-size: 1.1rem;
          }

          .card-footer {
            font-size: 0.8rem;
            flex-direction: column;
            text-align: center;
          }

          .target-summary {
            padding: 0.75rem;
          }

          .summary-item {
            font-size: 0.9rem;
          }

          .chart-container {
            height: 250px !important;
          }
        }

        @media (max-width: 480px) {
          .dashboard-container {
            padding: 0.25rem;
          }

          .header-left {
            gap: 0.5rem;
          }

          .executive-name {
            font-size: 1.1rem;
          }

          .calendar-btn {
            padding: 0.4rem 0.7rem;
            font-size: 0.75rem;
          }

          .date-display {
            font-size: 0.75rem;
          }

          .dashboard-card {
            padding: 0.75rem;
          }

          .card-header h3 {
            font-size: 1rem;
          }

          .chart-container {
            height: 220px !important;
          }

          .pending-payments-btn,
          .appointments-btn, 
          .follow-ups-btn, 
          .field-executive-btn {
            font-size: 12px;
            padding: 0.8rem;
          }

          .appointment-count, 
          .follow-up-count {
            width: 1.25rem;
            height: 1.25rem;
            font-size: 0.7rem;
          }
        }

        @media (max-width: 360px) {
          .executive-name {
            font-size: 1rem;
          }

          .calendar-btn {
            padding: 0.35rem 0.6rem;
            font-size: 0.7rem;
          }

          .dashboard-card {
            padding: 0.5rem;
          }

          .chart-container {
            height: 200px !important;
          }
        }

        /* Chart text visibility fixes */
        .recharts-legend-wrapper {
          font-size: 12px;
        }

        .recharts-pie-label-text {
          font-size: 10px;
          font-weight: 600;
        }

        .recharts-tooltip-wrapper {
          font-size: 12px;
        }

        @media (max-width: 768px) {
          .recharts-legend-wrapper {
            font-size: 10px;
          }

          .recharts-pie-label-text {
            font-size: 8px;
          }

          .recharts-tooltip-wrapper {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default ExecutiveDashboard;