const mongoose = require('mongoose');

const TargetSchema = new mongoose.Schema({
  executiveName: { type: String, required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  targetAmount: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Target', TargetSchema);
