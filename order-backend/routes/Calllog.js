const express = require('express');
const router = express.Router();
const CallLog = require('../models/CallLog');

// ===========================
// GET ALL CALL LOGS
// ===========================
router.get('/', async (req, res) => {
  try {
    const callLogs = await CallLog.find()
      .populate('lead_id', 'name phone company')
      .sort({ called_at: -1 });

    res.json({ success: true, data: callLogs });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================
// CREATE A NEW CALL LOG
// ===========================
router.post('/', async (req, res) => {
  try {
    const { lead_id, notes, status, called_at } = req.body;

    // Validation
    if (!lead_id) {
      return res.status(400).json({
        success: false,
        error: "lead_id is required to create a call log"
      });
    }

    const callLog = new CallLog({
      lead_id,
      notes: notes || "",
      status: status || "pending",
      called_at: called_at || new Date()
    });

    const savedCallLog = await callLog.save();

    // populate lead details
    await savedCallLog.populate('lead_id', 'name phone company');

    res.status(201).json({
      success: true,
      data: savedCallLog
    });

  } catch (error) {
    console.error('Error creating call log:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
