const express = require('express');
const router = express.Router();
const Report = require('../models/ExecutiveRecord');

// Create a new report
router.post('/', async (req, res) => {
  try {
    const { executiveName, date, totalCalls, followUps, whatsapp } = req.body;
    
    const report = new Report({
      executiveName,
      date: new Date(date),
      totalCalls: Number(totalCalls),
      followUps: followUps.toString(), // Ensure string storage
      whatsapp: whatsapp.toString()    // Ensure string storage
    });

    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find().sort({ date: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get all followups for the logged-in executive
router.get('/followups', async (req, res) => {
  try {
    // Get executive name from the request (you'll need to pass it from frontend)
    const { executive } = req.query;
    
    if (!executive) {
      return res.status(400).json({ message: 'Executive name is required' });
    }

    const followups = await Report.find({ executiveName: executive })
      .select('date executiveName followUps')
      .sort({ date: -1 });
      
    res.json(followups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get reports by date range
router.get('/by-date', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const reports = await Report.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: -1 });
    
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get records for specific executive
router.get('/executive-records', async (req, res) => {
  try {
    const { executive, date } = req.query;
    const query = { executiveName: executive }; // Match the field name in your model
    
    if (date) {
      query.date = new Date(date);
    }
    
    const records = await Report.find(query);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Get executive follow-ups with date filtering
router.get('/executive-followups', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$executiveName",
          count: { $sum: 1 },
          latestDate: { $max: "$date" } // Add latest follow-up date
        }
      },
      { $sort: { count: -1 } }
    ];

    const executiveFollowups = await Report.aggregate(pipeline);
    res.json(executiveFollowups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get all followups exactly as stored
router.get('/followups', async (req, res) => {
  try {
    const followups = await Report.find({})
      .select('date executiveName followUps')
      .sort({ date: -1 }); // Newest first
    res.json(followups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/chart-data', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year) {
      return res.status(400).json({ message: 'Year is required' });
    }

    let matchQuery = {
      date: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      }
    };

    if (month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      matchQuery.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    let groupBy, labels;

    if (month) {
      // Daily data for selected month
      groupBy = { $dayOfMonth: "$date" };
      labels = Array.from({ length: 31 }, (_, i) => i + 1);
    } else {
      // Monthly data for selected year
      groupBy = { $month: "$date" };
      labels = Array.from({ length: 12 }, (_, i) => i + 1);
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 }
        }
      }
    ];

    const results = await Report.aggregate(pipeline);

    // Initialize data array with zeros
    const data = labels.map(() => 0);

    // Fill in the counts from the aggregation results
    results.forEach(item => {
      const index = item._id - 1;
      if (index >= 0 && index < data.length) {
        data[index] = item.count;
      }
    });

    res.json({
      dailyReports: month ? data : null,
      monthlyReports: !month ? data : null
    });

  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get reports summary for dashboard
router.get('/dashboard-summary', async (req, res) => {
  try {
    const { year, month } = req.query;
    const startDate = month 
      ? new Date(year, month - 1, 1) 
      : new Date(year, 0, 1);
    const endDate = month 
      ? new Date(year, month, 0) 
      : new Date(year, 11, 31);

    const totalReports = await Report.countDocuments({
      date: { $gte: startDate, $lte: endDate }
    });

    const executives = await Report.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$executiveName", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      totalReports,
      topExecutives: executives.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Enhanced chart data endpoint for daily/weekly/monthly reports



module.exports = router;