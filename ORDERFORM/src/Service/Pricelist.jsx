import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PriceList = () => {
  const [selectedList, setSelectedList] = useState(null);
  const [customData, setCustomData] = useState([]);
  const [agentData, setAgentData] = useState([]);
  const [clientData, setClientData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [whatsappData, setWhatsappData] = useState({
    phoneNumber: '',
    message: ''
  });
  
  // Form state
  const [formData, setFormData] = useState({
    product: '',
    size: '',
    color: '',
    price: '',
    minQty: '',
  });

  // Get user role from localStorage/sessionStorage
  useEffect(() => {
    const role = localStorage.getItem('userRole') || 
                 sessionStorage.getItem('userRole') ||
                 localStorage.getItem('role') ||
                 sessionStorage.getItem('role');
    
    console.log('Detected user role:', role);
    setIsAdmin(role === 'Admin');
  }, []);

  // Fetch price lists from API
  useEffect(() => {
    const fetchPriceLists = async () => {
      if (!selectedList) return;
      
      setIsLoading(true);
      try {
        const response = await axios.get(`/api/price-items?listType=${selectedList}`);
        
        if (selectedList === 'agent') {
          setAgentData(response.data);
        } else if (selectedList === 'client') {
          setClientData(response.data);
        } else if (selectedList === 'custom') {
          const dataWithSlNo = response.data.map((item, index) => ({
            ...item,
            slNo: index + 1
          }));
          setCustomData(dataWithSlNo);
        }
        // Clear selected items when switching lists
        setSelectedItems(new Set());
      } catch (err) {
        console.error('Error fetching price lists:', err);
        alert('Error loading data. Please check your connection.');
        if (selectedList === 'agent') setAgentData([]);
        if (selectedList === 'client') setClientData([]);
        if (selectedList === 'custom') setCustomData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceLists();
  }, [selectedList]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWhatsappInputChange = (e) => {
    const { name, value } = e.target;
    setWhatsappData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectItem = (itemId, sizeIndex = null) => {
    const itemKey = sizeIndex !== null ? `${itemId}-${sizeIndex}` : itemId;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
    } else {
      newSelected.add(itemKey);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const currentData = getCurrentData();
    if (selectedItems.size === getTotalItemsCount(currentData)) {
      setSelectedItems(new Set());
    } else {
      const newSelected = new Set();
      currentData.forEach(item => {
        if (item.sizes && item.sizes.length > 0) {
          item.sizes.forEach((_, idx) => {
            newSelected.add(`${item._id}-${idx}`);
          });
        } else {
          newSelected.add(item._id);
        }
      });
      setSelectedItems(newSelected);
    }
  };

  const getCurrentData = () => {
    if (selectedList === 'agent') return agentData;
    if (selectedList === 'client') return clientData;
    if (selectedList === 'custom') return customData;
    return [];
  };

  const getTotalItemsCount = (data) => {
    return data.reduce((count, item) => {
      if (item.sizes && item.sizes.length > 0) {
        return count + item.sizes.length;
      }
      return count + 1;
    }, 0);
  };

  // Generate WhatsApp message without backend
  const generateWhatsAppMessage = (items, listType, customMessage) => {
    let messageText = `*${listType?.toUpperCase()} PRICE LIST*\n\n`;
    
    if (customMessage) {
      messageText += `${customMessage}\n\n`;
    }
    
    messageText += `📋 *Price Details:*\n`;
    messageText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    let currentProduct = '';
    items.forEach((item, idx) => {
      if (item.product !== currentProduct) {
        if (currentProduct !== '') {
          messageText += `\n`;
        }
        messageText += `*📦 ${item.product}*\n`;
        currentProduct = item.product;
      }
      
      if (item.sizes && item.sizes.length > 0) {
        item.sizes.forEach(size => {
          messageText += `  📏 Size: ${size.size}\n`;
          if (size.color && size.color !== '-') {
            messageText += `  🎨 Color: ${size.color}\n`;
          }
          messageText += `  💰 Price: ₹${Number(size.price).toLocaleString()}\n`;
          if (item.minQty) {
            messageText += `  📦 Min Qty: ${item.minQty}\n`;
          }
          messageText += `  ─────────────────\n`;
        });
      } else {
        messageText += `  💰 Price: ₹${Number(item.price).toLocaleString()}\n`;
        if (item.minQty) {
          messageText += `  📦 Min Qty: ${item.minQty}\n`;
        }
        messageText += `  ─────────────────\n`;
      }
    });
    
    messageText += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    messageText += `_This is an automated message from Price List Management System_`;
    
    return messageText;
  };

  const handleSendPriceList = (sendAll = false) => {
    const currentData = getCurrentData();
    let itemsToSend = [];
    
    if (sendAll) {
      itemsToSend = currentData;
    } else if (selectedItems.size > 0) {
      // Get selected items
      const selectedItemsArray = Array.from(selectedItems);
      itemsToSend = currentData.map(item => {
        const selectedSizes = [];
        if (item.sizes && item.sizes.length > 0) {
          item.sizes.forEach((size, idx) => {
            if (selectedItemsArray.includes(`${item._id}-${idx}`)) {
              selectedSizes.push(size);
            }
          });
          if (selectedSizes.length > 0) {
            return { ...item, sizes: selectedSizes };
          }
        } else if (selectedItemsArray.includes(item._id)) {
          return item;
        }
        return null;
      }).filter(item => item !== null);
    } else {
      alert('Please select items to send or use "Send All" option');
      return;
    }

    if (itemsToSend.length === 0) {
      alert('No items selected to send');
      return;
    }

    // Store items to send for modal
    window.tempItemsToSend = itemsToSend;
    setIsSendModalOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappData.phoneNumber) {
      alert('Please enter phone number');
      return;
    }

    // Clean and format phone number
    let cleanNumber = whatsappData.phoneNumber.toString().replace(/\D/g, '');
    
    // Remove leading zero if present
    if (cleanNumber.startsWith('0')) {
      cleanNumber = cleanNumber.substring(1);
    }
    
    // Add country code if not present (assuming India +91)
    if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    
    // Generate message
    const message = generateWhatsAppMessage(
      window.tempItemsToSend, 
      selectedList, 
      whatsappData.message
    );
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
    
    // Close modal and reset
    setIsSendModalOpen(false);
    setWhatsappData({
      phoneNumber: '',
      message: ''
    });
    setSelectedItems(new Set());
    
    alert('WhatsApp opened! Click send to share the price list.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      alert('Only Admin can add/edit items');
      return;
    }
    
    if (!formData.product || !formData.size || !formData.price) {
      alert('Please fill in all required fields (Product, Size, Price)');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const priceItemData = {
        product: formData.product,
        sizes: [{
          size: formData.size,
          color: formData.color || '',
          price: Number(formData.price)
        }],
        minQty: formData.minQty || '',
        listType: selectedList
      };

      if (editingItem !== null) {
        await axios.put(`/api/price-items/${editingItem}`, priceItemData);
      } else {
        await axios.post('/api/price-items', priceItemData);
      }
      
      const refreshResponse = await axios.get(`/api/price-items?listType=${selectedList}`);
      
      if (selectedList === 'custom') {
        const dataWithSlNo = refreshResponse.data.map((item, index) => ({
          ...item,
          slNo: index + 1
        }));
        setCustomData(dataWithSlNo);
      } else if (selectedList === 'agent') {
        setAgentData(refreshResponse.data);
      } else if (selectedList === 'client') {
        setClientData(refreshResponse.data);
      }
      
      setEditingItem(null);
      setFormData({
        product: '',
        size: '',
        color: '',
        price: '',
        minQty: '',
      });
      
      alert(editingItem !== null ? 'Item updated successfully!' : 'Item added successfully!');
      
    } catch (err) {
      console.error('Error saving price item:', err);
      alert(`Error saving item: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item) => {
    if (!isAdmin) {
      alert('Only Admin can edit items');
      return;
    }
    
    setEditingItem(item._id);
    setFormData({
      product: item.product,
      size: item.sizes[0]?.size || '',
      color: item.sizes[0]?.color || '',
      price: item.sizes[0]?.price || item.price || '',
      minQty: item.minQty || '',
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('Only Admin can delete items');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await axios.delete(`/api/price-items/${id}`);
      
      const refreshResponse = await axios.get(`/api/price-items?listType=${selectedList}`);
      
      if (selectedList === 'custom') {
        const dataWithSlNo = refreshResponse.data.map((item, index) => ({
          ...item,
          slNo: index + 1
        }));
        setCustomData(dataWithSlNo);
      } else if (selectedList === 'agent') {
        setAgentData(refreshResponse.data);
      } else if (selectedList === 'client') {
        setClientData(refreshResponse.data);
      }
      
      if (editingItem === id) {
        setEditingItem(null);
        setFormData({
          product: '',
          size: '',
          color: '',
          price: '',
          minQty: '',
        });
      }
      
      alert('Item deleted successfully!');
      
    } catch (err) {
      console.error('Error deleting price item:', err);
      alert(`Error deleting item: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const EmptyState = () => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginTop: '20px'
    }}>
      <p style={{ fontSize: '18px', color: '#7f8c8d', marginBottom: '10px' }}>
        📋 No items found in this price list
      </p>
      {isAdmin ? (
        <p style={{ color: '#95a5a6' }}>
          Use the form on the right to add your first item
        </p>
      ) : (
        <p style={{ color: '#95a5a6' }}>
          Please contact an administrator to add items
        </p>
      )}
    </div>
  );

  const renderTable = (data, title) => (
    <div style={{ flex: 2, minWidth: '280px', overflowX: 'auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h3 style={{ color: '#2c3e50', margin: 0 }}>{title}</h3>
        {data.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSelectAll()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {selectedItems.size === getTotalItemsCount(data) ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => handleSendPriceList(false)}
              disabled={selectedItems.size === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedItems.size === 0 ? '#95a5a6' : '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              📱 Send Selected ({selectedItems.size})
            </button>
            <button
              onClick={() => handleSendPriceList(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📱 Send All
            </button>
          </div>
        )}
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ 
            width: '100%', 
            minWidth: '600px',
            borderCollapse: 'collapse',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === getTotalItemsCount(data)}
                    onChange={() => handleSelectAll()}
                  />
                </th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>Sl No</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Products</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Size</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>Color</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e0e0e0' }}>Price (₹)</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>Min Qty</th>
                {isAdmin && <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>Actions</th>}
               </tr>
            </thead>
            <tbody>
              {data.map((item, idx) =>
                item.sizes && item.sizes.length > 0 ? (
                  item.sizes.map((size, i) => (
                    <tr key={`${item._id}-${i}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      {i === 0 && (
                        <>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <input
                              type="checkbox"
                              checked={selectedItems.has(`${item._id}-${i}`)}
                              onChange={() => handleSelectItem(item._id, i)}
                            />
                           </td>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {item.slNo || idx + 1}
                           </td>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'middle', fontWeight: '500' }}>
                            {item.product}
                           </td>
                        </>
                      )}
                      <td style={{ padding: '12px' }}>{size.size}</td>
                      <td style={{ padding: '12px' }}>{size.color || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>₹{Number(size.price).toLocaleString()}</td>
                      {i === 0 && (
                        <>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {item.minQty || '-'}
                           </td>
                          {isAdmin && (
                            <td rowSpan={item.sizes.length} style={{ padding: '12px', textAlign: 'center', verticalAlign: 'middle' }}>
                              <button 
                                onClick={() => handleEdit(item)} 
                                style={{ 
                                  marginRight: '5px', 
                                  padding: '6px 12px',
                                  backgroundColor: '#f39c12',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                                disabled={isLoading}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(item._id)}
                                style={{ 
                                  padding: '6px 12px',
                                  backgroundColor: '#e74c3c',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
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
                  <tr key={item._id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item._id)}
                        onChange={() => handleSelectItem(item._id)}
                      />
                     </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{item.slNo || idx + 1}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{item.product}</td>
                    <td colSpan="2" style={{ padding: '12px', textAlign: 'center', color: '#95a5a6' }}>-</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{item.price ? `₹${Number(item.price).toLocaleString()}` : '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{item.minQty || '-'}</td>
                    {isAdmin && (
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleEdit(item)} 
                          style={{ 
                            marginRight: '5px', 
                            padding: '6px 12px',
                            backgroundColor: '#f39c12',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item._id)}
                          style={{ 
                            padding: '6px 12px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
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
      minWidth: '280px',
      padding: '20px', 
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginLeft: '20px',
      position: 'sticky',
      top: '20px',
      alignSelf: 'flex-start'
    }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>
        {editingItem !== null ? 'Edit Item' : 'Add New Item'}
      </h3>
      
      {!isAdmin ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          color: '#7f8c8d'
        }}>
          <p style={{ fontSize: '16px', marginBottom: '10px' }}>🔒 Read Only Mode</p>
          <p style={{ fontSize: '14px' }}>Only administrators can add, edit, or delete price list items.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Product Name *</label>
            <input
              type="text"
              name="product"
              value={formData.product}
              onChange={handleInputChange}
              required
              placeholder="Enter product name"
              style={{ 
                width: '100%', 
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Size *</label>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleInputChange}
                required
                placeholder="e.g., 12x18"
                style={{ 
                  width: '100%', 
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Color</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="e.g., multicolour"
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
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Price (₹) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                placeholder="Enter price"
                step="0.01"
                style={{ 
                  width: '100%', 
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Min Quantity</label>
              <input
                type="text"
                name="minQty"
                value={formData.minQty}
                onChange={handleInputChange}
                placeholder="e.g., 100, 500 & ABOVE"
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
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                flex: 1,
                padding: '12px',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
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
                  });
                }}
                disabled={isLoading}
                style={{ 
                  padding: '12px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );

  const renderSendModal = () => (
    isSendModalOpen && (
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
        zIndex: 1000,
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          width: '500px',
          maxWidth: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '30px', marginRight: '10px' }}>📱</span>
            <h3 style={{ margin: 0 }}>Send via WhatsApp</h3>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={whatsappData.phoneNumber}
              onChange={handleWhatsappInputChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
            <small style={{ color: '#7f8c8d', fontSize: '12px' }}>
            
            </small>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Additional Message (Optional)
            </label>
            <textarea
              name="message"
              value={whatsappData.message}
              onChange={handleWhatsappInputChange}
              rows="4"
              placeholder="Add any additional message to send with the price list..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px',
                resize: 'vertical'
              }}
            />
          </div>
          
       
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsSendModalOpen(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendWhatsApp}
              style={{
                padding: '10px 20px',
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📱 Send to WhatsApp
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div style={{ 
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>Price List Management</h1>
        <p style={{ color: '#7f8c8d' }}>Select a price list to view or edit</p>
        {isAdmin && (
          <p style={{ color: '#27ae60', fontSize: '14px', marginTop: '10px' }}>
            ✅ Admin mode - You can add, edit, and delete price list items.
          </p>
        )}
      </div>
      
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <div 
          onClick={() => {
            setSelectedList('agent');
            setEditingItem(null);
            setFormData({
              product: '',
              size: '',
              color: '',
              price: '',
              minQty: '',
            });
          }}
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
            backgroundColor: isAdmin ? '#2ecc71' : '#e74c3c',
            color: 'white',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {isAdmin ? 'Editable' : 'Read Only'}
          </div>
        </div>
        
        <div 
          onClick={() => {
            setSelectedList('client');
            setEditingItem(null);
            setFormData({
              product: '',
              size: '',
              color: '',
              price: '',
              minQty: '',
            });
          }}
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
            backgroundColor: isAdmin ? '#2ecc71' : '#e74c3c',
            color: 'white',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {isAdmin ? 'Editable' : 'Read Only'}
          </div>
        </div>
        
        <div 
          onClick={() => {
            setSelectedList('custom');
            setEditingItem(null);
            setFormData({
              product: '',
              size: '',
              color: '',
              price: '',
              minQty: '',
            });
          }}
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
            backgroundColor: isAdmin ? '#2ecc71' : '#e74c3c',
            color: 'white',
            borderRadius: '20px',
            padding: '2px 10px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {isAdmin ? 'Editable' : 'Read Only'}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {selectedList === 'agent' && renderTable(agentData, "AGENT PRICE LIST")}
        {selectedList === 'client' && renderTable(clientData, "CLIENT PRICE LIST")}
        {selectedList === 'custom' && renderTable(customData, "CUSTOM PRICE LIST")}
        
        {selectedList && renderForm()}
      </div>
      
      {renderSendModal()}
    </div>
  );
};

export default PriceList;