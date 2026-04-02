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
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading approval requests...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>Advance Payment Approval Requests</h2>
          
          <div>
            <label style={{ fontWeight: '500', marginRight: '8px', color: '#555' }}>
              Filter by Status:
            </label>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: 'white'
              }}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        {/* Statistics Summary */}
        {requests.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid #ffc107'
            }}>
              <strong>Total:</strong> {requests.length} requests
            </div>
            <div style={{
              backgroundColor: '#d4edda',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid #28a745'
            }}>
              <strong>Pending:</strong> {requests.filter(r => r.status === 'pending').length}
            </div>
          </div>
        )}

        {/* Cards Grid - Horizontal Layout */}
        {requests.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            backgroundColor: 'white',
            borderRadius: '12px',
            color: '#666',
            fontSize: '16px'
          }}>
            No approval requests found
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            rowGap: '69px',      // ← Vertical space between rows (top and bottom of cards)
             columnGap: '24px',   // ← Horizontal space between columns (left and right of cards)
          }}>
            {requests.map((request) => (
              <div 
                key={request._id} 
                className="request-card" 
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '20px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                {/* Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px',
                    backgroundColor: request.status === 'pending' ? '#ffc107' : 
                                   request.status === 'approved' ? '#28a745' : '#dc3545',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {request.status}
                  </span>
                </div>

                {/* Business Name */}
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '20px', 
                  fontWeight: '600',
                  color: '#2c3e50',
                  borderBottom: '2px solid #f0f0f0',
                  paddingBottom: '8px'
                }}>
                  {request.business}
                </h3>

                {/* Executive Info */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', minWidth: '100px', color: '#555' }}>Executive:</span>
                    <span style={{ color: '#333' }}>{request.executive}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', minWidth: '100px', color: '#555' }}>Contact:</span>
                    <span style={{ color: '#333' }}>{request.contactPerson}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', minWidth: '100px', color: '#555' }}>Phone:</span>
                    <span style={{ color: '#333' }}>{request.contactNumber}</span>
                  </div>
                </div>

                {/* Amount Information */}
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '12px', 
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '500', color: '#555' }}>Total Amount:</span>
                    <span style={{ fontWeight: '600', color: '#2c3e50' }}>₹{request.totalAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#555' }}>Advance Paid:</span>
                    <span style={{ fontWeight: '600', color: '#28a745' }}>
                      ₹{request.advanceAmount} ({request.advancePercentage}%)
                    </span>
                  </div>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#555' }}>Reason:</span>
                  <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px', lineHeight: '1.4' }}>
                    {request.reason}
                  </p>
                </div>

                {/* Metadata */}
                <div style={{ 
                  fontSize: '12px', 
                  color: '#888',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '12px',
                  marginBottom: '16px'
                }}>
                  <div>Requested: {new Date(request.requestedAt).toLocaleString()}</div>
                  {request.adminNotes && (
                    <div style={{ marginTop: '4px' }}>
                      <strong>Notes:</strong> {request.adminNotes}
                    </div>
                  )}
                  {request.approvedBy && (
                    <div style={{ marginTop: '4px' }}>
                      Processed by: {request.approvedBy}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    marginTop: 'auto',
                    paddingTop: '12px'
                  }}>
                    <button
                      onClick={() => {
                        const notes = prompt('Add optional notes for approval:');
                        handleStatusUpdate(request._id, 'approved', notes);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Reason for rejection:');
                        if (notes) {
                          handleStatusUpdate(request._id, 'rejected', notes);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdvanceApprovalPage;