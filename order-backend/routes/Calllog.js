const express = require('express');
const router = express.Router();
const CallLog = require('../models/Calllog');

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
    const { lead_id, executive_name, executive_phone, client_phone, call_status, call_duration, notes, recording_url, called_at } = req.body;

    // Validation
    if (!lead_id) {
      return res.status(400).json({
        success: false,
        error: "lead_id is required to create a call log"
      });
    }

    const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

    const callLog = new CallLog({
      Date: todayStr,
      lead_id,
      executive_name: executive_name || "Unknown Executive",
      executive_phone: executive_phone || "N/A",
      client_phone: client_phone || "N/A",
      call_status: call_status || "completed",
      call_duration: Number(call_duration) || 0,
      notes: notes || "",
      recording_url: recording_url || "",
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
