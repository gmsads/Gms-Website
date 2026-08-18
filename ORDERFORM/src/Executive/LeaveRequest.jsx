// src/components/Executive/LeaveRequest.jsx
import React, { useState } from 'react';
import axios from 'axios';

function LeaveRequest() {
  const [formData, setFormData] = useState({
    executiveName: localStorage.getItem('userName') || '',
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    reason: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calculate number of days between two dates
  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    
    if (updatedFormData.startDate && updatedFormData.endDate) {
      updatedFormData.numberOfDays = calculateDays(updatedFormData.startDate, updatedFormData.endDate);
    } else {
      updatedFormData.numberOfDays = 0;
    }
    
    setFormData(updatedFormData);
    if (error) setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.executiveName.trim()) {
      setError('Executive name is required');
      return false;
    }
    if (!formData.startDate) {
      setError('Please select start date');
      return false;
    }
    if (!formData.endDate) {
      setError('Please select end date');
      return false;
    }
    if (new Date(formData.startDate) < new Date().setHours(0, 0, 0, 0)) {
      setError('Start date cannot be in the past');
      return false;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      setError('End date cannot be before start date');
      return false;
    }
    if (formData.numberOfDays <= 0) {
      setError('Number of days must be greater than 0');
      return false;
    }
    if (!formData.reason.trim()) {
      setError('Please provide a reason for leave');
      return false;
    }
    if (formData.reason.length < 10) {
      setError('Please provide a more detailed reason (minimum 10 characters)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/leave-requests', formData);
      
      setSuccess(response.data.message);
      setLoading(false);
      
      // Reset form after success
      setFormData({
        executiveName: localStorage.getItem('userName') || '',
        startDate: '',
        endDate: '',
        numberOfDays: 0,
        reason: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error submitting leave request:', error);
      setError(error.response?.data?.message || 'Failed to submit leave request');
      setLoading(false);
    }
  };

  const styles = {
    container: {
      padding: '30px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '700px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '30px',
      paddingBottom: '15px',
      borderBottom: '2px solid #f0f0f0',
    },
    title: {
      margin: 0,
      color: '#2c3e50',
      fontSize: '1.8rem',
      fontWeight: '600',
    },
    subtitle: {
      color: '#7f8c8d',
      marginTop: '5px',
      fontSize: '0.95rem',
    },
    form: {
      marginBottom: '20px',
    },
    formGroup: {
      marginBottom: '25px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: '#34495e',
      fontWeight: '500',
      fontSize: '0.95rem',
    },
    input: {
      width: '100%',
      padding: '12px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'all 0.3s',
      outline: 'none',
      boxSizing: 'border-box',
      backgroundColor: '#f9f9f9',
    },
    dateInput: {
      width: '100%',
      padding: '12px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'all 0.3s',
      outline: 'none',
      boxSizing: 'border-box',
    },
    daysInput: {
      width: '100%',
      padding: '12px 15px',
      border: '2px solid #667eea',
      borderRadius: '8px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#667eea',
      backgroundColor: '#f0f4ff',
      boxSizing: 'border-box',
      cursor: 'not-allowed',
    },
    textarea: {
      width: '100%',
      padding: '12px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'all 0.3s',
      outline: 'none',
      resize: 'vertical',
      minHeight: '120px',
      boxSizing: 'border-box',
    },
    errorMessage: {
      backgroundColor: '#fee',
      color: '#e74c3c',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '0.95rem',
      border: '1px solid #fcc',
    },
    successMessage: {
      backgroundColor: '#d4edda',
      color: '#155724',
      padding: '12px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '0.95rem',
      border: '1px solid #c3e6cb',
    },
    submitBtn: {
      width: '100%',
      padding: '14px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1.1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
    },
    disabledBtn: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    infoSection: {
      backgroundColor: '#f8f9fa',
      padding: '20px',
      borderRadius: '8px',
      marginTop: '30px',
    },
    infoTitle: {
      color: '#2c3e50',
      fontSize: '1.1rem',
      marginBottom: '12px',
      fontWeight: '600',
    },
    infoList: {
      margin: 0,
      paddingLeft: '20px',
      color: '#6c757d',
      fontSize: '0.95rem',
    },
    infoItem: {
      marginBottom: '8px',
    },
    readOnlyInput: {
      backgroundColor: '#f0f0f0',
      cursor: 'not-allowed',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Request Leave</h1>
        <p style={styles.subtitle}>Please fill in the details below to submit your leave request</p>
      </div>

      <form style={styles.form} onSubmit={handleSubmit}>
        {/* Executive Name - Read Only */}
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="executiveName">Executive Name *</label>
          <input
            style={{...styles.input, ...styles.readOnlyInput}}
            type="text"
            id="executiveName"
            name="executiveName"
            value={formData.executiveName}
            onChange={handleChange}
            readOnly
            required
          />
        </div>

        {/* Start Date */}
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="startDate">Start Date *</label>
          <input
            style={styles.dateInput}
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleDateChange}
            min={new Date().toISOString().split('T')[0]}
            required
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {/* End Date */}
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="endDate">End Date *</label>
          <input
            style={styles.dateInput}
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleDateChange}
            min={formData.startDate || new Date().toISOString().split('T')[0]}
            required
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {/* Number of Days - Auto calculated */}
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="numberOfDays">Number of Days *</label>
          <input
            style={styles.daysInput}
            type="number"
            id="numberOfDays"
            name="numberOfDays"
            value={formData.numberOfDays}
            readOnly
            placeholder="0"
            required
          />
          {formData.startDate && formData.endDate && formData.numberOfDays > 0 && (
            <small style={{ color: '#667eea', marginTop: '5px', display: 'block' }}>
              ✓ Automatically calculated from selected dates
            </small>
          )}
        </div>

        {/* Reason */}
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="reason">Reason for Leave *</label>
          <textarea
            style={styles.textarea}
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Please provide detailed reason for your leave request..."
            rows="4"
            required
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {success && <div style={styles.successMessage}>{success}</div>}

        <button 
          type="submit" 
          style={{...styles.submitBtn, ...(loading ? styles.disabledBtn : {})}}
          disabled={loading}
          onMouseEnter={(e) => !loading && (e.target.style.background = 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)')}
          onMouseLeave={(e) => !loading && (e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}
        >
          {loading ? 'Submitting...' : 'Submit Leave Request'}
        </button>
      </form>

      <div style={styles.infoSection}>
        <h4 style={styles.infoTitle}>Leave Policy Guidelines:</h4>
        <ul style={styles.infoList}>
          <li style={styles.infoItem}>✓ Leave requests should be submitted at least 1 days in advance</li>
          <li style={styles.infoItem}>✓ Emergency leaves can be approved by manager</li>
          <li style={styles.infoItem}>✓ Number of days is automatically calculated based on start and end dates</li>
          <li style={styles.infoItem}>✓ Your request will be reviewed by the admin within 24 hours</li>
          <li style={styles.infoItem}>✓ You will receive a notification once your request is processed</li>
        </ul>
      </div>
    </div>
  );
}

export default LeaveRequest;