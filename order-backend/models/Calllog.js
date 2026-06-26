const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  Date: {
    type: String,
    required: true,
    trim: true
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true
  },
  executive_name: {
    type: String,
    required: true
  },
  executive_phone: {
    type: String,
    required: true
  },
  client_phone: {
    type: String,
    required: true
  },
  call_status: {
    type: String,
    enum: ['initiated', 'completed', 'connected', 'not_connected', 'sale', 'not_interested', 'callback', 'no_answer'],
    default: 'initiated'
  },
  call_duration: {
    type: Number, // in seconds
    default: 0
  },
  notes: {
    type: String,
    default: ''
  },
  recording_url: {
    type: String,
    default: ''
  },
  called_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes
callLogSchema.index({ lead_id: 1 });
callLogSchema.index({ called_at: -1 });

module.exports = mongoose.model('CallLog', callLogSchema);