const mongoose = require('mongoose');

const designerSchema = new mongoose.Schema({
  name: String,
  username: String,
  phone: String,
  password: String,
  email: String,
  guardianName : String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
   imageUrl: String,
  cloudinaryId: String, // to store uploaded image path with cloudinary 

 active: {
    type: Boolean,
    default: true
  },// to store uploaded image path
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
});

module.exports = mongoose.model('Designer', designerSchema);