
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

// Connect to MongoDB
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
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
