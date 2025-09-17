const mongoose = require('mongoose');

const SalesManagerSchema = new mongoose.Schema({
  name: String,
  username:String,
  password: String,
  phone: String,
  email: String,
  guardianName : String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
    active: {
    type: Boolean,
    default: true
  },
    resignationDate: String,
    resignationReason: String,
    rejoinDate: String,
});

module.exports = mongoose.model('SaleshManager', SalesManagerSchema);
