// server/routes/hrReports.js
const express = require('express');
const router = express.Router();
const HRReport = require('../models/HRReport');

// Get all reports for a specific HR
router.get('/api/hr-reports', async (req, res) => {
  try {
    const { hrId } = req.query;
    
    // If hrId is provided, filter by it, otherwise return all reports
    if (hrId) {
      const reports = await HRReport.find({ hrId })
        .sort({ date: -1, submittedAt: -1 });
      return res.json(reports);
    } else {
      // This handles the case when no hrId is provided
      const reports = await HRReport.find({})
        .sort({ date: -1, submittedAt: -1 });
      return res.json(reports);
    }
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// NEW ROUTE: Get ALL reports (no filter) - for admin view
router.get('/api/hr-reports/all', async (req, res) => {
  try {
    const reports = await HRReport.find({})
      .sort({ date: -1, submittedAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Error fetching all reports:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit a new report
router.post('/api/hr-reports', async (req, res) => {
  try {
    const report = new HRReport(req.body);
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    console.error('Error saving report:', err);
    res.status(400).json({ error: err.message });
  }
});

// Get a single report by ID
router.get('/api/hr-reports/:id', async (req, res) => {
  try {
    const report = await HRReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a report
router.put('/api/hr-reports/:id', async (req, res) => {
  try {
    const report = await HRReport.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(400).json({ error: err.message });
  }
});

// Delete a report
router.delete('/api/hr-reports/:id', async (req, res) => {
  try {
    const report = await HRReport.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;