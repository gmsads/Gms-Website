const mongoose = require('mongoose');

// Enhanced document schema with support for multiple files
const documentFileSchema = new mongoose.Schema({
  url: { type: String, required: true },
  cloudinaryId: { type: String },
  filename: { type: String },
  notes: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

// Document type schema that can contain multiple files
const documentTypeSchema = new mongoose.Schema({
  files: [documentFileSchema],
  notes: { type: String, default: '' }
}, { _id: false });

// Main documents schema
const documentsSchema = new mongoose.Schema({
  aadhar: { 
    type: documentTypeSchema, 
    default: () => ({ files: [] }) 
  },
  pan: { 
    type: documentTypeSchema, 
    default: () => ({ files: [] }) 
  },
  educational: { 
    type: documentTypeSchema, 
    default: () => ({ files: [] }) 
  },
  experience: { 
    type: documentTypeSchema, 
    default: () => ({ files: [] }) 
  },
  customDocuments: { 
    type: Map, 
    of: documentTypeSchema, 
    default: new Map() 
  }
}, { _id: false });

const baseEmployeeSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  phone: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    default: '',
    trim: true,
    lowercase: true 
  },
  password: { 
    type: String, 
    default: 'default123' 
  },
  guardianName: { 
    type: String, 
    default: '',
    trim: true 
  },
  guardianContact: { 
    type: String, 
    default: '',
    trim: true 
  },
  aadhar: { 
    type: String, 
    default: '',
    trim: true 
  },
  joiningDate: { 
    type: Date, 
    default: null 
  },
  experience: { 
    type: String, 
    default: '' 
  },
  role: { 
    type: String, 
    required: true 
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
  employeeId: { 
    type: String, 
    default: '',
    unique: true,
    sparse: true
  },
  imageUrl: { 
    type: String, 
    default: null 
  },
  cloudinaryId: { 
    type: String, 
    default: null 
  },
  documents: { 
    type: documentsSchema, 
    default: () => ({
      aadhar: { files: [] },
      pan: { files: [] },
      educational: { files: [] },
      experience: { files: [] },
      customDocuments: new Map()
    })
  },
  requiredDocuments: { 
    type: [String], 
    default: ['aadhar', 'pan'] 
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

// Update timestamp middleware
baseEmployeeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = baseEmployeeSchema;