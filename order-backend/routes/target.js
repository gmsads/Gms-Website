const express = require('express');
const router = express.Router();
const Target = require('../models/Target');

// GET all targets
router.get('/', async (req, res) => {
  try {
    const targets = await Target.find();
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch targets' });
  }
});

// GET target for specific executive/month/year
router.get('/:executiveName/:year/:month', async (req, res) => {
  const { executiveName, year, month } = req.params;
  try {
    const target = await Target.findOne({ executiveName, year, month });
    res.json(target);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch target' });
  }
});

// POST or UPDATE target for an executive
router.post('/', async (req, res) => {
  const { executiveName, year, month, targetAmount } = req.body;
  try {
    const existing = await Target.findOne({ executiveName, year, month });
    if (existing) {
      existing.targetAmount = targetAmount;
      await existing.save();
      return res.json({ message: 'Target updated successfully', target: existing });
    }

    const newTarget = new Target({ executiveName, year, month, targetAmount });
    await newTarget.save();
    res.json({ message: 'Target assigned successfully', target: newTarget });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign/update target' });
  }
});

module.exports = router;
