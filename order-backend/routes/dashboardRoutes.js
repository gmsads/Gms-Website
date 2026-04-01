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

// Helper function to get financial year start and end dates
const getFinancialYearDates = (financialYear) => {
  if (financialYear === 'all' || !financialYear) {
    return { startDate: null, endDate: null };
  }
  
  const [startYear, endYear] = financialYear.split('-').map(Number);
  const startDate = new Date(startYear, 3, 1); // April 1st (month 3 = April)
  const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31st (month 2 = March)
  
  return { startDate, endDate };
};

// Helper function to get month index in financial year (0 = April, 11 = March)
const getFinancialMonthIndex = (date) => {
  const month = date.getMonth(); // 0-11 (Jan=0)
  if (month >= 3) { // April to December
    return month - 3;
  } else { // January to March
    return month + 9;
  }
};

// Helper function to get month name for financial year
const getFinancialMonthName = (index) => {
  const months = [
    'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
  ];
  return months[index];
};

// Dashboard chart data endpoint with financial year support
router.get('/chart-data', async (req, res) => {
  try {
    const { financialYear, month, startDate, endDate } = req.query;
    
    // Parse financial year
    let selectedFinancialYear = null;
    if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
      selectedFinancialYear = financialYear;
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
    
    // Create date range based on financial year/month or date range
    let startDateTime, endDateTime;
    
    if (rangeStartDate && rangeEndDate) {
      // Use date range if provided
      startDateTime = rangeStartDate;
      endDateTime = rangeEndDate;
    } else if (selectedFinancialYear && selectedMonth !== null) {
      // Specific month in a financial year
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      
      if (fyStart && fyEnd) {
        // Get the month's start and end within the financial year
        if (selectedMonth >= 0 && selectedMonth <= 11) {
          // Map financial month index to actual calendar month
          let calendarMonth;
          let year;
          
          if (selectedMonth <= 8) { // Apr to Dec (0-8)
            calendarMonth = selectedMonth + 3; // Apr=3, May=4, etc.
            year = fyStart.getFullYear();
          } else { // Jan to Mar (9-11)
            calendarMonth = selectedMonth - 9; // Jan=0, Feb=1, Mar=2
            year = fyEnd.getFullYear();
          }
          
          startDateTime = new Date(year, calendarMonth, 1);
          startDateTime.setHours(0, 0, 0, 0);
          endDateTime = new Date(year, calendarMonth + 1, 1);
          endDateTime.setHours(0, 0, 0, 0);
        }
      }
      console.log(`Filtering for: ${selectedFinancialYear}, month index: ${selectedMonth}`, { startDateTime, endDateTime });
    } else if (selectedFinancialYear) {
      // Whole financial year
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      if (fyStart && fyEnd) {
        startDateTime = fyStart;
        endDateTime = fyEnd;
      }
      console.log(`Filtering for financial year: ${selectedFinancialYear}`, { startDateTime, endDateTime });
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
        if (!selectedFinancialYear && !rangeStartDate && !rangeEndDate) return true;
        
        return orderDate >= startDateTime && orderDate < endDateTime;
      } catch (e) {
        console.error('Error parsing date for order:', order._id, e);
        return false;
      }
    });

    console.log(`Filtered orders: ${filteredOrders.length}`);

    // Initialize counters for financial year (12 months from Apr to Mar)
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
        financialYear: selectedFinancialYear || 'all',
        month: selectedMonth !== null ? selectedMonth + 1 : null,
        startDate: rangeStartDate,
        endDate: rangeEndDate
      }
    };

    // If a specific month is selected (not date range), calculate weekly data
    if (!rangeStartDate && !rangeEndDate && selectedFinancialYear && selectedMonth !== null) {
      // Get the actual calendar month from financial month
      let calendarMonth, year;
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      
      if (selectedMonth <= 8) { // Apr to Dec
        calendarMonth = selectedMonth + 3;
        year = fyStart.getFullYear();
      } else { // Jan to Mar
        calendarMonth = selectedMonth - 9;
        year = fyEnd.getFullYear();
      }
      
      const firstDayOfMonth = new Date(year, calendarMonth, 1);
      const lastDayOfMonth = new Date(year, calendarMonth + 1, 0);
      
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
        
        // Get financial month index (0 = April, 11 = March)
        const monthIndex = getFinancialMonthIndex(orderDate);
        
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
        if (!rangeStartDate && !rangeEndDate && selectedFinancialYear && selectedMonth !== null && 
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
    if (selectedFinancialYear && selectedMonth !== null && !rangeStartDate && !rangeEndDate) {
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

// View orders endpoint with financial year filtering
router.get('/view-orders', async (req, res) => {
  try {
    const { month, year, week, clientType, financialYear, startDate, endDate } = req.query;
    
    // Parse financial year
    let selectedFinancialYear = null;
    if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
      selectedFinancialYear = financialYear;
    }
    
    // Parse month (financial month index 1-12 where 1=April)
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
    } else if (selectedFinancialYear) {
      // Financial year filter
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      
      if (selectedMonth && selectedWeek) {
        // Weekly view within a month
        const { startDate: fyStartDate } = getFinancialYearDates(selectedFinancialYear);
        
        // Get actual calendar month
        let calendarMonth, year;
        const monthIndex = selectedMonth - 1; // 0-11 financial month
        if (monthIndex <= 8) { // Apr to Dec
          calendarMonth = monthIndex + 3;
          year = fyStartDate.getFullYear();
        } else { // Jan to Mar
          calendarMonth = monthIndex - 9;
          year = fyEnd.getFullYear();
        }
        
        const monthStart = new Date(year, calendarMonth, 1);
        const firstDay = monthStart.getDay(); // 0-6 (Sun-Sat)
        
        // Calculate week start (Monday-based weeks)
        const weekStart = new Date(year, calendarMonth, 
          (selectedWeek - 1) * 7 - firstDay + 1 + (firstDay === 0 ? 1 : 0));
        
        queryStartDate = new Date(weekStart);
        queryEndDate = new Date(weekStart);
        queryEndDate.setDate(weekStart.getDate() + 7);
      } else if (selectedMonth) {
        // Monthly view within financial year
        const monthIndex = selectedMonth - 1; // 0-11 financial month
        let calendarMonth, year;
        
        if (monthIndex <= 8) { // Apr to Dec
          calendarMonth = monthIndex + 3;
          year = fyStart.getFullYear();
        } else { // Jan to Mar
          calendarMonth = monthIndex - 9;
          year = fyEnd.getFullYear();
        }
        
        queryStartDate = new Date(year, calendarMonth, 1);
        queryEndDate = new Date(year, calendarMonth + 1, 1);
      } else {
        // Full financial year
        queryStartDate = fyStart;
        queryEndDate = fyEnd;
      }
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

// Prospective clients stats endpoint with financial year support
router.get('/prospective-clients/stats', async (req, res) => {
  try {
    const { financialYear, month, startDate, endDate } = req.query;
    
    // Parse financial year
    let selectedFinancialYear = null;
    if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
      selectedFinancialYear = financialYear;
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
    } else if (selectedFinancialYear && selectedMonth) {
      // Specific month in financial year
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      const monthIndex = selectedMonth - 1;
      let calendarMonth, year;
      
      if (monthIndex <= 8) { // Apr to Dec
        calendarMonth = monthIndex + 3;
        year = fyStart.getFullYear();
      } else { // Jan to Mar
        calendarMonth = monthIndex - 9;
        year = fyEnd.getFullYear();
      }
      
      queryStartDate = new Date(year, calendarMonth, 1);
      queryEndDate = new Date(year, calendarMonth + 1, 1);
    } else if (selectedFinancialYear) {
      // Full financial year
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      queryStartDate = fyStart;
      queryEndDate = fyEnd;
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
        financialYear: selectedFinancialYear || 'all',
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
    res.json({ count: 0 });
  } catch (error) {
    console.error('Error in /whatsapp/unread-count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comparison chart data for past 3 months with financial year support
router.get('/comparison-data', async (req, res) => {
  try {
    const { financialYear, month, startDate, endDate } = req.query;
    
    // Parse financial year
    let selectedFinancialYear = null;
    if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
      selectedFinancialYear = financialYear;
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
    } else if (selectedFinancialYear && selectedMonth !== null) {
      // If specific month is selected, show that month and previous 2
      const { startDate: fyStart } = getFinancialYearDates(selectedFinancialYear);
      const currentYear = fyStart.getFullYear();
      
      for (let i = 2; i >= 0; i--) {
        let monthIndex = selectedMonth - i;
        let year = currentYear;
        
        while (monthIndex < 0) {
          monthIndex += 12;
          year -= 1;
        }
        
        // Convert financial month to calendar month
        let calendarMonth;
        if (monthIndex <= 8) { // Apr to Dec
          calendarMonth = monthIndex + 3;
        } else { // Jan to Mar
          calendarMonth = monthIndex - 9;
        }
        
        comparisonMonths.push({ year, month: calendarMonth });
      }
    } else if (selectedFinancialYear) {
      // If financial year is selected, show last 3 months of that financial year
      const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(selectedFinancialYear);
      const currentDate = new Date();
      const isCurrentFY = currentDate >= fyStart && currentDate <= fyEnd;
      
      if (isCurrentFY) {
        // Current financial year - show last 3 months including current
        for (let i = 2; i >= 0; i--) {
          let currentMonth = currentDate.getMonth();
          let year = currentDate.getFullYear();
          let monthIndex = currentMonth - i;
          
          while (monthIndex < 0) {
            monthIndex += 12;
            year -= 1;
          }
          
          comparisonMonths.push({ year, month: monthIndex });
        }
      } else {
        // Past financial year - show last 3 months of that financial year
        // Last 3 months are Jan, Feb, Mar of end year
        comparisonMonths.push({ year: fyEnd.getFullYear(), month: 0 }); // Jan
        comparisonMonths.push({ year: fyEnd.getFullYear(), month: 1 }); // Feb
        comparisonMonths.push({ year: fyEnd.getFullYear(), month: 2 }); // Mar
      }
    } else {
      // Default - show last 3 months including current
      const currentDate = new Date();
      for (let i = 2; i >= 0; i--) {
        let month = currentDate.getMonth() - i;
        let year = currentDate.getFullYear();
        
        while (month < 0) {
          month += 12;
          year -= 1;
        }
        
        comparisonMonths.push({ year, month });
      }
    }

    console.log('Comparison months:', comparisonMonths);

    // Fetch all orders
    const orders = await Order.find({}).lean();
    
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
    comparisonMonths.forEach(({ year, month }) => {
      const monthStart = new Date(year, month, 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(year, month + 1, 1);
      monthEnd.setHours(0, 0, 0, 0);
      
      // Filter orders for this month
      const monthOrders = orders.filter(order => {
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
          
          return orderDate >= monthStart && orderDate < monthEnd;
        } catch (e) {
          return false;
        }
      });

      // Calculate total amount for this month
      let totalAmount = 0;
      monthOrders.forEach(order => {
        if (order.rows && Array.isArray(order.rows)) {
          totalAmount += order.rows.reduce((sum, row) => {
            return sum + (parseFloat(row.total) || 0);
          }, 0);
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
    });

    res.json(result);

  } catch (err) {
    console.error('Error in /comparison-data:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;