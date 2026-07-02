const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
  quotationNo: {
    type: String,
    required: true,
    unique: true
  },
  // Changed from partyId (ObjectId reference) to embedded partyDetails only
  partyDetails: {
    partyName: {
      type: String,
      required: true
    },
    mobileNumber: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    billingAddress: {
      type: String,
      default: ''
    },
    gstin: {
      type: String,
      default: ''
    }
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
    required: true,
    default: '10'
  },
  poNo: {
    type: String,
    default: ''
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      default: 'PCS'
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 18
    },
    taxType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    }
  }],
  additionalCharges: [{
    description: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  summary: {
    subtotal: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    taxableAmount: {
      type: Number,
      default: 0
    },
    additionalCharges: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    autoRoundOff: {
      type: Number,
      default: 0
    }
  },
  notes: {
    type: String,
    default: ''
  },
  terms: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'cancelled'],
    default: 'draft'
  },
  createdBy: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Auto-generate quotation number if not provided
quotationSchema.pre('save', async function(next) {
  if (!this.quotationNo) {
    const lastQuotation = await mongoose.model('Quotation').findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    
    if (lastQuotation && lastQuotation.quotationNo) {
      const lastNumber = parseInt(lastQuotation.quotationNo.replace('GMS', ''));
      nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
    }
    
    this.quotationNo = `GMS${String(nextNumber).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);