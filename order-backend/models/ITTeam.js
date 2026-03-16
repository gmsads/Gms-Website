const mongoose = require('mongoose');

const documentFileSchema = new mongoose.Schema({
  url: { type: String, required: true },
  cloudinaryId: { type: String },
  filename: { type: String },
  notes: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const itTeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, default: '' },
  guardianName: { type: String, default: '' },
  guardianContact: { type: String, default: '' },
  aadhar: { type: String, default: '' },
  joiningDate: { type: Date, default: null },
  experience: { type: String, default: '' },
  active: { type: Boolean, default: true },
  resignationDate: { type: Date, default: null },
  resignationReason: { type: String, default: '' },
  rejoinDate: { type: Date, default: null },
  imageUrl: { type: String, default: null },
  cloudinaryId: { type: String, default: null },
  documents: {
    aadhar: { files: [documentFileSchema], default: { files: [] } },
    pan: { files: [documentFileSchema], default: { files: [] } },
    educational: { files: [documentFileSchema], default: { files: [] } },
    experience: { files: [documentFileSchema], default: { files: [] } },
    customDocuments: { type: Map, of: { files: [documentFileSchema] }, default: new Map() }
  }
});

module.exports = mongoose.model('ITTeam', itTeamSchema);