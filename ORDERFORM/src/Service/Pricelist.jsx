import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PriceList = () => {
  const [selectedList, setSelectedList] = useState(null);
  const [customData, setCustomData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({
    clientName: '',
    phoneNumber: '',
    priceListType: ''
  });
  const [sharedClients, setSharedClients] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    product: '',
    size: '',
    color: '',
    price: '',
    minQty: '',
    listType: 'custom'
  });

  // Static client data
  const clientData = [
    {
      slNo: 1,
      product: "No parking boards",
      sizes: [
        { size: "12x18", color: "multicolour", price: 20 },
        { size: "12x18", color: "two / single clour", price: 18 },
        { size: "12x12", color: "multicolour", price: 15 },
        { size: "12x12", color: "two / single clour", price: 14 },
        { size: "12x9", color: "multicolour", price: 13 },
        { size: "12x9", color: "two / single clour", price: 11 },
      ],
      minQty: "500 & ABOVE",
    },
    {
      slNo: 2,
      product: "POLE BOARDS / FLUTE BOARDS",
      sizes: [
        { size: "18x18", color: "multicolour", price: 30 },
        { size: "18x18", color: "two / single clour", price: 28 },
        { size: "18x24", color: "multicolour", price: 40 },
        { size: "18x24", color: "two / single clour", price: 32 },
        { size: "24x24", color: "multicolour", price: 38 },
        { size: "24x24", color: "two / single clour", price: 52 },
        { size: "24x36", color: "multicolour", price: 75 },
        { size: "24x36", color: "two / single clour", price: 73 },
      ],
      minQty: "500 & ABOVE",
    },
    {
      slNo: 3,
      product: "UMBRELLA",
      sizes: [{ size: "4X4", color: "multicolour", price: 1500 }],
      minQty: 300,
    },
    {
      slNo: 4,
      product: "ROLL UP STANDY",
      sizes: [
        { size: "6X6", color: "multicolour", price: 2500 },
        { size: "3X6", color: "multicolour", price: 1800 },
      ],
      minQty: 10,
    },
    {
      slNo: 5,
      product: "DEMO TENT",
      sizes: [{ size: "4X4", color: "multicolour", price: 4500 }],
      minQty: 10,
    },
    {
      slNo: 6,
      product: "SKY BALLON",
      sizes: [
        { size: "6X6", color: "multicolour", price: 6500 },
        { size: "12X12", color: "STICKER 1", price: 18000 },
        { size: "12X12", color: "PRINTED", price: 22000 },
        { size: "15X15", color: "ONLY PRINTED", price: 35000 },
      ],
      minQty: 5,
    },
    {
      slNo: 7,
      product: "LOOK WALKERS",
      sizes: [],
      price: 1800,
    },
    {
      slNo: 8,
      product: "TRI CYCLES",
      sizes: [],
      price: 1800,
      note: "3 NOS 10 DAYS 6 HOURS 10-6; 2-8",
    },
    { slNo: 9, product: "POLE STICKERS" },
    { slNo: 10, product: "WOODEN FRAME WITH FLEX" },
    { slNo: 11, product: "IRON FRAME WITH FLEX" },
    { slNo: 12, product: "BACK LIT BOARDS" },
    { slNo: 13, product: "CLIP ON BOARDS" },
    { slNo: 14, product: "LED BOARDS" },
    { slNo: 15, product: "WOODEN STICKES FLEX" },
    { slNo: 16, product: "DIGITAL WALL STICKERS" },
  ];

  // Static agent data
  const agentData = [
    {
      slNo: 1,
      product: "No parking boards",
      sizes: [
        { size: "12x18", color: "multicolour", price: 18 },
        { size: "12x18", color: "two / single clour", price: 16 },
        { size: "12x12", color: "multicolour", price: 12 },
        { size: "12x12", color: "two / single clour", price: 11 },
        { size: "12x9", color: "multicolour", price: 10 },
        { size: "12x9", color: "two / single clour", price: 9 },
      ],
      minQty: 1000,
    },
    {
      slNo: 2,
      product: "POLE BOARD / FLUTE BOARD",
      sizes: [
        { size: "18x18", color: "multicolour", price: 27 },
        { size: "18x18", color: "two / single clour", price: 25 },
        { size: "18x24", color: "multicolour", price: 36 },
        { size: "18x24", color: "two / single clour", price: 34 },
        { size: "24x24", color: "multicolour", price: 48 },
        { size: "24x24", color: "two / single clour", price: 46 },
        { size: "24x36", color: "multicolour", price: 72 },
        { size: "24x36", color: "two / single clour", price: 70 },
      ],
      minQty: 100,
    },
    {
      slNo: 3,
      product: "AUTO STICKERS",
      sizes: [{ size: "20X30", price: 80 }],
      minQty: 500,
    },
    {
      slNo: 4,
      product: "AUTO TOPS",
      sizes: [{ size: "28X32", color: "", price: 700 }],
      minQty: 100,
    },
    {
      slNo: 5,
      product: "MOBILE VAN",
      sizes: [
        { size: "T & L SHAPE", color: "", price: 75000 },
        { size: "LED", color: "", price: 300000 },
        { size: "DCM", color: "", price: 300000 },
      ],
      minQty: "30 DAYS",
    },
  ];

  // Fetch custom data from API
  useEffect(() => {
    const fetchCustomData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/price-items', {
          params: { listType: 'custom' }
        });
        const dataWithSlNo = response.data.map((item, index) => ({
          ...item,
          slNo: index + 1
        }));
        setCustomData(dataWithSlNo);
      } catch (err) {
        console.error('Error fetching custom data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedList === 'custom') {
      fetchCustomData();
    }
  }, [selectedList]);

  // Fetch shared clients history
  useEffect(() => {
    const fetchSharedClients = async () => {
      try {
        const response = await axios.get('/api/shared-clients');
        setSharedClients(response.data);
      } catch (err) {
        console.error('Error fetching shared clients:', err);
      }
    };
    
    fetchSharedClients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleShareInputChange = (e) => {
    const { name, value } = e.target;
    setShareData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const priceItemData = {
        product: formData.product,
        sizes: [{
          size: formData.size,
          color: formData.color,
          price: Number(formData.price)
        }],
        minQty: formData.minQty,
        listType: 'custom'
      };

      if (editingItem !== null) {
        await axios.put(`/api/price-items/${editingItem}`, priceItemData);
      } else {
        await axios.post('/api/price-items', priceItemData);
      }
      
      const response = await axios.get('/api/price-items', {
        params: { listType: 'custom' }
      });
      const dataWithSlNo = response.data.map((item, index) => ({
        ...item,
        slNo: index + 1
      }));
      setCustomData(dataWithSlNo);
      
      setEditingItem(null);
      setFormData({
        product: '',
        size: '',
        color: '',
        price: '',
        minQty: '',
        listType: 'custom'
      });
    } catch (err) {
      console.error('Error saving price item:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item._id);
    setFormData({
      product: item.product,
      size: item.sizes[0]?.size || '',
      color: item.sizes[0]?.color || '',
      price: item.sizes[0]?.price || item.price || '',
      minQty: item.minQty || '',
      listType: 'custom'
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(`/api/price-items/${id}`);
      
      const response = await axios.get('/api/price-items', {
        params: { listType: 'custom' }
      });
      const dataWithSlNo = response.data.map((item, index) => ({
        ...item,
        slNo: index + 1
      }));
      setCustomData(dataWithSlNo);
      
      if (editingItem === id) {
        setEditingItem(null);
        setFormData({
          product: '',
          size: '',
          color: '',
          price: '',
          minQty: '',
          listType: 'custom'
        });
      }
    } catch (err) {
      console.error('Error deleting price item:', err);
      alert('Error deleting item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePriceListText = (data, title) => {
    let text = `*${title}*\n\n`;
    text += `📋 *Price List - ${new Date().toLocaleDateString()}*\n\n`;
    
    data.forEach(item => {
      if (item.sizes && item.sizes.length > 0) {
        text += `*${item.slNo}. ${item.product}*\n`;
        item.sizes.forEach(size => {
          text += `   📏 Size: ${size.size}\n`;
          if (size.color) text += `   🎨 Color: ${size.color}\n`;
          text += `   💰 Price: ₹${size.price}\n`;
          if (item.minQty) text += `   📦 Min Qty: ${item.minQty}\n`;
          text += `   ---\n`;
        });
        text += `\n`;
      } else if (item.price) {
        text += `*${item.slNo}. ${item.product}*\n`;
        text += `   💰 Price: ₹${item.price}\n`;
        if (item.minQty) text += `   📦 Min Qty: ${item.minQty}\n`;
        if (item.note) text += `   📝 Note: ${item.note}\n`;
        text += `\n`;
      } else {
        text += `*${item.slNo}. ${item.product}*\n`;
        text += `   📞 Contact for pricing\n\n`;
      }
    });
    
    text += `\n---\n`;
    text += `📅 Generated on: ${new Date().toLocaleString()}\n`;
    text += `💬 For inquiries, please contact us.\n`;
    text += `✅ *Price valid until further notice*`;
    
    return encodeURIComponent(text);
  };

  const handleShareToWhatsApp = async () => {
    if (!shareData.clientName || !shareData.phoneNumber) {
      alert('Please enter client name and phone number');
      return;
    }

    // Validate phone number
    let phone = shareData.phoneNumber.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    
    let data, title;
    if (shareData.priceListType === 'agent') {
      data = agentData;
      title = 'AGENT PRICE LIST';
    } else if (shareData.priceListType === 'client') {
      data = clientData;
      title = 'CLIENT PRICE LIST';
    } else {
      data = customData;
      title = 'CUSTOM PRICE LIST';
    }
    
    const message = generatePriceListText(data, title);
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    
    // Save to localStorage (since we're not using backend)
    const existingClients = JSON.parse(localStorage.getItem('sharedClients') || '[]');
    const newClient = {
      id: Date.now(),
      clientName: shareData.clientName,
      phoneNumber: shareData.phoneNumber,
      priceListType: shareData.priceListType,
      sharedAt: new Date().toISOString()
    };
    existingClients.push(newClient);
    localStorage.setItem('sharedClients', JSON.stringify(existingClients));
    setSharedClients(existingClients);
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Reset and close modal
    setShowShareModal(false);
    setShareData({
      clientName: '',
      phoneNumber: '',
      priceListType: ''
    });
    
    alert('Price list shared successfully!');
  };

  const openShareModal = (listType) => {
    setShareData({
      ...shareData,
      priceListType: listType
    });
    setShowShareModal(true);
  };

  const getFilteredClients = () => {
    if (!dateFilter.startDate && !dateFilter.endDate) {
      return sharedClients;
    }
    
    return sharedClients.filter(client => {
      const clientDate = new Date(client.sharedAt).toISOString().split('T')[0];
      if (dateFilter.startDate && dateFilter.endDate) {
        return clientDate >= dateFilter.startDate && clientDate <= dateFilter.endDate;
      } else if (dateFilter.startDate) {
        return clientDate >= dateFilter.startDate;
      } else if (dateFilter.endDate) {
        return clientDate <= dateFilter.endDate;
      }
      return true;
    });
  };

  const getDailyStats = () => {
    const stats = {};
    sharedClients.forEach(client => {
      const date = new Date(client.sharedAt).toISOString().split('T')[0];
      if (!stats[date]) {
        stats[date] = {
          agent: 0,
          client: 0,
          custom: 0,
          total: 0
        };
      }
      stats[date][client.priceListType]++;
      stats[date].total++;
    });
    return Object.entries(stats).map(([date, counts]) => ({ date, ...counts }));
  };

  const renderTable = (data, title) => (
    <div style={{ flex: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ textAlign: 'center', color: '#2c3e50', margin: 0 }}>{title}</h3>
        {selectedList && (
          <button
            onClick={() => openShareModal(selectedList)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#25D366',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold'
            }}
          >
            <span>📱</span>
            Share via WhatsApp
          </button>
        )}
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Sl No</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Products</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Size</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Color</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Price</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Min Qty</th>
                {title === "CUSTOM PRICE LIST" && <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) =>
                item.sizes && item.sizes.length > 0 ? (
                  item.sizes.map((size, i) => (
                    <tr key={`${idx}-${i}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      {i === 0 && (
                        <>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>{item.slNo}</td>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>{item.product}</td>
                        </>
                      )}
                      <td style={{ padding: '12px' }}>{size.size}</td>
                      <td style={{ padding: '12px' }}>{size.color || '-'}</td>
                      <td style={{ padding: '12px' }}>₹{size.price}</td>
                      {i === 0 && (
                        <>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>{item.minQty || '-'}</td>
                          {title === "CUSTOM PRICE LIST" && (
                            <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>
                              <button 
                                onClick={() => handleEdit(item)} 
                                style={{ 
                                  marginRight: '5px', 
                                  padding: '8px 12px',
                                  backgroundColor: '#f39c12',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                disabled={isLoading}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(item._id)}
                                style={{ 
                                  padding: '8px 12px',
                                  backgroundColor: '#e74c3c',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                disabled={isLoading}
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr key={idx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>{item.slNo}</td>
                    <td style={{ padding: '12px' }}>{item.product}</td>
                    <td colSpan="3" style={{ padding: '12px', textAlign: 'center' }}>{item.price ? `₹${item.price}` : '-'}</td>
                    <td style={{ padding: '12px' }}>{item.minQty || '-'}</td>
                    {title === "CUSTOM PRICE LIST" && (
                      <td style={{ padding: '12px' }}>
                        <button 
                          onClick={() => handleEdit(item)} 
                          style={{ 
                            marginRight: '5px', 
                            padding: '8px 12px',
                            backgroundColor: '#f39c12',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id)}
                          style={{ 
                            padding: '8px 12px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <div style={{ 
      flex: 1, 
      padding: '20px', 
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginLeft: '20px'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
        {editingItem !== null ? 'Edit Item' : 'Add New Item'}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Product Name*</label>
          <input
            type="text"
            name="product"
            value={formData.product}
            onChange={handleInputChange}
            required
            style={{ 
              width: '100%', 
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Size*</label>
            <input
              type="text"
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              required
              style={{ 
                width: '100%', 
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Color</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Price*</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              style={{ 
                width: '100%', 
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Min Quantity</label>
            <input
              type="text"
              name="minQty"
              value={formData.minQty}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            padding: '12px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Processing...' : (editingItem !== null ? 'Update Item' : 'Add Item')}
        </button>
        
        {editingItem !== null && (
          <button 
            type="button" 
            onClick={() => {
              setEditingItem(null);
              setFormData({
                product: '',
                size: '',
                color: '',
                price: '',
                minQty: '',
                listType: 'custom'
              });
            }}
            disabled={isLoading}
            style={{ 
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#e74c3c',
              border: '1px solid #e74c3c',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '10px',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );

  const renderShareModal = () => {
    if (!showShareModal) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90%'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>Share Price List via WhatsApp</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Client Name*</label>
            <input
              type="text"
              name="clientName"
              value={shareData.clientName}
              onChange={handleShareInputChange}
              placeholder="Enter client name"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Phone Number*</label>
            <input
              type="tel"
              name="phoneNumber"
              value={shareData.phoneNumber}
              onChange={handleShareInputChange}
              placeholder="Enter 10-digit mobile number"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Price List Type</label>
            <input
              type="text"
              value={shareData.priceListType === 'agent' ? 'Agent Price List' : shareData.priceListType === 'client' ? 'Client Price List' : 'Custom Price List'}
              disabled
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#f5f5f5'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleShareToWhatsApp}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              📱 Share Now
            </button>
            <button
              onClick={() => {
                setShowShareModal(false);
                setShareData({
                  clientName: '',
                  phoneNumber: '',
                  priceListType: ''
                });
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => {
    if (!showHistory) return null;
    
    const filteredClients = getFilteredClients();
    const dailyStats = getDailyStats();
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '85%',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#2c3e50' }}>Shared Clients History</h3>
            <button
              onClick={() => setShowHistory(false)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
          
          {/* Daily Statistics Section */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Daily Statistics</h4>
            {dailyStats.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7f8c8d' }}>No data available</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Date</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Agent List</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Client List</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Custom List</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStats.map(stat => (
                      <tr key={stat.date} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '12px' }}>{stat.date}</td>
                        <td style={{ padding: '12px' }}>{stat.agent || 0}</td>
                        <td style={{ padding: '12px' }}>{stat.client || 0}</td>
                        <td style={{ padding: '12px' }}>{stat.custom || 0}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{stat.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Filter Section */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '10px' }}>Filter by Date</h4>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <button
                onClick={() => setDateFilter({ startDate: '', endDate: '' })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>
          
          {/* Clients List Section */}
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>
              Clients List {filteredClients.length > 0 && `(${filteredClients.length})`}
            </h4>
            {filteredClients.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7f8c8d' }}>No clients found</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Date & Time</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Client Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Phone Number</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Price List Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '12px' }}>{new Date(client.sharedAt).toLocaleString()}</td>
                        <td style={{ padding: '12px' }}>{client.clientName}</td>
                        <td style={{ padding: '12px' }}>{client.phoneNumber}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: client.priceListType === 'agent' ? '#3498db' : 
                                           client.priceListType === 'client' ? '#2ecc71' : '#f39c12',
                            color: 'white',
                            fontSize: '12px'
                          }}>
                            {client.priceListType === 'agent' ? 'Agent' : 
                             client.priceListType === 'client' ? 'Client' : 'Custom'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>Price List Management</h1>
        <p style={{ color: '#7f8c8d' }}>Select a price list to view or edit</p>
      </div>
      
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <div 
          onClick={() => setSelectedList('agent')}
          style={{
            padding: '20px',
            backgroundColor: selectedList === 'agent' ? '#e7f3fe' : 'white',
            border: selectedList === 'agent' ? '2px solid #3498db' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '180px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          <h3 style={{ color: '#3498db', marginBottom: '5px' }}>Agent</h3>
          <p style={{ color: '#7f8c8d', margin: '0' }}>Price List</p>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            backgroundColor: '#e74c3c',
            color: 'white',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            Read Only
          </div>
        </div>
        
        <div 
          onClick={() => setSelectedList('client')}
          style={{
            padding: '20px',
            backgroundColor: selectedList === 'client' ? '#e7f3fe' : 'white',
            border: selectedList === 'client' ? '2px solid #3498db' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '180px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          <h3 style={{ color: '#3498db', marginBottom: '5px' }}>Client</h3>
          <p style={{ color: '#7f8c8d', margin: '0' }}>Price List</p>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            backgroundColor: '#e74c3c',
            color: 'white',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            Read Only
          </div>
        </div>
        
        <div 
          onClick={() => setSelectedList('custom')}
          style={{
            padding: '20px',
            backgroundColor: selectedList === 'custom' ? '#e7f3fe' : 'white',
            border: selectedList === 'custom' ? '2px solid #3498db' : '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '180px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
        >
          <h3 style={{ color: '#3498db', marginBottom: '5px' }}>Custom</h3>
          <p style={{ color: '#7f8c8d', margin: '0' }}>Price List</p>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            backgroundColor: '#2ecc71',
            color: 'white',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            Editable
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={() => setShowHistory(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📊</span>
          View Shared Clients History ({sharedClients.length})
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {selectedList === 'agent' && renderTable(agentData, "AGENT PRICE LIST")}
        {selectedList === 'client' && renderTable(clientData, "CLIENT PRICE LIST")}
        {selectedList === 'custom' && renderTable(customData, "CUSTOM PRICE LIST")}
        
        {(selectedList === 'custom' || selectedList === null) && renderForm()}
      </div>
      
      {renderShareModal()}
      {renderHistory()}
    </div>
  );
};

export default PriceList;