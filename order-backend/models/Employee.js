// models/BaseEmployee.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  aadhar: { type: String, default: null },
  pan: { type: String, default: null },
  educational: { type: String, default: null },
  experience: { type: String, default: null }
}, { _id: false });

const baseEmployeeSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  password: { type: String, default: 'default123' },
  guardianName: { type: String, default: '' },
  guardianContact: { type: String, default: '' },
  aadhar: { type: String, default: '' },
  joiningDate: { type: Date, default: null },
  experience: { type: String, default: '' },
  role: { type: String, required: true },
  active: { type: Boolean, default: true },
  resignationDate: { type: Date, default: null },
  resignationReason: { type: String, default: '' },
  rejoinDate: { type: Date, default: null },
  employeeId: { type: String, default: '' },
  imageUrl: { type: String, default: null },
  cloudinaryId: { type: String, default: null },
  // New document fields
  documents: {
    type: documentSchema,
    default: () => ({})
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = baseEmployeeSchema;