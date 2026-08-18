// server/models/HRReport.js
const mongoose = require('mongoose');

const hrReportSchema = new mongoose.Schema({
  hrId: {
    type: String,
    required: true
  },
  hrName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Interview tracking
  interviewsTaken: {
    type: Number,
    default: 0,
    min: 0
  },
  interviewsScheduled: {
    type: Number,
    default: 0,
    min: 0
  },
  candidatesContacted: {
    type: Number,
    default: 0,
    min: 0
  },
  offersMade: {
    type: Number,
    default: 0,
    min: 0
  },
  offersAccepted: {
    type: Number,
    default: 0,
    min: 0
  },
  // Work activities
  tasksCompleted: {
    type: String,
    default: ''
  },
  tasksInProgress: {
    type: String,
    default: ''
  },
  meetings: {
    type: String,
    default: ''
  },
  // Employee management
  newEmployeesOnboarded: {
    type: Number,
    default: 0,
    min: 0
  },
  employeeQueries: {
    type: Number,
    default: 0,
    min: 0
  },
  documentVerifications: {
    type: Number,
    default: 0,
    min: 0
  },
  // Challenges and plans
  challenges: {
    type: String,
    default: ''
  },
  tomorrowPlan: {
    type: String,
    default: ''
  },
  additionalNotes: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
hrReportSchema.index({ hrId: 1, date: -1 });
hrReportSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('HRReport', hrReportSchema);