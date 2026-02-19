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
      endDate = new Date(selectedYear, selectedMonth + 1, 1);
    } else if (selectedYear) {
      // Whole year
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear + 1, 0, 1);
    } else {
      // ALL YEARS - fetch everything (set dates far in past and future)
      startDate = new Date('2000-01-01'); // Assuming no data before 2000
      endDate = new Date('2100-01-01'); // Far future date
    }

    // Get ALL orders and appointments
    const [orders, allAppointments] = await Promise.all([
      Order.find({}).lean(),
      Appointment.find({}).lean()
    ]);

    // Filter in code rather than query to handle mixed formats
    const filteredOrders = orders.filter(order => {
      try {
        let orderDate;
        if (typeof order.orderDate === 'string') {
          orderDate = new Date(order.orderDate);
        } else if (order.orderDate) {
          orderDate = order.orderDate;
        } else {
          orderDate = order.createdAt || order.updatedAt;
        }
        
        if (!orderDate || isNaN(orderDate.getTime())) return false;
        
        // If ALL years selected, include all orders regardless of date
        if (!selectedYear) return true;
        
        return orderDate >= startDate && orderDate < endDate;
      } catch (e) {
        console.error('Error processing order date:', order._id);
        return false;
      }
    });

    const filteredAppointments = allAppointments.filter(appointment => {
      try {
        let apptDate;
        if (typeof appointment.date === 'string') {
          apptDate = new Date(appointment.date);
        } else if (appointment.date) {
          apptDate = appointment.date;
        } else {
          apptDate = appointment.createdAt || appointment.updatedAt;
        }
        
        if (!apptDate || isNaN(apptDate.getTime())) return false;
        
        // If ALL years selected, include all appointments regardless of date
        if (!selectedYear) return true;
        
        return apptDate >= startDate && apptDate < endDate;
      } catch (e) {
        console.error('Error processing appointment date:', appointment._id);
        return false;
      }
    });

    // Initialize counters with enhanced client types
    const result = {
      totalOrdersByMonth: Array(12).fill(0),
      amountByMonth: Array(12).fill(0), // For amount display
      totalOrdersAmountByMonth: Array(12).fill(0), // For total orders amount
      agentOrdersByMonth: Array(12).fill(0),
      pendingPayments: [0, 0], // [paid, pending]
      pendingAmount: 0, // Track only pending amount
      pendingServices: [0, 0], // [completed, pending]
      appointments: [0, 0], // [done, upcoming]
      clientTypes: { 
        Retail: { count: 0, amount: 0 },
        Renewal: { count: 0, amount: 0 },
        Agent: { count: 0, amount: 0 },
        'Renewal-Agent': { count: 0, amount: 0 }
      },
      timePeriod: {
        year: selectedYear || 'all',
        month: selectedMonth !== null ? selectedMonth + 1 : null
      }
    };

    // Process filtered orders
    filteredOrders.forEach(order => {
      try {
        // Parse order date to get month
        let orderDate;
        if (typeof order.orderDate === 'string') {
          orderDate = new Date(order.orderDate);
        } else if (order.orderDate) {
          orderDate = order.orderDate;
        } else {
          orderDate = order.createdAt || order.updatedAt;
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
        
        // Also get the order total and balance from order fields
        const orderTotalField = order.total || 0;
        const orderBalance = order.balance || 0;
        
        // Update monthly totals (always track by month)
        result.totalOrdersByMonth[month]++;
        result.amountByMonth[month] += orderTotal;
        result.totalOrdersAmountByMonth[month] += orderTotalField;
        
        // Count agent orders by month
        if (order.clientType === 'Agent' || order.clientType === 'Renewal-Agent') {
          result.agentOrdersByMonth[month]++;
        }

        // Payment status - track pending amount
        if (orderBalance > 0) {
          result.pendingPayments[1]++; // Count pending orders
          result.pendingAmount += orderBalance; // Add pending amount
        } else {
          result.pendingPayments[0]++; // Count paid orders
        }

        // Client type with amounts
        if (order.clientType && result.clientTypes.hasOwnProperty(order.clientType)) {
          result.clientTypes[order.clientType].count++;
          result.clientTypes[order.clientType].amount += orderTotal;
        } else {
          // Default to Retail if no client type specified
          result.clientTypes.Retail.count++;
          result.clientTypes.Retail.amount += orderTotal;
        }

        // Service status
        if (order.rows && Array.isArray(order.rows)) {
          order.rows.forEach(row => {
            row.isCompleted ? result.pendingServices[0]++ : result.pendingServices[1]++;
          });
        }
      } catch (err) {
        console.error('Error processing order:', order._id, err);
      }
    });

    // Process appointments
    filteredAppointments.forEach(appointment => {
      try {
        // Define which statuses count as "Done"
        const completedStatuses = ['completed', 'sale closed', 'Closed', 'closed', 'done', 'Done'];
        const isCompleted = completedStatuses.includes(appointment.status?.toLowerCase());
        
        if (isCompleted) {
          result.appointments[0]++; // Done
        } else {
          result.appointments[1]++; // Upcoming
        }
      } catch (err) {
        console.error('Error processing appointment:', appointment._id, err);
      }
    });

    // If a specific month is selected, calculate weekly breakdown
    if (selectedMonth !== null && selectedYear) {
      // Get weekly breakdown for all orders
      const weeklyOrdersData = filteredOrders.reduce((acc, order) => {
        try {
          let orderDate;
          if (typeof order.orderDate === 'string') {
            orderDate = new Date(order.orderDate);
          } else {
            orderDate = order.orderDate;
          }
          
          if (!orderDate || isNaN(orderDate.getTime())) return acc;
          
          const weekOfMonth = Math.ceil(orderDate.getDate() / 7);
          
          if (!acc[weekOfMonth]) {
            acc[weekOfMonth] = { count: 0, amount: 0 };
          }
          
          acc[weekOfMonth].count++;
          
          // Calculate order amount
          if (order.rows && Array.isArray(order.rows)) {
            const orderAmount = order.rows.reduce((sum, row) => {
              return sum + (parseFloat(row.total) || 0);
            }, 0);
            acc[weekOfMonth].amount += orderAmount;
          }
          
          return acc;
        } catch (e) {
          return acc;
        }
      }, {});

      // Get weekly breakdown for agent orders
      const weeklyAgentOrdersData = filteredOrders.reduce((acc, order) => {
        try {
          if (!(order.clientType === 'Agent' || order.clientType === 'Renewal-Agent')) return acc;
          
          let orderDate;
          if (typeof order.orderDate === 'string') {
            orderDate = new Date(order.orderDate);
          } else {
            orderDate = order.orderDate;
          }
          
          if (!orderDate || isNaN(orderDate.getTime())) return acc;
          
          const weekOfMonth = Math.ceil(orderDate.getDate() / 7);
          
          if (!acc[weekOfMonth]) {
            acc[weekOfMonth] = { count: 0, amount: 0 };
          }
          
          acc[weekOfMonth].count++;
          
          // Calculate order amount
          if (order.rows && Array.isArray(order.rows)) {
            const orderAmount = order.rows.reduce((sum, row) => {
              return sum + (parseFloat(row.total) || 0);
            }, 0);
            acc[weekOfMonth].amount += orderAmount;
          }
          
          return acc;
        } catch (e) {
          return acc;
        }
      }, {});

      // Convert to array format for the frontend
      result.weeklyOrders = Object.entries(weeklyOrdersData).map(([week, data]) => ({
        week: parseInt(week),
        count: data.count,
        amount: data.amount
      })).sort((a, b) => a.week - b.week);

      result.weeklyAgentOrders = Object.entries(weeklyAgentOrdersData).map(([week, data]) => ({
        week: parseInt(week),
        count: data.count,
        amount: data.amount
      })).sort((a, b) => a.week - b.week);
    }

    // Log summary for debugging (optional - can be removed in production)
    console.log('Chart data result:', {
      totalOrders: filteredOrders.length,
      totalAppointments: filteredAppointments.length,
      amountByMonth: result.amountByMonth,
      pendingAmount: result.pendingAmount,
      clientTypes: result.clientTypes,
      timePeriod: result.timePeriod
    });

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