// routes/quotations.js
const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');

// GET next quotation number
router.get('/next-number', async (req, res) => {
  try {
    const lastQuotation = await Quotation.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    
    if (lastQuotation && lastQuotation.quotationNo) {
      const lastNumber = parseInt(lastQuotation.quotationNo.replace('GMS', ''));
      nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
    }
    
    const nextQuotationNo = `GMS${String(nextNumber).padStart(3, '0')}`;
    res.json({ nextNumber: nextQuotationNo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate('partyId')
      .sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single quotation by ID
router.get('/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('partyId');
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    res.json(quotation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE new quotation
router.post('/', async (req, res) => {
  try {
    // If quotationNo is not provided, generate one
    if (!req.body.quotationNo) {
      const lastQuotation = await Quotation.findOne().sort({ createdAt: -1 });
      let nextNumber = 1;
      
      if (lastQuotation && lastQuotation.quotationNo) {
        const lastNumber = parseInt(lastQuotation.quotationNo.replace('GMS', ''));
        nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
      }
      
      req.body.quotationNo = `GMS${String(nextNumber).padStart(3, '0')}`;
    }

    const quotationData = {
      ...req.body,
      status: req.body.status || 'draft'
    };

    const quotation = new Quotation(quotationData);
    const savedQuotation = await quotation.save();
    
    // Populate party details in response
    await savedQuotation.populate('partyId');
    
    res.status(201).json(savedQuotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(400).json({ 
      message: 'Error creating quotation', 
      error: error.message 
    });
  }
});

// UPDATE quotation
router.put('/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('partyId');
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    res.json(quotation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE quotation
router.delete('/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;