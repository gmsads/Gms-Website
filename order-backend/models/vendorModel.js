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
  details: {
    address: String,
    services: String,
    availability: String,
    notes: String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VendorModal', vendorModalSchema);