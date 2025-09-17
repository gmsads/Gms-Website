// In routes/pendingService.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Update remark for specific row
router.put('/:orderId/row/:rowIndex/remark', async (req, res) => {
  try {
    const { orderId, rowIndex } = req.params;
    const { remark, isCompleted } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const index = parseInt(rowIndex);
    if (isNaN(index) || index < 0 || index >= order.rows.length) {
      return res.status(400).json({ error: 'Invalid row index' });
    }

    // Update both fields
    if (remark) order.rows[index].remark = remark;
    if (isCompleted !== undefined) order.rows[index].isCompleted = isCompleted;
    
    order.markModified('rows');
    await order.save();

    res.json({ 
      success: true,
      updatedRow: order.rows[index]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;