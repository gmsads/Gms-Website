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
      } catch (err) {
        console.error('Error fetching price lists:', err);
        alert('Error loading data. Please check your connection.');
        // Set empty arrays on error
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      alert('Only Admin can add/edit items');
      return;
    }
    
    // Validate required fields
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

      let response;
      if (editingItem !== null) {
        // Update existing item
        response = await axios.put(`/api/price-items/${editingItem}`, priceItemData);
        console.log('Update response:', response.data);
      } else {
        // Create new item
        response = await axios.post('/api/price-items', priceItemData);
        console.log('Create response:', response.data);
      }
      
      // Refresh the current list
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
      
      // Reset form
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
    
    // Scroll to form
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
    <div style={{ flex: 2 }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#2c3e50' }}>{title}</h3>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
      ) : data.length === 0 ? (
        <EmptyState />
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
                {isAdmin && <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) =>
                item.sizes && item.sizes.length > 0 ? (
                  item.sizes.map((size, i) => (
                    <tr key={`${item._id}-${i}`} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      {i === 0 && (
                        <>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>{item.slNo || idx + 1}</td>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>{item.product}</td>
                        </>
                      )}
                      <td style={{ padding: '12px' }}>{size.size}</td>
                      <td style={{ padding: '12px' }}>{size.color || '-'}</td>
                      <td style={{ padding: '12px' }}>₹{size.price}</td>
                      {i === 0 && (
                        <>
                          <td rowSpan={item.sizes.length} style={{ padding: '12px', verticalAlign: 'top' }}>{item.minQty || '-'}</td>
                          {isAdmin && (
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
                  <tr key={item._id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                    <td style={{ padding: '12px' }}>{item.slNo || idx + 1}</td>
                    <td style={{ padding: '12px' }}>{item.product}</td>
                    <td colSpan="3" style={{ padding: '12px', textAlign: 'center' }}>{item.price ? `₹${item.price}` : '-'}</td>
                    <td style={{ padding: '12px' }}>{item.minQty || '-'}</td>
                    {isAdmin && (
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
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
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
            
            <div style={{ flex: 1 }}>
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
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
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
            
            <div style={{ flex: 1 }}>
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
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
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
        {!isAdmin && (
          <p style={{ color: '#e74c3c', fontSize: '14px', marginTop: '10px' }}>
            ⚠️ You are in read-only mode. Only administrators can modify price lists.
          </p>
        )}
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
    </div>
  );
};

export default PriceList;