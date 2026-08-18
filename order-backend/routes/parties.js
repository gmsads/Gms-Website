const express = require('express');
const router = express.Router();
const Party = require('../models/Party');

// GET all parties with search and filter
router.get('/', async (req, res) => {
  try {
    const { search, category, type } = req.query;
    let filter = {};

    // Search by party name
    if (search) {
      filter.partyName = { $regex: search, $options: 'i' };
    }

    // Filter by category
    if (category && category !== 'all') {
      filter.partyCategory = category;
    }

    // Filter by party type
    if (type && type !== 'all') {
      filter.partyType = type;
    }

    const parties = await Party.find(filter).sort({ createdAt: -1 });
    res.json(parties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET party by ID
router.get('/:id', async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    res.json(party);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE new party
router.post('/', async (req, res) => {
  try {
    const partyData = {
      ...req.body,
      // Ensure numeric fields are properly formatted
      openingBalance: req.body.openingBalance || '0',
      creditPeriod: req.body.creditPeriod || '30',
      creditLimit: req.body.creditLimit || '0'
    };

    const party = new Party(partyData);
    const savedParty = await party.save();
    res.status(201).json(savedParty);
  } catch (error) {
    res.status(400).json({ 
      message: 'Error creating party',
      error: error.message 
    });
  }
});

// UPDATE party
router.put('/:id', async (req, res) => {
  try {
    const party = await Party.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body, 
        updatedAt: Date.now() 
      },
      { 
        new: true, 
        runValidators: true 
      }
    );
    
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    
    res.json(party);
  } catch (error) {
    res.status(400).json({ 
      message: 'Error updating party',
      error: error.message 
    });
  }
});

// DELETE party
router.delete('/:id', async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.id);
    if (!party) {
      return res.status(404).json({ message: 'Party not found' });
    }
    res.json({ 
      message: 'Party deleted successfully',
      deletedParty: party 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting party',
      error: error.message 
    });
  }
});

// GET parties statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalParties = await Party.countDocuments();
    const customers = await Party.countDocuments({ partyType: 'Customer' });
    const suppliers = await Party.countDocuments({ partyType: 'Supplier' });
    const both = await Party.countDocuments({ partyType: 'Both' });

    res.json({
      totalParties,
      customers,
      suppliers,
      both
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;