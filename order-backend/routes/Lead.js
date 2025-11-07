const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// POST /api/leads - Get all leads with optional filtering
router.post('/', async (req, res) => {
  try {
    const { filterStatus, month, year } = req.body;
    let query = {};
    
    if (filterStatus && filterStatus !== 'all') {
      query.status = filterStatus;
    }
    
    // Add date filtering
    if (month && year) {
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      query.createdAt = {
        $gte: startDate,
        $lt: endDate
      };
    } else if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${year}-12-31`);
      
      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    res.json({ data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leads/bulk - Bulk insert leads
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'Leads array is required' });
    }
    
    const savedLeads = await Lead.insertMany(leads);
    res.status(201).json({ 
      data: savedLeads,
      insertedCount: savedLeads.length
    });
  } catch (error) {
    console.error('Error bulk inserting leads:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/leads/:id - Update a lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ data: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/leads/clear - Clear all leads
router.delete('/clear', async (req, res) => {
  try {
    const result = await Lead.deleteMany({});
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} leads`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing leads:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;