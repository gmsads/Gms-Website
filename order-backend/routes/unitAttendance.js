const express = require('express');
const router = express.Router();
const UnitAttendance = require('../models/UnitAttendance'); // Correct import

// MARK ATTENDANCE
router.post('/mark-employee', async (req, res) => {
  try {
    const { employeeName, image, timestamp } = req.body;
    
    console.log('Received attendance request for:', employeeName);
    
    if (!employeeName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Employee name is required' 
      });
    }

    // Create today's date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if employee already logged in today
    const existingAttendance = await UnitAttendance.findOne({
      employeeName: employeeName.trim(),
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }

    // Create new attendance record (simplified - removed required fields you don't have)
    const attendance = new UnitAttendance({
      employeeName: employeeName.trim(),
      date: new Date(),
      loginTime: new Date(),
      image: image, // base64 image
      status: 'present',
      location: 'Manufacturing Unit'
    });

    await attendance.save();
    
    console.log('Attendance marked successfully for:', employeeName);
    
    res.json({ 
      success: true, 
      message: 'Attendance marked successfully',
      name: employeeName,
      data: attendance
    });
    
  } catch (err) {
    console.error('Attendance marking error:', err);
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + err.message 
    });
  }
});


// FETCH ATTENDANCE RECORDS - Fixed filtering logic
router.get('/employee', async (req, res) => {
  try {
    const { year, month, date } = req.query;
    
    console.log('Fetching attendance with filters:', { year, month, date });

    let query = {};
    
    // Handle date filter (specific date)
    if (date) {
      const filterDate = new Date(date);
      const nextDate = new Date(filterDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      query.date = {
        $gte: filterDate,
        $lt: nextDate
      };
    } 
    // Handle year and month filter - FIXED LOGIC
    else if (year && month) {
      // If month is 'all', get all months for that year
      if (month === 'all') {
        const startDate = new Date(parseInt(year), 0, 1); // Jan 1
        const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59); // Dec 31
        query.date = {
          $gte: startDate,
          $lte: endDate
        };
      } else {
        // Specific month and year
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        query.date = {
          $gte: startDate,
          $lte: endDate
        };
      }
    }
    // Handle year only filter
    else if (year && year !== 'all') {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    // If no filters, get all records from current year
    else {
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59);
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    console.log('Final query:', JSON.stringify(query, null, 2));

    const attendanceRecords = await UnitAttendance.find(query)
      .sort({ loginTime: -1 })
      .lean();

    console.log(`Found ${attendanceRecords.length} records`);
    
    // Format dates for better logging
    if (attendanceRecords.length > 0) {
      console.log('First record date:', attendanceRecords[0].date);
      console.log('First record login time:', attendanceRecords[0].loginTime);
    }
    
    res.json({ 
      success: true, 
      data: attendanceRecords,
      count: attendanceRecords.length
    });
    
  } catch (err) {
    console.error('Fetch attendance error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance: ' + err.message 
    });
  }
});

// GET TODAY'S ATTENDANCE
router.get('/employee/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecords = await UnitAttendance.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).sort({ loginTime: -1 });

    res.json({
      success: true,
      data: todayRecords,
      count: todayRecords.length
    });
  } catch (err) {
    console.error('Fetch today attendance error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s attendance'
    });
  }
});

module.exports = router;