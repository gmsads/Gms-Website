// routes/fieldExecutive.js
const express = require('express');
const router = express.Router();
const { Visit, Report } = require('../models/marketers');

// ================== GET DATA FOR EXECUTIVE ==================
router.get('/data', async (req, res) => {
  try {
    const { executive } = req.query;

    // Get visits of the executive
    const visits = await Visit.find({ executive }).sort({ date: -1 });

    // Get total leads from reports
    const reports = await Report.find({ executive });
    const totalLeads = reports.reduce((sum, r) => sum + (r.leads || 0), 0);

    res.json({
      activities: visits,
      leads: totalLeads
    });
  } catch (err) {
    console.error('Error fetching field executive data:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// ================== ADD NEW VISIT ==================
router.post('/visit', async (req, res) => {
  try {
    const { executive, client, location, date, purpose, notes, status } = req.body;

    const newVisit = new Visit({
      executive,
      client,
      location,
      date,
      purpose,
      notes,
      status: status || 'scheduled'
    });

    await newVisit.save();
    res.status(201).json({ message: 'Visit scheduled successfully', visit: newVisit });
  } catch (err) {
    console.error('Error scheduling visit:', err);
    res.status(500).json({ error: 'Failed to schedule visit' });
  }
});

// ================== SUBMIT REPORT ==================
router.post('/report', async (req, res) => {
  try {
    const { visitId, executive, outcome, details, leads } = req.body;

    // Create report
    const newReport = new Report({
      visitId,
      executive,
      outcome,
      details,
      leads
    });

    await newReport.save();

    // Update visit status to completed
    await Visit.findByIdAndUpdate(visitId, { status: 'completed' });

    res.status(201).json({ message: 'Report submitted successfully', report: newReport });
  } catch (err) {
    console.error('Error submitting report:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.get('/data', async (req, res) => {
  try {
    const { executive, year, month, day } = req.query;

    let dateFilter = {};
    if (year) {
      const start = new Date(year, month ? month - 1 : 0, day || 1);
      const end = day
        ? new Date(year, month ? month - 1 : 0, parseInt(day) + 1)
        : month
        ? new Date(year, month, 1)
        : new Date(parseInt(year) + 1, 0, 1);

      dateFilter.date = { $gte: start, $lt: end };
    }

    const visits = await Visit.find({
      executive,
      ...dateFilter
    }).sort({ date: -1 });

    const reports = await Report.find({
      executive,
      ...(dateFilter.date ? { reportDate: dateFilter.date } : {})
    });

    const totalLeads = reports.reduce((sum, r) => sum + (r.leads || 0), 0);

    res.json({
      activities: visits,
      leads: totalLeads
    });
  } catch (err) {
    console.error('Error fetching field executive data:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});


module.exports = router;
