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
  assigned_to: {
    type: String,
    default: ''
  },
  created_by: {
    type: String,
    default: ''
  },
  assigned_at: {
    type: Date
  },
  call_status: {
    type: String,
    enum: ['pending', 'connected', 'not_connected', 'callback', 'sale', 'not_interested'],
    default: 'pending'
  },
  disposition_reason: {
    type: String,
    default: ''
  },
  next_followup_date: {
    type: String,
    default: ''
  },
  recording_url: {
    type: String,
    default: ''
  },
  last_call_result: {
    type: String,
    default: ''
  },
  total_call_duration: {
    type: Number,
    default: 0
  },
  called_at: {
    type: Date
  }
}, {
  timestamps: true
});

leadSchema.index({ status: 1 });
leadSchema.index({ assigned_to: 1 });
leadSchema.index({ next_followup_date: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ phone: 1 });

module.exports = mongoose.model('Lead', leadSchema);