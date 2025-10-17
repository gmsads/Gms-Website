import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

import { Link } from 'react-router-dom';

const AssignedDesigns = () => {
 
  const [assignedDesigns, setAssignedDesigns] = useState([]);
  const [filteredDesigns, setFilteredDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const loggedInUserId = JSON.parse(localStorage.getItem('userData'))?._id;
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Month and Year filter states
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  
  // Status filter state
  const [selectedStatus, setSelectedStatus] = useState("");

  // Get all 12 months
  const getAllMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1); // [1, 2, 3, ..., 12]
  };

  // Get years from 2024 to 2030
  const getAllYears = () => {
    return Array.from({ length: 7 }, (_, i) => 2024 + i); // [2024, 2025, 2026, 2027, 2028, 2029, 2030]
  };

  // Status options
  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "in-progress", label: "In Progress" },
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "assigned-to-service", label: "Assign to Service" }
  ];

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
        setFilteredDesigns(res.data); // Initialize filtered designs with all data
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchServiceDesignUpdates();
  }, [loggedInUserId]);

  // Apply filters when month, year, or status changes
  useEffect(() => {
    let filtered = assignedDesigns;

    // Apply status filter
    if (selectedStatus && selectedStatus !== "") {
      filtered = filtered.filter((design) => design.status === selectedStatus);
    }

    // Apply date filters
    if (selectedMonth || selectedYear) {
      filtered = filtered.filter((design) => {
        if (!design.requestDate) return false;
        
        const designDate = new Date(design.requestDate);
        const designMonth = designDate.getMonth() + 1;
        const designYear = designDate.getFullYear();
        
        let matchesMonth = true;
        let matchesYear = true;
        
        if (selectedMonth && selectedMonth !== "") {
          matchesMonth = designMonth === parseInt(selectedMonth);
        }
        if (selectedYear && selectedYear !== "") {
          matchesYear = designYear === parseInt(selectedYear);
        }
        
        return matchesMonth && matchesYear;
      });
    }

    setFilteredDesigns(filtered);
  }, [selectedStatus, selectedMonth, selectedYear, assignedDesigns]);

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

  const resetDateFilters = () => {
    setSelectedMonth("");
    setSelectedYear("");
  };

  const resetStatusFilter = () => {
    setSelectedStatus("");
  };

  // Get months and years for filters
  const months = getAllMonths();
  const years = getAllYears();

  if (loading) return <div className="loading">Loading assigned designs...</div>;
  if (error && !isModalOpen) return <div className="error">{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Assigned Designs</h2>

      {/* Filters Section */}
      <div className="filters-section">
        <h3>Filters</h3>
        
        {/* Status Filter */}
        <div className="filter-group">
          <label>Status:</label>
          <div className="status-filter-buttons">
            {statusOptions.map((status) => (
              <button
                key={status.value}
                className={`status-filter-btn ${selectedStatus === status.value ? 'active' : ''}`}
                onClick={() => setSelectedStatus(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>
          {selectedStatus && (
            <button
              className="reset-filter-btn"
              onClick={resetStatusFilter}
            >
              Clear Status Filter
            </button>
          )}
        </div>

        {/* Date Filters */}
        <div className="date-filters">
          <div className="date-filter-controls">
            <div className="date-filter-group">
              <label>Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="date-filter-select"
              >
                <option value="">All Months</option>
                {months.map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div className="date-filter-group">
              <label>Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="date-filter-select"
              >
                <option value="">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {(selectedMonth || selectedYear) && (
              <button
                className="reset-date-btn"
                onClick={resetDateFilters}
              >
                Clear Date Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredDesigns.length === 0 ? (
        <div className="no-results">
          {assignedDesigns.length === 0 ? (
            <p>No designs currently assigned to you.</p>
          ) : (
            <p>No designs found matching the selected filters.</p>
          )}
        </div>
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
              {filteredDesigns.map((design, index) => (
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
    disabled={modalLoading || design.status === 'completed'}
  >
    <option value="in-progress">In Progress</option>
    <option value="assigned-to-service">Assign to Service</option>
    <option value="completed">Completed</option>
  </select>
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
        /* Filters Section Styles */
        .filters-section {
          background-color: #f8f9fa;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid #e9ecef;
          margin-bottom: 20px;
        }
        
        .filters-section h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #495057;
          font-weight: 600;
        }
        
        .filter-group {
          margin-bottom: 16px;
        }
        
        .filter-group label {
          display: block;
          font-size: 14px;
          color: #495057;
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        /* Status Filter Buttons */
        .status-filter-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        
        .status-filter-btn {
          padding: 8px 16px;
          background-color: hsla(235, 81%, 50%, 1.00);
          color: white;
          border: 1px solid #102ae8ff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .status-filter-btn:hover {
          background-color: #102ae8ff;
          color: white;
        }
        
        .status-filter-btn.active {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }
        
        .status-filter-btn.active:hover {
          background-color: #007bff;
          color: white;
        }
        
        .reset-filter-btn {
          padding: 6px 12px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s;
        }
        
        .reset-filter-btn:hover {
          background-color: #5a6268;
          color: white;
        }
        
        /* Date Filters Styles */
        .date-filters {
          margin-top: 16px;
        }
        
        .date-filter-controls {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
        
        .date-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .date-filter-group label {
          font-size: 14px;
          color: #495057;
          font-weight: 500;
          margin-bottom: 0;
        }
        
        .date-filter-select {
          padding: 6px 10px;
          border-radius: 4px;
          border: 1px solid #ced4da;
          font-size: 14px;
          min-width: 120px;
        }
        
        .reset-date-btn {
          padding: 6px 12px;
          background-color: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: background-color 0.2s;
        }
        
        .reset-date-btn:hover {
          background-color: #5a6268;
          color: white;
        }
        
        /* Debug Info Styles */
        .debug-info {
          padding: 10px;
          background-color: #e8f4fd;
          margin-bottom: 20px;
          border-radius: 4px;
          border: 1px solid #bee5eb;
          font-size: 14px;
        }
        
        .debug-info p {
          margin: 5px 0;
        }
        
        /* No Results Styles */
        .no-results {
          text-align: center;
          padding: 40px;
          color: #6c757d;
          font-style: italic;
        }
        
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
        
        .status-pending {
          background-color: #ffbe76;
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
        
        .view-details-btn:hover {
          background-color: #1890ff;
          color: white;
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