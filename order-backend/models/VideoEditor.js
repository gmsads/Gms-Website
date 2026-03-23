const mongoose = require('mongoose');

// Define the document file schema first
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

const videoEditorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    default: ''
  },
  guardianName: {
    type: String,
    default: ''
  },
  guardianContact: {
    type: String,
    default: ''
  },
  aadhar: {
    type: String,
    default: ''
  },
  joiningDate: {
    type: Date,
    default: null
  },
  experience: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: null
  },
  cloudinaryId: {
    type: String,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  resignationDate: {
    type: Date,
    default: null
  },
  resignationReason: {
    type: String,
    default: ''
  },
  rejoinDate: {
    type: Date,
    default: null
  },
  // Document files structure - same as Agent model
  documents: {
    aadhar: { 
      files: [documentFileSchema], 
      default: { files: [] } 
    },
    pan: { 
      files: [documentFileSchema], 
      default: { files: [] } 
    },
    educational: { 
      files: [documentFileSchema], 
      default: { files: [] } 
    },
    experience: { 
      files: [documentFileSchema], 
      default: { files: [] } 
    },
    customDocuments: { 
      type: Map, 
      of: { files: [documentFileSchema] }, 
      default: new Map() 
    }
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('VideoEditor', videoEditorSchema);