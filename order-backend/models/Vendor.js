const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  email: String,
  guardianName : String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
  active: { type: Boolean, default: true },
    resignationDate: String,
    resignationReason: String,
    rejoinDate: String,
});

module.exports = mongoose.model('Vendor', VendorSchema);