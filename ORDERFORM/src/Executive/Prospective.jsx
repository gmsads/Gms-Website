import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const baseInputStyles = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  boxSizing: 'border-box',
  border: '1px solid #ccc',
  borderRadius: '4px',
  fontSize: '1rem',
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    overflowY: 'auto',
  },
  searchContainer: {
    width: '100%',
    maxWidth: '600px',
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '600px',
  },
  formTitle: {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '20px',
  },
  inputLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  input: baseInputStyles,
  button: {
    padding: '12px',
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  smallButton: {
    padding: '8px 12px',
    fontSize: '0.9rem',
    marginLeft: '10px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    width: '100vw',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  popupContainer: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    fontSize: '1.2rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px',
    width: '90%',
  },
  congratsText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: '10px',
  },
  subText: {
    fontSize: '18px',
    color: '#555',
  },
  closeButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  existingProspectContainer: {
    marginTop: '20px',
    border: '1px solid #ddd',
    padding: '15px',
    borderRadius: '4px',
    backgroundColor: '#f9f9f9'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    justifyContent: 'center'
  },
  viewButton: {
    backgroundColor: '#4CAF50'
  },
  createButton: {
    backgroundColor: '#2196F3'
  },
  textarea: {
    ...baseInputStyles,
    minHeight: '100px'
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px'
  },
  viewOnlyField: {
    backgroundColor: '#f5f5f5',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '15px'
  }
};

