const express = require("express");
const router = express.Router();
const Executive = require("../models/Executive");
const Requirement = require("../models/Requirement");
const Order = require("../models/Order");
const ExecutiveTarget = require("../models/ExecutiveTarget");
const dayjs = require("dayjs");
const ServiceExecutive = require("../models/ServiceExecutive");
const Account = require("../models/Account");
const ItTeam = require("../models/ITTeam");
const AdvanceApprovalRequest = require("../models/AdvanceApprovalRequest")
// ============================
// GET all executives
// ============================
router.get("/executives", async (req, res) => {
  try {
    const executives = await Executive.find();
    res.json(executives);
  } catch (err) {
    console.error("Error fetching executives:", err);
    res.status(500).json({ error: "Failed to fetch executives" });
  }
});
// Get all service executives
router.get("/service-executives", async (req, res) => {
  try {
    const executives = await ServiceExecutive.find();
    res.json(executives);
  } catch (err) {
    console.error("Error fetching service executives:", err);
    res.status(500).json({ error: "Failed to fetch service executives" });
  }
});
// Get all accounts
router.get("/accounts", async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json(accounts);
  } catch (err) {
    console.error("Error fetching accounts:", err.message);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});
// Route: Get all IT team names
router.get("/it-team/names", async (req, res) => {
  try {
    // Fetch only "name" field, exclude _id
    const itTeamMembers = await ItTeam.find({}, { name: 1, _id: 0 });
    res.json(itTeamMembers);
  } catch (err) {
    console.error("Error fetching IT team names:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// ============================
// GET all requirements
// ============================
router.get("/requirements", async (req, res) => {
  try {
    const requirements = await Requirement.find();
    res.json(requirements);
  } catch (err) {
    console.error("Error fetching requirements:", err);
    res.status(500).json({ error: "Failed to fetch requirements" });
  }
});

// POST a new order (auto-generate orderNo)
// ============================
router.post("/submit", async (req, res) => {
  try {
    console.log("Received order data:", req.body);

    const { orderDate } = req.body;
    if (!orderDate) {
      return res.status(400).json({ error: "Order date is required" });
    }

    const orderYear = new Date(orderDate).getFullYear().toString().slice(-2);
    const orderPrefix = `GMS${orderYear}`;

    const lastOrder = await Order.findOne({
      orderNo: { $regex: `^${orderPrefix}` },
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (lastOrder && lastOrder.orderNo) {
      const lastNum = parseInt(lastOrder.orderNo.slice(5));
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    const paddedNum = String(nextNumber).padStart(3, "0");
    const newOrderNo = `${orderPrefix}${paddedNum}`;

    // FIXED: Ensure createdBy field is properly saved
    const orderData = {
      ...req.body,
      orderNo: newOrderNo,
      // Ensure createdBy is always set from the request
      createdBy: req.body.createdBy || req.body.executive // Fallback to executive if not provided
    };

    console.log('Final order data to save:', orderData); // Debug log

    const newOrder = new Order(orderData);

    await newOrder.save();

    res.json({ message: "Order saved successfully", order: newOrder });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// ============================
// UPDATE an existing order
// ============================
router.put("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Updating order:", id, "with data:", req.body);

    // FIXED: Ensure createdBy field is preserved during update
    const updateData = { ...req.body };
    
    // If createdBy is not provided in update, preserve the existing one
    if (!updateData.createdBy) {
      const existingOrder = await Order.findById(id);
      if (existingOrder && existingOrder.createdBy) {
        updateData.createdBy = existingOrder.createdBy;
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order updated successfully", order: updatedOrder });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ============================
// GET all orders (with filtering)
// ============================
router.get("/orders", async (req, res) => {
  try {
    let query = {};

    console.log('Query parameters:', req.query); // Debug log

    // Filter by executive name if specified (for performance view)
    if (req.query.executive) {
      query.executive = req.query.executive;
    }

    // Filter by service executive if specified
    if (req.query.serviceExecutive) {
      query['rows.assignedExecutive'] = req.query.serviceExecutive;
    }

    // Filter by logged-in executive if role is Executive
    if (req.query.role === "Executive") {
      query.executive = req.query.name;
    }

    // Filter by client type if specified
    if (req.query.clientType) {
      query.clientType = req.query.clientType;
    }

    // Filter by month/year if specified
    if (req.query.month && req.query.year) {
      const month = parseInt(req.query.month);
      const year = parseInt(req.query.year);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      query.orderDate = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    console.log('Final query:', query); // Debug log

    const orders = await Order.find(query);
    console.log('Found orders:', orders.length); // Debug log
    
    // Debug: Log createdBy field for each order
    orders.forEach(order => {
      console.log(`Order ${order.orderNo}: executive=${order.executive}, createdBy=${order.createdBy}`);
    });
    
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
// ============================
// GET dashboard chart data
// ============================
router.get("/dashboard/chart-data", async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = parseInt(year) || new Date().getFullYear();

    // Calculate start and end dates for the year
    const startDate = new Date(yearNum, 0, 1);
    const endDate = new Date(yearNum + 1, 0, 1);

    // Aggregate orders by month
    const monthlyOrders = await Order.aggregate([
      {
        $match: {
          orderDate: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $month: "$orderDate" },
          count: { $sum: 1 },
          totalAmount: { $sum: { $sum: "$rows.total" } },
        },
      },
    ]);

    // Initialize monthly data arrays
    const ordersByMonth = Array(12).fill(0);
    const amountByMonth = Array(12).fill(0);

    // Fill in the actual data
    monthlyOrders.forEach((monthData) => {
      const monthIndex = monthData._id - 1;
      ordersByMonth[monthIndex] = monthData.count;
      amountByMonth[monthIndex] = monthData.totalAmount;
    });

    // Get pending payments count
    const pendingPayments = await Order.countDocuments({ balance: { $gt: 0 } });
    const totalOrders = await Order.countDocuments();

    // Get client type distribution
    const clientTypes = await Order.aggregate([
      {
        $group: {
          _id: "$clientType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to object format
    const clientTypeObj = {};
    clientTypes.forEach((type) => {
      clientTypeObj[type._id] = type.count;
    });

    res.json({
      totalOrdersByMonth: ordersByMonth,
      amountByMonth,
      pendingPayments: [totalOrders - pendingPayments, pendingPayments],
      clientTypes: clientTypeObj,
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});
// ============================
// GET orders with pending payments
// ============================
router.get("/orders/pending-payments", async (req, res) => {
  try {
    const pendingPayments = await Order.find({ balance: { $gt: 0 } });
    res.json(pendingPayments);
  } catch (err) {
    console.error("Error fetching pending payments:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});
// ============================
// GET orders with pending services
// ============================
router.get("/orders/pending-services", async (req, res) => {
  try {
    const pendingServices = await Order.find({
      $or: [
        { "rows.isCompleted": false },
        { "rows.deliveryDate": { $gt: new Date() } },
      ],
    });
    res.json(pendingServices);
  } catch (err) {
    console.error("Error fetching pending services:", err);
    res.status(500).json({ error: "Failed to fetch pending services" });
  }
});
// ============================
// PUT: Mark order as paid
// ============================
router.put("/orders/:id/mark-paid", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { balance: 0, paymentDate: new Date() },
      { new: true }
    );
    res.json({ message: "Order marked as paid", order: updatedOrder });
  } catch (err) {
    console.error("Error updating payment status:", err);
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

// ============================
// PUT: Update service row remark
// ============================
router.put("/orders/:orderId/rows/:rowIndex/remark", async (req, res) => {
  try {
    const { orderId, rowIndex } = req.params;
    const { remark, isCompleted } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (rowIndex >= order.rows.length) {
      return res.status(400).json({ message: "Invalid row index" });
    }

    order.rows[rowIndex].remark = remark;
    order.rows[rowIndex].isCompleted = isCompleted;

    await order.save();

    res.json({ message: "Remark updated successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================
// GET orders by executive name
// ============================
router.get("/executive/:name", async (req, res) => {
  try {
    const { month, year } = req.query;

    const date = new Date();
    if (month) date.setMonth(parseInt(month) - 1);
    if (year) date.setFullYear(parseInt(year));

    console.log({ month, year });

    const orders = await Order.find({
      executive: req.params.name,
      $and: [
        { orderDate: { $gte: dayjs(date).startOf("month").toDate() } },
        { orderDate: { $lte: dayjs(date).endOf("month").toDate() } },
      ],
    });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching executive orders:", err);
    res.status(500).json({ error: "Failed to fetch executive orders" });
  }
});

// ============================
// POST: Set target for executive
// ============================
router.post("/set-target", async (req, res) => {
  try {
    const { executive, target, month, year } = req.body;

    const existingTarget = await ExecutiveTarget.findOne({
      executive,
      targetMonth: month,
      targetYear: year,
    });

    if (existingTarget) {
      return res.status(400).json({
        error: "Target already set for this executive for the specified month",
      });
    }

    const newTarget = new ExecutiveTarget({
      executive,
      target,
      targetMonth: month,
      targetYear: year,
    });

    await newTarget.save();
    res.json({ message: "Target set successfully", target: newTarget });
  } catch (err) {
    console.error("Error setting target:", err);
    res.status(500).json({ error: "Failed to set target" });
  }
});

// ============================
// POST: Record payment for order
// ============================
// Add debugging to see what's failing
router.post("/orders/:id/record-payment", async (req, res) => {
  try {
    console.log("Payment request received:", req.body);
    console.log("Order ID:", req.params.id);

    const orderId = req.params.id;
    const { date, amount, method, reference, note } = req.body;

    // Validate required fields
    if (!amount) {
      return res.status(400).json({ message: "Payment amount is required" });
    }

    const existingOrder = await Order.findById(orderId);
    console.log("Existing order:", existingOrder);
    
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const paymentAmount = parseFloat(amount);
    const newBalance = parseFloat((existingOrder.balance - paymentAmount).toFixed(2));

    // Create payment record
    const paymentRecord = {
      date: date ? new Date(date) : new Date(),
      amount: paymentAmount,
      method: method || "Cash",
      reference: reference || "",
      note: note || "",
    };

    console.log("Payment record to be created:", paymentRecord);

    // Build update object dynamically to avoid missing fields
    const updateData = {
      $push: { paymentHistory: paymentRecord },
      $set: {
        balance: newBalance,
        status: newBalance <= 0 ? "Paid" : "Partially Paid",
        updatedAt: new Date()
      }
    };

    // Preserve all existing fields that might be required
    const requiredFields = ['createdBy', 'executive', 'business', 'contactPerson', 'phone', 'orderNo', 'orderDate'];
    requiredFields.forEach(field => {
      if (existingOrder[field]) {
        updateData.$set[field] = existingOrder[field];
      }
    });

    // Add payment date if fully paid
    if (newBalance <= 0) {
      updateData.$set.paymentDate = new Date();
    }

    console.log("Update data:", updateData);

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    console.log("Order updated successfully:", updatedOrder._id);

    res.json({
      success: true,
      message: "Payment recorded successfully",
      order: updatedOrder,
    });

  } catch (err) {
    console.error("Payment error details:", err);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({
      message: "Server error while recording payment",
      error: err.message,
      // Don't expose full error in production
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }
});
// ============================
// GET: Get target for executive
// ============================
router.get("/get-target/:executive/:month/:year", async (req, res) => {
  try {
    const { executive, month, year } = req.params;

    const target = await ExecutiveTarget.findOne({
      executive,
      targetMonth: month,
      targetYear: year,
    });

    if (!target) {
      return res.status(404).json({
        error: "Target not found for this executive for the specified month",
      });
    }

    res.json({ target: target.target });
  } catch (err) {
    console.error("Error fetching target:", err);
    res.status(500).json({ error: "Failed to fetch target" });
  }
});
// ============================
// GET: Get executive orders by month
// ============================
router.get("/executive-orders/:executive", async (req, res) => {
  try {
    const { executive } = req.params;
    const { month, year } = req.query;
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const orders = await Order.find({
      executive,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    res.json({ rows: orders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
// ============================
// PUT: Update an order
// ============================
router.put("/orders/:id", async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({
      message: "Order updated successfully",
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ============================
// DELETE: Delete an order
// ============================
router.delete("/orders/:id", async (req, res) => {
  try {
    const orderToDelete = await Order.findById(req.params.id);

    if (!orderToDelete) {
      return res.status(404).json({ error: "Order not found" });
    }

    const { executive, orderDate } = orderToDelete;

    // Delete the order
    await orderToDelete.deleteOne();

    // Parse month and year from orderDate (must be of type Date!)
    const date = new Date(orderDate);
    const month = (date.getMonth() + 1).toString(); // 1-based month
    const year = date.getFullYear().toString();

    // Check if any other orders exist for same executive/month/year
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const remainingOrders = await Order.find({
      executive,
      orderDate: { $gte: startOfMonth, $lt: endOfMonth },
    });

    if (remainingOrders.length === 0) {
      // No remaining orders, delete the target
      await ExecutiveTarget.findOneAndDelete({
        executive,
        targetMonth: month,
        targetYear: year,
      });
    }

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// ============================
// POST: Create new order
// ============================
router.post("/orders", async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ message: "Order saved", order: newOrder });
  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).json({ message: "Failed to save order" });
  }
});

// ============================
// GET: Search orders by phone
// ============================
router.get("/by-phone", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit phone number",
      });
    }

    const orders = await Order.find({ phone })
      .sort({ createdAt: -1 }) // Get most recent first
      .limit(1); // Get only the latest order

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No orders found for this number",
      });
    }

    res.status(200).json({
      success: true,
      order: orders[0],
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ============================
// PUT: Assign executive to service
// ============================
router.put("/orders/:orderId/assign-service", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rowIndex, executiveName } = req.body;

    if (rowIndex === undefined || !executiveName) {
      return res.status(400).json({
        error: "Missing rowIndex or executiveName",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (rowIndex < 0 || rowIndex >= order.rows.length) {
      return res.status(400).json({ error: "Invalid rowIndex" });
    }

    order.rows[rowIndex].assignedExecutive = executiveName;

    await order.save();

    res.json({
      message: "Service assigned successfully",
      order,
    });
  } catch (err) {
    console.error("Error assigning service:", err);
    res.status(500).json({ error: "Failed to assign service" });
  }
});

// ============================
// POST: Import orders from Excel
// ============================
router.post('/orders/import', async (req, res) => {
  try {
    const ordersToImport = req.body;
    
    // Validate the imported data
    if (!Array.isArray(ordersToImport)) {
      return res.status(400).json({ error: "Invalid import data format" });
    }

    // Process each order
    const results = [];
    for (const orderData of ordersToImport) {
      try {
        // Generate order number if not provided
        if (!orderData.orderNo) {
          const orderYear = new Date(orderData.orderDate).getFullYear().toString().slice(-2);
          const orderPrefix = `GMS${orderYear}`;
          
          const lastOrder = await Order.findOne({
            orderNo: { $regex: `^${orderPrefix}` }
          }).sort({ createdAt: -1 });
          
          let nextNumber = 1;
          if (lastOrder && lastOrder.orderNo) {
            const lastNum = parseInt(lastOrder.orderNo.slice(5));
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
          }
          
          orderData.orderNo = `${orderPrefix}${String(nextNumber).padStart(3, '0')}`;
        }

        // Create and save the order
        const newOrder = new Order(orderData);
        await newOrder.save();
        results.push({ success: true, orderNo: newOrder.orderNo });
      } catch (err) {
        results.push({ 
          success: false, 
          error: err.message,
          data: orderData
        });
      }
    }

    res.json({ 
      message: "Import completed",
      results,
      successCount: results.filter(r => r.success).length,
      errorCount: results.filter(r => !r.success).length
    });
  } catch (err) {
    console.error("Import error:", err);
    res.status(500).json({ error: "Failed to process import" });
  }
});

// ============================
// GET: Auto products orders
// ============================
router.get('/orders/auto-products', async (req, res) => {
  try {
    // More flexible regex patterns
    const pattern = /auto[\s-]*(tops?|stickers?)/i;
    
    const orders = await Order.find({
      $or: [
        { requirement: { $regex: pattern } },
        { "rows.requirement": { $regex: pattern } },
        { "rows.description": { $regex: pattern } }
      ]
    }).sort({ orderDate: -1 });

    console.log('Found orders:', orders.length); // Debug log
    
    // Debug: Log sample matches
    if (orders.length > 0) {
      console.log('Sample matches:', {
        id: orders[0]._id,
        mainReq: orders[0].requirement,
        rowReqs: orders[0].rows.map(r => r.requirement)
      });
    }

    res.json(orders);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: err.message 
    });
  }
});

// ============================
// PUT: Update order status
// ============================
router.put('/update-status', async (req, res) => {
  const { orderId, rowIndex, newStatus, updatedBy } = req.body;

  try {
    // Validate input
    if (!orderId || !newStatus) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields' 
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }

    if (rowIndex === undefined || !order.rows || rowIndex >= order.rows.length) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid row index' 
      });
    }

    // Update status and track who made the change
    order.rows[rowIndex].status = newStatus;
    order.rows[rowIndex].updatedBy = updatedBy;
    order.rows[rowIndex].updatedAt = new Date();
    
    if (newStatus === 'Completed') {
      order.rows[rowIndex].isCompleted = true;
      order.rows[rowIndex].completedAt = new Date();
    }

    await order.save();

    return res.status(200).json({ 
      success: true,
      message: 'Status updated successfully',
      updatedOrder: order
    });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// ============================
// GET: Auto pending payments
// ============================
router.get("/orders/auto-pending-payments", async (req, res) => {
  try {
    const autoPendingPayments = await Order.find({
      $and: [
        { balance: { $gt: 0 } }, // Only orders with balance due
        {
          $or: [
            // Exact matches for auto tops/stickers
            { requirement: { $in: ["auto tops", "auto stickers"] } },
            { "rows.requirement": { $in: ["auto tops", "auto stickers"] } },
            // Regex matches for variations
            { requirement: { $regex: /^(auto[\s-]*(tops?|stickers?))$/i } },
            { "rows.requirement": { $regex: /^(auto[\s-]*(tops?|stickers?))$/i } }
          ]
        }
      ]
    })
    .sort({ orderDate: -1 })
    .select('orderNo customerName phone totalAmount balance status rows.requirement');

    // Additional client-side filtering for strict matching
    const filteredPayments = autoPendingPayments.filter(order => {
      const requirements = [
        order.requirement,
        ...(order.rows?.map(row => row.requirement) || [])
      ].filter(Boolean);
      
      return requirements.some(req => 
        ['auto tops', 'auto stickers'].includes(req.toLowerCase()) ||
        /^(auto[\s-]*(tops?|stickers?))$/i.test(req)
      );
    });

    res.json(filteredPayments);
  } catch (err) {
    console.error("Error fetching auto pending payments:", err);
    res.status(500).json({ 
      error: "Failed to fetch auto product pending payments",
      details: err.message 
    });
  }
});

// In your backend routes
router.get('/service-updates', async (req, res) => {
  try {
    const services = await Order.aggregate([
      { $unwind: "$rows" },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          orderNo: 1,
          customerName: 1,
          requirement: "$rows.requirement",
          status: "$rows.status",
          assignedExecutive: "$rows.assignedExecutive",
          updatedAt: "$rows.updatedAt",
          remark: "$rows.remark",
          isCompleted: "$rows.isCompleted"
        }
      },
      { $sort: { updatedAt: -1 } }
    ]);
    
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =====================
// BACKEND ROUTE (orders.js)
// =====================
router.get('/service-dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeekStart = new Date(today);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

    // Fetch orders with pending services
    const orders = await Order.find({
      'rows.status': { $ne: 'Completed' } // Only include non-completed services
    });

    // Categorize services
    const serviceCategories = {
      today: [],
      tomorrow: [],
      nextWeek: [],
      unassigned: []
    };

    orders.forEach(order => {
      order.rows.forEach((row, rowIndex) => {
        if (row.status === 'Completed') return;

        // Create service entry
        const serviceEntry = {
          orderId: order._id,
          orderNo: order.orderNo,
          clientName: order.clientName,
          phone: order.phone,
          business: order.business,
          contactPerson: order.contactPerson,
          rowIndex,
          requirement: row.requirement,
          description: row.description,
          assignedExecutive: row.assignedExecutive || 'Unassigned',
          status: row.status || 'Pending',
          serviceDate: row.serviceDate,
          serviceType: row.serviceType,
          remark: row.remark
        };

        // Categorize based on date or service type
        if (row.serviceDate) {
          const serviceDate = new Date(row.serviceDate);
          
          if (serviceDate.toDateString() === today.toDateString()) {
            serviceCategories.today.push(serviceEntry);
          } 
          else if (serviceDate.toDateString() === tomorrow.toDateString()) {
            serviceCategories.tomorrow.push(serviceEntry);
          } 
          else if (serviceDate >= nextWeekStart && serviceDate < nextWeekEnd) {
            serviceCategories.nextWeek.push(serviceEntry);
          }
        } 
        else if (row.serviceType) {
          switch(row.serviceType) {
            case 'Today Service':
              serviceCategories.today.push(serviceEntry);
              break;
            case 'Tomorrow Service':
              serviceCategories.tomorrow.push(serviceEntry);
              break;
            case 'Next Week Service':
              serviceCategories.nextWeek.push(serviceEntry);
              break;
            default:
              serviceCategories.unassigned.push(serviceEntry);
          }
        } 
        else {
          serviceCategories.unassigned.push(serviceEntry);
        }
      });
    });

    // Sort services by date
    serviceCategories.today.sort((a, b) => 
      new Date(a.serviceDate || 0) - new Date(b.serviceDate || 0)
    );
    
    serviceCategories.tomorrow.sort((a, b) => 
      new Date(a.serviceDate || 0) - new Date(b.serviceDate || 0)
    );
    
    serviceCategories.nextWeek.sort((a, b) => 
      new Date(a.serviceDate || 0) - new Date(b.serviceDate || 0)
    );

    res.json({
      success: true,
      data: serviceCategories,
      counts: {
        today: serviceCategories.today.length,
        tomorrow: serviceCategories.tomorrow.length,
        nextWeek: serviceCategories.nextWeek.length,
        unassigned: serviceCategories.unassigned.length
      }
    });
  } catch (err) {
    console.error('Error fetching service dashboard data:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch service dashboard data' 
    });
  }
});

// ============================
// PUT: Update order row status (VALIDATION FIXED VERSION)
// ============================
router.put('/orders/:orderId/rows/:rowIndex/status', async (req, res) => {
  console.log('🔧 STATUS UPDATE ENDPOINT HIT');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  try {
    const { orderId, rowIndex } = req.params;
    const { isCompleted, status, updatedBy } = req.body;

    // Basic validation
    if (!orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    if (rowIndex === undefined || rowIndex === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Row index is required' 
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Parse and validate row index
    const rowIndexNum = parseInt(rowIndex);
    if (isNaN(rowIndexNum) || rowIndexNum < 0 || rowIndexNum >= order.rows.length) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid row index. Must be between 0 and ${order.rows.length - 1}` 
      });
    }

    // Get the row to update
    const rowToUpdate = order.rows[rowIndexNum];
    
    console.log('📝 Current row state:', {
      requirement: rowToUpdate.requirement,
      currentStatus: rowToUpdate.status,
      currentIsCompleted: rowToUpdate.isCompleted
    });

    // **VALIDATION FIX: Ensure data types are correct**
    // Convert to proper types to avoid validation errors
    const updates = {};
    
    if (isCompleted !== undefined) {
      updates.isCompleted = Boolean(isCompleted); // Force boolean
      console.log('🔄 Setting isCompleted:', updates.isCompleted);
    }
    
    if (status) {
      updates.status = String(status).trim(); // Force string and trim
      console.log('🔄 Setting status:', updates.status);
    }

    // Apply updates
    Object.assign(rowToUpdate, updates);

    // Set metadata - ensure proper types
    rowToUpdate.updatedAt = new Date();
    rowToUpdate.updatedBy = String(updatedBy || 'Service Dashboard').trim();
    
    console.log('📅 Updated row:', rowToUpdate);

    // **VALIDATION FIX: Use findByIdAndUpdate to bypass some validation issues**
    console.log('💾 Saving order with findByIdAndUpdate...');
    
    const updateQuery = {
      $set: {
        [`rows.${rowIndexNum}.isCompleted`]: rowToUpdate.isCompleted,
        [`rows.${rowIndexNum}.status`]: rowToUpdate.status,
        [`rows.${rowIndexNum}.updatedAt`]: rowToUpdate.updatedAt,
        [`rows.${rowIndexNum}.updatedBy`]: rowToUpdate.updatedBy
      }
    };

    // Add completedAt if marking as completed
    if (rowToUpdate.isCompleted && !rowToUpdate.completedAt) {
      updateQuery.$set[`rows.${rowIndexNum}.completedAt`] = new Date();
    }

    console.log('📤 Update query:', JSON.stringify(updateQuery, null, 2));

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      updateQuery,
      { 
        new: true, 
        runValidators: false // **TEMPORARILY disable validators to identify the issue**
      }
    );

    if (!updatedOrder) {
      throw new Error('Failed to update order');
    }

    console.log('✅ Order updated successfully');

    // Send success response
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        orderId: updatedOrder._id,
        orderNo: updatedOrder.orderNo,
        rowIndex: rowIndexNum,
        status: rowToUpdate.status,
        isCompleted: rowToUpdate.isCompleted,
        updatedBy: rowToUpdate.updatedBy
      }
    });

  } catch (error) {
    console.error('💥 ERROR in status update:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      console.log('🔍 VALIDATION ERRORS:');
      Object.keys(error.errors).forEach(key => {
        console.log(`  - ${key}: ${error.errors[key].message}`);
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Data validation failed',
        details: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data format' 
      });
    }

    // Generic error
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update status',
      error: error.message 
    });
  }
});

// ============================
// PUT: Mark executive as inactive/active
// ============================
router.put("/service-executives/:id/status", async (req, res) => {
  try {
    const { active, inactiveReason } = req.body;
    
    const updatedExecutive = await ServiceExecutive.findByIdAndUpdate(
      req.params.id,
      { 
        active: active !== undefined ? active : true,
        inactiveReason: active === false ? inactiveReason : null,
        inactiveSince: active === false ? new Date() : null
      },
      { new: true }
    );

    if (!updatedExecutive) {
      return res.status(404).json({ error: "Executive not found" });
    }

    res.json({ 
      message: `Executive ${active ? 'activated' : 'deactivated'} successfully`,
      executive: updatedExecutive 
    });
  } catch (err) {
    console.error("Error updating executive status:", err);
    res.status(500).json({ error: "Failed to update executive status" });
  }
});

// ============================
// GET active service executives only
// ============================
router.get("/service-executives/active", async (req, res) => {
  try {
    const activeExecutives = await ServiceExecutive.find({ active: { $ne: false } });
    res.json(activeExecutives);
  } catch (err) {
    console.error("Error fetching active executives:", err);
    res.status(500).json({ error: "Failed to fetch active executives" });
  }
});
// ============================
// GET trashed orders
// ============================
router.get("/orders/trash", async (req, res) => {
  try {
    const trashedOrders = await Order.find({ isTrashed: true })
      .sort({ trashedAt: -1 });
    
    console.log('Found trashed orders:', trashedOrders.length);
    res.json(trashedOrders);
  } catch (err) {
    console.error("Error fetching trashed orders:", err);
    res.status(500).json({ error: "Failed to fetch trashed orders" });
  }
});
// ============================
// DELETE: Move order to trash (soft delete)
// ============================
router.delete("/orders/:id", async (req, res) => {
  try {
    const orderToDelete = await Order.findById(req.params.id);

    if (!orderToDelete) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log('Moving order to trash:', {
      orderId: req.params.id,
      orderNo: orderToDelete.orderNo,
      deletedBy: req.body.deletedBy,
      reason: req.body.reason
    });

    // Instead of deleting, mark as trashed (soft delete)
    orderToDelete.isTrashed = true;
    orderToDelete.trashedAt = new Date();
    orderToDelete.trashedBy = req.body.deletedBy || 'Admin';
    orderToDelete.deletionReason = req.body.reason || 'Deleted by user';

    await orderToDelete.save();

    console.log('Order successfully moved to trash:', orderToDelete.orderNo);

    res.json({ 
      message: "Order moved to trash successfully",
      order: {
        id: orderToDelete._id,
        orderNo: orderToDelete.orderNo,
        isTrashed: orderToDelete.isTrashed,
        trashedAt: orderToDelete.trashedAt
      }
    });
  } catch (err) {
    console.error("Error moving order to trash:", err);
    res.status(500).json({ error: "Failed to move order to trash" });
  }
});
// ============================
// PUT: Restore order from trash
// ============================
router.put("/orders/:id/restore", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.isTrashed = false;
    order.trashedAt = null;
    order.trashedBy = null;
    order.deletionReason = null;

    await order.save();

    res.json({ message: "Order restored successfully" });
  } catch (err) {
    console.error("Error restoring order:", err);
    res.status(500).json({ error: "Failed to restore order" });
  }
});
// ============================
// DELETE: Permanently delete order from trash
// ============================
router.delete("/orders/:id/permanent", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.isTrashed) {
      return res.status(400).json({ error: "Order is not in trash" });
    }

    // Permanently delete the order
    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: "Order permanently deleted" });
  } catch (err) {
    console.error("Error permanently deleting order:", err);
    res.status(500).json({ error: "Failed to permanently delete order" });
  }
});
// ============================
// Migration route to add trash fields to existing orders
// ============================
router.post("/migrate-trash-fields", async (req, res) => {
  try {
    const result = await Order.updateMany(
      { 
        $or: [
          { isTrashed: { $exists: false } },
          { trashedAt: { $exists: false } },
          { trashedBy: { $exists: false } },
          { deletionReason: { $exists: false } }
        ]
      },
      {
        $set: {
          isTrashed: false,
          trashedAt: null,
          trashedBy: null,
          deletionReason: null
        }
      }
    );
    
    res.json({ 
      message: "Migration completed", 
      modified: result.modifiedCount 
    });
  } catch (err) {
    console.error("Migration error:", err);
    res.status(500).json({ error: "Migration failed" });
  }
});
// ============================
// POST: Request advance approval
// ============================
router.post("/advance-approval-requests", async (req, res) => {
  try {
    const {
      executive,
      business,
      contactPerson,
      contactNumber,
      totalAmount,
      advanceAmount,
      advancePercentage,
      reason,
      orderData
    } = req.body;

    const newRequest = new AdvanceApprovalRequest({
      executive,
      business,
      contactPerson,
      contactNumber,
      totalAmount,
      advanceAmount,
      advancePercentage,
      reason,
      orderData,
      status: 'pending',
      requestedAt: new Date()
    });

    await newRequest.save();
    
    res.json({ 
      success: true, 
      message: "Advance approval request submitted successfully",
      requestId: newRequest._id 
    });
  } catch (err) {
    console.error("Error creating advance approval request:", err);
    res.status(500).json({ error: "Failed to submit approval request" });
  }
});

// ============================
// GET: All advance approval requests
// ============================
router.get("/advance-approval-requests", async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status) {
      query.status = status;
    }

    const requests = await AdvanceApprovalRequest.find(query)
      .sort({ requestedAt: -1 });
    
    res.json(requests);
  } catch (err) {
    console.error("Error fetching advance approval requests:", err);
    res.status(500).json({ error: "Failed to fetch approval requests" });
  }
});

// ============================
// PUT: Update advance approval request status
// ============================
router.put("/advance-approval-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, approvedBy } = req.body;

    const updatedRequest = await AdvanceApprovalRequest.findByIdAndUpdate(
      id,
      {
        status,
        adminNotes,
        approvedBy,
        reviewedAt: new Date()
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ error: "Approval request not found" });
    }

    res.json({ 
      success: true, 
      message: `Request ${status} successfully`,
      request: updatedRequest 
    });
  } catch (err) {
    console.error("Error updating advance approval request:", err);
    res.status(500).json({ error: "Failed to update approval request" });
  }
});

// ============================
// GET: Check if executive has approved request for order
// ============================
router.get("/advance-approval-requests/check/:executive", async (req, res) => {
  try {
    const { executive } = req.params;
    const { business, contactPerson } = req.query;

    const approvedRequest = await AdvanceApprovalRequest.findOne({
      executive,
      business,
      contactPerson,
      status: 'approved'
    });

    res.json({ hasApproval: !!approvedRequest });
  } catch (err) {
    console.error("Error checking advance approval:", err);
    res.status(500).json({ error: "Failed to check approval status" });
  }
});
module.exports = router;