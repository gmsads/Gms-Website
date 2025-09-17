const express = require('express');
const router = express.Router();
const ExecutiveLog = require('../models/executiveLogModel');

// Test route - should match what you're calling in frontend
router.get('/test', (req, res) => {
  res.json({ message: 'ExecutiveLog route works!', status: 200 });
});

// Log executive login
router.post('/', async (req, res) => {
  try {
    const { executiveName, location } = req.body;
    
    if (!executiveName || !location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const log = new ExecutiveLog({ 
      executiveName,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      }
    });
    
    await log.save();
    res.status(201).json({ 
      message: 'Login recorded successfully',
      log
    });
  } catch (error) {
    console.error('Error saving executive log:', error);
    res.status(500).json({ 
      message: 'Failed to save login record',
      error: error.message 
    });
  }
});

// Get all logs
router.get('/all', async (req, res) => {
  try {
    const logs = await ExecutiveLog.find()
      .sort({ loginTime: -1 })
      .select('executiveName loginTime location -_id'); // Only return needed fields
    
    res.status(200).json(logs);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ 
      message: 'Failed to fetch logs',
      error: err.message 
    });
  }
});
// Ensure this route exists in your backend
router.get('/api/executiveLogins/all', async (req, res) => {
  try {
    const logs = await ExecutiveLogin.find(); // Or your database query
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;