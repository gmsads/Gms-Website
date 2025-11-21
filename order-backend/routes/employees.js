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

// Get all employees grouped by role
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all employees...');
    const employees = await Employee.find().sort({ createdAt: -1 });
    
    // Group employees by role
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
        aadhar: employee.aadhar,
        joiningDate: employee.joiningDate,
        experience: employee.experience,
        role: employee.role,
        active: employee.active,
        imageUrl: employee.imageUrl,
        resignationDate: employee.resignationDate,
        resignationReason: employee.resignationReason,
        rejoinDate: employee.rejoinDate,
        employeeId: employee.employeeId,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      });
    });

    console.log(`Found ${employees.length} employees in ${Object.keys(groupedEmployees).length} categories`);
    
    // DEBUG: Log resignation reasons for inactive employees
    employees.forEach(emp => {
      if (!emp.active && emp.resignationReason) {
        console.log(`DEBUG - Inactive employee ${emp.name}:`, {
          resignationReason: emp.resignationReason,
          resignationDate: emp.resignationDate
        });
      }
    });

    res.json(groupedEmployees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update employee profile (simple update without image) - IMPROVED
router.put('/update-profile', async (req, res) => {
  try {
    const { name, updates } = req.body;
    console.log('Updating employee profile for:', name, 'with updates:', updates);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Employee name is required'
      });
    }

    // Handle active status changes properly
    if (updates.active !== undefined) {
      updates.active = updates.active === 'true' || updates.active === true;
      
      // If activating employee, clear resignation details
      if (updates.active === true) {
        updates.resignationDate = '';
        updates.resignationReason = '';
        console.log('Activating employee - clearing resignation details');
      }
      
      // If deactivating employee, ensure resignation details are set
      if (updates.active === false) {
        if (!updates.resignationDate) {
          updates.resignationDate = new Date().toISOString().split('T')[0];
        }
        if (!updates.resignationReason) {
          updates.resignationReason = 'No reason provided';
        }
        console.log('Deactivating employee - setting resignation details:', {
          resignationDate: updates.resignationDate,
          resignationReason: updates.resignationReason
        });
      }
    }

    const employee = await Employee.findOneAndUpdate(
      { name: name },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!employee) {
      console.log('Employee not found with name:', name);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    console.log('Employee updated successfully:', {
      name: employee.name,
      active: employee.active,
      resignationReason: employee.resignationReason,
      resignationDate: employee.resignationDate
    });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: employee
    });

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update employee with image upload - IMPROVED
router.put('/employee-uploads/update-profile', upload.single('image'), async (req, res) => {
  try {
    console.log('Received update request with body:', req.body);
    console.log('File received:', req.file);

    const {
      name,
      username,
      phone,
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

    // Find employee by name
    const employee = await Employee.findOne({ name: name });

    if (!employee) {
      console.log('Employee not found with name:', name);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Parse active status
    const isActive = active === 'true' || active === true;

    // Prepare update data with proper resignation handling
    const updateData = {
      username: username || employee.username,
      name: name || employee.name,
      phone: phone || employee.phone,
      email: email || employee.email,
      guardianName: guardianName || employee.guardianName,
      aadhar: aadhar || employee.aadhar,
      joiningDate: joiningDate || employee.joiningDate,
      experience: experience || employee.experience,
      role: role || employee.role,
      active: isActive,
      rejoinDate: rejoinDate || employee.rejoinDate
    };

    // Handle resignation details based on active status
    if (isActive) {
      // If activating, clear resignation details
      updateData.resignationDate = '';
      updateData.resignationReason = '';
    } else {
      // If deactivating, set resignation details
      updateData.resignationDate = resignationDate || employee.resignationDate || new Date().toISOString().split('T')[0];
      updateData.resignationReason = resignationReason || employee.resignationReason || 'No reason provided';
    }

    // Handle image upload
    if (req.file) {
      updateData.imageUrl = `/uploads/employees/${req.file.filename}`;
      console.log('Image uploaded:', updateData.imageUrl);
    }

    // Update employee
    const updatedEmployee = await Employee.findOneAndUpdate(
      { name: name },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log('Employee updated successfully:', {
      name: updatedEmployee.name,
      active: updatedEmployee.active,
      resignationReason: updatedEmployee.resignationReason,
      resignationDate: updatedEmployee.resignationDate
    });

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });

  } catch (error) {
    console.error('Error updating employee:', error);
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
