import React, { useState } from 'react';

const RecordForm = () => {
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const [formData, setFormData] = useState({
    executiveName: localStorage.getItem('userName') || '',
    date: getDateOptions()[0],
    totalCalls: '',
    followUps: '',
    whatsapp: ''
  });

  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const result = await response.json();
      console.log('Success:', result);
      setShowModal(true);
      setFormData({
        executiveName: localStorage.getItem('userName') || '',
        date: getDateOptions()[0],
        totalCalls: '',
        followUps: '',
        whatsapp: ''
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to save report');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Daily Report</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.row}>
          <label style={styles.label}>Executive Name:</label>
          <input
            type="text"
            name="executiveName"
            value={formData.executiveName}
            readOnly
            style={{ ...styles.input, backgroundColor: '#f0f0f0' }}
          />
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Date:</label>
          <select
            name="date"
            value={formData.date}
            onChange={handleChange}
            style={styles.input}
          >
            {getDateOptions().map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Total Calls:</label>
          <input
            type="number"
            name="totalCalls"
            value={formData.totalCalls}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <label style={styles.label}>Follow-ups:</label>
          <input
            type="text"
            name="followUps"
            value={formData.followUps}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <label style={styles.label}>WhatsApp:</label>
          <input
            type="text"
            name="whatsapp"
            value={formData.whatsapp}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <button type="submit" style={styles.button}>Save</button>
        </div>
      </form>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Success!</h2>
            <p style={styles.modalMessage}>Report submitted successfully.</p>
            <button onClick={() => setShowModal(false)} style={styles.modalButton}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '5px',
    maxWidth: '700px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
  },
  heading: {
    fontSize: '28px',
    textAlign: 'center',
    marginBottom: '25px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '4px'
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#003366',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '30px 40px',
    borderRadius: '10px',
    textAlign: 'center',
    boxShadow: '0 6px 15px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px',
    width: '90%'
  },
  modalTitle: {
    fontSize: '22px',
    color: '#2e7d32',
    marginBottom: '10px'
  },
  modalMessage: {
    fontSize: '17px',
    color: '#555'
  },
  modalButton: {
    marginTop: '20px',
    padding: '10px 25px',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px'
  }
};

export default RecordForm;
