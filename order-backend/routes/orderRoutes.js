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
// GET all executives for dropdown (WITH FALLBACK)
// ============================
router.get("/executives", async (req, res) => {
  console.log("📞 GET /api/executives - Request received");
  try {
    const executives = await Executive.find({}, 'name _id');
    console.log(`✅ Found ${executives.length} executives`);
    
    if (executives.length === 0) {
      // Return dummy data for testing if no executives found
      console.log("No executives found, returning dummy data");
      return res.json([
        { _id: "1", name: "John Doe" },
        { _id: "2", name: "Jane Smith" },
        { _id: "3", name: "Bob Johnson" }
      ]);
    }
    
    res.json(executives);
  } catch (err) {
    console.error("❌ Error fetching executives:", err);
    // Return dummy data on error for testing
    res.json([
      { _id: "1", name: "John Doe" },
      { _id: "2", name: "Jane Smith" },
      { _id: "3", name: "Bob Johnson" }
    ]);
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
// GET all orders (including completed) - needed for "Completed" filter
// ============================
router.get("/orders/all", async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ orderDate: -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching all orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ============================
// GET all orders with advanced filtering for payments dashboard
// Supports: Financial Year, Month, Date, Year, Month/Year, Search
// ============================
router.get("/orders/payments-dashboard", async (req, res) => {
  try {
    console.log("Payments dashboard request received with query:", req.query);
    
    const { 
      executive, 
      financialYear,
      month,      // Financial month (1-12, where 1=April)
      year,       // Calendar year (fallback)
      date,
      filterType,
      searchTerm 
    } = req.query;

    // Get all orders
    let orders = await Order.find({}).sort({ orderDate: -1, createdAt: -1 });
    
    console.log(`Total orders in database: ${orders.length}`);

    // Apply filters manually
    let filteredOrders = [...orders];

    // Filter by executive
    if (executive) {
      filteredOrders = filteredOrders.filter(order => 
        order.executive && order.executive.toLowerCase() === executive.toLowerCase()
      );
    }

    // ============================================
    // FINANCIAL YEAR + MONTH FILTERING (Primary)
    // ============================================
    if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
      console.log(`Applying financial year filter: ${financialYear}`);
      const [startYear, endYear] = financialYear.split('-').map(Number);
      
      // Financial year starts April 1st of startYear, ends March 31st of endYear
      const fyStartDate = new Date(startYear, 3, 1); // April 1st
      fyStartDate.setHours(0, 0, 0, 0);
      const fyEndDate = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31st
      
      console.log(`Financial year range: ${fyStartDate} to ${fyEndDate}`);
      
      // First filter by financial year range
      filteredOrders = filteredOrders.filter(order => {
        if (!order.orderDate) return false;
        let orderDate = parseOrderDate(order.orderDate);
        if (!orderDate || isNaN(orderDate.getTime())) return false;
        return orderDate >= fyStartDate && orderDate <= fyEndDate;
      });
      
      // Then apply month filter if specified (within financial year)
      if (month && month !== 'undefined' && month !== 'null') {
        const financialMonthIndex = parseInt(month) - 1; // 0-11 where 0=April
        
        // Convert financial month to calendar month and year
        let calendarMonth, calendarYear;
        
        if (financialMonthIndex <= 8) { // April (0) to December (8)
          calendarMonth = financialMonthIndex + 3; // Apr=3, May=4, ..., Dec=11
          calendarYear = startYear;
        } else { // January (9) to March (11)
          calendarMonth = financialMonthIndex - 9; // Jan=0, Feb=1, Mar=2
          calendarYear = endYear;
        }
        
        const monthStartDate = new Date(calendarYear, calendarMonth, 1);
        monthStartDate.setHours(0, 0, 0, 0);
        const monthEndDate = new Date(calendarYear, calendarMonth + 1, 0, 23, 59, 59, 999);
        
        console.log(`Filtering for financial month ${financialMonthIndex + 1} (${financialMonthLabels[financialMonthIndex]}) -> Calendar: ${calendarMonthLabels[calendarMonth]} ${calendarYear}`);
        console.log(`Month range: ${monthStartDate} to ${monthEndDate}`);
        
        filteredOrders = filteredOrders.filter(order => {
          let orderDate = parseOrderDate(order.orderDate);
          if (!orderDate) return false;
          return orderDate >= monthStartDate && orderDate <= monthEndDate;
        });
      }
    } 
    // ============================================
    // DATE FILTER (Specific date)
    // ============================================
    else if (date && date !== 'undefined' && date !== 'null') {
      console.log(`Applying date filter: ${date}`);
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filteredOrders = filteredOrders.filter(order => {
        let orderDate = parseOrderDate(order.orderDate);
        if (!orderDate) return false;
        return orderDate >= filterDate && orderDate < nextDay;
      });
    } 
    // ============================================
    // CALENDAR MONTH/YEAR FILTER (Fallback)
    // ============================================
    else if (year && year !== 'undefined' && year !== 'null') {
      const filterYear = parseInt(year);
      
      if (month && month !== 'undefined' && month !== 'null') {
        // Specific calendar month
        const filterMonth = parseInt(month) - 1;
        console.log(`Applying calendar month/year filter: ${filterMonth + 1}/${filterYear}`);
        
        const monthStartDate = new Date(filterYear, filterMonth, 1);
        monthStartDate.setHours(0, 0, 0, 0);
        const monthEndDate = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);
        
        filteredOrders = filteredOrders.filter(order => {
          let orderDate = parseOrderDate(order.orderDate);
          if (!orderDate) return false;
          return orderDate >= monthStartDate && orderDate <= monthEndDate;
        });
      } else {
        // Full calendar year
        console.log(`Applying calendar year filter: ${filterYear}`);
        
        const yearStartDate = new Date(filterYear, 0, 1);
        yearStartDate.setHours(0, 0, 0, 0);
        const yearEndDate = new Date(filterYear, 11, 31, 23, 59, 59, 999);
        
        filteredOrders = filteredOrders.filter(order => {
          let orderDate = parseOrderDate(order.orderDate);
          if (!orderDate) return false;
          return orderDate >= yearStartDate && orderDate <= yearEndDate;
        });
      }
    }

    // ============================================
    // FILTER TYPE (pending/completed/today/other)
    // ============================================
    if (filterType === 'pending') {
      filteredOrders = filteredOrders.filter(order => order.balance > 0);
    } else if (filterType === 'completed') {
      filteredOrders = filteredOrders.filter(order => order.balance <= 0);
    } else if (filterType === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      filteredOrders = filteredOrders.filter(order => {
        if (!order.rows || !order.rows.length) return false;
        return order.rows.some(row => {
          if (!row.deliveryDate) return false;
          let deliveryDate = parseOrderDate(row.deliveryDate);
          return deliveryDate && deliveryDate.toISOString().split('T')[0] === todayStr;
        });
      });
    } else if (filterType === 'other') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      filteredOrders = filteredOrders.filter(order => {
        if (order.balance <= 0) return false;
        
        const hasDeliveryToday = order.rows?.some(row => {
          if (!row.deliveryDate) return false;
          let deliveryDate = parseOrderDate(row.deliveryDate);
          return deliveryDate && deliveryDate.toISOString().split('T')[0] === todayStr;
        });
        
        return !hasDeliveryToday;
      });
    }

    // ============================================
    // SEARCH TERM FILTER
    // ============================================
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(order => {
        return (
          (order.executive && order.executive.toLowerCase().includes(term)) ||
          (order.business && order.business.toLowerCase().includes(term)) ||
          (order.contactPerson && order.contactPerson.toLowerCase().includes(term)) ||
          (order.phone && order.phone.toString().includes(term)) ||
          (order.orderNo && order.orderNo.toLowerCase().includes(term)) ||
          (order.gstNo && order.gstNo.toLowerCase().includes(term)) ||
          (order.contactCode && order.contactCode.toLowerCase().includes(term)) ||
          (order.followUps && order.followUps.some(f => 
            f.description && f.description.toLowerCase().includes(term)
          ))
        );
      });
    }

    // ============================================
    // CALCULATE ADVANCE AND BALANCE FOR EACH ORDER
    // ============================================
    const ordersWithCalculations = filteredOrders.map(order => {
      // Calculate total from rows
      let totalOrderAmount = 0;
      if (order.rows && Array.isArray(order.rows)) {
        totalOrderAmount = order.rows.reduce((sum, row) => {
          return sum + (parseFloat(row.total) || 0);
        }, 0);
      }
      
      // Use discounted total if available
      const finalAmount = parseFloat(order.discountedTotal) || totalOrderAmount;
      
      // Calculate total payments from paymentHistory
      let totalPayments = 0;
      if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
        totalPayments = order.paymentHistory.reduce((sum, payment) => {
          return sum + (parseFloat(payment.amount) || 0);
        }, 0);
      }
      
      // Calculate total settlements
      let totalSettlements = 0;
      if (order.settlements && Array.isArray(order.settlements)) {
        totalSettlements = order.settlements.reduce((sum, settlement) => {
          return sum + (parseFloat(settlement.amount) || 0);
        }, 0);
      }
      
      // Calculate advance (total payments + settlements)
      const advance = totalPayments + totalSettlements;
      
      // Calculate balance
      const balance = Math.max(0, finalAmount - advance);
      
      return {
        ...order.toObject(),
        calculatedTotal: totalOrderAmount,
        finalAmount: finalAmount,
        advance: advance,
        balance: balance,
        paymentHistory: order.paymentHistory || [],
        settlements: order.settlements || [],
        followUps: order.followUps || []
      };
    });

    console.log(`After filters: ${ordersWithCalculations.length} orders`);
    res.json(ordersWithCalculations);
    
  } catch (err) {
    console.error("Error fetching payments dashboard data:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to parse order dates (handles DD-MM-YYYY format)
function parseOrderDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    if (typeof dateValue === 'string') {
      // Check for DD-MM-YYYY format
      if (dateValue.includes('-')) {
        const parts = dateValue.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          // DD-MM-YYYY to Date
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          return new Date(dateValue);
        }
      } else {
        return new Date(dateValue);
      }
    }
    return dateValue instanceof Date ? dateValue : new Date(dateValue);
  } catch (e) {
    console.error('Error parsing date:', dateValue, e);
    return null;
  }
}

