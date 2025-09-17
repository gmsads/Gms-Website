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

    // Initialize counters
    const result = {
      totalOrdersByMonth: selectedMonth !== null ? [filteredOrders.length] : Array(12).fill(0),
      agentOrdersByMonth: selectedMonth !== null ? [0] : Array(12).fill(0), // Added for agent orders
      pendingPayments: [0, 0],
      pendingServices: [0, 0],
      appointments: [0, 0], // [Done, Upcoming]
      clientTypes: { New: 0, Renewal: 0, Agent: 0, 'Renewal-Agent': 0 },
      timePeriod: {
        year: selectedYear,
        month: selectedMonth !== null ? selectedMonth + 1 : null
      }
    };

    // Process filtered orders
    filteredOrders.forEach(order => {
      try {
        const orderDate = new Date(order.orderDate);
        const month = orderDate.getMonth();
        
        if (selectedMonth === null) {
          result.totalOrdersByMonth[month]++;
          // Count agent orders by month
          if (order.clientType === 'Agent' || order.clientType === 'Renewal-Agent') {
            result.agentOrdersByMonth[month]++;
          }
        }

        // Payment status
        order.balance > 0 ? result.pendingPayments[1]++ : result.pendingPayments[0]++;

        // Client type
        if (order.clientType && result.clientTypes.hasOwnProperty(order.clientType)) {
          result.clientTypes[order.clientType]++;
        }

        // Service status
        order.rows?.forEach(row => {
          row.isCompleted ? result.pendingServices[0]++ : result.pendingServices[1]++;
        });
      } catch (err) {
        console.error('Error processing order:', order._id, err);
      }
    });

    // Process appointments - MODIFIED LOGIC
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
      // Get weekly breakdown for all orders
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
            month: { $month: "$orderDate" }
          }
        },
        {
          $group: {
            _id: "$week",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Get weekly breakdown for agent orders only
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
            month: { $month: "$orderDate" }
          }
        },
        {
          $group: {
            _id: "$week",
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      result.weeklyOrders = weeklyOrders.map(item => ({
        week: item._id - Math.floor(startDate.getDate() / 7),
        count: item.count
      }));

      result.weeklyAgentOrders = weeklyAgentOrders.map(item => ({
        week: item._id - Math.floor(startDate.getDate() / 7),
        count: item.count
      }));
    }

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