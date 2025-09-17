const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: String,
  username: String,
  phone: String,
  password: String,
  email: String,
  guardianName : String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
  imageUrl: String, // to store uploaded image path
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
});

module.exports = mongoose.model('Account', accountSchema);
