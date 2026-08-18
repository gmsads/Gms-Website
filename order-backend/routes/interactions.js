const express = require('express');
const router = express.Router();
const HourRecord = require('../models/Interaction');

// Create new hour record
router.post('/', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.executiveName || !req.body.topicDiscussed) {
      return res.status(400).json({ 
        message: 'Missing required fields. Executive name and topic discussed are required.' 
      });
    }

    // Clean phone number if provided (remove non-digits, limit to 10 digits)
    let cleanedPhone = '';
    if (req.body.phoneNumber) {
      cleanedPhone = req.body.phoneNumber.replace(/\D/g, '').slice(0, 10);
    }

    const newRecord = new HourRecord({
      executiveName: req.body.executiveName,
      phoneNumber: cleanedPhone || '', // Store empty string if no phone number
      topicDiscussed: req.body.topicDiscussed,
      remark: req.body.remark || '' // Default to empty string if not provided
    });

    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('Error creating hour record:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all hour records (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { executiveName, phoneNumber, startDate, endDate } = req.query;
    let filter = {};

    // Filter by executive name (case-insensitive partial match)
    if (executiveName) {
      filter.executiveName = new RegExp(executiveName, 'i');
    }

    // Filter by phone number
    if (phoneNumber) {
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      filter.phoneNumber = cleanedPhone;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const records = await HourRecord.find(filter)
      .sort({ createdAt: -1 }); // Newest first

    res.json(records);
  } catch (error) {
    console.error('Error fetching hour records:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a single hour record by ID
router.get('/:id', async (req, res) => {
  try {
    const record = await HourRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ message: 'Hour record not found' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching hour record:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update an hour record
router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    const allowedUpdates = ['phoneNumber', 'topicDiscussed', 'remark'];
    
    // Only allow updating specific fields
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'phoneNumber' && req.body.phoneNumber) {
          updates.phoneNumber = req.body.phoneNumber.replace(/\D/g, '').slice(0, 10);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Don't allow updating executiveName or createdAt

    const updatedRecord = await HourRecord.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: 'Hour record not found' });
    }

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating hour record:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete an hour record
router.delete('/:id', async (req, res) => {
  try {
    const deletedRecord = await HourRecord.findByIdAndDelete(req.params.id);
    
    if (!deletedRecord) {
      return res.status(404).json({ message: 'Hour record not found' });
    }
    
    res.json({ message: 'Hour record deleted successfully' });
  } catch (error) {
    console.error('Error deleting hour record:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get records by executive name
router.get('/executive/:name', async (req, res) => {
  try {
    const records = await HourRecord.find({ 
      executiveName: new RegExp(req.params.name, 'i') 
    }).sort({ createdAt: -1 });
    
    res.json(records);
  } catch (error) {
    console.error('Error fetching records by executive:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get records by phone number
router.get('/phone/:phoneNumber', async (req, res) => {
  try {
    const cleanedPhone = req.params.phoneNumber.replace(/\D/g, '');
    const records = await HourRecord.find({ 
      phoneNumber: cleanedPhone 
    }).sort({ createdAt: -1 });

    res.json(records);
  } catch (error) {
    console.error('Error fetching records by phone:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalRecords = await HourRecord.countDocuments();
    const recordsToday = await HourRecord.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    const uniqueExecutives = await HourRecord.distinct('executiveName');
    const recordsWithPhone = await HourRecord.countDocuments({ 
      phoneNumber: { $ne: '' } 
    });

    res.json({
      totalRecords,
      recordsToday,
      uniqueExecutivesCount: uniqueExecutives.length,
      recordsWithPhone,
      recordsWithoutPhone: totalRecords - recordsWithPhone
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;