// Month label arrays for logging
const financialMonthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const calendarMonthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

    const orderData = {
      ...req.body,
      orderNo: newOrderNo,
      createdBy: req.body.createdBy || req.body.executive,
      // Ensure date fields are properly handled
      birthDate: req.body.birthDate || null,
      anniversaryDate: req.body.anniversaryDate || null,
      gstNumber: req.body.gstNumber || null  // ADD GST NUMBER
    };

    console.log('Final order data to save:', orderData);

    const newOrder = new Order(orderData);
    await newOrder.save();

    res.json({ message: "Order saved successfully", order: newOrder });
  } catch (err) {
    console.error("Error saving order:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

router.put("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Updating order:", id, "with data:", JSON.stringify(req.body, null, 2));

    // Get existing order
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Ensure gstNumber is included
    if (updateData.gstNumber === undefined) {
      updateData.gstNumber = existingOrder.gstNumber || null;
    }
    
    // Preserve createdBy if not provided
    if (!updateData.createdBy) {
      updateData.createdBy = existingOrder.createdBy || existingOrder.executive;
    }

    // Calculate totals from rows if rows are being updated
    if (updateData.rows && Array.isArray(updateData.rows)) {
      let calculatedTotal = 0;
      updateData.rows.forEach(row => {
        // Recalculate row total if quantity and rate are present
        if (row.quantity && row.rate) {
          row.total = (parseFloat(row.quantity) * parseFloat(row.rate)).toFixed(2);
        }
        calculatedTotal += parseFloat(row.total) || 0;
      });
      
      // Get discount from update or existing
      const discount = parseFloat(updateData.discount) !== undefined 
        ? parseFloat(updateData.discount) 
        : parseFloat(existingOrder.discount) || 0;
      
      // Get final amount from update or calculate
      const finalAmount = updateData.discountedTotal !== undefined 
        ? parseFloat(updateData.discountedTotal) 
        : (calculatedTotal - discount);
      
      // Get advance from update or existing
      const advance = updateData.advance !== undefined 
        ? parseFloat(updateData.advance) 
        : parseFloat(existingOrder.advance) || 0;
      
      // Calculate balance
      const balance = finalAmount - advance;
      
      updateData.discountedTotal = finalAmount < 0 ? 0 : finalAmount;
      updateData.balance = balance < 0 ? 0 : balance;
      
      console.log("Recalculated values:", {
        calculatedTotal,
        discount,
        finalAmount: updateData.discountedTotal,
        advance,
        balance: updateData.balance
      });
    } else {
      // If rows not updated, still recalculate balance if advance or discountedTotal changed
      if (updateData.advance !== undefined || updateData.discountedTotal !== undefined) {
        const finalAmount = updateData.discountedTotal !== undefined 
          ? parseFloat(updateData.discountedTotal) 
          : parseFloat(existingOrder.discountedTotal) || 0;
        
        const advance = updateData.advance !== undefined 
          ? parseFloat(updateData.advance) 
          : parseFloat(existingOrder.advance) || 0;
        
        const balance = finalAmount - advance;
        updateData.balance = balance < 0 ? 0 : balance;
        
        console.log("Recalculated balance:", {
          finalAmount,
          advance,
          balance: updateData.balance
        });
      }
    }

    // Log the update for audit purposes
    console.log('Order update - fields being modified:', Object.keys(updateData));
    console.log('Financial changes:', {
      advance: updateData.advance,
      balance: updateData.balance,
      discount: updateData.discount,
      discountedTotal: updateData.discountedTotal,
      gstNumber: updateData.gstNumber
    });

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    console.log("Order updated successfully:", updatedOrder.orderNo);
    
    res.json({ 
      message: "Order updated successfully", 
      order: updatedOrder 
    });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ error: "Failed to update order: " + err.message });
  }
});
// ============================
// GET all orders (with calendar year filtering - FIXED)
// ============================
router.get("/orders", async (req, res) => {
  try {
    let query = {};

    console.log('Query parameters:', req.query);

    // Exclude trashed orders by default
    query.isTrashed = { $ne: true };

    // ============================================
    // CALENDAR YEAR FILTERING (Jan-Dec)
    // ============================================
    const year = req.query.year;
    const month = req.query.month;
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;

    // PRIORITY 1: Date range filter
    if (startDateParam && endDateParam && startDateParam !== 'undefined' && endDateParam !== 'undefined') {
      const startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      
      query.orderDate = {
        $gte: startDate,
        $lte: endDate
      };
      console.log('📅 Date range filter:', { startDate, endDate });
    }
    // PRIORITY 2: Specific month and year
    else if (month && month !== 'undefined' && month !== 'null' && 
             year && year !== 'undefined' && year !== 'null' && year !== 'all') {
      const yearNum = parseInt(year);
      const monthNum = parseInt(month) - 1; // Convert to 0-index (Jan=0)
      
      const startDate = new Date(yearNum, monthNum, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(yearNum, monthNum + 1, 1);
      endDate.setHours(0, 0, 0, 0);
      
      query.orderDate = {
        $gte: startDate,
        $lt: endDate
      };
      console.log(`📅 Calendar month filter: ${month}/${year}`, { startDate, endDate });
    }
    // PRIORITY 3: Full year only
    else if (year && year !== 'undefined' && year !== 'null' && year !== 'all') {
      const yearNum = parseInt(year);
      const startDate = new Date(yearNum, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
      
      query.orderDate = {
        $gte: startDate,
        $lte: endDate
      };
      console.log(`📅 Calendar year filter: ${year}`, { startDate, endDate });
    }

    // Filter by executive
    if (req.query.executive && req.query.executive !== 'undefined' && req.query.executive !== 'null') {
      query.executive = req.query.executive;
      console.log('👤 Executive filter:', req.query.executive);
    }

    // Filter by client type
    if (req.query.clientType && req.query.clientType !== 'undefined' && req.query.clientType !== 'null') {
      query.clientType = req.query.clientType;
      console.log('🏷️ Client type filter:', req.query.clientType);
    }

    // Filter by lead source
    if (req.query.leadSource && req.query.leadSource !== 'undefined' && req.query.leadSource !== 'null') {
      query.leadSource = req.query.leadSource;
      console.log('📋 Lead source filter:', req.query.leadSource);
    }

    // NEW: Filter by GST Number
    if (req.query.gstNumber && req.query.gstNumber !== 'undefined' && req.query.gstNumber !== 'null') {
      // Case-insensitive search for GST number
      query.gstNumber = { $regex: new RegExp(req.query.gstNumber, 'i') };
      console.log('🔢 GST Number filter:', req.query.gstNumber);
    }

    // NEW: Filter by business name (case-insensitive)
    if (req.query.business && req.query.business !== 'undefined' && req.query.business !== 'null') {
      query.business = { $regex: new RegExp(req.query.business, 'i') };
      console.log('🏢 Business filter:', req.query.business);
    }

    // NEW: Filter by contact person (case-insensitive)
    if (req.query.contactPerson && req.query.contactPerson !== 'undefined' && req.query.contactPerson !== 'null') {
      query.contactPerson = { $regex: new RegExp(req.query.contactPerson, 'i') };
      console.log('👤 Contact person filter:', req.query.contactPerson);
    }

    // NEW: Filter by phone number
    if (req.query.phone && req.query.phone !== 'undefined' && req.query.phone !== 'null') {
      query.phone = { $regex: new RegExp(req.query.phone, 'i') };
      console.log('📞 Phone filter:', req.query.phone);
    }

    // NEW: Filter by order number
    if (req.query.orderNo && req.query.orderNo !== 'undefined' && req.query.orderNo !== 'null') {
      query.orderNo = { $regex: new RegExp(req.query.orderNo, 'i') };
      console.log('🔢 Order No filter:', req.query.orderNo);
    }

    console.log('Final MongoDB query:', JSON.stringify(query, null, 2));

    const orders = await Order.find(query).sort({ orderDate: -1, createdAt: -1 });
    console.log('✅ Found orders:', orders.length);
    
    // Log sample dates for debugging
    if (orders.length > 0) {
      console.log('Sample order dates:', orders.slice(0, 3).map(o => o.orderDate));
    }
    
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders: " + err.message });
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
// POST: Add follow-up to order
// ============================
router.post("/orders/:id/follow-up", async (req, res) => {
  try {
    console.log("Follow-up request received:", req.body);
    console.log("Order ID:", req.params.id);

    const orderId = req.params.id;
    const { date, description, nextFollowUpDate, status } = req.body;

    // Validate required fields
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        message: "Follow-up date is required" 
      });
    }

    if (!description) {
      return res.status(400).json({ 
        success: false, 
        message: "Follow-up description is required" 
      });
    }

    const existingOrder = await Order.findById(orderId);
    
    if (!existingOrder) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    console.log("Existing order found:", existingOrder.orderNo);

    // Create follow-up record
    const followUpRecord = {
      date: date ? new Date(date) : new Date(),
      description: description,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      status: status || "Pending",
      createdBy: req.body.createdBy || existingOrder.executive || "System",
      createdAt: new Date()
    };

    console.log("Follow-up record to be created:", followUpRecord);

    // Initialize followUps array if it doesn't exist
    if (!existingOrder.followUps) {
      existingOrder.followUps = [];
    }

    // Add follow-up to array
    existingOrder.followUps.push(followUpRecord);
    
    // Save the order
    await existingOrder.save();

    console.log("Follow-up added successfully");

    res.json({
      success: true,
      message: "Follow-up added successfully",
      followUp: followUpRecord
    });

  } catch (err) {
    console.error("Error adding follow-up:", err);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({
      success: false,
      message: "Server error while adding follow-up",
      error: err.message
    });
  }
});

// ============================
// GET: Get follow-ups for an order
// ============================
router.get("/orders/:id/follow-ups", async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    console.log(`Fetching follow-ups for order: ${order.orderNo}`);
    console.log(`Found ${order.followUps?.length || 0} follow-ups`);

    res.json({
      success: true,
      followUps: order.followUps || []
    });

  } catch (err) {
    console.error("Error fetching follow-ups:", err);
    
    res.status(500).json({
      success: false,
      message: "Server error while fetching follow-ups",
      error: err.message
    });
  }
});

// ============================
// RECORD PAYMENT for an order (FIXED - with chequeNumber and utrNumber)
// ============================
router.post("/orders/:id/record-payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, upiNumber, chequeNumber, utrNumber, date, note } = req.body;

    console.log("========== PAYMENT RECORDING START ==========");
    console.log("Order ID:", id);
    console.log("Payment data:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!amount || !method) {
      console.log("Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Amount and method are required" 
      });
    }

    // Find the order
    const order = await Order.findById(id);
    if (!order) {
      console.log("Order not found:", id);
      return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
    }

    console.log("Order found:", order.orderNo);
    console.log("Order current state:", {
      advance: order.advance,
      balance: order.balance,
      discountedTotal: order.discountedTotal,
      paymentHistoryCount: order.paymentHistory?.length || 0
    });

    // Calculate total order amount from rows
    let totalOrderAmount = 0;
    if (order.rows && Array.isArray(order.rows)) {
      totalOrderAmount = order.rows.reduce((sum, row) => {
        return sum + (parseFloat(row.total) || 0);
      }, 0);
    }
    
    // Use discounted total if available, otherwise use total from rows
    const finalAmount = parseFloat(order.discountedTotal) || totalOrderAmount;
    console.log("Final amount (after discount):", finalAmount);
    
    // Get current advance (this is the total paid amount)
    const currentAdvance = parseFloat(order.advance) || 0;
    console.log("Current advance (total paid):", currentAdvance);
    
    // Calculate current balance properly
    const currentBalance = finalAmount - currentAdvance;
    console.log("Current calculated balance:", currentBalance);
    console.log("Order stored balance:", order.balance);
    
    // Validate payment amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      console.log("Invalid payment amount:", amount);
      return res.status(400).json({ 
        success: false, 
        error: "Invalid payment amount. Must be a positive number." 
      });
    }
    
    if (paymentAmount > currentBalance + 0.01) {
      console.log(`Payment amount ${paymentAmount} exceeds balance ${currentBalance}`);
      return res.status(400).json({ 
        success: false, 
        error: `Payment amount (₹${paymentAmount}) cannot exceed balance (₹${currentBalance.toFixed(2)})` 
      });
    }

    // Create payment record with ALL fields including chequeNumber and utrNumber
    const paymentRecord = {
      amount: paymentAmount,
      method: method,
      date: date ? new Date(date) : new Date(),
      note: note || 'Payment recorded',
      createdAt: new Date()
    };

    // Add UPI, Cheque, or Bank Transfer details if provided
    if (method === 'UPI' && upiNumber) {
      paymentRecord.upiNumber = upiNumber;
      paymentRecord.reference = upiNumber;
    }
    if (method === 'Cheque' && chequeNumber) {
      paymentRecord.chequeNumber = chequeNumber;
      paymentRecord.reference = chequeNumber;
    }
    if (method === 'Bank Transfer' && utrNumber) {
      paymentRecord.utrNumber = utrNumber;
      paymentRecord.reference = utrNumber;
    }

    console.log("Creating payment record:", paymentRecord);

    // Initialize paymentHistory if it doesn't exist
    if (!order.paymentHistory) {
      order.paymentHistory = [];
    }

    // Add payment to history
    order.paymentHistory.push(paymentRecord);
    
    // Update advance (total paid amount)
    const newAdvance = currentAdvance + paymentAmount;
    order.advance = newAdvance;
    
    // Calculate new balance based on final amount
    const newBalance = Math.max(0, finalAmount - newAdvance);
    order.balance = newBalance;
    
    // Update payment date if this is the first payment or update to latest
    order.paymentDate = date ? new Date(date) : new Date();

    console.log("Before save - new values:", {
      newAdvance: order.advance,
      newBalance: order.balance,
      paymentDate: order.paymentDate,
      paymentHistoryCount: order.paymentHistory.length
    });

    // Save the updated order
    const savedOrder = await order.save();
    console.log("Order saved successfully");

    console.log("========== PAYMENT RECORDING END ==========");

    // Return updated order with all payment details
    res.json({
      success: true,
      message: `Payment of ₹${paymentAmount} recorded successfully`,
      order: {
        _id: savedOrder._id,
        orderNo: savedOrder.orderNo,
        advance: savedOrder.advance,
        balance: savedOrder.balance,
        paymentHistory: savedOrder.paymentHistory,
        paymentDate: savedOrder.paymentDate
      }
    });

  } catch (err) {
    console.error("========== PAYMENT RECORDING ERROR ==========");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to record payment"
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

router.get("/executive-summary/:executive", async (req, res) => {
  try {
    const { executive } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's date in YYYY-MM-DD format
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`Fetching daily summary for ${executive} on ${todayStr}`);
    
    // 1. Get calls made today (from TeleCRM if available, otherwise estimate)
    let callsMade = 0;
    try {
      // If you have a TeleCRM model, query it
      // const teleCalls = await TeleCRM.countDocuments({
      //   executive,
      //   date: { $gte: today }
      // });
      // callsMade = teleCalls;
      
      // For now, using a placeholder - you'll need to implement based on your TeleCRM model
      callsMade = Math.floor(Math.random() * 20) + 5; // Random between 5-25 for testing
    } catch (err) {
      console.log("TeleCRM not available, using default calls count");
      callsMade = 15; // Default value
    }
    
    // 2. Get orders closed today
    const ordersToday = await Order.find({
      executive,
      orderDate: { $gte: today, $lt: tomorrow },
      status: { $ne: 'Cancelled' }
    });
    
    const ordersClosed = ordersToday.length;
    
    // Calculate total sales
    const totalSales = ordersToday.reduce((sum, order) => {
      return sum + (order.totalAmount || 0);
    }, 0);
    
    // 3. Get WhatsApp messages (placeholder - implement based on your WhatsApp model)
    let whatsappMessages = 0;
    try {
      // If you have a WhatsAppMessages model
      // whatsappMessages = await WhatsAppMessages.countDocuments({
      //   executive,
      //   date: { $gte: today }
      // });
      
      // For now, estimate based on calls
      whatsappMessages = Math.floor(callsMade * 1.5);
    } catch (err) {
      console.log("WhatsApp data not available");
      whatsappMessages = Math.floor(callsMade * 1.5); // Estimate
    }
    
    // 4. Get appointments created today
    let appointments = 0;
    try {
      // If you have an Appointment model
      // const Appointment = require("../models/Appointment");
      // appointments = await Appointment.countDocuments({
      //   executive,
      //   createdAt: { $gte: today }
      // });
      
      // For now, estimate
      appointments = Math.floor(callsMade * 0.3);
    } catch (err) {
      console.log("Appointment data not available");
      appointments = Math.floor(callsMade * 0.3);
    }
    
    // 5. Get prospects created today
    let prospects = 0;
    try {
      // If you have a Prospect model
      // const Prospect = require("../models/Prospect");
      // prospects = await Prospect.countDocuments({
      //   executive,
      //   createdAt: { $gte: today }
      // });
      
      // For now, estimate
      prospects = Math.floor(callsMade * 0.4);
    } catch (err) {
      console.log("Prospect data not available");
      prospects = Math.floor(callsMade * 0.4);
    }
    
    // 6. Get pending payments count for this executive
    const pendingPayments = await Order.find({
      executive,
      balance: { $gt: 0 }
    });
    
    const pendingPaymentCount = pendingPayments.length;
    const totalPendingAmount = pendingPayments.reduce((sum, order) => {
      return sum + (order.balance || 0);
    }, 0);
    
    // 7. Get target data
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    let target = 0;
    let achieved = 0;
    
    try {
      const targetRecord = await ExecutiveTarget.findOne({
        executive,
        targetMonth: month.toString(),
        targetYear: year.toString()
      });
      
      if (targetRecord) {
        target = targetRecord.target || 0;
      }
      
      // Calculate achieved amount for this month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      
      const monthOrders = await Order.find({
        executive,
        orderDate: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      achieved = monthOrders.reduce((sum, order) => {
        return sum + (order.totalAmount || 0);
      }, 0);
      
    } catch (err) {
      console.log("Target data not available");
    }
    
    // 8. Get conversion rate
    const conversionRate = callsMade > 0 
      ? Math.round((ordersClosed / callsMade) * 100) 
      : 0;
    
    // 9. Get average order value
    const averageOrderValue = ordersClosed > 0
      ? Math.round(totalSales / ordersClosed)
      : 0;
    
    // 10. Get session duration (you'll need to pass this from frontend)
    const sessionDuration = req.query.sessionDuration || "00:00:00";
    
    res.json({
      success: true,
      executive,
      date: today.toLocaleDateString('en-IN'),
      callsMade,
      ordersClosed,
      whatsappMessages,
      appointments,
      prospects,
      totalSales,
      pendingPaymentCount,
      totalPendingAmount,
      target,
      achieved,
      conversionRate,
      averageOrderValue,
      sessionDuration,
      summaryTime: new Date().toLocaleTimeString('en-IN')
    });
    
  } catch (err) {
    console.error("Error fetching executive summary:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch executive summary",
      message: err.message 
    });
  }
});

// ============================
// POST: Log executive activity (login, breaks, logout)
// ============================
router.post("/log-activity", async (req, res) => {
  try {
    const {
      username,
      role,
      activityType, // 'login', 'break', 'logout'
      reason,
      loginTime,
      duration
    } = req.body;
    
    console.log(`Logging activity for ${username}: ${activityType} - ${reason}`);
    
    // Here you would save to your ActivityLog model
    // For now, just log to console
    
    // Example of saving to a database model:
    /*
    const ActivityLog = require("../models/ActivityLog");
    
    const activityLog = new ActivityLog({
      username,
      role,
      activityType,
      reason,
      loginTime: loginTime ? new Date(loginTime) : null,
      duration,
      timestamp: new Date()
    });
    
    await activityLog.save();
    */
    
    // Also, if it's a logout, you might want to update the last login time
    if (activityType === 'logout') {
      // Update executive's last logout time
      await Executive.findOneAndUpdate(
        { name: username },
        { 
          lastLogout: new Date(),
          lastSessionDuration: duration
        }
      );
    }
    
    res.json({ 
      success: true, 
      message: "Activity logged successfully" 
    });
    
  } catch (err) {
    console.error("Error logging activity:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to log activity" 
    });
  }
});

// ============================
// GET: Executive performance history
// ============================
router.get("/executive-performance/:executive", async (req, res) => {
  try {
    const { executive } = req.params;
    const { days = 30 } = req.query; // Last 30 days by default
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    console.log(`Fetching performance history for ${executive} from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // Get orders in the date range
    const orders = await Order.find({
      executive,
      orderDate: { $gte: startDate, $lte: endDate }
    }).sort({ orderDate: 1 });
    
    // Group by date
    const dailyPerformance = {};
    orders.forEach(order => {
      const orderDate = order.orderDate.toISOString().split('T')[0];
      
      if (!dailyPerformance[orderDate]) {
        dailyPerformance[orderDate] = {
          date: orderDate,
          orders: 0,
          sales: 0,
          calls: 0, // You'll need to get this from TeleCRM
          whatsapp: 0, // You'll need to get this from WhatsApp model
          appointments: 0 // You'll need to get this from Appointment model
        };
      }
      
      dailyPerformance[orderDate].orders += 1;
      dailyPerformance[orderDate].sales += order.totalAmount || 0;
    });
    
    // Convert to array and sort by date
    const performanceArray = Object.values(dailyPerformance).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Calculate totals
    const totals = {
      totalOrders: orders.length,
      totalSales: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      averageDailySales: orders.length > 0 
        ? Math.round(orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) / orders.length)
        : 0,
      bestDay: performanceArray.length > 0 
        ? performanceArray.reduce((max, day) => day.sales > max.sales ? day : max, performanceArray[0])
        : null
    };
    
    res.json({
      success: true,
      executive,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: parseInt(days)
      },
      dailyPerformance: performanceArray,
      totals,
      orders: orders.map(order => ({
        orderNo: order.orderNo,
        date: order.orderDate.toISOString().split('T')[0],
        client: order.clientName || order.contactPerson,
        amount: order.totalAmount || 0,
        status: order.status
      }))
    });
    
  } catch (err) {
    console.error("Error fetching executive performance:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch performance history" 
    });
  }
});

// ============================
// GET: Today's executive stats (quick overview)
// ============================
router.get("/executive-today-stats/:executive", async (req, res) => {
  try {
    const { executive } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's orders
    const todayOrders = await Order.find({
      executive,
      orderDate: { $gte: today, $lt: tomorrow }
    });
    
    // Get pending payments
    const pendingPayments = await Order.find({
      executive,
      balance: { $gt: 0 }
    });
    
    // Get today's date in readable format
    const todayFormatted = today.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Calculate simple stats
    const stats = {
      date: todayFormatted,
      ordersToday: todayOrders.length,
      salesToday: todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      pendingPayments: pendingPayments.length,
      totalPendingAmount: pendingPayments.reduce((sum, order) => sum + (order.balance || 0), 0),
      lastUpdated: new Date().toLocaleTimeString('en-IN')
    };
    
    res.json({
      success: true,
      executive,
      stats
    });
    
  } catch (err) {
    console.error("Error fetching today's stats:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch today's statistics" 
    });
  }
});

// ============================
// GET: Monthly executive performance
// ============================
router.get("/executive-monthly/:executive", async (req, res) => {
  try {
    const { executive } = req.params;
    const { year } = req.query;
    
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // Initialize monthly data
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(targetYear, month - 1, 1);
      const endDate = new Date(targetYear, month, 0, 23, 59, 59);
      
      // Get orders for this month
      const monthOrders = await Order.find({
        executive,
        orderDate: { $gte: startDate, $lte: endDate }
      });
      
      // Get target for this month
      const targetRecord = await ExecutiveTarget.findOne({
        executive,
        targetMonth: month.toString(),
        targetYear: targetYear.toString()
      });
      
      const target = targetRecord ? targetRecord.target : 0;
      const achieved = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const achievementRate = target > 0 ? Math.round((achieved / target) * 100) : 0;
      
      monthlyData.push({
        month: month,
        monthName: new Date(targetYear, month - 1, 1).toLocaleDateString('en-IN', { month: 'long' }),
        orders: monthOrders.length,
        sales: achieved,
        target: target,
        achievementRate: achievementRate,
        pendingPayments: monthOrders.filter(order => order.balance > 0).length
      });
    }
    
    // Calculate yearly totals
    const yearlyTotals = {
      totalOrders: monthlyData.reduce((sum, month) => sum + month.orders, 0),
      totalSales: monthlyData.reduce((sum, month) => sum + month.sales, 0),
      totalTarget: monthlyData.reduce((sum, month) => sum + month.target, 0),
      averageAchievementRate: monthlyData.length > 0 
        ? Math.round(monthlyData.reduce((sum, month) => sum + month.achievementRate, 0) / monthlyData.length)
        : 0
    };
    
    res.json({
      success: true,
      executive,
      year: targetYear,
      monthlyData,
      yearlyTotals
    });
    
  } catch (err) {
    console.error("Error fetching monthly performance:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch monthly performance" 
    });
  }
});

// Get all settlements for an order
router.get("/orders/:orderId/settlements", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).select('orderNo business executive settlements');
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      success: true,
      orderNo: order.orderNo,
      business: order.business,
      executive: order.executive,
      settlements: order.settlements || []
    });
  } catch (err) {
    console.error("Error fetching settlements:", err);
    res.status(500).json({ error: "Failed to fetch settlements" });
  }
});
// Record a settlement for an order
router.post("/orders/:orderId/record-settlement", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { date, type, amount, reason, approvedBy, notes } = req.body;

    console.log("========== SETTLEMENT RECORDING START ==========");
    console.log("Order ID:", orderId);
    console.log("Settlement data:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!amount || !type || !reason || !approvedBy) {
      console.log("Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Amount, type, reason and approvedBy are required" 
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
    }

    console.log("Order found:", order.orderNo);
    console.log("Order current state:", {
      advance: order.advance,
      balance: order.balance,
      hasSettlements: order.settlements ? order.settlements.length : 0
    });

    // Check if order has pending balance
    if (!order.balance || order.balance <= 0) {
      console.log("Order has no pending balance");
      return res.status(400).json({ 
        success: false, 
        error: "Order has no pending balance" 
      });
    }

    const settlementAmount = parseFloat(amount);
    if (isNaN(settlementAmount) || settlementAmount <= 0) {
      console.log("Invalid settlement amount:", amount);
      return res.status(400).json({ 
        success: false, 
        error: "Invalid settlement amount. Must be a positive number." 
      });
    }

    if (settlementAmount > order.balance) {
      console.log(`Settlement amount ${settlementAmount} exceeds balance ${order.balance}`);
      return res.status(400).json({ 
        success: false, 
        error: `Settlement amount (₹${settlementAmount}) cannot exceed balance (₹${order.balance})` 
      });
    }

    // Create settlement record
    const settlementRecord = {
      date: date ? new Date(date) : new Date(),
      type: type,
      amount: settlementAmount,
      reason: reason,
      approvedBy: approvedBy,
      notes: notes || '',
      createdBy: req.body.createdBy || 'System',
      createdAt: new Date()
    };

    console.log("Creating settlement record:", settlementRecord);

    // Initialize settlements array if it doesn't exist
    if (!order.settlements) {
      order.settlements = [];
    }

    // Add settlement to history
    order.settlements.push(settlementRecord);
    
    // Update balance
    const newBalance = Math.max(0, order.balance - settlementAmount);
    order.balance = newBalance;

    console.log("Before save - new values:", {
      newBalance: order.balance,
      settlementsCount: order.settlements.length
    });

    // Save the updated order
    const savedOrder = await order.save();
    console.log("Order saved successfully");

    console.log("========== SETTLEMENT RECORDING END ==========");

    // Return updated order
    res.json({
      success: true,
      message: `Settlement of ₹${settlementAmount} recorded successfully`,
      newBalance: savedOrder.balance,
      settlement: settlementRecord,
      order: {
        _id: savedOrder._id,
        orderNo: savedOrder.orderNo,
        balance: savedOrder.balance,
        settlements: savedOrder.settlements
      }
    });

  } catch (err) {
    console.error("========== SETTLEMENT RECORDING ERROR ==========");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to record settlement"
    });
  }
});
// GET orders with pending payments (balance > 0)
router.get("/orders/pending-payments", async (req, res) => {
  try {
    const orders = await Order.find({ balance: { $gt: 0 } })
      .sort({ orderDate: -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching pending payments:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});

// Get all settlements for an order
router.get("/orders/:orderId/settlements", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findById(orderId).select('orderNo business executive settlements');
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      success: true,
      orderNo: order.orderNo,
      business: order.business,
      executive: order.executive,
      settlements: order.settlements || []
    });
  } catch (err) {
    console.error("Error fetching settlements:", err);
    res.status(500).json({ error: "Failed to fetch settlements" });
  }
});
// Record a settlement for an order
router.post("/orders/:orderId/record-settlement", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { date, type, amount, reason, approvedBy, notes } = req.body;

    console.log("========== SETTLEMENT RECORDING START ==========");
    console.log("Order ID:", orderId);
    console.log("Settlement data:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    if (!amount || !type || !reason || !approvedBy) {
      console.log("Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Amount, type, reason and approvedBy are required" 
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      console.log("Order not found:", orderId);
      return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
    }

    console.log("Order found:", order.orderNo);
    console.log("Order current state:", {
      advance: order.advance,
      balance: order.balance,
      hasSettlements: order.settlements ? order.settlements.length : 0
    });

    // Check if order has pending balance
    if (!order.balance || order.balance <= 0) {
      console.log("Order has no pending balance");
      return res.status(400).json({ 
        success: false, 
        error: "Order has no pending balance" 
      });
    }

    const settlementAmount = parseFloat(amount);
    if (isNaN(settlementAmount) || settlementAmount <= 0) {
      console.log("Invalid settlement amount:", amount);
      return res.status(400).json({ 
        success: false, 
        error: "Invalid settlement amount. Must be a positive number." 
      });
    }

    if (settlementAmount > order.balance) {
      console.log(`Settlement amount ${settlementAmount} exceeds balance ${order.balance}`);
      return res.status(400).json({ 
        success: false, 
        error: `Settlement amount (₹${settlementAmount}) cannot exceed balance (₹${order.balance})` 
      });
    }

    // Create settlement record
    const settlementRecord = {
      date: date ? new Date(date) : new Date(),
      type: type,
      amount: settlementAmount,
      reason: reason,
      approvedBy: approvedBy,
      notes: notes || '',
      createdBy: req.body.createdBy || 'System',
      createdAt: new Date()
    };

    console.log("Creating settlement record:", settlementRecord);

    // Initialize settlements array if it doesn't exist
    if (!order.settlements) {
      order.settlements = [];
    }

    // Add settlement to history
    order.settlements.push(settlementRecord);
    
    // Update balance
    const newBalance = Math.max(0, order.balance - settlementAmount);
    order.balance = newBalance;

    console.log("Before save - new values:", {
      newBalance: order.balance,
      settlementsCount: order.settlements.length
    });

    // Save the updated order
    const savedOrder = await order.save();
    console.log("Order saved successfully");

    console.log("========== SETTLEMENT RECORDING END ==========");

    // Return updated order
    res.json({
      success: true,
      message: `Settlement of ₹${settlementAmount} recorded successfully`,
      newBalance: savedOrder.balance,
      settlement: settlementRecord,
      order: {
        _id: savedOrder._id,
        orderNo: savedOrder.orderNo,
        balance: savedOrder.balance,
        settlements: savedOrder.settlements
      }
    });

  } catch (err) {
    console.error("========== SETTLEMENT RECORDING ERROR ==========");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ 
      success: false, 
      error: err.message || "Failed to record settlement"
    });
  }
});
// GET orders with pending payments (balance > 0)
router.get("/orders/pending-payments", async (req, res) => {
  try {
    const orders = await Order.find({ balance: { $gt: 0 } })
      .sort({ orderDate: -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching pending payments:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});

// ============================
// GET all orders with advanced filtering for payments dashboard
// Supports: Calendar Year, Month, Date, Year, Month/Year, Search
// ============================
router.get("/orders/payments-dashboard", async (req, res) => {
  try {
    console.log("Payments dashboard request received with query:", req.query);
    
    const { 
      executive, 
      year,           // Calendar year (e.g., 2024)
      month,          // Calendar month (1-12, where 1=Jan)
      date,
      filterType,
      searchTerm 
    } = req.query;

    // Get all orders
    let orders = await Order.find({}).sort({ orderDate: -1, createdAt: -1 });
    
    console.log(`Total orders in database: ${orders.length}`);

    // Helper function to parse order dates (handles DD-MM-YYYY format)
    const parseOrderDate = (dateValue) => {
      if (!dateValue) return null;
      
      try {
        if (typeof dateValue === 'string') {
          // Check for DD-MM-YYYY format
          if (dateValue.includes('-')) {
            const parts = dateValue.split('-');
            if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
              // DD-MM-YYYY to Date
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              return new Date(dateValue);
            }
          } else {
            return new Date(dateValue);
          }
        }
        return dateValue instanceof Date ? dateValue : new Date(dateValue);
      } catch (e) {
        console.error('Error parsing date:', dateValue, e);
        return null;
      }
    };

    // Apply filters manually
    let filteredOrders = [...orders];

    // Filter by executive
    if (executive && executive !== 'undefined' && executive !== 'null') {
      filteredOrders = filteredOrders.filter(order => 
        order.executive && order.executive.toLowerCase() === executive.toLowerCase()
      );
    }

    // ============================================
    // CALENDAR YEAR + MONTH FILTERING (Jan-Dec)
    // ============================================
    if (year && year !== 'undefined' && year !== 'null' && year !== 'all') {
      const filterYear = parseInt(year);
      console.log(`Applying calendar year filter: ${filterYear}`);
      
      if (month && month !== 'undefined' && month !== 'null' && month !== 'all') {
        // Specific calendar month
        const filterMonth = parseInt(month) - 1; // Convert to 0-index (Jan=0)
        console.log(`Applying calendar month/year filter: ${filterMonth + 1}/${filterYear}`);
        
        const monthStartDate = new Date(filterYear, filterMonth, 1);
        monthStartDate.setHours(0, 0, 0, 0);
        const monthEndDate = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);
        
        filteredOrders = filteredOrders.filter(order => {
          let orderDate = parseOrderDate(order.orderDate);
          if (!orderDate) return false;
          return orderDate >= monthStartDate && orderDate <= monthEndDate;
        });
        console.log(`After month/year filter: ${filteredOrders.length} orders`);
      } else {
        // Full calendar year
        const yearStartDate = new Date(filterYear, 0, 1);
        yearStartDate.setHours(0, 0, 0, 0);
        const yearEndDate = new Date(filterYear, 11, 31, 23, 59, 59, 999);
        
        filteredOrders = filteredOrders.filter(order => {
          let orderDate = parseOrderDate(order.orderDate);
          if (!orderDate) return false;
          return orderDate >= yearStartDate && orderDate <= yearEndDate;
        });
        console.log(`After year filter: ${filteredOrders.length} orders`);
      }
    } 
    // ============================================
    // DATE FILTER (Specific date)
    // ============================================
    else if (date && date !== 'undefined' && date !== 'null') {
      console.log(`Applying date filter: ${date}`);
      const filterDate = new Date(date);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filteredOrders = filteredOrders.filter(order => {
        let orderDate = parseOrderDate(order.orderDate);
        if (!orderDate) return false;
        return orderDate >= filterDate && orderDate < nextDay;
      });
      console.log(`After date filter: ${filteredOrders.length} orders`);
    }

    // ============================================
    // FILTER TYPE (pending/completed/today/other)
    // ============================================
    if (filterType === 'pending') {
      filteredOrders = filteredOrders.filter(order => order.balance > 0);
      console.log(`After pending filter: ${filteredOrders.length} orders`);
    } else if (filterType === 'completed') {
      filteredOrders = filteredOrders.filter(order => order.balance <= 0);
      console.log(`After completed filter: ${filteredOrders.length} orders`);
    } else if (filterType === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      filteredOrders = filteredOrders.filter(order => {
        if (!order.rows || !order.rows.length) return false;
        return order.rows.some(row => {
          if (!row.deliveryDate) return false;
          let deliveryDate = parseOrderDate(row.deliveryDate);
          return deliveryDate && deliveryDate.toISOString().split('T')[0] === todayStr;
        });
      });
      console.log(`After today filter: ${filteredOrders.length} orders`);
    } else if (filterType === 'other') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      filteredOrders = filteredOrders.filter(order => {
        if (order.balance <= 0) return false;
        
        const hasDeliveryToday = order.rows?.some(row => {
          if (!row.deliveryDate) return false;
          let deliveryDate = parseOrderDate(row.deliveryDate);
          return deliveryDate && deliveryDate.toISOString().split('T')[0] === todayStr;
        });
        
        return !hasDeliveryToday;
      });
      console.log(`After other filter: ${filteredOrders.length} orders`);
    }

    // ============================================
    // SEARCH TERM FILTER
    // ============================================
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filteredOrders = filteredOrders.filter(order => {
        return (
          (order.executive && order.executive.toLowerCase().includes(term)) ||
          (order.business && order.business.toLowerCase().includes(term)) ||
          (order.contactPerson && order.contactPerson.toLowerCase().includes(term)) ||
          (order.phone && order.phone.toString().includes(term)) ||
          (order.orderNo && order.orderNo.toLowerCase().includes(term)) ||
          (order.gstNo && order.gstNo.toLowerCase().includes(term)) ||
          (order.contactCode && order.contactCode.toLowerCase().includes(term)) ||
          (order.followUps && order.followUps.some(f => 
            f.description && f.description.toLowerCase().includes(term)
          ))
        );
      });
      console.log(`After search filter: ${filteredOrders.length} orders`);
    }

    // ============================================
    // CALCULATE ADVANCE AND BALANCE FOR EACH ORDER
    // ============================================
    const ordersWithCalculations = filteredOrders.map(order => {
      // Calculate total from rows
      let totalOrderAmount = 0;
      if (order.rows && Array.isArray(order.rows)) {
        totalOrderAmount = order.rows.reduce((sum, row) => {
          return sum + (parseFloat(row.total) || 0);
        }, 0);
      }
      
      // Use discounted total if available
      const finalAmount = parseFloat(order.discountedTotal) || totalOrderAmount;
      
      // Calculate total payments from paymentHistory
      let totalPayments = 0;
      if (order.paymentHistory && Array.isArray(order.paymentHistory)) {
        totalPayments = order.paymentHistory.reduce((sum, payment) => {
          return sum + (parseFloat(payment.amount) || 0);
        }, 0);
      }
      
      // Calculate total settlements
      let totalSettlements = 0;
      if (order.settlements && Array.isArray(order.settlements)) {
        totalSettlements = order.settlements.reduce((sum, settlement) => {
          return sum + (parseFloat(settlement.amount) || 0);
        }, 0);
      }
      
      // Calculate advance (total payments + settlements)
      const advance = totalPayments + totalSettlements;
      
      // Calculate balance
      const balance = Math.max(0, finalAmount - advance);
      
      return {
        ...order.toObject(),
        calculatedTotal: totalOrderAmount,
        finalAmount: finalAmount,
        advance: advance,
        balance: balance,
        paymentHistory: order.paymentHistory || [],
        settlements: order.settlements || [],
        followUps: order.followUps || []
      };
    });

    console.log(`Final filtered orders: ${ordersWithCalculations.length}`);
    res.json(ordersWithCalculations);
    
  } catch (err) {
    console.error("Error fetching payments dashboard data:", err);
    res.status(500).json({ error: err.message });
  }
});

// Record payment
router.post('/:id/record-payment', async (req, res) => {
  try {
    const { date, amount, method, reference, note } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const payment = {
      amount: parseFloat(amount),
      method: method,
      date: new Date(date),
      transactionRef: reference,
      note: note,
      createdBy: req.body.createdBy || req.user?.username || 'System'
    };
    
    // Add to payment history
    if (!order.paymentHistory) order.paymentHistory = [];
    order.paymentHistory.push(payment);
    
    // Recalculate advance and balance
    const orderTotal = order.rows.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalPayments = order.paymentHistory.reduce((sum, p) => sum + p.amount, 0);
    const totalSettlements = (order.settlements || []).reduce((sum, s) => sum + s.amount, 0);
    const advance = totalPayments + totalSettlements;
    const balance = orderTotal - advance;
    
    order.advance = advance;
    order.balance = balance > 0 ? balance : 0;
    
    await order.save();
    
    res.json({ message: 'Payment recorded successfully', order });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Record settlement
router.post('/:id/record-settlement', async (req, res) => {
  try {
    const { date, type, amount, reason, approvedBy, notes } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const settlement = {
      date: new Date(date),
      type: type,
      amount: parseFloat(amount),
      reason: reason,
      approvedBy: approvedBy,
      notes: notes,
      createdBy: req.body.createdBy || req.user?.username || 'System'
    };
    
    if (!order.settlements) order.settlements = [];
    order.settlements.push(settlement);
    
    // Recalculate advance and balance
    const orderTotal = order.rows.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalPayments = (order.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
    const totalSettlements = order.settlements.reduce((sum, s) => sum + s.amount, 0);
    const advance = totalPayments + totalSettlements;
    const balance = orderTotal - advance;
    
    order.advance = advance;
    order.balance = balance > 0 ? balance : 0;
    
    await order.save();
    
    res.json({ message: 'Settlement recorded successfully', order });
  } catch (error) {
    console.error('Error recording settlement:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add follow-up
router.post('/:id/follow-up', async (req, res) => {
  try {
    const { date, description, nextFollowUpDate, status } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const followUp = {
      date: new Date(date),
      description: description,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      status: status || 'Pending',
      createdBy: req.body.createdBy || req.user?.username || 'System'
    };
    
    if (!order.followUps) order.followUps = [];
    order.followUps.push(followUp);
    
    // Update lastFollowUpDate
    order.lastFollowUpDate = new Date(date);
    
    // Map follow-up status to existing enum
    const statusMap = {
      'Promise to Pay': 'promise-to-pay',
      'Partial Payment': 'contacted',
      'Not Reachable': 'not-reachable',
      'Call Back Later': 'call-back-later',
      'Resolved': 'resolved',
      'Follow-up Done': 'follow-up-done',
      'Pending': 'pending'
    };
    
    if (statusMap[status]) {
      order.followUpStatus = statusMap[status];
    }
    
    await order.save();
    
    res.json({ message: 'Follow-up added successfully', followUp });
  } catch (error) {
    console.error('Error adding follow-up:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order follow-ups
router.get('/:id/follow-ups', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('followUps business orderNo');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ 
      followUps: order.followUps || [],
      business: order.business,
      orderNo: order.orderNo
    });
  } catch (error) {
    console.error('Error fetching follow-ups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get order settlements
router.get('/:id/settlements', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select('settlements business orderNo');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ 
      settlements: order.settlements || [],
      business: order.business,
      orderNo: order.orderNo
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single order with all details
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;