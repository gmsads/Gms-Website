// models/marketers.js
const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  executive: String,
  client: String,
  contactNumber: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v);
      },
      message: 'Phone number must be 10 digits'
    }
  },
  businessName: String,
  location: {
    type: String,
    default: ''
  },
  date: Date,
  purpose: String,
  notes: String,
  photo: String, // ✅ Photo field
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'not-interested', 'follow-up', 'sale-close'],
    default: 'scheduled'
  },
  followUpDate: Date,
  remark: String
}, { timestamps: true });
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
