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
  otherMethod: String
});

const orderSchema = new mongoose.Schema({
  // Basic Info
  orderNo: { type: String, unique: true, required: true },
  orderDate: { type: Date, required: true },
  
  // Client Info
  executive: { type: String, required: true },
  business: { type: String, required: true },
  contactPerson: { type: String, required: true },
  location: String,
  saleClosedBy: String,
  contactCode: { type: String, default: "+91" },
  phone: { type: String, required: true },
  
  // Order Details
  clientType: String,
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

module.exports = mongoose.model('Order', orderSchema);