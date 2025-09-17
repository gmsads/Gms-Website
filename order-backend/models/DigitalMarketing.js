const mongoose = require('mongoose');

const digitalMarketingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
   
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: String,
  guardianName : String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
    active: {
    type: Boolean,
    default: true
  },
  imageUrl: String, // to store uploaded image path
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
});

module.exports = mongoose.model('DigitalMarketing', digitalMarketingSchema);
