// models/Quotation.js
const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  quotationNo: {
    type: String,
    required: true,
    unique: true
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Party',
    required: true
  },
  partyDetails: {
    partyName: String,
    mobileNumber: String,
    email: String,
    billingAddress: String,
    gstin: String
  },
  quotationDate: {
    type: String,
    required: true
  },
  validityDate: {
    type: String,
    required: true
  },
  validFor: {
    type: String,
    required: true
  },
  poNo: String,
  items: [{
    name: String,
    description: String,
    quantity: Number,
    price: Number,
    unit: String,
    discount: Number,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountAmount: Number,
    tax: Number,
    taxType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    taxAmount: Number,
    amount: Number
  }],
  additionalCharges: [{
    description: String,
    amount: Number
  }],
  summary: {
    subtotal: Number,
    discount: Number,
    tax: Number,
    taxableAmount: Number,
    additionalCharges: Number,
    totalAmount: Number,
    autoRoundOff: Number
  },
  notes: String,
  terms: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'cancelled'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Auto-generate quotation number if not provided
quotationSchema.pre('save', async function(next) {
  if (!this.quotationNo) {
    const count = await mongoose.model('Quotation').countDocuments();
    this.quotationNo = `QTN-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);