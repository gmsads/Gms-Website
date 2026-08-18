const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');

const Executive = require('../models/Executive');
const ServiceExecutive = require('../models/ServiceExecutive');
const Account = require('../models/Account');
const FieldExecutive = require('../models/FieldExecutive');
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

    // Fetch all executives from all types INCLUDING FIELD EXECUTIVES - USING .lean() TO FIX THE ERROR
    const [salesExecs, serviceExecs, accounts, fieldExecs] = await Promise.all([
      Executive.find().select('name dateOfJoining').lean(),
      ServiceExecutive.find().select('name dateOfJoining').lean(),
      Account.find().select('name dateOfJoining').lean(),
      FieldExecutive.find().select('name joiningDate').lean() // Use joiningDate instead of dateOfJoining
    ]);

    const allExecutives = [
      ...salesExecs.map(e => ({...e, type: 'executive', dateOfJoining: e.dateOfJoining})),
      ...serviceExecs.map(e => ({...e, type: 'service', dateOfJoining: e.dateOfJoining})),
      ...accounts.map(e => ({...e, type: 'account', dateOfJoining: e.dateOfJoining})),
      ...fieldExecs.map(e => ({...e, type: 'field', dateOfJoining: e.joiningDate})) // Map joiningDate to dateOfJoining
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
// GET performance data for an executive - WITH CLIENT TYPE BREAKDOWN
// ========================================
router.get('/', async (req, res) => {
  try {
    const { executiveId, executiveType, startDate, endDate } = req.query;

    console.log('Performance API called with:', { executiveId, executiveType, startDate, endDate });

    if (!executiveId || !executiveType) {
      return res.status(400).json({ error: 'executiveId and executiveType are required' });
    }

    let executive;
    let executiveName;
    let dateOfJoining = null;
    
    switch(executiveType) {
      case 'executive':
        executive = await Executive.findById(executiveId).lean();
        executiveName = executive?.name;
        dateOfJoining = executive?.joiningDate;
        break;
      case 'service':
        executive = await ServiceExecutive.findById(executiveId).lean();
        executiveName = executive?.name;
        dateOfJoining = executive?.dateOfJoining;
        break;
      case 'account':
        executive = await Account.findById(executiveId).lean();
        executiveName = executive?.name;
        dateOfJoining = executive?.dateOfJoining;
        break;
      case 'field':
        executive = await FieldExecutive.findById(executiveId).lean();
        if (!executive) {
          executive = await FieldExecutive.findOne({ name: executiveId }).lean();
        }
        executiveName = executive?.name || executiveId;
        dateOfJoining = executive?.joiningDate;
        break;
      default:
        return res.status(400).json({ error: 'Invalid executive type' });
    }

    if (!executive && executiveType !== 'field') {
      return res.status(404).json({ error: 'Executive not found' });
    }

    if (executiveType === 'field' && !executive) {
      executive = {
        _id: executiveId,
        name: executiveName,
      };
      dateOfJoining = null;
    }

    // Try to get joining date from Employee collection as fallback
    if (!dateOfJoining && executiveName) {
      try {
        const Employee = require('../models/Employee');
        const employee = await Employee.findOne({ name: executiveName }).lean();
        if (employee && employee.joiningDate) {
          dateOfJoining = employee.joiningDate;
        }
      } catch (err) {
        console.log('Employee collection not found:', err.message);
      }
    }

    // Determine date window
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      if (dateOfJoining) {
        start = new Date(dateOfJoining);
      } else {
        start = new Date('2000-01-01');
      }
      end = new Date();
    }
    end.setHours(23, 59, 59, 999);

    // Fetch orders for this executive
    const orders = await Order.find({
      executive: executiveName,
      orderDate: { $gte: start, $lte: end }
    });

    // Helper function to get month-year key
    const getMonthYearKey = (date) => {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${year}-${month}`;
    };

    // Helper function to get client type category
    const getClientTypeCategory = (clientType) => {
      if (!clientType) return 'retail';
      const type = clientType.toString().toLowerCase().trim();
      if (type === 'retail' || type === 'new') return 'retail';
      if (type === 'agent') return 'agent';
      if (type === 'renewal') return 'renewal';
      if (type === 'renewal-agent') return 'renewalAgent';
      return 'retail';
    };

    // Fetch targets for this executive
    const targets = await Target.find({
      executiveName: executiveName
    });

    // Group data by month
    const monthlyData = {};

    // Process orders
    orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const key = getMonthYearKey(orderDate);
      const clientType = getClientTypeCategory(order.clientType);
      
      // Calculate order total
      const orderTotal = (order.rows || []).reduce((sum, row) => {
        return sum + (Number(row.total) || 0);
      }, 0);
      
      if (!monthlyData[key]) {
        const month = orderDate.getMonth() + 1;
        const year = orderDate.getFullYear();
        monthlyData[key] = {
          month: dayjs(`${year}-${month}-01`).format('MMM YYYY'),
          target: 0,
          achieved: 0,
          advance: 0,
          orders: 0,
          prospects: 0,
          totalAmount: 0,
          newRetailCount: 0,
          newRetailAmount: 0,
          agentCount: 0,
          agentAmount: 0,
          renewalCount: 0,
          renewalAmount: 0,
          renewalAgentCount: 0,
          renewalAgentAmount: 0
        };
      }
      
      // Add to total amount
      monthlyData[key].totalAmount += orderTotal;
      monthlyData[key].orders += 1;
      
      // Get advance amount
      const advanceAmount = Number(order.advance) || 0;
      
      // Add to client type breakdown
      if (clientType === 'retail') {
        monthlyData[key].newRetailCount += 1;
        monthlyData[key].newRetailAmount += orderTotal;
        monthlyData[key].achieved += orderTotal;
        monthlyData[key].advance += advanceAmount;
      } else if (clientType === 'agent') {
        monthlyData[key].agentCount += 1;
        monthlyData[key].agentAmount += orderTotal;
        // Agent orders do NOT get advance
      } else if (clientType === 'renewal') {
        monthlyData[key].renewalCount += 1;
        monthlyData[key].renewalAmount += orderTotal;
        // Renewal orders do NOT get advance
      } else if (clientType === 'renewalAgent') {
        monthlyData[key].renewalAgentCount += 1;
        monthlyData[key].renewalAgentAmount += orderTotal;
        // Renewal Agent orders do NOT get advance
      }
    });

    // Process targets
    targets.forEach(target => {
      const key = `${target.year}-${target.month}`;
      if (monthlyData[key]) {
        monthlyData[key].target += Number(target.targetAmount) || 0;
      } else {
        monthlyData[key] = {
          month: dayjs(`${target.year}-${target.month}-01`).format('MMM YYYY'),
          target: Number(target.targetAmount) || 0,
          achieved: 0,
          advance: 0,
          orders: 0,
          prospects: 0,
          totalAmount: 0,
          newRetailCount: 0,
          newRetailAmount: 0,
          agentCount: 0,
          agentAmount: 0,
          renewalCount: 0,
          renewalAmount: 0,
          renewalAgentCount: 0,
          renewalAgentAmount: 0
        };
      }
    });

    // Fetch prospects for this executive
    const prospects = await ProspectiveClient.find({
      ExcutiveName: executiveName,
      createdAt: { $gte: start, $lte: end }
    });

    // Process prospects
    prospects.forEach(prospect => {
      const prospectDate = new Date(prospect.createdAt);
      const key = getMonthYearKey(prospectDate);
      
      if (monthlyData[key]) {
        monthlyData[key].prospects += 1;
      } else {
        const month = prospectDate.getMonth() + 1;
        const year = prospectDate.getFullYear();
        monthlyData[key] = {
          month: dayjs(`${year}-${month}-01`).format('MMM YYYY'),
          target: 0,
          achieved: 0,
          advance: 0,
          orders: 0,
          prospects: 1,
          totalAmount: 0,
          newRetailCount: 0,
          newRetailAmount: 0,
          agentCount: 0,
          agentAmount: 0,
          renewalCount: 0,
          renewalAmount: 0,
          renewalAgentCount: 0,
          renewalAgentAmount: 0
        };
      }
    });

    // Convert to array and calculate percentages
    const detailedMonthlyData = Object.values(monthlyData).map(m => ({
      month: m.month,
      target: m.target,
      achieved: m.achieved,
      advance: m.advance,
      orders: m.orders,
      prospects: m.prospects,
      totalAmount: m.totalAmount,
      newRetailCount: m.newRetailCount,
      newRetailAmount: m.newRetailAmount,
      agentCount: m.agentCount,
      agentAmount: m.agentAmount,
      renewalCount: m.renewalCount,
      renewalAmount: m.renewalAmount,
      renewalAgentCount: m.renewalAgentCount,
      renewalAgentAmount: m.renewalAgentAmount,
      percentage: m.target > 0 ? Math.round((m.achieved / m.target) * 100) : (m.achieved > 0 ? 100 : 0)
    }));

    // Sort by date (newest first)
    detailedMonthlyData.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateB - dateA;
    });

    // Calculate totals
    const totalMonthlyTarget = detailedMonthlyData.reduce((sum, m) => sum + m.target, 0);
    const totalMonthlyAchieved = detailedMonthlyData.reduce((sum, m) => sum + m.achieved, 0);
    const totalMonthlyAdvance = detailedMonthlyData.reduce((sum, m) => sum + m.advance, 0);
    const totalMonthlyOrders = detailedMonthlyData.reduce((sum, m) => sum + m.orders, 0);
    const totalMonthlyProspects = detailedMonthlyData.reduce((sum, m) => sum + m.prospects, 0);
    const totalMonthlyAmount = detailedMonthlyData.reduce((sum, m) => sum + m.totalAmount, 0);
    
    const totalNewRetailCount = detailedMonthlyData.reduce((sum, m) => sum + m.newRetailCount, 0);
    const totalNewRetailAmount = detailedMonthlyData.reduce((sum, m) => sum + m.newRetailAmount, 0);
    const totalAgentCount = detailedMonthlyData.reduce((sum, m) => sum + m.agentCount, 0);
    const totalAgentAmount = detailedMonthlyData.reduce((sum, m) => sum + m.agentAmount, 0);
    const totalRenewalCount = detailedMonthlyData.reduce((sum, m) => sum + m.renewalCount, 0);
    const totalRenewalAmount = detailedMonthlyData.reduce((sum, m) => sum + m.renewalAmount, 0);
    const totalRenewalAgentCount = detailedMonthlyData.reduce((sum, m) => sum + m.renewalAgentCount, 0);
    const totalRenewalAgentAmount = detailedMonthlyData.reduce((sum, m) => sum + m.renewalAgentAmount, 0);

    const monthDiff = Math.max(1, dayjs(end).diff(dayjs(start), 'month', true));
    const avgMonthlyTarget = Math.round(totalMonthlyTarget / monthDiff);
    
    const achievedPercentage = totalMonthlyTarget > 0
      ? Math.round((totalMonthlyAchieved / totalMonthlyTarget) * 100)
      : totalMonthlyAchieved > 0 ? 100 : 0;

    // Format joining date
    let formattedJoiningDate = null;
    if (dateOfJoining) {
      try {
        formattedJoiningDate = new Date(dateOfJoining).toISOString();
      } catch (err) {
        formattedJoiningDate = null;
      }
    }

    // Build response
    const performanceData = {
      executiveName: executiveName,
      executiveId: executive._id || executiveId,
      executiveType: executiveType,
      dateOfJoining: formattedJoiningDate,
      avgMonthlyTarget,
      totalProspects: totalMonthlyProspects,
      totalCalls: 0,
      totalWhatsapp: 0,
      totalOrders: totalMonthlyOrders,
      avgCallDuration: '0',
      target: totalMonthlyTarget,
      achieved: totalMonthlyAchieved,
      advance: totalMonthlyAdvance,
      totalAmount: totalMonthlyAmount,
      achievedPercentage,
      newRetailCount: totalNewRetailCount,
      newRetailAmount: totalNewRetailAmount,
      agentCount: totalAgentCount,
      agentAmount: totalAgentAmount,
      renewalCount: totalRenewalCount,
      renewalAmount: totalRenewalAmount,
      renewalAgentCount: totalRenewalAgentCount,
      renewalAgentAmount: totalRenewalAgentAmount,
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

// Executive dropdown list - update to include all types INCLUDING FIELD - FIXED WITH .lean()
router.get('/executives', async (_req, res) => {
  try {
    const [salesExecs, serviceExecs, accounts, fieldExecs] = await Promise.all([
      Executive.find().select('name dateOfJoining').lean(),
      ServiceExecutive.find().select('name dateOfJoining').lean(),
      Account.find().select('name dateOfJoining').lean(),
      FieldExecutive.find().select('name joiningDate').lean() // Select joiningDate for field executives
    ]);
    
    // Map all executives to a consistent format
    const allExecutives = [
      ...salesExecs.map(e => ({...e, type: 'executive', dateOfJoining: e.dateOfJoining})),
      ...serviceExecs.map(e => ({...e, type: 'service', dateOfJoining: e.dateOfJoining})),
      ...accounts.map(e => ({...e, type: 'account', dateOfJoining: e.dateOfJoining})),
      ...fieldExecs.map(e => ({...e, type: 'field', dateOfJoining: e.joiningDate})) // Map joiningDate to dateOfJoining
    ];
    
    res.json(allExecutives);
  } catch (err) {
    console.error('Error fetching executives:', err);
    res.status(500).json({ error: 'Failed to fetch executives' });
  }
});

// ========================================
// GET overall performance for all time (when no month/year filters) - FIXED WITH .lean()
// ========================================
router.get('/overall/all-time', async (req, res) => {
  try {
    // Fetch all executives from all types INCLUDING FIELD - USING .lean()
    const [salesExecs, serviceExecs, accounts, fieldExecs] = await Promise.all([
      Executive.find().select('name dateOfJoining').lean(),
      ServiceExecutive.find().select('name dateOfJoining').lean(),
      Account.find().select('name dateOfJoining').lean(),
      FieldExecutive.find().select('name joiningDate').lean() // Select joiningDate
    ]);

    const allExecutives = [
      ...salesExecs.map(e => ({...e, type: 'executive', dateOfJoining: e.dateOfJoining})),
      ...serviceExecs.map(e => ({...e, type: 'service', dateOfJoining: e.dateOfJoining})),
      ...accounts.map(e => ({...e, type: 'account', dateOfJoining: e.dateOfJoining})),
      ...fieldExecs.map(e => ({...e, type: 'field', dateOfJoining: e.joiningDate}))
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