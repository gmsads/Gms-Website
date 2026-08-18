const mongoose = require('mongoose');

const vendorModalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{10}$/.test(v); // Validate 10 digit phone number
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  location: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['mobile-vans', 'try-cycles', 'digital-wall', 'pole-boards', 'rounds'] 
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  availability: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  details: {
    address: String,
    services: String,
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    notes: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VendorModal', vendorModalSchema);