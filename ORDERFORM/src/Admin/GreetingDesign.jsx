import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const GreetingDesignDashboard = ({ userRole }) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOccasion, setSelectedOccasion] = useState('all');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [fetchingClients, setFetchingClients] = useState(false);
  
  // State for WhatsApp Web integration
  const [whatsAppInitialized, setWhatsAppInitialized] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(null);

  useEffect(() => {
    fetchDesigns();
    
    // Check if WhatsApp is available
    checkWhatsAppAvailability();
  }, []);

  // ============ CHECK WHATSAPP AVAILABILITY ============
  const checkWhatsAppAvailability = () => {
    // Check if WhatsApp Web is available
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, we can use intent/scheme
      setWhatsAppInitialized(true);
    } else {
      // On desktop, check if WhatsApp Web can be opened
      setWhatsAppInitialized(true);
    }
  };

  // ============ FETCH CLIENTS FROM ORDERS ============
  const fetchClientsFromOrders = async () => {
    try {
      setFetchingClients(true);
      setMessage('');
      
      const response = await axios.get(`${API_BASE_URL}/orders`);
      
      let orders = [];
      if (Array.isArray(response.data)) {
        orders = response.data;
      } else if (response.data?.orders && Array.isArray(response.data.orders)) {
        orders = response.data.orders;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        orders = response.data.data;
      }
      
      // Extract unique clients
      const clientMap = new Map();
      
      orders.forEach(order => {
        if (order.isTrashed) return;
        
        const phone = order.phone;
        const name = order.contactPerson;
        const business = order.business;
        const orderNo = order.orderNo;
        const total = order.total || order.discountedTotal || 0;
        
        if (phone) {
          const cleanPhone = phone.toString().replace(/\D/g, '');
          
          if (cleanPhone && cleanPhone.length >= 10) {
            const phoneKey = cleanPhone.slice(-10);
            
            if (!clientMap.has(phoneKey)) {
              clientMap.set(phoneKey, {
                _id: `client-${phoneKey}`,
                name: name || 'Valued Customer',
                phone: cleanPhone,
                phoneDisplay: cleanPhone.slice(-10),
                businessName: business || '',
                totalOrders: 1,
                totalSpent: total || 0,
                lastOrderNo: orderNo || ''
              });
            } else {
              const client = clientMap.get(phoneKey);
              client.totalOrders += 1;
              client.totalSpent += total || 0;
            }
          }
        }
      });
      
      const clientsList = Array.from(clientMap.values());
      clientsList.sort((a, b) => b.totalSpent - a.totalSpent);
      
      setClients(clientsList);
      
      if (clientsList.length > 0) {
        showMessage(`📱 Found ${clientsList.length} clients`, 'success');
      } else {
        showMessage('No clients found', 'warning');
      }
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      showMessage('Error fetching clients', 'error');
    } finally {
      setFetchingClients(false);
    }
  };

  // ============ FORMAT PHONE NUMBER ============
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return null;
    
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.length === 10) {
      return '91' + cleaned; // Add India country code
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '91' + cleaned.substring(1);
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    } else if (cleaned.length > 12) {
      return cleaned.slice(-12);
    }
    
    return cleaned;
  };

  // ============ CREATE WHATSAPP MESSAGE TEXT ============
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
    message += `━━━━━━━━━━━━━━━━━━━\n`;
    message += `Warm regards,\n`;
    message += `${localStorage.getItem('userName') || 'Team'} 🚀`;
    
    return message;
  };

  // ============ METHOD 1: Send via WhatsApp Web/App with Image (Direct) ============
  const sendWhatsAppDirect = async (client, design) => {
    const phone = formatPhoneForWhatsApp(client.phone);
    if (!phone) {
      showMessage(`Invalid phone for ${client.name}`, 'error');
      return false;
    }

    try {
      const message = createWhatsAppMessage(client, design);
      const encodedMessage = encodeURIComponent(message);
      
      // Get image URL
      const imageUrl = design.imageUrl;
      
      // For WhatsApp Web/App, we need to use different approaches
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Mobile: Use intent/scheme with image
        // Note: WhatsApp URL scheme doesn't support direct image sending
        // So we'll open WhatsApp first, then user can attach
        const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
        window.location.href = whatsappUrl;
        
        // Show instructions to attach image
        setTimeout(() => {
          alert(`📷 Step 1: WhatsApp opened for ${client.name}\n\n📎 Step 2: Click on attachment icon (📎)\n🖼️ Step 3: Select "Gallery" and choose the image\n📤 Step 4: Send the message with image`);
        }, 1000);
      } else {
        // Desktop: Open WhatsApp Web
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        // Show instructions
        setTimeout(() => {
          alert(`📷 WhatsApp Web opened for ${client.name}\n\n📎 Click on attachment icon (📎) → 📷 Gallery → Select the image and send`);
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      return false;
    }
  };

  // ============ METHOD 2: Use WhatsApp Business API (If you have access) ============
  const sendViaWhatsAppBusinessAPI = async (client, design) => {
    try {
      // This would require WhatsApp Business API setup
      // You would need to:
      // 1. Get WhatsApp Business API access
      // 2. Have a verified business account
      // 3. Use their API to send template messages with media
      
      const response = await axios.post(`${API_BASE_URL}/whatsapp/send-template`, {
        phone: client.phone,
        template: 'greeting_template',
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'image',
                image: {
                  link: design.imageUrl
                }
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: client.name
              },
              {
                type: 'text',
                text: design.occasion
              },
              {
                type: 'text',
                text: design.description || ''
              }
            ]
          }
        ]
      });
      
      return response.data.success;
    } catch (error) {
      console.error('WhatsApp Business API error:', error);
      return false;
    }
  };

  // ============ METHOD 3: Share via WhatsApp Share API ============
  const shareViaWhatsAppShare = async (client, design) => {
    try {
      const message = createWhatsAppMessage(client, design);
      
      // Try to use Web Share API if available
      if (navigator.share && navigator.canShare) {
        // Fetch image as blob
        const response = await fetch(design.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'greeting.jpg', { type: 'image/jpeg' });
        
        // Share via Web Share API
        await navigator.share({
          title: `${design.occasion} Greeting`,
          text: message,
          files: [file]
        });
        
        return true;
      } else {
        // Fallback to WhatsApp direct
        return await sendWhatsAppDirect(client, design);
      }
    } catch (error) {
      console.error('Share API error:', error);
      return false;
    }
  };

  // ============ SEND TO SINGLE CLIENT ============
  const sendToSingleClient = async (client, design) => {
    // Try Method 1 first (Direct WhatsApp)
    const success = await sendWhatsAppDirect(client, design);
    
    // Track the send in backend
    if (success) {
      try {
        await axios.post(`${API_BASE_URL}/greetings/track-send`, {
          designId: design._id,
          clientId: client._id,
          clientName: client.name,
          clientPhone: client.phone,
          sentBy: localStorage.getItem('userId') || '1',
          senderName: localStorage.getItem('userName') || 'User'
        });
      } catch (error) {
        console.error('Error tracking send:', error);
      }
    }
    
    return success;
  };

  // ============ START BULK SENDING ============
  const startBulkSending = () => {
    if (selectedClients.length === 0) {
      showMessage('Please select at least one client', 'warning');
      return;
    }

    const queue = clients.filter(c => selectedClients.includes(c._id));
    
    setSendingProgress({
      queue: queue,
      currentIndex: 0,
      total: queue.length
    });
    
    setShowSendModal(false);
    
    // Start with first client
    processNextClient(queue, 0);
  };

  // ============ PROCESS NEXT CLIENT IN QUEUE ============
  const processNextClient = async (queue, index) => {
    if (index >= queue.length) {
      // All done
      setSendingProgress(null);
      setSelectedClients([]);
      showMessage(`✅ Completed! Sent to ${queue.length} clients`, 'success');
      return;
    }

    const client = queue[index];
    
    // Show progress indicator
    setMessage(`📤 Sending to ${index + 1} of ${queue.length}: ${client.name}`);
    setMessageType('info');
    
    // Send to current client
    await sendToSingleClient(client, selectedDesign);
    
    // Update progress
    setSendingProgress(prev => ({
      ...prev,
      currentIndex: index + 1
    }));
    
    // Auto proceed to next client after delay
    if (index < queue.length - 1) {
      setTimeout(() => {
        if (window.confirm(`✅ Sent to ${client.name}\n\nClick OK to send to next client: ${queue[index + 1].name}`)) {
          processNextClient(queue, index + 1);
        } else {
          // User cancelled
          setSendingProgress(null);
          setSelectedClients([]);
        }
      }, 2000);
    } else {
      // Last client
      setTimeout(() => {
        alert(`✅ All done! Sent to ${queue.length} clients`);
        setSendingProgress(null);
        setSelectedClients([]);
      }, 2000);
    }
  };

  // ============ FETCH DESIGNS ============
  const fetchDesigns = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/greetings/designs`);
      if (response.data.success) {
        setDesigns(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching designs:', error);
      showMessage('Error loading designs', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredClients = clients.filter(c => 
    (c.name?.toLowerCase() || '').includes(clientSearch.toLowerCase()) ||
    (c.phoneDisplay || '').includes(clientSearch) ||
    (c.businessName?.toLowerCase() || '').includes(clientSearch.toLowerCase())
  );

  const occasions = ['all', ...new Set(designs.map(d => d.occasion).filter(Boolean))];
  const filteredDesigns = selectedOccasion === 'all' 
    ? designs 
    : designs.filter(d => d.occasion === selectedOccasion);

  const totalDesigns = designs.length;
  const activeDesigns = designs.filter(d => d.isActive).length;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Message Toast */}
      {message && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          padding: '15px 25px',
          background: messageType === 'success' ? '#10b981' : 
                     messageType === 'warning' ? '#f59e0b' : 
                     messageType === 'info' ? '#3b82f6' : '#ef4444',
          color: 'white', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 9999
        }}>
          {message}
        </div>
      )}

      {/* Sending Progress Bar */}
      {sendingProgress && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', left: '20px',
          background: 'white', padding: '15px', borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 9998,
          maxWidth: '400px',
          margin: '0 auto'
        }}>
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <strong>Sending Progress:</strong>
            <span>{sendingProgress.currentIndex} of {sendingProgress.total}</span>
          </div>
          <div style={{
            height: '8px',
            background: '#e2e8f0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(sendingProgress.currentIndex / sendingProgress.total) * 100}%`,
              height: '100%',
              background: '#25D366',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px', marginBottom: '30px'
      }}>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎨</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Total Designs</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{totalDesigns}</p>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Active</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{activeDesigns}</p>
        </div>
        
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '25px', borderRadius: '16px', color: 'white' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📱</div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Clients</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: '700' }}>{clients.length}</p>
        </div>
      </div>

      {/* Fetch Clients Button */}
      <div style={{
        background: 'white', padding: '30px', borderRadius: '16px',
        marginBottom: '30px', textAlign: 'center',
        border: '2px dashed #3b82f6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📞</div>
        <h2 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>
          Step 1: Load Clients from Orders
        </h2>
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
            cursor: fetchingClients ? 'wait' : 'pointer'
          }}
        >
          {fetchingClients ? 'Fetching...' : '📱 Get Clients from Orders'}
        </button>
      </div>

      {/* Instructions Banner */}
      {clients.length > 0 && (
        <div style={{
          background: '#e8f5e9',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '30px',
          border: '1px solid #81c784'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '40px' }}>📱</span>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#2e7d32' }}>
                How to Send Greetings with Images:
              </h3>
              <p style={{ margin: 0, color: '#1b5e20' }}>
                1. Select a design and clients → 2. Click "Start Sending" → 
                3. WhatsApp will open automatically → 4. Attach the image from your gallery and send
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {clients.length > 0 && (
        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '600' }}>Filter:</span>
            <select
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              style={{
                padding: '10px 16px', border: '1px solid #e2e8f0',
                borderRadius: '8px', minWidth: '200px'
              }}
            >
              {occasions.map(occ => (
                <option key={occ} value={occ}>
                  {occ === 'all' ? '🎯 All Occasions' : occ}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Designs Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <h3>Loading Designs...</h3>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '12px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px', opacity: '0.5' }}>🎨</div>
          <h3>No Designs Found</h3>
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
                    cursor: design.isActive && clients.length > 0 ? 'pointer' : 'not-allowed'
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
              <div>
                <h3 style={{ margin: 0 }}>📨 Send {selectedDesign.occasion} Greeting</h3>
                <p style={{ margin: '5px 0 0', fontSize: '14px', opacity: '0.9' }}>
                  WhatsApp will open for each client
                </p>
              </div>
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

              {/* Image Preview */}
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: '#f3f4f6',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <img 
                  src={selectedDesign.imageUrl} 
                  alt="Greeting" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '150px',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}
                />
                <p style={{ margin: 0, fontSize: '14px', color: '#4b5563' }}>
                  This image will be sent to clients
                </p>
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
                    {clientSearch ? 'No matches found' : 'No clients loaded'}
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
                          <div style={{ fontSize: '13px', color: '#475569' }}>
                            🏢 {client.businessName}
                          </div>
                        )}
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
                onClick={startBulkSending}
                disabled={selectedClients.length === 0}
                style={{
                  padding: '12px 30px', background: '#25D366', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600',
                  cursor: selectedClients.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedClients.length === 0 ? 0.6 : 1
                }}
              >
                Start Sending ({selectedClients.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreetingDesignDashboard;