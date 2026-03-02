const mongoose = require('mongoose');

const ServiceExecutiveSchema = new mongoose.Schema({
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
     assignedExecutive: String,
    assignedExecutiveId: mongoose.Schema.Types.ObjectId,
    assignedExecutivePhone: String,
    assignedAt: Date,
    isCompleted: Boolean,
    resignationDate: String,
    resignationReason: String,
    rejoinDate: String,
});

module.exports = mongoose.model('ServiceExecutive', ServiceExecutiveSchema);
