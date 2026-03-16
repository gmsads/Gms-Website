// models/Unit.js
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

const unitSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  phone: String,
  email: String,
  guardianName: String,
  guardianContact: Number,

  aadhar: String,
  joiningDate: Date,
  experience: String,
 imageUrl: String,
  cloudinaryId: String, // to store uploaded image path with cloudinary 

 active: {
    type: Boolean,
    default: true
  },
  resignationDate: Date,
  resignationReason: String,
  rejoinDate: Date,
    documents: {
    aadhar: { files: [documentFileSchema], default: { files: [] } },
    pan: { files: [documentFileSchema], default: { files: [] } },
    educational: { files: [documentFileSchema], default: { files: [] } },
    experience: { files: [documentFileSchema], default: { files: [] } },
    customDocuments: { type: Map, of: { files: [documentFileSchema] }, default: new Map() }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Unit', unitSchema);