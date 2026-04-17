const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
  },
  imageUrl: {
    type: String,
    required: [true, 'Banner image is required'],
  },
  imagePublicId: {
    type: String,
    required: true,
  },
  bannerType: {
    type: String,
    enum: ['single_day', 'date_range', 'ongoing'],
    required: true,
  },
  startDate: Date,
  endDate: Date,
  specificDate: Date,
  duration: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  priority: {
    type: Number,
    default: 0,
  },
  clickUrl: String,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Static method to get active banners
bannerSchema.statics.getActiveBanners = async function() {
  const now = new Date();
  return await this.find({
    isActive: true,
    $or: [
      {
        bannerType: 'single_day',
        specificDate: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lt: new Date(now.setHours(23, 59, 59, 999))
        }
      },
      {
        bannerType: 'date_range',
        startDate: { $lte: now },
        endDate: { $gte: now }
      },
      {
        bannerType: 'ongoing'
      }
    ]
  }).sort({ priority: -1 });
};

module.exports = mongoose.model('Banner', bannerSchema);