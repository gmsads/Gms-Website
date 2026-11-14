//
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = require("./app");
const runReminderCron = require("./cron/sendAnniversaryReminders");

const PORT = process.env.PORT || 5000;

// Local uploads folder
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// GENERIC ROUTES LAST
app.use("/api/parties",parties);
app.use("/api", orderRoutes);
app.use("/api", checkClientRoutes);
app.use("/api", serviceExecutiveRoutes);
app.use("/api", employeeRoutes);
app.use('/api/employees', require('./routes/employees'));
app.use('/api/attendance', unitAttendanceRoutes);
// Be careful with this catch-all route - it might conflict
// app.use("/api", router);
// MongoDB Connection
console.log("MongoDB URI available:", !!process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    // Start anniversary reminder cron
    runReminderCron();

    // Start local Express server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
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
