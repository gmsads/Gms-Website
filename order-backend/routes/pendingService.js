// routes/pendingServices.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Update remark for specific row
router.put('/:orderId/row/:rowIndex/remark', async (req, res) => {
  try {
    const { orderId, rowIndex } = req.params;
    const { 
      remark, 
      isCompleted, 
      completedDate, 
      assignedExecutive, 
      lastUpdateTime 
    } = req.body;

    console.log('🔵 UPDATE REQUEST:', { 
      orderId, 
      rowIndex, 
      remark, 
      isCompleted, 
      completedDate,
      assignedExecutive 
    });

    const order = await Order.findById(orderId);
    if (!order) {
      console.log('❌ Order not found:', orderId);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const index = parseInt(rowIndex);
    if (isNaN(index) || index < 0 || index >= order.rows.length) {
      console.log('❌ Invalid row index:', rowIndex);
      return res.status(400).json({ success: false, error: 'Invalid row index' });
    }

    // Store current values for debugging
    const currentRow = order.rows[index];
    console.log('📋 BEFORE UPDATE - Current row:', {
      remark: currentRow.remark,
      isCompleted: currentRow.isCompleted,
      completedDate: currentRow.completedDate,
      assignedExecutive: currentRow.assignedExecutive
    });

    // Update the row fields
    if (remark !== undefined) {
      order.rows[index].remark = remark;
    }
    
    if (isCompleted !== undefined) {
      order.rows[index].isCompleted = isCompleted;
    }
    
    // CRITICAL: Store completedDate when marked as completed
    if (isCompleted === true) {
      if (completedDate) {
        order.rows[index].completedDate = new Date(completedDate);
      } else {
        order.rows[index].completedDate = new Date();
      }
      console.log('✅ Setting completedDate:', order.rows[index].completedDate);
    } else if (isCompleted === false) {
      order.rows[index].completedDate = null;
    }
    
    // PRESERVE assigned executive - don't overwrite with empty string
    if (assignedExecutive !== undefined && assignedExecutive !== '') {
      order.rows[index].assignedExecutive = assignedExecutive;
    } else if (assignedExecutive === '' && currentRow.assignedExecutive) {
      // Keep existing assigned executive if new one is empty
      order.rows[index].assignedExecutive = currentRow.assignedExecutive;
    }
    
    if (lastUpdateTime !== undefined) {
      order.rows[index].lastUpdateTime = new Date(lastUpdateTime);
    }

    // Update timestamps
    order.rows[index].updatedAt = new Date();
    order.updatedAt = new Date();
    
    console.log('📋 AFTER UPDATE - Updated row:', {
      remark: order.rows[index].remark,
      isCompleted: order.rows[index].isCompleted,
      completedDate: order.rows[index].completedDate,
      assignedExecutive: order.rows[index].assignedExecutive
    });

    order.markModified('rows');
    await order.save();

    console.log('✅ SUCCESS: Row updated successfully');

    res.json({ 
      success: true,
      updatedRow: order.rows[index]
    });

  } catch (error) {
    console.error('❌ ERROR updating remark:', error);
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
});

module.exports = router;