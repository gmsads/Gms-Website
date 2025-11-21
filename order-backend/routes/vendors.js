const express = require('express');
const router = express.Router();
const Vendor = require('../models/vendorModel');

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
  try {
    const vendor = new Vendor({
      name: req.body.name,
      contact: req.body.contact,
      location: req.body.location,
      category: req.body.category,
      amount: req.body.amount,
      availability: req.body.availability || new Date(),
      details: {
        address: req.body.details?.address || '',
        services: req.body.details?.services || '',
        rating: req.body.details?.rating || 0,
        notes: req.body.details?.notes || ''
      }
    });

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

    // Update fields if provided
    if (req.body.name) vendor.name = req.body.name;
    if (req.body.contact) vendor.contact = req.body.contact;
    if (req.body.location) vendor.location = req.body.location;
    if (req.body.category) vendor.category = req.body.category;
    if (req.body.amount !== undefined) vendor.amount = req.body.amount;
    if (req.body.availability) vendor.availability = req.body.availability;
    
    if (req.body.details) {
      if (req.body.details.address !== undefined) vendor.details.address = req.body.details.address;
      if (req.body.details.services !== undefined) vendor.details.services = req.body.details.services;
      if (req.body.details.rating !== undefined) vendor.details.rating = req.body.details.rating;
      if (req.body.details.notes !== undefined) vendor.details.notes = req.body.details.notes;
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
    
    await Vendor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// In your backend routes
router.post('/services', async (req, res) => {
  try {
    const service = new Service({
      vendorId: req.body.vendorId,
      vendorName: req.body.vendorName,
      vendorContact: req.body.vendorContact,
      vendorAddress: req.body.vendorAddress,
      vendorAmount: req.body.vendorAmount,
      vendorAvailability: req.body.vendorAvailability,
      serviceName: req.body.serviceName,
      serviceDate: req.body.serviceDate,
      amount: req.body.amount,
      description: req.body.description,
      status: req.body.status,
      createdDate: req.body.createdDate
    });

    const newService = await service.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
module.exports = router;