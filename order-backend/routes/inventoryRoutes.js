const express = require('express');
const Inventory = require('../models/Inventory');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const items = await Inventory.find().sort('-createdAt');
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/inventory
// @desc    Add new inventory item
// @access  Public
router.post('/', [
  check('itemName', 'Item name is required').not().isEmpty(),
  check('quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
  check('handlingPerson', 'Handling person name is required').not().isEmpty(),
  check('itemType', 'Valid item type is required').isIn([
    'Try Cycles',
    'Rounds',
    'Mobile Vans',
    'Frames',
    'Welding Machine',
    'Racks',
    'Laptops',
    'Chairs',
    'Desktops',
    'Fans',
    'Other'
  ])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const newItem = new Inventory(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/inventory/:id
// @desc    Update inventory item
// @access  Public
router.put('/:id', [
  check('itemName', 'Item name is required').not().isEmpty(),
  check('quantity', 'Quantity must be a positive number').isInt({ min: 1 }),
  check('handlingPerson', 'Handling person name is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        lastUpdated: Date.now()
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }

    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/inventory/:id
// @desc    Delete inventory item
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }

    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;