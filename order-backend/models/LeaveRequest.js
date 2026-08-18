// backend/models/LeaveRequest.js
const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  executiveName: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  numberOfDays: {
    type: Number,
    required: true,
    min: 1
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    minlength: 10
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  appliedOn: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: String,
    default: null
  },
  reviewedOn: {
    type: Date,
    default: null
  },
  comments: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for better query performance
leaveRequestSchema.index({ executiveName: 1, status: 1 });
leaveRequestSchema.index({ appliedOn: -1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;