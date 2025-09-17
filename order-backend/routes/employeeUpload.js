const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

// Central Employee record
const Employee = require('../models/Employee');

// Role-specific models
const Executive = require('../models/Executive');
const Admin = require('../models/Admin');
const Designer = require('../models/Designer');
const Account = require('../models/Account');
const ServiceExecutive = require('../models/ServiceExecutive');
const ServiceManager = require('../models/ServiceManager');
const SalesManager = require('../models/SalesManager');
const ITTeam = require('../models/ITTeam');
const DigitalMarketing = require('../models/DigitalMarketing');
const ClientService = require('../models/ClientService');
const Unit = require('../models/Unit');

const router = express.Router();

// Enable CORS
router.use(cors());

/* ---------------- Multer config ---------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* ---------------- Helper: pick model by role ---------------- */
const roleModelMap = {
  executive: Executive,
  admin: Admin,
  designer: Designer,
  account: Account,
  'Service Executive': ServiceExecutive,
  'Service Manager': ServiceManager,
  'Sales Manager': SalesManager,
  'IT Team': ITTeam,
  'Digital Marketing': DigitalMarketing,
  'Client Service': ClientService,
  'Unit': Unit
};

/* ---------------- POST: Add any employee + image ---------------- */
router.post('/add-employee', upload.single('image'), async (req, res) => {
  try {
    const {
      username,
      name,
      phone,
      password,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      role,
      active,
      resignationDate,
      resignationReason,
      rejoinDate
    } = req.body;

    // Validate required fields
    if (!username || !name || !phone || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const imageUrl = req.file ? req.file.path : '';
    
    const employeeDoc = await Employee.create({
      username,
      name,
      phone,
      password,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      role,
      active: active === 'true' || active === true,
      imageUrl,
      resignationDate,
      resignationReason,
      rejoinDate
    });

    // Create in role-specific collection if model exists
    let roleDoc = null;
    const RoleModel = roleModelMap[role];
    if (RoleModel) {
      roleDoc = await RoleModel.create({
        username,
        name,
        phone,
        password,
        email,
        guardianName,
        aadhar,
        joiningDate,
        experience,
        active: active === 'true' || active === true,
        imageUrl,
        resignationDate,
        resignationReason,
        rejoinDate
      });
    }

    res.status(201).json({
      message: 'Employee added successfully',
      employee: employeeDoc,
      roleRecordCreated: !!roleDoc,
    });
  } catch (err) {
    console.error('Error in /add-employee:', err);
    res.status(500).json({ 
      message: 'Server error while saving employee',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/* ---------------- GET: All employees ---------------- */
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Error retrieving employees', error: err.message });
  }
});

/* ---------------- PUT: Update employee profile ---------------- */
router.put('/update-profile', upload.single('image'), async (req, res) => {
  try {
    const { name, updates } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Employee name is required' });
    }

    // Parse updates if it's a string (for form-data)
    let updateData = {};
    if (typeof updates === 'string') {
      try {
        updateData = JSON.parse(updates);
      } catch (e) {
        updateData = {};
      }
    } else {
      updateData = updates || {};
    }

    // Handle image upload
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    // Handle rejoin date logic
    if (updateData.active === true) {
      // If activating an inactive employee, ensure rejoin date is set
      const existingEmployee = await Employee.findOne({ name });
      if (existingEmployee && !existingEmployee.active && !updateData.rejoinDate) {
        return res.status(400).json({ message: 'Rejoin date is required when reactivating an employee' });
      }

      // Clear resignation details when activating
      updateData.resignationDate = '';
      updateData.resignationReason = '';
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { name },
      { $set: updateData },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update role-specific collection if exists
    const RoleModel = roleModelMap[updatedEmployee.role];
    if (RoleModel) {
      await RoleModel.findOneAndUpdate(
        { name },
        { $set: updateData },
        { new: true }
      );
    }

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ 
      message: 'Error updating employee',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/* ---------------- GET: Employee by name ---------------- */
router.get('/employee/:name', async (req, res) => {
  try {
    const employee = await Employee.findOne({ name: req.params.name });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(employee);
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ message: 'Error retrieving employee', error: err.message });
  }
});

module.exports = router;