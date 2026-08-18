import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const HourRecord = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    executiveName: '', // Will be populated from auth data
    phoneNumber: '',
    topicDiscussed: '',
    remark: ''
  });

  const [errors, setErrors] = useState({ phoneNumber: '' });
  const [submittedData, setSubmittedData] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get logged-in user's name from localStorage/session
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user')) || 
                    JSON.parse(sessionStorage.getItem('user'));
    
    if (userData && (userData.name || userData.username)) {
      setFormData(prev => ({
        ...prev,
        executiveName: userData.name || userData.username
      }));
    } else {
      // Fallback to any stored user name
      const storedName = localStorage.getItem('userName') || sessionStorage.getItem('userName');
      if (storedName) {
        setFormData(prev => ({
          ...prev,
          executiveName: storedName
        }));
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phoneNumber') {
      // Allow empty value and any input without validation
      setFormData(prev => ({ ...prev, [name]: value }));
      // Clear any existing error
      setErrors(prev => ({ ...prev, phoneNumber: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Phone number is optional now, no validation required
    // Just proceed with the submission

    try {
      const dataToSend = {
        executiveName: formData.executiveName,
        phoneNumber: formData.phoneNumber, // Can be empty
        topicDiscussed: formData.topicDiscussed,
        remark: formData.remark || '' // Ensure remark is at least empty string
      };

      const response = await axios.post('/api/interactions', dataToSend);
      
      const timestamp = format(new Date(response.data.createdAt), "MMMM d, yyyy 'at' h:mm a");
      setSubmittedData({
        ...response.data,
        createdAt: timestamp,
        phoneNumber: formData.phoneNumber // Keep the formatted phone number for display
      });
      
      setShowSuccess(true);
      
      // Reset form - keep executive name
      setFormData(prev => ({
        executiveName: prev.executiveName, // Keep executive name
        phoneNumber: '',
        topicDiscussed: '',
        remark: ''
      }));

    } catch (error) {
      console.error('Error saving interaction:', error);
      alert('Failed to save interaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccess(false);
    
    // No automatic navigation - just close the modal
    // The user can continue adding more interactions
  };

  // Styles
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif"
    },
    formCard: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      overflow: 'hidden',
      marginBottom: '32px'
    },
    formHeader: {
      background: 'linear-gradient(to right, #3182ce, #2b6cb0)',
      padding: '20px 24px',
      color: 'white'
    },
    formHeaderText: {
      fontSize: '18px',
      fontWeight: '500',
      margin: 0
    },
    formBody: {
      padding: '24px'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginBottom: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#2d3748'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '15px',
      transition: 'all 0.2s ease',
      backgroundColor: '#f8fafc',
      outline: 'none',
      boxSizing: 'border-box'
    },
    readonlyInput: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '15px',
      backgroundColor: '#edf2f7',
      color: '#4a5568',
      boxSizing: 'border-box',
      cursor: 'not-allowed',
      fontWeight: '500'
    },
    inputFocus: {
      borderColor: '#3182ce',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.2)',
      backgroundColor: '#ffffff'
    },
    textarea: {
      minHeight: '120px',
      resize: 'vertical'
    },
    errorText: {
      color: '#e53e3e',
      fontSize: '13px',
      marginTop: '4px'
    },
    helperText: {
      fontSize: '12px',
      color: '#718096',
      marginTop: '4px'
    },
    submitButton: {
      width: '100%',
      padding: '14px',
      backgroundColor: '#3182ce',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    submitButtonHover: {
      backgroundColor: '#2b6cb0'
    },
    submitButtonDisabled: {
      backgroundColor: '#a0aec0',
      cursor: 'not-allowed'
    },
    spinner: {
      animation: 'spin 1s linear infinite',
      marginRight: '8px'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '500px',
      overflow: 'hidden',
      animation: 'modalFadeIn 0.3s ease-out'
    },
    modalHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1a202c',
      margin: 0
    },
    modalCloseButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    modalBody: {
      padding: '24px'
    },
    successIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: '#c6f6d5',
      color: '#38a169',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px'
    },
    successMessage: {
      textAlign: 'center',
      marginBottom: '24px'
    },
    successTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#1a202c',
      marginBottom: '8px'
    },
    successTime: {
      fontSize: '14px',
      color: '#718096',
      marginBottom: '16px'
    },
    successDetails: {
      marginTop: '20px',
      borderTop: '1px solid #e2e8f0',
      paddingTop: '20px'
    },
    detailRow: {
      display: 'flex',
      marginBottom: '12px'
    },
    detailLabel: {
      flex: '0 0 100px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#4a5568'
    },
    detailValue: {
      flex: 1,
      fontSize: '15px',
      color: '#2d3748'
    },
    modalFooter: {
      padding: '16px 24px',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'flex-end'
    },
    continueButton: {
      padding: '10px 20px',
      backgroundColor: '#3182ce',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }
  };

  // Add keyframe animation for spinner
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes modalFadeIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(styleSheet);

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.formHeader}>
          <h2 style={styles.formHeaderText}>New Hour Record</h2>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.formBody}>
          {/* Executive Name - Readonly/Automatically filled */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Executive Name*</label>
            <input
              type="text"
              name="executiveName"
              value={formData.executiveName}
              readOnly
              style={styles.readonlyInput}
              placeholder="Loading..."
              required
            />
            {!formData.executiveName && (
              <div style={styles.helperText}>Loading executive name...</div>
            )}
          </div>

          {/* Phone Number - Optional */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number (Optional)</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              style={{
                ...styles.input,
                ':focus': styles.inputFocus
              }}
              placeholder="Enter phone number (optional)"
            />
            {errors.phoneNumber && (
              <div style={styles.errorText}>{errors.phoneNumber}</div>
            )}
            <div style={styles.helperText}>
              Optional - You can leave this empty
            </div>
          </div>

          {/* Topic Discussed - Required */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Topic Discussed*</label>
            <textarea
              name="topicDiscussed"
              value={formData.topicDiscussed}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...styles.textarea,
                ':focus': styles.inputFocus
              }}
              placeholder="Details of the conversation..."
              required
            />
          </div>

          {/* Remarks - Optional */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Remarks (Optional)</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              style={{
                ...styles.input,
                ...styles.textarea,
                ':focus': styles.inputFocus
              }}
              placeholder="Additional notes or action items..."
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
              ':hover': !isSubmitting ? styles.submitButtonHover : {}
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg
                  style={styles.spinner}
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill="currentColor"
                    d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
                    opacity=".25"
                  />
                  <path
                    fill="currentColor"
                    d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"
                  />
                </svg>
                Processing...
              </>
            ) : 'Save Hour Record'}
          </button>
        </form>
      </div>

      {showSuccess && submittedData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Success</h3>
              <button 
                style={styles.modalCloseButton}
                onClick={handleModalClose}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.successIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div style={styles.successMessage}>
                <h4 style={styles.successTitle}>Hour Record Saved Successfully</h4>
                <p style={styles.successTime}>{submittedData.createdAt}</p>
              </div>
              
              <div style={styles.successDetails}>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Executive:</div>
                  <div style={styles.detailValue}>{submittedData.executiveName}</div>
                </div>
                {submittedData.phoneNumber && (
                  <div style={styles.detailRow}>
                    <div style={styles.detailLabel}>Phone:</div>
                    <div style={styles.detailValue}>{submittedData.phoneNumber}</div>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Topic:</div>
                  <div style={styles.detailValue}>{submittedData.topicDiscussed}</div>
                </div>
                {submittedData.remark && (
                  <div style={styles.detailRow}>
                    <div style={styles.detailLabel}>Remarks:</div>
                    <div style={styles.detailValue}>{submittedData.remark}</div>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button 
                style={styles.continueButton}
                onClick={handleModalClose}
              >
                Add Another Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HourRecord;