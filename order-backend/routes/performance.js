const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');

const Executive = require('../models/Executive');
const ServiceExecutive = require('../models/ServiceExecutive'); // Add this model
const Account = require('../models/Account'); // Add this model
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
    
    // Find executive based on type
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
      default:
        return res.status(400).json({ error: 'Invalid executive type' });
    }

    if (!executive) {
      return res.status(404).json({ error: 'Executive not found' });
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
    const totalProspects = prospects.length;
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

    // Group targets by month-year and initialize order counts
    const monthlyTargets = {};
    targets.forEach(target => {
      const key = `${target.year}-${target.month}`;
      
      if (!monthlyTargets[key]) {
        monthlyTargets[key] = {
          target: 0,
          achieved: 0,
          advance: 0, // Initialize advance amount
          orders: 0,
          month: target.month,
          year: target.year
        };
      }
      
      monthlyTargets[key].target += Number(target.targetAmount) || 0;
    });

    // Calculate achieved amounts, advance amounts and order counts by month
    orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const month = orderDate.getMonth() + 1;
      const year = orderDate.getFullYear();
      const key = `${year}-${month}`;
      
      if (monthlyTargets[key]) {
        const orderTotal = (order.rows || []).reduce((sum, row) => {
          return sum + (Number(row.total) || 0);
        }, 0);
        
        monthlyTargets[key].achieved += orderTotal;
        monthlyTargets[key].advance += Number(order.advance) || 0; // Add advance amount
        monthlyTargets[key].orders += 1;
      }
    });

    // Calculate monthly metrics
    const months = Object.values(monthlyTargets);
    const totalMonthlyTarget = months.reduce((sum, m) => sum + m.target, 0);
    const totalMonthlyAchieved = months.reduce((sum, m) => sum + m.achieved, 0);
    const totalMonthlyAdvance = months.reduce((sum, m) => sum + m.advance, 0);
    const totalMonthlyOrders = months.reduce((sum, m) => sum + m.orders, 0);
    
    const monthDiff = Math.max(
      1,
      dayjs(end).diff(dayjs(start), 'month', true)
    );
    
    const avgMonthlyTarget = Math.round(totalMonthlyTarget / monthDiff);
    const avgMonthlyOrders = Math.round(totalMonthlyOrders / monthDiff);
    const achievedPercentage = totalMonthlyTarget > 0
      ? Math.round((totalMonthlyAchieved / totalMonthlyTarget) * 100)
      : 0;

    // Build detailed monthly data
    const detailedMonthlyData = months.map(m => ({
      month: dayjs(`${m.year}-${m.month}-01`).format('MMM YYYY'),
      target: m.target,
      achieved: m.achieved,
      advance: m.advance, // Include advance in monthly data
      orders: m.orders,
      percentage: m.target > 0 ? Math.round((m.achieved / m.target) * 100) : 0
    }));

    // Build response
    const performanceData = {
      executiveName: executiveName,
      executiveId: executive._id, // Return the actual ID
      executiveType: executiveType, // Return the type
      dateOfJoining: executive.dateOfJoining || '2025-03-01',
      avgMonthlyTarget,
      avgMonthlyOrders,
      totalProspects,
      totalCalls,
      totalWhatsapp,
      totalOrders,
      avgCallDuration: avgCallDuration.toFixed(2),
      target: totalMonthlyTarget,
      achieved: totalMonthlyAchieved,
      advance: totalMonthlyAdvance, // Include total advance in response
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

// Executive dropdown list - update to include all types
router.get('/executives', async (_req, res) => {
  try {
    const [salesExecs, serviceExecs, accounts] = await Promise.all([
      Executive.find().select('name dateOfJoining'),
      ServiceExecutive.find().select('name dateOfJoining'),
      Account.find().select('name dateOfJoining')
    ]);
    
    res.json([
      ...salesExecs.map(e => ({...e.toObject(), type: 'executive'})),
      ...serviceExecs.map(e => ({...e.toObject(), type: 'service'})),
      ...accounts.map(e => ({...e.toObject(), type: 'account'}))
    ]);
  } catch (err) {
    console.error('Error fetching executives:', err);
    res.status(500).json({ error: 'Failed to fetch executives' });
  }
});

module.exports = router;