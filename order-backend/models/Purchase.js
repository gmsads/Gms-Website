// models/Purchase.js
const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  item: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    min: 0
  },
  rate: {
    type: Number,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  remarks: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'bank transfer'],
    default: 'cash'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Purchase', purchaseSchema);