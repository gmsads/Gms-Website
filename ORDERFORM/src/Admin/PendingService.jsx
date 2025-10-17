/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

function PendingService() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRemark, setEditingRemark] = useState(null);
  const [tempRemark, setTempRemark] = useState('');
  const [assignedToText, setAssignedToText] = useState('');
  const navigate = useNavigate();
  
  // Filter states - default to current month and year
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // Current month (0-11)
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'assigned to', label: 'Assigned' },
    { value: 'design pending', label: 'Design Pending' },
    { value: 'printing', label: 'Printing' },
    { value: 'installation pending', label: 'Installation Pending' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'completed', label: 'Completed' }
  ];

  // Generate year options
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, year, selectedMonth, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        params: {
          _: new Date().getTime() // Cache buster
        }
      });
      
      // Modified to include ALL orders (both pending and completed)
      const allOrders = res.data.filter(order => 
        order.rows && order.rows.length > 0
      );
      
      // Sort orders by creation date (newest first) to show new services on top
      const sortedOrders = allOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || new Date());
        const dateB = new Date(b.createdAt || b.date || new Date());
        return dateB - dateA; // Newest first
      });
      
      setOrders(sortedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!orders.length) return;

    let result = [...orders];

    // Filter by year and month - default to current month
    result = result.map(order => {
      const filteredRows = order.rows.filter(row => {
        try {
          // Parse delivery date consistently
          const deliveryDate = new Date(row.deliveryDate);
          if (isNaN(deliveryDate.getTime())) return false; // Hide if invalid date
          
          // Check year filter
          if (deliveryDate.getFullYear() !== year) {
            return false;
          }
          
          // Check month filter - default to current month
          if (selectedMonth !== null && deliveryDate.getMonth() !== selectedMonth) {
            return false;
          }
          
          return true;
        } catch (e) {
          console.error('Error processing date:', row.deliveryDate, e);
          return false; // Hide row if date parsing fails
        }
      });

      return { ...order, rows: filteredRows };
    }).filter(order => order.rows.length > 0);

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.map(order => {
        const filteredRows = order.rows.filter(row => {
          const currentRemark = row.remark || 'pending';
          if (statusFilter === 'pending') {
            return currentRemark === 'Pending' || currentRemark === 'pending' || !currentRemark;
          }
          if (statusFilter === 'assigned to') {
            return currentRemark.toLowerCase().includes('assigned to');
          }
          if (statusFilter === 'completed') {
            return currentRemark.toLowerCase() === 'completed';
          }
          return currentRemark.toLowerCase() === statusFilter.toLowerCase();
        });
        return { ...order, rows: filteredRows };
      }).filter(order => order.rows.length > 0);
    }

    // Apply search term filter if exists
    if (searchTerm) {
      result = result.map(order => {
        const filteredRows = order.rows.filter(row => {
          const valuesToSearch = [
            order.executive,
            order.business,
            order.contactPerson,
            `${order.contactCode} ${order.phone}`,
            row.requirement,
            row.quantity,
            row.rate,
            row.total,
            row.deliveryDate,
            row.remark || 'Pending',
            order.balance,
          ];

          return valuesToSearch.some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
          );
        });

        return { ...order, rows: filteredRows };
      }).filter(order => order.rows.length > 0);
    }

    setFilteredOrders(result);
  };

  const handleRemarkChange = async (orderId, rowIndex, newRemark) => {
    try {
      let remarkValue = newRemark;
      let isCompleted = false;
      let completedDate = null;
      
      if (newRemark === 'assigned to') {
        if (!assignedToText.trim()) {
          alert('Please enter a name for "Assigned to"');
          return;
        }
        remarkValue = `assigned to ${assignedToText.trim()}`;
      } 
      else if (newRemark === 'completed') {
        isCompleted = true;
        remarkValue = 'completed';
        completedDate = new Date().toISOString(); // Set completion date
      }

      if (!remarkValue && newRemark !== 'completed') {
        alert('Please select a remark');
        return;
      }

      // Optimistic UI update - update the specific row
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order._id === orderId) {
            const updatedRows = order.rows.map((row, index) => 
              index === rowIndex 
                ? { 
                    ...row, 
                    remark: remarkValue,
                    isCompleted: isCompleted,
                    completedDate: completedDate,
                    updatedAt: new Date().toISOString() // Update timestamp for sorting
                  } 
                : row
            );

            const updatedOrder = {
              ...order,
              rows: updatedRows,
              updatedAt: new Date().toISOString() // Update order timestamp
            };

            return updatedOrder;
          }
          return order;
        }).sort((a, b) => {
          // Re-sort after update to keep newest on top
          const dateA = new Date(a.updatedAt || a.createdAt || a.date || new Date());
          const dateB = new Date(b.updatedAt || b.createdAt || b.date || new Date());
          return dateB - dateA;
        })
      );

      // API call
      const response = await axios.put(
        `/api/pending-services/${orderId}/row/${rowIndex}/remark`, 
        { 
          remark: remarkValue,
          isCompleted: isCompleted,
          completedDate: completedDate
        }
      );

      if (!response.data.success) {
        // Refresh if API fails
        fetchOrders();
        throw new Error(response.data.error || 'Update failed');
      }

      setEditingRemark(null);
      setAssignedToText('');
      
    } catch (err) {
      console.error('Update failed:', err);
      alert(`Failed to update: ${err.response?.data?.error || err.message}`);
      fetchOrders();
    }
  };

  const startEditingRemark = (orderId, rowIndex, currentRemark) => {
    // Don't allow editing if status is completed
    if (currentRemark === 'completed') {
      return;
    }
    
    setEditingRemark({ orderId, rowIndex });
    
    if (currentRemark && currentRemark.includes('assigned to')) {
      setTempRemark('assigned to');
      setAssignedToText(currentRemark.replace('assigned to', '').trim());
    } else {
      setTempRemark(currentRemark === 'Pending' ? '' : currentRemark || '');
    }
  };

  const handleExportToExcel = () => {
    const exportData = [];
  
    filteredOrders.forEach((order, orderIndex) => {
      order.rows.forEach((row) => {
        exportData.push({
          'S.No': orderIndex + 1,
          'Executive': order.executive,
          'Business': order.business,
          'Customer': order.contactPerson,
          'Contact': `${order.contactCode} ${order.phone}`,
          'Requirement': row.requirement,
          'Qty': row.quantity,
          'Rate': row.rate,
          'Total': row.total,
          'Delivery Date': formatDate(row.deliveryDate),
          'Remarks': row.remark || 'Pending',
          'Status': row.remark || 'Pending',
          'Completed Date': row.completedDate ? formatDateTime(row.completedDate) : 'Not Completed',
          'Balance': order.balance
        });
      });
    });
  
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingServices');
    XLSX.writeFile(workbook, `pending_services_${monthLabels[selectedMonth]}_${year}.xlsx`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      if (dateString.includes('T')) {
        return dateString.split('T')[0];
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const getRemarkStyle = (remark) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
      minWidth: '80px',
      textAlign: 'center',
      color: 'white',
      fontWeight: 'bold'
    };

    if (!remark || remark === 'Pending' || remark === 'pending') {
      return {
        ...baseStyle,
        backgroundColor: '#f39c12',
        cursor: 'pointer',
      };
    }

    if (remark.includes('assigned to')) {
      return {
        ...baseStyle,
        backgroundColor: '#3498db',
        cursor: 'pointer',
      };
    }

    if (remark === 'completed') {
      return {
        ...baseStyle,
        backgroundColor: '#2ecc71',
        cursor: 'default',
      };
    }

    if (remark === 'design pending') {
      return {
        ...baseStyle,
        backgroundColor: '#9b59b6',
        cursor: 'pointer',
      };
    }

    if (remark === 'printing') {
      return {
        ...baseStyle,
        backgroundColor: '#e67e22',
        cursor: 'pointer',
      };
    }

    if (remark === 'installation pending') {
      return {
        ...baseStyle,
        backgroundColor: '#e74c3c',
        cursor: 'pointer',
      };
    }

    if (remark === 'onboarding') {
      return {
        ...baseStyle,
        backgroundColor: '#1abc9c',
        cursor: 'pointer',
      };
    }

    return {
      ...baseStyle,
      backgroundColor: '#95a5a6',
      cursor: 'pointer',
    };
  };

  const isCompleted = (remark) => {
    return remark === 'completed';
  };

  const resetToCurrentMonth = () => {
    const currentDate = new Date();
    setYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth());
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Service Management</h2>

      {/* Year and Month Selector */}
      <div style={styles.filterContainer}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by executive, business, customer, requirement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <div style={styles.filterRow}>
          <div style={styles.yearMonthContainer}>
            <div style={styles.selectWrapper}>
              <label htmlFor="year-select" style={styles.filterLabel}>
                Year:
              </label>
              <select
                id="year-select"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={styles.filterSelect}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.selectWrapper}>
              <label htmlFor="month-select" style={styles.filterLabel}>
                Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth + 1} // Convert back to 1-12 for select
                onChange={(e) => setSelectedMonth(parseInt(e.target.value) - 1)}
                style={styles.filterSelect}
              >
                {monthLabels.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={resetToCurrentMonth}
              style={styles.currentMonthButton}
              title="Reset to current month"
            >
              Current Month
            </button>
          </div>

          <div style={styles.statusFilterContainer}>
            <div style={styles.selectWrapper}>
              <label htmlFor="status-filter" style={styles.filterLabel}>
                Status:
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={styles.filterSelect}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {statusFilter !== 'all' && (
              <button 
                onClick={() => setStatusFilter('all')}
                style={styles.clearFilterButton}
              >
                Clear Status
              </button>
            )}
          </div>
        </div>

        <div style={styles.currentFilterInfo}>
          Currently showing: <strong>{monthLabels[selectedMonth]} {year}</strong>
          {statusFilter !== 'all' && (
            <span> | Status: <strong>{statusOptions.find(opt => opt.value === statusFilter)?.label}</strong></span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading service data...</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                {[
                  'S.No', 'Executive', 'Business', 'Customer', 'Contact',
                  'Requirement', 'Qty', 'Rate', 'Total', 
                  'Delivery Date', 'Remarks', 'Completed Date'
                ].map((header) => (
                  <th key={header} style={styles.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="12" style={styles.noData}>
                    No services found for {monthLabels[selectedMonth]} {year}
                    {statusFilter !== 'all' ? ` with status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"` : ''}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, orderIndex) =>
                  order.rows.map((row, rowIndex) => (
                    <tr
                      key={`${order._id}-${rowIndex}`}
                      style={styles.tableRow(orderIndex + rowIndex)}
                    >
                      <td style={styles.td}>{orderIndex + 1}</td>
                      <td style={styles.td}>{order.executive}</td>
                      <td style={styles.td}>{order.business}</td>
                      <td style={styles.td}>{order.contactPerson}</td>
                      <td style={styles.td}>{order.contactCode} {order.phone}</td>
                      <td style={styles.td}>{row.requirement}</td>
                      <td style={styles.td}>{row.quantity}</td>
                      <td style={styles.td}>{row.rate}</td>
                      <td style={styles.td}>{row.total}</td>
                      <td style={styles.td}>{formatDate(row.deliveryDate)}</td>
                      <td style={styles.td}>
                        {editingRemark?.orderId === order._id && editingRemark?.rowIndex === rowIndex ? (
                          <div style={styles.remarkEditor}>
                            <select
                              value={tempRemark}
                              onChange={(e) => setTempRemark(e.target.value)}
                              style={styles.remarkSelect}
                            >
                              <option value="">Select Remark</option>
                              <option value="completed">Completed</option>
                              <option value="assigned to">Assigned to</option>
                              <option value="design pending">Design pending</option>
                              <option value="printing">Printing</option>
                              <option value="installation pending">Installation pending</option>
                              <option value="onboarding">Onboarding</option>
                            </select>
                            
                            {tempRemark === 'assigned to' && (
                              <input
                                type="text"
                                value={assignedToText}
                                onChange={(e) => setAssignedToText(e.target.value)}
                                placeholder="Enter name"
                                style={styles.assignedInput}
                              />
                            )}

                            <div style={styles.remarkButtons}>
                              <button
                                onClick={() => handleRemarkChange(order._id, rowIndex, tempRemark)}
                                style={styles.saveButton}
                                disabled={!tempRemark}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRemark(null);
                                  setAssignedToText('');
                                }}
                                style={styles.cancelButton}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => startEditingRemark(order._id, rowIndex, row.remark || 'Pending')}
                            style={getRemarkStyle(row.remark || 'Pending')}
                            title={isCompleted(row.remark) ? "Completed - Cannot edit" : "Click to edit remark"}
                          >
                            {row.remark || 'Pending'}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {row.completedDate ? formatDateTime(row.completedDate) : '-'}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.footerButtons}>
        <button onClick={handleExportToExcel} style={styles.excelButton}>
          Export to Excel
        </button>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          Back
        </button>
        <button onClick={fetchOrders} style={styles.refreshButton}>
          Refresh Data
        </button>
        <button onClick={resetToCurrentMonth} style={styles.currentMonthButton}>
          Show Current Month
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    textAlign: 'center',
    margin: '0 0 20px 0',
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: '600',
  },
  filterContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  searchInput: {
    padding: '10px 15px',
    width: '100%',
    maxWidth: '500px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
  },
  yearMonthContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
  },
  statusFilterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
  },
  selectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  clearFilterButton: {
    padding: '8px 12px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  currentMonthButton: {
    padding: '8px 12px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  currentFilterInfo: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#e8f4fd',
    borderRadius: '4px',
    color: '#2c3e50',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#7f8c8d',
    fontSize: '16px',
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: '#7f8c8d',
    fontSize: '16px',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    fontSize: '14px',
  },
  tableHeader: {
    backgroundColor: '#3498db',
    color: '#fff',
  },
  th: {
    padding: '12px 8px',
    textAlign: 'left',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.1)',
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  tableRow: (index) => ({
    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
    ':hover': {
      backgroundColor: '#f1f5f9',
    },
  }),
  footerButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  excelButton: {
    backgroundColor: '#16a085',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  backButton: {
    backgroundColor: '#7f8c8d',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  refreshButton: {
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  remarkEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '200px',
  },
  remarkSelect: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
  },
  assignedInput: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
  },
  remarkButtons: {
    display: 'flex',
    gap: '8px',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
  },
};

// Add hover effects
Object.assign(styles.clearFilterButton, {
  ':hover': {
    backgroundColor: '#c0392b',
  }
});

Object.assign(styles.currentMonthButton, {
  ':hover': {
    backgroundColor: '#2980b9',
  }
});

Object.assign(styles.excelButton, {
  ':hover': {
    backgroundColor: '#1abc9c',
  }
});

Object.assign(styles.backButton, {
  ':hover': {
    backgroundColor: '#95a5a6',
  }
});

Object.assign(styles.refreshButton, {
  ':hover': {
    backgroundColor: '#2980b9',
  }
});

Object.assign(styles.saveButton, {
  ':hover': {
    backgroundColor: '#218838',
  }
});

Object.assign(styles.cancelButton, {
  ':hover': {
    backgroundColor: '#c82333',
  }
});

export default PendingService;