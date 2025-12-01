// routes/leads.js - CLEAN & WORKING BACKEND
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const CallLog = require('../models/Calllog');

// POST /api/leads - Get all leads with optional filtering
router.post('/', async (req, res) => {
  try {
    const { filterStatus, month, year } = req.body;
    let query = {};

    // Status filter
    if (filterStatus && filterStatus !== 'all') {
      query.status = filterStatus;
    }

    // Date filtering
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

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    res.json({ data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/leads/create - Create a lead
router.post('/create', async (req, res) => {
  try {
    const leadData = req.body;

    if (!leadData.name || !leadData.phone) {
      return res.status(400).json({ error: 'Name and phone are required fields' });
    }

    const lead = new Lead(leadData);
    const savedLead = await lead.save();

    res.status(201).json({
      success: true,
      data: savedLead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(400).json({ error: error.message });
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

// PUT /api/leads/:id - Update lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const updatedLead = await Lead.findByIdAndUpdate(
      id,
      req.body,
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

// DELETE /api/leads/:id - Delete single lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid lead ID format' });
    }

    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Delete related call logs
    await CallLog.deleteMany({ lead_id: id });

    res.json({
      success: true,
      message: 'Lead deleted successfully',
      data: deletedLead
    });

  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message });
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
