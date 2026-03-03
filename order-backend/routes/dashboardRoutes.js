const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Appointment = require('../models/appointmentModel');

// Helper function to safely parse date
const parseDate = (dateValue) => {
  if (!dateValue) return null;
  try {
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
    return dateValue instanceof Date ? dateValue : null;
  } catch (e) {
    return null;
  }
};

// Dashboard chart data endpoint
router.get('/chart-data', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Parse year - handle 'all' case
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) - 1 : null; // 0-11
    
    // Create date range based on year and month
    let startDate, endDate;
    
    if (selectedYear && selectedMonth !== null) {
      // Specific month and year
      startDate = new Date(selectedYear, selectedMonth, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedYear, selectedMonth + 1, 1);
      endDate.setHours(0, 0, 0, 0);
    } else if (selectedYear) {
      // Whole year
      startDate = new Date(selectedYear, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedYear + 1, 0, 1);
      endDate.setHours(0, 0, 0, 0);
    } else {
      // ALL YEARS - fetch everything
      startDate = new Date('2000-01-01');
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date('2100-01-01');
      endDate.setHours(0, 0, 0, 0);
    }

    console.log('Fetching orders...');
    
    // Get ALL orders
    const orders = await Order.find({}).lean();
    
    console.log(`Total orders in database: ${orders.length}`);

    // Filter orders by date
    const filteredOrders = orders.filter(order => {
      try {
        let orderDate;
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
            orderDate = new Date(order.orderDate);
          } else {
            orderDate = order.orderDate;
          }
        } else if (order.createdAt) {
          orderDate = new Date(order.createdAt);
        } else {
          return false;
        }
        
        if (!orderDate || isNaN(orderDate.getTime())) return false;
        
        // If ALL years selected, include all orders regardless of date
        if (!selectedYear) return true;
        
        return orderDate >= startDate && orderDate < endDate;
      } catch (e) {
        return false;
      }
    });

    console.log(`Filtered orders: ${filteredOrders.length}`);

    // Initialize counters
    const result = {
      totalOrdersByMonth: Array(12).fill(0),
      amountByMonth: Array(12).fill(0),
      totalOrdersAmountByMonth: Array(12).fill(0),
      agentOrdersByMonth: Array(12).fill(0),
      pendingPayments: [0, 0], // [paid, pending]
      pendingAmount: 0,
      pendingServices: [0, 0], // [completed, pending]
      appointments: [0, 0], // [done, upcoming]
      clientTypes: { 
        Retail: { count: 0, amount: 0 },
        Renewal: { count: 0, amount: 0 },
        Agent: { count: 0, amount: 0 },
        'Renewal-Agent': { count: 0, amount: 0 }
      },
      // Service status counts for the chart
      serviceStatus: {
        pending: 0,           // 🟡 Pending - Orange
        assigned: 0,          // 🔵 Assigned - Blue
        updated: 0,           // 🟣 Updated - Purple
        completed: 0,         // 🟢 Completed - Green
        designPending: 0,     // 🟠 Design Pending - Orange
        printing: 0,          // 🔴 Printing - Red
        installationPending: 0, // ⚫ Installation Pending - Dark Gray
        onboarding: 0         // 🟢 Onboarding - Teal
      },
      timePeriod: {
        year: selectedYear || 'all',
        month: selectedMonth !== null ? selectedMonth + 1 : null
      }
    };

    console.log('Processing orders for service status...');
    let totalRows = 0;

    // Process filtered orders
    filteredOrders.forEach(order => {
      try {
        // Parse order date to get month
        let orderDate;
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
            orderDate = new Date(order.orderDate);
          } else {
            orderDate = order.orderDate;
          }
        } else if (order.createdAt) {
          orderDate = new Date(order.createdAt);
        } else {
          return;
        }
        
        if (!orderDate || isNaN(orderDate.getTime())) return;
        
        const month = orderDate.getMonth();
        
        // Calculate order total amount from rows
        let orderTotal = 0;
        if (order.rows && Array.isArray(order.rows)) {
          orderTotal = order.rows.reduce((sum, row) => {
            return sum + (parseFloat(row.total) || 0);
          }, 0);
        }
        
        // Update monthly totals
        result.totalOrdersByMonth[month]++;
        result.amountByMonth[month] += orderTotal;
        result.totalOrdersAmountByMonth[month] += (order.total || 0);
        
        // Count agent orders by month
        if (order.clientType === 'Agent' || order.clientType === 'Renewal-Agent') {
          result.agentOrdersByMonth[month]++;
        }

        // Payment status
        const orderBalance = order.balance || 0;
        if (orderBalance > 0) {
          result.pendingPayments[1]++; // Count pending orders
          result.pendingAmount += orderBalance;
        } else {
          result.pendingPayments[0]++; // Count paid orders
        }

        // Client type
        if (order.clientType && result.clientTypes.hasOwnProperty(order.clientType)) {
          result.clientTypes[order.clientType].count++;
          result.clientTypes[order.clientType].amount += orderTotal;
        } else {
          result.clientTypes.Retail.count++;
          result.clientTypes.Retail.amount += orderTotal;
        }

        // Service status - Count each row's status
        if (order.rows && Array.isArray(order.rows)) {
          order.rows.forEach((row, rowIndex) => {
            totalRows++;
            
            // Get the remark
            const remark = row.remark ? row.remark.toString() : '';
            const isCompleted = row.isCompleted === true;
            
            // Log every 10th row to see sample data
            if (totalRows % 10 === 0) {
              console.log(`Sample row ${totalRows}:`, {
                remark: remark,
                isCompleted: isCompleted,
                rowId: rowIndex
              });
            }
            
            // Track completed vs pending for the existing pendingServices array
            if (isCompleted) {
              result.pendingServices[0]++;
            } else {
              result.pendingServices[1]++;
            }
            
            // Track detailed service status
            const remarkLower = remark.toLowerCase().trim();
            
            // Check for completed first
            if (isCompleted || remarkLower === 'completed') {
              result.serviceStatus.completed++;
            }
            // Check for assigned to
            else if (remarkLower.includes('assigned to')) {
              result.serviceStatus.assigned++;
            }
            // Check for updated
            else if (remarkLower.includes('updated:')) {
              result.serviceStatus.updated++;
            }
            // Check for design pending
            else if (remarkLower === 'design pending' || remarkLower.includes('design pending')) {
              result.serviceStatus.designPending++;
            }
            // Check for printing
            else if (remarkLower === 'printing' || remarkLower.includes('printing')) {
              result.serviceStatus.printing++;
            }
            // Check for installation pending
            else if (remarkLower === 'installation pending' || remarkLower.includes('installation pending')) {
              result.serviceStatus.installationPending++;
            }
            // Check for onboarding
            else if (remarkLower === 'onboarding' || remarkLower.includes('onboarding')) {
              result.serviceStatus.onboarding++;
            }
            // Default to pending
            else {
              result.serviceStatus.pending++;
              
              // Log pending remarks to see what's being categorized as pending
              if (remark) {
                console.log(`Pending remark detected: "${remark}"`);
              }
            }
          });
        }
      } catch (err) {
        console.error('Error processing order:', order._id, err);
      }
    });

    console.log(`Total rows processed: ${totalRows}`);
    console.log('=== FINAL SERVICE STATUS COUNTS ===');
    console.log('1. Pending:', result.serviceStatus.pending);
    console.log('2. Assigned:', result.serviceStatus.assigned);
    console.log('3. Updated:', result.serviceStatus.updated);
    console.log('4. Completed:', result.serviceStatus.completed);
    console.log('5. Design Pending:', result.serviceStatus.designPending);
    console.log('6. Printing:', result.serviceStatus.printing);
    console.log('7. Installation Pending:', result.serviceStatus.installationPending);
    console.log('8. Onboarding:', result.serviceStatus.onboarding);
    console.log('Total services:', Object.values(result.serviceStatus).reduce((a, b) => a + b, 0));

    // Also log the appointments
    const appointments = await Appointment.find({}).lean();
    console.log(`Total appointments: ${appointments.length}`);

    res.json(result);
  } catch (err) {
    console.error('Error in /chart-data:', err);
    res.status(500).json({ error: err.message });
  }
});
// View orders endpoint with filtering
router.get('/view-orders', async (req, res) => {
  try {
    const { month, year, week, clientType } = req.query;
    
    // Parse year - handle 'all' case
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    // Parse month
    let selectedMonth = null;
    if (month && month !== 'undefined' && month !== 'null') {
      selectedMonth = parseInt(month);
    }
    
    // Parse week
    let selectedWeek = null;
    if (week && week !== 'undefined' && week !== 'null') {
      selectedWeek = parseInt(week);
    }
    
    // Create date range
    let startDate, endDate;
    
    if (selectedWeek && selectedYear && selectedMonth) {
      // Weekly view
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const firstDay = monthStart.getDay(); // 0-6 (Sun-Sat)
      
      // Calculate week start (Monday-based weeks)
      const weekStart = new Date(selectedYear, selectedMonth - 1, 
        (selectedWeek - 1) * 7 - firstDay + 1 + (firstDay === 0 ? 1 : 0));
      
      startDate = new Date(weekStart);
      endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + 7);
    } else if (selectedMonth && selectedYear) {
      // Monthly view
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 1);
    } else if (selectedYear) {
      // Yearly view
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear + 1, 0, 1);
    } else {
      // ALL YEARS - no date filter
      startDate = null;
      endDate = null;
    }

    // Build query
    const query = {};
    if (startDate && endDate) {
      query.orderDate = { $gte: startDate, $lt: endDate };
    }
    if (clientType && clientType !== 'undefined' && clientType !== 'null') {
      query.clientType = clientType;
    }

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .lean();

    // Format orders for frontend
    const formattedOrders = orders.map(order => {
      // Calculate total amount from rows
      let totalAmount = 0;
      if (order.rows && Array.isArray(order.rows)) {
        totalAmount = order.rows.reduce((sum, row) => {
          return sum + (parseFloat(row.total) || 0);
        }, 0);
      }
      
      return {
        ...order,
        calculatedTotal: totalAmount
      };
    });

    res.json(formattedOrders);

  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Prospective clients stats endpoint
router.get('/prospective-clients/stats', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Parse year - handle 'all' case
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) : null;
    
    // Build date filter
    let startDate, endDate;
    
    if (selectedYear && selectedMonth) {
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 1);
    } else if (selectedYear) {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear + 1, 0, 1);
    } else {
      // ALL YEARS - fetch everything
      startDate = new Date('2000-01-01');
      endDate = new Date('2100-01-01');
    }

    // Import ProspectiveClient model
    const ProspectiveClient = require('../models/ProspectiveClient');
    
    const prospects = await ProspectiveClient.find({
      createdAt: { $gte: startDate, $lt: endDate }
    }).lean();
    
    // Count by status
    const stats = {
      New: 0,
      Contacted: 0,
      FollowUp: 0,
      Converted: 0,
      Lost: 0,
      timePeriod: {
        year: selectedYear || 'all',
        month: selectedMonth || null
      }
    };

    prospects.forEach(prospect => {
      const status = prospect.status || 'New';
      if (stats.hasOwnProperty(status)) {
        stats[status] += 1;
      }
    });

    res.json(stats);

  } catch (err) {
    console.error('Error in /prospective-clients/stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp unread count endpoint
router.get('/whatsapp/unread-count', async (req, res) => {
  try {
    // This is a placeholder - implement your actual WhatsApp unread count logic
    // You might want to query a WhatsApp messages collection here
    // Example: const WhatsAppMessage = require('../models/WhatsAppMessage');
    // const count = await WhatsAppMessage.countDocuments({ read: false });
    // res.json({ count });
    
    res.json({ count: 0 });
  } catch (error) {
    console.error('Error in /whatsapp/unread-count:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;