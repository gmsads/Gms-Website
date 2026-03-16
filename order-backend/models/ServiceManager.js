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

const ServiceManagerSchema = new mongoose.Schema({
  name: String,
  username:String,
  password: String,
  phone: String,
  email: String,
  guardianName : String,
  guardianContact: Number,
  documents: {
    aadhar: { files: [documentFileSchema], default: { files: [] } },
    pan: { files: [documentFileSchema], default: { files: [] } },
    educational: { files: [documentFileSchema], default: { files: [] } },
    experience: { files: [documentFileSchema], default: { files: [] } },
    customDocuments: { type: Map, of: { files: [documentFileSchema] }, default: new Map() }
  },

  joiningDate: Date,
  experience: Number,
   imageUrl: String,
  cloudinaryId: String, // to store uploaded image path with cloudinary 

 active: {
    type: Boolean,
    default: true
  },
    resignationDate: String,
    resignationReason: String,
    rejoinDate: String,
});

module.exports = mongoose.model('ServiceManager', ServiceManagerSchema);
