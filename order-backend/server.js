const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path"); // ADDED
require("dotenv").config();

// Route imports
const orderRoutes = require("./routes/orderRoutes");
const checkClientRoutes = require("./routes/checkClient");
const upiRoutes = require("./routes/upiRoutes");
const authRoutes = require("./routes/authRoutes"); // Contains add-field-executive
const appointmentRoutes = require("./routes/appointmentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const target = require("./routes/target");
const prospectiveClientsRouter = require("./routes/prospectiveClients");
const pendingServiceRoutes = require("./routes/pendingService");
const DigitalOrder = require("./routes/DigitalOrder");
const executiveRoutes = require("./routes/executiveRoutes");
const serviceExecutiveRoutes = require("./routes/serviceExecutives");
const executiveLogRoutes = require("./routes/executiveLogins")
const runReminderCron = require('./cron/sendAnniversaryReminders');
const anniversaryRoutes = require('./routes/anniversaryRoutes');
const performance = require('./routes/performance');
const employeeUploadRoutes = require('./routes/employeeUpload');
const employeeRoutes = require('./routes/employeeUpload');
const vendors = require('./routes/vendors');
const Appointment = require("./models/appointmentModel");
const router = require("./routes");
const inventoryRoutes = require('./routes/inventoryRoutes');
const logoutHistoryRoutes = require('./routes/logoutHistory');
const interactionRoutes = require('./routes/interactions');
const priceItemsRouter = require('./routes/priceItems');
const designRoutes = require("./routes/designRequests");
const expensesRoute = require('./routes/expenses');
const fieldExecutiveRoutes = require('./routes/fieldExecutive');

// Initialize Express
const app = express();
runReminderCron();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // SERVING UPLOADS

// Routes - SPECIFIC ROUTES FIRST
app.use('/api/anniversaries', anniversaryRoutes);
app.use('/api/expenses', expensesRoute);
app.use('/api/price-items', priceItemsRouter);
app.use('/api/interactions', interactionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendors);
app.use('/api/executiveLogins', executiveLogRoutes);
app.use('/api/performance', performance);
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
app.use('/api/field-executive', fieldExecutiveRoutes);

// AUTH ROUTES (contains add-field-executive)
app.use("/api", authRoutes);

// GENERIC ROUTES LAST
app.use("/api", orderRoutes);
app.use("/api", checkClientRoutes);
app.use("/api", serviceExecutiveRoutes);
app.use("/api", employeeRoutes);

// Be careful with this catch-all route - it might conflict
// app.use("/api", router);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Appointment Status Update Endpoint
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

    res.json(updatedAppointment);
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({
      error: "Failed to update status",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Server Error");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});