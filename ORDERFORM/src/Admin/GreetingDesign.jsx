/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'; // Your backend URL

const GreetingDesignDashboard = ({ userRole }) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccasion, setSelectedOccasion] = useState('all');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [fetchingClients, setFetchingClients] = useState(false);

  useEffect(() => {
    fetchDesigns();
    // Don't auto-fetch clients - let user click button
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ FETCH CLIENTS FROM /api/orders ============
  const fetchClientsFromOrders = async () => {
    try {
      setFetchingClients(true);
      setMessage('');
      
      console.log('📞 Fetching clients from orders:', `${API_BASE_URL}/orders`);
      
      const response = await axios.get(`${API_BASE_URL}/orders`);
      console.log('📦 Orders response:', response.data);
      
      let orders = [];
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        orders = response.data;
      } else if (response.data?.orders && Array.isArray(response.data.orders)) {
        orders = response.data.orders;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        orders = response.data.data;
      }
      
      console.log(`📊 Total orders fetched: ${orders.length}`);
      
      // Extract unique clients from orders - USING YOUR SCHEMA FIELDS
      const clientMap = new Map();
      
      orders.forEach(order => {
        // Skip trashed orders
        if (order.isTrashed) return;
        
        // YOUR EXACT SCHEMA FIELDS - DO NOT CHANGE
        const phone = order.phone;           // Phone number field
        const name = order.contactPerson;     // Client name field
        const business = order.business;      // Business name field
        const location = order.location;      // Location field
        const orderNo = order.orderNo;        // Order number
        const orderDate = order.orderDate;    // Order date
        const total = order.total || order.discountedTotal || 0; // Order total
        
        // Only process if phone exists
        if (phone) {
          // Clean phone number - remove all non-digits
          const cleanPhone = phone.toString().replace(/\D/g, '');
          
          // Only add if valid phone number (at least 10 digits)
          if (cleanPhone && cleanPhone.length >= 10) {
            const phoneKey = cleanPhone.slice(-10); // Last 10 digits as unique key
            
            if (!clientMap.has(phoneKey)) {
              // New client
              clientMap.set(phoneKey, {
                _id: `client-${phoneKey}`,
                name: name || 'Valued Customer',
                phone: cleanPhone,
                phoneDisplay: cleanPhone.slice(-10),
                businessName: business || '',
                location: location || '',
                totalOrders: 1,
                totalSpent: total || 0,
                lastOrderNo: orderNo || '',
                lastOrderDate: orderDate || null
              });
            } else {
              // Update existing client
              const client = clientMap.get(phoneKey);
              client.totalOrders += 1;
              client.totalSpent += total || 0;
              
              // Update last order if this order is newer
              if (orderDate && (!client.lastOrderDate || new Date(orderDate) > new Date(client.lastOrderDate))) {
                client.lastOrderDate = orderDate;
                client.lastOrderNo = orderNo || client.lastOrderNo;
              }
            }
          }
        }
      });
      
      const clientsList = Array.from(clientMap.values());
      
      // Sort by total spent (highest first)
      clientsList.sort((a, b) => b.totalSpent - a.totalSpent);
      
      console.log(`✅ Successfully extracted ${clientsList.length} clients with phone numbers`);
      
      setClients(clientsList);
      
      if (clientsList.length > 0) {
        showMessage(`📱 Found ${clientsList.length} clients with valid phone numbers`, 'success');
      } else {
        showMessage('No clients with valid phone numbers found in orders', 'warning');
      }
      
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      
      if (error.response) {
        showMessage(`Error: ${error.response.status} - ${error.response.data?.error || 'Failed to fetch orders'}`, 'error');
      } else if (error.request) {
        showMessage('Cannot connect to server. Is backend running?', 'error');
      } else {
        showMessage(`Error: ${error.message}`, 'error');
      }
      
      setClients([]);
    } finally {
      setFetchingClients(false);
    }
  };

  // ============ FORMAT PHONE NUMBER FOR WHATSAPP ============
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Format for India (+91)
    if (cleaned.length === 10) {
      return '91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '91' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    } else if (cleaned.length > 12) {
      return cleaned.slice(-12);
    }
    
    return cleaned;
  };

  // ============ CREATE WHATSAPP MESSAGE ============
  const createWhatsAppMessage = (client, design) => {
    const date = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    let message = `🎉 *${design.title || design.occasion} Greetings!* 🎉\n\n`;
    message += `Dear ${client.name},\n\n`;
    
    if (client.businessName) {
      message += `Wishing you and the entire team at *${client.businessName}* `;
    } else {
      message += `Wishing you `;
    }
    
    message += `a very Happy ${design.occasion}! 🎊\n\n`;
    
    if (design.description) {
      message += `✨ *${design.description}*\n\n`;
    }
    
    // Add order summary
    message += `📊 *Your Business Summary:*\n`;
    message += `└─ Total Orders: ${client.totalOrders || 1}\n`;
    if (client.lastOrderNo) {
      message += `└─ Last Order: #${client.lastOrderNo}\n`;
    }
    if (client.totalSpent > 0) {
      message += `└─ Total Value: ₹${client.totalSpent.toLocaleString()}\n`;
    }
    message += `\n`;
    
    message += `Thank you for your continued trust and partnership! 🙏\n\n`;
    message += `*Design:* ${design.title || design.occasion}\n`;
    message += `${design.imageUrl}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `Warm regards,\n`;
    message += `${localStorage.getItem('userName') || 'Team'} 🚀\n`;
    message += `${date}`;
    
    return message;
  };

  // ============ SEND WHATSAPP ============
  const sendWhatsApp = (client, design) => {
    const phone = formatPhoneForWhatsApp(client.phone);
    if (!phone) {
      showMessage(`Invalid phone number for ${client.name}`, 'error');
      return false;
    }
    
    const message = createWhatsAppMessage(client, design);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    return true;
  };

  // ============ SEND BULK WHATSAPP ============
  const sendBulkWhatsApp = async () => {
    if (selectedClients.length === 0) {
      showMessage('Please select at least one client', 'warning');
      return;
    }

    setSending(true);
    
    try {
      const selectedClientsList = clients.filter(c => selectedClients.includes(c._id));
      let successCount = 0;
      
      for (let i = 0; i < selectedClientsList.length; i++) {
        const client = selectedClientsList[i];
        const success = sendWhatsApp(client, selectedDesign);
        if (success) successCount++;
        
        // Delay between opens to avoid rate limiting
        if (i < selectedClientsList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      showMessage(`✅ WhatsApp opened for ${successCount} of ${selectedClientsList.length} clients`, 'success');
      setShowSendModal(false);
      setSelectedClients([]);
      
    } catch (error) {
      console.error('Error sending:', error);
      showMessage('Error sending WhatsApp messages', 'error');
    } finally {
      setSending(false);
    }
  };

  // ============ FETCH DESIGNS ============
  const fetchDesigns = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from API if available
      try {
        const response = await axios.get(`${API_BASE_URL}/greetings/designs`);
        if (response.data.success) {
          setDesigns(response.data.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Using mock designs');
      }
      
      // Mock designs
      setDesigns([
        {
          _id: '1',
          title: 'Diwali 2024',
          occasion: 'Diwali',
          description: 'Wishing you a prosperous and joyful Diwali!',
          imageUrl: 'https://images.pexels.com/photos/5425152/pexels-photo-5425152.jpeg',
          isActive: true,
          uploaderName: 'Admin',
          sentCount: { total: 45 }
        },
        {
          _id: '2',
          title: 'Happy New Year 2025',
          occasion: 'New Year',
          description: 'Wishing you a year filled with success!',
          imageUrl: 'https://images.pexels.com/photos/3151916/pexels-photo-3151916.jpeg',
          isActive: true,
          uploaderName: 'Admin',
          sentCount: { total: 32 }
        },
        {
          _id: '3',
          title: 'Christmas Greetings',
          occasion: 'Christmas',
          description: 'May your Christmas be filled with joy!',
          imageUrl: 'https://images.pexels.com/photos/688660/pexels-photo-688660.jpeg',
          isActive: true,
          uploaderName: 'Designer',
          sentCount: { total: 18 }
        }
      ]);
      
    } catch (error) {
      console.error('Error:', error);
      showMessage('Error loading designs', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============ UI HELPERS ============
  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };
  const handleSendDesign = (design) => {
    setSelectedDesign(design);
    setSelectedClients([]);
    setClientSearch('');
    setShowSendModal(true);
  };

  const handleClientSelect = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredClients.map(c => c._id));
    }
  };

  // Filter clients by search
  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(clientSearch.toLowerCase()) ||
    (c.phoneDisplay || '').includes(clientSearch) ||
    (c.businessName?.toLowerCase() || '').includes(clientSearch.toLowerCase()) ||
    (c.lastOrderNo?.toLowerCase() || '').includes(clientSearch.toLowerCase())
  );

  // Filter designs by occasion
  const occasions = ['all', ...new Set(designs.map(d => d.occasion).filter(Boolean))];
  const filteredDesigns = selectedOccasion === 'all' 
    ? designs 
    : designs.filter(d => d.occasion === selectedOccasion);

  // Stats
  const totalDesigns = designs.length;
  const activeDesigns = designs.filter(d => d.isActive).length;
  const totalSent = designs.reduce((acc, d) => acc + (d.sentCount?.total || 0), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Message Toast */}
      {message && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          padding: '15px 25px',
          background: messageType === 'success' ? '#10b981' : 
                     messageType === 'warning' ? '#f59e0b' : '#ef4444',
          color: 'white', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 9999, animation: 'slideIn 0.3s ease'
        }}>
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px', marginBottom: '30px'
      }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎨</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', opacity: '0.9' }}>Total Designs</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{totalDesigns}</p>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', opacity: '0.9' }}>Active</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{activeDesigns}</p>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📤</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', opacity: '0.9' }}>Total Sent</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{totalSent}</p>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📱</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', opacity: '0.9' }}>Clients</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{clients.length}</p>
        </div>
      </div>

      {/* Main Action Button - FETCH CLIENTS FROM ORDERS */}
      <div style={{
        background: 'white', padding: '30px', borderRadius: '16px',
        marginBottom: '30px', textAlign: 'center',
        border: '2px dashed #3b82f6', boxShadow: '0 4px 12px rgba(59,130,246,0.1)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📞</div>
        <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>
          Step 1: Load Clients from Your Orders
        </h2>
        <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>
          Click the button below to fetch all clients with phone numbers from your orders
        </p>
        <button
          onClick={fetchClientsFromOrders}
          disabled={fetchingClients}
          style={{
            padding: '16px 40px',
            background: fetchingClients ? '#94a3b8' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '600',
            cursor: fetchingClients ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ 
            display: 'inline-block',
            animation: fetchingClients ? 'spin 1s linear infinite' : 'none'
          }}>
            {fetchingClients ? '⏳' : '📥'}
          </span>
          {fetchingClients ? 'Fetching Orders...' : '📱 Get Clients from Orders API'}
        </button>
        
        {clients.length > 0 && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px' }}>
            <span style={{ fontWeight: '600', color: '#0369a1' }}>
              ✅ {clients.length} clients with valid phone numbers loaded from your orders
            </span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      {clients.length > 0 && (
        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '600', color: '#1e293b' }}>Filter:</span>
            <select
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              style={{
                padding: '10px 16px', border: '1px solid #e2e8f0',
                borderRadius: '8px', fontSize: '14px', minWidth: '200px'
              }}
            >
              {occasions.map(occ => (
                <option key={occ} value={occ}>
                  {occ === 'all' ? '🎯 All Occasions' : occ}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={fetchDesigns}
            style={{
              padding: '10px 20px', background: 'white', color: '#475569',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto'
            }}
          >
            <span>🔄</span> Refresh Designs
          </button>
        </div>
      )}

      {/* Designs Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>⏳</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Loading Designs...</h3>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>🎨</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>No Designs Found</h3>
          <p style={{ margin: 0, color: '#64748b' }}>
            {selectedOccasion === 'all' 
              ? 'Upload your first greeting design to get started'
              : `No designs found for ${selectedOccasion}`
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {filteredDesigns.map(design => (
            <div key={design._id} style={{
              background: 'white', borderRadius: '16px', overflow: 'hidden',
              border: `1px solid ${design.isActive ? '#e2e8f0' : '#fecaca'}`,
              opacity: design.isActive ? 1 : 0.8
            }}>
              <div style={{ position: 'relative', height: '220px', background: '#f1f5f9' }}>
                <img src={design.imageUrl} alt={design.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  <span style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                    {design.occasion}
                  </span>
                </div>
                {!design.isActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px', fontWeight: '600' }}>
                    ⏸ Inactive
                  </div>
                )}
              </div>
              
              <div style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '600' }}>
                  {design.title || design.occasion}
                </h4>
                
                {design.description && (
                  <p style={{ margin: '0 0 15px 0', color: '#475569', fontSize: '14px' }}>
                    {design.description}
                  </p>
                )}

                <button
                  onClick={() => handleSendDesign(design)}
                  disabled={!design.isActive || clients.length === 0}
                  style={{
                    width: '100%', padding: '12px',
                    background: design.isActive && clients.length > 0 ? '#25D366' : '#94a3b8',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '14px', fontWeight: '600',
                    cursor: design.isActive && clients.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  📨 Send WhatsApp Greeting
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && selectedDesign && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'hidden' }}>
            
            <div style={{ padding: '20px 24px', background: '#25D366', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📨 Send {selectedDesign.occasion} Greeting</h3>
              <button onClick={() => setShowSendModal(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '24px', maxHeight: 'calc(90vh - 150px)', overflowY: 'auto' }}>
              
              {/* Client Stats */}
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600' }}>👥 Available Clients:</span>
                  <span style={{ background: '#3b82f6', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                    {clients.length} with phone numbers
                  </span>
                </div>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="🔍 Search by name, phone, business..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '14px', marginBottom: '16px'
                }}
              />

              {/* Select All */}
              {filteredClients.length > 0 && (
                <div style={{ marginBottom: '16px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedClients.length === filteredClients.length}
                      onChange={handleSelectAll}
                    />
                    <span style={{ fontWeight: '600' }}>Select All ({filteredClients.length} clients)</span>
                  </label>
                </div>
              )}

              {/* Clients List */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {filteredClients.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    {clientSearch ? 'No matches found' : 'No clients loaded. Click "Get Clients from Orders API" first.'}
                  </div>
                ) : (
                  filteredClients.map(client => (
                    <div
                      key={client._id}
                      onClick={() => handleClientSelect(client._id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', padding: '14px 16px',
                        borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        background: selectedClients.includes(client._id) ? '#f0f9ff' : 'white'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClients.includes(client._id)}
                        onChange={() => {}}
                        style={{ marginTop: '4px', marginRight: '12px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '600' }}>{client.name}</span>
                          <span style={{ color: '#25D366', fontWeight: '600' }}>{client.phoneDisplay}</span>
                        </div>
                        {client.businessName && (
                          <div style={{ fontSize: '13px', color: '#475569', marginBottom: '2px' }}>
                            🏢 {client.businessName}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          <span>📦 Orders: {client.totalOrders}</span>
                          <span>💰 ₹{client.totalSpent.toLocaleString()}</span>
                          {client.lastOrderNo && <span>🆔 #{client.lastOrderNo}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Count */}
              {selectedClients.length > 0 && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#166534' }}>
                    ✅ {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSendModal(false)} style={{ padding: '12px 24px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={sendBulkWhatsApp}
                disabled={sending || selectedClients.length === 0}
                style={{
                  padding: '12px 30px', background: '#25D366', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600',
                  cursor: sending || selectedClients.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: sending || selectedClients.length === 0 ? 0.6 : 1
                }}
              >
                {sending ? 'Opening WhatsApp...' : `📤 Send to ${selectedClients.length} Client${selectedClients.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GreetingDesignDashboard;