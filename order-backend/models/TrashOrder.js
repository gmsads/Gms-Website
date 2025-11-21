const mongoose = require('mongoose');

const trashOrderSchema = new mongoose.Schema({
  // Include all fields from your original Order schema
  executive: String,
  business: String,
  contactPerson: String,
  location: String,
  saleClosedBy: String,
  contactCode: String,
  phone: String,
  orderNo: String,
  orderDate: Date,
  clientType: String,
  rows: [{
    description: String,
    requirement: String,
    customRequirement: String,
    quantity: Number,
    rate: Number,
    total: Number,
    deliveryDate: Date,
    startDate: Date,
    endDate: Date,
    assignedExecutive: String,
    status: String,
    remark: String,
    isCompleted: Boolean
  }],
  discount: Number,
  discountedTotal: Number,
  advance: Number,
  balance: Number,
  advanceDate: Date,
  paymentDate: Date,
  paymentMethod: String,
  chequeNumber: String,
  paymentHistory: [{
    date: Date,
    amount: Number,
    method: String,
    reference: String,
    note: String
  }],
  
  // Trash-specific fields
  deletedAt: {
    type: Date,
    default: Date.now
  },
  deletionReason: String,
  deletedBy: String,
  originalOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TrashOrder', trashOrderSchema);