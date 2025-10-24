// models/Attendance.js
const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'leave'],
    default: 'present'
  },
  checkIn: {
    type: String
  },
  checkOut: {
    type: String
  },
  workingHours: {
    type: Number
  },
  notes: {
    type: String
  }
}, { timestamps: true });

// Compound index to ensure one record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('Attendance', AttendanceSchema);