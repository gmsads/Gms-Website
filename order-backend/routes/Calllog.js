const express = require('express');
const router = express.Router();
const CallLog = require('../models/Calllog');

// GET /api/call-logs - Get all call logs
router.get('/', async (req, res) => {
  try {
    const callLogs = await CallLog.find()
      .populate('lead_id', 'name phone company')
      .sort({ called_at: -1 })
      .exec();
    
    res.json({ data: callLogs });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/call-logs - Create a new call log
router.post('/', async (req, res) => {
  try {
    const callLog = new CallLog(req.body);
    const savedCallLog = await callLog.save();
    
    // Populate the lead data in response
    await savedCallLog.populate('lead_id', 'name phone company');
    
    res.status(201).json({ data: savedCallLog });
  } catch (error) {
    console.error('Error creating call log:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;