const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  partyName: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  openingBalance: {
    type: String,
    default: '0'
  },
  balanceType: {
    type: String,
    enum: ['In Collect', 'In Pay'],
    default: 'In Collect'
  },
  partyType: {
    type: String,
    enum: ['Customer', 'Supplier', 'Both'],
    default: 'Customer'
  },
  partyCategory: {
    type: String,
    trim: true
  },
  billingAddress: {
    type: String,
    trim: true
  },
  shippingAddress: {
    type: String,
    trim: true
  },
  creditPeriod: {
    type: String,
    default: '30'
  },
  creditPeriodType: {
    type: String,
    enum: ['Days', 'Weeks', 'Months'],
    default: 'Days'
  },
  creditLimit: {
    type: String,
    default: '0'
  },
  hdrCode: {
    type: String,
    trim: true
  },
  customerValue: {
    type: String,
    trim: true
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  notes: {
    type: String,
    trim: true
  },
  // Bank Account Details
  bankAccounts: [{
    bankName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    accountHolderName: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    branchName: {
      type: String,
      trim: true
    },
    accountType: {
      type: String,
      enum: ['Savings', 'Current', 'Salary', 'Fixed Deposit'],
      default: 'Savings'
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
partySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Party', partySchema);