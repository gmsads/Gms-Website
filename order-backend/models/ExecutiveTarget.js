// models/ExecutiveTarget.js

const mongoose = require('mongoose');

const executiveTargetSchema = new mongoose.Schema(
  {
    executive: {
      type: String,
      required: true,
    },
    target: {
      type: Number,
      required: true,
    },
    targetMonth: {
      type: Number,
      required: true, // Store month as a number (1 for January, 12 for December)
    },
    targetYear: {
      type: Number,
      required: true, // Store year to track target per year
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExecutiveTarget', executiveTargetSchema);
