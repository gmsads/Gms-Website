const mongoose = require('mongoose');

const SalesManagerSchema = new mongoose.Schema({
  name: String,
  username:String,
  password: String,
  phone: String,
  email: String,
  guardianName : String,
  guardianContact: Number,

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
    rejoinDate: String,
});

module.exports = mongoose.model('SaleshManager', SalesManagerSchema);
