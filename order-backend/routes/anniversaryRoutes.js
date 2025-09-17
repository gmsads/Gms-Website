const express = require('express');
const router = express.Router();
const Anniversary = require('../models/Anniversary');
const { body, validationResult } = require('express-validator');

// Create new anniversary with validation
router.post('/', 
  [
    body('clientName').notEmpty().withMessage('Client name is required'),
    body('businessName').notEmpty().withMessage('Business name is required'),
    body('anniversaryDate').isISO8601().withMessage('Valid anniversary date is required'),
    body('startingYear').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Valid starting year is required'),
    body('clientBirthday').isISO8601().withMessage('Valid client birthday is required'),
    body('collaborationDate').isISO8601().withMessage('Valid collaboration date is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const data = new Anniversary(req.body);
      await data.save();
      res.status(201).json({ 
        message: 'Anniversary saved successfully',
        data: data 
      });
    } catch (error) {
      console.error('Error saving anniversary:', error);
      res.status(500).json({ error: 'Server error while saving anniversary' });
    }
  }
);

// Get all anniversaries with optional filtering
router.get('/', async (req, res) => {
  try {
    const { month, upcomingDays } = req.query;
    let query = {};

    if (month) {
      query.$expr = { $eq: [{ $month: '$anniversaryDate' }, parseInt(month)] };
    }

    if (upcomingDays) {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + parseInt(upcomingDays));
      
      query.anniversaryDate = {
        $gte: today,
        $lte: futureDate
      };
    }

    const all = await Anniversary.find(query).sort({ anniversaryDate: 1 });
    res.json(all);
  } catch (error) {
    console.error('Error fetching anniversaries:', error);
    res.status(500).json({ error: 'Server error while fetching anniversaries' });
  }
});

// Get single anniversary by ID
router.get('/:id', async (req, res) => {
  try {
    const anniversary = await Anniversary.findById(req.params.id);
    if (!anniversary) {
      return res.status(404).json({ error: 'Anniversary not found' });
    }
    res.json(anniversary);
  } catch (error) {
    console.error('Error fetching anniversary:', error);
    res.status(500).json({ error: 'Server error while fetching anniversary' });
  }
});

// Update anniversary
router.put('/:id', async (req, res) => {
  try {
    const updatedAnniversary = await Anniversary.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedAnniversary) {
      return res.status(404).json({ error: 'Anniversary not found' });
    }
    
    res.json({ 
      message: 'Anniversary updated successfully',
      data: updatedAnniversary 
    });
  } catch (error) {
    console.error('Error updating anniversary:', error);
    res.status(500).json({ error: 'Server error while updating anniversary' });
  }
});

// Delete anniversary
router.delete('/:id', async (req, res) => {
  try {
    const deletedAnniversary = await Anniversary.findByIdAndDelete(req.params.id);
    
    if (!deletedAnniversary) {
      return res.status(404).json({ error: 'Anniversary not found' });
    }
    
    res.json({ 
      message: 'Anniversary deleted successfully',
      data: deletedAnniversary 
    });
  } catch (error) {
    console.error('Error deleting anniversary:', error);
    res.status(500).json({ error: 'Server error while deleting anniversary' });
  }
});

module.exports = router;