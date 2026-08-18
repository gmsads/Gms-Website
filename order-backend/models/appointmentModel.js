// models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  executiveName: { type: String },
  contactName: { type: String, required: true },
  phoneNumber:{type:String, required:true},
  businessName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  venue: { type: String, required: true },
  status: {
    type: String,
    default: 'Not Closed', // default value if no status is set
  },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
