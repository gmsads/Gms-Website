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

    const assigned = leadData.assigned_to || leadData.employee_name || '';
    const todayFormatted = new Date().toLocaleDateString('en-GB'); // e.g. 26/06/2026

    const cleanLead = {
      Date: leadData.Date || todayFormatted,
      ...leadData,
      assigned_to: assigned,
      employee_name: assigned,
      created_by: assigned
    };

    const lead = new Lead(cleanLead);
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

// POST /api/leads/distribute - Bulk import and distribute leads among executives
router.post('/distribute', async (req, res) => {
  try {
    const { leads, distributeMode, selectedExecutives } = req.body;
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Leads array is required' });
    }

    const executives = Array.isArray(selectedExecutives) && selectedExecutives.length > 0 ? selectedExecutives : ['Unassigned'];

    const leadsToInsert = leads.map((lead, idx) => {
      let assignedTo = '';
      if (distributeMode === 'round_robin') {
        assignedTo = executives[idx % executives.length];
      } else if (distributeMode === 'single' && executives[0]) {
        assignedTo = executives[0];
      } else {
        assignedTo = lead.assigned_to || lead.employee_name || '';
      }

      return {
        ...lead,
        assigned_to: assignedTo,
        employee_name: assignedTo,
        assigned_at: assignedTo ? new Date() : undefined,
        call_status: 'pending'
      };
    });

    const savedLeads = await Lead.insertMany(leadsToInsert);
    res.status(201).json({ success: true, data: savedLeads, count: savedLeads.length });
  } catch (error) {
    console.error('Error distributing leads:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/leads/executive - Get leads assigned to an executive (Pending + Rescheduled Unconnected/Callback)
router.post('/executive', async (req, res) => {
  try {
    const { executiveName } = req.body;
    if (!executiveName) {
      return res.status(400).json({ error: 'executiveName is required' });
    }

    const cleanName = executiveName.trim();
    const todayStr = new Date().toISOString().split('T')[0];

    // Case-insensitive exact match regex
    const execRegex = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    const query = {
      $or: [
        { assigned_to: execRegex },
        { employee_name: execRegex },
        { created_by: execRegex }
      ]
    };

    const allLeads = await Lead.find(query).sort({ createdAt: -1 });

    const activeLeads = allLeads.filter(l => {
      if (l.status === 'sale' || l.call_status === 'sale' || l.status === 'not_interested' || l.call_status === 'not_interested') {
        return false;
      }
      if (l.call_status === 'pending' || !l.call_status) {
        return true;
      }
      if (l.call_status === 'not_connected' || l.call_status === 'callback') {
        if (!l.next_followup_date || l.next_followup_date <= todayStr) {
          return true;
        }
      }
      return false;
    });

    res.json({ success: true, data: allLeads, activeAssigned: activeLeads });
  } catch (error) {
    console.error('Error fetching executive leads:', error);
    res.status(500).json({ error: error.message });
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

// DELETE /api/leads/clear - Clear all leads (MUST BE DEFINED BEFORE /:id)
router.delete('/clear', async (req, res) => {
  try {
    const result = await Lead.deleteMany({});
    await CallLog.deleteMany({});
    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} leads`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing leads:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/leads/:id - Delete single lead
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === 'clear') return next();

    const deletedLead = await Lead.findOneAndDelete({ $or: [{ _id: id }] });

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

module.exports = router;
