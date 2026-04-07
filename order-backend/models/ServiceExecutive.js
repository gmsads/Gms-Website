const mongoose = require('mongoose');

// Define the document file schema
const documentFileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  path: String,
  size: Number,
  mimetype: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  cloudinaryId: String,
  url: String
});

const ServiceExecutiveSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  guardianName: String,
  guardianContact: Number,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
  imageUrl: String,
  cloudinaryId: String,
  
  // Status fields
  active: {
    type: Boolean,
    default: true
  },
  inactiveReason: {
    type: String,
    default: null
  },
  inactiveSince: {
    type: Date,
    default: null
  },
  
  // Employment fields
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
  
  // Documents
  documents: {
    aadhar: {
      type: { files: [documentFileSchema] },
      default: { files: [] }
    },
    pan: {
      type: { files: [documentFileSchema] },
      default: { files: [] }
    },
    educational: {
      type: { files: [documentFileSchema] },
      default: { files: [] }
    },
    experience: {
      type: { files: [documentFileSchema] },
      default: { files: [] }
    },
    customDocuments: {
      type: Map,
      of: { files: [documentFileSchema] },
      default: new Map()
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp on save
ServiceExecutiveSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ServiceExecutive', ServiceExecutiveSchema);