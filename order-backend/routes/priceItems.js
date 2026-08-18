const express = require('express');
const router = express.Router();
const PriceItem = require('../models/PriceItem');

// Get all price items (with optional filtering by listType)
router.get('/', async (req, res) => {
  try {
    const { listType } = req.query;
    const query = listType ? { listType } : {};
    const priceItems = await PriceItem.find(query).sort({ createdAt: -1 });
    res.json(priceItems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new price item
router.post('/', async (req, res) => {
  const { product, sizes, minQty, listType } = req.body;

  try {
    const newItem = new PriceItem({
      product,
      sizes,
      minQty,
      listType
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a price item
router.put('/:id', async (req, res) => {
  try {
    const updatedItem = await PriceItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a price item
router.delete('/:id', async (req, res) => {
  try {
    await PriceItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;