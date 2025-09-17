const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
  executiveName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v); // Validate 10-digit phone number
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['Sale', 'Service', 'Call Back', 'Others'],
    required: true
  },
  topicDiscussed: {
    type: String,
    required: true,
    trim: true
  },
  remark: {
    type: String,
    trim: true
  },
  updates: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  timeSinceLast: { 
    type: String, 
    default: 'First record' 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Middleware to format phone number before saving
InteractionSchema.pre('save', function(next) {
  // Remove any non-digit characters and ensure it's exactly 10 digits
  if (this.phoneNumber) {
    this.phoneNumber = this.phoneNumber.replace(/\D/g, '').slice(0, 10);
  }
  next();
});

module.exports = mongoose.model('Interaction', InteractionSchema);