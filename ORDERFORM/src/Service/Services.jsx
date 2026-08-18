import React, { useEffect, useState } from 'react';
import axios from 'axios';

const statusOptions = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

function Services() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  // Update service row status
  const updateRowStatus = async (orderId, rowIndex, newStatus) => {
    try {
      const res = await axios.put(`/api/orders/${orderId}/assign-service`, {
        rowIndex,
        status: newStatus,
      });

      const updatedOrder = res.data.order;
      setOrders((prev) =>
        prev.map((order) => (order._id === updatedOrder._id ? updatedOrder : order))
      );
      setMessage('Status updated successfully!');
    } catch (error) {
      console.error('Failed to update status:', error);
      setMessage('Failed to update status.');
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Service Management</h2>
      <p>Manage service assignments and update service statuses.</p>

      {message && (
        <p
          style={{
            color: message.includes('Failed') ? 'red' : 'green',
            fontWeight: 'bold',
          }}
        >
          {message}
        </p>
      )}

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        orders.map((order) => {
          // Filter service rows to only those with assignedExecutive (name)
          const assignedRows = order.rows.filter(
            (row) => row.assignedExecutive && row.assignedExecutive.trim() !== ''
          );
          if (assignedRows.length === 0) return null;

          return (
            <div
              key={order._id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                backgroundColor: '#fff',
              }}
            >
              <h3>Order No: {order.orderNo}</h3>
              <p>
                <strong>Order Date:</strong>{' '}
                {new Date(order.orderDate).toLocaleDateString()}
              </p>

              <div>
                <h4>Service Rows:</h4>
                {assignedRows.length > 0 ? (
                  assignedRows.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        padding: '0.5rem',
                        marginBottom: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f9f9f9',
                      }}
                    >
                      <div>
                        <strong>{row.serviceName || 'No Service Name'}</strong>
                        <div>Assigned Executive: {row.assignedExecutive}</div>
                      </div>

                      <div>
                        <label
                          htmlFor={`status-${order._id}-${idx}`}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Status:
                        </label>
                        <select
                          id={`status-${order._id}-${idx}`}
                          value={
                            row.isCompleted
                              ? 'Completed'
                              : row.status || 'Pending'
                          }
                          onChange={(e) =>
                            updateRowStatus(order._id, idx, e.target.value)
                          }
                          style={{ padding: '0.3rem', borderRadius: '4px' }}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No assigned service rows available</p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Services;
