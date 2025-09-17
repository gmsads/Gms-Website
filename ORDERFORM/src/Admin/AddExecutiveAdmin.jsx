import React, { useState} from 'react';
import axios from 'axios';

const API_BASE_URL = '/api'; // Added /api prefix

const AddExecutiveAdmin = () => {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    phone: '',
    password: '',
    email: '',
    guardianName: '',
    aadhar: '',
    joiningDate: '',
    experience: '',
    role: 'executive',
    active: true,
  });
  const [image, setImage] = useState(null);
  const [popupMessage, setPopupMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add async keyword here
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    // Basic validation
    if (!formData.username || !formData.name || !formData.phone || !formData.password) {
      setPopupMessage('Please fill all required fields');
      setShowPopup(true);
      setIsSubmitting(false);
      return;
    }
  
    // Validate image if uploaded
    if (image) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(image.type)) {
        setPopupMessage('Only JPEG, PNG, and GIF images are allowed');
        setShowPopup(true);
        setIsSubmitting(false);
        return;
      }
  
      if (image.size > 2 * 1024 * 1024) {
        setPopupMessage('Image size should be less than 2MB');
        setShowPopup(true);
        setIsSubmitting(false);
        return;
      }
    }
  
    // Map frontend role values to backend endpoints
    const roleEndpointMap = {
      'executive': 'add-executive',
      'admin': 'add-admin',
      'designer': 'add-designer',
      'account': 'add-account',
      'Service Executive': 'add-service-executive',
      'Service Manager': 'add-service-manager',
      'Sales Manager': 'add-sales-manager',
      'IT Team': 'add-it-team',
      'Digital Marketing': 'add-digital-marketing',
      'Client Service': 'add-clientservice',
      'unit': 'add-unit',
      'FieldExecutive': 'add-field-executive'
    };
  
    const endpoint = roleEndpointMap[formData.role];
    
    if (!endpoint) {
      setPopupMessage('Invalid role selected');
      setShowPopup(true);
      setIsSubmitting(false);
      return;
    }
  
    const data = new FormData();
    for (const key in formData) {
      if (key !== 'role') { // Don't send role in form data
        data.append(key, formData[key]);
      }
    }
    if (image) {
      data.append('image', image);
    }
  
    try {
      // eslint-disable-next-line no-unused-vars
      const response = await axios.post(`${API_BASE_URL}/${endpoint}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setPopupMessage('Employee added successfully!');
      setShowPopup(true);
      
      // Reset form
      setFormData({
        username: '',
        name: '',
        phone: '',
        password: '',
        email: '',
        guardianName: '',
        aadhar: '',
        joiningDate: '',
        experience: '',
        role: 'executive',
        active: true,
      });
      setImage(null);
    } catch (error) {
      let message = 'Failed to add employee';
      if (error.response) {
        if (error.response.status === 404) {
          message = `Endpoint not found (404) - ${endpoint} does not exist on server`;
        } else {
          message = error.response.data.error || error.response.data.message || message;
        }
      } else if (error.request) {
        message = 'No response from server - is it running?';
      } else {
        message = error.message;
      }
      setPopupMessage(message);
      setShowPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  const styles = {
    formContainer: {
      backgroundColor: '#fff',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      maxWidth: '800px',
      width: '100%',
      margin: '0 auto',
      position: 'relative',
    },
    formTitle: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#003366',
      marginBottom: '20px',
      textAlign: 'center',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: '#333',
      fontWeight: '500',
    },
  
    select: {
      width: '100%',
      padding: '10px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      fontSize: '16px',
      appearance: 'none',
      backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
      backgroundSize: '1em',
    },
    button: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#003366',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px',
    },
    popup: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#f0f0f0',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 999,
      textAlign: 'center',
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.4)',
      zIndex: 998,
    },
    closeBtn: {
      marginTop: '20px',
      backgroundColor: '#003366',
      color: '#fff',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    formRow: {
      display: 'flex',
      flexWrap: 'wrap', // makes it mobile responsive
      gap: '40px',
      marginBottom: '25px', // ✅ Ensures spacing between stacked rows
    },
    formColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px', // ✅ Ensures label and input have a little space
    },
    input: {
      width: '100%',
      padding: '10px',
      borderRadius: '6px', // or '5px'
      border: '1px solid #ccc',
      fontSize: '16px', // or '14px' depending on design
    },
    statusToggle: {
      display: 'flex',
      gap: '10px',
      background: '#f5f5f5',
      padding: '5px',
      borderRadius: '8px',
      marginTop: '10px',
    },
    statusOption: {
      flex: 1,
      padding: '8px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      background: 'transparent',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      fontSize: '0.9rem',
    },
    statusOptionActive: {
      background: 'white',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      fontWeight: '500',
    },
    statusIndicator: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
    },
    statusIndicatorActive: {
      background: '#28a745',
    },
    statusIndicatorInactive: {
      background: '#dc3545',
    },
  };

  return (
    <div style={styles.formContainer}>
      <div style={styles.formTitle}>Add New Employee</div>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input type="text" name="fakeuser" style={{ display: 'none' }} />
        <input type="password" name="fakepassword" style={{ display: 'none' }} />

        <div style={styles.formRow}>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name*</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                style={styles.input}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>
          </div>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>UserName*</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                style={styles.input}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                style={styles.input}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
          </div>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number*</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                style={styles.input}
                onChange={handleChange}
                onKeyPress={(e) => {
                  if (!/^\d$/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                maxLength={10}
                placeholder="Enter 10-digit phone number"
                required
              />
            </div>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Password*</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                style={styles.input}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Parent/Guardian Name</label>
              <input
                type="text"
                name="guardianName"
                value={formData.guardianName}
                style={styles.input}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Aadhar Card Number</label>
              <input
                type="text"
                name="aadhar"
                value={formData.aadhar}
                style={styles.input}
                onChange={handleChange}
                maxLength={12}
                placeholder="12-digit Aadhar number"
              />
            </div>
          </div>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date of Joining</label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                style={styles.input}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div style={styles.formRow}>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Past Experience (years)</label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                style={styles.input}
                onChange={handleChange}
                min="0"
                max="50"
                placeholder="0"
              />
            </div>
          </div>
          <div style={styles.formColumn}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Role*</label>
              <select
                name="role"
                value={formData.role}
                style={styles.select}
                onChange={handleChange}
                required
              >
                <option value="executive">Sales Executive</option>
                <option value="admin">Admin</option>
                <option value="designer">Designer</option>
                <option value="account">Account</option>
                <option value="Service Executive">Service Executive</option>
                <option value="Service Manager">Service Manager</option>
                <option value="Sales Manager">Sales Manager</option>
                <option value="IT Team">IT Team</option>
                <option value="Digital Marketing">Digital Marketing</option>
                <option value="Client Service">Client Service</option>
                  <option value="unit">Unit</option>
               <option value="FieldExecutive">Field Executive</option>
              </select>
            </div>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Employment Status</label>
          <div style={styles.statusToggle}>
            <button
              type="button"
              style={{
                ...styles.statusOption,
                ...(formData.active ? styles.statusOptionActive : {}),
              }}
              onClick={() => setFormData(prev => ({ ...prev, active: true }))}
            >
              <span style={{ ...styles.statusIndicator, ...styles.statusIndicatorActive }}></span>
              Active
            </button>
            <button
              type="button"
              style={{
                ...styles.statusOption,
                ...(!formData.active ? styles.statusOptionActive : {}),
              }}
              onClick={() => setFormData(prev => ({ ...prev, active: false }))}
            >
              <span style={{ ...styles.statusIndicator, ...styles.statusIndicatorInactive }}></span>
              Inactive
            </button>
          </div>
          {/* if only to show active */}
          {/* <div>
            <span
              style={{
                padding: '6px 60px',
                borderRadius: '20px',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: formData.active ? 'green' : 'red',
                display: 'inline-block',
                fontSize: '14px',
              }}
            >
              {formData.active ? 'Active' : 'Inactive'}
            </span>
          </div> */}
        </div>

        {/* Image Upload Field (must be inside form) */}
        <div style={styles.formGroup}>
          <label style={styles.label}>Profile Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            style={styles.input}
          />
        </div>

        <button 
          type="submit" 
          style={styles.button}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add Employee'}
        </button>
      </form>

      {showPopup && (
        <>
          <div style={styles.overlay} />
          <div style={styles.popup}>
            <h3>{popupMessage}</h3>
            <button 
              style={styles.closeBtn} 
              onClick={() => setShowPopup(false)}
            >
              OK
            </button>
          </div>
        </>
      )}
    </div>
  );
};


export default AddExecutiveAdmin;