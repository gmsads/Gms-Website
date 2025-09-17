const express = require('express');
const router = express.Router();
const Designer = require('../models/Designer'); // Adjust the path as needed


// GET /api/designers?active=true
router.get('/', async (req, res) => {
  try {
    const filter = req.query.active === 'true' ? { active: true } : {};
    const designers = await Designer.find(filter, 'name _id username');
    res.json(designers);
  } catch (err) {
    console.error('Error fetching designers:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Route to get designer names
router.get('/names', async (req, res) => {
  try {
    const designers = await Designer.find({}, '_id name username');
    res.status(200).json({ success: true, data: designers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;