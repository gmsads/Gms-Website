import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Parties = () => {
  const [parties, setParties] = useState([]);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showEditParty, setShowEditParty] = useState(false);
  const [showViewParty, setShowViewParty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingParty, setEditingParty] = useState(null);
  const [viewingParty, setViewingParty] = useState(null);
  const [deletingParty, setDeletingParty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Categories defined directly in component
  const categories = [
    { id: 1, name: 'VIP' },
    { id: 2, name: 'Regular' },
    { id: 3, name: 'Wholesale' },
    { id: 4, name: 'Retail' },
    { id: 5, name: 'Corporate' }
  ];

  const accountTypes = ['Savings', 'Current', 'Salary', 'Fixed Deposit'];

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Fetch parties from backend
  const fetchParties = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/parties');
      setParties(response.data);
    } catch (error) {
      console.error('Error fetching parties:', error);
      showNotification('Cannot connect to backend server. Please make sure the server is running on port 5000.', 'error');
      setParties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleEditParty = (party) => {
    setEditingParty(party);
    setShowEditParty(true);
  };

  const handleViewParty = (party) => {
    setViewingParty(party);
    setShowViewParty(true);
  };

  const handleDeleteClick = (party) => {
    setDeletingParty(party);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingParty) return;
    
    setLoading(true);
    try {
      await axios.delete(`http://localhost:5000/api/parties/${deletingParty._id}`);
      setParties(prev => prev.filter(party => party._id !== deletingParty._id));
      showNotification(`Party "${deletingParty.partyName}" deleted successfully!`, 'success');
    } catch (error) {
      console.error('Error deleting party:', error);
      showNotification('Error deleting party. Please try again.', 'error');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeletingParty(null);
    }
  };

  const handlePartyCreated = (newParty) => {
    setParties(prev => [newParty, ...prev]);
    setShowCreateParty(false);
    showNotification('Party created successfully!', 'success');
  };

  const handlePartyUpdated = (updatedParty) => {
    setParties(prev => prev.map(party => 
      party._id === updatedParty._id ? updatedParty : party
    ));
    setShowEditParty(false);
    setEditingParty(null);
    showNotification('Party updated successfully!', 'success');
  };

  const filteredParties = parties.filter(party => 
    (selectedCategory === 'all' || party.partyCategory === selectedCategory) &&
    (searchTerm === '' || party.partyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Notification Component
  const NotificationPopup = () => {
    if (!notification.show) return null;

    const bgColor = notification.type === 'error' ? '#ef4444' : '#10b981';
    
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: bgColor,
        color: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '400px',
        animation: 'slideIn 0.3s ease-out'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {notification.type === 'error' ? '!' : '✓'}
        </div>
        <span style={{ fontSize: '14px', fontWeight: '500' }}>
          {notification.message}
        </span>
      </div>
    );
  };

  // Delete Confirmation Modal
  const DeleteConfirmationModal = () => {
    if (!showDeleteConfirm || !deletingParty) return null;

    return (
      <div style={{
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
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '30px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            border: '2px solid #ef4444'
          }}>
            <span style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>!</span>
          </div>
          
          <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '20px', fontWeight: '600' }}>
            Delete Party
          </h3>
          
          <p style={{ margin: '0 0 25px 0', color: '#64748b', lineHeight: '1.5' }}>
            Are you sure you want to delete <strong>"{deletingParty.partyName}"</strong>? This action cannot be undone.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                minWidth: '100px'
              }}
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletingParty(null);
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                minWidth: '100px'
              }}
              onClick={handleDeleteConfirm}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // View Party Modal
  const ViewPartyModal = () => {
    if (!showViewParty || !viewingParty) return null;

    return (
      <div style={{
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
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            borderRadius: '16px 16px 0 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                  {viewingParty.partyName}
                </h2>
                <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                  Party Details
                </p>
              </div>
              <button 
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer', 
                  color: 'white',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setShowViewParty(false)}
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                  Basic Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Party Type:</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{viewingParty.partyType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Category:</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{viewingParty.partyCategory || 'General'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Status:</span>
                    <span style={{ 
                      color: viewingParty.status === 'Active' ? '#059669' : '#ef4444', 
                      fontSize: '14px', 
                      fontWeight: '500',
                      background: viewingParty.status === 'Active' ? '#d1fae5' : '#fef2f2',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      {viewingParty.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                  Contact Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Mobile:</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{viewingParty.mobileNumber || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Email:</span>
                    <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{viewingParty.email || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Balance:</span>
                    <span style={{ color: '#059669', fontSize: '14px', fontWeight: '600' }}>₹ {viewingParty.openingBalance}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                Tax Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>GSTIN:</span>
                  <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                    {viewingParty.gstin || 'Not Provided'}
                  </div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>PAN:</span>
                  <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                    {viewingParty.panNumber || 'Not Provided'}
                  </div>
                </div>
              </div>
            </div>

            {viewingParty.billingAddress && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                  Billing Address
                </h4>
                <div style={{
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {viewingParty.billingAddress}
                </div>
              </div>
            )}

            {viewingParty.bankAccounts && viewingParty.bankAccounts.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                  Bank Accounts
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {viewingParty.bankAccounts.map((account, index) => (
                    <div key={index} style={{
                      padding: '16px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      position: 'relative'
                    }}>
                      {account.isPrimary && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: '#10b981',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          Primary
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Bank Name</span>
                          <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{account.bankName}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Account Number</span>
                          <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{account.accountNumber}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Account Holder</span>
                          <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{account.accountHolderName}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>IFSC Code</span>
                          <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>{account.ifscCode}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Account Type</span>
                          <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{account.accountType}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '12px' }}>Branch Name</span>
                          <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '500' }}>{account.branchName || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <button 
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
                onClick={() => {
                  setShowViewParty(false);
                  handleEditParty(viewingParty);
                }}
              >
                Edit Party
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Party Form Modal Component
  const PartyFormModal = ({ mode = 'create', party = null, onClose, onSuccess, categories }) => {
    const [formData, setFormData] = useState({
      partyName: '',
      mobileNumber: '',
      email: '',
      openingBalance: '0',
      balanceType: 'In Collect',
      partyType: 'Customer',
      partyCategory: '',
      billingAddress: '',
      shippingAddress: '',
      creditPeriod: '30',
      creditPeriodType: 'Days',
      creditLimit: '0',
      hdrCode: '',
      customerValue: '',
      gstin: '',
      panNumber: '',
      status: 'Active',
      notes: '',
      bankAccounts: [{
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        branchName: '',
        accountType: 'Savings',
        isPrimary: true
      }]
    });

    const [sameAsBilling, setSameAsBilling] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // Initialize form data when editing
    useEffect(() => {
      if (mode === 'edit' && party) {
        const partyData = {
          partyName: party.partyName || '',
          mobileNumber: party.mobileNumber || '',
          email: party.email || '',
          openingBalance: party.openingBalance || '0',
          balanceType: party.balanceType || 'In Collect',
          partyType: party.partyType || 'Customer',
          partyCategory: party.partyCategory || '',
          billingAddress: party.billingAddress || '',
          shippingAddress: party.shippingAddress || '',
          creditPeriod: party.creditPeriod || '30',
          creditPeriodType: party.creditPeriodType || 'Days',
          creditLimit: party.creditLimit || '0',
          hdrCode: party.hdrCode || '',
          customerValue: party.customerValue || '',
          gstin: party.gstin || '',
          panNumber: party.panNumber || '',
          status: party.status || 'Active',
          notes: party.notes || '',
          bankAccounts: party.bankAccounts?.length > 0 ? party.bankAccounts.map(acc => ({
            ...acc,
            isPrimary: acc.isPrimary || false
          })) : [{
            bankName: '',
            accountNumber: '',
            accountHolderName: '',
            ifscCode: '',
            branchName: '',
            accountType: 'Savings',
            isPrimary: true
          }]
        };
        
        setFormData(partyData);
        setSameAsBilling(party.billingAddress === party.shippingAddress && party.billingAddress !== '');
      }
    }, [mode, party]);

    const handleInputChange = useCallback((e) => {
      const { name, value } = e.target;
      
      let formattedValue = value;
      
      if (name === 'gstin') {
        formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
      } else if (name === 'panNumber') {
        formattedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      } else if (name === 'mobileNumber') {
        formattedValue = value.replace(/\D/g, '').slice(0, 10);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    }, []);

    const handleBankAccountChange = useCallback((index, field, value) => {
      setFormData(prev => {
        const updatedAccounts = [...prev.bankAccounts];
        updatedAccounts[index] = {
          ...updatedAccounts[index],
          [field]: value
        };
        
        if (field === 'isPrimary' && value === true) {
          updatedAccounts.forEach((account, i) => {
            if (i !== index) {
              updatedAccounts[i].isPrimary = false;
            }
          });
        }
        
        return {
          ...prev,
          bankAccounts: updatedAccounts
        };
      });
    }, []);

    const addBankAccount = useCallback(() => {
      setFormData(prev => ({
        ...prev,
        bankAccounts: [
          ...prev.bankAccounts,
          {
            bankName: '',
            accountNumber: '',
            accountHolderName: '',
            ifscCode: '',
            branchName: '',
            accountType: 'Savings',
            isPrimary: false
          }
        ]
      }));
    }, []);

    const removeBankAccount = useCallback((index) => {
      if (formData.bankAccounts.length === 1) return;
      
      setFormData(prev => {
        const updatedAccounts = prev.bankAccounts.filter((_, i) => i !== index);
        
        if (updatedAccounts.length > 0 && !updatedAccounts.some(acc => acc.isPrimary)) {
          updatedAccounts[0].isPrimary = true;
        }
        
        return {
          ...prev,
          bankAccounts: updatedAccounts
        };
      });
    }, [formData.bankAccounts.length]);

    const handleSameAsBillingChange = useCallback((e) => {
      const isChecked = e.target.checked;
      setSameAsBilling(isChecked);
      if (isChecked) {
        setFormData(prev => ({
          ...prev,
          shippingAddress: prev.billingAddress
        }));
      }
    }, []);

    useEffect(() => {
      if (sameAsBilling) {
        setFormData(prev => ({
          ...prev,
          shippingAddress: prev.billingAddress
        }));
      }
    }, [formData.billingAddress, sameAsBilling]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setFormLoading(true);
      
      try {
        let response;
        if (mode === 'create') {
          response = await axios.post('http://localhost:5000/api/parties', formData);
        } else {
          response = await axios.put(`http://localhost:5000/api/parties/${party._id}`, formData);
        }
        
        onSuccess(response.data);
      } catch (error) {
        console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} party:`, error);
        if (error.response?.data?.message) {
          showNotification(`Error: ${error.response.data.message}`, 'error');
        } else {
          showNotification('Cannot connect to server. Please make sure the backend is running on port 5000.', 'error');
        }
      } finally {
        setFormLoading(false);
      }
    };

    const modalStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      zIndex: 1000,
      padding: '20px',
      overflowY: 'auto'
    };

    const contentStyle = {
      background: 'white',
      borderRadius: '20px',
      width: '95%',
      maxWidth: '1000px',
      margin: '20px auto',
      boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.2)'
    };

    const headerStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 28px',
      borderBottom: '1px solid #f1f5f9',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '20px 20px 0 0'
    };

    const formStyle = {
      padding: '28px',
      maxHeight: '70vh',
      overflowY: 'auto'
    };

    return (
      <div style={modalStyle} onClick={onClose}>
        <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                {mode === 'create' ? 'Create New Party' : 'Edit Party'}
              </h2>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                {mode === 'create' ? 'Add a new business party to your system' : 'Update party information'}
              </p>
            </div>
            <button 
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                fontSize: '24px', 
                cursor: 'pointer', 
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={onClose}
              disabled={formLoading}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} style={formStyle}>
            {/* General Details */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>
                General Details
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Party Name *</label>
                  <input
                    type="text"
                    name="partyName"
                    value={formData.partyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name"
                    required
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Mobile Number</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    placeholder="Enter mobile number"
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Opening Balance</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        fontWeight: '600'
                      }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        name="openingBalance"
                        value={formData.openingBalance}
                        onChange={handleInputChange}
                        placeholder="0"
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                          paddingLeft: '25px'
                        }}
                      />
                    </div>
                    <select
                      name="balanceType"
                      value={formData.balanceType}
                      onChange={handleInputChange}
                      disabled={formLoading}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none',
                        width: '120px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option>In Collect</option>
                      <option>In Pay</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div style={{
              background: '#fffbeb',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #fbbf24',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#92400e', fontSize: '16px', fontWeight: '700' }}>
                Tax Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>GSTIN Number</label>
                  <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <input
                      type="text"
                      name="gstin"
                      value={formData.gstin}
                      onChange={handleInputChange}
                      placeholder="GSTIN0000USER.CK"
                      maxLength={15}
                      disabled={formLoading}
                      style={{
                        padding: '10px 12px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>PAN Number</label>
                  <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <input
                      type="text"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={handleInputChange}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      disabled={formLoading}
                      style={{
                        padding: '10px 12px',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Party Classification */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>
                Party Classification
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Party Type *</label>
                  <select
                    name="partyType"
                    value={formData.partyType}
                    onChange={handleInputChange}
                    required
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Party Category</label>
                  <select
                    name="partyCategory"
                    value={formData.partyCategory}
                    onChange={handleInputChange}
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>
                Address Information
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Billing Address</label>
                  <textarea
                    name="billingAddress"
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    placeholder="Enter billing address"
                    rows="3"
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{
                    marginBottom: '6px',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '14px'
                  }}>Shipping Address</label>
                  <textarea
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    placeholder="Enter shipping address"
                    rows="3"
                    disabled={formLoading || sameAsBilling}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: sameAsBilling ? '#f3f4f6' : 'white',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={handleSameAsBillingChange}
                      disabled={formLoading}
                      style={{ marginRight: '8px' }}
                    />
                    Same as billing address
                  </label>
                </div>
              </div>
            </div>

            {/* Bank Account Details */}
            <div style={{
              background: '#f0f9ff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #7dd3fc',
              marginBottom: '24px'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0369a1', fontSize: '16px', fontWeight: '700' }}>
                Bank Account Details
              </h3>
              
              {formData.bankAccounts.map((account, index) => (
                <div key={index} style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '2px solid #e0f2fe',
                  marginBottom: '16px',
                  position: 'relative'
                }}>
                  {account.isPrimary && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: '#10b981',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>Primary Account</div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '14px', fontWeight: '600' }}>
                      Bank Account {index + 1}
                    </h4>
                    {formData.bankAccounts.length > 1 && (
                      <button
                        type="button"
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                        onClick={() => removeBankAccount(index)}
                        disabled={formLoading}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{
                        marginBottom: '6px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>Bank Name *</label>
                      <input
                        type="text"
                        value={account.bankName}
                        onChange={(e) => handleBankAccountChange(index, 'bankName', e.target.value)}
                        placeholder="Enter bank name"
                        required
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{
                        marginBottom: '6px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>Account Number *</label>
                      <input
                        type="text"
                        value={account.accountNumber}
                        onChange={(e) => handleBankAccountChange(index, 'accountNumber', e.target.value)}
                        placeholder="Enter account number"
                        required
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{
                        marginBottom: '6px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>Account Holder Name *</label>
                      <input
                        type="text"
                        value={account.accountHolderName}
                        onChange={(e) => handleBankAccountChange(index, 'accountHolderName', e.target.value)}
                        placeholder="Enter account holder name"
                        required
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{
                        marginBottom: '6px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>IFSC Code *</label>
                      <input
                        type="text"
                        value={account.ifscCode}
                        onChange={(e) => handleBankAccountChange(index, 'ifscCode', e.target.value.toUpperCase())}
                        placeholder="Enter IFSC code"
                        required
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{
                        marginBottom: '6px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>Branch Name</label>
                      <input
                        type="text"
                        value={account.branchName}
                        onChange={(e) => handleBankAccountChange(index, 'branchName', e.target.value)}
                        placeholder="Enter branch name"
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{
                        marginBottom: '6px',
                        fontWeight: '600',
                        color: '#374151',
                        fontSize: '14px'
                      }}>Account Type</label>
                      <select
                        value={account.accountType}
                        onChange={(e) => handleBankAccountChange(index, 'accountType', e.target.value)}
                        disabled={formLoading}
                        style={{
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          outline: 'none',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        {accountTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '12px'
                  }}>
                    <input
                      type="checkbox"
                      checked={account.isPrimary}
                      onChange={(e) => handleBankAccountChange(index, 'isPrimary', e.target.checked)}
                      disabled={formLoading}
                    />
                    <label>Set as primary account</label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                style={{
                  background: 'transparent',
                  color: '#3b82f6',
                  border: '2px dashed #3b82f6',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
                onClick={addBankAccount}
                disabled={formLoading}
              >
                <span style={{ fontSize: '18px' }}>+</span>
                Add Another Bank Account
              </button>
            </div>

            {/* Credit Settings */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '700' }}>
                Credit Settings
              </h3>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'white',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ color: '#374151', fontWeight: '600', fontSize: '14px' }}>Credit Period:</span>
                  <input
                    type="number"
                    name="creditPeriod"
                    value={formData.creditPeriod}
                    onChange={handleInputChange}
                    placeholder="30"
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      width: '60px',
                      boxSizing: 'border-box',
                      textAlign: 'center'
                    }}
                  />
                  <select
                    name="creditPeriodType"
                    value={formData.creditPeriodType}
                    onChange={handleInputChange}
                    disabled={formLoading}
                    style={{
                      padding: '10px 12px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option>Days</option>
                    <option>Weeks</option>
                    <option>Months</option>
                  </select>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'white',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ color: '#374151', fontWeight: '600', fontSize: '14px' }}>Credit Limit:</span>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6b7280',
                      fontWeight: '600'
                    }}>
                      ₹
                    </span>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleInputChange}
                      placeholder="0"
                      disabled={formLoading}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        outline: 'none',
                        width: '100px',
                        boxSizing: 'border-box',
                        paddingLeft: '25px'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <button 
                type="button" 
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: formLoading ? 0.6 : 1
                }}
                onClick={onClose}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: formLoading ? 0.6 : 1
                }}
                disabled={formLoading}
              >
                {formLoading ? 'Processing...' : (mode === 'create' ? 'Create Party' : 'Update Party')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Styles
  const containerStyle = {
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px 24px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    color: 'white'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s ease',
    opacity: loading ? 0.6 : 1
  };

  const tableContainerStyle = {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  };

  const categoriesStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap'
  };

  const selectStyle = {
    padding: '10px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: 'white',
    outline: 'none',
    minWidth: '200px'
  };

  const searchInputStyle = {
    padding: '10px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    minWidth: '300px',
    outline: 'none'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'inherit'
  };

  const thStyle = {
    padding: '16px 20px',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px'
  };

  const tdStyle = {
    padding: '16px 20px',
    textAlign: 'left',
    borderBottom: '1px solid #f1f5f9',
    color: '#475569',
    fontSize: '14px'
  };

  const actionButtonStyle = {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    margin: '0 4px',
    transition: 'all 0.2s ease'
  };

  const viewButtonStyle = {
    ...actionButtonStyle,
    background: '#3b82f6',
    color: 'white'
  };

  const editButtonStyle = {
    ...actionButtonStyle,
    background: '#f59e0b',
    color: 'white'
  };

  const deleteButtonStyle = {
    ...actionButtonStyle,
    background: '#ef4444',
    color: 'white'
  };

  return (
    <div style={containerStyle}>
      {/* Notification Popup */}
      <NotificationPopup />

      {/* Header Section */}
      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>Parties Management</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
            Manage your business parties and customers
          </p>
        </div>
        <button 
          style={buttonStyle}
          onClick={() => setShowCreateParty(true)}
          disabled={loading}
        >
          + Create New Party
        </button>
      </div>

      {/* Search and Filter Section */}
      <div style={categoriesStyle}>
        <input
          type="text"
          placeholder="Search by party name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={searchInputStyle}
        />
        <select 
          style={selectStyle}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '14px' }}>
          Total: {filteredParties.length} parties
        </div>
      </div>

      {/* Parties List */}
      <div style={tableContainerStyle}>
        {loading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
            Loading parties...
          </div>
        )}
        
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Party Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Mobile</th>
                <th style={thStyle}> Party Type</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.map(party => (
                <tr key={party._id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: '600', color: '#1e293b' }}>
                      {party.partyName}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      background: '#f1f5f9',
                      color: '#475569'
                    }}>
                      {party.partyCategory || 'General'}
                    </span>
                  </td>
                  <td style={tdStyle}>{party.mobileNumber || '-'}</td>
                  <td style={tdStyle}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      background: '#dbeafe',
                      color: '#1e40af'
                    }}>
                      {party.partyType}
                    </span>
                  </td>
                  <td style={{...tdStyle, fontWeight: '600', color: '#059669'}}>
                    ₹ {party.openingBalance}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        style={viewButtonStyle}
                        onClick={() => handleViewParty(party)}
                        disabled={loading}
                      >
                        View
                      </button>
                      <button 
                        style={editButtonStyle}
                        onClick={() => handleEditParty(party)}
                        disabled={loading}
                      >
                        Edit
                      </button>
                      <button 
                        style={deleteButtonStyle}
                        onClick={() => handleDeleteClick(party)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredParties.length === 0 && !loading && (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#6b7280',
              fontSize: '16px'
            }}>
              No parties found. Create your first party!
            </div>
          )}
        </div>
      </div>

      {/* Create Party Modal */}
      {showCreateParty && (
        <PartyFormModal
          mode="create"
          onClose={() => setShowCreateParty(false)}
          onSuccess={handlePartyCreated}
          categories={categories}
        />
      )}

      {/* Edit Party Modal */}
      {showEditParty && (
        <PartyFormModal
          mode="edit"
          party={editingParty}
          onClose={() => {
            setShowEditParty(false);
            setEditingParty(null);
          }}
          onSuccess={handlePartyUpdated}
          categories={categories}
        />
      )}

      {/* View Party Modal */}
      <ViewPartyModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </div>
  );
};

export default Parties;