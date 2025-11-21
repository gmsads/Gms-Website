const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  Date: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    default: '',
    trim: true
  },
  company: {
    type: String,
    default: '',
    trim: true
  },
  source: {
    type: String,
    default: 'Google'
  },
  status: {
    type: String,
    enum: ['pending', 'sale', 'not_interested', 'callback', 'no_answer'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  employee_name: {
    type: String,
    default: ''
  },
  called_at: {
    type: Date
  }
}, {
  timestamps: true
});

leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ phone: 1 });

module.exports = mongoose.model('Lead', leadSchema);