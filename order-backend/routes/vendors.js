const express = require('express');
const router = express.Router();
const Vendor = require('../models/vendorModel'); // We'll create this model next

// GET all vendors
router.get('/', async (req, res) => {
  try {
    const { category, location } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (location) query.location = new RegExp(location, 'i'); // Case-insensitive search
    
    const vendors = await Vendor.find(query);
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single vendor
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE vendor
router.post('/', async (req, res) => {
  const vendor = new Vendor({
    name: req.body.name,
    contact: req.body.contact,
    location: req.body.location,
    category: req.body.category,
    details: req.body.details || {
      address: '',
      services: '',
      rating: '',
      availability: '',
      notes: ''
    }
  });

  try {
    const newVendor = await vendor.save();
    res.status(201).json(newVendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE vendor
router.patch('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    if (req.body.name) vendor.name = req.body.name;
    if (req.body.contact) vendor.contact = req.body.contact;
    if (req.body.location) vendor.location = req.body.location;
    if (req.body.category) vendor.category = req.body.category;
    if (req.body.details) {
      if (req.body.details.address) vendor.details.address = req.body.details.address;
      if (req.body.details.services) vendor.details.services = req.body.details.services;
      if (req.body.details.rating) vendor.details.rating = req.body.details.rating;
      if (req.body.details.availability) vendor.details.availability = req.body.details.availability;
      if (req.body.details.notes) vendor.details.notes = req.body.details.notes;
    }

    const updatedVendor = await vendor.save();
    res.json(updatedVendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE vendor
router.delete('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    await vendor.remove();
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;