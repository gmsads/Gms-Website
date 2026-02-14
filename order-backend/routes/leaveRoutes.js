// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');

// Create a new leave request
router.post('/leave-requests', async (req, res) => {
  try {
    const { executiveName, startDate, endDate, numberOfDays, reason } = req.body;

    // Validate required fields
    if (!executiveName || !startDate || !endDate || !numberOfDays || !reason) {
      return res.status(400).json({ 
        message: 'All fields are required',
        missingFields: {
          executiveName: !executiveName,
          startDate: !startDate,
          endDate: !endDate,
          numberOfDays: !numberOfDays,
          reason: !reason
        }
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }

    // Create new leave request
    const leaveRequest = new LeaveRequest({
      executiveName,
      startDate: start,
      endDate: end,
      numberOfDays,
      reason,
      status: 'pending',
      appliedOn: new Date()
    });

    await leaveRequest.save();

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: {
        id: leaveRequest._id,
        executiveName: leaveRequest.executiveName,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        numberOfDays: leaveRequest.numberOfDays,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        appliedOn: leaveRequest.appliedOn
      }
    });

  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ 
      message: 'Failed to submit leave request',
      error: error.message 
    });
  }
});

// Get all leave requests for an executive
router.get('/leave-requests/:executiveName', async (req, res) => {
  try {
    const { executiveName } = req.params;
    const { status, startDate, endDate } = req.query;

    let query = { executiveName };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.appliedOn = {};
      if (startDate) {
        query.appliedOn.$gte = new Date(startDate);
      }
      if (endDate) {
        query.appliedOn.$lte = new Date(endDate);
      }
    }

    const leaveRequests = await LeaveRequest.find(query)
      .sort({ appliedOn: -1 })
      .select('-__v');

    res.status(200).json(leaveRequests);

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ 
      message: 'Failed to fetch leave requests',
      error: error.message 
    });
  }
});

// Get a single leave request by ID
router.get('/leave-request/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findById(id).select('-__v');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.status(200).json(leaveRequest);

  } catch (error) {
    console.error('Error fetching leave request:', error);
    res.status(500).json({ 
      message: 'Failed to fetch leave request',
      error: error.message 
    });
  }
});

// Update leave request status (for admin)
router.put('/leave-request/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, reviewedBy } = req.body;

    // Validate status
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const leaveRequest = await LeaveRequest.findById(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = reviewedBy || 'Admin';
    leaveRequest.reviewedOn = new Date();
    
    if (comments) {
      leaveRequest.comments = comments;
    }

    await leaveRequest.save();

    res.status(200).json({
      message: `Leave request ${status} successfully`,
      leaveRequest: {
        id: leaveRequest._id,
        executiveName: leaveRequest.executiveName,
        status: leaveRequest.status,
        reviewedBy: leaveRequest.reviewedBy,
        reviewedOn: leaveRequest.reviewedOn,
        comments: leaveRequest.comments
      }
    });

  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ 
      message: 'Failed to update leave request',
      error: error.message 
    });
  }
});

// Delete a leave request (optional - for admins)
router.delete('/leave-request/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findByIdAndDelete(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.status(200).json({ 
      message: 'Leave request deleted successfully',
      id: leaveRequest._id 
    });

  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ 
      message: 'Failed to delete leave request',
      error: error.message 
    });
  }
});

// Get leave statistics for an executive
router.get('/leave-stats/:executiveName', async (req, res) => {
  try {
    const { executiveName } = req.params;
    const { year } = req.query;

    const query = { executiveName };
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      query.appliedOn = { $gte: startOfYear, $lte: endOfYear };
    }

    const stats = await LeaveRequest.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$numberOfDays' }
        }
      }
    ]);

    const formattedStats = {
      total: 0,
      totalDays: 0,
      pending: { count: 0, days: 0 },
      approved: { count: 0, days: 0 },
      rejected: { count: 0, days: 0 }
    };

    stats.forEach(stat => {
      formattedStats.total += stat.count;
      formattedStats.totalDays += stat.totalDays;
      formattedStats[stat._id] = {
        count: stat.count,
        days: stat.totalDays
      };
    });

    res.status(200).json(formattedStats);

  } catch (error) {
    console.error('Error fetching leave statistics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch leave statistics',
      error: error.message 
    });
  }
});
// Add this to your leaveRoutes.js - Get all leave requests (for admin)
router.get('/admin/leave-requests', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    let query = {};

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.appliedOn = {};
      if (startDate) {
        query.appliedOn.$gte = new Date(startDate);
      }
      if (endDate) {
        query.appliedOn.$lte = new Date(endDate);
      }
    }

    const leaveRequests = await LeaveRequest.find(query)
      .sort({ appliedOn: -1 })
      .select('-__v');

    res.status(200).json(leaveRequests);

  } catch (error) {
    console.error('Error fetching all leave requests:', error);
    res.status(500).json({ 
      message: 'Failed to fetch leave requests',
      error: error.message 
    });
  }
});
module.exports = router;