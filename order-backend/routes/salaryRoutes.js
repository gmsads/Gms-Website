// routes/salaryRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Salary = require('../models/Salary');

// GET /api/salaries - Get all salaries with error handling
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/salaries - Fetching all salaries');
    
    // First check if we can connect to the database
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected');
      return res.status(500).json({ 
        message: 'Database connection error',
        details: 'MongoDB connection state: ' + mongoose.connection.readyState 
      });
    }
    
    // Find all salaries without population first to isolate the issue
    const salaries = await Salary.find({});
    console.log(`Found ${salaries.length} salary records`);
    
    // Try to populate, but handle errors gracefully
    try {
      const populatedSalaries = await Salary.find({})
        .populate('employeeId', 'name role employeeId active department')
        .lean(); // Use lean() for better performance
        
      console.log('Successfully populated salaries');
      return res.json(populatedSalaries);
    } catch (populateError) {
      console.error('Population error:', populateError);
      // If population fails, return unpopulated data
      return res.json(salaries);
    }
    
  } catch (error) {
    console.error('=== ERROR IN GET /api/salaries ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===================================');
    
    res.status(500).json({ 
      message: 'Failed to fetch salaries',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    
    // Validate required fields
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    if (basicSalary === undefined) {
      return res.status(400).json({ message: 'Basic salary is required' });
    }
    
    if (!employeeName) {
      return res.status(400).json({ message: 'Employee name is required' });
    }
    
    // Validate basic salary is positive
    if (basicSalary < 0) {
      return res.status(400).json({ message: 'Basic salary must be a positive number' });
    }
    
    // Validate employeeId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }
    
    // Check if salary record already exists
    let salary = await Salary.findOne({ employeeId });
    
    if (salary) {
      console.log('Updating existing salary for employee:', employeeId);
      salary.basicSalary = basicSalary;
      salary.employeeName = employeeName;
    } else {
      console.log('Creating new salary for employee:', employeeId);
      salary = new Salary({
        employeeId: employeeId,
        employeeName: employeeName,
        basicSalary: basicSalary,
        paymentHistory: []
      });
    }
    
    // Validate before saving
    const validationError = salary.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationError.errors 
      });
    }
    
    await salary.save();
    console.log('Salary saved successfully');
    
    // Try to populate, but don't fail if it doesn't work
    try {
      await salary.populate('employeeId', 'name role employeeId active department');
    } catch (popError) {
      console.log('Could not populate employee data:', popError.message);
    }
    
    res.status(200).json(salary);
    
  } catch (error) {
    console.error('=== ERROR IN POST /api/salaries ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('=====================================');
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Salary record already exists for this employee' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
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
    console.log('=======================');
    
    // Validate inputs
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
    
    // Validate employeeId format
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }
    
    // Find salary
    const salary = await Salary.findOne({ employeeId });
    
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found for this employee' });
    }
    
    // Check for existing payment
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
    console.error('=== PAYMENT ERROR ===');
    console.error(error);
    console.error('=====================');
    
    res.status(500).json({ 
      message: 'Failed to record payment',
      error: error.message 
    });
  }
});

// Get single salary by employee ID
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ message: 'Invalid employee ID format' });
    }
    
    const salary = await Salary.findOne({ employeeId })
      .populate('employeeId', 'name role employeeId active department');
      
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found' });
    }
    
    res.json(salary);
  } catch (error) {
    console.error('Error fetching salary:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;