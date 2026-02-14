const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/employees/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    
    const groupedEmployees = {};
    employees.forEach(employee => {
      const role = employee.role || 'Uncategorized';
      if (!groupedEmployees[role]) {
        groupedEmployees[role] = [];
      }
      groupedEmployees[role].push({
        _id: employee._id,
        username: employee.username,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        guardianName: employee.guardianName,
        guardianContact: employee.guardianContact,  // ✅ Make sure this is included
        aadhar: employee.aadhar,
        joiningDate: employee.joiningDate,
        experience: employee.experience,
        role: employee.role,
        active: employee.active,
        imageUrl: employee.imageUrl,
        resignationDate: employee.resignationDate,
        resignationReason: employee.resignationReason,
        rejoinDate: employee.rejoinDate,
        employeeId: employee.employeeId
      });
    });

    res.json(groupedEmployees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE endpoint (without image)
router.put('/update-profile', async (req, res) => {
  try {
    const { name, updates } = req.body;
    
    // Make sure guardianContact is included in updates
    const employee = await Employee.findOneAndUpdate(
      { name: name },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE endpoint with image
router.put('/employee-uploads/update-profile', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      username,
      phone,
      email,
      guardianName,
      guardianContact,  // ✅ Make sure this is extracted
      aadhar,
      joiningDate,
      experience,
      role,
      active,
      resignationDate,
      resignationReason,
      rejoinDate
    } = req.body;

    const employee = await Employee.findOne({ name: name });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updateData = {
      username: username || employee.username,
      phone: phone || employee.phone,
      email: email || employee.email,
      guardianName: guardianName || employee.guardianName,
      guardianContact: guardianContact || employee.guardianContact,  // ✅ Add this
      aadhar: aadhar || employee.aadhar,
      joiningDate: joiningDate || employee.joiningDate,
      experience: experience || employee.experience,
      role: role || employee.role,
      active: active === 'true' || active === true,
      rejoinDate: rejoinDate || employee.rejoinDate
    };

    // Handle image upload
    if (req.file) {
      updateData.imageUrl = `/uploads/employees/${req.file.filename}`;
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { name: name },
      { $set: updateData },
      { new: true }
    );

    res.json({ success: true, employee: updatedEmployee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new employee
router.post('/', async (req, res) => {
  try {
    const { username, name, phone, email, guardianName, aadhar, joiningDate, experience, role } = req.body;

    console.log('Adding new employee:', name);

    // Check if username already exists
    const existingEmployee = await Employee.findOne({ 
      $or: [
        { username },
        { email }
      ]
    });

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Generate employee ID
    const employeeId = `EMP-${name.replace(/\s+/g, '').slice(0, 4).toUpperCase()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const employee = new Employee({
      username,
      name,
      phone,
      email,
      guardianName,
      aadhar,
      joiningDate,
      experience,
      role,
      active: true,
      employeeId,
      resignationDate: '',
      resignationReason: ''
    });

    await employee.save();

    console.log('New employee added successfully:', name);
    res.json({
      success: true,
      message: 'Employee added successfully',
      employee: {
        _id: employee._id,
        username: employee.username,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        role: employee.role,
        active: employee.active,
        employeeId: employee.employeeId
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

// Get employee by name (for debugging)
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log('Fetching employee by name:', name);

    const employee = await Employee.findOne({ name: name });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('Employee found:', {
      name: employee.name,
      active: employee.active,
      resignationReason: employee.resignationReason,
      resignationDate: employee.resignationDate
    });

    res.json({
      success: true,
      employee: employee
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
