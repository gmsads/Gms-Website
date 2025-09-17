
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
const ExecutiveDashboard = () => {
  const [hasNewAppointments, setHasNewAppointments] = useState(false);
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [target, setTarget] = useState(100);
  const [achieved, setAchieved] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [, setIsMobile] = useState(window.innerWidth < 768);
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

  const navigate = useNavigate();

  // Helper functions
  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';
  };

  // Check if user is a field executive
  const isFieldExecutive = useCallback(() => {
    console.log('Current user role:', userProfile.role);
    // Check for all possible formats
    const role = userProfile.role?.toLowerCase();
    return role === 'fieldexecutive' || 
           role === 'field executive' ||
           role === 'fieldexec' ||
           role === 'field';
  }, [userProfile.role]);

  // Event handlers - MOVE THESE BEFORE ANY JSX USAGE
  const handleSaveProfile = async (updatedProfile) => {
    try {
      await axios.put('/api/update-profile', {
        name: userProfile.name.trim(),
        updates: updatedProfile
      });
      setUserProfile(prev => ({
        ...prev,
        ...updatedProfile,
        active: updatedProfile.active
      }));
      return true;
    } catch (error) {
      console.error("Update failed:", error);
      throw error;
    }
  };

  const handleNotificationClick = () => {
    localStorage.setItem('lastSeenAppointmentCount', appointmentCount);
    setHasNewAppointments(false);
    navigate('/pending-service');
  };

  const handleNewAppointmentsClick = () => {
    localStorage.setItem('lastSeenAppointmentCount', appointmentCount);
    setHasNewAppointments(false);
    navigate('/new-appointment');
  };

  const handleFollowUpsClick = () => {
    navigate('/followup');
  };

  const handleFieldExecutivePage = () => {
    console.log('Navigating to field executive page');
    navigate('/field-executive');
  };

  const handleCalendarClick = () => {
    setShowMonthPicker(true);
  };

  const handleMonthYearChange = (date) => {
    setSelectedDate(date);
    setShowMonthPicker(false);
  };

  const handleServiceSliceClick = (data) => {
    if (data.name === 'Pending') {
      navigate('/pending-service', { state: { executive: selectedExecutive } });
    }
  };

  const handlePaymentSliceClick = (data) => {
    if (data.name === 'Unpaid') {
      navigate('/pending-payment', { state: { executive: selectedExecutive } });
    }
  };

  // Data fetching functions
  const fetchExecutiveData = useCallback(async (executiveName) => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      const res = await axios.get(`/api/executive/${executiveName}`, {
        params: { month, year }
      });
      const orders = res.data;

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

      const res = await axios.get('/api/orders/pending-payments', {
        params: { month, year }
      });
      const orders = res.data.filter(order => order.executive === selectedExecutive);

      const totalAdvance = orders.reduce((sum, o) => sum + parseFloat(o.advance || 0), 0);
      const totalBalance = orders.reduce((sum, o) => sum + parseFloat(o.balance || 0), 0);

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

      const res = await axios.get('/api/appointments', {
        params: { month, year }
      });
      const assigned = res.data.filter(
        (appt) => appt.status === 'assigned' && appt.executive === selectedExecutive
      );
      const newCount = assigned.length;
      const storedCount = parseInt(localStorage.getItem('lastSeenAppointmentCount')) || 0;

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

      const res = await axios.get('/api/follow-ups', {
        params: {
          month,
          year,
          executive: selectedExecutive
        }
      });
      setFollowUpCount(res.data.length || 0);
    } catch (error) {
      console.error('Error fetching follow-up count:', error);
    }
  }, [selectedExecutive, selectedDate]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get('/api/user-profile', {
        params: { name: selectedExecutive }
      });

      if (response.data) {
        setUserProfile({
          name: response.data.name,
          phone: response.data.phone,
          role: response.data.role.toLowerCase()
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [selectedExecutive]);

  const fetchProspects = useCallback(async () => {
    try {
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      const res = await axios.get('/api/prospective-clients', {
        params: {
          month,
          year,
          userName: selectedExecutive,
          role: userProfile.role
        }
      });

      const prospects = res.data || [];
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
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('userName');
    if (loggedInUser) {
      setUserName(loggedInUser);
      setSelectedExecutive(loggedInUser);
    }
  }, []);

  useEffect(() => {
    if (selectedExecutive) {
      fetchExecutiveData(selectedExecutive);
      fetchPendingPayments();
      fetchAppointmentCount();
      fetchFollowUpCount();
      fetchUserProfile();
      fetchProspects();
    }
  }, [selectedExecutive, selectedDate, fetchExecutiveData, fetchPendingPayments,
    fetchAppointmentCount, fetchFollowUpCount, fetchUserProfile, fetchProspects]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedExecutive) {
        fetchAppointmentCount();
        fetchFollowUpCount();
        fetchProspects();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedExecutive, fetchAppointmentCount, fetchFollowUpCount, fetchProspects]);

  // Add this useEffect to fetch initial user profile immediately
  useEffect(() => {
    const fetchInitialUserProfile = async () => {
      const loggedInUser = localStorage.getItem('userName');
      if (loggedInUser) {
        try {
          const response = await axios.get('/api/user-profile', {
            params: { name: loggedInUser }
          });

          if (response.data) {
            setUserProfile({
              name: response.data.name,
              phone: response.data.phone,
              role: response.data.role.toLowerCase()
            });
            console.log('Initial user profile fetched:', response.data);
          }
        } catch (error) {
          console.error('Error fetching initial user profile:', error);
        }
      }
    };

    fetchInitialUserProfile();
  }, []);

  useEffect(() => {
    console.log('User profile updated:', userProfile);
    console.log('Is field executive:', isFieldExecutive());
  }, [userProfile, isFieldExecutive]);

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
            <p>You've reached your target of ₹{target.toLocaleString()}</p>
          </div>
          <button onClick={() => setShowCongrats(false)} className="close-popup-btn">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h2>{selectedExecutive}</h2>
          <button onClick={handleCalendarClick} className="calendar-btn">
            <span className="calendar-icon">📅</span>
            <span className="date-display">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </button>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`header-right ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="action-buttons">
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

            {/* Field Executive Button - Only visible to field executives */}
            {isFieldExecutive() && (
              <button
                onClick={handleFieldExecutivePage}
                className="field-executive-btn"
              >
                Field Executive
              </button>
            )}

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
          </div>

          <button
            className="user-avatar"
            onClick={() => setShowProfileModal(true)}
          >
            {getInitials(userName)}
          </button>
        </div>
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
            <h3>🎯 Target</h3>
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
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
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
                    innerRadius={110}
                    outerRadius={120}
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
            <h3>🛠 Services Status</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Pending', value: serviceData[0]?.pending || 0, fill: '#FF9800' },
                    { name: 'Completed', value: serviceData[0]?.completed || 0, fill: '#4CAF50' }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
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
          </div>
        </div>

        {/* Payments Card - Small */}
        <div className="dashboard-card payments-card">
          <div className="card-header">
            <h3>💳 Payment Status</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
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
          </div>
        </div>

        {/* Prospects Card - Small */}
        <div className="dashboard-card prospects-card">
          <div className="card-header">
            <h3>👥 Prospects</h3>
          </div>
          <div className="prospect-chart">
            <h3>Total Prospects: {prospectData.count}</h3>
            {hasProspectData ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={prospectData.byStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
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
              <p>No prospect data available.</p>
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
      <style>{`
        :root {
          --primary: #1976d2;
          --primary-dark: #125ea3;
          --secondary: #ff9800;
          --secondary-dark: #f57c00;
          --success: #4CAF50;
          --error: #F44336;
          --info: #2196F3;
          --warning: #FF9800;
          --text: #333;
          --text-light: #666;
          --border: #ddd;
          --bg: #f5f5f5;
          --card-bg: #ffffff;  
          --shadow: 0 4px 12px rgba(0,0,0,0.08);
          --radius: 12px;
          --transition: all 0.3s ease;
          --text-color: #333333;
          --accent-color: #007bff;
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
        }

        /* Header Styles */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 0.5rem 0;
          position: relative;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-left h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text);
        }

        .calendar-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: var(--transition);
          color:red;
        }

        .calendar-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .date-display {
          font-size: 0.9rem;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-right.mobile-open {
          display: flex;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .appointments-btn, .follow-ups-btn, .field-executive-btn {
          position: relative;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius);
          border: none;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
        }

        .appointments-btn {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: #fff;
        }

        .follow-ups-btn {
          background: linear-gradient(135deg, var(--secondary), var(--secondary-dark));
          color: #fff;
        }

        .field-executive-btn {
          background: linear-gradient(135deg, #9C27B0, #7B1FA2);
          color: #fff;
        }

        .field-executive-btn:hover {
          background: linear-gradient(135deg, #7B1FA2, #6A1B9A);
        }

        .appointment-count, .follow-up-count {
          background-color: rgba(255, 255, 255, 0.2);
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
        }

        .appointment-count.new {
          animation: blink 1s infinite;
        }

        .user-avatar {
          background-color: var(--primary);
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
        }

        .user-avatar:hover {
          transform: scale(1.05);
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
        }

        .card-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
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
          height: 300px;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          font-weight: 600;
          font-size: 0.9rem;
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

        /* Month Picker Overlay */
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
          background-color: var(--card-bg);
          color: var(--text-color);
          border-radius: var(--radius);
          padding: 1.5rem;
          box-shadow: var(--shadow);
          width: 300px;
          max-width: 90%;
        }

        .month-picker-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .month-select,
        .year-select {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          background-color: #fff;
          color: #000;
          flex: 1;
          font-size: 0.9rem;
        }

        .month-select {
          margin-right: 0.5rem;
        }

        .month-picker-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .month-picker-footer button {
          padding: 0.4rem 0.8rem;
          background-color: var(--button-bg);
          color: var(--button-text);
          border: 1px solid var(--border);
          border-radius: 4px;
          cursor: pointer;
        }

        .month-picker-footer button:hover {
          background-color: var(--accent-color);
          color: #fff;
        }

        .cancel-btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          cursor: pointer;
          transition: var(--transition);
        }

        .cancel-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }

        .apply-btn, .save-btn {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          border: none;
          background: var(--primary);
          color: white;
          cursor: pointer;
          transition: var(--transition);
        }

        .apply-btn:hover, .save-btn:hover {
          background: var(--primary-dark);
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
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }

        .form-group input, 
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border-radius: 4px;
          border: 1px solid var(--border);
          font-size: 1rem;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .form-actions button {
          flex: 1;
          padding: 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }

        /* Animations */
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        /* Responsive adjustments */
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
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .mobile-menu-btn {
            display: block;
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
          }

          .header-right {
            display: none;
            width: 100%;
            flex-direction: column;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
          }

          .header-right.mobile-open {
            display: flex;
          }

          .action-buttons {
            flex-direction: column;
            width: 100%;
          }

          .dashboard-content {
            grid-template-columns: 1fr;
          }

          .services-card,
          .payments-card,
          .prospects-card {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 480px) {
          .prospects-table {
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }

          .prospects-table th,
          .prospects-table td {
            padding: 0.5rem;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ExecutiveDashboard;