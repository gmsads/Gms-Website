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
  url: String,
  notes: String
});

// Document type schema that can handle both string and object formats
const documentTypeSchema = new mongoose.Schema({
  files: {
    type: [documentFileSchema],
    default: []
  }
}, { 
  _id: false,
  // Custom function to handle conversion from string to object
  set: function(value) {
    if (typeof value === 'string') {
      // Convert string URL to proper document structure
      return {
        files: [{
          url: value,
          cloudinaryId: value.split('/').pop().split('.')[0],
          filename: 'Document',
          notes: 'Legacy document',
          uploadedAt: new Date()
        }]
      };
    }
    return value;
  }
});

// Main documents schema with custom getters/setters
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
    default: () => new Map()
  }
}, { _id: false });

const executiveSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^\d{10}$/.test(v);
      },
      message: props => `${props.value} is not a valid 10-digit phone number!`
    }
  },
  email: String,
  guardianName: String,
  guardianContact: Number,
  aadhar: String,
  joiningDate: Date,
  experience: Number,
  active: {
    type: Boolean,
    default: true
  },
  resignationDate: String,
  resignationReason: String,
  rejoinDate: String,
  imageUrl: String,
  cloudinaryId: String,
  documents: {
    type: documentsSchema,
    default: () => ({
      aadhar: { files: [] },
      pan: { files: [] },
      educational: { files: [] },
      experience: { files: [] },
      customDocuments: new Map()
    })
  }
}, {
  // Add this to handle existing string documents
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Add a pre-find middleware to convert string documents before query
executiveSchema.pre('find', function() {
  this._mongooseOptions.lean = true;
});

// Add a post-find middleware to convert documents
executiveSchema.post('find', function(docs) {
  if (docs && Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.documents) {
        // Convert any string documents to proper structure
        const convertDoc = (docField) => {
          if (typeof docField === 'string') {
            return {
              files: [{
                url: docField,
                cloudinaryId: docField.split('/').pop().split('.')[0],
                filename: 'Document',
                notes: 'Legacy document',
                uploadedAt: new Date()
              }]
            };
          }
          return docField || { files: [] };
        };
        
        doc.documents = {
          aadhar: convertDoc(doc.documents.aadhar),
          pan: convertDoc(doc.documents.pan),
          educational: convertDoc(doc.documents.educational),
          experience: convertDoc(doc.documents.experience),
          customDocuments: doc.documents.customDocuments || new Map()
        };
      }
    });
  }
});

module.exports = mongoose.model('Executive', executiveSchema);