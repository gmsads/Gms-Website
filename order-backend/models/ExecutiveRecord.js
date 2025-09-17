const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  executiveName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalCalls: {
    type: Number,
    required: true
  },
  followUps: {  // Changed from String to Number
    type: Number,
    required: true
  },
  whatsapp: {  // Changed from String to Number
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  callDurations: [{
    type: Number // in minutes
  }],
});
module.exports = mongoose.model('ExecutiveReport', ReportSchema);