const Prospective = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || '';
  const role = localStorage.getItem('role') || '';
  const canSelectExecutive = role === 'Admin';

  const [formData, setFormData] = useState({
    executiveName: userName,
    businessName: location.state?.businessName || '',
    phoneNumber: location.state?.phoneNumber || '',
    contactPerson: location.state?.customerName || '',
    location: '',
    followUpDate: new Date().toISOString().split('T')[0],
    requirementDescription: '',
    prospectType: '',
    whatsappStatus: '',
    leadFrom: '',
    otherLeadSource: ''
  });

  const [executives, setExecutives] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showProspectForm, setShowProspectForm] = useState(!!location.state?.phoneNumber);
  const [existingProspect, setExistingProspect] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(location.state?.phoneNumber || '');
  const [viewMode, setViewMode] = useState(false);

  const leadSources = [
    'India Mart',
    'Just Dial',
    'Meta (Facebook/Instagram)',
    'Google Ads',
    'Website',
    'Referral',
    'Walk-in',
    'Other Specify'
  ];

  useEffect(() => {
    if (canSelectExecutive) {
      fetchExecutives();
    } else {
      setExecutives([{ _id: 'current-user', name: userName }]);
    }

    // If phone number is passed from another page, automatically search
    if (location.state?.phoneNumber) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelectExecutive, userName, location.state]);

  const fetchExecutives = async () => {
    try {
      const response = await axios.get('/api/executives');
      setExecutives(response.data);
    } catch (error) {
      console.error('Error fetching executives:', error);
      alert('Failed to load executives list');
    }
  };

  const handleSearch = async () => {
    if (phoneNumber.length !== 10) {
      setSearchError("Please enter exactly 10 digits");
      return;
    }

    setIsLoading(true);
    setSearchError('');

    try {
      const response = await axios.get(`/api/prospective-clients/by-phone?phone=${phoneNumber}`);
      
      if (response.data && response.data.length > 0) {
        setExistingProspect(response.data[0]);
        setViewMode(true);
        setShowProspectForm(false);
      } else {
        setShowProspectForm(true);
        setExistingProspect(null);
        setViewMode(false);
        setFormData(prev => ({ 
          ...prev, 
          phoneNumber,
          businessName: location.state?.businessName || '',
          contactPerson: location.state?.customerName || '',
          location: '',
          requirementDescription: '',
          prospectType: '',
          whatsappStatus: '',
          leadFrom: '',
          otherLeadSource: '',
          followUpDate: new Date().toISOString().split('T')[0]
        }));
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchError(
        error.response?.data?.message || "Failed to search. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setShowProspectForm(true);
    setExistingProspect(null);
    setViewMode(false);
    setFormData(prev => ({ 
      ...prev, 
      phoneNumber,
      businessName: location.state?.businessName || '',
      contactPerson: location.state?.customerName || '',
      leadFrom: '',
      otherLeadSource: ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Determine the final lead source value
      const finalLeadFrom = formData.leadFrom === 'Other Specify' 
        ? formData.otherLeadSource 
        : formData.leadFrom;

      const payload = {
        ExcutiveName: formData.executiveName,
        businessName: formData.businessName,
        phoneNumber: formData.phoneNumber,
        contactPerson: formData.contactPerson,
        location: formData.location,
        followUpDate: formData.followUpDate,
        requirementDescription: formData.requirementDescription,
        prospectType: formData.prospectType,
        whatsappStatus: formData.whatsappStatus,
        leadFrom: finalLeadFrom
      };

      const requiredFields = [
        'ExcutiveName', 'businessName', 'phoneNumber', 
        'contactPerson', 'location', 'followUpDate',
        'prospectType', 'whatsappStatus', 'leadFrom'
      ];
      
      const missingFields = requiredFields.filter(field => !payload[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      if (payload.leadFrom === 'Other Specify' && !formData.otherLeadSource) {
        throw new Error('Please specify the lead source');
      }

      // eslint-disable-next-line no-unused-vars
      const response = await axios.post(
        '/api/prospective-clients',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setShowPopup(true);
      resetForm();
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.message || 
            error.message || 
            'Failed to save prospect.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      executiveName: userName,
      businessName: '',
      phoneNumber: '',
      contactPerson: '',
      location: '',
      followUpDate: new Date().toISOString().split('T')[0],
      requirementDescription: '',
      prospectType: '',
      whatsappStatus: '',
      leadFrom: '',
      otherLeadSource: ''
    });
    setShowProspectForm(false);
    setPhoneNumber('');
    setExistingProspect(null);
    setViewMode(false);
  };

  const handleBackToDashboard = () => {
    navigate('/prospects');
  };

  return (
    <div style={styles.container}>
      {!showProspectForm && !viewMode && !location.state?.phoneNumber ? (
        <div style={styles.searchContainer}>
          <h1 style={styles.formTitle}>Search</h1>
          <div>
            <label style={styles.inputLabel}>Enter Phone Number:</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val) && val.length <= 10) {
                  setPhoneNumber(val);
                  if (searchError) setSearchError('');
                }
              }}
              placeholder="10 digit phone number"
              maxLength={10}
              style={styles.input}
            />
            {searchError && (
              <div style={{ color: 'red', marginBottom: '15px' }}>{searchError}</div>
            )}
            <button
              onClick={handleSearch}
              disabled={isLoading || phoneNumber.length !== 10}
              style={{ ...styles.button, width: '100%' }}
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      ) : viewMode ? (
        <div style={styles.formContainer}>
          <h1 style={styles.formTitle}>Prospect Details</h1>
          
          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Executive Name</label>
            <div>{existingProspect.ExcutiveName}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Business Name</label>
            <div>{existingProspect.businessName}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Contact Person</label>
            <div>{existingProspect.contactPerson}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Phone Number</label>
            <div>{existingProspect.phoneNumber}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Location</label>
            <div>{existingProspect.location}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Prospect Type</label>
            <div>{existingProspect.prospectType}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>WhatsApp Status</label>
            <div>{existingProspect.whatsappStatus}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Lead From</label>
            <div>{existingProspect.leadFrom}</div>
          </div>

          <div style={styles.viewOnlyField}>
            <label style={styles.inputLabel}>Follow-up Date</label>
            <div>{new Date(existingProspect.followUpDate).toLocaleDateString()}</div>
          </div>

          {existingProspect.requirementDescription && (
            <div style={styles.viewOnlyField}>
              <label style={styles.inputLabel}>Requirement Description</label>
              <div>{existingProspect.requirementDescription}</div>
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button 
              onClick={handleBackToDashboard}
              style={{ ...styles.button, ...styles.viewButton }}
            >
              Back to Dashboard
            </button>
            <button 
              onClick={handleCreateNew}
              style={{ ...styles.button, ...styles.createButton }}
            >
              Create New Prospect
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.formContainer}>
          <h1 style={styles.formTitle}>
            Create New Prospect
          </h1>
          
          <form onSubmit={handleSubmit}>
            {/* Executive Name Field */}
            <div>
              <label style={styles.inputLabel}>Executive Name</label>
              {!canSelectExecutive ? (
                <input
                  type="text"
                  name="executiveName"
                  value={formData.executiveName}
                  style={styles.input}
                  readOnly
                />
              ) : (
                <select
                  name="executiveName"
                  value={formData.executiveName}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                >
                  <option value="">Select Executive</option>
                  {executives.map(exec => (
                    <option key={exec._id} value={exec.name}>{exec.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Business Name */}
            <div>
              <label style={styles.inputLabel}>Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            {/* Contact Person */}
            <div>
              <label style={styles.inputLabel}>Contact Person *</label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label style={styles.inputLabel}>Phone Number *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                style={styles.input}
                required
                pattern="[0-9]{10}"
                title="10 digit phone number"
              />
            </div>

            {/* Location */}
            <div>
              <label style={styles.inputLabel}>Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                style={styles.input}
                required
              />
            </div>

            {/* Lead From */}
            <div>
              <label style={styles.inputLabel}>Lead From *</label>
              <select
                name="leadFrom"
                value={formData.leadFrom}
                onChange={handleInputChange}
                style={styles.input}
                required
              >
                <option value="">Select Lead Source</option>
                {leadSources.map((source, index) => (
                  <option key={index} value={source}>{source}</option>
                ))}
              </select>
              {formData.leadFrom === 'Other Specify' && (
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.inputLabel}>Please Specify Lead Source *</label>
                  <input
                    type="text"
                    name="otherLeadSource"
                    value={formData.otherLeadSource}
                    onChange={handleInputChange}
                    style={styles.input}
                    required={formData.leadFrom === 'Other Specify'}
                  />
                </div>
              )}
            </div>

            {/* Prospect Type */}
            <div>
              <label style={styles.inputLabel}>Prospect Type *</label>
              <select
                name="prospectType"
                value={formData.prospectType}
                onChange={handleInputChange}
                style={styles.input}
                required
              >
                <option value="">Select Type</option>
                <option value="Hot Prospect">Hot Prospect</option>
                <option value="Cold Prospect">Cold Prospect</option>
                <option value="Expected in Next Month">Expected in Next Month</option>
              </select>
            </div>

            {/* WhatsApp Status */}
            <div>
              <label style={styles.inputLabel}>WhatsApp Status *</label>
              <select
                name="whatsappStatus"
                value={formData.whatsappStatus}
                onChange={handleInputChange}
                style={styles.input}
                required
              >
                <option value="">Select Status</option>
                <option value="Send">Send</option>
                <option value="Not Send">Not Send</option>
              </select>
            </div>

            {/* Follow-up Date */}
            <div>
              <label style={styles.inputLabel}>Follow-up Date *</label>
              <input
                type="date"
                name="followUpDate"
                value={formData.followUpDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                style={styles.input}
                required
              />
            </div>

            {/* Requirement Description */}
            <div>
              <label style={styles.inputLabel}>Requirement Description</label>
              <textarea
                name="requirementDescription"
                value={formData.requirementDescription}
                onChange={handleInputChange}
                style={styles.textarea}
                placeholder="Describe the client's requirements"
              />
            </div>

            <div style={styles.formFooter}>
              <button
                type="button"
                onClick={handleBackToDashboard}
                style={{ ...styles.button, ...styles.smallButton }}
              >
                Back to Dashboard
              </button>
              <button 
                type="submit" 
                style={{ ...styles.button, width: 'auto' }}
                disabled={isLoading}
              >
                {isLoading ? 'Submitting...' : 'Submit Prospect'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success Popup */}
      {showPopup && (
        <div style={styles.modalOverlay}>
          <div style={styles.popupContainer}>
            <h2 style={styles.congratsText}>Prospect Created!</h2>
            <p style={styles.subText}>
              The prospect information has been successfully saved.
            </p>
            <button
              style={styles.closeButton}
              onClick={() => {
                setShowPopup(false);
                resetForm();
                navigate('/prospects');
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prospective;