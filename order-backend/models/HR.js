const mongoose = require('mongoose');

const hrSchema = new mongoose.Schema({
  name: String,
  username: String,
  phone: String,
  password: String,
  email: String,
  guardianName: String,
  guardianContact: String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
 imageUrl: String,
  cloudinaryId: String, // to store uploaded image path with cloudinary 

 active: {
    type: Boolean,
    default: true
  },
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
}, {
  timestamps: true
});

module.exports = mongoose.model('HR', hrSchema);