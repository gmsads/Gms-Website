import React, { useState, useEffect } from 'react';
import axios from 'axios';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
    overflowY: 'auto',
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
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#003366',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
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
};

const Appointment = () => {
  const userName = localStorage.getItem('userName') || '';
  const role = localStorage.getItem('role') || '';
  const canSelectExecutive = ['Admin', 'Sales Manager'].includes(role);

  const [formData, setFormData] = useState({
    executiveName: userName, // Default to logged-in user
    contactName: '',
    businessName: '',
    phoneNumber: '',
    date: '',
    time: '',
    venue: '',
  });

  const [executives, setExecutives] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    const formattedTime = today.toTimeString().slice(0, 5);

    setFormData(prev => ({
      ...prev,
      date: formattedToday,
      time: formattedTime,
    }));

    if (canSelectExecutive) {
      fetchExecutives();
    } else {
      // For non-admins/non-sales managers, set their own name as the only executive option
      setExecutives([{ _id: 'current-user', name: userName }]);
    }
  }, [canSelectExecutive, userName]);

  const fetchExecutives = async () => {
    try {
      const response = await axios.get('/api/executives');
      setExecutives(response.data);
    } catch (error) {
      console.error('Error fetching executives:', error);
      alert('Failed to load executives list');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/appointments', {
        ...formData,
        status: 'pending',
      });

      console.log('Appointment created:', response.data);
      setShowPopup(true);

      // Reset form but keep executive name and current date/time
      const today = new Date();
      setFormData(prev => ({
        ...prev,
        contactName: '',
        businessName: '',
        phoneNumber: '',
        venue: '',
        date: today.toISOString().split('T')[0],
        time: today.toTimeString().slice(0, 5),
      }));

    } catch (error) {
      console.error('Error creating appointment:', error);
      alert(error.response?.data?.message || 'Failed to schedule appointment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1 style={styles.formTitle}>Schedule Appointment</h1>
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
            <label style={styles.inputLabel}>Business Name</label>
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
            <label style={styles.inputLabel}>Contact Person Name</label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label style={styles.inputLabel}>Phone Number</label>
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

          {/* Date */}
          <div>
            <label style={styles.inputLabel}>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>

          {/* Time */}
          <div>
            <label style={styles.inputLabel}>Time</label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>

          {/* Venue */}
          <div>
            <label style={styles.inputLabel}>Venue/Address</label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>

          <button 
            type="submit" 
            style={styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </form>
      </div>

      {/* Success Popup */}
      {showPopup && (
        <div style={styles.modalOverlay}>
          <div style={styles.popupContainer}>
            <h2 style={styles.congratsText}>Appointment Scheduled!</h2>
            <p style={styles.subText}>Your appointment has been successfully scheduled.</p>
            <button
              style={styles.closeButton}
              onClick={() => setShowPopup(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointment;