
const express = require("express");
const cors = require("cors");

// Route imports
const orderRoutes = require("./routes/orderRoutes");
const checkClientRoutes = require("./routes/checkClient");
const upiRoutes = require("./routes/upiRoutes");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const target = require("./routes/target");
const prospectiveClientsRouter = require("./routes/prospectiveClients");
const pendingServiceRoutes = require("./routes/pendingService");
const DigitalOrder = require("./routes/DigitalOrder");
const executiveRoutes = require("./routes/executiveRoutes");
const serviceExecutiveRoutes = require("./routes/serviceExecutives");
const executiveLogRoutes = require("./routes/executiveLogins");
const anniversaryRoutes = require("./routes/anniversaryRoutes");
const performance = require("./routes/performance");
const employeeUploadRoutes = require("./routes/employeeUpload");
const employeeRoutes = require("./routes/employeeUpload");
const vendors = require("./routes/vendors");
const Appointment = require("./models/appointmentModel");
const inventoryRoutes = require("./routes/inventoryRoutes");
const logoutHistoryRoutes = require("./routes/logoutHistory");
const interactionRoutes = require("./routes/interactions");
const priceItemsRouter = require("./routes/priceItems");
const designRoutes = require("./routes/designRequests");
const expensesRoute = require("./routes/expenses");
const fieldExecutiveRoutes = require("./routes/fieldExecutive");
const designersRoutes = require("./routes/designers");
const uploadRoute = require("./routes/uploadRoute.js");
const unitAttendanceRoutes = require("./routes/unitAttendance");
const trashOrdersRoutes = require("./routes/trashOrders");
const parties = require("./routes/parties");
const attendanceRoutes = require("./routes/attendance");
const quotationRoutes = require("./routes/quotations");
const leadsRoutes = require("./routes/Lead.js");
const callLogsRoutes = require("./routes/Calllog.js");
const serviceRequirementsRoutes = require("./routes/serviceRequirements");
const purchase = require("./routes/purchase");
const whatsapp = require("./routes/whatsapp");
const salaryRoutes = require("./routes/salaryRoutes");
const greetingsRoutes = require("./routes/greetings");
const leaveRoutes = require("./routes/leaveRoutes");
const hrReportsRouter = require("./routes/hrReports");
const bannerRoutes = require("./routes/bannerRoutes");
const locationTrackingRoutes = require("./routes/LocationTracking");
const paymentExtractorRoutes = require("./modules/payment-extractor/payment-extractor.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/payment-extractor", paymentExtractorRoutes);
app.use("/api", leaveRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/purchases", purchase);
app.use("/", hrReportsRouter);
app.use("/api/followup", whatsapp);
app.use("/api/banners", bannerRoutes);
app.use("/api/tracking", locationTrackingRoutes);

app.use("/api/upload", uploadRoute);
app.use("/api/trash-orders", trashOrdersRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/call-logs", callLogsRoutes);

app.use("/api/quotations", quotationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/anniversaries", anniversaryRoutes);
app.use("/api/expenses", expensesRoute);
app.use("/api/price-items", priceItemsRouter);
app.use("/api/interactions", interactionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/vendors", vendors);
app.use("/api/executiveLogins", executiveLogRoutes);
app.use("/api/performance", performance);
app.use("/api/reports", executiveRoutes);
app.use("/api/prospective-clients", prospectiveClientsRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/Digital", DigitalOrder);
app.use("/api/upi-numbers", upiRoutes);
app.use("/api/targets", target);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/pending-services", pendingServiceRoutes);
app.use("/api/employee-uploads", employeeUploadRoutes);
app.use("/api/logout-history", logoutHistoryRoutes);
app.use("/api/design-requests", designRoutes);
app.use("/api/field-executive", fieldExecutiveRoutes);
app.use("/api/designers", designersRoutes);
app.use("/api/service-requirements", serviceRequirementsRoutes);
app.use("/api/greetings", greetingsRoutes);

// Authentication
app.use("/api", authRoutes);

// Generic routes
app.use("/api/parties", parties);
app.use("/api", orderRoutes);
app.use("/api", checkClientRoutes);
app.use("/api", serviceExecutiveRoutes);
app.use("/api", employeeRoutes);
app.use("/api/employees", require("./routes/employees"));
app.use("/api/attendance", unitAttendanceRoutes);

// Appointment status update
app.put("/api/appointments/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (!["pending", "assigned", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    return res.json(updatedAppointment);
  } catch (error) {
    console.error("Status update error:", error);

    return res.status(500).json({
      error: "Failed to update status",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Server Error");
});

module.exports = app;
