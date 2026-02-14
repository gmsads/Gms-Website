// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  guardianName: { type: String },
  guardianContact: { type: String },  // ✅ Now added
  aadhar: { type: String },
  joiningDate: { type: Date },
  experience: { type: Number },
  role: { type: String, required: true },
  active: { type: Boolean, default: true },
  imageUrl: { type: String },
  resignationDate: { type: Date },
  resignationReason: { type: String },
  rejoinDate: { type: Date },
  employeeId: { type: String, unique: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', employeeSchema);