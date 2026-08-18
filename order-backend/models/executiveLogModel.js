const mongoose = require('mongoose');

const executiveLogSchema = new mongoose.Schema({
  executiveName: {
    type: String,
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  location: {
    latitude: Number,
    longitude: Number
  }
}, { timestamps: true }); // Add timestamps for better tracking

module.exports = mongoose.model('ExecutiveLog', executiveLogSchema);