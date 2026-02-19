const express = require('express');
const router = express.Router();
const { uploadEmployee } = require('../config/cloudinary');

// Import all models
const Executive = require('../models/Executive');
const Admin = require('../models/Admin');
const Designer = require('../models/Designer');
const Account = require('../models/Account');
const ServiceExecutive = require('../models/ServiceExecutive');
const ServiceManager = require('../models/ServiceManager');
const SalesManager = require('../models/SalesManager');
const ItTeam = require('../models/ITTeam');
const DigitalMarketing = require('../models/DigitalMarketing');
const ClientService = require('../models/ClientService');
const HR = require('../models/HR');
const Vendor = require('../models/Vendor');
const Agent = require('../models/Agent');
const FieldExecutive = require('../models/FieldExecutive');
const Unit = require('../models/Unit');

// Map of role to model
const modelMap = {
  'Executive': Executive,
  'Admin': Admin,
  'Designer': Designer,
  'Account': Account,
  'ServiceExecutive': ServiceExecutive,
  'ServiceManager': ServiceManager,
  'SalesManager': SalesManager,
  'ITTeam': ItTeam,
  'DigitalMarketing': DigitalMarketing,
  'ClientService': ClientService,
  'HR': HR,
  'Vendor': Vendor,
  'Agent': Agent,
  'FieldExecutive': FieldExecutive,
  'Unit': Unit
};

// Get all employees
router.get('/', async (req, res) => {
  try {
    const groupedEmployees = {};

    // Fetch from each model and group by role
    for (const [role, Model] of Object.entries(modelMap)) {
      const employees = await Model.find().lean();
      if (employees.length > 0) {
        groupedEmployees[role] = employees.map(emp => ({
          ...emp,
          active: emp.active !== false, // Handle undefined/null
          imageUrl: emp.imageUrl || null,
          cloudinaryId: emp.cloudinaryId || null
        }));
      }
    }

    res.json(groupedEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new employee
router.post('/', uploadEmployee.single('image'), async (req, res) => {
  try {
    const { 
      username, 
      name, 
      phone, 
      email, 
      guardianName, 
      guardianContact,
      aadhar, 
      joiningDate, 
      experience, 
      role 
    } = req.body;

    console.log('Adding new employee:', { name, role });
    console.log('File received:', req.file ? 'Yes' : 'No');

    // Get the correct model for the role
    const Model = modelMap[role];
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}`
      });
    }

    // Check if username already exists in this model
    const existingEmployee = await Model.findOne({ 
      $or: [
        { username },
        { email },
        { name }
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Username, email or name already exists'
      });
    }

    // Generate employee ID
    const employeeId = `EMP-${name.replace(/\s+/g, '').slice(0, 4).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const employeeData = {
      username,
      name,
      phone,
      email: email || '',
      guardianName: guardianName || '',
      guardianContact: guardianContact || '',
      aadhar: aadhar || '',
      joiningDate: joiningDate || null,
      experience: experience || '',
      role,
      active: true,
      employeeId,
      password: 'default123', // You should handle this properly
      resignationDate: '',
      resignationReason: '',
      rejoinDate: ''
    };

    // Add image URL if uploaded
    if (req.file) {
      employeeData.imageUrl = req.file.path; // Cloudinary URL
      employeeData.cloudinaryId = req.file.filename;
    }

    const employee = new Model(employeeData);
    await employee.save();

    console.log('Employee added successfully with image:', employeeData.imageUrl ? 'Yes' : 'No');

    res.json({
      success: true,
      message: 'Employee added successfully',
      employee: {
        ...employee.toObject(),
        imageUrl: employee.imageUrl || null
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

// Update employee
router.put('/update-profile', uploadEmployee.single('image'), async (req, res) => {
  try {
    const { 
      name,
      username,
      phone,
      email,
      guardianName,
      guardianContact,
      aadhar,
      joiningDate,
      experience,
      role,
      active,
      resignationDate,
      resignationReason,
      rejoinDate
    } = req.body;

    console.log('Updating employee:', name);
    console.log('File received:', req.file ? 'Yes' : 'No');

    // Find which model contains this employee
    let foundEmployee = null;
    let Model = null;
    let foundRole = null;

    for (const [roleName, model] of Object.entries(modelMap)) {
      const emp = await model.findOne({ name: name });
      if (emp) {
        foundEmployee = emp;
        Model = model;
        foundRole = roleName;
        break;
      }
    }

    if (!foundEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Build update object
    const updateData = {
      username: username || foundEmployee.username,
      phone: phone || foundEmployee.phone,
      email: email || foundEmployee.email,
      guardianName: guardianName || foundEmployee.guardianName,
      guardianContact: guardianContact || foundEmployee.guardianContact,
      aadhar: aadhar || foundEmployee.aadhar,
      joiningDate: joiningDate || foundEmployee.joiningDate,
      experience: experience || foundEmployee.experience,
      role: role || foundRole,
      active: active === 'true' || active === true,
      resignationDate: resignationDate || foundEmployee.resignationDate,
      resignationReason: resignationReason || foundEmployee.resignationReason,
      rejoinDate: rejoinDate || foundEmployee.rejoinDate
    };

    // If new image uploaded, update imageUrl
    if (req.file) {
      console.log('New image uploaded:', req.file.path);
      updateData.imageUrl = req.file.path;
      updateData.cloudinaryId = req.file.filename;
    }

    const updatedEmployee = await Model.findOneAndUpdate(
      { name: name },
      { $set: updateData },
      { new: true }
    );

    console.log('Employee updated successfully');

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to update employee'
    });
  }
});

// Get employee by name
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    let foundEmployee = null;
    let foundRole = null;

    for (const [role, Model] of Object.entries(modelMap)) {
      const emp = await Model.findOne({ name: name });
      if (emp) {
        foundEmployee = emp;
        foundRole = role;
        break;
      }
    }

    if (!foundEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      employee: {
        ...foundEmployee.toObject(),
        role: foundRole
      }
    });

  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;