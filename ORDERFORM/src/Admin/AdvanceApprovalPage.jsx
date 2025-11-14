import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdvanceApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`/api/advance-approval-requests?status=${filter}`);
      setRequests(response.data);
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      alert("Failed to load approval requests");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, status, adminNotes = '') => {
    try {
      await axios.put(`/api/advance-approval-requests/${requestId}`, {
        status,
        adminNotes,
        approvedBy: localStorage.getItem('userName') || 'Admin'
      });
      
      alert(`Request ${status} successfully`);
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error("Error updating request:", error);
      alert("Failed to update request");
    }
  };

  if (loading) {
    return <div>Loading approval requests...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Advance Payment Approval Requests</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          Filter by Status:
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ marginLeft: '10px' }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
        </label>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No approval requests found
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
            <div key={request._id} className="request-card" style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '15px',
              backgroundColor: request.status === 'pending' ? '#fff3cd' : 
                             request.status === 'approved' ? '#d4edda' : '#f8d7da'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4>{request.business}</h4>
                  <p><strong>Executive:</strong> {request.executive}</p>
                  <p><strong>Contact:</strong> {request.contactPerson} ({request.contactNumber})</p>
                  <p><strong>Total Amount:</strong> ₹{request.totalAmount}</p>
                  <p><strong>Advance Paid:</strong> ₹{request.advanceAmount} ({request.advancePercentage}%)</p>
                  <p><strong>Reason:</strong> {request.reason}</p>
                  <p><strong>Requested:</strong> {new Date(request.requestedAt).toLocaleString()}</p>
                  
                  {request.adminNotes && (
                    <p><strong>Admin Notes:</strong> {request.adminNotes}</p>
                  )}
                  {request.approvedBy && (
                    <p><strong>Processed by:</strong> {request.approvedBy}</p>
                  )}
                </div>
                
                <div style={{ minWidth: '150px', textAlign: 'right' }}>
                  <div style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    backgroundColor: request.status === 'pending' ? '#ffc107' : 
                                   request.status === 'approved' ? '#28a745' : '#dc3545',
                    color: 'white',
                    display: 'inline-block',
                    marginBottom: '10px'
                  }}>
                    {request.status.toUpperCase()}
                  </div>
                  
                  {request.status === 'pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <button
                        onClick={() => {
                          const notes = prompt('Add optional notes for approval:');
                          handleStatusUpdate(request._id, 'approved', notes);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Reason for rejection:');
                          if (notes) {
                            handleStatusUpdate(request._id, 'rejected', notes);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdvanceApprovalPage;