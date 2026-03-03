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
      console.log(`Filtering for: ${selectedYear}-${selectedMonth + 1}`, { startDate, endDate });
    } else if (selectedYear) {
      // Whole year
      startDate = new Date(selectedYear, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedYear + 1, 0, 1);
      endDate.setHours(0, 0, 0, 0);
      console.log(`Filtering for year: ${selectedYear}`, { startDate, endDate });
    } else {
      // ALL YEARS - fetch everything
      startDate = new Date('2000-01-01');
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date('2100-01-01');
      endDate.setHours(0, 0, 0, 0);
      console.log('Filtering for ALL years');
    }

    console.log('Fetching orders...');
    
    // Get ALL orders
    const orders = await Order.find({}).lean();
    
    console.log(`Total orders in database: ${orders.length}`);

    // Log sample order dates to debug
    if (orders.length > 0) {
      console.log('Sample order dates:');
      orders.slice(0, 5).forEach((order, i) => {
        console.log(`Order ${i}:`, {
          orderDate: order.orderDate,
          type: typeof order.orderDate,
          parsed: order.orderDate ? new Date(order.orderDate) : null
        });
      });
    }

    // Filter orders by date
    const filteredOrders = orders.filter(order => {
      try {
        let orderDate;
        if (order.orderDate) {
          // Handle different date formats
          if (typeof order.orderDate === 'string') {
            // Check if it's in DD-MM-YYYY format
            if (order.orderDate.includes('-')) {
              const parts = order.orderDate.split('-');
              if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                // Convert DD-MM-YYYY to Date object
                orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                orderDate = new Date(order.orderDate);
              }
            } else {
              orderDate = new Date(order.orderDate);
            }
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
        console.error('Error parsing date for order:', order._id, e);
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
      weeklyOrders: [],
      weeklyAgentOrders: [],
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
      serviceStatus: {
        pending: 0,
        assigned: 0,
        updated: 0,
        completed: 0,
        designPending: 0,
        printing: 0,
        installationPending: 0,
        onboarding: 0
      },
      timePeriod: {
        year: selectedYear || 'all',
        month: selectedMonth !== null ? selectedMonth + 1 : null
      }
    };

    // If a specific month is selected, calculate weekly data
    if (selectedYear && selectedMonth !== null) {
      // Get the first day of the month
      const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
      const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
      
      // Calculate weeks (Monday-based)
      const weeks = [];
      let currentDate = new Date(firstDayOfMonth);
      
      // Adjust to the first Monday of the month or start from the 1st
      while (currentDate <= lastDayOfMonth) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        if (weekEnd > lastDayOfMonth) {
          weekEnd.setTime(lastDayOfMonth.getTime());
        }
        
        weeks.push({
          start: new Date(weekStart),
          end: new Date(weekEnd),
          count: 0,
          amount: 0,
          agentCount: 0,
          agentAmount: 0
        });
        
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      result.weeklyOrders = weeks.map(w => ({ count: 0, amount: 0 }));
      result.weeklyAgentOrders = weeks.map(w => ({ count: 0, amount: 0 }));
    }

    // Process filtered orders
    filteredOrders.forEach(order => {
      try {
        // Parse order date to get month
        let orderDate;
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
            // Handle DD-MM-YYYY format
            if (order.orderDate.includes('-')) {
              const parts = order.orderDate.split('-');
              if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
                orderDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                orderDate = new Date(order.orderDate);
              }
            } else {
              orderDate = new Date(order.orderDate);
            }
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

        // If a specific month is selected, update weekly data
        if (selectedYear && selectedMonth !== null && orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear) {
          const dayOfMonth = orderDate.getDate();
          const weekIndex = Math.floor((dayOfMonth - 1) / 7);
          
          if (result.weeklyOrders && result.weeklyOrders[weekIndex]) {
            result.weeklyOrders[weekIndex].count++;
            result.weeklyOrders[weekIndex].amount += orderTotal;
          }
          
          if (result.weeklyAgentOrders && result.weeklyAgentOrders[weekIndex] && 
              (order.clientType === 'Agent' || order.clientType === 'Renewal-Agent')) {
            result.weeklyAgentOrders[weekIndex].count++;
            result.weeklyAgentOrders[weekIndex].amount += orderTotal;
          }
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

        // Service status
        if (order.rows && Array.isArray(order.rows)) {
          order.rows.forEach(row => {
            const remark = row.remark ? row.remark.toString() : '';
            const isCompleted = row.isCompleted === true;
            
            if (isCompleted) {
              result.pendingServices[0]++;
            } else {
              result.pendingServices[1]++;
            }
            
            const remarkLower = remark.toLowerCase().trim();
            
            if (isCompleted || remarkLower === 'completed') {
              result.serviceStatus.completed++;
            } else if (remarkLower.includes('assigned to')) {
              result.serviceStatus.assigned++;
            } else if (remarkLower.includes('updated:')) {
              result.serviceStatus.updated++;
            } else if (remarkLower === 'design pending' || remarkLower.includes('design pending')) {
              result.serviceStatus.designPending++;
            } else if (remarkLower === 'printing' || remarkLower.includes('printing')) {
              result.serviceStatus.printing++;
            } else if (remarkLower === 'installation pending' || remarkLower.includes('installation pending')) {
              result.serviceStatus.installationPending++;
            } else if (remarkLower === 'onboarding' || remarkLower.includes('onboarding')) {
              result.serviceStatus.onboarding++;
            } else {
              result.serviceStatus.pending++;
            }
          });
        }
      } catch (err) {
        console.error('Error processing order:', order._id, err);
      }
    });

    console.log('=== FINAL RESULTS ===');
    console.log('Total Orders by Month:', result.totalOrdersByMonth);
    console.log('Amount by Month:', result.amountByMonth);
    if (selectedYear && selectedMonth !== null) {
      console.log('Weekly Orders:', result.weeklyOrders);
    }

    // Get appointments data
    const Appointment = require('../models/appointmentModel');
    const appointments = await Appointment.find({}).lean();
    
    // Count appointments (you can add date filtering logic here)
    result.appointments = [appointments.length, 0]; // [done, upcoming] - modify based on your logic

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