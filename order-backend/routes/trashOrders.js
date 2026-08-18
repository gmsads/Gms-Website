// routes/trashOrders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const TrashOrder = require('../models/TrashOrder');

// Move order to trash
router.post('/move-to-trash', async (req, res) => {
  try {
    const { orderId, reason, deletedBy } = req.body;
    
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Create trash order
    const trashOrder = new TrashOrder({
      ...order.toObject(),
      deletedAt: new Date(),
      deletionReason: reason,
      deletedBy: deletedBy,
      originalOrderId: orderId
    });

    await trashOrder.save();
    await Order.findByIdAndDelete(orderId);

    res.json({ message: 'Order moved to trash successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all trash orders
router.get('/', async (req, res) => {
  try {
    const trashOrders = await TrashOrder.find().sort({ deletedAt: -1 });
    res.json(trashOrders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Restore order from trash
router.post('/:id/restore', async (req, res) => {
  try {
    const trashOrder = await TrashOrder.findById(req.params.id);
    if (!trashOrder) {
      return res.status(404).json({ message: 'Trash order not found' });
    }

    // Remove trash-specific fields and create new order
    const { deletedAt, deletionReason, deletedBy, originalOrderId, ...orderData } = trashOrder.toObject();
    
    const restoredOrder = new Order(orderData);
    await restoredOrder.save();
    await TrashOrder.findByIdAndDelete(req.params.id);

    res.json({ message: 'Order restored successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Permanently delete from trash
router.delete('/:id', async (req, res) => {
  try {
    await TrashOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Empty trash
router.delete('/', async (req, res) => {
  try {
    await TrashOrder.deleteMany({});
    res.json({ message: 'Trash emptied successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;