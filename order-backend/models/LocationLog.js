const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  formattedTime: { type: String, default: '' }, // e.g. "10:30 AM"
  area: { type: String, default: 'Location Captured' }, // e.g. "LB Nagar"
  speed: { type: Number, default: 0 },
  type: { type: String, enum: ['ping', 'checkin', 'visit', 'checkout'], default: 'ping' },
  notes: { type: String, default: '' }
});

const locationLogSchema = new mongoose.Schema({
  executiveName: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date },
  trajectory: [waypointSchema]
}, { timestamps: true });

// Ensure unique document per executive per day
locationLogSchema.index({ executiveName: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('LocationLog', locationLogSchema);
