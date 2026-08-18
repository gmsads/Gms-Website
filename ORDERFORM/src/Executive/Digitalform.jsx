import React, { useState, useEffect } from 'react';

const DigitalMarketingOrderForm = () => {
  // Function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Function to get a date 30 days from today (default end date)
  const getDefaultEndDate = () => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 30);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    executiveName: '',
    orderDate: getTodayDate(),
    clientType: '',
    businessName: '',
    contactPerson: '',
    contactNumber: '',
    description: '',
    startDate: getTodayDate(),
    endDate: getDefaultEndDate(),
    advanceDate: getTodayDate(),
    paymentDate: '',
    advanceBalance: '',
    paymentMethod: 'cash',
    otherPaymentMethod: ''
  });

  const [requirementRows, setRequirementRows] = useState([
    { requirement: '', quantity: '', description: '', days: '', rate: '', total: '' }
  ]);

  const [reminder, setReminder] = useState({ text: '', date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const requirementOptions = [
    'Blog Articles',
    'Social Media Posts',
    'Video Content',
    'Paid Campaigns',
    'Lead Generation',
    'Engagements',
    'Google Ads',
    'Meta Ads',
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' }
  ];

  // Update start date when order date changes to be the same day
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      startDate: prev.orderDate
    }));
  }, [formData.orderDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRequirementChange = (index, field, value) => {
    const updatedRows = [...requirementRows];
    updatedRows[index][field] = value;
    
    if (field === 'rate' || field === 'quantity') {
      const rate = parseFloat(updatedRows[index].rate) || 0;
      const quantity = parseFloat(updatedRows[index].quantity) || 0;
      updatedRows[index].total = (rate * quantity).toFixed(2);
    }
    
    setRequirementRows(updatedRows);
  };

  const addRequirementRow = () => {
    setRequirementRows([...requirementRows, { requirement: '', quantity: '', description: '', days: '', rate: '', total: '' }]);
  };

  const removeRequirementRow = (index) => {
    if (requirementRows.length > 1) {
      const updatedRows = [...requirementRows];
      updatedRows.splice(index, 1);
      setRequirementRows(updatedRows);
    }
  };

  const calculateGrandTotal = () => {
    return requirementRows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0).toFixed(2);
  };

  const calculateBalanceDue = () => {
    const grandTotal = parseFloat(calculateGrandTotal()) || 0;
    const advanceBalance = parseFloat(formData.advanceBalance) || 0;
    return (grandTotal - advanceBalance).toFixed(2);
  };

  const submitOrderToBackend = async (orderData) => {
    try {
      const response = await fetch('http://localhost:5000/api/Digital', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit order');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting order:', error);
      throw new Error(error.message || 'Failed to connect to the server. Please try again later.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitSuccess(false);
    setSubmitError('');

    try {
      const orderData = {
        ...formData,
        requirements: requirementRows.map(row => ({
          ...row,
          quantity: parseFloat(row.quantity) || 0,
          rate: parseFloat(row.rate) || 0,
          total: parseFloat(row.total) || 0
        })),
        grandTotal: parseFloat(calculateGrandTotal()),
        balanceDue: parseFloat(calculateBalanceDue()),
        reminder: reminder,
        paymentDetails: {
          method: formData.paymentMethod,
          details: formData.paymentMethod === 'other' ? formData.otherPaymentMethod : ''
        }
      };

      const response = await submitOrderToBackend(orderData);
      
      console.log('Order submitted:', response);
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setFormData({
        executiveName: '',
        orderDate: getTodayDate(),
        clientType: '',
        businessName: '',
        contactPerson: '',
        contactNumber: '',
        description: '',
        startDate: getTodayDate(),
        endDate: getDefaultEndDate(),
        advanceDate: getTodayDate(),
        paymentDate: '',
        advanceBalance: '',
        paymentMethod: 'cash',
        otherPaymentMethod: ''
      });
      setRequirementRows([{ requirement: '', quantity: '', description: '', days: '', rate: '', total: '' }]);
      setReminder({ text: '', date: '' });
      
    } catch (error) {
      console.error('Error:', error);
      setSubmitError(error.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = {
    pageContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
      padding: '20px 10px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '25px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(4px)',
    },
    heading: {
      textAlign: 'left',
      marginBottom: '20px',
      color: '#2c3e50',
      fontSize: '22px',
      fontWeight: '700',
      position: 'relative',
      paddingBottom: '10px',
      background: 'linear-gradient(90deg, #3498db, #9b59b6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    headingAfter: {
      content: '""',
      position: 'absolute',
      bottom: '0',
      left: '0',
      width: '60px',
      height: '3px',
      background: 'linear-gradient(90deg, #3498db, #9b59b6)',
      borderRadius: '2px',
    },
    sectionHeading: {
      textAlign: 'left',
      margin: '15px 0 8px 0',
      color: '#2c3e50',
      fontSize: '16px',
      fontWeight: '600',
      position: 'relative',
      paddingBottom: '8px',
      background: 'linear-gradient(90deg, #3498db, #9b59b6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    sectionHeadingAfter: {
      content: '""',
      position: 'absolute',
      bottom: '0',
      left: '0',
      width: '60px',
      height: '3px',
      background: 'linear-gradient(90deg, #3498db, #9b59b6)',
      borderRadius: '2px',
    },
    formRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '15px',
      flexWrap: 'wrap',
      marginBottom: '12px',
    },
    column: {
      flex: '1',
      minWidth: '280px',
    },
    formGroup: {
      marginBottom: '8px',
      position: 'relative',
      width: '100%',
    },
    label: {
      fontWeight: '800',
      marginBottom: '2px',
      display: 'block',
      fontSize: '14px',
      color: '#555',
      textAlign: 'left',
      paddingLeft: '2px',
      letterSpacing: '0.3px',
    },
    input: {
      width: '100%',
      padding: '5px 7px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '12px',
      boxSizing: 'border-box',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      marginTop: '0',
    },
    textarea: {
      width: '100%',
      padding: '8px 10px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '12px',
      height: '80px',
      resize: 'vertical',
      boxSizing: 'border-box',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    select: {
      width: '100%',
      padding: '6px 8px',
      borderRadius: '4px',
      border: '1px solid #ddd',
      fontSize: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      height: '32px',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center',
      backgroundSize: '10px auto',
    },
    button: {
      padding: '10px 20px',
      background: 'linear-gradient(90deg, #3498db, #9b59b6)',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      marginTop: '25px',
      boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    table: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '0',
      marginBottom: '15px',
      borderRadius: '6px',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    },
    tableHeader: {
      background: 'linear-gradient(90deg, #3498db, #9b59b6)',
      color: 'white',
      border: 'none',
      padding: '14px',
      textAlign: 'left',
      fontWeight: '600',
      fontSize: '14px',
    },
    tableCell: {
      border: '1px solid #e0e0e0',
      padding: '10px',
      backgroundColor: 'white',
    },
    addButton: {
      padding: '8px 12px',
      background: 'linear-gradient(90deg, #2ecc71, #27ae60)',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    removeButton: {
      padding: '10px 16px',
      background: 'linear-gradient(90deg, #e74c3c, #c0392b)',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    dateRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '25px',
    },
    dateGroup: {
      flex: '1',
    },
    totalSection: {
      background: 'linear-gradient(90deg, #f8f9fa, #e9ecef)',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '25px',
      textAlign: 'right',
      fontWeight: '700',
      fontSize: '18px',
      color: '#2c3e50',
      border: '1px solid #e0e0e0',
      boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    paymentSection: {
      background: 'linear-gradient(90deg, #f0f7ff, #e0f0ff)',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '25px',
      border: '1px solid #d0e3ff',
    },
    paymentRow: {
      display: 'flex',
      gap: '20px',
      marginBottom: '15px',
      flexWrap: 'wrap',
    },
    paymentGroup: {
      flex: '1',
      minWidth: '200px',
    },
    decorativeElement: {
      position: 'absolute',
      width: '300px',
      height: '300px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
      zIndex: '-1',
    },
    decorativeElement1: {
      top: '-100px',
      right: '-100px',
    },
    decorativeElement2: {
      bottom: '-100px',
      left: '-100px',
    },
    reminderRow: {
      display: 'flex',
      gap: '10px',
      marginBottom: '8px',
    },
    reminderDateInput: {
      flex: '1',
      minWidth: '120px',
    },
    reminderSection: {
      background: 'linear-gradient(90deg, #fff9f0, #fff3e0)',
      padding: '10px',
      borderRadius: '6px',
      marginBottom: '15px',
      border: '1px solid #ffe0b2',
    },
    reminderTextarea: {
      width: '100%',
      padding: '6px',
      borderRadius: '4px',
      border: '1px solid #ffcc80',
      fontSize: '12px',
      minHeight: '40px',
      resize: 'vertical',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    successMessage: {
      color: '#2ecc71',
      margin: '10px 0',
      fontWeight: '600',
    },
    errorMessage: {
      color: '#e74c3c',
      margin: '10px 0',
      fontWeight: '600',
    },
    disabledButton: {
      opacity: 0.7,
      cursor: 'not-allowed',
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.container}>
        <div style={{...styles.decorativeElement, ...styles.decorativeElement1}}></div>
        <div style={{...styles.decorativeElement, ...styles.decorativeElement2}}></div>
        
        <h2 style={styles.heading}>
          Digital Marketing Order Form
          <span style={styles.headingAfter}></span>
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            <div style={styles.column}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Executive Name:</label>
                <input 
                  type="text" 
                  name="executiveName" 
                  value={formData.executiveName} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Order Date:</label>
                <input 
                  type="date" 
                  name="orderDate" 
                  value={formData.orderDate} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Client Type:</label>
                <select 
                  name="clientType" 
                  value={formData.clientType} 
                  onChange={handleChange} 
                  style={styles.select}
                >
                  <option value="">Select Client Type</option>
                  <option value="New">New</option>
                  <option value="Existing">Existing</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
            </div>

            <div style={styles.column}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Business Name:</label>
                <input 
                  type="text" 
                  name="businessName" 
                  value={formData.businessName} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Person:</label>
                <input 
                  type="text" 
                  name="contactPerson" 
                  value={formData.contactPerson} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Number:</label>
                <input 
                  type="tel" 
                  name="contactNumber" 
                  value={formData.contactNumber} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          <h3 style={styles.sectionHeading}>
            Requirements
            <span style={styles.sectionHeadingAfter}></span>
          </h3>
          
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Requirement</th>
                <th style={styles.tableHeader}>Description</th>
                <th style={styles.tableHeader}>Quantity</th>
                <th style={styles.tableHeader}>Days</th>
                <th style={styles.tableHeader}>Rate (₹)</th>
                <th style={styles.tableHeader}>Total (₹)</th>
                <th style={styles.tableHeader}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requirementRows.map((row, index) => (
                <tr key={index}>
                  <td style={styles.tableCell}>
                    <select
                      value={row.requirement}
                      onChange={(e) => handleRequirementChange(index, 'requirement', e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Select Requirement</option>
                      {requirementOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handleRequirementChange(index, 'description', e.target.value)}
                      style={styles.input}
                    />
                  </td> 
                  <td style={styles.tableCell}>
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={(e) => handleRequirementChange(index, 'quantity', e.target.value)}
                      style={styles.input}
                      min="1"
                      step="1"
                    />
                   </td>
                  <td style={styles.tableCell}>
                    <input
                      type="text"
                      value={row.days}
                      onChange={(e) => handleRequirementChange(index, 'days', e.target.value)}
                      style={styles.input}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="number"
                      value={row.rate}
                      onChange={(e) => handleRequirementChange(index, 'rate', e.target.value)}
                      style={styles.input}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <input
                      type="text"
                      value={row.total}
                      readOnly
                      style={{ ...styles.input, backgroundColor: '#f8f9fa' }}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      type="button"
                      onClick={() => removeRequirementRow(index)}
                      style={styles.removeButton}
                      disabled={requirementRows.length <= 1}
                    >
                      ✕ 
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button 
            type="button" 
            onClick={addRequirementRow} 
            style={styles.addButton}
          >
            ➕ Add Requirement
          </button>

          <div style={styles.totalSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...styles.label, marginBottom: 0, fontSize: '12px', fontWeight: '600' }}>Grand Total:</label>
              <div>₹{calculateGrandTotal()}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...styles.label, marginBottom: 0, fontSize: '12px', fontWeight: '600' }}>Advance Balance:</label>
              <div>₹{formData.advanceBalance || '0.00'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...styles.label, marginBottom: 0, fontSize: '14px', fontWeight: '700', color: '#e74c3c' }}>Balance Due:</label>
              <div style={{ fontSize: '20px', color: '#e74c3c', fontWeight: '700' }}>₹{calculateBalanceDue()}</div>
            </div>
          </div> 

          <div style={styles.paymentSection}>
            <h3 style={styles.sectionHeading}>
              Payment Information
              <span style={styles.sectionHeadingAfter}></span>
            </h3>
            
            <div style={styles.paymentRow}>
              <div style={styles.paymentGroup}>
                <label style={styles.label}>Advance Date:</label>
                <input 
                  type="date" 
                  name="advanceDate" 
                  value={formData.advanceDate} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>
              
              <div style={styles.paymentGroup}>
                <label style={styles.label}>Payment Date:</label>
                <input 
                  type="date" 
                  name="paymentDate" 
                  value={formData.paymentDate} 
                  onChange={handleChange} 
                  style={styles.input}
                />
              </div>
              
              <div style={styles.paymentGroup}>
                <label style={styles.label}>Advance Amount:</label>
                <input 
                  type="number" 
                  name="advanceBalance" 
                  value={formData.advanceBalance} 
                  onChange={handleChange} 
                  style={styles.input}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div style={styles.paymentRow}>
              <div style={styles.paymentGroup}>
                <label style={styles.label}>Payment Method:</label>
                <select 
                  name="paymentMethod" 
                  value={formData.paymentMethod} 
                  onChange={handleChange} 
                  style={styles.select}
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
              
              {formData.paymentMethod === 'other' && (
                <div style={styles.paymentGroup}>
                  <label style={styles.label}>Specify Method:</label>
                  <input 
                    type="text" 
                    name="otherPaymentMethod" 
                    value={formData.otherPaymentMethod} 
                    onChange={handleChange} 
                    style={styles.input}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={styles.dateRow}>
            <div style={styles.dateGroup}>
              <label style={styles.label}>Start Date:</label>
              <input 
                type="date" 
                name="startDate" 
                value={formData.startDate} 
                onChange={handleChange} 
                style={styles.input}
              />
            </div>
            <div style={styles.dateGroup}>
              <label style={styles.label}>End Date:</label>
              <input 
                type="date" 
                name="endDate" 
                value={formData.endDate} 
                onChange={handleChange} 
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.reminderSection}>
            <div style={styles.reminderRow}>
              <div style={{...styles.formGroup, ...styles.reminderDateInput}}>
                <label style={{...styles.label, fontSize: '12px', marginBottom: '2px'}}>Reminder:</label>
                <input 
                  type="date" 
                  value={reminder.date}
                  onChange={(e) => setReminder({...reminder, date: e.target.value})}
                  style={{...styles.input, padding: '4px 6px', height: '30px'}}
                />
              </div>
            </div>
            <textarea
              value={reminder.text}
              onChange={(e) => setReminder({...reminder, text: e.target.value})}
              placeholder="Reminder notes..."
              style={styles.reminderTextarea}
            />
          </div>

          {submitSuccess && (
            <div style={styles.successMessage}>
              Order submitted successfully!
            </div>
          )}
          {submitError && (
            <div style={styles.errorMessage}>
              {submitError}
            </div>
          )}

          <button 
            type="submit" 
            style={{...styles.button, ...(isSubmitting ? styles.disabledButton : {})}}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DigitalMarketingOrderForm;