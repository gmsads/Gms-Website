import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function TrashOrders() {
  const [trashData, setTrashData] = useState({
    orders: [],
    prospectives: []
  });
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_BASE_URL = '/api';
  const API_ENDPOINTS = {
    TRASH_ORDERS: `${API_BASE_URL}/orders/trash`,
    RESTORE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/restore`,
    PERMANENT_DELETE_ORDER: (id) => `${API_BASE_URL}/orders/${id}/permanent`,
    
    TRASH_PROSPECTIVES: `${API_BASE_URL}/prospective-clients/trash`,
    RESTORE_PROSPECTIVE: (id) => `${API_BASE_URL}/prospective-clients/${id}/restore`,
    PERMANENT_DELETE_PROSPECTIVE: (id) => `${API_BASE_URL}/prospective-clients/${id}/permanent`
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return 'Invalid Date';
    }
  };

  const fetchTrashData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersResponse, prospectivesResponse] = await Promise.all([
        axios.get(API_ENDPOINTS.TRASH_ORDERS),
        axios.get(API_ENDPOINTS.TRASH_PROSPECTIVES)
      ]);

      const ordersData = Array.isArray(ordersResponse.data) 
        ? ordersResponse.data 
        : ordersResponse.data?.data || ordersResponse.data?.orders || [];

      const prospectivesData = Array.isArray(prospectivesResponse.data) 
        ? prospectivesResponse.data 
        : prospectivesResponse.data?.data || prospectivesResponse.data?.prospectives || [];

      setTrashData({
        orders: ordersData,
        prospectives: prospectivesData
      });
    } catch (err) {
      console.error('Error fetching trash data:', err);
      setError('Failed to load trash data');
      toast.error('Failed to load trash data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id, type) => {
    try {
      const endpoint = type === 'order' 
        ? API_ENDPOINTS.RESTORE_ORDER(id)
        : API_ENDPOINTS.RESTORE_PROSPECTIVE(id);
      
      await axios.put(endpoint);
      toast.success(`${type === 'order' ? 'Order' : 'Prospective client'} restored successfully!`);
      fetchTrashData();
    } catch (err) {
      console.error(`Error restoring ${type}:`, err);
      toast.error(`Failed to restore ${type}`);
    }
  };

  const handlePermanentDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${type}? This action cannot be undone.`)) {
      return;
    }

    try {
      const endpoint = type === 'order' 
        ? API_ENDPOINTS.PERMANENT_DELETE_ORDER(id)
        : API_ENDPOINTS.PERMANENT_DELETE_PROSPECTIVE(id);
      
      await axios.delete(endpoint);
      toast.success(`${type === 'order' ? 'Order' : 'Prospective client'} permanently deleted!`);
      fetchTrashData();
    } catch (err) {
      console.error(`Error permanently deleting ${type}:`, err);
      toast.error(`Failed to delete ${type} permanently`);
    }
  };

  const handleEmptyTrash = async () => {
    const itemType = activeTab === 'orders' ? 'orders' : 'prospective clients';
    
    if (!window.confirm(`Are you sure you want to empty the entire ${itemType} trash? This will permanently delete all ${itemType} and cannot be undone.`)) {
      return;
    }

    try {
      const itemsToDelete = activeTab === 'orders' ? trashData.orders : trashData.prospectives;
      const deletePromises = itemsToDelete.map(item => {
        const endpoint = activeTab === 'orders' 
          ? API_ENDPOINTS.PERMANENT_DELETE_ORDER(item._id)
          : API_ENDPOINTS.PERMANENT_DELETE_PROSPECTIVE(item._id);
        
        return axios.delete(endpoint);
      });
      
      await Promise.all(deletePromises);
      toast.success(`${itemType} trash emptied successfully!`);
      
      if (activeTab === 'orders') {
        setTrashData(prev => ({ ...prev, orders: [] }));
      } else {
        setTrashData(prev => ({ ...prev, prospectives: [] }));
      }
    } catch (err) {
      console.error('Error emptying trash:', err);
      toast.error('Failed to empty trash');
    }
  };

  useEffect(() => {
    fetchTrashData();
  }, []);

  const totalOrders = trashData.orders.length;
  const totalProspectives = trashData.prospectives.length;
  const totalItems = totalOrders + totalProspectives;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading trash data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#ffebee', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
          <h2 style={{ color: '#c62828' }}>Error Loading Trash</h2>
          <p>{error}</p>
          <button onClick={fetchTrashData} style={{ backgroundColor: '#1565c0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #e67e22' }}>
        <h1 style={{ color: '#e67e22', margin: 0 }}>Trash Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/admin-dashboard/view-orders')}
            style={{ backgroundColor: '#3498db', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
          {(activeTab === 'orders' ? totalOrders : totalProspectives) > 0 && (
            <button
              onClick={handleEmptyTrash}
              style={{ backgroundColor: '#e74c3c', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Empty {activeTab === 'orders' ? 'Orders' : 'Prospects'} Trash
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'orders' ? 'white' : '#f8f9fa',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid #e67e22' : '3px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'orders' ? '#e67e22' : '#333',
            fontWeight: activeTab === 'orders' ? '600' : '400'
          }}
        >
          Orders ({totalOrders})
        </button>
        <button
          onClick={() => setActiveTab('prospectives')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'prospectives' ? 'white' : '#f8f9fa',
            border: 'none',
            borderBottom: activeTab === 'prospectives' ? '3px solid #e67e22' : '3px solid transparent',
            cursor: 'pointer',
            color: activeTab === 'prospectives' ? '#e67e22' : '#333',
            fontWeight: activeTab === 'prospectives' ? '600' : '400'
          }}
        >
          Prospective Clients ({totalProspectives})
        </button>
      </div>

   

      {/* Orders Table */}
      {activeTab === 'orders' && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
            Deleted Orders ({totalOrders})
          </h3>
          {trashData.orders.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead style={{ backgroundColor: '#3498db', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Order No</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Business</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Executive</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Order Date</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Amount</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Deleted Date</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trashData.orders.map((order, index) => (
                    <tr key={order._id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{index + 1}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{order.orderNo || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{order.contactPerson || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{order.business || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{order.executive || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{formatDate(order.orderDate)}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                        ₹{order.rows?.reduce((sum, row) => sum + (parseFloat(row.total) || 0), 0).toFixed(2) || '0.00'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {order.trashedAt ? formatDate(order.trashedAt) : 'Unknown'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleRestore(order._id, 'order')}
                            style={{ padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(order._id, 'order')}
                            style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ color: '#666' }}>No Orders in Trash</h3>
              <p style={{ color: '#999' }}>No orders have been moved to trash yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Prospective Clients Table */}
      {activeTab === 'prospectives' && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
            Deleted Prospective Clients ({totalProspectives})
          </h3>
          {trashData.prospectives.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead style={{ backgroundColor: '#3498db', color: 'white' }}>
                  <tr>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>S.No</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Business Name</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Contact Person</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Executive</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Phone</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Location</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Deleted Date</th>
                    <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trashData.prospectives.map((prospective, index) => (
                    <tr key={prospective._id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{index + 1}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{prospective.businessName || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{prospective.contactPerson || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{prospective.ExcutiveName || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{prospective.phoneNumber || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{prospective.location || 'N/A'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <span style={{ padding: '4px 8px', backgroundColor: '#e2e3e5', borderRadius: '4px', fontSize: '12px' }}>
                          {prospective.status || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        {prospective.trashedAt ? formatDate(prospective.trashedAt) : 'Unknown'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleRestore(prospective._id, 'prospective')}
                            style={{ padding: '6px 12px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(prospective._id, 'prospective')}
                            style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ color: '#666' }}>No Prospective Clients in Trash</h3>
              <p style={{ color: '#999' }}>No prospective clients have been moved to trash yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TrashOrders;