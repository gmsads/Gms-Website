const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');

const Executive = require('../models/Executive');
const ServiceExecutive = require('../models/ServiceExecutive');
const Account = require('../models/Account');
const FieldExecutive = require('../models/FieldExecutive'); // Use your existing model
const ProspectiveClient = require('../models/ProspectiveClients');
const Report = require('../models/ExecutiveRecord');
const Target = require('../models/Target');
const Order = require('../models/Order');

// Helper function to safely sum numbers
const safeSum = (array, field) => {
  return array.reduce((sum, item) => {
    const value = Number(item[field]);
    return sum + (isNaN(value) ? 0 : value);
  }, 0);
};

// ========================================
// GET overall monthly performance for all executives WITH FILTERS
// ========================================
router.get('/overall', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Use filters if provided, otherwise use current month/year
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    console.log(`Fetching overall performance for Month: ${targetMonth}, Year: ${targetYear}`);

    // Calculate date range for the selected month/year
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    console.log(`Date range: ${startDate} to ${endDate}`);

    // Fetch all executives from all types INCLUDING FIELD EXECUTIVES
    const [salesExecs, serviceExecs, accounts, fieldExecs] = await Promise.all([
      Executive.find().select('name dateOfJoining'),
      ServiceExecutive.find().select('name dateOfJoining'),
      Account.find().select('name dateOfJoining'),
      FieldExecutive.find().select('name joiningDate') // Use joiningDate instead of dateOfJoining
    ]);

    const allExecutives = [
      ...salesExecs.map(e => ({...e.toObject(), type: 'executive', dateOfJoining: e.dateOfJoining})),
      ...serviceExecs.map(e => ({...e.toObject(), type: 'service', dateOfJoining: e.dateOfJoining})),
      ...accounts.map(e => ({...e.toObject(), type: 'account', dateOfJoining: e.dateOfJoining})),
      ...fieldExecs.map(e => ({...e.toObject(), type: 'field', dateOfJoining: e.joiningDate})) // Map joiningDate to dateOfJoining
    ];

    const performanceData = [];

    // Get performance data for each executive
    for (const executive of allExecutives) {
      try {
        // Fetch data for the selected month/year
        const [prospects, reports, orders, targets] = await Promise.all([
          ProspectiveClient.find({
            ExcutiveName: executive.name,
            createdAt: { $gte: startDate, $lte: endDate }
          }),
          Report.find({
            executiveName: executive.name,
            date: { $gte: startDate, $lte: endDate }
          }).lean(),
          Order.find({
            executive: executive.name,
            orderDate: { $gte: startDate, $lte: endDate }
          }),
          Target.find({
            executiveName: executive.name,
            year: targetYear.toString(),
            month: targetMonth.toString()
          })
        ]);

        // Calculate totals
        const totalTarget = safeSum(targets, 'targetAmount');
        const totalAchieved = orders.reduce((sum, order) => {
          return sum + (order.rows || []).reduce((rowSum, row) => {
            return rowSum + (Number(row.total) || 0);
          }, 0);
        }, 0);

        const totalOrders = orders.length;
        const totalProspects = prospects.length;
        const totalCalls = safeSum(reports, 'totalCalls');
        const totalWhatsapp = safeSum(reports, 'whatsapp');

        // Calculate performance percentage
        const performancePercentage = totalTarget > 0 
          ? (totalAchieved / totalTarget) * 100 
          : totalAchieved > 0 ? 100 : 0;

        performanceData.push({
          executiveName: executive.name,
          executiveType: executive.type,
          executiveId: executive._id,
          totalTarget,
          totalAchieved,
          totalOrders,
          totalProspects,
          totalCalls,
          totalWhatsapp,
          performancePercentage: Math.round(performancePercentage * 100) / 100,
          month: targetMonth,
          year: targetYear
        });

      } catch (execError) {
        console.error(`Error processing executive ${executive.name}:`, execError);
        // Continue with next executive even if one fails
        continue;
      }
    }

    // Filter out executives with no activity and sort by performance percentage (descending)
    const activeExecutives = performanceData
      .filter(exec => exec.totalTarget > 0 || exec.totalAchieved > 0 || exec.totalOrders > 0)
      .sort((a, b) => b.performancePercentage - a.performancePercentage);

    console.log(`Found ${activeExecutives.length} active executives for ${targetMonth}/${targetYear}`);

    res.json(activeExecutives);

  } catch (err) {
    console.error('Error fetching overall performance data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch overall performance data',
      details: err.message 
    });
  }
});

