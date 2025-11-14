/* eslint-disable react-hooks/exhaustive-deps */
// Disabling ESLint rule for exhaustive-deps to avoid dependency array warnings

// Import necessary React hooks and libraries
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

// Main PendingService component function
function PendingService() {
  // State to store all orders fetched from API
  const [orders, setOrders] = useState([]);
  
  // State to store orders after applying filters
  const [filteredOrders, setFilteredOrders] = useState([]);
  
  // State for search functionality
  const [searchTerm, setSearchTerm] = useState('');
  
  // State to track which remark is being edited (contains orderId and rowIndex)
  const [editingRemark, setEditingRemark] = useState(null);
  
  // State to store temporary remark value during editing
  const [tempRemark, setTempRemark] = useState('');
  
  // State to store the name when assigning service to someone
  const [assignedToText, setAssignedToText] = useState('');
  
  // React Router navigation hook
  const navigate = useNavigate();
  
  // Get current date for default filter values
  const currentDate = new Date();
  
  // State for year filter - default to current year
  const [year, setYear] = useState(currentDate.getFullYear());
  
  // State for month filter - default to current month (0-11 format)
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  
  // State for status filter - default to 'all'
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State for loading indicator
  const [loading, setLoading] = useState(true);
  
  // Array of month labels for display
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Available status options for filtering
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

  // Generate year options for dropdown (current year ± 5 years)
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    years.push(y);
  }

  // useEffect to fetch orders when component mounts
  useEffect(() => {
    fetchOrders();
  }, []); // Empty dependency array means run only once on mount

  // useEffect to apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [orders, year, selectedMonth, searchTerm, statusFilter]); // Re-run when these values change

  // Function to fetch orders from API
  const fetchOrders = async () => {
    // Set loading state to true to show loading indicator
    setLoading(true);
    try {
      // Make API request to get orders with cache buster parameter
      const res = await axios.get('/api/orders', {
        params: {
          _: new Date().getTime() // Cache buster to prevent caching
        }
      });
      
      // Filter orders to only include those with rows
      const allOrders = res.data.filter(order => 
        order.rows && order.rows.length > 0
      );
      
      // Sort orders by creation date (newest first)
      const sortedOrders = allOrders.sort((a, b) => {
        // Use createdAt, date, or current date as fallback
        const dateA = new Date(a.createdAt || a.date || new Date());
        const dateB = new Date(b.createdAt || b.date || new Date());
        return dateB - dateA; // Newest first (descending order)
      });
      
      // Update orders state with sorted data
      setOrders(sortedOrders);
    } catch (err) {
      // Log error if API call fails
      console.error('Error fetching orders:', err);
    } finally {
      // Always set loading to false when API call completes
      setLoading(false);
    }
  };

  // Function to apply all filters to orders
  const applyFilters = () => {
    // Return early if no orders available
    if (!orders.length) return;

    // Start with all orders
    let result = [...orders];

    // Filter by year and month based on delivery date
    result = result.map(order => {
      // Filter rows within each order
      const filteredRows = order.rows.filter(row => {
        try {
          // Parse delivery date from row
          const deliveryDate = new Date(row.deliveryDate);
          
          // Skip row if date is invalid
          if (isNaN(deliveryDate.getTime())) return false;
          
          // Check if row matches selected year
          if (deliveryDate.getFullYear() !== year) {
            return false;
          }
          
          // Check if row matches selected month
          if (selectedMonth !== null && deliveryDate.getMonth() !== selectedMonth) {
            return false;
          }
          
          // Return true if row passes all date filters
          return true;
        } catch (e) {
          // Log error and skip row if date parsing fails
          console.error('Error processing date:', row.deliveryDate, e);
          return false;
        }
      });

      // Return order with filtered rows (empty arrays will be removed later)
      return { ...order, rows: filteredRows };
    }).filter(order => order.rows.length > 0); // Remove orders with no matching rows

    // Apply status filter if not 'all'
    if (statusFilter !== 'all') {
      result = result.map(order => {
        // Filter rows based on status
        const filteredRows = order.rows.filter(row => {
          const currentRemark = row.remark || 'pending';
          
          // Handle 'pending' status filter
          if (statusFilter === 'pending') {
            return currentRemark === 'Pending' || currentRemark === 'pending' || !currentRemark;
          }
          
          // Handle 'assigned to' status filter
          if (statusFilter === 'assigned to') {
            return currentRemark.toLowerCase().includes('assigned to');
          }
          
          // Handle 'completed' status filter
          if (statusFilter === 'completed') {
            return currentRemark.toLowerCase() === 'completed';
          }
          
          // Handle other status filters with exact match
          return currentRemark.toLowerCase() === statusFilter.toLowerCase();
        });
        
        // Return order with status-filtered rows
        return { ...order, rows: filteredRows };
      }).filter(order => order.rows.length > 0); // Remove orders with no matching rows
    }

    // Apply search term filter if search term exists
    if (searchTerm) {
      result = result.map(order => {
        // Filter rows based on search term
        const filteredRows = order.rows.filter(row => {
          // Create array of all searchable values
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

          // Check if any value contains the search term (case-insensitive)
          return valuesToSearch.some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
          );
        });

        // Return order with search-filtered rows
        return { ...order, rows: filteredRows };
      }).filter(order => order.rows.length > 0); // Remove orders with no matching rows
    }

    // Update filteredOrders state with final result
    setFilteredOrders(result);
  };

  // Function to handle remark changes (status updates)
  const handleRemarkChange = async (orderId, rowIndex, newRemark) => {
    try {
      // Initialize variables for the update
      let remarkValue = newRemark;
      let isCompleted = false;
      let completedDate = null;
      let assignedExecutive = ''; // NEW: Store assigned executive name

      // Handle 'assigned to' remark type
      if (newRemark === 'assigned to') {
        // Validate that a name was entered
        if (!assignedToText.trim()) {
          alert('Please enter a name for "Assigned to"');
          return;
        }
        // Format the remark and store the executive name
        remarkValue = `assigned to ${assignedToText.trim()}`;
        assignedExecutive = assignedToText.trim(); // NEW: Store the name separately
      } 
      // Handle 'completed' remark type
      else if (newRemark === 'completed') {
        isCompleted = true;
        remarkValue = 'completed';
        completedDate = new Date().toISOString(); // Set completion timestamp
      }

      // Validate that a remark was selected (except for completed)
      if (!remarkValue && newRemark !== 'completed') {
        alert('Please select a remark');
        return;
      }

      // OPTIMISTIC UI UPDATE: Update the UI immediately without waiting for API
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order._id === orderId) {
            // Update the specific row that was modified
            const updatedRows = order.rows.map((row, index) => 
              index === rowIndex 
                ? { 
                    ...row, 
                    remark: remarkValue,
                    assignedExecutive: assignedExecutive, // NEW: Update assigned executive
                    isCompleted: isCompleted,
                    completedDate: completedDate,
                    updatedAt: new Date().toISOString() // Update timestamp for sorting
                  } 
                : row
            );

            // Create updated order with new rows
            const updatedOrder = {
              ...order,
              rows: updatedRows,
              updatedAt: new Date().toISOString() // Update order timestamp
            };

            return updatedOrder;
          }
          return order;
        }).sort((a, b) => {
          // Re-sort orders to keep newest updates on top
          const dateA = new Date(a.updatedAt || a.createdAt || a.date || new Date());
          const dateB = new Date(b.updatedAt || b.createdAt || b.date || new Date());
          return dateB - dateA; // Newest first
        })
      );

      // API CALL: Send update to server
      const response = await axios.put(
        `/api/pending-services/${orderId}/row/${rowIndex}/remark`, 
        { 
          remark: remarkValue,
          assignedExecutive: assignedExecutive, // NEW: Send assigned executive to API
          isCompleted: isCompleted,
          completedDate: completedDate
        }
      );

      // Check if API call was successful
      if (!response.data.success) {
        // If API failed, refresh data from server
        fetchOrders();
        throw new Error(response.data.error || 'Update failed');
      }

      // Reset editing state on success
      setEditingRemark(null);
      setAssignedToText('');
      
    } catch (err) {
      // Handle errors from API call
      console.error('Update failed:', err);
      alert(`Failed to update: ${err.response?.data?.error || err.message}`);
      // Refresh data to ensure UI matches server state
      fetchOrders();
    }
  };

  // Function to start editing a remark
  const startEditingRemark = (orderId, rowIndex, currentRemark) => {
    // Prevent editing if status is already completed
    if (currentRemark === 'completed') {
      return;
    }
    
    // Set which remark is being edited
    setEditingRemark({ orderId, rowIndex });
    
    // Pre-fill the form based on current remark
    if (currentRemark && currentRemark.includes('assigned to')) {
      setTempRemark('assigned to');
      // Extract the name from "assigned to [name]" format
      setAssignedToText(currentRemark.replace('assigned to', '').trim());
    } else {
      // For other remarks, use the current value (or empty if 'Pending')
      setTempRemark(currentRemark === 'Pending' ? '' : currentRemark || '');
    }
  };

  // Function to export data to Excel
  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData = [];
  
    // Loop through filtered orders and their rows
    filteredOrders.forEach((order, orderIndex) => {
      order.rows.forEach((row) => {
        // Create export object for each row
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
          'Service Assigned To': row.assignedExecutive || 'Not Assigned', // NEW: Include assigned executive in export
          'Remarks': row.remark || 'Pending',
          'Status': row.remark || 'Pending',
          'Completed Date': row.completedDate ? formatDateTime(row.completedDate) : 'Not Completed',
          'Balance': order.balance
        });
      });
    });
  
    // Create Excel worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PendingServices');
    
    // Download the Excel file
    XLSX.writeFile(workbook, `pending_services_${monthLabels[selectedMonth]}_${year}.xlsx`);
  };

  // Function to format date as DD-MM-YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      // Handle ISO date format
      if (dateString.includes('T')) {
        return dateString.split('T')[0];
      }
      
      // Parse date and format it
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch {
      // Return original string if formatting fails
      return dateString;
    }
  };

  // Function to format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      // Extract date and time components
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

  // Function to get CSS styles for different remark types
  const getRemarkStyle = (remark) => {
    // Base style for all remarks
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block',
      minWidth: '80px',
      textAlign: 'center',
      color: 'white',
      fontWeight: 'bold'
    };

    // Style for pending status
    if (!remark || remark === 'Pending' || remark === 'pending') {
      return {
        ...baseStyle,
        backgroundColor: '#f39c12', // Orange
        cursor: 'pointer',
      };
    }

    // Style for assigned status
    if (remark.includes('assigned to')) {
      return {
        ...baseStyle,
        backgroundColor: '#3498db', // Blue
        cursor: 'pointer',
      };
    }

    // Style for completed status
    if (remark === 'completed') {
      return {
        ...baseStyle,
        backgroundColor: '#2ecc71', // Green
        cursor: 'default', // No pointer since completed can't be edited
      };
    }

    // Style for design pending status
    if (remark === 'design pending') {
      return {
        ...baseStyle,
        backgroundColor: '#9b59b6', // Purple
        cursor: 'pointer',
      };
    }

    // Style for printing status
    if (remark === 'printing') {
      return {
        ...baseStyle,
        backgroundColor: '#e67e22', // Dark orange
        cursor: 'pointer',
      };
    }

    // Style for installation pending status
    if (remark === 'installation pending') {
      return {
        ...baseStyle,
        backgroundColor: '#e74c3c', // Red
        cursor: 'pointer',
      };
    }

    // Style for onboarding status
    if (remark === 'onboarding') {
      return {
        ...baseStyle,
        backgroundColor: '#1abc9c', // Teal
        cursor: 'pointer',
      };
    }

    // Default style for unknown status
    return {
      ...baseStyle,
      backgroundColor: '#95a5a6', // Gray
      cursor: 'pointer',
    };
  };

  // Function to check if a remark indicates completed status
  const isCompleted = (remark) => {
    return remark === 'completed';
  };

  // Function to reset filters to current month
  const resetToCurrentMonth = () => {
    const currentDate = new Date();
    setYear(currentDate.getFullYear());
    setSelectedMonth(currentDate.getMonth());
  };

  // Main component render
  return (
    <div style={styles.container}>
      {/* Page title */}
      <h2 style={styles.title}>Service Management</h2>

      {/* Filter and search section */}
      <div style={styles.filterContainer}>
        {/* Search input */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by executive, business, customer, requirement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        {/* Filter controls row */}
        <div style={styles.filterRow}>
          {/* Year and month filters */}
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
                value={selectedMonth + 1} // Convert from 0-11 to 1-12 for display
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
            
            {/* Reset to current month button */}
            <button 
              onClick={resetToCurrentMonth}
              style={styles.currentMonthButton}
              title="Reset to current month"
            >
              Current Month
            </button>
          </div>

          {/* Status filter */}
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
            
            {/* Clear status filter button (only shown when filter is active) */}
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

        {/* Current filter information display */}
        <div style={styles.currentFilterInfo}>
          Currently showing: <strong>{monthLabels[selectedMonth]} {year}</strong>
          {statusFilter !== 'all' && (
            <span> | Status: <strong>{statusOptions.find(opt => opt.value === statusFilter)?.label}</strong></span>
          )}
        </div>
      </div>

      {/* Main content - loading or data table */}
      {loading ? (
        <div style={styles.loading}>Loading service data...</div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.tableHeader}>
              <tr>
                {/* Table headers */}
                {[
                  'S.No', 'Executive', 'Business', 'Customer', 'Contact',
                  'Requirement', 'Qty', 'Rate', 'Total', 
                  'Delivery Date', 'Service Assigned To', 'Remarks', 'Completed Date' // UPDATED: Added 'Service Assigned To' column
                ].map((header) => (
                  <th key={header} style={styles.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* No data message */}
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="13" style={styles.noData}> {/* UPDATED: colSpan from 12 to 13 */}
                    No services found for {monthLabels[selectedMonth]} {year}
                    {statusFilter !== 'all' ? ` with status "${statusOptions.find(opt => opt.value === statusFilter)?.label}"` : ''}
                  </td>
                </tr>
              ) : (
                /* Data rows */
                filteredOrders.map((order, orderIndex) =>
                  order.rows.map((row, rowIndex) => (
                    <tr
                      key={`${order._id}-${rowIndex}`}
                      style={styles.tableRow(orderIndex + rowIndex)}
                    >
                      {/* Row data cells */}
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
                      
                      {/* NEW: Service Assigned To column */}
                      <td style={styles.td}>
                        {row.assignedExecutive ? (
                          <span style={{
                            backgroundColor: '#e3f2fd',
                            color: '#1565c0',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            display: 'inline-block'
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
                      
                      {/* Remarks column with edit functionality */}
                      <td style={styles.td}>
                        {editingRemark?.orderId === order._id && editingRemark?.rowIndex === rowIndex ? (
                          /* Remark editor when editing */
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
                            
                            {/* Show name input when 'assigned to' is selected */}
                            {tempRemark === 'assigned to' && (
                              <input
                                type="text"
                                value={assignedToText}
                                onChange={(e) => setAssignedToText(e.target.value)}
                                placeholder="Enter name"
                                style={styles.assignedInput}
                              />
                            )}

                            {/* Save and cancel buttons */}
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
                          /* Display remark when not editing */
                          <div 
                            onClick={() => startEditingRemark(order._id, rowIndex, row.remark || 'Pending')}
                            style={getRemarkStyle(row.remark || 'Pending')}
                            title={isCompleted(row.remark) ? "Completed - Cannot edit" : "Click to edit remark"}
                          >
                            {row.remark || 'Pending'}
                          </div>
                        )}
                      </td>
                      
                      {/* Completed date column */}
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

      {/* Action buttons footer */}
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

// CSS styles object for the component
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

// Add hover effects to buttons
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

// Export the component as default
export default PendingService;