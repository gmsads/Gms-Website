const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  name: String
});

module.exports = mongoose.model('Requirement', requirementSchema);
