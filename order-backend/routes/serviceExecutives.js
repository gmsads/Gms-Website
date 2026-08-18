const express = require('express');
const router = express.Router();
const ServiceExecutive = require('../models/ServiceExecutive');
const Order = require('../models/Order'); // Add this import for the Order model

// Get all service executives
router.get('/service-executives', async (req, res) => {
  try {
    const executives = await ServiceExecutive.find({});
    res.json(executives);
  } catch (error) {
    console.error('Error fetching service executives:', error);
    res.status(500).json({ error: 'Failed to fetch service executives' });
  }
});

// Get service executives by role (if needed)
router.get('/service-executives/:role', async (req, res) => {
  try {
    const executives = await ServiceExecutive.find({ role: req.params.role });
    res.json(executives);
  } catch (error) {
    console.error('Error fetching service executives by role:', error);
    res.status(500).json({ error: 'Failed to fetch service executives' });
  }
});

// Get all services
router.get('/orders/services', async (req, res) => {
  try {
    const orders = await Order.find({})
      .select('business rows deliveryDate _id')
      .lean();
    
    // Flatten the orders with their rows
    const services = orders.flatMap(order => 
      order.rows.map(row => ({
        ...row,
        orderId: order._id, // Using orderId to avoid confusion
        business: order.business,
        deliveryDate: order.deliveryDate
      })));
    
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services',
      details: error.message // Include error details for debugging
    });
  }
});

module.exports = router;