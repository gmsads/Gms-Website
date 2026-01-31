/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

function PendingService() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRemark, setEditingRemark] = useState(null);
  const [tempRemark, setTempRemark] = useState('');
  const [assignedToText, setAssignedToText] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [year, setYear] = useState(() => {
    const urlYear = searchParams.get('year');
    return urlYear ? parseInt(urlYear) : new Date().getFullYear();
  });
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    return urlMonth ? parseInt(urlMonth) - 1 : new Date().getMonth();
  });
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const tableContainerRef = useRef(null);
  
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
    { value: 'updated', label: 'Updated' },
    { value: 'completed', label: 'Completed' }
  ];

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

  useEffect(() => {
    const params = new URLSearchParams();
    
    if (year) {
      params.set('year', year.toString());
    }
    
    if (selectedMonth !== null) {
      params.set('month', (selectedMonth + 1).toString());
    }
    
    const currentParams = new URLSearchParams(window.location.search);
    if (params.toString() !== currentParams.toString()) {
      setSearchParams(params);
    }
  }, [year, selectedMonth, setSearchParams]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        params: {
          _: new Date().getTime()
        }
      });
      
      const allOrders = res.data.filter(order => 
        order.rows && order.rows.length > 0
      );
      
      const sortedOrders = allOrders.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date || new Date());
        const dateB = new Date(b.createdAt || b.date || new Date());
        return dateB - dateA;
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

    result = result.map(order => {
      const filteredRows = order.rows.filter(row => {
        try {
          const deliveryDate = new Date(row.deliveryDate);
          
          if (isNaN(deliveryDate.getTime())) return false;
          
          if (deliveryDate.getFullYear() !== year) {
            return false;
          }
          
          if (selectedMonth !== null && deliveryDate.getMonth() !== selectedMonth) {
            return false;
          }
          
          return true;
        } catch (e) {
          console.error('Error processing date:', row.deliveryDate, e);
          return false;
        }
      });

      return { ...order, rows: filteredRows };
    }).filter(order => order.rows.length > 0);

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
          
          if (statusFilter === 'updated') {
            return currentRemark.toLowerCase().includes('updated:');
          }
          
          if (statusFilter === 'completed') {
            return row.isCompleted === true || currentRemark.toLowerCase() === 'completed';
          }
          
          return currentRemark.toLowerCase() === statusFilter.toLowerCase();
        });
        
        return { ...order, rows: filteredRows };
      }).filter(order => order.rows.length > 0);
    }

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
      let assignedExecutive = '';
      let updateTimestamp = null;

      if (newRemark === 'assigned to') {
        if (!assignedToText.trim()) {
          alert('Please enter a name for "Assigned to"');
          return;
        }
        remarkValue = `assigned to ${assignedToText.trim()}`;
        assignedExecutive = assignedToText.trim();
      } 
      else if (newRemark === 'updated') {
        if (!updateDescription.trim()) {
          alert('Please enter an update description');
          return;
        }
        updateTimestamp = new Date().toISOString();
        const formattedTime = formatDateTime(updateTimestamp);
        remarkValue = `updated: ${updateDescription.trim()} (${formattedTime})`;
      }
      else if (newRemark === 'completed') {
        isCompleted = true;
        remarkValue = 'completed';
      }

      if (!remarkValue && newRemark !== 'completed' && newRemark !== 'updated') {
        alert('Please select a remark');
        return;
      }

      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order._id === orderId) {
            const updatedRows = order.rows.map((row, index) => 
              index === rowIndex 
                ? { 
                    ...row, 
                    remark: remarkValue,
                    assignedExecutive: assignedExecutive,
                    isCompleted: isCompleted,
                    updatedAt: new Date().toISOString(),
                    lastUpdateTime: updateTimestamp || row.lastUpdateTime
                  } 
                : row
            );

            const updatedOrder = {
              ...order,
              rows: updatedRows,
              updatedAt: new Date().toISOString()
            };

            return updatedOrder;
          }
          return order;
        }).sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || a.date || new Date());
          const dateB = new Date(b.updatedAt || b.createdAt || b.date || new Date());
          return dateB - dateA;
        })
      );

      const response = await axios.put(
        `/api/pending-services/${orderId}/row/${rowIndex}/remark`, 
        { 
          remark: remarkValue,
          assignedExecutive: assignedExecutive,
          isCompleted: isCompleted,
          lastUpdateTime: updateTimestamp
        }
      );

      if (!response.data.success) {
        fetchOrders();
        throw new Error(response.data.error || 'Update failed');
      }

      setEditingRemark(null);
      setAssignedToText('');
      setUpdateDescription('');
      
    } catch (err) {
      console.error('Update failed:', err);
      alert(`Failed to update: ${err.response?.data?.error || err.message}`);
      fetchOrders();
    }
  };

  const startEditingRemark = (orderId, rowIndex, currentRemark) => {
    const isRowCompleted = currentRemark === 'completed' || 
                          (orders.find(order => order._id === orderId)?.rows[rowIndex]?.isCompleted === true);
    
    if (isRowCompleted) {
      alert('This service is already completed and cannot be edited.');
      return;
    }
    
    setEditingRemark({ orderId, rowIndex });
    
    if (currentRemark && currentRemark.includes('assigned to')) {
      setTempRemark('assigned to');
      setAssignedToText(currentRemark.replace('assigned to', '').trim());
    } else if (currentRemark && currentRemark.includes('updated:')) {
      setTempRemark('updated');
      const descriptionMatch = currentRemark.match(/updated:\s*(.*?)\s*\(\d{2}-\d{2}-\d{4} \d{2}:\d{2}\)/);
      if (descriptionMatch && descriptionMatch[1]) {
        setUpdateDescription(descriptionMatch[1].trim());
      }
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
          'Service Assigned To': row.assignedExecutive || 'Not Assigned',
          'Remarks': row.remark || 'Pending',
          'Status': row.remark || 'Pending',
          'Is Completed': row.isCompleted ? 'Yes' : 'No',
          'Last Update Time': row.lastUpdateTime ? formatDateTime(row.lastUpdateTime) : 'Never Updated',
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

  const getRemarkStyle = (remark, isCompletedFlag = false) => {
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
      minWidth: '80px',
      textAlign: 'center',
      color: 'white',
      fontWeight: 'bold'
    };

    if (isCompletedFlag || remark === 'completed') {
      return {
        ...baseStyle,
        backgroundColor: '#2ecc71',
        cursor: 'default',
      };
    }

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

    if (remark.includes('updated:')) {
      return {
        ...baseStyle,
        backgroundColor: '#9b59b6',
        cursor: 'pointer',
      };
    }

    if (remark === 'design pending') {
      return {
        ...baseStyle,
        backgroundColor: '#e67e22',
        cursor: 'pointer',
      };
    }

    if (remark === 'printing') {
      return {
        ...baseStyle,
        backgroundColor: '#e74c3c',
        cursor: 'pointer',
      };
    }

    if (remark === 'installation pending') {
      return {
        ...baseStyle,
        backgroundColor: '#34495e',
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

  const isRowCompleted = (row) => {
    return row.isCompleted === true || row.remark === 'completed';
  };

  const resetToCurrentMonth = () => {
    const currentDate = new Date();
    setYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth());
  };

  // Column widths for better control
  const columnWidths = {
    sno: '60px',
    executive: '150px',
    business: '200px',
    customer: '150px',
    contact: '150px',
    requirement: '180px',
    qty: '80px',
    rate: '100px',
    total: '120px',
    deliveryDate: '130px',
    assignedTo: '150px',
    remarks: '200px',
    lastUpdateTime: '150px'
  };

  // Calculate left positions for sticky columns
  const getLeftPosition = (columnIndex) => {
    const widths = {
      0: parseInt(columnWidths.sno),
      1: parseInt(columnWidths.executive),
      2: parseInt(columnWidths.business),
      3: parseInt(columnWidths.customer)
    };
    
    let left = 0;
    for (let i = 0; i < columnIndex; i++) {
      left += widths[i];
    }
    return left;
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        Service Management
        {selectedMonth !== null && ` - ${monthLabels[selectedMonth]} ${year}`}
      </h2>

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
                value={selectedMonth + 1}
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
        <div style={styles.tableWrapper}>
          <div style={styles.tableContainer} ref={tableContainerRef}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  {/* Sticky columns */}
                  <th style={styles.stickyHeader(0, columnWidths.sno, getLeftPosition(0))}>S.No</th>
                  <th style={styles.stickyHeader(1, columnWidths.executive, getLeftPosition(1))}>Executive</th>
                  <th style={styles.stickyHeader(2, columnWidths.business, getLeftPosition(2))}>Business</th>
                  <th style={styles.stickyHeader(3, columnWidths.customer, getLeftPosition(3))}>Customer</th>
                  
                  {/* Regular columns */}
                  <th style={styles.regularHeader(columnWidths.contact)}>Contact</th>
                  <th style={styles.regularHeader(columnWidths.requirement)}>Requirement</th>
                  <th style={styles.regularHeader(columnWidths.qty)}>Qty</th>
                  <th style={styles.regularHeader(columnWidths.rate)}>Rate</th>
                  <th style={styles.regularHeader(columnWidths.total)}>Total</th>
                  <th style={styles.regularHeader(columnWidths.deliveryDate)}>Delivery Date</th>
                  <th style={styles.regularHeader(columnWidths.assignedTo)}>Service Assigned To</th>
                  <th style={styles.regularHeader(columnWidths.remarks)}>Remarks</th>
                  <th style={styles.regularHeader(columnWidths.lastUpdateTime)}>Last Update Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="13" style={styles.noData}>
                      No services found for {monthLabels[selectedMonth]} {year}
                      {statusFilter !== 'all' ? ` with status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"` : ''}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, orderIndex) =>
                    order.rows.map((row, rowIndex) => {
                      const isCompleted = isRowCompleted(row);
                      const rowBgColor = (orderIndex + rowIndex) % 2 === 0 ? '#ffffff' : '#f8f9fa';
                      const completedBgColor = '#d4edda';
                      const backgroundColor = isCompleted ? completedBgColor : rowBgColor;
                      
                      return (
                        <tr
                          key={`${order._id}-${rowIndex}`}
                          style={{
                            backgroundColor: backgroundColor,
                            ...(isCompleted && styles.completedRow),
                            ':hover': {
                              backgroundColor: isCompleted ? '#c3e6cb' : '#f1f5f9',
                            }
                          }}
                        >
                          {/* Sticky columns */}
                          <td style={styles.stickyCell(0, columnWidths.sno, getLeftPosition(0), backgroundColor)}>
                            {orderIndex + 1}
                          </td>
                          
                          <td style={styles.stickyCell(1, columnWidths.executive, getLeftPosition(1), backgroundColor)}>
                            <div style={styles.textCell}>
                              {order.executive}
                            </div>
                          </td>
                          
                          <td style={styles.stickyCell(2, columnWidths.business, getLeftPosition(2), backgroundColor)}>
                            <div style={styles.textCell}>
                              {order.business}
                            </div>
                          </td>
                          
                          <td style={styles.stickyCell(3, columnWidths.customer, getLeftPosition(3), backgroundColor)}>
                            <div style={styles.textCell}>
                              {order.contactPerson}
                            </div>
                          </td>
                          
                          {/* Regular columns */}
                          <td style={styles.regularTd(columnWidths.contact)}>
                            <div style={styles.textCell}>
                              {order.contactCode} {order.phone}
                            </div>
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.requirement)}>
                            <div style={styles.textCell}>
                              {row.requirement}
                            </div>
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.qty)}>
                            {row.quantity}
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.rate)}>
                            {row.rate}
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.total)}>
                            {row.total}
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.deliveryDate)}>
                            {formatDate(row.deliveryDate)}
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.assignedTo)}>
                            {row.assignedExecutive ? (
                              <span style={{
                                backgroundColor: '#e3f2fd',
                                color: '#1565c0',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                display: 'inline-block',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                              }}>
                                {row.assignedExecutive}
                              </span>
                            ) : (
                              <span style={{
                                color: '#666',
                                fontStyle: 'italic'
                              }}>
                                Not Assigned
                              </span>
                            )}
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.remarks)}>
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
                                  <option value="updated">Updated</option>
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

                                {tempRemark === 'updated' && (
                                  <div style={styles.updateContainer}>
                                    <textarea
                                      value={updateDescription}
                                      onChange={(e) => setUpdateDescription(e.target.value)}
                                      placeholder="Enter update description (what was done, progress, etc.)"
                                      style={styles.updateTextarea}
                                      rows="3"
                                    />
                                    <div style={styles.updateHint}>
                                      This update will be timestamped automatically
                                    </div>
                                  </div>
                                )}

                                <div style={styles.remarkButtons}>
                                  <button
                                    onClick={() => handleRemarkChange(order._id, rowIndex, tempRemark)}
                                    style={styles.saveButton}
                                    disabled={!tempRemark || (tempRemark === 'updated' && !updateDescription.trim())}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRemark(null);
                                      setAssignedToText('');
                                      setUpdateDescription('');
                                    }}
                                    style={styles.cancelButton}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => !isCompleted && startEditingRemark(order._id, rowIndex, row.remark || 'Pending')}
                                style={getRemarkStyle(row.remark || 'Pending', isCompleted)}
                                title={isCompleted ? "Completed - Cannot edit" : "Click to edit remark"}
                              >
                                {row.remark || 'Pending'}
                                {isCompleted && ' ✓'}
                              </div>
                            )}
                          </td>
                          
                          <td style={styles.regularTd(columnWidths.lastUpdateTime)}>
                            {row.lastUpdateTime ? formatDateTime(row.lastUpdateTime) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
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
    ':hover': {
      backgroundColor: '#c0392b',
    }
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
    ':hover': {
      backgroundColor: '#2980b9',
    }
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
  tableWrapper: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    backgroundColor: '#fff',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 300px)',
    backgroundColor: '#fff',
    position: 'relative',
    border: '1px solid #ddd',
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    minWidth: '1600px',
  },
  tableHeader: {
    backgroundColor: '#3498db',
    color: '#fff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  stickyHeader: (index, width, left) => ({
    padding: '12px 8px',
    textAlign: 'left',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.2)',
    position: 'sticky',
    left: `${left}px`,
    backgroundColor: '#3498db',
    zIndex: 100 + (index + 1) * 10,
    minWidth: width,
    width: width,
    boxShadow: '2px 0 3px rgba(0,0,0,0.1)',
    overflow: 'visible !important',
  }),
  regularHeader: (width) => ({
    padding: '12px 8px',
    textAlign: 'left',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(255,255,255,0.2)',
    minWidth: width,
    width: width,
  }),
  stickyCell: (index, width, left, backgroundColor) => ({
    padding: '12px 8px',
    borderBottom: '1px solid #eee',
    borderRight: '1px solid #eee',
    textAlign: 'left',
    position: 'sticky',
    left: `${left}px`,
    backgroundColor: backgroundColor,
    zIndex: 10 + (index + 1) * 10,
    minWidth: width,
    width: width,
    boxShadow: '2px 0 3px rgba(0,0,0,0.1)',
    verticalAlign: 'top',
    overflow: 'visible !important',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    maxWidth: width,
  }),
  regularTd: (width) => ({
    padding: '12px 8px',
    borderBottom: '1px solid #eee',
    borderRight: '1px solid #eee',
    textAlign: 'left',
    verticalAlign: 'top',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    minWidth: width,
    width: width,
    maxWidth: width,
  }),
  textCell: {
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  completedRow: {
    borderLeft: '4px solid #28a745',
  },
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
    ':hover': {
      backgroundColor: '#1abc9c',
    }
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
    ':hover': {
      backgroundColor: '#95a5a6',
    }
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
    ':hover': {
      backgroundColor: '#2980b9',
    }
  },
  remarkEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '250px',
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
  updateContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  updateTextarea: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '13px',
    resize: 'vertical',
    minHeight: '60px',
    fontFamily: 'Arial, sans-serif',
  },
  updateHint: {
    fontSize: '11px',
    color: '#666',
    fontStyle: 'italic',
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
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#218838',
    }
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
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#c82333',
    }
  },
};

export default PendingService;