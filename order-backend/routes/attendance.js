const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

// Get attendance for a specific month

// In your server-side route
router.get('/', async (req, res) => {
  try {
    const month = req.query.month; // "YYYY-MM"
    const employeeId = req.query.employeeId;

    if (!month) {
      return res.status(400).json({ message: 'Month parameter is required' });
    }

    const [year, monthNum] = month.split('-').map(Number);

    // Create dates in UTC to avoid timezone issues
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 0));
    endDate.setUTCHours(23, 59, 59, 999);

    const query = {
      date: { 
        $gte: startDate, 
        $lte: endDate 
      }
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    const attendance = await Attendance.find(query).sort({ date: 1 });
    res.json(attendance);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employeeId, date, status, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Parse the date string and create a UTC date at midnight
    const [year, month, day] = date.split('-').map(Number);
    const attendanceDate = new Date(Date.UTC(year, month - 1, day));

    // Upsert attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { 
        employeeId, 
        date: attendanceDate
      },
      { 
        employeeId,
        date: attendanceDate,
        status, 
        notes 
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(attendance);
  } catch (err) {
    console.error('Error saving attendance:', err);
    res.status(400).json({ message: err.message });
  }
});


// Create or update attendance record
router.post('/', async (req, res) => {
  try {
    const { employeeId, date, status, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Normalize to start of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Upsert attendance record by day range
    const attendance = await Attendance.findOneAndUpdate(
      { 
        employeeId, 
        date: { $gte: startOfDay, $lte: endOfDay }
      },
      { 
        employeeId,
        date: startOfDay,   // always store as normalized start of day
        status, 
        notes 
      },
      { new: true, upsert: true }
    ).populate('employeeId', 'name employeeId role');

    res.status(201).json(attendance);
  } catch (err) {
    console.error('Error saving attendance:', err);
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;