const express = require('express');
const router = express.Router();
const LocationLog = require('../models/LocationLog');

// Helper to format time e.g. "10:45 AM"
const formatTimeAMPM = (dateObj) => {
  return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
};

// POST /api/tracking/ping - Record GPS waypoint
router.post('/ping', async (req, res) => {
  try {
    const { executiveName, lat, lng, area, speed, type, notes } = req.body;
    if (!executiveName || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'executiveName, lat, and lng are required' });
    }

    const cleanName = executiveName.trim();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const formattedTime = formatTimeAMPM(now);

    const newWaypoint = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      timestamp: now,
      formattedTime,
      area: area || 'Unknown Area',
      speed: speed ? parseFloat(speed) : 0,
      type: type || 'ping',
      notes: notes || ''
    };

    // Find or create daily log
    let log = await LocationLog.findOne({ executiveName: new RegExp(`^${cleanName}$`, 'i'), date: todayStr });

    if (!log) {
      log = new LocationLog({
        executiveName: cleanName,
        date: todayStr,
        status: 'active',
        checkInTime: now,
        trajectory: [newWaypoint]
      });
    } else {
      // Avoid duplicate pings within 10 seconds unless it's a visit
      const lastPoint = log.trajectory.length > 0 ? log.trajectory[log.trajectory.length - 1] : null;
      const isDuplicateTime = lastPoint && (now - new Date(lastPoint.timestamp)) < 10000;
      
      if (!isDuplicateTime || type === 'visit' || type === 'checkin') {
        log.trajectory.push(newWaypoint);
        if (type === 'checkout') {
          log.status = 'completed';
          log.checkOutTime = now;
        }
      }
    }

    await log.save();
    res.json({ success: true, count: log.trajectory.length, current: newWaypoint });
  } catch (error) {
    console.error('Error logging GPS ping:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tracking/:executive/:date - Fetch daily route timeline
router.get('/:executive/:date', async (req, res) => {
  try {
    const { executive, date } = req.params;
    const cleanName = executive.trim();

    const log = await LocationLog.findOne({
      executiveName: new RegExp(`^${cleanName}$`, 'i'),
      date: date
    });

    if (!log) {
      return res.json({ success: true, data: null, message: 'No location tracking history found for this date.' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Error fetching route timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tracking/live/all - Fetch latest live position of active executives today
router.get('/live/all', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const logs = await LocationLog.find({ date: todayStr });

    const livePositions = logs.map(l => {
      const latest = l.trajectory.length > 0 ? l.trajectory[l.trajectory.length - 1] : null;
      return {
        executiveName: l.executiveName,
        status: l.status,
        checkInTime: l.checkInTime,
        latestWaypoint: latest
      };
    });

    res.json({ success: true, data: livePositions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
