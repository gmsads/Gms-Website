const express = require('express');
const router = express.Router();
const LogoutHistory = require('../models/LogoutHistory');
const fs = require('fs');
const path = require('path');

// Save logout history
router.post('/', async (req, res) => {
  try {
    const { username, loginTime, logoutTime, sessionDuration, reason } = req.body;
    
    const history = new LogoutHistory({
      username: username || 'Vinay',
      loginTime,
      logoutTime,
      sessionDuration,
      reason
    });

    await history.save();
    
    res.status(201).json({ message: 'Logout history saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all logout history
router.get('/', async (req, res) => {
  try {
    const history = await LogoutHistory.find().sort({ logoutTime: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logout history as file
router.get('/download', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../LogoutHistory.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'No logout history found' });
    }

    res.download(filePath, 'LogoutHistory.json', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;