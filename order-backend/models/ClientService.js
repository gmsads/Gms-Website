const mongoose = require('mongoose');

const clientServiceSchema = new mongoose.Schema({
  username: {  // Changed from Username to username
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
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

module.exports = mongoose.model('ClientService', clientServiceSchema);