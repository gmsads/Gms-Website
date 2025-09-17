const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true },
  name: String,
  phone: String,
  password: String,
  email: String,
  guardianName: String,
  aadhar: String,
  joiningDate: String,
  experience: String,
  role: String,
  active: Boolean,
  imageUrl: String, // to store uploaded image path
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
