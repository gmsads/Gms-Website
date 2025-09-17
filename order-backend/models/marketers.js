// models/marketers.js
const mongoose = require('mongoose');

// ------------------- Visit Schema -------------------
const visitSchema = new mongoose.Schema({
  executive: {
    type: String,
    required: true
  },
  client: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  purpose: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'pending', 'cancelled'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ------------------- Report Schema -------------------
const reportSchema = new mongoose.Schema({
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  executive: {
    type: String,
    required: true
  },
  outcome: {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  leads: {
    type: Number,
    default: 0
  },
  reportDate: {
    type: Date,
    default: Date.now
  }
});

// ------------------- Models -------------------
const Visit = mongoose.model('Visit', visitSchema);
const Report = mongoose.model('Report', reportSchema);

module.exports = { Visit, Report };
