import React, { useState, useEffect } from "react";
import { FaWhatsapp, FaArrowLeft, FaTimes, FaSearch, FaSync, FaCalendarAlt, FaRupeeSign, FaCheckCircle, FaUser, FaCrown } from "react-icons/fa";
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
  const [activeTab, setActiveTab] = useState("pending"); // "pending" or "completed"
  
  // NEW: User role and info state
  const [userRole, setUserRole] = useState('');
  const [executiveName, setExecutiveName] = useState('');

  // Month and year options
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020 to 2030

  // NEW: Get user info from localStorage
  const getUserInfo = () => {
    try {
      const role = localStorage.getItem('role') || '';
      const name = localStorage.getItem('name') || localStorage.getItem('userName') || '';
      
      console.log('WhatsApp FollowUp - User info:', { role, name });
      
      setUserRole(role);
      setExecutiveName(name);
      
      return { role, name };
    } catch (error) {
      console.error('Error getting user info:', error);
      return { role: '', name: '' };
    }
  };

  // NEW: Check if user should see all orders
  const shouldSeeAllOrders = () => {
    const rolesThatCanSeeAll = ['Admin', 'Account', 'Service Executive'];
    return rolesThatCanSeeAll.includes(userRole);
  };

  // Fetch orders for selected month/year with role-based filtering
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user info
      const { role, name } = getUserInfo();
      
      console.log(`Fetching retail orders for ${monthNames[selectedMonth-1]} ${selectedYear}...`);
      console.log(`User role: ${role}, name: ${name}, see all: ${shouldSeeAllOrders()}`);
      
      // Build API URL with query parameters
      let apiUrl = `/api/followup/retail-orders?year=${selectedYear}&month=${selectedMonth}`;
      
      // Add executive filter for regular executives
      if (role && !shouldSeeAllOrders() && name) {
        apiUrl += `&executive=${encodeURIComponent(name)}`;
        console.log(`Adding executive filter for: ${name}`);
      }
      
      console.log(`API URL: ${apiUrl}`);
      
      const response = await axios.get(apiUrl);
      
      console.log(`API Response:`, response.data);
      
      if (response.data.success && Array.isArray(response.data.data)) {
        let ordersData = response.data.data;
        
        // Additional filtering on client side (as backup)
        if (!shouldSeeAllOrders() && name) {
          const originalCount = ordersData.length;
          ordersData = ordersData.filter(order => {
            // Try to match executive by various field names
            const orderExecutive = order.executive || order.createdBy || order.salesExecutive || '';
            return orderExecutive === name;
          });
          console.log(`Filtered from ${originalCount} to ${ordersData.length} orders for executive: ${name}`);
        }
        
        console.log(`Found ${ordersData.length} retail orders after filtering`);
        
        // Process orders
        const processedOrders = ordersData.map((order, index) => {
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
          
          // Extract executive from various possible fields
          let executive = 'Unknown';
          if (order.executive) executive = order.executive;
          else if (order.createdBy) executive = order.createdBy;
          else if (order.salesExecutive) executive = order.salesExecutive;
          
          // Use calculated totals from backend or calculate locally
          const totalAmount = order.calculatedTotal || calculateTotalAmount(order);
          const balance = order.calculatedBalance || calculateBalance(order, totalAmount);
          
          // Format dates
          let orderDate = 'N/A';
          let rawDate = null;
          if (order.orderDate) {
            rawDate = new Date(order.orderDate);
            orderDate = rawDate.toLocaleDateString('en-IN');
          } else if (order.createdAt) {
            rawDate = new Date(order.createdAt);
            orderDate = rawDate.toLocaleDateString('en-IN');
          }
          
          let whatsappContactedDate = null;
          if (order.whatsappContactedDate) {
            whatsappContactedDate = new Date(order.whatsappContactedDate).toLocaleDateString('en-IN');
          }
          
          let lastFollowUp = 'Not contacted';
          if (order.lastFollowUpDate) {
            lastFollowUp = new Date(order.lastFollowUpDate).toLocaleDateString('en-IN');
          }
          
          return {
            id: order._id,
            orderNumber: order.orderNo || `ORD-${String(index + 1).padStart(3, '0')}`,
            clientName: clientName.trim(),
            phone: phone,
            business: business,
            orderDate: orderDate,
            rawOrderDate: rawDate,
            requirement: order.requirement || order.serviceDetails || order.description || 'No requirement specified',
            followUpStatus: order.followUpStatus || 'pending',
            lastFollowUp: lastFollowUp,
            whatsappContactedDate: whatsappContactedDate,
            amount: totalAmount,
            balance: balance,
            clientType: order.clientType || 'Retail',
            status: order.status || 'active',
            leadSource: order.leadSource || 'Unknown',
            executive: executive,
            rowsCount: order.rows ? order.rows.length : 0,
            // Add createdBy for filtering
            createdBy: order.createdBy || executive
          };
        });
        
        console.log(`Processed ${processedOrders.length} retail orders`);
        
        // Sort by date (newest first)
        processedOrders.sort((a, b) => {
          if (!a.rawOrderDate || !b.rawOrderDate) return 0;
          return b.rawOrderDate - a.rawOrderDate;
        });
        
        setOrders(processedOrders);
        
        // Filter pending orders for the default tab
        const pendingOrders = processedOrders.filter(order => order.followUpStatus === 'pending');
        setFilteredOrders(pendingOrders);
        
        if (processedOrders.length === 0) {
          setError(`No retail orders found for ${monthNames[selectedMonth-1]} ${selectedYear}`);
        } else {
          setError(null);
        }
        
      } else {
        setError(response.data?.message || 'Invalid response from server');
        setOrders([]);
        setFilteredOrders([]);
      }
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(`Failed to load orders: ${err.response?.data?.message || err.message}`);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper functions for local calculation (fallback)
  const calculateTotalAmount = (order) => {
    let totalAmount = 0;
    
    if (order.rows && Array.isArray(order.rows) && order.rows.length > 0) {
      totalAmount = order.rows.reduce((sum, row) => {
        const rowAmount = row.total || row.amount || row.price || 0;
        return sum + (parseFloat(rowAmount) || 0);
      }, 0);
    }
    
    if (totalAmount === 0) {
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

  const calculateBalance = (order, totalAmount) => {
    let balance = 0;
    
    if (order.balance !== undefined && order.balance !== null) {
      balance = parseFloat(order.balance) || 0;
    }
    else if (totalAmount > 0 && order.paymentHistory && Array.isArray(order.paymentHistory)) {
      const totalPaid = order.paymentHistory.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amount) || 0);
      }, 0);
      balance = totalAmount - totalPaid;
    }
    else if (order.advanceAmount !== undefined && order.advanceAmount !== null) {
      const advance = parseFloat(order.advanceAmount) || 0;
      balance = totalAmount - advance;
    }
    
    return balance;
  };

  useEffect(() => {
    // Get user info on component mount
    getUserInfo();
    fetchOrders();
  }, [selectedMonth, selectedYear]);

  // Apply search filter based on active tab
  useEffect(() => {
    const ordersToFilter = activeTab === "pending" 
      ? orders.filter(o => o.followUpStatus === 'pending') 
      : orders.filter(o => o.followUpStatus === 'contacted');
    
    if (!searchTerm.trim()) {
      setFilteredOrders(ordersToFilter);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = ordersToFilter.filter(order =>
      order.clientName.toLowerCase().includes(searchLower) ||
      order.business.toLowerCase().includes(searchLower) ||
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.phone.includes(searchTerm) ||
      (order.requirement && order.requirement.toLowerCase().includes(searchLower)) ||
      (order.leadSource && order.leadSource.toLowerCase().includes(searchLower)) ||
      (order.executive && order.executive.toLowerCase().includes(searchLower))
    );
    
    setFilteredOrders(filtered);
  }, [searchTerm, orders, activeTab]);

  const sendWhatsApp = async (order) => {
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
      
      // Update order status in backend using the new API endpoint
      try {
        const updateResponse = await axios.put(`/api/followup/${order.id}/followup`, {
          followUpStatus: 'contacted',
          whatsappContactedDate: new Date().toISOString(),
          lastFollowUpDate: new Date().toISOString()
        });
        
        console.log('Order status updated:', updateResponse.data);
        
        if (!updateResponse.data.success) {
          throw new Error(updateResponse.data.message || 'Failed to update order status');
        }
        
      } catch (updateError) {
        console.error('Failed to update order status:', updateError);
        alert('Failed to save follow-up status. Please try again.');
        return;
      }
      
      // Update orders locally
      const updatedOrders = orders.map(o => 
        o.id === order.id 
          ? { 
              ...o, 
              followUpStatus: 'contacted', 
              lastFollowUp: new Date().toLocaleDateString('en-IN'),
              whatsappContactedDate: new Date().toLocaleDateString('en-IN')
            }
          : o
      );
      
      setOrders(updatedOrders);
      
      // Update filtered orders based on current tab
      const ordersForCurrentTab = activeTab === "pending" 
        ? updatedOrders.filter(o => o.followUpStatus === 'pending')
        : updatedOrders.filter(o => o.followUpStatus === 'contacted');
      
      const filteredForCurrentTab = searchTerm.trim() 
        ? ordersForCurrentTab.filter(order =>
            order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.business.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : ordersForCurrentTab;
      
      setFilteredOrders(filteredForCurrentTab);
      
      // Open WhatsApp
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      
    } catch (err) {
      console.error('Error sending WhatsApp:', err);
      alert(`Error: ${err.message}`);
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

  // Tab badge style function
  const getTabBadgeStyle = (tabType) => ({
    position: "absolute",
    top: "5px",
    right: "5px",
    background: tabType === "pending" ? "#ff6b6b" : "#28a745",
    color: "white",
    fontSize: "10px",
    padding: "1px 5px",
    borderRadius: "10px",
    minWidth: "16px",
  });

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm(""); // Clear search when changing tabs
    
    // Filter orders based on the selected tab
    const ordersForTab = tab === "pending" 
      ? orders.filter(o => o.followUpStatus === 'pending')
      : orders.filter(o => o.followUpStatus === 'contacted');
    
    setFilteredOrders(ordersForTab);
  };

  // NEW: User info display
  const getUserDisplayInfo = () => {
    if (shouldSeeAllOrders()) {
      return {
        text: "👑 Viewing All Retail Orders",
        icon: <FaCrown style={{ marginLeft: '5px', color: '#FFD700' }} />,
        color: '#9c27b0'
      };
    } else {
      return {
        text: `👤 Viewing Your Orders - ${executiveName || 'Executive'}`,
        icon: <FaUser style={{ marginLeft: '5px' }} />,
        color: '#2196f3'
      };
    }
  };

  const userInfo = getUserDisplayInfo();

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
            {/* NEW: User Role Info */}
            <span style={{
              ...styles.userRoleBadge,
              backgroundColor: userInfo.color
            }}>
              {userInfo.text}
              {userInfo.icon}
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
              <div style={styles.statLabel}>Total</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#ff6b6b'}}>{stats.pending}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#28a745'}}>{stats.contacted}</div>
              <div style={styles.statLabel}>Completed</div>
            </div>
            <div style={styles.statItem}>
              <div style={{...styles.statValue, color: '#28a745'}}>{formatAmount(stats.totalAmount)}</div>
              <div style={styles.statLabel}>Total Value</div>
            </div>
          </div>
        )}

        {/* TAB SWITCHER */}
        {!selectedOrder && orders.length > 0 && (
          <div style={styles.tabContainer}>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === "pending" ? styles.activeTab : {})
              }}
              onClick={() => handleTabChange("pending")}
            >
              Pending Follow-up
              {stats.pending > 0 && (
                <span style={getTabBadgeStyle("pending")}>{stats.pending}</span>
              )}
            </button>
            <button
              style={{
                ...styles.tabButton,
                ...(activeTab === "completed" ? styles.activeTab : {})
              }}
              onClick={() => handleTabChange("completed")}
            >
              <FaCheckCircle style={{marginRight: '5px', fontSize: '12px'}} />
              Completed
              {stats.contacted > 0 && (
                <span style={getTabBadgeStyle("completed")}>{stats.contacted}</span>
              )}
            </button>
          </div>
        )}

        {/* SEARCH BAR */}
        {!selectedOrder && (
          <div style={styles.searchContainer}>
            <div style={styles.searchWrapper}>
              <FaSearch style={styles.searchIcon} />
              <input
                type="text"
                placeholder={`Search ${activeTab === "pending" ? "pending" : "completed"} orders...`}
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
            <p style={{ fontSize: '12px', marginTop: '5px', color: '#6c757d' }}>
              {shouldSeeAllOrders() ? 'Loading all orders...' : `Loading your orders (${executiveName})...`}
            </p>
          </div>
        )}

        {/* LIST VIEW */}
        {!selectedOrder && !loading && !error && (
          <div style={styles.listWrapper}>
            <div style={styles.listHeader}>
              <span>
                {activeTab === "pending" ? "Pending" : "Completed"}: {filteredOrders.length} orders
                {searchTerm && ` matching "${searchTerm}"`}
              </span>
              {filteredOrders.length > 0 && (
                <span style={styles.dateRange}>
                  {monthNames[selectedMonth-1]} {selectedYear}
                </span>
              )}
            </div>
            
            {filteredOrders.length === 0 ? (
              <div style={styles.emptyState}>
                <p>
                  {activeTab === "pending" 
                    ? "No pending follow-up orders" 
                    : "No completed follow-up orders"}
                </p>
                <p style={styles.emptySubtext}>
                  {searchTerm 
                    ? 'No orders match your search'
                    : activeTab === "pending" 
                      ? 'All orders have been contacted!'
                      : 'Contact orders to see them here'}
                </p>
                {activeTab === "completed" && stats.pending > 0 && (
                  <button onClick={() => handleTabChange("pending")} style={styles.resetBtn}>
                    View Pending Orders
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.scrollableList}>
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      ...styles.listItem,
                      borderLeft: activeTab === "pending" 
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
                      {!shouldSeeAllOrders() && order.executive === executiveName && (
                        <span style={{
                          ...styles.metaItem,
                          background: '#e3f2fd',
                          color: '#1976d2',
                          border: '1px solid #bbdefb'
                        }}>
                          Your Order
                        </span>
                      )}
                      {activeTab === "completed" && order.whatsappContactedDate && (
                        <span style={{
                          ...styles.metaItem,
                          background: '#e8f5e9',
                          color: '#28a745'
                        }}>
                          Contacted: {order.whatsappContactedDate}
                        </span>
                      )}
                    </div>
                    
                    <div style={styles.orderDetails}>
                      <span style={styles.requirementBrief}>
                        {order.requirement.length > 50 
                          ? `${order.requirement.substring(0, 50)}...` 
                          : order.requirement}
                      </span>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: activeTab === "pending" ? '#ff6b6b' : '#51cf66'
                      }}>
                        {activeTab === "pending" ? 'Pending' : 'Completed'}
                      </span>
                    </div>
                    
                    {activeTab === "pending" && order.phone && order.phone !== 'Not provided' && (
                      <div style={styles.quickAction}>
                        <button
                          style={styles.quickWhatsappBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            sendWhatsApp(order);
                          }}
                        >
                          <FaWhatsapp /> Send WhatsApp
                        </button>
                      </div>
                    )}
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
                    {/* NEW: Show "Your Order" badge if it's the executive's own order */}
                    {!shouldSeeAllOrders() && selectedOrder.executive === executiveName && (
                      <span style={{
                        ...styles.sourceBadge,
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderColor: '#bbdefb'
                      }}>
                        <FaUser style={{fontSize: '9px', marginRight: '3px'}} />
                        Your Order
                      </span>
                    )}
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
                  <span style={styles.detailValue}>
                    {selectedOrder.executive}
                    {!shouldSeeAllOrders() && selectedOrder.executive === executiveName && (
                      <span style={{
                        fontSize: '10px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        marginLeft: '8px'
                      }}>
                        (You)
                      </span>
                    )}
                  </span>
                </div>
                
                {selectedOrder.whatsappContactedDate && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>WhatsApp Sent:</span>
                    <span style={styles.detailValue}>
                      <FaWhatsapp style={{marginRight: '5px', color: '#25D366'}} />
                      {selectedOrder.whatsappContactedDate}
                    </span>
                  </div>
                )}
                
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
                    {selectedOrder.followUpStatus === 'pending' ? 'Pending' : 'Completed'}
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
              {selectedOrder.followUpStatus === 'pending' && (
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
              )}
              
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
  // NEW: User role badge style
  userRoleBadge: {
    fontSize: "10px",
    padding: "3px 8px",
    borderRadius: "12px",
    marginTop: "4px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    maxWidth: "fit-content",
    fontWeight: "500",
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
  tabContainer: {
    display: "flex",
    background: "#f8f9fa",
    borderBottom: "1px solid #e9ecef",
    flexShrink: 0,
  },
  tabButton: {
    flex: 1,
    padding: "12px 10px",
    border: "none",
    background: "transparent",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6c757d",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "all 0.2s",
  },
  activeTab: {
    background: "#fff",
    color: "#25D366",
    borderBottom: "2px solid #25D366",
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
    position: "relative",
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
  quickAction: {
    marginTop: "10px",
    display: "flex",
    justifyContent: "center",
  },
  quickWhatsappBtn: {
    background: "linear-gradient(135deg, #25D366, #128C7E)",
    color: "white",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    transition: "transform 0.2s",
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
    flexWrap: "wrap",
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