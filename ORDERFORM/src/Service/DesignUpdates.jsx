/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DesignUpdates = () => {
    const location = useLocation();
    const { state } = location;
    const [designUpdates, setDesignUpdates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDesign, setSelectedDesign] = useState(null);
 

    useEffect(() => {
        const fetchServiceDesignUpdates = async () => {
            try {
                // 1. Fetch design requests with populated data
                const res = await axios.get(`/api/design-requests/service-team`, {
                    params: {
                        simple: true,
                        populate: 'executive assignedDesigner',// Request populated data
                        sort: '-assignedToServiceDate' // Add sorting parameter
                    }
                });

                // 2. Get unique designer IDs (filter out null/undefined)
                const designerIds = [...new Set(
                    res.data
                        .filter(design => design.assignedDesigner)
                        .map(design => design.assignedDesigner)
                )].filter(id => id); // Additional filter to ensure no null/undefined

                // 3. Fetch designer names
                let designers = {};
                if (designerIds.length > 0) {
                    try {
                        const designersRes = await axios.get(`/api/designers`, {
                            params: { ids: designerIds.join(',') }
                        });
                        designers = designersRes.data.reduce((acc, designer) => {
                            acc[designer._id] = designer.name;
                            return acc;
                        }, {});
                    } catch (err) {
                        console.error("Error fetching designers:", err);
                        // Fallback - use existing designerName if available
                        designerIds.forEach(id => {
                            const designWithName = res.data.find(d => d.assignedDesigner === id && d.designerName);
                            if (designWithName) {
                                designers[id] = designWithName.designerName;
                            }
                        });
                    }
                }
                // 2. Process the data with proper fallbacks
                const designsWithNames = res.data.map(design => ({
                    ...design,
                    designerName: design.assignedDesigner?.name ||
                        design.designerName ||
                        'Not assigned',
                    formattedAssignedDate: design.assignedToServiceDate
                        ? format(new Date(design.assignedToServiceDate), 'PP')
                        : 'N/A',
                    executiveName: design.executive?.name || design.executive || 'N/A'
                }));
                // Sort designs by assigned date (newest first) before setting state
                const sortedDesigns = designsWithNames.sort((a, b) => {
                    return new Date(b.assignedToServiceDate) - new Date(a.assignedToServiceDate);
                });

                setDesignUpdates(sortedDesigns);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchServiceDesignUpdates();
    }, []);

    const handleStatusChange = async (e, design) => {
        const newStatus = e.target.value;
    
        try {
            const payload = { status: newStatus };
            if (newStatus === 'completed') {
                payload.completedDate = new Date();
            }
    
            const response = await axios.patch(
                `/api/design-requests/${design._id}`,
                payload
            );
    
            setDesignUpdates(prev => {
                // Remove the updated item from its current position
                const filtered = prev.filter(d => d._id !== design._id);
                // Create the updated item
                const updatedItem = {
                    ...design,
                    ...response.data,
                    designerName: response.data.designerName || design.designerName || 'Not assigned',
                    formattedAssignedDate: response.data.formattedAssignedDate || design.formattedAssignedDate || 'N/A'
                };
                // Add it to the beginning of the array
                return [updatedItem, ...filtered];
            });
        } catch (err) {
            console.error('Error updating status:', err);
            setError(err.response?.data?.message || 'Failed to update status');
        }
    };

    const markAsProcessed = async (id) => {
        try {
            await axios.patch(`/api/design-requests/${id}`, {
                status: 'processed',
                processedDate: new Date()
            });
            // Simply remove the item - no need to sort since we're removing
            setDesignUpdates(prev => prev.filter(design => design._id !== id));
        } catch (err) {
            console.error('Error updating status:', err);
            setError('Failed to update status');
        }
    };

    const updateCompletionDate = async (id, date) => {
        try {
            const response = await axios.patch(
                `/api/design-requests/${id}`,
                { completedDate: date }
            );
    
            // Update while maintaining sort order
            setDesignUpdates(prev => {
                const updated = prev.map(design =>
                    design._id === id ? response.data : design
                );
                return updated.sort((a, b) => {
                    return new Date(b.assignedToServiceDate) - new Date(a.assignedToServiceDate);
                });
            });
        } catch (err) {
            console.error('Error updating completion date:', err);
            setError('Failed to update completion date');
        }
    };

    if (loading) return <div className="loading">Loading service dashboard...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Design Updates for Processing</h2>
            {designUpdates.length === 0 ? (
                <p>No design updates assigned to service team.</p>
            ) : (
                <div className="table-container">
                    <table className="design-table">
                        <thead>
                            <tr className="table-header">
                                <th>Assigned Date</th>
                                <th>Excutives</th>
                                <th>Business</th>
                                <th>Designer</th>
                                <th>Requirements</th>
                                <th>Status</th>
                                <th>Completed Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {designUpdates.map((design) => (
                                <tr key={design._id} className="table-row">
                                    <td>{design.formattedAssignedDate}</td>
                                    <td>
                                        {/* Display executive name */}
                                        {design.executive?.name || design.executive || 'N/A'}
                                    </td>
                                    <td>{design.businessName}</td>
                                    <td>
                                        {design.designerName || 'Not assigned'}
                                    </td>
                                    <td>{design.requirements}</td>
                                    <td>
                                        <select
                                            value={design.status}
                                            onChange={(e) => handleStatusChange(e, design)}
                                            className={`status-select ${design.status === 'pending'
                                                ? 'status-pending'
                                                : design.status === 'in unit'
                                                    ? 'status-inunit'
                                                    : design.status === 'completed'
                                                        ? 'status-completed'
                                                        : ''
                                                }`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in unit">In Unit</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </td>

                                    <td>
                                        {design.status === 'completed' ? (
                                            <DatePicker
                                                selected={
                                                    design.completedDate
                                                        ? new Date(design.completedDate)
                                                        : new Date()
                                                }
                                                onChange={(date) => updateCompletionDate(design._id, date)}
                                                dateFormat="MMMM d, yyyy"
                                                className="date-picker-input"
                                                disabled={design.status !== 'completed'}
                                            />
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            onClick={() => {
                                                setSelectedDesign(design);
                                                setIsModalOpen(true);
                                            }}
                                            className="view-details-btn"
                                        >
                                            View Details
                                        </button>
                                        {design.status === 'completed' && (
                                            <button
                                                onClick={() => markAsProcessed(design._id)}
                                                className="process-btn"
                                            >
                                                Mark as Processed
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Design Details Modal */}
            {isModalOpen && selectedDesign && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Design Update Details</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="close-btn"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="modal-grid">
                            <div className="info-card">
                                <h3>Business Information</h3>
                                <p><strong>Executive:</strong> {selectedDesign.executive?.name || selectedDesign.executive || 'N/A'}</p>
                                <p><strong>Name:</strong> {selectedDesign.businessName}</p>
                                <p><strong>Contact:</strong> {selectedDesign.contactPerson}</p>
                                <p><strong>Phone:</strong> {selectedDesign.phoneNumber}</p>
                                <p><strong>Designer:</strong> {selectedDesign.assignedDesigner?.name || 'N/A'}</p>
                            </div>

                            <div className="info-card">
                                <h3>Design Details</h3>
                                <p><strong>Requirements:</strong> {selectedDesign.requirements}</p>
                                <p><strong>Status:</strong> {selectedDesign.status}</p>
                                <p><strong>Completed Date:</strong>
                                    {selectedDesign.completedDate ? format(new Date(selectedDesign.completedDate), 'PP') : 'N/A'}
                                </p>
                            </div>
                        </div>

                        {selectedDesign.designFiles && selectedDesign.designFiles.length > 0 && (
                            <div className="design-files">
                                <h3>Design Files</h3>
                                <div className="files-grid">
                                    {selectedDesign.designFiles.map((file, index) => (
                                        <div key={index} className="file-item">
                                            <a
                                                href={`http://localhost:5000/${file.path}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {file.name || `Design File ${index + 1}`}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
        /* Add your styles here */
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
          vertical-align: middle;
        }
        
        .view-details-btn {
          padding: 6px 12px;
          background-color: #1890ff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 8px;
        }
        
        .process-btn {
          padding: 6px 12px;
          background-color: #52c41a;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .date-picker-input {
          padding: 6px;
          border-radius: 4px;
          border: 1px solid #ddd;
          width: 150px;
        }
        
        /* Modal styles */
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
          background-color: white;
          padding: 25px;
          border-radius: 8px;
          width: 80%;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .modal-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        
        .info-card {
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        
        .design-files {
          margin-top: 20px;
        }
        
        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        
        .file-item {
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 4px;
        }
        
        .loading, .error {
          padding: 15px;
          text-align: center;
          margin: 20px 0;
          border-radius: 4px;
        }
        
        .loading {
          background-color: #f0f9ff;
          color: #4ab2ff;
        }
        
        .error {
          background-color: #fff0f6;
          color: #ff4a8d;
        }
         .status-select {
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background-color: #fff;
  font-weight: bold;
}

.status-pending {
  color: #e53935; /* Red */
  border-color: #e53935;
}

.status-inunit {
  color: #fb8c00; /* Orange */
  border-color: #fb8c00;
}

.status-completed {
  color: #43a047; /* Green */
  border-color: #43a047;
}
      `}</style>
        </div>
    );
};

export default DesignUpdates;