// ========================================
// GET performance data for an executive
// ========================================
router.get('/', async (req, res) => {
  try {
    const { executiveId, executiveType, startDate, endDate } = req.query;

    // Validate executiveId and executiveType
    if (!executiveId || !executiveType) {
      return res.status(400).json({ error: 'executiveId and executiveType are required' });
    }

    let executive;
    let executiveName;
    
    // Find executive based on type - ADD FIELD EXECUTIVE CASE
    switch(executiveType) {
      case 'executive':
        executive = await Executive.findById(executiveId);
        executiveName = executive?.name;
        break;
      case 'service':
        executive = await ServiceExecutive.findById(executiveId);
        executiveName = executive?.name;
        break;
      case 'account':
        executive = await Account.findById(executiveId);
        executiveName = executive?.name;
        break;
      case 'field': // ADD FIELD EXECUTIVE CASE
        // For field executives, find by _id
        executive = await FieldExecutive.findById(executiveId);
        if (!executive) {
          // Try to find by name if ID lookup fails
          executive = await FieldExecutive.findOne({ name: executiveId });
        }
        executiveName = executive?.name || executiveId;
        break;
      default:
        return res.status(400).json({ error: 'Invalid executive type' });
    }

    if (!executive && executiveType !== 'field') {
      return res.status(404).json({ error: 'Executive not found' });
    }

    // If it's a field executive and we couldn't find it in DB, create a minimal object
    if (executiveType === 'field' && !executive) {
      executive = {
        _id: executiveId,
        name: executiveName,
        dateOfJoining: new Date('2024-01-01') // Default date
      };
    } else if (executiveType === 'field' && executive) {
      // For field executives, map joiningDate to dateOfJoining
      executive.dateOfJoining = executive.joiningDate || new Date('2024-01-01');
    }

    // Determine date window
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start = executive.dateOfJoining
        ? new Date(executive.dateOfJoining)
        : new Date('2000-01-01');
      end = new Date();
    }
    end.setHours(23, 59, 59, 999);

    // Fetch data in parallel
    const [prospects, reports, orders, targets] = await Promise.all([
      ProspectiveClient.find({
        ExcutiveName: executiveName,
        createdAt: { $gte: start, $lte: end }
      }),
      Report.find({
        executiveName: executiveName,
        date: { $gte: start, $lte: end }
      }).lean(),
      Order.find({
        executive: executiveName,
        orderDate: { $gte: start, $lte: end }
      }),
      Target.find({
        executiveName: executiveName,
        $or: [
          {
            year: dayjs(start).format('YYYY'),
            month: { $gte: dayjs(start).format('M') }
          },
          {
            year: { 
              $gt: dayjs(start).format('YYYY'),
              $lt: dayjs(end).format('YYYY') 
            }
          },
          {
            year: dayjs(end).format('YYYY'),
            month: { $lte: dayjs(end).format('M') }
          }
        ]
      })
    ]);

    // Calculate totals with proper validation
    const totalCalls = safeSum(reports, 'totalCalls');
    const totalWhatsapp = safeSum(reports, 'whatsapp');
    const totalOrders = orders.length;
    
    const totalAchieved = orders.reduce((sum, order) => {
      return sum + (order.rows || []).reduce((rowSum, row) => {
        return rowSum + (Number(row.total) || 0);
      }, 0);
    }, 0);

    // Calculate total advance amount
    const totalAdvance = orders.reduce((sum, order) => {
      return sum + (Number(order.advance) || 0);
    }, 0);

    // Calculate average call duration
    const callDurations = reports.flatMap(r => 
      Array.isArray(r.callDurations) ? r.callDurations : []
    );
    const avgCallDuration = callDurations.length > 0
      ? callDurations.reduce((a, b) => a + (Number(b) || 0), 0) / callDurations.length
      : 0;

    // Helper function to get month-year key from date
    const getMonthYearKey = (date) => {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${year}-${month}`;
    };

    // Group targets by month-year and initialize order counts and prospects
    const monthlyTargets = {};
    targets.forEach(target => {
      const key = `${target.year}-${target.month}`;
      
      if (!monthlyTargets[key]) {
        monthlyTargets[key] = {
          target: 0,
          achieved: 0,
          advance: 0,
          orders: 0,
          prospects: 0,
          month: target.month,
          year: target.year
        };
      }
      
      monthlyTargets[key].target += Number(target.targetAmount) || 0;
    });

    // Calculate achieved amounts, advance amounts and order counts by month
    orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const key = getMonthYearKey(orderDate);
      
      if (monthlyTargets[key]) {
        const orderTotal = (order.rows || []).reduce((sum, row) => {
          return sum + (Number(row.total) || 0);
        }, 0);
        
        monthlyTargets[key].achieved += orderTotal;
        monthlyTargets[key].advance += Number(order.advance) || 0;
        monthlyTargets[key].orders += 1;
      }
    });

    // Handle prospects - create entries and count in ONE LOOP (FIXED)
    prospects.forEach(prospect => {
      const prospectDate = new Date(prospect.createdAt);
      const key = getMonthYearKey(prospectDate);
      
      if (!monthlyTargets[key]) {
        const month = prospectDate.getMonth() + 1;
        const year = prospectDate.getFullYear();
        
        monthlyTargets[key] = {
          target: 0,
          achieved: 0,
          advance: 0,
          orders: 0,
          prospects: 0,
          month: month,
          year: year
        };
      }
      
      // Count each prospect only ONCE
      monthlyTargets[key].prospects += 1;
    });

    // Calculate monthly metrics
    const months = Object.values(monthlyTargets);
    const totalMonthlyTarget = months.reduce((sum, m) => sum + m.target, 0);
    const totalMonthlyAchieved = months.reduce((sum, m) => sum + m.achieved, 0);
    const totalMonthlyAdvance = months.reduce((sum, m) => sum + m.advance, 0);
    const totalMonthlyOrders = months.reduce((sum, m) => sum + m.orders, 0);
    const totalMonthlyProspects = months.reduce((sum, m) => sum + m.prospects, 0);
    
    const monthDiff = Math.max(
      1,
      dayjs(end).diff(dayjs(start), 'month', true)
    );
    
    const avgMonthlyTarget = Math.round(totalMonthlyTarget / monthDiff);
    const avgMonthlyOrders = Math.round(totalMonthlyOrders / monthDiff);
    const avgMonthlyProspects = Math.round(totalMonthlyProspects / monthDiff);
    const achievedPercentage = totalMonthlyTarget > 0
      ? Math.round((totalMonthlyAchieved / totalMonthlyTarget) * 100)
      : 0;

    // Build detailed monthly data
    const detailedMonthlyData = months.map(m => ({
      month: dayjs(`${m.year}-${m.month}-01`).format('MMM YYYY'),
      target: m.target,
      achieved: m.achieved,
      advance: m.advance,
      orders: m.orders,
      prospects: m.prospects,
      percentage: m.target > 0 ? Math.round((m.achieved / m.target) * 100) : 0
    }));

    // Sort monthly data by year and month (newest first)
    detailedMonthlyData.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB - dateA; // Descending order (newest first)
    });

    // Build response
    const performanceData = {
      executiveName: executiveName,
      executiveId: executive._id,
      executiveType: executiveType,
      dateOfJoining: executive.dateOfJoining || '2025-03-01',
      avgMonthlyTarget,
      avgMonthlyOrders,
      avgMonthlyProspects,
      totalProspects: totalMonthlyProspects,
      totalCalls,
      totalWhatsapp,
      totalOrders,
      avgCallDuration: avgCallDuration.toFixed(2),
      target: totalMonthlyTarget,
      achieved: totalMonthlyAchieved,
      advance: totalMonthlyAdvance,
      achievedPercentage,
      detailedData: {
        byMonth: detailedMonthlyData
      }
    };

    res.json(performanceData);
  } catch (err) {
    console.error('Error fetching performance data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch performance data',
      details: err.message 
    });
  }
});

// Executive dropdown list - update to include all types INCLUDING FIELD
router.get('/executives', async (_req, res) => {
  try {
    const [salesExecs, serviceExecs, accounts, fieldExecs] = await Promise.all([
      Executive.find().select('name dateOfJoining'),
      ServiceExecutive.find().select('name dateOfJoining'),
      Account.find().select('name dateOfJoining'),
      FieldExecutive.find().select('name joiningDate') // Select joiningDate for field executives
    ]);
    
    // Map all executives to a consistent format
    const allExecutives = [
      ...salesExecs.map(e => ({...e.toObject(), type: 'executive', dateOfJoining: e.dateOfJoining})),
      ...serviceExecs.map(e => ({...e.toObject(), type: 'service', dateOfJoining: e.dateOfJoining})),
      ...accounts.map(e => ({...e.toObject(), type: 'account', dateOfJoining: e.dateOfJoining})),
      ...fieldExecs.map(e => ({...e.toObject(), type: 'field', dateOfJoining: e.joiningDate})) // Map joiningDate to dateOfJoining
    ];
    
    res.json(allExecutives);
  } catch (err) {
    console.error('Error fetching executives:', err);
    res.status(500).json({ error: 'Failed to fetch executives' });
  }
});

// ========================================
// GET overall performance for all time (when no month/year filters)
// ========================================
router.get('/overall/all-time', async (req, res) => {
  try {
    // Fetch all executives from all types INCLUDING FIELD
    const [salesExecs, serviceExecs, accounts, fieldExecs] = await Promise.all([
      Executive.find().select('name dateOfJoining'),
      ServiceExecutive.find().select('name dateOfJoining'),
      Account.find().select('name dateOfJoining'),
      FieldExecutive.find().select('name joiningDate') // Select joiningDate
    ]);

    const allExecutives = [
      ...salesExecs.map(e => ({...e.toObject(), type: 'executive', dateOfJoining: e.dateOfJoining})),
      ...serviceExecs.map(e => ({...e.toObject(), type: 'service', dateOfJoining: e.dateOfJoining})),
      ...accounts.map(e => ({...e.toObject(), type: 'account', dateOfJoining: e.dateOfJoining})),
      ...fieldExecs.map(e => ({...e.toObject(), type: 'field', dateOfJoining: e.joiningDate}))
    ];

    const performanceData = [];

    // Get performance data for each executive for all time
    for (const executive of allExecutives) {
      try {
        // Fetch ALL data for this executive
        const [prospects, reports, orders, targets] = await Promise.all([
          ProspectiveClient.find({ ExcutiveName: executive.name }),
          Report.find({ executiveName: executive.name }).lean(),
          Order.find({ executive: executive.name }),
          Target.find({ executiveName: executive.name })
        ]);

        // Calculate totals
        const totalTarget = safeSum(targets, 'targetAmount');
        const totalAchieved = orders.reduce((sum, order) => {
          return sum + (order.rows || []).reduce((rowSum, row) => {
            return rowSum + (Number(row.total) || 0);
          }, 0);
        }, 0);

        const totalOrders = orders.length;
        const totalProspects = prospects.length;
        const totalCalls = safeSum(reports, 'totalCalls');
        const totalWhatsapp = safeSum(reports, 'whatsapp');

        // Calculate performance percentage
        const performancePercentage = totalTarget > 0 
          ? (totalAchieved / totalTarget) * 100 
          : totalAchieved > 0 ? 100 : 0;

        performanceData.push({
          executiveName: executive.name,
          executiveType: executive.type,
          executiveId: executive._id,
          totalTarget,
          totalAchieved,
          totalOrders,
          totalProspects,
          totalCalls,
          totalWhatsapp,
          performancePercentage: Math.round(performancePercentage * 100) / 100
        });

      } catch (execError) {
        console.error(`Error processing executive ${executive.name}:`, execError);
        continue;
      }
    }

    // Filter and sort
    const activeExecutives = performanceData
      .filter(exec => exec.totalTarget > 0 || exec.totalAchieved > 0 || exec.totalOrders > 0)
      .sort((a, b) => b.performancePercentage - a.performancePercentage);

    res.json(activeExecutives);

  } catch (err) {
    console.error('Error fetching all-time performance data:', err);
    res.status(500).json({ 
      error: 'Failed to fetch all-time performance data',
      details: err.message 
    });
  }
});

module.exports = router;