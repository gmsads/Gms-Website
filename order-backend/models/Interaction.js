const mongoose = require('mongoose');

const HourRecordSchema = new mongoose.Schema({
  executiveName: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: '' // Optional field
  },
  topicDiscussed: {
    type: String,
    required: true,
    trim: true
  },
  remark: {
    type: String,
    trim: true,
    default: '' // Optional field
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('HourRecord', HourRecordSchema);