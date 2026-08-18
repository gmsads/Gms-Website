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
    console.error('Error fetching next number:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .sort({ createdAt: -1 });
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET single quotation by ID
router.get('/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    res.json(quotation);
  } catch (error) {
    console.error('Error fetching quotation:', error);
    res.status(500).json({ message: error.message });
  }
});

// CREATE new quotation
router.post('/', async (req, res) => {
  try {
    console.log('Received quotation data:', JSON.stringify(req.body, null, 2));
    
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

    // Ensure partyDetails is properly structured
    const quotationData = {
      quotationNo: req.body.quotationNo,
      partyDetails: {
        partyName: req.body.partyDetails?.partyName || '',
        mobileNumber: req.body.partyDetails?.mobileNumber || '',
        email: req.body.partyDetails?.email || '',
        billingAddress: req.body.partyDetails?.billingAddress || '',
        gstin: req.body.partyDetails?.gstin || ''
      },
      quotationDate: req.body.quotationDate,
      validityDate: req.body.validityDate,
      validFor: req.body.validFor || '10',
      poNo: req.body.poNo || '',
      items: req.body.items || [],
      additionalCharges: req.body.additionalCharges || [],
      summary: {
        subtotal: req.body.summary?.subtotal || 0,
        discount: req.body.summary?.discount || 0,
        tax: req.body.summary?.tax || 0,
        taxableAmount: req.body.summary?.taxableAmount || 0,
        additionalCharges: req.body.summary?.additionalCharges || 0,
        totalAmount: req.body.summary?.totalAmount || 0,
        autoRoundOff: req.body.summary?.autoRoundOff || 0
      },
      notes: req.body.notes || '',
      terms: req.body.terms || '',
      status: req.body.status || 'draft',
      createdBy: req.body.createdBy || 'System'
    };

    console.log('Processed quotation data:', JSON.stringify(quotationData, null, 2));

    const quotation = new Quotation(quotationData);
    const savedQuotation = await quotation.save();
    
    res.status(201).json(savedQuotation);
  } catch (error) {
    console.error('Error creating quotation:', error);
    console.error('Error details:', error.errors);
    res.status(400).json({ 
      message: 'Error creating quotation', 
      error: error.message,
      details: error.errors 
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
    );
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    res.json(quotation);
  } catch (error) {
    console.error('Error updating quotation:', error);
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
    console.error('Error deleting quotation:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET quotations by party name
router.get('/party/:partyName', async (req, res) => {
  try {
    const { partyName } = req.params;
    const quotations = await Quotation.find({
      'partyDetails.partyName': { $regex: partyName, $options: 'i' }
    }).sort({ createdAt: -1 });
    
    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations by party:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;