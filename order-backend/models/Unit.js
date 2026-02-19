// models/Unit.js
const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  phone: String,
  email: String,
  guardianName: String,
  aadhar: String,
  joiningDate: Date,
  experience: String,
 imageUrl: String,
  cloudinaryId: String, // to store uploaded image path with cloudinary 

 active: {
    type: Boolean,
    default: true
  },
  resignationDate: Date,
  resignationReason: String,
  rejoinDate: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Unit', unitSchema);