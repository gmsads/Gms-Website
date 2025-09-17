const mongoose = require('mongoose');

const itTeamSchema = new mongoose.Schema({
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
  aadhar: String,
  joiningDate: Date,
  experience: Number,

    active: {
    type: Boolean,
    default: true
  },
   resignationDate: String,
   resignationReason: String,
   rejoinDate: String,
});

module.exports = mongoose.model('ItTeam', itTeamSchema);
