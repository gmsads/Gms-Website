import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ServiceForm = () => {
  const [activeView, setActiveView] = useState('vendors');
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    requirementType: '',
    vendorName: '',
    vendorPhone: '',
    supplierName: '',
    supplierContact: '',
    numberOfDays: 1,
    vehicleNumber: '',
    aadharNumber: '',
    dieselPaymentDays: 3,
    dieselAmount: '',
    rentAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    clientName: '',
    businessName: ''
  });

  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [currentVendorId, setCurrentVendorId] = useState(null);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [dieselAmounts, setDieselAmounts] = useState({});

  // Fetch all vendors
  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/service-requirements/vendors');
      if (response.data.success) {
        setVendors(response.data.vendors || []);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.requirementType) newErrors.requirementType = 'Requirement type is required';
    if (!formData.vendorName) newErrors.vendorName = 'Vendor name is required';
    if (!formData.vendorPhone) newErrors.vendorPhone = 'Vendor phone is required';
    if (!formData.vehicleNumber) newErrors.vehicleNumber = 'Vehicle number is required';
    if (!formData.aadharNumber) newErrors.aadharNumber = 'Aadhar number is required';
    if (!formData.rentAmount || parseFloat(formData.rentAmount) <= 0) newErrors.rentAmount = 'Valid rent amount is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.clientName) newErrors.clientName = 'Client name is required';
    if (!formData.businessName) newErrors.businessName = 'Business name is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Please fill all required fields correctly');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        requirementType: formData.requirementType,
        vendorName: formData.vendorName,
        vendorPhone: formData.vendorPhone,
        supplierName: formData.supplierName || '',
        supplierContact: formData.supplierContact || '',
        numberOfDays: parseInt(formData.numberOfDays),
        vehicleNumber: formData.vehicleNumber,
        aadharNumber: formData.aadharNumber,
        dieselPaymentDays: parseInt(formData.dieselPaymentDays),
        dieselAmount: parseFloat(formData.dieselAmount) || 0,
        rentAmount: parseFloat(formData.rentAmount),
        startDate: formData.startDate,
        clientName: formData.clientName,
        businessName: formData.businessName
      };

      let response;
      
      if (isEditing && currentVendorId) {
        response = await axios.put(`/api/service-requirements/${currentVendorId}`, submitData);
      } else {
        response = await axios.post('/api/service-requirements', submitData);
      }

      if (response.data.success) {
        alert(`Vendor ${isEditing ? 'updated' : 'added'} successfully!`);
        resetForm();
        await fetchVendors();
        setActiveView('vendors');
      } else {
        throw new Error(response.data.message || 'Failed to save vendor');
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      alert('Error saving vendor: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      requirementType: '',
      vendorName: '',
      vendorPhone: '',
      supplierName: '',
      supplierContact: '',
      numberOfDays: 1,
      vehicleNumber: '',
      aadharNumber: '',
      dieselPaymentDays: 3,
      dieselAmount: '',
      rentAmount: '',
      startDate: new Date().toISOString().split('T')[0],
      clientName: '',
      businessName: ''
    });
    setErrors({});
    setIsEditing(false);
    setCurrentVendorId(null);
  };

  const handleEditVendor = (vendor) => {
    setFormData({
      requirementType: vendor.requirementType || '',
      vendorName: vendor.vendorName || '',
      vendorPhone: vendor.vendorPhone || '',
      supplierName: vendor.supplierName || '',
      supplierContact: vendor.supplierContact || '',
      numberOfDays: vendor.numberOfDays || 1,
      vehicleNumber: vendor.vehicleNumber || '',
      aadharNumber: vendor.aadharCard?.number || '',
      dieselPaymentDays: vendor.dieselPaymentDays || 3,
      dieselAmount: vendor.dieselAmount?.toString() || '',
      rentAmount: vendor.rentAmount?.toString() || '',
      startDate: vendor.startDate ? new Date(vendor.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      clientName: vendor.clientName || '',
      businessName: vendor.businessName || ''
    });
    setIsEditing(true);
    setCurrentVendorId(vendor._id);
    setActiveView('form');
  };

  const handleAddNewVendor = () => {
    resetForm();
    setActiveView('form');
  };

  const calculatePaymentSummary = (vendor) => {
    const dieselPayments = vendor.paymentSchedules?.diesel || [];
    const rentPayments = vendor.paymentSchedules?.rent || [];

    const dieselTotal = dieselPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const dieselPaid = dieselPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    
    const rentTotal = rentPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const rentPaid = rentPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    return {
      diesel: { total: dieselTotal, paid: dieselPaid, pending: dieselTotal - dieselPaid },
      rent: { total: rentTotal, paid: rentPaid, pending: rentTotal - rentPaid }
    };
  };

  const handleRecordPayment = async (vendorId, paymentType, scheduleIndex, amount, status) => {
    try {
      const response = await axios.patch(`/api/service-requirements/${vendorId}/payment`, {
        paymentType,
        scheduleIndex: parseInt(scheduleIndex),
        status,
        amount: parseFloat(amount) || 0,
        notes: `Payment recorded as ${status}`
      });

      if (response.data.success) {
        alert('Payment recorded successfully!');
        await fetchVendors();
        const updatedVendor = response.data.data;
        setSelectedVendor(updatedVendor);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateDieselAmount = async (vendorId, amount) => {
    try {
      const response = await axios.patch(`/api/service-requirements/${vendorId}/diesel-amount`, {
        amount: parseFloat(amount) || 0
      });

      if (response.data.success) {
        await fetchVendors();
        const updatedVendor = response.data.data;
        setSelectedVendor(updatedVendor);
        alert('Diesel amount updated for all payments!');
      }
    } catch (error) {
      console.error('Error updating diesel amount:', error);
      alert('Error updating diesel amount: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdateIndividualDieselAmount = async (vendorId, scheduleIndex, amount) => {
    try {
      const response = await axios.patch(`/api/service-requirements/${vendorId}/diesel-payment-amount`, {
        scheduleIndex: parseInt(scheduleIndex),
        amount: parseFloat(amount) || 0
      });

      if (response.data.success) {
        await fetchVendors();
        const updatedVendor = response.data.data;
        setSelectedVendor(updatedVendor);
      }
    } catch (error) {
      console.error('Error updating diesel payment amount:', error);
      alert('Error updating diesel payment amount: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDieselAmountChange = (vendorId, index, amount) => {
    setDieselAmounts(prev => ({
      ...prev,
      [`${vendorId}-${index}`]: amount
    }));
  };

  const handleAmountChange = (paymentType, index, amount) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [`${paymentType}-${index}`]: amount
    }));
  };

  // Styles
  const styles = {
    container: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      margin: '20px 0',
      maxWidth: '1200px',
      marginLeft: 'auto',
      marginRight: 'auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      borderBottom: '2px solid #e1e5e9',
      paddingBottom: '20px',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1a202c',
      margin: '0 0 8px 0'
    },
    tabsContainer: {
      display: 'flex',
      marginBottom: '30px',
      borderBottom: '2px solid #e2e8f0'
    },
    tab: {
      padding: '12px 24px',
      border: 'none',
      background: 'none',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      color: '#718096',
      borderBottom: '3px solid transparent',
      transition: 'all 0.3s ease'
    },
    activeTab: {
      color: '#667eea',
      borderBottom: '3px solid #667eea'
    },
    vendorsContainer: {
      minHeight: '400px'
    },
    vendorsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      flexWrap: 'wrap',
      gap: '15px'
    },
    vendorsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: '24px',
      marginBottom: '30px'
    },
    vendorCard: {
      backgroundColor: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
      transition: 'all 0.3s ease',
      position: 'relative'
    },
    vendorCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
    },
    vendorHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    vendorName: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#2d3748',
      margin: '0'
    },
    vendorInfo: {
      color: '#718096',
      fontSize: '14px',
      lineHeight: '1.5'
    },
    paymentSummary: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      margin: '20px 0'
    },
    paymentItem: {
      padding: '16px',
      borderRadius: '8px',
      textAlign: 'center'
    },
    dieselPayment: {
      backgroundColor: '#f0fff4',
      border: '1px solid #9ae6b4'
    },
    rentPayment: {
      backgroundColor: '#f0f9ff',
      border: '1px solid #90cdf4'
    },
    paymentLabel: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#4a5568',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '8px'
    },
    paymentAmount: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#2d3748',
      marginBottom: '4px'
    },
    paymentPending: {
      fontSize: '12px',
      color: '#e53e3e',
      fontWeight: '600'
    },
    vendorActions: {
      display: 'flex',
      gap: '10px',
      marginTop: '20px'
    },
    statusBadge: {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    activeStatus: {
      backgroundColor: '#c6f6d5',
      color: '#22543d'
    },
    completedStatus: {
      backgroundColor: '#fed7d7',
      color: '#742a2a'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '30px'
    },
    formHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px'
    },
    formSection: {
      backgroundColor: '#f8fafc',
      padding: '24px',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#2d3748',
      margin: '0 0 20px 0'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
      marginBottom: '20px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontWeight: '600',
      color: '#4a5568',
      marginBottom: '8px',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
      backgroundColor: '#fff'
    },
    inputError: {
      border: '2px solid #e53e3e',
      backgroundColor: '#fef5f5'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: '#fff',
      cursor: 'pointer'
    },
    errorMessage: {
      color: '#e53e3e',
      fontSize: '14px',
      marginTop: '6px'
    },
    btn: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    btnPrimary: {
      backgroundColor: '#667eea',
      color: 'white'
    },
    btnSecondary: {
      backgroundColor: '#e2e8f0',
      color: '#4a5568'
    },
    btnSuccess: {
      backgroundColor: '#48bb78',
      color: 'white'
    },
    btnWarning: {
      backgroundColor: '#ed8936',
      color: 'white'
    },
    btnInfo: {
      backgroundColor: '#4299e1',
      color: 'white'
    },
    btnSm: {
      padding: '8px 16px',
      fontSize: '12px'
    },
    btnXs: {
      padding: '6px 12px',
      fontSize: '11px'
    },
    btnDisabled: {
      opacity: '0.6',
      cursor: 'not-allowed'
    },
    formActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '30px',
      paddingTop: '24px',
      borderTop: '2px solid #e2e8f0'
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid transparent',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: '#f7fafc',
      borderRadius: '12px',
      border: '2px dashed #cbd5e0'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      maxWidth: '1000px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e2e8f0'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#718096'
    },
    paymentTable: {
      width: '100%',
      borderCollapse: 'collapse',
      margin: '16px 0'
    },
    paymentTableHeader: {
      backgroundColor: '#edf2f7',
      padding: '12px',
      textAlign: 'left',
      border: '1px solid #e2e8f0',
      fontWeight: '600'
    },
    paymentTableCell: {
      padding: '12px',
      border: '1px solid #e2e8f0'
    },
    paymentActions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    paymentInput: {
      padding: '6px 8px',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      width: '80px'
    }
  };

  const VendorCard = ({ vendor }) => {
    const [isHovered, setIsHovered] = useState(false);
    const paymentSummary = calculatePaymentSummary(vendor);
    const isActive = vendor.endDate ? new Date(vendor.endDate) > new Date() : false;
    
    return (
      <div 
        style={{
          ...styles.vendorCard,
          ...(isHovered && styles.vendorCardHover)
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={styles.vendorHeader}>
          <h3 style={styles.vendorName}>{vendor.vendorName}</h3>
          <span style={{
            ...styles.statusBadge,
            ...(isActive ? styles.activeStatus : styles.completedStatus)
          }}>
            {isActive ? '🟢 Active' : '🔴 Completed'}
          </span>
        </div>
        
        <div style={styles.vendorInfo}>
          <p style={{ margin: '4px 0' }}><strong>📞 Phone:</strong> {vendor.vendorPhone}</p>
          {vendor.supplierName && (
            <p style={{ margin: '4px 0' }}><strong>🏢 Supplier:</strong> {vendor.supplierName} {vendor.supplierContact && `(${vendor.supplierContact})`}</p>
          )}
          <p style={{ margin: '4px 0' }}><strong>🚗 Vehicle:</strong> {vendor.vehicleNumber}</p>
          <p style={{ margin: '4px 0' }}><strong>📅 Period:</strong> {vendor.startDate ? new Date(vendor.startDate).toLocaleDateString() : 'N/A'} to {vendor.endDate ? new Date(vendor.endDate).toLocaleDateString() : 'N/A'}</p>
          <p style={{ margin: '4px 0' }}><strong>💰 Rent:</strong> ₹{vendor.rentAmount?.toFixed(2) || '0.00'}</p>
          <p style={{ margin: '4px 0' }}><strong>⛽ Diesel/Period:</strong> ₹{vendor.dieselAmount?.toFixed(2) || '0.00'} every {vendor.dieselPaymentDays} days</p>
          <p style={{ margin: '4px 0' }}><strong>🔧 Type:</strong> {vendor.requirementType?.replace('_', ' ').toUpperCase() || 'N/A'}</p>
        </div>

        <div style={styles.paymentSummary}>
          <div style={{...styles.paymentItem, ...styles.dieselPayment}}>
            <div style={styles.paymentLabel}>⛽ Diesel</div>
            <div style={styles.paymentAmount}>
              ₹{paymentSummary.diesel.paid.toFixed(2)} / ₹{paymentSummary.diesel.total.toFixed(2)}
            </div>
            <div style={styles.paymentPending}>
              Pending: ₹{paymentSummary.diesel.pending.toFixed(2)}
            </div>
          </div>
          
          <div style={{...styles.paymentItem, ...styles.rentPayment}}>
            <div style={styles.paymentLabel}>🏠 Rent</div>
            <div style={styles.paymentAmount}>
              ₹{paymentSummary.rent.paid.toFixed(2)} / ₹{paymentSummary.rent.total.toFixed(2)}
            </div>
            <div style={styles.paymentPending}>
              Pending: ₹{paymentSummary.rent.pending.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={styles.vendorActions}>
          <button 
            style={{
              ...styles.btn,
              ...styles.btnSm,
              ...styles.btnSecondary
            }}
            onClick={() => handleEditVendor(vendor)}
          >
            ✏️ Edit
          </button>
          <button 
            style={{
              ...styles.btn,
              ...styles.btnSm,
              ...styles.btnInfo
            }}
            onClick={() => setSelectedVendor(vendor)}
          >
            💰 Manage Payments
          </button>
        </div>
      </div>
    );
  };

  const PaymentTables = ({ vendor }) => {
    const dieselPayments = vendor.paymentSchedules?.diesel || [];
    const rentPayments = vendor.paymentSchedules?.rent || [];
    const [globalDieselAmount, setGlobalDieselAmount] = useState(vendor.dieselAmount || 0);

    const getStatusColor = (status) => {
      switch (status) {
        case 'paid': return '#10b981';
        case 'partial': return '#f59e0b';
        case 'balance': return '#8b5cf6';
        default: return '#ef4444';
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'paid': return 'PAID';
        case 'partial': return 'PARTIAL';
        case 'balance': return 'BALANCE';
        default: return 'PENDING';
      }
    };

    const handleGlobalDieselUpdate = async () => {
      await handleUpdateDieselAmount(vendor._id, globalDieselAmount);
    };

    return (
      <div>
        <div style={{marginBottom: '20px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #90cdf4'}}>
          <h4 style={{ margin: '0 0 12px 0', color: '#2d3748' }}>⛽ Set Diesel Amount for All Periods</h4>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="number"
              value={globalDieselAmount}
              onChange={(e) => setGlobalDieselAmount(e.target.value)}
              style={styles.input}
              placeholder="Enter diesel amount per period"
            />
            <button
              onClick={handleGlobalDieselUpdate}
              style={{
                ...styles.btn,
                ...styles.btnPrimary
              }}
            >
              Update All Periods
            </button>
          </div>
          <small style={{ color: '#718096', display: 'block', marginTop: '8px' }}>
            This will update the diesel amount for all payment periods
          </small>
        </div>

        <div style={{marginBottom: '20px'}}>
          <h4 style={{ color: '#4a5568', marginBottom: '16px' }}>
            ⛽ Diesel Payment Schedule (Every {vendor.dieselPaymentDays} days)
          </h4>
          
          {dieselPayments.length === 0 ? (
            <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>
              No diesel payments scheduled
            </p>
          ) : (
            <table style={styles.paymentTable}>
              <thead>
                <tr>
                  <th style={styles.paymentTableHeader}>Period</th>
                  <th style={styles.paymentTableHeader}>Date</th>
                  <th style={styles.paymentTableHeader}>Amount</th>
                  <th style={styles.paymentTableHeader}>Paid</th>
                  <th style={styles.paymentTableHeader}>Balance</th>
                  <th style={styles.paymentTableHeader}>Status</th>
                  <th style={styles.paymentTableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dieselPayments.map((payment, index) => (
                  <tr key={`diesel-${index}`}>
                    <td style={styles.paymentTableCell}>
                      <strong>{payment.period}</strong>
                    </td>
                    <td style={styles.paymentTableCell}>
                      {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={styles.paymentTableCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ₹
                        <input
                          type="number"
                          value={dieselAmounts[`${vendor._id}-${index}`] !== undefined ? dieselAmounts[`${vendor._id}-${index}`] : payment.amount || 0}
                          onChange={(e) => handleDieselAmountChange(vendor._id, index, e.target.value)}
                          onBlur={() => handleUpdateIndividualDieselAmount(vendor._id, index, dieselAmounts[`${vendor._id}-${index}`] || payment.amount)}
                          style={styles.paymentInput}
                          placeholder="Amount"
                        />
                      </div>
                    </td>
                    <td style={styles.paymentTableCell}>
                      ₹{payment.paidAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td style={styles.paymentTableCell}>
                      <strong style={{ 
                        color: payment.balanceAmount > 0 ? '#e53e3e' : '#10b981' 
                      }}>
                        ₹{payment.balanceAmount?.toFixed(2) || '0.00'}
                      </strong>
                    </td>
                    <td style={styles.paymentTableCell}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(payment.status),
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                    <td style={styles.paymentTableCell}>
                      <div style={styles.paymentActions}>
                        <input
                          type="number"
                          placeholder="Pay Amount"
                          value={paymentAmounts[`diesel-${index}`] || ''}
                          onChange={(e) => handleAmountChange('diesel', index, e.target.value)}
                          style={styles.paymentInput}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRecordPayment(
                                vendor._id, 
                                'diesel', 
                                index, 
                                paymentAmounts[`diesel-${index}`] || payment.amount, 
                                'paid'
                              );
                            }
                          }}
                        />
                        <button
                          onClick={() => handleRecordPayment(
                            vendor._id, 
                            'diesel', 
                            index, 
                            paymentAmounts[`diesel-${index}`] || payment.amount, 
                            'paid'
                          )}
                          style={{
                            ...styles.btn,
                            ...styles.btnXs,
                            ...styles.btnSuccess
                          }}
                        >
                          Full Paid
                        </button>
                        <button
                          onClick={() => handleRecordPayment(
                            vendor._id, 
                            'diesel', 
                            index, 
                            paymentAmounts[`diesel-${index}`] || payment.balanceAmount, 
                            'partial'
                          )}
                          style={{
                            ...styles.btn,
                            ...styles.btnXs,
                            ...styles.btnWarning
                          }}
                        >
                          Pay Balance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{marginBottom: '20px'}}>
          <h4 style={{ color: '#4a5568', marginBottom: '16px' }}>
            🏠 Rent Payment Schedule
          </h4>
          
          {rentPayments.length === 0 ? (
            <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>
              No rent payments scheduled
            </p>
          ) : (
            <table style={styles.paymentTable}>
              <thead>
                <tr>
                  <th style={styles.paymentTableHeader}>Payment #</th>
                  <th style={styles.paymentTableHeader}>Date</th>
                  <th style={styles.paymentTableHeader}>Amount</th>
                  <th style={styles.paymentTableHeader}>Paid</th>
                  <th style={styles.paymentTableHeader}>Balance</th>
                  <th style={styles.paymentTableHeader}>Status</th>
                  <th style={styles.paymentTableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rentPayments.map((payment, index) => (
                  <tr key={`rent-${index}`}>
                    <td style={styles.paymentTableCell}>
                      {index + 1}
                    </td>
                    <td style={styles.paymentTableCell}>
                      {payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={styles.paymentTableCell}>
                      ₹{payment.amount?.toFixed(2) || '0.00'}
                    </td>
                    <td style={styles.paymentTableCell}>
                      ₹{payment.paidAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td style={styles.paymentTableCell}>
                      <strong style={{ 
                        color: payment.balanceAmount > 0 ? '#e53e3e' : '#10b981' 
                      }}>
                        ₹{payment.balanceAmount?.toFixed(2) || '0.00'}
                      </strong>
                    </td>
                    <td style={styles.paymentTableCell}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: getStatusColor(payment.status),
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                    <td style={styles.paymentTableCell}>
                      <div style={styles.paymentActions}>
                        <input
                          type="number"
                          placeholder="Pay Amount"
                          value={paymentAmounts[`rent-${index}`] || ''}
                          onChange={(e) => handleAmountChange('rent', index, e.target.value)}
                          style={styles.paymentInput}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRecordPayment(
                                vendor._id, 
                                'rent', 
                                index, 
                                paymentAmounts[`rent-${index}`] || payment.amount, 
                                'paid'
                              );
                            }
                          }}
                        />
                        <button
                          onClick={() => handleRecordPayment(
                            vendor._id, 
                            'rent', 
                            index, 
                            paymentAmounts[`rent-${index}`] || payment.amount, 
                            'paid'
                          )}
                          style={{
                            ...styles.btn,
                            ...styles.btnXs,
                            ...styles.btnSuccess
                          }}
                        >
                          Full Paid
                        </button>
                        <button
                          onClick={() => handleRecordPayment(
                            vendor._id, 
                            'rent', 
                            index, 
                            paymentAmounts[`rent-${index}`] || payment.balanceAmount, 
                            'partial'
                          )}
                          style={{
                            ...styles.btn,
                            ...styles.btnXs,
                            ...styles.btnWarning
                          }}
                        >
                          Pay Balance
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderVendorsView = () => (
    <div style={styles.vendorsContainer}>
      <div style={styles.vendorsHeader}>
        <h2 style={{ margin: 0, color: '#2d3748' }}>Vendors Management</h2>
        <button 
          style={{
            ...styles.btn,
            ...styles.btnPrimary
          }}
          onClick={handleAddNewVendor}
        >
          ➕ Add New Vendor
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={styles.loadingSpinner}></div>
          <p style={{ color: '#718096', marginTop: '12px' }}>Loading vendors...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div style={styles.emptyState}>
          <h3 style={{ color: '#4a5568', marginBottom: '12px' }}>No Vendors Found</h3>
          <p style={{ color: '#718096', marginBottom: '24px' }}>
            Get started by adding your first vendor.
          </p>
          <button 
            style={{
              ...styles.btn,
              ...styles.btnPrimary
            }}
            onClick={handleAddNewVendor}
          >
            Add First Vendor
          </button>
        </div>
      ) : (
        <div style={styles.vendorsGrid}>
          {vendors.map(vendor => (
            <VendorCard key={vendor._id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );

  const renderFormView = () => (
    <div>
      <div style={styles.formHeader}>
        <h2 style={{ margin: 0, color: '#2d3748' }}>
          {isEditing ? 'Edit Vendor' : 'Add New Vendor'}
        </h2>
        <button 
          style={{
            ...styles.btn,
            ...styles.btnSecondary
          }}
          onClick={() => setActiveView('vendors')}
        >
          ← Back to Vendors
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Information Section */}
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>Basic Information</h3>
          
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Requirement Type <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <select
                name="requirementType"
                value={formData.requirementType}
                onChange={handleInputChange}
                style={{
                  ...styles.select,
                  ...(errors.requirementType && styles.inputError)
                }}
              >
                <option value="">Select Type</option>
                <option value="mobile_van">Mobile Van</option>
                <option value="tricycle">Tricycle</option>
              </select>
              {errors.requirementType && (
                <div style={styles.errorMessage}>{errors.requirementType}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Start Date <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                style={{
                  ...styles.input,
                  ...(errors.startDate && styles.inputError)
                }}
              />
              {errors.startDate && (
                <div style={styles.errorMessage}>{errors.startDate}</div>
              )}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Number of Days <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="number"
                name="numberOfDays"
                value={formData.numberOfDays}
                onChange={handleInputChange}
                min="1"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Diesel Payment Days <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="number"
                name="dieselPaymentDays"
                value={formData.dieselPaymentDays}
                onChange={handleInputChange}
                min="1"
                style={styles.input}
              />
              <small style={{color: '#718096', fontSize: '12px'}}>
                Frequency in days for diesel payments
              </small>
            </div>
          </div>
        </div>

        {/* Vendor Information Section */}
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>Vendor Information</h3>
          
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Vendor Name <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="text"
                name="vendorName"
                value={formData.vendorName}
                onChange={handleInputChange}
                placeholder="Enter vendor name"
                style={{
                  ...styles.input,
                  ...(errors.vendorName && styles.inputError)
                }}
              />
              {errors.vendorName && (
                <div style={styles.errorMessage}>{errors.vendorName}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Vendor Phone <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="tel"
                name="vendorPhone"
                value={formData.vendorPhone}
                onChange={handleInputChange}
                placeholder="Enter vendor phone number"
                style={{
                  ...styles.input,
                  ...(errors.vendorPhone && styles.inputError)
                }}
              />
              {errors.vendorPhone && (
                <div style={styles.errorMessage}>{errors.vendorPhone}</div>
              )}
            </div>
          </div>

          {/* Supplier Information */}
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Supplier Name</label>
              <input
                type="text"
                name="supplierName"
                value={formData.supplierName}
                onChange={handleInputChange}
                placeholder="Enter supplier name"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Supplier Contact</label>
              <input
                type="tel"
                name="supplierContact"
                value={formData.supplierContact}
                onChange={handleInputChange}
                placeholder="Enter supplier contact number"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Vehicle & Payment Information */}
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>Vehicle & Payment Details</h3>
          
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Vehicle Number <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleInputChange}
                placeholder="Enter vehicle number"
                style={{
                  ...styles.input,
                  ...(errors.vehicleNumber && styles.inputError)
                }}
              />
              {errors.vehicleNumber && (
                <div style={styles.errorMessage}>{errors.vehicleNumber}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Aadhar Number <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="text"
                name="aadharNumber"
                value={formData.aadharNumber}
                onChange={handleInputChange}
                placeholder="Enter Aadhar number"
                style={{
                  ...styles.input,
                  ...(errors.aadharNumber && styles.inputError)
                }}
              />
              {errors.aadharNumber && (
                <div style={styles.errorMessage}>{errors.aadharNumber}</div>
              )}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Rent Amount (₹) <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="number"
                name="rentAmount"
                value={formData.rentAmount}
                onChange={handleInputChange}
                placeholder="Enter rent amount"
                step="0.01"
                min="0"
                style={{
                  ...styles.input,
                  ...(errors.rentAmount && styles.inputError)
                }}
              />
              {errors.rentAmount && (
                <div style={styles.errorMessage}>{errors.rentAmount}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Diesel Amount (₹)</label>
              <input
                type="number"
                name="dieselAmount"
                value={formData.dieselAmount}
                onChange={handleInputChange}
                placeholder="Enter diesel amount per period"
                step="0.01"
                min="0"
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>Client Information</h3>
          
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Client Name <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                placeholder="Enter client name"
                style={{
                  ...styles.input,
                  ...(errors.clientName && styles.inputError)
                }}
              />
              {errors.clientName && (
                <div style={styles.errorMessage}>{errors.clientName}</div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Business Name <span style={{color: '#e53e3e'}}>*</span>
              </label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                placeholder="Enter business name"
                style={{
                  ...styles.input,
                  ...(errors.businessName && styles.inputError)
                }}
              />
              {errors.businessName && (
                <div style={styles.errorMessage}>{errors.businessName}</div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => setActiveView('vendors')}
            style={{
              ...styles.btn,
              ...styles.btnSecondary
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...(loading && styles.btnDisabled)
            }}
          >
            {loading && <div style={styles.loadingSpinner}></div>}
            {isEditing ? 'Update Vendor' : 'Add Vendor'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Service Requirements Management</h1>
        <p style={{color: '#718096', margin: 0}}>
          Manage vendors, vehicles, and payment schedules efficiently
        </p>
      </div>

      <div style={styles.tabsContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeView === 'vendors' && styles.activeTab)
          }}
          onClick={() => setActiveView('vendors')}
        >
          📋 Vendors List
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeView === 'form' && styles.activeTab)
          }}
          onClick={() => setActiveView('form')}
        >
          {isEditing ? '✏️ Edit Vendor' : '➕ Add Vendor'}
        </button>
      </div>

      {activeView === 'vendors' ? renderVendorsView() : renderFormView()}

      {selectedVendor && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={{margin: 0, color: '#2d3748'}}>
                Payment Management - {selectedVendor.vendorName}
              </h2>
              <button
                style={styles.closeBtn}
                onClick={() => setSelectedVendor(null)}
              >
                ×
              </button>
            </div>
            
            <PaymentTables vendor={selectedVendor} />
            
            <div style={{textAlign: 'right', marginTop: '24px'}}>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnSecondary
                }}
                onClick={() => setSelectedVendor(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default ServiceForm;