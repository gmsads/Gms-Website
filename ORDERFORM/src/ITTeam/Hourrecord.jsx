import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const HourRecord = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    executiveName: '', // Will be populated from auth data
    phoneNumber: '',
    businessName: '',
    customerName: '',
    purpose: 'Select',
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
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      let formattedValue = digitsOnly;
      if (digitsOnly.length > 5) {
        formattedValue = `${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`;
      }

      setFormData(prev => ({ ...prev, [name]: formattedValue }));

      if (digitsOnly.length !== 10 && digitsOnly.length > 0) {
        setErrors(prev => ({ ...prev, phoneNumber: 'Please enter a valid 10-digit Indian phone number' }));
      } else {
        setErrors(prev => ({ ...prev, phoneNumber: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const phoneDigits = formData.phoneNumber.replace(/\D/g, '');

    if (phoneDigits.length !== 10) {
      setErrors(prev => ({ ...prev, phoneNumber: 'Please enter a valid 10-digit Indian phone number' }));
      setIsSubmitting(false);
      return;
    }

    if (formData.purpose === 'Select') {
      alert('Please select a purpose');
      setIsSubmitting(false);
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        phoneNumber: phoneDigits
      };

      const response = await axios.post('/api/interactions', dataToSend);
      
      const timestamp = format(new Date(response.data.createdAt), "MMMM d, yyyy 'at' h:mm a");
      setSubmittedData({
        ...response.data,
        createdAt: timestamp,
        phoneNumber: formData.phoneNumber
      });
      
      setShowSuccess(true);
      
      setFormData(prev => ({
        ...prev,
        phoneNumber: '',
        businessName: '',
        customerName: '',
        purpose: 'Select',
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
    
    if (submittedData) {
      const phoneDigits = submittedData.phoneNumber.replace(/\D/g, '');
      
      if (submittedData.purpose === 'Sale') {
        navigate('/it-dashboard/create-order', {
          state: { 
            phoneNumber: phoneDigits,
            customerName: submittedData.customerName,
            businessName: submittedData.businessName
          }
        });
      } else if (submittedData.purpose === 'Call Back') {
        navigate('/it-dashboard/create-prospect', {
          state: { 
            phoneNumber: phoneDigits,
            customerName: submittedData.customerName,
            businessName: submittedData.businessName
          }
        });
      }
    }
  };

  // Styles
  const styles = {
    container: {
      maxWidth: '900px',
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
      fontWeight: '500'
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
      marginBottom: '16px'
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
      cursor: 'not-allowed'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '15px',
      transition: 'all 0.2s ease',
      backgroundColor: '#f8fafc',
      outline: 'none',
      boxSizing: 'border-box',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.7rem top 50%',
      backgroundSize: '0.65rem auto'
    },
    inputFocus: {
      borderColor: '#3182ce',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.2)',
      backgroundColor: '#ffffff'
    },
    inputError: {
      borderColor: '#e53e3e',
      backgroundColor: '#fff5f5'
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
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#f8fafc'
      }
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
      flex: '0 0 120px',
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
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#2b6cb0'
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <div style={styles.formHeader}>
          <h2 style={styles.formHeaderText}>New Interaction</h2>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.formBody}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Executive Name*</label>
              <input
                type="text"
                name="executiveName"
                value={formData.executiveName}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ':focus': styles.inputFocus
                }}
                placeholder="Your name"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Indian Phone Number*</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ...(errors.phoneNumber ? styles.inputError : {}),
                  ':focus': styles.inputFocus
                }}
                placeholder="98765 43210"
                maxLength={11}
                required
              />
              {errors.phoneNumber && (
                <div style={styles.errorText}>{errors.phoneNumber}</div>
              )}
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                10 digit Number
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Business Name*</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ':focus': styles.inputFocus
                }}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Customer Name*</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                style={{
                  ...styles.input,
                  ':focus': styles.inputFocus
                }}
                placeholder="John Smith"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Purpose*</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                style={{
                  ...styles.select,
                  ':focus': styles.inputFocus
                }}
                required
              >
                <option value="Select">Select </option>
                <option value="Sale">Sale</option>
                <option value="Service">Service</option>
                <option value="Call Back">Call Back</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

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

          <div style={styles.formGroup}>
            <label style={styles.label}>Remarks</label>
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
            disabled={!!errors.phoneNumber || isSubmitting}
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
            ) : 'Save Interaction'}
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
                <h4 style={styles.successTitle}>Interaction Recorded Successfully</h4>
                <p style={styles.successTime}>{submittedData.createdAt}</p>
              </div>
              
              <div style={styles.successDetails}>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Executive:</div>
                  <div style={styles.detailValue}>{submittedData.executiveName}</div>
                </div>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Business:</div>
                  <div style={styles.detailValue}>{submittedData.businessName}</div>
                </div>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Customer:</div>
                  <div style={styles.detailValue}>{submittedData.customerName}</div>
                </div>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Phone:</div>
                  <div style={styles.detailValue}>{submittedData.phoneNumber}</div>
                </div>
                <div style={styles.detailRow}>
                  <div style={styles.detailLabel}>Purpose:</div>
                  <div style={styles.detailValue}>{submittedData.purpose}</div>
                </div>
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
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HourRecord;