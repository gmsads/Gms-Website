const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  password: String,
  guardianName: String,
  guardianContact: String,
  aadhar: String,
  joiningDate: Date,
  experience: String,
  role: String,
  active: { type: Boolean, default: true },
  resignationDate: Date,
  resignationReason: String,
  rejoinDate: Date,
  employeeId: String,
  imageUrl: String,  // Store Cloudinary URL here
  cloudinaryId: String, // Store Cloudinary public ID for deletion if needed
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', employeeSchema);