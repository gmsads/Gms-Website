// routes/purchase.js
const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');

// GET all purchases
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, businessName, paymentMethod } = req.query;
    
    let query = {};
    
    // Date filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Business name filter
    if (businessName) {
      query.businessName = { $regex: businessName, $options: 'i' };
    }
    
    // Payment method filter
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    
    const purchases = await Purchase.find(query)
      .sort({ date: -1, createdAt: -1 });
    
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ 
      message: 'Failed to fetch purchases', 
      error: error.message 
    });
  }
});

// CREATE new purchase
router.post('/', async (req, res) => {
  try {
    const purchase = new Purchase({
      businessName: req.body.businessName,
      date: req.body.date,
      item: req.body.item,
      quantity: req.body.quantity,
      rate: req.body.rate,
      amount: req.body.amount,
      remarks: req.body.remarks,
      paymentMethod: req.body.paymentMethod
    });
    
    const savedPurchase = await purchase.save();
    res.status(201).json(savedPurchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(400).json({ 
      message: 'Failed to create purchase', 
      error: error.message 
    });
  }
});

// UPDATE purchase
router.put('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    // Update fields
    purchase.businessName = req.body.businessName || purchase.businessName;
    purchase.date = req.body.date || purchase.date;
    purchase.item = req.body.item !== undefined ? req.body.item : purchase.item;
    purchase.quantity = req.body.quantity !== undefined ? req.body.quantity : purchase.quantity;
    purchase.rate = req.body.rate !== undefined ? req.body.rate : purchase.rate;
    purchase.amount = req.body.amount || purchase.amount;
    purchase.remarks = req.body.remarks !== undefined ? req.body.remarks : purchase.remarks;
    purchase.paymentMethod = req.body.paymentMethod || purchase.paymentMethod;
    
    const updatedPurchase = await purchase.save();
    res.json(updatedPurchase);
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(400).json({ 
      message: 'Failed to update purchase', 
      error: error.message 
    });
  }
});

// DELETE purchase
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    await Purchase.deleteOne({ _id: req.params.id });
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ 
      message: 'Failed to delete purchase', 
      error: error.message 
    });
  }
});

module.exports = router;