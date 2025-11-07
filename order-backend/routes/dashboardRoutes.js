const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Appointment = require('../models/appointmentModel');

router.get('/chart-data', async (req, res) => {
  try {
    const { year, month } = req.query;
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();
    const selectedMonth = month ? parseInt(month) - 1 : null; // 0-11
    
    // Create date range based on year and month
    let startDate, endDate;
    
    if (selectedMonth !== null) {
      // Specific month and year
      startDate = new Date(selectedYear, selectedMonth, 1);
      endDate = new Date(selectedYear, selectedMonth + 1, 1);
    } else {
      // Whole year
      startDate = new Date(`${selectedYear}-01-01`);
      endDate = new Date(`${selectedYear + 1}-01-01`);
    }

    // Get ALL orders and appointments regardless of format
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
        } else {
          orderDate = order.orderDate;
        }
        return orderDate >= startDate && orderDate < endDate;
      } catch (e) {
        console.error('Error processing order date:', order._id, order.orderDate);
        return false;
      }
    });

    const filteredAppointments = allAppointments.filter(appointment => {
      try {
        let apptDate;
        if (typeof appointment.date === 'string') {
          apptDate = new Date(appointment.date);
        } else {
          apptDate = appointment.date;
        }
        return apptDate >= startDate && apptDate < endDate;
      } catch (e) {
        console.error('Error processing appointment date:', appointment._id, appointment.date);
        return false;
      }
    });

    // Initialize counters - UPDATED CLIENT TYPES WITH AMOUNTS
    const result = {
      totalOrdersByMonth: selectedMonth !== null ? [filteredOrders.length] : Array(12).fill(0),
      amountByMonth: selectedMonth !== null ? [0] : Array(12).fill(0), // For total amount display
      totalOrdersAmountByMonth: selectedMonth !== null ? [0] : Array(12).fill(0), // For total orders amount
      agentOrdersByMonth: selectedMonth !== null ? [0] : Array(12).fill(0),
      pendingPayments: [0, 0],
      pendingAmount: 0, // Track only pending amount
      pendingServices: [0, 0],
      appointments: [0, 0],
      clientTypes: { 
        Retail: { count: 0, amount: 0 },
        Renewal: { count: 0, amount: 0 },
        Agent: { count: 0, amount: 0 },
        'Renewal-Agent': { count: 0, amount: 0 }
      },
      timePeriod: {
        year: selectedYear,
        month: selectedMonth !== null ? selectedMonth + 1 : null
      }
    };

    // Process filtered orders - UPDATED CLIENT TYPE CALCULATION WITH AMOUNTS
    filteredOrders.forEach(order => {
      try {
        const orderDate = new Date(order.orderDate);
        const month = orderDate.getMonth();
        
        // Calculate order total amount from rows (for amount display)
        let orderTotal = 0;
        if (order.rows && Array.isArray(order.rows)) {
          orderTotal = order.rows.reduce((sum, row) => {
            return sum + (parseFloat(row.total) || 0);
          }, 0);
        }
        
        // Also get the order total and balance from order fields
        const orderTotalField = order.total || 0;
        const orderBalance = order.balance || 0;
        
        if (selectedMonth === null) {
          result.totalOrdersByMonth[month]++;
          result.amountByMonth[month] += orderTotal; // For amount display in tooltips
          result.totalOrdersAmountByMonth[month] += orderTotalField; // For total amount tracking
          
          // Count agent orders by month
          if (order.clientType === 'Agent' || order.clientType === 'Renewal-Agent') {
            result.agentOrdersByMonth[month]++;
          }
        } else {
          // For single month view
          result.amountByMonth[0] += orderTotal;
          result.totalOrdersAmountByMonth[0] += orderTotalField;
        }

        // Payment status - ONLY TRACK PENDING AMOUNT
        if (orderBalance > 0) {
          result.pendingPayments[1]++; // Count pending orders
          result.pendingAmount += orderBalance; // ONLY PENDING AMOUNT
        } else {
          result.pendingPayments[0]++; // Count paid orders
        }

        // Client type with amounts - UPDATED
        if (order.clientType && result.clientTypes.hasOwnProperty(order.clientType)) {
          result.clientTypes[order.clientType].count++;
          result.clientTypes[order.clientType].amount += orderTotal;
        }

        // Service status
        order.rows?.forEach(row => {
          row.isCompleted ? result.pendingServices[0]++ : result.pendingServices[1]++;
        });
      } catch (err) {
        console.error('Error processing order:', order._id, err);
      }
    });

    // Process appointments
    filteredAppointments.forEach(appointment => {
      try {
        // Define which statuses count as "Done"
        const completedStatuses = ['completed', 'sale closed', 'Closed', 'closed'];
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

    if (selectedMonth !== null) {
      // Get weekly breakdown for all orders - WITH AMOUNT
      const weeklyOrders = await Order.aggregate([
        {
          $match: {
            orderDate: {
              $gte: startDate,
              $lt: endDate
            }
          }
        },
        {
          $project: {
            week: { $week: "$orderDate" },
            month: { $month: "$orderDate" },
            rows: 1
          }
        },
        {
          $group: {
            _id: "$week",
            count: { $sum: 1 },
            amount: { 
              $sum: {
                $sum: "$rows.total"
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Get weekly breakdown for agent orders only - WITH AMOUNT
      const weeklyAgentOrders = await Order.aggregate([
        {
          $match: {
            orderDate: {
              $gte: startDate,
              $lt: endDate
            },
            $or: [
              { clientType: 'Agent' },
              { clientType: 'Renewal-Agent' }
            ]
          }
        },
        {
          $project: {
            week: { $week: "$orderDate" },
            month: { $month: "$orderDate" },
            rows: 1
          }
        },
        {
          $group: {
            _id: "$week",
            count: { $sum: 1 },
            amount: { 
              $sum: {
                $sum: "$rows.total"
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      result.weeklyOrders = weeklyOrders.map(item => ({
        week: item._id - Math.floor(startDate.getDate() / 7),
        count: item.count,
        amount: item.amount || 0
      }));

      result.weeklyAgentOrders = weeklyAgentOrders.map(item => ({
        week: item._id - Math.floor(startDate.getDate() / 7),
        count: item.count,
        amount: item.amount || 0
      }));
    }

    // Log the result for debugging
    console.log('Chart data result:', {
      totalOrdersByMonth: result.totalOrdersByMonth,
      amountByMonth: result.amountByMonth,
      pendingAmount: result.pendingAmount,
      clientTypes: result.clientTypes,
      timePeriod: result.timePeriod
    });

    res.json(result);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/view-orders', async (req, res) => {
  try {
    const { month, year, week, clientType } = req.query;
    
    // Create date range
    let startDate, endDate;
    
    if (week) {
      // Weekly view
      const monthStart = new Date(year, month - 1, 1);
      const firstDay = monthStart.getDay(); // 0-6 (Sun-Sat)
      
      // Calculate week start (Monday-based weeks)
      const weekStart = new Date(year, month - 1, 
        (week - 1) * 7 - firstDay + 1 + (firstDay === 0 ? 1 : 0));
      
      startDate = new Date(weekStart);
      endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + 7);
    } else if (month) {
      // Monthly view (existing)
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    } else {
      // No filter (show all)
      startDate = null;
      endDate = null;
    }

    // Build query with clientType filter
    const query = {};
    if (startDate && endDate) {
      query.orderDate = { $gte: startDate, $lt: endDate };
    }
    if (clientType) {
      query.clientType = clientType;
    }

    const orders = await Order.find(query)
      .sort({ orderDate: -1 })
      .lean();

    res.json(orders);

  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;