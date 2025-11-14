const mongoose = require('mongoose');

const AdvanceApprovalRequestSchema = new mongoose.Schema({
  executive: {
    type: String,
    required: true
  },
  business: {
    type: String,
    required: true
  },
  contactPerson: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  advanceAmount: {
    type: Number,
    required: true
  },
  advancePercentage: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  orderData: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  approvedBy: {
    type: String
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  }
});

module.exports = mongoose.model('AdvanceApprovalRequest', AdvanceApprovalRequestSchema);