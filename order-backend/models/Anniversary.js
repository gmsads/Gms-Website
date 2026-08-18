const mongoose = require('mongoose');

const AnniversarySchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  anniversaryDate: {
    type: Date,
    required: [true, 'Anniversary date is required'],
    index: true // Add index for faster queries
  },
  startingYear: {
    type: Number,
    required: [true, 'Starting year is required'],
    min: [1900, 'Starting year must be after 1900'],
    max: [new Date().getFullYear(), 'Starting year cannot be in the future']
  },
  clientBirthday: {
    type: Date,
    required: [true, 'Client birthday is required']
  },
  marriageAnniversaryDate: {
    type: Date,
    validate: {
      validator: function(date) {
        // Marriage date should be after client's birthday (if both exist)
        return !date || !this.clientBirthday || date > this.clientBirthday;
      },
      message: 'Marriage anniversary must be after client birthday'
    }
  },
  collaborationDate: {
    type: Date,
    required: [true, 'Collaboration date is required']
  },
  lastSentDates: {
    type: [Date],
    default: [],
    select: false // Hide from queries by default
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'mail', 'social', 'none'],
    default: 'email'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property for years of relationship
AnniversarySchema.virtual('yearsOfRelationship').get(function() {
  return new Date().getFullYear() - this.startingYear;
});

// Indexes for frequently queried fields
AnniversarySchema.index({ clientName: 1, businessName: 1 });
AnniversarySchema.index({ anniversaryDate: 1, isActive: 1 });

// Middleware to validate dates
AnniversarySchema.pre('save', function(next) {
  if (this.anniversaryDate && this.startingYear) {
    const anniversaryYear = new Date(this.anniversaryDate).getFullYear();
    if (anniversaryYear < this.startingYear) {
      throw new Error('Anniversary date must be in or after starting year');
    }
  }
  next();
});

module.exports = mongoose.model('Anniversary', AnniversarySchema);