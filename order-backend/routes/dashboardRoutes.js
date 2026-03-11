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
    const { year, month, startDate, endDate } = req.query;
    
    // Parse year - handle 'all' case
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) - 1 : null; // 0-11
    
    // Parse date range if provided
    let rangeStartDate = null;
    let rangeEndDate = null;
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      rangeStartDate = new Date(startDate);
      rangeStartDate.setHours(0, 0, 0, 0);
      
      rangeEndDate = new Date(endDate);
      rangeEndDate.setHours(23, 59, 59, 999);
      
      console.log(`Filtering by date range: ${rangeStartDate} to ${rangeEndDate}`);
    }
    
    // Create date range based on year/month or date range
    let startDateTime, endDateTime;
    
    if (rangeStartDate && rangeEndDate) {
      // Use date range if provided
      startDateTime = rangeStartDate;
      endDateTime = rangeEndDate;
    } else if (selectedYear && selectedMonth !== null) {
      // Specific month and year
      startDateTime = new Date(selectedYear, selectedMonth, 1);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(selectedYear, selectedMonth + 1, 1);
      endDateTime.setHours(0, 0, 0, 0);
      console.log(`Filtering for: ${selectedYear}-${selectedMonth + 1}`, { startDateTime, endDateTime });
    } else if (selectedYear) {
      // Whole year
      startDateTime = new Date(selectedYear, 0, 1);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(selectedYear + 1, 0, 1);
      endDateTime.setHours(0, 0, 0, 0);
      console.log(`Filtering for year: ${selectedYear}`, { startDateTime, endDateTime });
    } else {
      // ALL YEARS - fetch everything
      startDateTime = new Date('2000-01-01');
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date('2100-01-01');
      endDateTime.setHours(0, 0, 0, 0);
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
        if (!selectedYear && !rangeStartDate && !rangeEndDate) return true;
        
        return orderDate >= startDateTime && orderDate < endDateTime;
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
        month: selectedMonth !== null ? selectedMonth + 1 : null,
        startDate: rangeStartDate,
        endDate: rangeEndDate
      }
    };

    // If a specific month is selected (not date range), calculate weekly data
    if (!rangeStartDate && !rangeEndDate && selectedYear && selectedMonth !== null) {
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

        // If a specific month is selected (not date range), update weekly data
        if (!rangeStartDate && !rangeEndDate && selectedYear && selectedMonth !== null && 
            orderDate.getMonth() === selectedMonth && orderDate.getFullYear() === selectedYear) {
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
    if (selectedYear && selectedMonth !== null && !rangeStartDate && !rangeEndDate) {
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
    const { month, year, week, clientType, startDate, endDate } = req.query;
    
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
    
    // Parse date range
    let startDateTime = null;
    let endDateTime = null;
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
    }
    
    // Create date range
    let queryStartDate, queryEndDate;
    
    if (startDateTime && endDateTime) {
      // Date range filter
      queryStartDate = startDateTime;
      queryEndDate = endDateTime;
    } else if (selectedWeek && selectedYear && selectedMonth) {
      // Weekly view
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
      const firstDay = monthStart.getDay(); // 0-6 (Sun-Sat)
      
      // Calculate week start (Monday-based weeks)
      const weekStart = new Date(selectedYear, selectedMonth - 1, 
        (selectedWeek - 1) * 7 - firstDay + 1 + (firstDay === 0 ? 1 : 0));
      
      queryStartDate = new Date(weekStart);
      queryEndDate = new Date(weekStart);
      queryEndDate.setDate(weekStart.getDate() + 7);
    } else if (selectedMonth && selectedYear) {
      // Monthly view
      queryStartDate = new Date(selectedYear, selectedMonth - 1, 1);
      queryEndDate = new Date(selectedYear, selectedMonth, 1);
    } else if (selectedYear) {
      // Yearly view
      queryStartDate = new Date(selectedYear, 0, 1);
      queryEndDate = new Date(selectedYear + 1, 0, 1);
    } else {
      // ALL YEARS - no date filter
      queryStartDate = null;
      queryEndDate = null;
    }

    // Build query
    const query = {};
    if (queryStartDate && queryEndDate) {
      query.orderDate = { $gte: queryStartDate, $lt: queryEndDate };
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
    const { year, month, startDate, endDate } = req.query;
    
    // Parse year - handle 'all' case
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) : null;
    
    // Parse date range
    let startDateTime = null;
    let endDateTime = null;
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
    }
    
    // Build date filter
    let queryStartDate, queryEndDate;
    
    if (startDateTime && endDateTime) {
      queryStartDate = startDateTime;
      queryEndDate = endDateTime;
    } else if (selectedYear && selectedMonth) {
      queryStartDate = new Date(selectedYear, selectedMonth - 1, 1);
      queryEndDate = new Date(selectedYear, selectedMonth, 1);
    } else if (selectedYear) {
      queryStartDate = new Date(selectedYear, 0, 1);
      queryEndDate = new Date(selectedYear + 1, 0, 1);
    } else {
      // ALL YEARS - fetch everything
      queryStartDate = new Date('2000-01-01');
      queryEndDate = new Date('2100-01-01');
    }

    // Import ProspectiveClient model
    const ProspectiveClient = require('../models/ProspectiveClient');
    
    const prospects = await ProspectiveClient.find({
      createdAt: { $gte: queryStartDate, $lt: queryEndDate }
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
        month: selectedMonth || null,
        startDate: startDateTime,
        endDate: endDateTime
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