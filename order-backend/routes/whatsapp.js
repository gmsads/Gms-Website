const express = require('express');
const router = express.Router();
const Order = require('../models/Order'); // Adjust path based on your project structure

// Update follow-up status
router.put('/:id/followup', async (req, res) => {
  try {
    const { id } = req.params;
    const { followUpStatus, whatsappContactedDate, lastFollowUpDate } = req.body;

    // Validate input
    if (!followUpStatus || !['pending', 'contacted'].includes(followUpStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid follow-up status. Must be "pending" or "contacted"' 
      });
    }

    // Find and update the order
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Update follow-up fields
    order.followUpStatus = followUpStatus;
    
    if (whatsappContactedDate) {
      order.whatsappContactedDate = whatsappContactedDate;
    }
    
    if (lastFollowUpDate) {
      order.lastFollowUpDate = lastFollowUpDate;
    }

    // Save the updated order
    const updatedOrder = await order.save();

    res.status(200).json({
      success: true,
      message: 'Follow-up status updated successfully',
      data: updatedOrder
    });

  } catch (error) {
    console.error('Error updating follow-up status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get orders with follow-up status - UPDATED WITH EXECUTIVE FILTER
router.get('/retail-orders', async (req, res) => {
  try {
    const { year, month, executive } = req.query;
    
    // Validate year and month
    if (!year || !month) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year and month parameters are required' 
      });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Build query conditions
    const queryConditions = [
      {
        $or: [
          { orderDate: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      },
      {
        $or: [
          { clientType: { $regex: /retail/i } },
          { clientType: { $exists: false } },
          { clientType: null },
          { 
            $expr: {
              $not: {
                $in: [
                  { $toLower: "$clientType" },
                  ["agent", "renewal", "renewal-agent"]
                ]
              }
            }
          }
        ]
      }
    ];

    // Add executive filter if provided
    if (executive && executive.trim() !== '') {
      const executiveName = decodeURIComponent(executive.trim());
      console.log(`Filtering by executive: "${executiveName}"`);
      
      queryConditions.push({
        $or: [
          { executive: { $regex: new RegExp(`^${executiveName}$`, 'i') } },
          { createdBy: { $regex: new RegExp(`^${executiveName}$`, 'i') } },
          { salesExecutive: { $regex: new RegExp(`^${executiveName}$`, 'i') } },
          { executiveName: { $regex: new RegExp(`^${executiveName}$`, 'i') } }
        ]
      });
    }

    // Query orders
    console.log('Query conditions:', JSON.stringify(queryConditions, null, 2));
    
    const orders = await Order.find({
      $and: queryConditions
    })
    .sort({ orderDate: -1, createdAt: -1 })
    .lean();

    console.log(`Found ${orders.length} orders after filtering`);

    // Log executive names for debugging
    if (executive) {
      const executiveNames = orders.map(o => ({
        orderNo: o.orderNo,
        executive: o.executive,
        createdBy: o.createdBy,
        match: o.executive && o.executive.toLowerCase().includes(executive.toLowerCase())
      }));
      console.log('Executive breakdown:', executiveNames);
    }

    // Process orders to add calculated fields
    const processedOrders = orders.map(order => {
      // Calculate total amount from rows if available
      let totalAmount = 0;
      if (order.rows && Array.isArray(order.rows) && order.rows.length > 0) {
        totalAmount = order.rows.reduce((sum, row) => {
          const rowAmount = row.total || row.amount || row.price || 0;
          return sum + (parseFloat(rowAmount) || 0);
        }, 0);
      }

      // If no rows total, check direct amount fields
      if (totalAmount === 0) {
        if (order.totalAmount !== undefined && order.totalAmount !== null) {
          totalAmount = parseFloat(order.totalAmount) || 0;
        } else if (order.amount !== undefined && order.amount !== null) {
          totalAmount = parseFloat(order.amount) || 0;
        } else if (order.finalAmount !== undefined && order.finalAmount !== null) {
          totalAmount = parseFloat(order.finalAmount) || 0;
        } else if (order.grandTotal !== undefined && order.grandTotal !== null) {
          totalAmount = parseFloat(order.grandTotal) || 0;
        } else if (order.total !== undefined && order.total !== null) {
          totalAmount = parseFloat(order.total) || 0;
        }
      }

      // Calculate balance
      let balance = 0;
      if (order.balance !== undefined && order.balance !== null) {
        balance = parseFloat(order.balance) || 0;
      } else if (totalAmount > 0 && order.paymentHistory && Array.isArray(order.paymentHistory)) {
        const totalPaid = order.paymentHistory.reduce((sum, payment) => {
          return sum + (parseFloat(payment.amount) || 0);
        }, 0);
        balance = totalAmount - totalPaid;
      } else if (order.advanceAmount !== undefined && order.advanceAmount !== null) {
        const advance = parseFloat(order.advanceAmount) || 0;
        balance = totalAmount - advance;
      }

      return {
        ...order,
        calculatedTotal: totalAmount,
        calculatedBalance: balance
      };
    });

    res.status(200).json({
      success: true,
      count: processedOrders.length,
      data: processedOrders,
      filteredBy: executive ? `Executive: ${executive}` : 'All orders'
    });

  } catch (error) {
    console.error('Error fetching retail orders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Batch update follow-up status - UPDATED WITH EXECUTIVE CHECK
router.put('/batch-followup', async (req, res) => {
  try {
    const { orderIds, followUpStatus, whatsappContactedDate, lastFollowUpDate, executiveName } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order IDs array is required' 
      });
    }

    if (!followUpStatus || !['pending', 'contacted'].includes(followUpStatus)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid follow-up status is required' 
      });
    }

    // If executiveName is provided, verify they own these orders
    if (executiveName) {
      const orders = await Order.find({ _id: { $in: orderIds } });
      
      const unauthorizedOrders = orders.filter(order => {
        const orderExecutive = order.executive || order.createdBy || '';
        return orderExecutive.toLowerCase() !== executiveName.toLowerCase();
      });

      if (unauthorizedOrders.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own orders',
          unauthorizedOrders: unauthorizedOrders.map(o => o.orderNo)
        });
      }
    }

    // Update multiple orders
    const updateResult = await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: {
          followUpStatus,
          ...(whatsappContactedDate && { whatsappContactedDate }),
          ...(lastFollowUpDate && { lastFollowUpDate }),
          updatedAt: new Date()
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} orders updated successfully`,
      modifiedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('Error in batch follow-up update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get follow-up statistics - UPDATED WITH EXECUTIVE FILTER
router.get('/stats', async (req, res) => {
  try {
    const { year, month, executive } = req.query;
    
    // Build match conditions
    let matchConditions = {};
    
    // Date filter
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      matchConditions = {
        $or: [
          { orderDate: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      };
    }
    
    // Retail filter
    matchConditions = {
      ...matchConditions,
      $or: [
        { clientType: { $regex: /retail/i } },
        { clientType: { $exists: false } },
        { clientType: null },
        { 
          $expr: {
            $not: {
              $in: [
                { $toLower: "$clientType" },
                ["agent", "renewal", "renewal-agent"]
              ]
            }
          }
        }
      ]
    };
    
    // Executive filter
    if (executive && executive.trim() !== '') {
      const executiveName = decodeURIComponent(executive.trim());
      matchConditions = {
        ...matchConditions,
        $or: [
          { executive: { $regex: new RegExp(`^${executiveName}$`, 'i') } },
          { createdBy: { $regex: new RegExp(`^${executiveName}$`, 'i') } },
          { salesExecutive: { $regex: new RegExp(`^${executiveName}$`, 'i') } }
        ]
      };
    }

    const stats = await Order.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$followUpStatus',
          count: { $sum: 1 },
          totalAmount: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $isArray: "$rows" },
                  { $gt: [{ $size: "$rows" }, 0] }
                ]},
                { $sum: "$rows.total" },
                0
              ]
            }
          },
          totalBalance: { $sum: { $ifNull: ['$balance', 0] } }
        }
      }
    ]);

    // Format the response
    const formattedStats = {
      pending: 0,
      contacted: 0,
      totalOrders: 0,
      totalAmount: 0,
      totalBalance: 0
    };

    stats.forEach(stat => {
      if (stat._id === 'pending') {
        formattedStats.pending = stat.count;
      } else if (stat._id === 'contacted') {
        formattedStats.contacted = stat.count;
      }
      formattedStats.totalAmount += stat.totalAmount || 0;
      formattedStats.totalBalance += stat.totalBalance || 0;
      formattedStats.totalOrders += stat.count;
    });

    // If no orders found, still return the structure
    if (formattedStats.totalOrders === 0) {
      return res.status(200).json({
        success: true,
        message: executive ? `No orders found for executive ${executive}` : 'No orders found',
        data: formattedStats
      });
    }

    res.status(200).json({
      success: true,
      data: formattedStats,
      filteredBy: executive ? `Executive: ${executive}` : 'All executives'
    });

  } catch (error) {
    console.error('Error fetching follow-up stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get executives with retail orders
router.get('/executives', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let matchConditions = {
      $or: [
        { clientType: { $regex: /retail/i } },
        { clientType: { $exists: false } },
        { clientType: null },
        { 
          $expr: {
            $not: {
              $in: [
                { $toLower: "$clientType" },
                ["agent", "renewal", "renewal-agent"]
              ]
            }
          }
        }
      ]
    };
    
    // Date filter if provided
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      matchConditions = {
        ...matchConditions,
        $or: [
          { orderDate: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      };
    }
    
    const executives = await Order.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$executive',
          count: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $eq: ['$followUpStatus', 'pending'] },
                1,
                0
              ]
            }
          },
          contacted: {
            $sum: {
              $cond: [
                { $eq: ['$followUpStatus', 'contacted'] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Filter out null/empty executives and format
    const formattedExecutives = executives
      .filter(exec => exec._id && exec._id.trim() !== '')
      .map(exec => ({
        name: exec._id,
        totalOrders: exec.count,
        pending: exec.pending,
        contacted: exec.contacted
      }));
    
    res.status(200).json({
      success: true,
      count: formattedExecutives.length,
      data: formattedExecutives
    });
    
  } catch (error) {
    console.error('Error fetching executives:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;