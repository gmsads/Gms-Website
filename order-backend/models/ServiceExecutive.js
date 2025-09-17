const mongoose = require('mongoose');

const ServiceExecutiveSchema = new mongoose.Schema({
  name: String,
  username:String,
  password: String,
  phone: String,
  email: String,
  guardianName : String,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
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
