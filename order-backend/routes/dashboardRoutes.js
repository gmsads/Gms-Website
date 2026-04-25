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

// Helper function to get calendar year start and end dates (Jan-Dec)
const getCalendarYearDates = (year) => {
  if (year === 'all' || !year) {
    return { startDate: null, endDate: null };
  }
  
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
  
  return { startDate, endDate };
};

// Helper function to get month index (0 = Jan, 11 = Dec)
const getMonthIndex = (date) => {
  return date.getMonth(); // 0-11 (Jan=0, Dec=11)
};

// Helper function to get month name
const getMonthName = (index) => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[index];
};

// Dashboard chart data endpoint with calendar year support
router.get('/chart-data', async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    
    // Parse calendar year
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
    
    // Create date range based on calendar year/month or date range
    let startDateTime, endDateTime;
    
    if (rangeStartDate && rangeEndDate) {
      // Use date range if provided
      startDateTime = rangeStartDate;
      endDateTime = rangeEndDate;
    } else if (selectedYear && selectedMonth !== null) {
      // Specific month in a calendar year
      startDateTime = new Date(selectedYear, selectedMonth, 1);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(selectedYear, selectedMonth + 1, 1);
      endDateTime.setHours(0, 0, 0, 0);
      console.log(`Filtering for: ${selectedYear}, month: ${selectedMonth + 1}`, { startDateTime, endDateTime });
    } else if (selectedYear) {
      // Whole calendar year
      const { startDate: yearStart, endDate: yearEnd } = getCalendarYearDates(selectedYear);
      if (yearStart && yearEnd) {
        startDateTime = yearStart;
        endDateTime = yearEnd;
      }
      console.log(`Filtering for calendar year: ${selectedYear}`, { startDateTime, endDateTime });
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

    // Initialize counters for calendar year (12 months from Jan to Dec)
    const result = {
      totalOrdersByMonth: Array(12).fill(0),
      amountByMonth: Array(12).fill(0),
      totalOrdersAmountByMonth: Array(12).fill(0),
      agentOrdersByMonth: Array(12).fill(0),
      agentAmountByMonth: Array(12).fill(0),
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
        
        // Get month index (0 = Jan, 11 = Dec)
        const monthIndex = getMonthIndex(orderDate);
        
        // Calculate order total amount from rows
        let orderTotal = 0;
        if (order.rows && Array.isArray(order.rows)) {
          orderTotal = order.rows.reduce((sum, row) => {
            return sum + (parseFloat(row.total) || 0);
          }, 0);
        }
        
        // Update monthly totals
        result.totalOrdersByMonth[monthIndex]++;
        result.amountByMonth[monthIndex] += orderTotal;
        result.totalOrdersAmountByMonth[monthIndex] += (order.total || 0);
        
        // Count agent orders by month
        if (order.clientType === 'Agent' || order.clientType === 'Renewal-Agent') {
          result.agentOrdersByMonth[monthIndex]++;
          result.agentAmountByMonth[monthIndex] += orderTotal;
        }

        // If a specific month is selected (not date range), update weekly data
        if (!rangeStartDate && !rangeEndDate && selectedYear && selectedMonth !== null && 
            monthIndex === selectedMonth) {
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
    const appointments = await Appointment.find({}).lean();
    
    // Count appointments
    result.appointments = [appointments.length, 0];

    res.json(result);
  } catch (err) {
    console.error('Error in /chart-data:', err);
    res.status(500).json({ error: err.message });
  }
});

// View orders endpoint with calendar year filtering
router.get('/view-orders', async (req, res) => {
  try {
    const { month, year, week, clientType, startDate, endDate } = req.query;
    
    console.log('📥 /view-orders received query:', { month, year, week, clientType, startDate, endDate });
    
    // Parse calendar year - accept both 'year' and 'calendarYear'
    let selectedYear = null;
    const yearParam = year; // Now using 'year' from frontend
    if (yearParam && yearParam !== 'all' && yearParam !== 'undefined' && yearParam !== 'null') {
      selectedYear = parseInt(yearParam);
    }
    
    // Parse month (1-12 where 1=Jan) - convert to 0-11 for Date object
    let selectedMonth = null;
    if (month && month !== 'undefined' && month !== 'null') {
      selectedMonth = parseInt(month) - 1; // Convert to 0-index (Jan=0)
    }
    
    // Helper function to parse date (handles DD-MM-YYYY format)
    const parseOrderDate = (dateValue) => {
      if (!dateValue) return null;
      try {
        if (typeof dateValue === 'string') {
          if (dateValue.includes('-')) {
            const parts = dateValue.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
              // DD-MM-YYYY format
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              return new Date(dateValue);
            }
          } else {
            return new Date(dateValue);
          }
        }
        return dateValue instanceof Date ? dateValue : new Date(dateValue);
      } catch (e) {
        return null;
      }
    };
    
    // Parse date range
    let startDateTime = null;
    let endDateTime = null;
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
    }
    
    // Get all orders first (excluding trashed)
    let orders = await Order.find({ isTrashed: { $ne: true } }).lean();
    console.log(`Total orders in database: ${orders.length}`);
    
    // Apply filters manually to handle DD-MM-YYYY date format
    let filteredOrders = [...orders];
    
    // Apply date range filter
    if (startDateTime && endDateTime) {
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = parseOrderDate(order.orderDate);
        if (!orderDate) return false;
        return orderDate >= startDateTime && orderDate <= endDateTime;
      });
      console.log(`📅 After date range filter: ${filteredOrders.length} orders`);
    }
    // Apply month and year filter
    else if (selectedYear && selectedMonth !== null) {
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 1);
      monthEnd.setHours(0, 0, 0, 0);
      
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = parseOrderDate(order.orderDate);
        if (!orderDate) return false;
        return orderDate >= monthStart && orderDate < monthEnd;
      });
      console.log(`📅 After month/year filter (${selectedMonth + 1}/${selectedYear}): ${filteredOrders.length} orders`);
    }
    // Apply year only filter
    else if (selectedYear) {
      const yearStart = new Date(selectedYear, 0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = parseOrderDate(order.orderDate);
        if (!orderDate) return false;
        return orderDate >= yearStart && orderDate <= yearEnd;
      });
      console.log(`📅 After year filter (${selectedYear}): ${filteredOrders.length} orders`);
    }
    
    // Apply client type filter
    if (clientType && clientType !== 'undefined' && clientType !== 'null') {
      filteredOrders = filteredOrders.filter(order => order.clientType === clientType);
      console.log(`🏷️ After client type filter: ${filteredOrders.length} orders`);
    }
    
    // Format orders for frontend
    const formattedOrders = filteredOrders.map(order => {
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
    
    // Sort by order date (newest first)
    formattedOrders.sort((a, b) => {
      const dateA = parseOrderDate(a.orderDate);
      const dateB = parseOrderDate(b.orderDate);
      return dateB - dateA;
    });
    
    console.log(`✅ Final filtered orders: ${formattedOrders.length}`);
    res.json(formattedOrders);

  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Prospective clients stats endpoint with calendar year support
router.get('/prospective-clients/stats', async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    
    // Parse calendar year
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) - 1 : null;
    
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
    } else if (selectedYear && selectedMonth !== null) {
      // Specific month in calendar year
      queryStartDate = new Date(selectedYear, selectedMonth, 1);
      queryEndDate = new Date(selectedYear, selectedMonth + 1, 1);
    } else if (selectedYear) {
      // Full calendar year
      queryStartDate = new Date(selectedYear, 0, 1);
      queryEndDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
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
        month: selectedMonth !== null ? selectedMonth + 1 : null,
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
    res.json({ count: 0 });
  } catch (error) {
    console.error('Error in /whatsapp/unread-count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comparison chart data for past 3 months with calendar year support
router.get('/comparison-data', async (req, res) => {
  try {
    const { year, calendarYear, month, startDate, endDate } = req.query;
    
    // Parse calendar year - support both 'year' and 'calendarYear' params
    let selectedYear = null;
    const yearParam = year || calendarYear;
    if (yearParam && yearParam !== 'all' && yearParam !== 'undefined' && yearParam !== 'null') {
      selectedYear = parseInt(yearParam);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) - 1 : null;
    
    // Parse date range if provided
    let rangeStartDate = null;
    let rangeEndDate = null;
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      rangeStartDate = new Date(startDate);
      rangeStartDate.setHours(0, 0, 0, 0);
      
      rangeEndDate = new Date(endDate);
      rangeEndDate.setHours(23, 59, 59, 999);
    }

    // Determine the date range for comparison
    // We want to show the last 3 months based on the filter
    let comparisonMonths = [];
    
    if (rangeStartDate && rangeEndDate) {
      // If date range is selected, show the months within that range
      const start = new Date(rangeStartDate);
      const end = new Date(rangeEndDate);
      
      // Get unique months between start and end
      const months = new Set();
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        months.add(`${currentDate.getFullYear()}-${currentDate.getMonth()}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Convert to array and sort
      comparisonMonths = Array.from(months).map(m => {
        const [y, mth] = m.split('-').map(Number);
        return { year: y, month: mth };
      }).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      
      // Limit to last 3 months if more than 3
      if (comparisonMonths.length > 3) {
        comparisonMonths = comparisonMonths.slice(-3);
      }
    } else if (selectedYear && selectedMonth !== null) {
      // If specific month is selected, show that month and previous 2
      for (let i = 2; i >= 0; i--) {
        let monthIndex = selectedMonth - i;
        let year = selectedYear;
        
        while (monthIndex < 0) {
          monthIndex += 12;
          year -= 1;
        }
        
        comparisonMonths.push({ year, month: monthIndex });
      }
    } else if (selectedYear) {
      // If year is selected, show last 3 months that have data (or Oct, Nov, Dec if no data)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      if (selectedYear === currentYear) {
        // Current year - show last 3 months including current month
        for (let i = 2; i >= 0; i--) {
          let monthIndex = currentMonth - i;
          let year = selectedYear;
          
          if (monthIndex < 0) {
            monthIndex += 12;
            year -= 1;
          }
          
          // Don't add future months
          if (year < currentYear || (year === currentYear && monthIndex <= currentMonth)) {
            comparisonMonths.push({ year, month: monthIndex });
          }
        }
      } else if (selectedYear < currentYear) {
        // Past year - show last 3 months of that year (Oct, Nov, Dec)
        comparisonMonths.push({ year: selectedYear, month: 9 }); // Oct
        comparisonMonths.push({ year: selectedYear, month: 10 }); // Nov
        comparisonMonths.push({ year: selectedYear, month: 11 }); // Dec
      } else {
        // Future year - show first 3 months (Jan, Feb, Mar) or empty
        comparisonMonths.push({ year: selectedYear, month: 0 }); // Jan
        comparisonMonths.push({ year: selectedYear, month: 1 }); // Feb
        comparisonMonths.push({ year: selectedYear, month: 2 }); // Mar
      }
    } else {
      // Default - show last 3 months including current (that have actual data)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      for (let i = 2; i >= 0; i--) {
        let monthIndex = currentMonth - i;
        let year = currentYear;
        
        if (monthIndex < 0) {
          monthIndex += 12;
          year -= 1;
        }
        
        comparisonMonths.push({ year, month: monthIndex });
      }
    }

    // Remove any duplicate months (shouldn't happen but just in case)
    const uniqueMonths = new Map();
    for (const month of comparisonMonths) {
      const key = `${month.year}-${month.month}`;
      if (!uniqueMonths.has(key)) {
        uniqueMonths.set(key, month);
      }
    }
    comparisonMonths = Array.from(uniqueMonths.values());

    console.log('Comparison months:', comparisonMonths);

    // Fetch all orders
    const orders = await Order.find({}).lean();
    
    console.log(`Total orders in database: ${orders.length}`);
    
    // Month labels for display
    const monthLabels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // Prepare result structure
    const result = {
      months: [],
      ordersData: [],
      amountData: [],
      rawData: []
    };

    // Process each comparison month
    for (const { year, month } of comparisonMonths) {
      const monthStart = new Date(year, month, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(year, month + 1, 1);
      monthEnd.setHours(0, 0, 0, 0);
      
      console.log(`Processing month: ${monthLabels[month]} ${year}, from ${monthStart} to ${monthEnd}`);
      
      // Filter orders for this month
      const monthOrders = orders.filter(order => {
        try {
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
            return false;
          }
          
          if (!orderDate || isNaN(orderDate.getTime())) {
            console.log('Invalid date for order:', order._id);
            return false;
          }
          
          const isInRange = orderDate >= monthStart && orderDate < monthEnd;
          return isInRange;
        } catch (e) {
          console.error('Error processing order date:', e);
          return false;
        }
      });

      console.log(`Found ${monthOrders.length} orders for ${monthLabels[month]} ${year}`);

      // Calculate total amount for this month
      let totalAmount = 0;
      monthOrders.forEach(order => {
        if (order.rows && Array.isArray(order.rows)) {
          const orderTotal = order.rows.reduce((sum, row) => {
            return sum + (parseFloat(row.total) || 0);
          }, 0);
          totalAmount += orderTotal;
        }
      });

      // Add to result
      result.months.push(`${monthLabels[month]} ${year}`);
      result.ordersData.push(monthOrders.length);
      result.amountData.push(totalAmount);
      result.rawData.push({
        year,
        month,
        orders: monthOrders.length,
        amount: totalAmount,
        monthName: `${monthLabels[month]} ${year}`
      });
    }

    console.log('Comparison result:', {
      months: result.months,
      ordersData: result.ordersData,
      amountData: result.amountData
    });

    res.json(result);

  } catch (err) {
    console.error('Error in /comparison-data:', err);
    res.status(500).json({ error: err.message });
  }
});
// Top products analysis endpoint - shows which products are ordered most frequently with quantities
router.get('/top-products', async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    
    // Parse calendar year
    let selectedYear = null;
    if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      selectedYear = parseInt(year);
    }
    
    const selectedMonth = month && month !== 'undefined' && month !== 'null' ? parseInt(month) - 1 : null;
    
    // Parse date range if provided
    let rangeStartDate = null;
    let rangeEndDate = null;
    
    if (startDate && endDate && startDate !== 'undefined' && endDate !== 'undefined') {
      rangeStartDate = new Date(startDate);
      rangeStartDate.setHours(0, 0, 0, 0);
      rangeEndDate = new Date(endDate);
      rangeEndDate.setHours(23, 59, 59, 999);
    }
    
    // Create date range
    let startDateTime, endDateTime;
    
    if (rangeStartDate && rangeEndDate) {
      startDateTime = rangeStartDate;
      endDateTime = rangeEndDate;
    } else if (selectedYear && selectedMonth !== null) {
      startDateTime = new Date(selectedYear, selectedMonth, 1);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(selectedYear, selectedMonth + 1, 1);
      endDateTime.setHours(0, 0, 0, 0);
    } else if (selectedYear) {
      startDateTime = new Date(selectedYear, 0, 1);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
    } else {
      startDateTime = new Date('2000-01-01');
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date('2100-01-01');
      endDateTime.setHours(0, 0, 0, 0);
    }

    // Fetch all requirements (products)
    const Requirement = require('../models/Requirement');
    const allRequirements = await Requirement.find({}).lean();
    console.log(`Found ${allRequirements.length} requirements in database`);

    // Fetch all orders
    const orders = await Order.find({}).lean();
    
    // Filter orders by date
    const filteredOrders = orders.filter(order => {
      try {
        let orderDate;
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
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
          return false;
        }
        
        if (!orderDate || isNaN(orderDate.getTime())) return false;
        return orderDate >= startDateTime && orderDate < endDateTime;
      } catch (e) {
        return false;
      }
    });

    console.log(`Analyzing ${filteredOrders.length} orders for top products`);

    // Initialize product tracking with quantity and amount
    const productStats = {};
    
    // Initialize all requirements with zero stats
    allRequirements.forEach(req => {
      const productName = req.name || req.requirementName || req.title;
      if (productName) {
        productStats[productName] = {
          orderCount: 0,
          totalQuantity: 0,
          totalAmount: 0  // This will store ONLY the amount for THIS product
        };
      }
    });

    // Also track products that might not be in requirements but appear in orders
    const extraProducts = {};

    // Process each order
    filteredOrders.forEach(order => {
      // Track which products we've already counted for order count (once per order per product)
      const productsCountedForOrder = new Set();
      
      if (order.rows && Array.isArray(order.rows)) {
        order.rows.forEach(row => {
          // Get quantity for this specific product
          const quantity = parseFloat(row.quantity) || 0;
          
          // Get the amount for this SPECIFIC product (not the whole order)
          const productAmount = parseFloat(row.total) || 0;
          
          // Get product name from various possible fields
          let productName = null;
          
          // Check requirement field first
          if (row.requirement && typeof row.requirement === 'string' && row.requirement.trim()) {
            productName = row.requirement.trim();
          }
          // Then check customRequirement
          else if (row.customRequirement && typeof row.customRequirement === 'string' && row.customRequirement.trim()) {
            productName = row.customRequirement.trim();
          }
          // Then check description
          else if (row.description && typeof row.description === 'string' && row.description.trim()) {
            productName = row.description.trim();
          }
          
          if (productName) {
            // Try to match with requirements in database for consistent naming
            let matchedProduct = null;
            for (const req of allRequirements) {
              const reqName = req.name || req.requirementName || req.title;
              if (reqName && productName.toLowerCase().includes(reqName.toLowerCase())) {
                matchedProduct = reqName;
                break;
              }
            }
            
            // If no match found, use the original name
            const finalProductName = matchedProduct || productName;
            
            // Debug logging to verify amounts
            console.log(`Product: ${finalProductName}, Quantity: ${quantity}, Amount: ${productAmount}`);
            
            // Check if product exists in productStats
            if (productStats[finalProductName]) {
              // ✅ Add quantity for this specific product
              productStats[finalProductName].totalQuantity += quantity;
              
              // ✅ Add amount for this SPECIFIC product (NOT the whole order total)
              productStats[finalProductName].totalAmount += productAmount;
              
              // Only count order once per product
              if (!productsCountedForOrder.has(finalProductName)) {
                productsCountedForOrder.add(finalProductName);
                productStats[finalProductName].orderCount++;
              }
            } else {
              // Track extra products not in requirements
              if (!extraProducts[finalProductName]) {
                extraProducts[finalProductName] = {
                  orderCount: 0,
                  totalQuantity: 0,
                  totalAmount: 0
                };
              }
              extraProducts[finalProductName].totalQuantity += quantity;
              extraProducts[finalProductName].totalAmount += productAmount;  // ✅ Add per-product amount
              if (!productsCountedForOrder.has(finalProductName)) {
                productsCountedForOrder.add(finalProductName);
                extraProducts[finalProductName].orderCount++;
              }
            }
          }
        });
      }
    });

    // Merge extra products into productStats
    Object.entries(extraProducts).forEach(([name, stats]) => {
      if (productStats[name]) {
        // If product already exists, merge the stats
        productStats[name].totalQuantity += stats.totalQuantity;
        productStats[name].totalAmount += stats.totalAmount;
        productStats[name].orderCount += stats.orderCount;
      } else {
        productStats[name] = stats;
      }
    });

    // Convert to array, filter out zero orderCount, and sort by orderCount (most ordered first)
    const allProductsArray = Object.entries(productStats)
      .filter(([, stats]) => stats.orderCount > 0 || stats.totalQuantity > 0)
      .map(([name, stats]) => ({
        name,
        orderCount: stats.orderCount,
        totalQuantity: stats.totalQuantity,
        totalAmount: stats.totalAmount  // This is now the correct per-product amount
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    // Get top 3 products
    const top3Products = allProductsArray.slice(0, 3);
    
    console.log('=== TOP PRODUCTS ANALYSIS ===');
    console.log(`Total products with orders: ${allProductsArray.length}`);
    console.log(`Top 3 Products:`);
    top3Products.forEach((p, i) => {
      console.log(`${i+1}. ${p.name}: ${p.orderCount} orders, ${p.totalQuantity} units, Amount: ₹${p.totalAmount.toFixed(2)}`);
    });
    
    // Also log a sample of other products for verification
    if (allProductsArray.length > 3) {
      console.log(`Sample of other products:`);
      allProductsArray.slice(3, 8).forEach((p, i) => {
        console.log(`  ${i+4}. ${p.name}: ${p.orderCount} orders, ₹${p.totalAmount.toFixed(2)}`);
      });
    }

    res.json({
      topProducts: top3Products,
      allProducts: allProductsArray,
      totalProducts: allProductsArray.length,
      totalRequirements: allRequirements.length,
      totalOrdersAnalyzed: filteredOrders.length,
      totalQuantitySum: allProductsArray.reduce((sum, p) => sum + p.totalQuantity, 0),
      totalAmountSum: allProductsArray.reduce((sum, p) => sum + p.totalAmount, 0),
      timePeriod: {
        year: selectedYear || 'all',
        month: selectedMonth !== null ? selectedMonth + 1 : null,
      }
    });

  } catch (err) {
    console.error('Error in /top-products:', err);
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;