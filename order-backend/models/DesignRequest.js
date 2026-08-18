const mongoose = require("mongoose");

const designRequestSchema = new mongoose.Schema({
  executive: {
    type: String,
    required: [true, "Executive name is required"],
    trim: true,
  },
  businessName: {
    type: String,
    required: [true, "Business name is required"],
    trim: true,
  },
  contactPerson: {
    type: String,
    required: [true, "Contact person is required"],
    trim: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  phoneNumber: {
    type: String,
    required: [true, "Phone number is required"],
    match: [/^[0-9]{10}$/, "Please fill a valid 10-digit phone number"],
  },
  requirements: {
    type: String,
    required: [true, "Requirements are required"],
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed", "rejected", "assigned-to-service"],
    default: "pending",
  },
  assignedDesigner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Designer",
    default: null
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  assignedToServiceTeam: {
    type: Boolean,
    default: false,
  },
  serviceTeamAssignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designer',
  },
  assignedToServiceDate: {
    type: Date,
    default: null
  },
  requestDate: {
    type: Date,
    default: Date.now,
  },
  deadline: Date,
  notes: String,
  files: [String],
  active: {
    type: Boolean,
    default: true,
  },
}, {
  strictPopulate: false
});

// Check if model already exists before defining it
module.exports = mongoose.models.DesignRequest || mongoose.model("DesignRequest", designRequestSchema);