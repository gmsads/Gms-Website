const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const logoutHistorySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    default: 'Vinay'
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date,
    default: Date.now
  },
  sessionDuration: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  }
});

// Middleware to save to file after document is saved
logoutHistorySchema.post('save', function(doc) {
  const filePath = path.join(__dirname, '../LogoutHistory.json');
  
  // Read existing data
  let existingData = [];
  try {
    existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    // File doesn't exist or is empty - that's okay
  }

  // Add new entry
  existingData.push({
    username: doc.username,
    loginTime: doc.loginTime,
    logoutTime: doc.logoutTime,
    sessionDuration: doc.sessionDuration,
    reason: doc.reason
  });

  // Write back to file
  fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
});

module.exports = mongoose.model('LogoutHistory', logoutHistorySchema);