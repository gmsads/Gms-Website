const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, required: true },
  date: { type: Date, required: true },
  upiNumber: String,
  chequeNumber: String,
  chequeImage: String,
  bankName: String,
  transactionRef: String,
  otherMethod: String,
    utrNumber: String
});

const orderSchema = new mongoose.Schema({
  // Basic Info
  orderNo: { type: String, unique: true, required: true },
  orderDate: { type: Date, required: true },
    // Add these new fields for follow-up tracking
   // Follow-up tracking fields - UPDATED ENUM
  followUpStatus: {
    type: String,
    enum: ['pending', 'contacted', 'follow-up-done', 'completed', 'promise-to-pay', 'not-reachable', 'call-back-later', 'resolved'],
    default: 'pending'
  },
  whatsappContactedDate: {
    type: Date,
    default: null
  },
  lastFollowUpDate: {
    type: Date,
    default: null
  },
  // NEW: Customer special dates (optional)
  birthDate: { type: Date, default: null },
  anniversaryDate: { type: Date, default: null },
  
    gstNumber: { type: String, default: null, trim: true },
  // Client Info
  executive: { type: String, required: true },
  business: { type: String, required: true },
  contactPerson: { type: String, required: true },
  location: String,
  saleClosedBy: String,
  contactCode: { type: String, default: "+91" },
  phone: { type: String, required: true },
    // NEW: Lead Source Information
  leadSource: String,
  otherLeadSource: String,
  // Order Details
  clientType: String,
   createdBy: { type: String },
  target: String,
  rows: [{
    requirement: String,
    customRequirement: String,
    description: String,
    quantity: Number,
    rate: Number,
    days: Number,
    startDate: Date,
    endDate: Date,
    total: Number,
    deliveryDate: Date,
    gstIncluded: Boolean,
    assignedExecutive: String,
    remark: String,
    isCompleted: Boolean,
    status: String
  }],
  
  // Financials
  total: Number,
  discount: Number,
  discountedTotal: Number,
  advance: Number,
  balance: Number,
  advanceDate: Date,
  paymentDate: Date,
  
  // Payment Info
  paymentMethods: [String],
  selectedUpi: String,
  chequeNumber: String,
  chequeImage: String,
  bankName: String,
  transactionRef: String,
  otherMethod: String,
  paymentHistory: [paymentSchema],
  
  // Design Info
  designStatus: String,
  
  // PO Info
  poNumber: String,
  poDocument: String
}, { 
  timestamps: true 
});

// Speeds up the main list/sort queries (isTrashed filter + newest-first sort, executive filter)
orderSchema.index({ isTrashed: 1, orderDate: -1, createdAt: -1 });
orderSchema.index({ executive: 1, orderDate: -1 });

// Any write invalidates the cached /api/orders lists
const orderCache = require('../utils/orderCache');
const clearCache = () => orderCache.clear();
['save', 'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
 'deleteOne', 'deleteMany', 'findOneAndDelete', 'insertMany'].forEach((op) => orderSchema.post(op, clearCache));
orderSchema.pre('bulkWrite', clearCache);
orderSchema.post('bulkWrite', clearCache);

module.exports = mongoose.model('Order', orderSchema);