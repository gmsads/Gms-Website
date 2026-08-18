const mongoose = require('mongoose');

const digitalMarketingSchema = new mongoose.Schema({
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
  }, // to store uploaded image path
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
  documents: {
  aadhar: { type: String, default: null },
  pan: { type: String, default: null },
  educational: { type: String, default: null },
  experience: { type: String, default: null }
}
});

module.exports = mongoose.model('DigitalMarketing', digitalMarketingSchema);
