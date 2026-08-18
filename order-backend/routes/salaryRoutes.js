const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Salary = require('../models/Salary');

// GET /api/salaries - Get all salaries
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/salaries - Fetching all salaries');
    
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected');
      return res.status(500).json({ 
        message: 'Database connection error',
        details: 'MongoDB connection state: ' + mongoose.connection.readyState 
      });
    }
    
    const salaries = await Salary.find({});
    console.log(`Found ${salaries.length} salary records`);
    return res.json(salaries);
    
  } catch (error) {
    console.error('Error in GET /api/salaries:', error);
    res.status(500).json({ 
      message: 'Failed to fetch salaries',
      error: error.message 
    });
  }
});

// GET /api/salaries/months/available - Get available months
router.get('/months/available', async (req, res) => {
  try {
    console.log('GET /api/salaries/months/available');
    
    const salaries = await Salary.find({});
    const allMonths = new Set();
    
    salaries.forEach(salary => {
      if (salary.paymentHistory && Array.isArray(salary.paymentHistory)) {
        salary.paymentHistory.forEach(payment => {
          if (payment && payment.month) {
            allMonths.add(payment.month);
          }
        });
      }
    });
    
    const availableMonths = Array.from(allMonths).sort().reverse();
    console.log('Available months:', availableMonths);
    res.json(availableMonths);
  } catch (error) {
    console.error('Error fetching available months:', error);
    res.status(500).json({ 
      message: 'Failed to fetch available months',
      error: error.message 
    });
  }
});

// POST /api/salaries - Create or update salary
router.post('/', async (req, res) => {
  try {
    console.log('POST /api/salaries - Request body:', req.body);
    
    const { employeeId, basicSalary, employeeName } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    if (basicSalary === undefined) {
      return res.status(400).json({ message: 'Basic salary is required' });
    }
    
    if (!employeeName) {
      return res.status(400).json({ message: 'Employee name is required' });
    }
    
    if (basicSalary < 0) {
      return res.status(400).json({ message: 'Basic salary must be a positive number' });
    }
    
    // Convert to ObjectId
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(employeeId);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }
    
    let salary = await Salary.findOne({ employeeId: objectId });
    
    if (salary) {
      console.log('Updating existing salary for employee:', employeeId);
      salary.basicSalary = basicSalary;
      salary.employeeName = employeeName;
    } else {
      console.log('Creating new salary for employee:', employeeId);
      salary = new Salary({
        employeeId: objectId,
        employeeName: employeeName,
        basicSalary: basicSalary,
        paymentHistory: []
      });
    }
    
    await salary.save();
    console.log('Salary saved successfully');
    res.status(200).json(salary);
    
  } catch (error) {
    console.error('Error in POST /api/salaries:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Salary record already exists for this employee' });
    }
    
    res.status(500).json({ 
      message: 'Failed to save salary',
      error: error.message 
    });
  }
});

// POST /api/salaries/:employeeId/payments - Add payment
router.post('/:employeeId/payments', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, amount, notes } = req.body;
    
    console.log('=== PAYMENT REQUEST ===');
    console.log('Employee ID:', employeeId);
    console.log('Month:', month);
    console.log('Amount:', amount);
    
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }
    
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'Amount is required' });
    }
    
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({ message: 'Month must be in YYYY-MM format' });
    }
    
    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount < 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    
    let salary = null;
    
    // Try to find by ObjectId
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      salary = await Salary.findOne({ employeeId: new mongoose.Types.ObjectId(employeeId) });
    }
    
    // Try by employeeName
    if (!salary) {
      salary = await Salary.findOne({ employeeName: employeeId });
    }
    
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found for this employee' });
    }
    
    const existingPaymentIndex = salary.paymentHistory.findIndex(
      p => p.month === month
    );
    
    const paymentData = {
      month: month,
      amount: paymentAmount,
      paymentDate: new Date(),
      status: 'paid',
      notes: notes || ''
    };
    
    if (existingPaymentIndex !== -1) {
      salary.paymentHistory[existingPaymentIndex] = paymentData;
      console.log('Updated existing payment');
    } else {
      salary.paymentHistory.push(paymentData);
      console.log('Added new payment');
    }
    
    await salary.save();
    console.log('Payment saved successfully');
    res.status(200).json(salary);
    
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ 
      message: 'Failed to record payment',
      error: error.message 
    });
  }
});

// GET /api/salaries/:employeeId - Get single salary by employee ID
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log('GET /api/salaries/:employeeId - Looking for:', employeeId);
    
    let salary = null;
    
    // Try to find by ObjectId (this is the correct way since employeeId is ObjectId in schema)
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      salary = await Salary.findOne({ employeeId: new mongoose.Types.ObjectId(employeeId) });
      if (salary) console.log('Found by ObjectId');
    }
    
    // If not found, try by employeeName
    if (!salary) {
      salary = await Salary.findOne({ employeeName: employeeId });
      if (salary) console.log('Found by employeeName');
    }
    
    if (!salary) {
      console.log('Salary not found for:', employeeId);
      return res.status(404).json({ message: 'Salary not found' });
    }
    
    console.log('Salary found:', {
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      basicSalary: salary.basicSalary,
      paymentHistoryCount: salary.paymentHistory?.length || 0
    });
    
    res.json(salary);
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ 
      message: error.message,
      stack: error.stack 
    });
  }
});

module.exports = router;