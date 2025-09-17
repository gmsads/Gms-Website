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

// ============================
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

    const newOrder = new Order({ ...req.body, orderNo: newOrderNo });

    await newOrder.save();

    res.json({ message: "Order saved successfully", order: newOrder });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ error: "Failed to save order" });
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
// GET all orders (with filtering)
// ============================
router.get("/orders", async (req, res) => {
  try {
    let query = {};

    // Filter by executive if specified
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

    const orders = await Order.find(query);
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
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
// GET orders with pending services and executive assignments
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
router.post("/orders/:id/record-payment", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Validate payment data
    if (!req.body.amount || isNaN(req.body.amount)) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const paymentAmount = parseFloat(req.body.amount);

    if (paymentAmount > order.balance) {
      return res.status(400).json({
        message: `Payment amount (${paymentAmount}) exceeds remaining balance (${order.balance})`,
      });
    }

    // Create payment record
    const paymentRecord = {
      date: req.body.date || new Date(),
      amount: paymentAmount,
      method: req.body.method || "Cash",
      reference: req.body.reference || "",
      note: req.body.note || "",
    };

    // Add to payment history
    order.paymentHistory = order.paymentHistory || [];
    order.paymentHistory.push(paymentRecord);

    // Update balance
    order.balance = parseFloat((order.balance - paymentAmount).toFixed(2));

    // Update status
    order.status = order.balance <= 0 ? "Paid" : "Partially Paid";
    if (order.balance <= 0) {
      order.paymentDate = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: "Payment recorded successfully",
      order,
    });
  } catch (err) {
    console.error("Payment error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
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

// In your backend route
router.put('/orders/:orderId/rows/:rowIndex/status', async (req, res) => {
  try {
    const { orderId, rowIndex } = req.params;
    const { isCompleted, status, updatedBy } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (rowIndex >= order.rows.length) {
      return res.status(400).json({ error: 'Invalid row index' });
    }

    // Update both fields
    order.rows[rowIndex].isCompleted = isCompleted;
    order.rows[rowIndex].status = status;
    order.rows[rowIndex].updatedAt = new Date();
    order.rows[rowIndex].updatedBy = updatedBy;

    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});
module.exports = router;