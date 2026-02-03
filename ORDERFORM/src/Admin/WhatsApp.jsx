import React, { useState, useEffect } from "react";
import { FaWhatsapp, FaArrowLeft, FaTimes, FaSearch, FaSync, FaCalendarAlt, FaRupeeSign } from "react-icons/fa";
import axios from "axios";

const WhatsAppFollowUp = ({ onClose }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Month and year options
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020 to 2030

  // Calculate total amount from order rows
  const calculateTotalAmount = (order) => {
    let totalAmount = 0;
    
    // Check if order has rows array
    if (order.rows && Array.isArray(order.rows) && order.rows.length > 0) {
      // Sum up all row totals
      totalAmount = order.rows.reduce((sum, row) => {
        const rowAmount = row.total || row.amount || row.price || 0;
        return sum + (parseFloat(rowAmount) || 0);
      }, 0);
    }
    
    // If no rows or rows total is 0, check direct amount fields
    if (totalAmount === 0) {
      // Check multiple possible amount fields
      if (order.totalAmount !== undefined && order.totalAmount !== null) {
        totalAmount = parseFloat(order.totalAmount) || 0;
      } else if (order.amount !== undefined && order.amount !== null) {
        totalAmount = parseFloat(order.amount) || 0;
      } else if (order.finalAmount !== undefined && order.finalAmount !== null) {
        totalAmount = parseFloat(order.finalAmount) || 0;
      } else if (order.grandTotal !== undefined && order.grandTotal !== null) {
        totalAmount = parseFloat(order.grandTotal) || 0;
      } else if (order.total !== undefined && order.total !== null) {
        totalAmount = parseFloat(order.total) || 0;
      }
    }
    
    return totalAmount;
  };

  // Calculate balance amount
  const calculateBalance = (order, totalAmount) => {
    let balance = 0;
    
    // First try the balance field
    if (order.balance !== undefined && order.balance !== null) {
      balance = parseFloat(order.balance) || 0;
    }
    // If balance is 0 but we have totalAmount, check payment history
    else if (totalAmount > 0 && order.paymentHistory && Array.isArray(order.paymentHistory)) {
      const totalPaid = order.paymentHistory.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0);
      }, 0);
      balance = totalAmount - totalPaid;
    }
    // Otherwise calculate from advance amount if available
    else if (order.advanceAmount !== undefined && order.advanceAmount !== null) {
      const advance = parseFloat(order.advanceAmount) || 0;
      balance = totalAmount - advance;
    }
    
    return balance;
  };

  // Fetch orders for selected month/year
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
      
      console.log(`Fetching orders for ${monthNames[selectedMonth-1]} ${selectedYear}...`);
      const response = await axios.get(`/api/orders?${params.toString()}`);
      
      console.log(`Found ${response.data?.length || 0} total orders`);
      
      // Debug: Check first order structure
      if (response.data && response.data.length > 0) {
        console.log('First order structure:', {
          keys: Object.keys(response.data[0]),
          amountFields: Object.keys(response.data[0]).filter(key => 
            key.toLowerCase().includes('amount') || 
            key.toLowerCase().includes('total') || 
            key.toLowerCase().includes('balance')
          ),
          hasRows: response.data[0].rows ? `Rows: ${response.data[0].rows.length}` : 'No rows',
          rowsStructure: response.data[0].rows ? response.data[0].rows[0] : null
        });
      }
      
      if (response.data && Array.isArray(response.data)) {
        // Process orders
        const processedOrders = response.data
          .filter(order => {
            // Filter for Retail orders
            const clientType = (order.clientType || '').toLowerCase();
            return clientType === 'retail' || 
                   !['agent', 'renewal', 'renewal-agent'].includes(clientType) ||
                   !order.clientType; // If no clientType, assume retail
          })
          .map((order, index) => {
            // Extract name from various possible fields
            let clientName = 'Unknown Client';
            if (order.clientName) clientName = order.clientName;
            else if (order.customerName) clientName = order.customerName;
            else if (order.contactPerson) clientName = order.contactPerson;
            else if (order.name) clientName = order.name;
            
            // Extract phone from various possible fields
            let phone = 'Not provided';
            if (order.phone) phone = order.phone;
            else if (order.mobile) phone = order.mobile;
            else if (order.contactNumber) phone = order.contactNumber;
            
            // Extract business from various possible fields
            let business = 'Retail Business';
            if (order.business) business = order.business;
            else if (order.company) business = order.company;
            else if (order.businessName) business = order.businessName;
            
            // Calculate total amount
            const totalAmount = calculateTotalAmount(order);
            
            // Calculate balance
            const balance = calculateBalance(order, totalAmount);
            
            // Format date
            let orderDate = 'N/A';
            let rawDate = null;
            if (order.orderDate) {
              rawDate = new Date(order.orderDate);
              orderDate = rawDate.toLocaleDateString('en-IN');
            } else if (order.createdAt) {
              rawDate = new Date(order.createdAt);
              orderDate = rawDate.toLocaleDateString('en-IN');
            }
            
            return {
              id: order._id || `temp-${index}`,
              orderNumber: order.orderNo || `ORD-${String(index + 1).padStart(3, '0')}`,
              clientName: clientName.trim(),
              phone: phone,
              business: business,
              orderDate: orderDate,
              rawOrderDate: rawDate,
              requirement: order.requirement || order.serviceDetails || order.description || 'No requirement specified',
              followUpStatus: order.followUpStatus || 'pending',
              lastFollowUp: order.lastFollowUpDate ? new Date(order.lastFollowUpDate).toLocaleDateString('en-IN') : 'Not contacted',
              amount: totalAmount,
              balance: balance,
              clientType: order.clientType || 'Retail',
              status: order.status || 'active',
              leadSource: order.leadSource || 'Unknown',
              executive: order.executive || 'Unknown',
              rowsCount: order.rows ? order.rows.length : 0,
              debugInfo: {
                totalCalculated: totalAmount,
                balanceCalculated: balance,
                originalTotalAmount: order.totalAmount,
                originalAmount: order.amount,
                originalBalance: order.balance,
                hasRows: !!order.rows,
                rowsLength: order.rows ? order.rows.length : 0
              }
            };
          });
        
        console.log(`Processed ${processedOrders.length} retail orders`);
        console.log('Sample processed order:', processedOrders[0]);
        
        // Sort by date (newest first)
        processedOrders.sort((a, b) => {
          if (!a.rawOrderDate || !b.rawOrderDate) return 0;
          return b.rawOrderDate - a.rawOrderDate;
        });
        
        setOrders(processedOrders);
        setFilteredOrders(processedOrders);
        
        if (processedOrders.length === 0) {
          setError(`No retail orders found for ${monthNames[selectedMonth-1]} ${selectedYear}`);
        } else {
          setError(null);
        }
      } else {
        setError('Invalid response from server');
        setOrders([]);
        setFilteredOrders([]);
      }
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(`Failed to load orders: ${err.message}`);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedMonth, selectedYear]);

  // Apply search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = orders.filter(order =>
      order.clientName.toLowerCase().includes(searchLower) ||
      order.business.toLowerCase().includes(searchLower) ||
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.phone.includes(searchTerm) ||
      (order.requirement && order.requirement.toLowerCase().includes(searchLower)) ||
      (order.leadSource && order.leadSource.toLowerCase().includes(searchLower)) ||
      (order.executive && order.executive.toLowerCase().includes(searchLower))
    );
    
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  const sendWhatsApp = (order) => {
    try {
      const firstName = order.clientName.split(" ")[0];
      const businessName = order.business || 'business';
      const message = `Hi ${firstName}, this is GMS. Hope you are doing well! Do you have any new requirements for your ${businessName}? We have exciting offers for our retail clients!`;
      
      // Clean phone number
      const phone = order.phone.replace(/\D/g, "");
      
      if (!phone || phone.length < 10) {
        alert('Invalid phone number for this order');
        return;
      }
      
      // Update follow-up status locally
      const updatedOrders = orders.map(o => 
        o.id === order.id 
          ? { ...o, followUpStatus: 'contacted', lastFollowUp: new Date().toLocaleDateString('en-IN') }
          : o
      );
      
      setOrders(updatedOrders);
      
      // Open WhatsApp
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      
    } catch (err) {
      console.error('Error sending WhatsApp:', err);
      alert('Error opening WhatsApp');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  // Format amount for display
  const formatAmount = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  // Get statistics
  const getStats = () => {
    const total = orders.length;
    const pending = orders.filter(o => o.followUpStatus === 'pending').length;
    const contacted = orders.filter(o => o.followUpStatus === 'contacted').length;
    const totalAmount = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const totalBalance = orders.reduce((sum, order) => sum + (order.balance || 0), 0);
    
    return { total, pending, contacted, totalAmount, totalBalance };
  };

  const stats = getStats();

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          {selectedOrder ? (
            <FaArrowLeft
              style={styles.icon}
              onClick={() => setSelectedOrder(null)}
              title="Back to list"
            />
          ) : (
            <FaTimes 
              style={styles.icon} 
              onClick={onClose}
              title="Close"
            />
          )}
          <span style={styles.headerTitle}>
            Retail Orders Follow-up
            <span style={styles.headerSubtitle}>
              {monthNames[selectedMonth-1]} {selectedYear}
              {refreshing && ' • Refreshing...'}
            </span>
          </span>
          <div style={styles.headerActions}>
            <FaSync 
              style={{...styles.icon, marginRight: '10px'}} 
              onClick={handleRefresh}
              title="Refresh orders"
              className={refreshing ? 'spin' : ''}
            />
            <FaWhatsapp />
          </div>
        </div>

        {/* MONTH/YEAR FILTER */}
        {!selectedOrder && (
          <div style={styles.filterContainer}>
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <FaCalendarAlt style={{marginRight: '5px', fontSize: '12px'}} />
                  Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  style={styles.selectInput}
                  disabled={loading}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <FaCalendarAlt style={{marginRight: '5px', fontSize: '12px'}} />
                  Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  style={styles.selectInput}
                  disabled={loading}
                >
                  {monthNames.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* QUICK STATS */}
        {!selectedOrder && orders.length > 0 && (
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Orders</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#ff6b6b'}}>{stats.pending}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#28a745'}}>{formatAmount(stats.totalAmount)}</div>
              <div style={styles.statLabel}>Total Amount</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#ff6b6b'}}>{formatAmount(stats.totalBalance)}</div>
              <div style={styles.statLabel}>Pending Amount</div>
            </div>
          </div>
        )}

        {/* SEARCH BAR */}
        {!selectedOrder && (
          <div style={styles.searchContainer}>
            <div style={styles.searchWrapper}>
              <FaSearch style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search retail orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
                disabled={loading}
              />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  style={styles.clearSearchBtn}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && !selectedOrder && (
          <div style={styles.errorContainer}>
            <div style={styles.errorMessage}>
              {error}
              <button onClick={handleRefresh} style={styles.retryBtn}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && !selectedOrder && (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading retail orders for {monthNames[selectedMonth-1]} {selectedYear}...</p>
          </div>
        )}

        {/* LIST VIEW */}
        {!selectedOrder && !loading && !error && (
          <div style={styles.listWrapper}>
            <div style={styles.listHeader}>
              <span>
                {filteredOrders.length} orders
                {searchTerm && ` matching "${searchTerm}"`}
              </span>
              {orders.length > 0 && (
                <span style={styles.dateRange}>
                  {monthNames[selectedMonth-1]} {selectedYear}
                </span>
              )}
            </div>
            
            {filteredOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No retail orders found</p>
                <p style={styles.emptySubtext}>
                  {searchTerm 
                    ? 'No orders match your search'
                    : 'Try changing month/year or refresh'}
                </p>
                <button onClick={handleRefresh} style={styles.resetBtn}>
                  Refresh
                </button>
              </div>
            ) : (
              <div style={styles.scrollableList}>
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      ...styles.listItem,
                      borderLeft: order.followUpStatus === 'pending' 
                        ? '4px solid #ff6b6b' 
                        : '4px solid #51cf66',
                    }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div style={styles.listItemHeader}>
                      <div style={styles.name}>
                        {order.clientName}
                        <div style={styles.amountDisplay}>
                          <span style={styles.totalAmount}>
                            <FaRupeeSign style={{fontSize: '10px', marginRight: '2px'}} />
                            {formatAmount(order.amount)}
                          </span>
                          {order.balance > 0 && (
                            <span style={styles.balanceAmount}>
                              <FaRupeeSign style={{fontSize: '9px', marginRight: '1px'}} />
                              Due: {formatAmount(order.balance)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={styles.orderNumber}>{order.orderNumber}</div>
                    </div>
                    
                    <div style={styles.subText}>
                      <FaWhatsapp style={{fontSize: '12px', marginRight: '5px', color: '#25D366'}} />
                      {order.phone}
                    </div>
                    
                    <div style={styles.business}>{order.business}</div>
                    
                    <div style={styles.orderMeta}>
                      <span style={styles.metaItem}>
                        <FaCalendarAlt style={{fontSize: '10px', marginRight: '3px'}} />
                        {order.orderDate}
                      </span>
                      <span style={styles.metaItem}>
                        By: {order.executive}
                      </span>
                    </div>
                    
                    <div style={styles.orderDetails}>
                      <span style={styles.requirementBrief}>
                        {order.requirement.length > 50 
                          ? `${order.requirement.substring(0, 50)}...` 
                          : order.requirement}
                      </span>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: order.followUpStatus === 'pending' ? '#ff6b6b' : '#51cf66'
                      }}>
                        {order.followUpStatus === 'pending' ? 'Pending' : 'Contacted'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DETAIL VIEW */}
        {selectedOrder && (
          <div style={styles.detailWrapper}>
            <div style={styles.detailScrollContainer}>
              <div style={styles.detailHeader}>
                <div>
                  <h3 style={styles.detailName}>{selectedOrder.clientName}</h3>
                  <div style={styles.orderMetaBadge}>
                    <span style={styles.clientTypeBadge}>
                      {selectedOrder.clientType}
                    </span>
                    <span style={styles.sourceBadge}>
                      {selectedOrder.leadSource}
                    </span>
                  </div>
                </div>
                <div style={styles.orderNumberBadge}>{selectedOrder.orderNumber}</div>
              </div>
              
              <div style={styles.detailSection}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Phone:</span>
                  <span style={styles.detailValue}>
                    <FaWhatsapp style={{marginRight: '5px', color: '#25D366'}} />
                    {selectedOrder.phone}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Business:</span>
                  <span style={styles.detailValue}>{selectedOrder.business}</span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Order Date:</span>
                  <span style={styles.detailValue}>
                    <FaCalendarAlt style={{marginRight: '5px', fontSize: '12px'}} />
                    {selectedOrder.orderDate}
                  </span>
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Executive:</span>
                  <span style={styles.detailValue}>{selectedOrder.executive}</span>
                </div>
                
                <div style={styles.amountSection}>
                  <div style={styles.amountRow}>
                    <span style={styles.amountLabel}>Order Amount:</span>
                    <span style={styles.amountValue}>
                      <FaRupeeSign style={{marginRight: '5px', fontSize: '14px'}} />
                      {formatAmount(selectedOrder.amount)}
                    </span>
                  </div>
                  
                  {selectedOrder.balance > 0 && (
                    <div style={styles.balanceRow}>
                      <span style={styles.balanceLabel}>Balance Due:</span>
                      <span style={styles.balanceValue}>
                        <FaRupeeSign style={{marginRight: '5px', fontSize: '14px'}} />
                        {formatAmount(selectedOrder.balance)}
                      </span>
                    </div>
                  )}
                  
                  {selectedOrder.balance === 0 && selectedOrder.amount > 0 && (
                    <div style={styles.paidRow}>
                      <span style={styles.paidLabel}>Payment Status:</span>
                      <span style={styles.paidValue}>Fully Paid</span>
                    </div>
                  )}
                </div>
                
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Follow-up Status:</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: selectedOrder.followUpStatus === 'pending' ? '#ff6b6b' : '#51cf66',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {selectedOrder.followUpStatus === 'pending' ? 'Pending' : 'Contacted'}
                  </span>
                </div>
                
                {selectedOrder.lastFollowUp && selectedOrder.lastFollowUp !== 'Not contacted' && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Last Follow-up:</span>
                    <span style={styles.detailValue}>{selectedOrder.lastFollowUp}</span>
                  </div>
                )}
              </div>
              
              <div style={styles.requirementSection}>
                <p style={styles.detailLabel}>Requirement:</p>
                <div style={styles.requirementText}>
                  {selectedOrder.requirement}
                </div>
              </div>
            </div>

            <div style={styles.actionButtons}>
              <button
                style={{
                  ...styles.whatsappBtn,
                  opacity: !selectedOrder.phone || selectedOrder.phone === 'Not provided' ? 0.5 : 1,
                  cursor: !selectedOrder.phone || selectedOrder.phone === 'Not provided' ? 'not-allowed' : 'pointer'
                }}
                onClick={() => selectedOrder.phone && selectedOrder.phone !== 'Not provided' && sendWhatsApp(selectedOrder)}
                disabled={!selectedOrder.phone || selectedOrder.phone === 'Not provided'}
              >
                <FaWhatsapp /> 
                {!selectedOrder.phone || selectedOrder.phone === 'Not provided' 
                  ? 'No Phone Number' 
                  : 'Send WhatsApp Follow-up'}
              </button>
              
              <button
                style={styles.secondaryBtn}
                onClick={() => setSelectedOrder(null)}
              >
                Back to List
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "10px",
    zIndex: 1000,
  },
  container: {
    width: "100%",
    maxWidth: "480px",
    height: "90vh",
    maxHeight: "750px",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
  },
  header: {
    background: "linear-gradient(135deg, #25D366, #128C7E)",
    color: "#fff",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: "600",
    fontSize: "14px",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    minHeight: "60px",
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: "15px",
    fontWeight: "bold",
    display: "flex",
    flexDirection: "column",
  },
  headerSubtitle: {
    fontSize: "11px",
    opacity: 0.8,
    fontWeight: "normal",
    marginTop: "2px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
  },
  icon: {
    cursor: "pointer",
    fontSize: "18px",
    transition: "transform 0.2s",
  },
  filterContainer: {
    padding: "15px",
    background: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
    flexShrink: 0,
  },
  filterRow: {
    display: "flex",
    gap: "15px",
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "12px",
    color: "#495057",
    marginBottom: "5px",
    fontWeight: "500",
  },
  selectInput: {
    width: "100%",
    padding: "8px",
    border: "1px solid #dee2e6",
    borderRadius: "6px",
    fontSize: "13px",
    backgroundColor: "white",
    cursor: "pointer",
  },
  statsBar: {
    display: "flex",
    justifyContent: "space-around",
    padding: "12px",
    background: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
    flexShrink: 0,
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "70px",
  },
  statValue: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#212529",
  },
  statLabel: {
    fontSize: "10px",
    color: "#6c757d",
    marginTop: "2px",
    textAlign: "center",
  },
  searchContainer: {
    padding: "15px",
    background: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
    flexShrink: 0,
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    color: "#6c757d",
    fontSize: "14px",
  },
  searchInput: {
    width: "100%",
    padding: "10px 40px 10px 35px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    fontSize: "13px",
    outline: "none",
    transition: "border-color 0.2s",
    backgroundColor: "white",
  },
  clearSearchBtn: {
    position: "absolute",
    right: "12px",
    padding: "4px 10px",
    background: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "11px",
    cursor: "pointer",
  },
  errorContainer: {
    padding: "15px",
    background: "#fff5f5",
    borderBottom: "1px solid #ff6b6b",
    flexShrink: 0,
  },
  errorMessage: {
    color: "#ff6b6b",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  retryBtn: {
    padding: "4px 12px",
    background: "#ff6b6b",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "12px",
    cursor: "pointer",
  },
  loadingContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#6c757d",
    padding: "40px 20px",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #f3f3f3",
    borderTop: "3px solid #25D366",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "15px",
  },
  listWrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  },
  listHeader: {
    padding: "10px 15px",
    background: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    color: "#6c757d",
    flexShrink: 0,
  },
  dateRange: {
    fontSize: "10px",
    color: "#25D366",
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#6c757d",
    padding: "40px 20px",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: "12px",
    marginTop: "5px",
    color: "#adb5bd",
  },
  resetBtn: {
    padding: "8px 20px",
    background: "#25D366",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "15px",
    fontWeight: "500",
  },
  scrollableList: {
    flex: 1,
    overflowY: "auto",
    padding: "0 5px",
  },
  listItem: {
    padding: "15px",
    margin: "5px",
    borderBottom: "1px solid #eee",
    cursor: "pointer",
    transition: "background-color 0.2s, transform 0.1s",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  listItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "8px",
  },
  name: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#212529",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
  },
  amountDisplay: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  totalAmount: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#28a745",
    display: "flex",
    alignItems: "center",
  },
  balanceAmount: {
    fontSize: "11px",
    color: "#ff6b6b",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    background: "#fff5f5",
    padding: "2px 6px",
    borderRadius: "4px",
    alignSelf: "flex-start",
  },
  orderNumber: {
    fontSize: "11px",
    color: "#6c757d",
    background: "#f8f9fa",
    padding: "2px 8px",
    borderRadius: "4px",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  subText: {
    fontSize: "12px",
    color: "#495057",
    display: "flex",
    alignItems: "center",
    marginBottom: "6px",
  },
  business: {
    fontSize: "13px",
    color: "#212529",
    fontWeight: "500",
    marginBottom: "8px",
  },
  orderMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    fontSize: "10px",
    color: "#6c757d",
    marginBottom: "8px",
  },
  metaItem: {
    background: "#e9ecef",
    padding: "3px 6px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  orderDetails: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    color: "#6c757d",
    marginBottom: "8px",
  },
  requirementBrief: {
    fontSize: "11px",
    color: "#6c757d",
    fontStyle: "italic",
    maxWidth: "60%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  statusBadge: {
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "600",
    color: "white",
    whiteSpace: "nowrap",
  },
  detailWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  detailScrollContainer: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  detailHeader: {
    padding: "20px 20px 15px 20px",
    borderBottom: "1px solid #e9ecef",
    position: "relative",
  },
  detailName: {
    margin: 0,
    fontSize: "18px",
    color: "#212529",
    marginBottom: "5px",
    paddingRight: "80px",
  },
  orderMetaBadge: {
    display: "flex",
    gap: "8px",
    marginTop: "5px",
  },
  clientTypeBadge: {
    fontSize: "11px",
    color: "#25D366",
    background: "#e8f5e9",
    padding: "2px 8px",
    borderRadius: "12px",
    fontWeight: "600",
  },
  sourceBadge: {
    fontSize: "11px",
    color: "#6c757d",
    background: "#f8f9fa",
    padding: "2px 8px",
    borderRadius: "12px",
    fontWeight: "500",
    border: "1px solid #dee2e6",
  },
  orderNumberBadge: {
    fontSize: "12px",
    color: "#6c757d",
    background: "#f8f9fa",
    padding: "4px 10px",
    borderRadius: "6px",
    fontWeight: "600",
    border: "1px solid #dee2e6",
    position: "absolute",
    top: "20px",
    right: "20px",
  },
  detailSection: {
    background: "#f8f9fa",
    padding: "15px",
    margin: "20px",
    borderRadius: "8px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e9ecef",
  },
  detailLabel: {
    fontSize: "13px",
    color: "#495057",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: "13px",
    color: "#212529",
    display: "flex",
    alignItems: "center",
    fontWeight: "500",
  },
  amountSection: {
    margin: "15px 0",
    padding: "15px",
    background: "white",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
  },
  amountRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  amountLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#495057",
  },
  amountValue: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#28a745",
    display: "flex",
    alignItems: "center",
  },
  balanceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  balanceLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#495057",
  },
  balanceValue: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#ff6b6b",
    display: "flex",
    alignItems: "center",
  },
  paidRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paidLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#495057",
  },
  paidValue: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#51cf66",
    background: "#ebfbee",
    padding: "4px 10px",
    borderRadius: "6px",
  },
  requirementSection: {
    background: "white",
    padding: "15px",
    margin: "0 20px 20px 20px",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
  },
  requirementText: {
    fontSize: "13px",
    color: "#495057",
    lineHeight: "1.6",
    marginTop: "8px",
    padding: "10px",
    background: "#f8f9fa",
    borderRadius: "6px",
    whiteSpace: "pre-wrap",
  },
  actionButtons: {
    padding: "20px",
    borderTop: "1px solid #e9ecef",
    flexShrink: 0,
  },
  whatsappBtn: {
    background: "linear-gradient(135deg, #25D366, #128C7E)",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    fontWeight: "600",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    transition: "all 0.2s",
    marginBottom: "15px",
  },
  secondaryBtn: {
    background: "#6c757d",
    color: "#fff",
    border: "none",
    padding: "12px",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    fontSize: "13px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
};

// Add CSS animation for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(styleSheet);

export default WhatsAppFollowUp;