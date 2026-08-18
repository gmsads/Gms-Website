// routes/expenses.js
const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { date, type, amount, category, description } = req.body;

    // Validate required fields
    if (!date || !type || !amount) {
      return res.status(400).json({ error: 'Date, type, and amount are required' });
    }

    // Validate amount is a positive number
    if (typeof amount !== 'number' && isNaN(Number(amount))) {
        return res.status(400).json({ error: 'Amount must be a valid number' });
      }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Validate type is either 'in' or 'out'
    if (!['in', 'out'].includes(type)) {
      return res.status(400).json({ error: "Type must be either 'in' or 'out'" });
    }

    const expense = new Expense({
      date: new Date(date),
      type,
      amount: Number(amount),
      category: category || undefined, // Store as undefined if empty to avoid empty strings
      description: description || undefined
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    console.error('Error saving expense:', err);
    res.status(500).json({ 
      error: 'Server error while saving expense',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required (YYYY-MM)' });
    }

    const [year, mon] = month.split('-').map(Number);
    
    if (isNaN(year) || isNaN(mon) || mon < 1 || mon > 12) {
      return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
    }

    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const expenses = await Expense.find({
      date: { $gte: start, $lt: end }
    }).sort({ date: 1 });

    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ 
      error: 'Server error while fetching expenses',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;