import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays } from 'date-fns';

const Followup = () => {
    const [followups, setFollowups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [currentClientId, setCurrentClientId] = useState(null);

    const today = new Date().toISOString().split('T')[0];
    const [dateFilter, setDateFilter] = useState(today);
    const executiveName = localStorage.getItem('userName') || 'Executive';

    // Add the missing getStatusStyle function
    const getStatusStyle = (status) => {
        const baseStyle = {
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '500',
            display: 'inline-block'
        };

        switch(status) {
            case 'sale closed':
                return { ...baseStyle, backgroundColor: '#d4edda', color: '#155724' };
            case 'not interested':
                return { ...baseStyle, backgroundColor: '#f8d7da', color: '#721c24' };
            case 'next month':
                return { ...baseStyle, backgroundColor: '#fff3cd', color: '#856404' };
            case 'followup':
                return { ...baseStyle, backgroundColor: '#cce5ff', color: '#004085' };
            default:
                return { ...baseStyle, backgroundColor: '#e2e3e5', color: '#383d41' };
        }
    };

    useEffect(() => {
        fetchFollowups();
    }, [dateFilter]);

    const fetchFollowups = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/prospective-clients', {
                params: { userName: executiveName, followUpDate: dateFilter }
            });
            setFollowups(response.data);
            setError('');
        } catch (err) {
            console.error('Error fetching followups:', err);
            setError('Failed to load followups');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (id, status) => {
        if (status === 'followup') {
            setCurrentClientId(id);
            setSelectedDate(format(addDays(new Date(), 3), 'yyyy-MM-dd'));
            setShowDatePicker(true);
        } else {
            updateStatus(id, status);
        }
    };

    const updateStatus = async (id, status, date = null) => {
        try {
            await axios.patch(`/api/prospective-clients/${id}`, {
                status,
                ...(date && { followUpDate: date })
            });
            fetchFollowups();
        } catch (err) {
            console.error('Error updating status:', err);
            setError('Failed to update status');
        }
    };

    const handleDateConfirm = () => {
        if (selectedDate) {
            updateStatus(currentClientId, 'followup', selectedDate);
            setShowDatePicker(false);
        }
    };

    return (
        <div className="container">
            <h2 className="title">{executiveName}'s Follow-up Records</h2>

            <div className="filter-container">
                <label htmlFor="dateFilter" className="filter-label">Select Date:</label>
                <input
                    type="date"
                    id="dateFilter"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="date-input"
                    max={today}
                />
                <div className="selected-date">
                    Showing follow-ups for: {new Date(dateFilter).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {showDatePicker && (
                <div className="modal">
                    <h3>Set Next Follow-up Date</h3>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={today}
                    />
                    <button onClick={handleDateConfirm}>Confirm</button>
                    <button onClick={() => setShowDatePicker(false)}>Cancel</button>
                </div>
            )}

            {loading ? (
                <div className="loading-message">Loading followups...</div>
            ) : followups.length === 0 ? (
                <div className="empty-message">
                    No followup records found for {new Date(dateFilter).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Business Name</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th>Current Follow-up Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {followups.map((client) => (
                                <tr key={client._id} className={followups.indexOf(client) % 2 === 0 ? "even-row" : "odd-row"}>
                                    <td>{client.businessName}</td>
                                    <td>{client.contactPerson}</td>
                                    <td>{client.phoneNumber}</td>
                                    <td>
                                        {client.followUpDate ? format(new Date(client.followUpDate), 'MMM dd, yyyy') : 'N/A'}
                                    </td>
                                    <td>
                                        <span style={getStatusStyle(client.status)}>
                                            {client.status || 'New'}
                                        </span>
                                    </td>
                                    <td>
                                        <select 
                                            value=""
                                            onChange={(e) => handleStatusChange(client._id, e.target.value)}
                                            className="status-select"
                                        >
                                            <option value="">Update Status</option>
                                            <option value="sale closed">Sale Closed</option>
                                            <option value="not interested">Not Interested</option>
                                            <option value="next month">Next Month</option>
                                            <option value="followup">Follow Up</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <style jsx>{`
                .container {
                    padding: 2rem;
                    max-width: 100%;
                    margin: auto;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    position: relative;
                }
                .title {
                    font-size: 1.8rem;
                    color: #2c3e50;
                    font-weight: 600;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                .filter-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                .filter-label {
                    font-weight: 500;
                    color: #34495e;
                }
                .date-input {
                    padding: 0.5rem;
                    border: 1px solid #bdc3c7;
                    border-radius: 4px;
                    font-size: 1rem;
                }
                .selected-date {
                    font-weight: 500;
                    color: #3498db;
                    margin-left: auto;
                }
                .error-message {
                    color: #e74c3c;
                    background-color: #fadbd8;
                    padding: 1rem;
                    border-left: 4px solid #e74c3c;
                    border-radius: 4px;
                    margin-bottom: 1.5rem;
                }
                .loading-message, .empty-message {
                    text-align: center;
                    padding: 2rem;
                    font-size: 1.1rem;
                    color: #7f8c8d;
                }
                .table-container {
                    overflow-x: auto;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                }
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.95rem;
                }
                .data-table th {
                    background-color: #3498db;
                    color: white;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 500;
                }
                .data-table td {
                    padding: 1rem;
                    border-bottom: 1px solid #ecf0f1;
                }
                .even-row {
                    background-color: white;
                }
                .odd-row {
                    background-color: #f8f9fa;
                }
                .data-table tr:hover {
                    background-color: #e8f4fc;
                }
                .status-select {
                    padding: 6px 10px;
                    border-radius: 4px;
                    border: 1px solid #ddd;
                    cursor: pointer;
                }
                .status-select:focus {
                    outline: none;
                    border-color: #3498db;
                }
                .modal {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    z-index: 1000;
                }
                .modal h3 {
                    margin-top: 0;
                    margin-bottom: 1rem;
                }
                .modal input[type="date"] {
                    width: 100%;
                    padding: 0.75rem;
                    margin-bottom: 1rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .modal button {
                    padding: 0.5rem 1rem;
                    margin-right: 0.5rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .modal button:first-child {
                    background: #3498db;
                    color: white;
                }
                .modal button:last-child {
                    background: #e74c3c;
                    color: white;
                }
                @media (max-width: 768px) {
                    .container {
                        padding: 1rem;
                    }
                    .data-table {
                        font-size: 0.85rem;
                    }
                    .data-table th, .data-table td {
                        padding: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Followup;