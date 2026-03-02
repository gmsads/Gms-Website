const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: String,
  guardianName: String,
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
  rejoinDate: String,
});

module.exports = mongoose.model('Agent', agentSchema);
