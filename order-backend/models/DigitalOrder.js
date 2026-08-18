const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  requirement: { type: String, required: true },
  quantity: { type: Number, required: true },
  description: { type: String },
  days: { type: String },
  rate: { type: Number, required: true },
  total: { type: Number, required: true }
});

const reminderSchema = new mongoose.Schema({
  text: { type: String },
  date: { type: Date }
});

const orderSchema = new mongoose.Schema({
  executiveName: { type: String, required: true },
  orderDate: { type: Date, required: true },
  clientType: { type: String, required: true },
  businessName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  contactNumber: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  advanceDate: { type: Date },
  paymentDate: { type: Date },
  advanceBalance: { type: Number, default: 0 },
  paymentMethod: { type: String, required: true },
  otherPaymentMethod: { type: String },
  requirements: [requirementSchema],
  reminder: reminderSchema,
  grandTotal: { type: Number, required: true },
  balanceDue: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DigitalOrder', orderSchema);