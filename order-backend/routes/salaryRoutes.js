// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Salary = require('../models/Salary');

// GET /api/salaries - Get all salaries with optional filtering
router.get('/', async (req, res) => {
  try {
    // Extract query parameters from request
    const { year, employeeId, month } = req.query;
    
    // Initialize empty query object
    let query = {};
    
    // Add employeeId to query if provided
    if (employeeId) {
      query.employeeId = employeeId;
    }
    
    // Find salaries based on query and populate employee data
    const salaries = await Salary.find(query).populate('employeeId', 'name role employeeId active department');
    
    // Filter payment history by year if specified
    if (year) {
      // Map through salaries and filter payment history for the specified year
      const filteredSalaries = salaries.map(salary => {
        const filteredPaymentHistory = salary.paymentHistory.filter(
          payment => payment.month.startsWith(year)
        );
        return {
          ...salary.toObject(), // Convert mongoose document to plain object
          paymentHistory: filteredPaymentHistory
        };
      });
      return res.json(filteredSalaries);
    }
    
    // Filter payment history by specific month if specified
    if (month) {
      // Map through salaries and filter payment history for the specified month
      const filteredSalaries = salaries.map(salary => {
        const filteredPaymentHistory = salary.paymentHistory.filter(
          payment => payment.month === month
        );
        return {
          ...salary.toObject(), // Convert mongoose document to plain object
          paymentHistory: filteredPaymentHistory
        };
      });
      return res.json(filteredSalaries);
    }
    
    // Return all salaries if no filters applied
    res.json(salaries);
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching salaries:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/salaries/months/available - Get available months with payments
router.get('/months/available', async (req, res) => {
  try {
    // Find all salary documents
    const salaries = await Salary.find({});
    
    // Create a Set to store unique months
    const allMonths = new Set();
    
    // Loop through each salary and its payment history
    salaries.forEach(salary => {
      salary.paymentHistory.forEach(payment => {
        if (payment.month) {
          allMonths.add(payment.month); // Add month to Set
        }
      });
    });
    
    // Convert Set to array and sort in descending order
    const availableMonths = Array.from(allMonths).sort().reverse();
    
    // Return available months array
    res.json(availableMonths);
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching available months:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/salaries/stats/overview - Get salary statistics for dashboard
router.get('/stats/overview', async (req, res) => {
  try {
    // Extract year from query parameters
    const { year } = req.query;
    
    // Find all salaries and populate employee data
    const salaries = await Salary.find({}).populate('employeeId', 'name role department');
    
    // Initialize statistics variables
    let totalPaid = 0;
    let totalEmployees = 0;
    let monthlyStats = {};
    
    // Loop through each salary to calculate statistics
    salaries.forEach(salary => {
      // Count active employees
      if (salary.employeeId && salary.employeeId.active !== false) {
        totalEmployees++;
      }
      
      // Process each payment in payment history
      salary.paymentHistory.forEach(payment => {
        // Skip payment if year filter doesn't match
        if (year && !payment.month.startsWith(year)) {
          return;
        }
        
        // Add to total paid amount
        totalPaid += payment.amount;
        
        // Extract year-month from payment month
        const yearMonth = payment.month.substring(0, 7);
        
        // Initialize monthly stats if not exists
        if (!monthlyStats[yearMonth]) {
          monthlyStats[yearMonth] = {
            month: yearMonth,
            total: 0,
            employeeCount: 0
          };
        }
        
        // Update monthly statistics
        monthlyStats[yearMonth].total += payment.amount;
        monthlyStats[yearMonth].employeeCount++;
      });
    });
    
    // Convert monthly stats object to array and sort by month descending
    const monthlyStatsArray = Object.values(monthlyStats)
      .sort((a, b) => b.month.localeCompare(a.month));
    
    // Return statistics object
    res.json({
      totalPaid: totalPaid,
      totalEmployees: totalEmployees,
      averageSalary: totalEmployees > 0 ? totalPaid / totalEmployees : 0,
      monthlyStats: monthlyStatsArray,
      totalPayments: salaries.reduce((acc, salary) => acc + salary.paymentHistory.length, 0)
    });
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching salary stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/salaries - Create or update salary
router.post('/', async (req, res) => {
  try {
    // Extract data from request body
    const { employeeId, basicSalary, employeeName, allowances, deductions } = req.body;
    
    // Validate required fields
    if (!employeeId || basicSalary === undefined || !employeeName) {
      return res.status(400).json({ message: 'Employee ID, name and basic salary are required' });
    }
    
    // Validate basic salary is positive
    if (basicSalary < 0) {
      return res.status(400).json({ message: 'Basic salary must be a positive number' });
    }
    
    // Check if salary record already exists for this employee
    let salary = await Salary.findOne({ employeeId });
    
    if (salary) {
      // Update existing salary record
      salary.basicSalary = basicSalary;
      salary.employeeName = employeeName; // Update employee name
      if (allowances !== undefined) salary.allowances = allowances;
      if (deductions !== undefined) salary.deductions = deductions;
    } else {
      // Create new salary record
      salary = new Salary({
        employeeId: employeeId,
        employeeName: employeeName,
        basicSalary: basicSalary,
        allowances: allowances || {},
        deductions: deductions || {}
      });
    }
    
    // Save the salary record to database
    await salary.save();
    
    // Populate employee data before sending response
    await salary.populate('employeeId', 'name role employeeId active department');
    
    // Send success response
    res.status(200).json(salary);
  } catch (error) {
    // Log error for debugging
    console.error('Error saving salary:', error);
    
    // Handle duplicate key error (unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Salary record already exists for this employee' });
    }
    
    // Send error response
    res.status(400).json({ message: error.message });
  }
});

// **DEBUGGED** POST /api/salaries/:employeeId/payments - Add payment for an employee
router.post('/:employeeId/payments', async (req, res) => {
  try {
    // Extract employeeId from URL parameters
    const { employeeId } = req.params;
    
    // Extract payment data from request body
    const { month, amount, bonus, deductions, notes } = req.body;
    
    // Log the incoming request for debugging
    console.log('=== PAYMENT REQUEST DEBUG ===');
    console.log('Employee ID:', employeeId);
    console.log('Month:', month);
    console.log('Amount:', amount);
    console.log('Bonus:', bonus);
    console.log('Deductions:', deductions);
    console.log('Notes:', notes);
    console.log('=============================');
    
    // Validate required fields
    if (!month || amount === undefined) {
      return res.status(400).json({ message: 'Month and amount are required' });
    }
    
    // Validate month format using regex
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({ message: 'Month must be in YYYY-MM format' });
    }
    
    // Validate amount is positive number
    if (amount < 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    
    // Validate amount is a valid number (not NaN)
    if (isNaN(amount)) {
      return res.status(400).json({ message: 'Amount must be a valid number' });
    }
    
    // Convert amount to number to ensure proper type
    const paymentAmount = Number(amount);
    
    // Find salary record for the employee
    let salary = await Salary.findOne({ employeeId: employeeId });
    
    // Return error if salary record not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this employee' });
    }
    
    // **DEBUG FIX: Auto-fix missing employeeName**
    if (!salary.employeeName) {
      console.log('Auto-fixing missing employeeName for employee:', employeeId);
      try {
        // Try to get employee name from Employee collection
        const Employee = mongoose.model('Employee');
        const employee = await Employee.findById(employeeId);
        if (employee && employee.name) {
          salary.employeeName = employee.name;
          await salary.save();
          console.log('Auto-fixed employeeName to:', employee.name);
        } else {
          console.log('Could not find employee to auto-fix name');
        }
      } catch (error) {
        console.log('Error auto-fixing employeeName:', error.message);
      }
    }
    
    // Check if payment already exists for this month
    const existingPaymentIndex = salary.paymentHistory.findIndex(
      payment => payment.month === month
    );
    
    // Prepare payment data object
    const paymentData = {
      month: month,
      amount: paymentAmount, // Use the converted number
      bonus: bonus || 0,
      deductions: deductions || 0,
      netAmount: paymentAmount + (bonus || 0) - (deductions || 0),
      paymentDate: new Date(),
      status: 'paid',
      notes: notes || ''
    };
    
    // Check if payment already exists for this month
    if (existingPaymentIndex !== -1) {
      // Update existing payment
      salary.paymentHistory[existingPaymentIndex] = paymentData;
      console.log('Updated existing payment for month:', month);
    } else {
      // Add new payment
      salary.paymentHistory.push(paymentData);
      console.log('Added new payment for month:', month);
    }
    
    // Save the updated salary record
    await salary.save();
    
    // Populate employee data before sending response
    await salary.populate('employeeId', 'name role employeeId active department');
    
    // Send success response
    res.status(200).json(salary);
    
  } catch (error) {
    // Log detailed error information
    console.error('=== PAYMENT ERROR DETAILS ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('============================');
    
    // Send error response with detailed message
    res.status(400).json({ 
      message: `Failed to record payment: ${error.message}` 
    });
  }
});

// GET /api/salaries/:employeeId - Get salary by employee ID
router.get('/:employeeId', async (req, res) => {
  try {
    // Find salary for specific employee
    const salary = await Salary.findOne({ employeeId: req.params.employeeId })
      .populate('employeeId', 'name role employeeId active department');
      
    // Return error if salary not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this employee' });
    }
    
    // Send success response
    res.json(salary);
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching salary:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/salaries/:employeeId/payments - Get payment history for an employee
router.get('/:employeeId/payments', async (req, res) => {
  try {
    // Extract query parameters
    const { year, limit } = req.query;
    
    // Find salary for specific employee
    const salary = await Salary.findOne({ employeeId: req.params.employeeId })
      .populate('employeeId', 'name role employeeId active department');
      
    // Return error if salary not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this employee' });
    }
    
    // Start with all payment history
    let paymentHistory = salary.paymentHistory;
    
    // Filter by year if specified
    if (year) {
      paymentHistory = paymentHistory.filter(payment => payment.month.startsWith(year));
    }
    
    // Sort payment history by month descending (newest first)
    paymentHistory.sort((a, b) => b.month.localeCompare(a.month));
    
    // Apply limit if specified
    if (limit) {
      paymentHistory = paymentHistory.slice(0, parseInt(limit));
    }
    
    // Calculate totals from payment history
    const totals = paymentHistory.reduce((acc, payment) => {
      acc.totalAmount += payment.amount;
      acc.totalBonus += payment.bonus || 0;
      acc.totalDeductions += payment.deductions || 0;
      acc.totalNet += payment.netAmount || payment.amount;
      return acc;
    }, { totalAmount: 0, totalBonus: 0, totalDeductions: 0, totalNet: 0 });
    
    // Send response with payment history and totals
    res.json({
      employee: salary.employeeId,
      basicSalary: salary.basicSalary,
      allowances: salary.allowances,
      deductions: salary.deductions,
      paymentHistory: paymentHistory,
      totals: totals
    });
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/salaries/:employeeId/payments/:month - Get specific payment for an employee
router.get('/:employeeId/payments/:month', async (req, res) => {
  try {
    // Extract parameters from URL
    const { employeeId, month } = req.params;
    
    // Find salary for specific employee
    const salary = await Salary.findOne({ employeeId: employeeId })
      .populate('employeeId', 'name role employeeId active department');
      
    // Return error if salary not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this employee' });
    }
    
    // Find specific payment for the month
    const payment = salary.paymentHistory.find(p => p.month === month);
    
    // Return error if payment not found
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found for the specified month' });
    }
    
    // Send response with payment details
    res.json({
      employee: salary.employeeId,
      basicSalary: salary.basicSalary,
      payment: payment
    });
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching payment:', error);
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/salaries/:employeeId/payments/:month - Update a specific payment
router.put('/:employeeId/payments/:month', async (req, res) => {
  try {
    // Extract parameters from URL
    const { employeeId, month } = req.params;
    
    // Extract update data from request body
    const { amount, bonus, deductions, notes, status } = req.body;
    
    // Find salary for specific employee
    const salary = await Salary.findOne({ employeeId: employeeId });
    
    // Return error if salary not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this employee' });
    }
    
    // Find index of the payment to update
    const paymentIndex = salary.paymentHistory.findIndex(p => p.month === month);
    
    // Return error if payment not found
    if (paymentIndex === -1) {
      return res.status(404).json({ message: 'Payment not found for the specified month' });
    }
    
    // Update payment fields if provided in request
    if (amount !== undefined) {
      salary.paymentHistory[paymentIndex].amount = Number(amount); // Ensure number type
    }
    if (bonus !== undefined) {
      salary.paymentHistory[paymentIndex].bonus = Number(bonus); // Ensure number type
    }
    if (deductions !== undefined) {
      salary.paymentHistory[paymentIndex].deductions = Number(deductions); // Ensure number type
    }
    if (notes !== undefined) {
      salary.paymentHistory[paymentIndex].notes = notes;
    }
    if (status !== undefined) {
      salary.paymentHistory[paymentIndex].status = status;
    }
    
    // Recalculate net amount based on updated values
    salary.paymentHistory[paymentIndex].netAmount = 
      salary.paymentHistory[paymentIndex].amount + 
      (salary.paymentHistory[paymentIndex].bonus || 0) - 
      (salary.paymentHistory[paymentIndex].deductions || 0);
    
    // Update the updatedAt timestamp
    salary.paymentHistory[paymentIndex].updatedAt = new Date();
    
    // Save the updated salary record
    await salary.save();
    
    // Populate employee data before sending response
    await salary.populate('employeeId', 'name role employeeId active department');
    
    // Send success response
    res.json(salary);
  } catch (error) {
    // Log error and send 400 response
    console.error('Error updating payment:', error);
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/salaries/:employeeId/payments/:month - Delete a specific payment
router.delete('/:employeeId/payments/:month', async (req, res) => {
  try {
    // Extract parameters from URL
    const { employeeId, month } = req.params;
    
    // Find salary for specific employee
    const salary = await Salary.findOne({ employeeId: employeeId });
    
    // Return error if salary not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this employee' });
    }
    
    // Find index of the payment to delete
    const paymentIndex = salary.paymentHistory.findIndex(p => p.month === month);
    
    // Return error if payment not found
    if (paymentIndex === -1) {
      return res.status(404).json({ message: 'Payment not found for the specified month' });
    }
    
    // Remove the payment from the paymentHistory array
    salary.paymentHistory.splice(paymentIndex, 1);
    
    // Save the updated salary record
    await salary.save();
    
    // Send success response
    res.json({ message: 'Payment deleted successfully', salary: salary });
  } catch (error) {
    // Log error and send 400 response
    console.error('Error deleting payment:', error);
    res.status(400).json({ message: error.message });
  }
});

// GET /api/salaries/summary/:month - Get salary summary for a specific month
router.get('/summary/:month', async (req, res) => {
  try {
    // Extract month from URL parameters
    const { month } = req.params;
    
    // Find all salaries with employee data
    const salaries = await Salary.find({}).populate('employeeId', 'name role department employeeId');
    
    // Initialize summary object
    const monthSummary = {
      month: month,
      totalPayments: 0,
      totalAmount: 0,
      totalBonus: 0,
      totalDeductions: 0,
      employees: []
    };
    
    // Loop through each salary to build summary
    salaries.forEach(salary => {
      // Find payment for the specified month
      const payment = salary.paymentHistory.find(p => p.month === month);
      
      // If payment exists and employee data is available
      if (payment && salary.employeeId) {
        // Update summary totals
        monthSummary.totalPayments++;
        monthSummary.totalAmount += payment.amount;
        monthSummary.totalBonus += payment.bonus || 0;
        monthSummary.totalDeductions += payment.deductions || 0;
        
        // Add employee details to summary
        monthSummary.employees.push({
          employeeId: salary.employeeId._id,
          employeeCode: salary.employeeId.employeeId,
          name: salary.employeeId.name,
          role: salary.employeeId.role,
          department: salary.employeeId.department,
          amount: payment.amount,
          bonus: payment.bonus || 0,
          deductions: payment.deductions || 0,
          netAmount: payment.netAmount || payment.amount,
          status: payment.status,
          paymentDate: payment.paymentDate
        });
      }
    });
    
    // Calculate net total
    monthSummary.netTotal = monthSummary.totalAmount + monthSummary.totalBonus - monthSummary.totalDeductions;
    
    // Send summary response
    res.json(monthSummary);
  } catch (error) {
    // Log error and send 500 response
    console.error('Error fetching month summary:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/salaries/cleanup/invalid - Clean up invalid salary records (admin only)
router.delete('/cleanup/invalid', async (req, res) => {
  try {
    // Find all salaries with employee data populated
    const allSalaries = await Salary.find({}).populate('employeeId');
    
    // Identify salaries with invalid employee references
    const invalidSalaries = allSalaries.filter(salary => 
      !salary.employeeId || 
      (typeof salary.employeeId === 'object' && !salary.employeeId._id)
    );
    
    // Create array of delete promises
    const deletePromises = invalidSalaries.map(salary => 
      Salary.findByIdAndDelete(salary._id)
    );
    
    // Wait for all delete operations to complete
    await Promise.all(deletePromises);
    
    // Send success response with cleanup summary
    res.json({ 
      message: `Removed ${invalidSalaries.length} invalid salary records`,
      removed: invalidSalaries.length
    });
  } catch (error) {
    // Log error and send 500 response
    console.error('Error cleaning up salaries:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/salaries/:employeeId - Delete salary record by employee ID
router.delete('/:employeeId', async (req, res) => {
  try {
    // Extract employeeId from URL parameters
    const { employeeId } = req.params;
    
    // Find and delete salary record
    const salary = await Salary.findOneAndDelete({ employeeId: employeeId });
    
    // Return error if salary not found
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found for this employee' });
    }
    
    // Send success response
    res.json({ message: 'Salary record deleted successfully' });
  } catch (error) {
    // Log error and send 500 response
    console.error('Error deleting salary record:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export the router for use in other files
module.exports = router;