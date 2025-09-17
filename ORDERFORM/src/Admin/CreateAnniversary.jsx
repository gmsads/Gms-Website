/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import axios from 'axios';

const CreateAnniversary = () => {
  const [form, setForm] = useState({
    clientName: '',
    businessName: '',
    anniversaryDate: '',
    startingYear: '',
    clientBirthday: '',
    collaborationDate: '',
    marriageAnniversaryDate: '' // Added new field
  });

  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: '' // 'success' or 'error'
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/anniversaries', form);
      setForm({
        clientName: '',
        businessName: '',
        anniversaryDate: '',
        startingYear: '',
        clientBirthday: '',
        collaborationDate: '',
        marriageAnniversaryDate: '' // Reset new field
      });
      
      setNotification({
        show: true,
        message: '🎉 Anniversary saved successfully!',
        type: 'success'
      });

      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    } catch (err) {
      setNotification({
        show: true,
        message: '❌ Error saving anniversary. Please try again.',
        type: 'error'
      });
      setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    }
  };

  const styles = {
    container: {
      maxWidth: '500px',
      margin: '60px auto',
      padding: '30px',
      backgroundColor: '#fefefe',
      borderRadius: '12px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
      fontFamily: 'Segoe UI, sans-serif',
      position: 'relative'
    },
    heading: {
      textAlign: 'center',
      marginBottom: '25px',
      fontSize: '22px',
      color: '#003366'
    },
    row: {
      marginBottom: '15px',
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontWeight: '600',
      marginBottom: '6px',
      fontSize: '15px',
      color: '#333'
    },
    input: {
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '6px',
      fontSize: '14px'
    },
    button: {
      marginTop: '20px',
      padding: '12px',
      backgroundColor: '#003366',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '16px',
      cursor: 'pointer',
      width: '100%',
      transition: 'background-color 0.3s',
      ':hover': {
        backgroundColor: '#002244'
      }
    },
    notification: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 25px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontSize: '16px',
      fontWeight: '500',
      zIndex: 1000,
      animation: 'slideIn 0.5s, fadeOut 0.5s 2.5s',
      animationFillMode: 'forwards'
    },
    success: {
      backgroundColor: '#4BB543',
      color: 'white'
    },
    error: {
      backgroundColor: '#FF3333',
      color: 'white'
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Add Client Anniversary</h2>

      {notification.show && (
        <div style={{
          ...styles.notification,
          ...(notification.type === 'success' ? styles.success : styles.error)
        }}>
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={styles.row}>
          <label style={styles.label}>Client Name</label>
          <input
            name="clientName"
            placeholder="Client Name"
            value={form.clientName}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Business Name</label>
          <input
            name="businessName"
            placeholder="Business Name"
            value={form.businessName}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Anniversary Date</label>
          <input
            type="date"
            name="anniversaryDate"
            value={form.anniversaryDate}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Starting Year</label>
          <input
            type="number"
            name="startingYear"
            placeholder="e.g., 2020"
            value={form.startingYear}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Client Birthday</label>
          <input
            type="date"
            name="clientBirthday"
            value={form.clientBirthday}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label style={styles.label}>Collaboration Date</label>
          <input
            type="date"
            name="collaborationDate"
            value={form.collaborationDate}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        {/* Added Marriage Anniversary Date field */}
        <div style={styles.row}>
          <label style={styles.label}>Marriage Anniversary Date</label>
          <input
            type="date"
            name="marriageAnniversaryDate"
            value={form.marriageAnniversaryDate}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        <button type="submit" style={styles.button}>Save Anniversary</button>
      </form>
    </div>
  );
};

export default CreateAnniversary;