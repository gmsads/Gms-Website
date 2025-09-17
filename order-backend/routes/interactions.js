const express = require('express');
const router = express.Router();
const Interaction = require('../models/Interaction');

// Helper function to calculate time difference
const calculateTimeDifference = (newerDate, olderDate) => {
  if (!olderDate) return 'First record';
  
  const diffInSeconds = Math.floor((new Date(newerDate) - new Date(olderDate)) / 1000);
  const absoluteDiff = Math.abs(diffInSeconds);

  if (absoluteDiff < 60) return `${absoluteDiff} second${absoluteDiff !== 1 ? 's' : ''} ago`;
  
  const diffInMinutes = Math.floor(absoluteDiff / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
};

// Create new interaction
router.post('/', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.executiveName || !req.body.phoneNumber || !req.body.businessName || 
        !req.body.customerName || !req.body.purpose || !req.body.topicDiscussed) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Clean phone number format
    const cleanedPhone = req.body.phoneNumber.replace(/\D/g, '').slice(0, 10);
    if (cleanedPhone.length !== 10) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }

    // Find last interaction with the same phone number
    const lastRecord = await Interaction.findOne({ phoneNumber: cleanedPhone })
      .sort({ createdAt: -1 });

    const newInteraction = new Interaction({
      executiveName: req.body.executiveName,
      phoneNumber: cleanedPhone,
      businessName: req.body.businessName,
      customerName: req.body.customerName,
      purpose: req.body.purpose,
      topicDiscussed: req.body.topicDiscussed,
      remark: req.body.remark || '',
      timeSinceLast: calculateTimeDifference(new Date(), lastRecord?.createdAt)
    });

    await newInteraction.save();
    res.status(201).json(newInteraction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all interactions
router.get('/', async (req, res) => {
  try {
    const { executiveName, phoneNumber } = req.query;
    let filter = {};

    if (executiveName) {
      filter.executiveName = new RegExp(executiveName, 'i');
    }
    if (phoneNumber) {
      filter.phoneNumber = phoneNumber.replace(/\D/g, '');
    }

    const interactions = await Interaction.find(filter).sort({ createdAt: -1 }); // Newest first

    // Calculate time differences between consecutive records
    const processedInteractions = interactions.map((interaction, index) => {
      const previous = index < interactions.length - 1 ? interactions[index + 1] : null;
      return {
        ...interaction._doc,
        timeSinceLast: calculateTimeDifference(
          interaction.createdAt, 
          previous?.createdAt
        )
      };
    });

    res.json(processedInteractions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add update to an interaction
router.patch('/:id/updates', async (req, res) => {
  try {
    const { text, executiveName } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Update text is required' });
    }

    const updateData = {
      text,
      updatedAt: new Date()
    };

    if (executiveName) {
      updateData.executiveName = executiveName;
    }

    const updatedInteraction = await Interaction.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          updates: updateData
        }
      },
      { new: true }
    );

    if (!updatedInteraction) {
      return res.status(404).json({ message: 'Interaction not found' });
    }

    res.json(updatedInteraction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get interactions by phone number
router.get('/phone/:phoneNumber', async (req, res) => {
  try {
    const cleanedPhone = req.params.phoneNumber.replace(/\D/g, '');
    const interactions = await Interaction.find({ phoneNumber: cleanedPhone })
      .sort({ createdAt: -1 });

    if (!interactions.length) {
      return res.status(404).json({ message: 'No interactions found for this phone number' });
    }

    res.json(interactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;