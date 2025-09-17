import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const AssignedDesigns = () => {
  const navigate = useNavigate();
  const [assignedDesigns, setAssignedDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const loggedInUserId = JSON.parse(localStorage.getItem('userData'))?._id;
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServiceDesignUpdates = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/design-requests`, {
          params: {
            assignedDesigner: loggedInUserId,
            status: ['in-progress', 'completed', 'assigned-to-service']
          }
        });
        setAssignedDesigns(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchServiceDesignUpdates();
  }, [loggedInUserId]);

  const updateStatus = async (id, newStatus) => {
    try {
      setModalLoading(true);
      setError(null); // Clear previous errors
      
      const payload = {
        status: newStatus
      };

      // Only add these fields if status is 'assigned-to-service'
      if (newStatus === 'assigned-to-service') {
        payload.assignedToServiceTeam = true;
        payload.serviceTeamAssignedBy = loggedInUserId;
        payload.assignedToServiceDate = new Date();
      }

      console.log("Updating status:", newStatus, "with payload:", payload);

      const response = await axios.patch(
        `http://localhost:5000/api/design-requests/${id}`,
        payload,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const updatedDesigns = assignedDesigns.map(d =>
        d._id === id ? { ...d, ...response.data } : d
      );
      setAssignedDesigns(updatedDesigns);
      
    } catch (err) {
      console.error('Update error:', err);
      let errorMessage = 'Failed to update status';
      
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data.message || `Server error: ${err.response.status}`;
        console.error('Server error response:', err.response.data);
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Other error
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewDetails = async (design) => {
    try {
      const orderId = design.orderId || design.order?._id;
      if (!orderId) {
        throw new Error("No valid order ID found in design request");
      }
      const response = await axios.get(`http://localhost:5000/api/orders/${orderId}`);
      setSelectedOrder(response.data);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      alert(error.message);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setError(null);
  };

  if (loading) return <div className="loading">Loading assigned designs...</div>;
  if (error && !isModalOpen) return <div className="error">{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Assigned Designs</h2>
      {assignedDesigns.length === 0 ? (
        <p>No designs currently assigned to you.</p>
      ) : (
        <div className="table-container">
          <table className="design-table">
            <thead>
              <tr className="table-header">
                <th>Executive</th>
                <th>Business</th>
                <th>Contact</th>
                <th>Requirements</th>
                <th>Assigned Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignedDesigns.map((design, index) => (
                <tr key={design._id || index} className="table-row">
                  <td>{design.executive || "N/A"}</td>
                  <td>{design.businessName}</td>
                  <td>
                    <div>{design.contactPerson}</div>
                    <div>{design.phoneNumber}</div>
                  </td>
                  <td>{design.requirements}</td>
                  <td>
                    {design.requestDate ? format(new Date(design.requestDate), 'PP') : 'N/A'}
                  </td>
                  <td>
                    <span className={`status-badge status-${design.status}`}>
                      {design.status.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <select
                      value={design.status}
                      onChange={(e) => updateStatus(design._id, e.target.value)}
                      className="status-select"
                      disabled={modalLoading}
                    >
                      <option value="in-progress">In Progress</option>
                      <option value="assigned-to-service">Assign to Service</option>
                      <option value="completed">Completed</option>
                    </select>
                    <button 
                      onClick={() => handleViewDetails(design)}
                      className="view-details-btn"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} className="dismiss-error">
            ×
          </button>
        </div>
      )}

      {/* Order Details Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {selectedOrder?.orderNumber
                  ? `Order #${selectedOrder.orderNumber}`
                  : 'Order Details'}
              </h2>
              <button
                onClick={closeModal}
                className="close-btn"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {selectedOrder ? (
              <>
                <div className="modal-grid">
                  {/* Order Information */}
                  <div className="info-card order-info">
                    <h3>
                      <span role="img" aria-label="Order">📋</span> Order Information
                    </h3>
                    <p><strong>Client Name:</strong> {selectedOrder.clientName || 'N/A'}</p>
                    <p><strong>Phone:</strong> {selectedOrder.phone || 'N/A'}</p>
                    <p><strong>Service:</strong> {selectedOrder.service || 'N/A'}</p>
                    <p><strong>Address:</strong> {selectedOrder.address || 'N/A'}</p>
                    <p><strong>Date:</strong> {selectedOrder.date || 'N/A'}</p>
                  </div>

                  {/* Business Information */}
                  <div className="info-card business-info">
                    <h3>
                      <span role="img" aria-label="Business">🏢</span> Business Information
                    </h3>
                    <p><strong>Business Name:</strong> {selectedOrder.businessName || 'N/A'}</p>
                    <p><strong>Contact Person:</strong> {selectedOrder.contactPerson || 'N/A'}</p>
                    <p><strong>Phone Number:</strong> {selectedOrder.phoneNumber || 'N/A'}</p>
                    <p><strong>Email:</strong> {selectedOrder.email || 'N/A'}</p>
                  </div>
                </div>

                {/* Order Items */}
                {selectedOrder.orderDetails?.rows && (
                  <div className="order-items-section">
                    <h3>
                      <span role="img" aria-label="Items">📦</span> Order Items
                    </h3>
                    <div className="table-wrapper">
                      <table className="items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.orderDetails.rows.map((row, index) => (
                            <tr key={index}>
                              <td>{row.requirement || row.customRequirement || 'N/A'}</td>
                              <td>{row.description || 'N/A'}</td>
                              <td>{row.quantity || 'N/A'}</td>
                              <td>₹{row.rate || '0'}</td>
                              <td>₹{row.total || '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="4" className="total-label">Total:</td>
                            <td className="total-amount">₹{selectedOrder.orderDetails.total || '0'}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="loading">Loading order details...</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .table-container {
          overflow-x: auto;
          margin-top: 20px;
        }
        
        .design-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .table-header {
          background-color: #f5f5f5;
        }
        
        .table-header th {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .table-row {
          border-bottom: 1px solid #eee;
        }
        
        .table-row td {
          padding: 12px;
        }
        
        .status-select {
          padding: 6px;
          border-radius: 4px;
          border: 1px solid #ddd;
          background-color: #fff9e6;
          margin-right: 8px;
        }
        
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .status-in-progress {
          background-color: #ffeaa7;
          color: #d35400;
        }
        
        .status-assigned-to-service {
          background-color: #a29bfe;
          color: #2d3436;
        }
        
        .status-completed {
          background-color: #d5f5e3;
          color: #27ae60;
        }
        
        .view-details-btn {
          padding: 6px 12px;
          background-color: #1890ff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .error-message {
          background-color: #fff0f6;
          color: #ff4a8d;
          padding: 12px;
          border-radius: 4px;
          margin: 15px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .dismiss-error {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #ff4a8d;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background-color: #ffffff;
          padding: 25px;
          border-radius: 15px;
          width: 90%;
          max-width: 1000px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          border-top: 5px solid #4a6bff;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f2ff;
        }
        
        .modal-header h2 {
          margin: 0;
          color: #4a6bff;
          font-size: 24px;
          font-weight: 600;
        }
        
        .close-btn {
          background: none;
          border: none;
          font-size: 1.8rem;
          cursor: pointer;
          color: #ff4757;
        }
        
        .modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 25px;
          margin-bottom: 25px;
        }
        
        .info-card {
          padding: 20px;
          border-radius: 12px;
        }
        
        .order-info {
          background-color: #f8f9ff;
          border-left: 4px solid #4a6bff;
        }
        
        .business-info {
          background-color: #fff8f6;
          border-left: 4px solid #ff6b4a;
        }
        
        .order-items-section {
          margin-bottom: 25px;
        }
        
        .table-wrapper {
          overflow-x: auto;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .items-table th {
          background-color: #8d4aff;
          color: white;
          padding: 12px;
          text-align: left;
        }
        
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }
        
        .total-label {
          text-align: right;
          font-weight: bold;
        }
        
        .total-amount {
          color: #8d4aff;
          font-weight: bold;
        }
        
        .loading {
          padding: 15px;
          text-align: center;
          margin: 20px 0;
          border-radius: 4px;
          background-color: #f0f9ff;
          color: #4ab2ff;
        }
      `}</style>
    </div>
  );
};

export default AssignedDesigns;