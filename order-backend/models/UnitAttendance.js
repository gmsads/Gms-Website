const mongoose = require('mongoose');

const unitAttendanceSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: false // Made optional for now since you're not using it
  },
  username: {
    type: String,
    required: false // Made optional
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  loginTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  logoutTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  },
  workHours: {
    type: Number,
    default: 0
  },
  image: {
    type: String, // base64 encoded image
    required: false
  },
  remarks: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: 'Unit Office'
  }
}, {
  timestamps: true
});

// Compound index for unique attendance per employee per day
unitAttendanceSchema.index({ employeeName: 1, date: 1 }, { unique: true });

// Virtual for calculating work hours
unitAttendanceSchema.virtual('calculatedWorkHours').get(function() {
  if (this.logoutTime && this.loginTime) {
    const diffMs = this.logoutTime - this.loginTime;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }
  return 0;
});

// Pre-save middleware to calculate work hours
unitAttendanceSchema.pre('save', function(next) {
  if (this.logoutTime && this.loginTime) {
    this.workHours = this.calculatedWorkHours;
  }
  next();
});

unitAttendanceSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('UnitAttendance', unitAttendanceSchema);