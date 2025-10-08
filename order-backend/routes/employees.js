// routes/employees.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// Get all employees
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: employees,
      total: employees.length
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add new employee
router.post('/', async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, department, position, shift } = req.body;

    // Check if employee ID already exists
    const existingEmployee = await Employee.findOne({ 
      $or: [
        { employeeId },
        { email }
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID or email already exists'
      });
    }

    const employee = new Employee({
      employeeId,
      firstName,
      lastName,
      email,
      department,
      position,
      shift
    });

    await employee.save();

    res.json({
      success: true,
      message: 'Employee added successfully',
      employee: {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        shift: employee.shift,
        faceDescriptor: employee.faceDescriptor
      }
    });

  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Register face for employee
router.put('/:id/face', async (req, res) => {
  try {
    const { faceDescriptor, employeeName } = req.body;
    const employeeId = req.params.id;

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Valid face descriptor is required'
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      {
        faceDescriptor: faceDescriptor,
        $set: {
          firstName: employeeName?.split(' ')[0] || '',
          lastName: employeeName?.split(' ')[1] || ''
        }
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Face registered successfully',
      employee: {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`,
        hasFaceData: !!employee.faceDescriptor
      }
    });

  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering face',
      error: error.message
    });
  }
});

// Get employees with face data for recognition
router.get('/with-faces', async (req, res) => {
  try {
    const employees = await Employee.find({
      faceDescriptor: { $exists: true, $ne: null },
      isActive: true
    }).select('employeeId firstName lastName department position faceDescriptor');

    res.json({
      success: true,
      data: employees,
      total: employees.length
    });
  } catch (error) {
    console.error('Error fetching employees with faces:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;