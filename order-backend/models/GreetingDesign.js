const mongoose = require('mongoose');

const greetingDesignSchema = new mongoose.Schema({
  occasion: { type: String, required: true },
  title: String,
  description: String,
  scheduledDate: { type: Date, required: true },
  category: { type: String, default: 'festival' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  
  // Cloudinary info
  imageUrl: { type: String, required: true },
  cloudinaryId: String, // Cloudinary public ID for deletion/updates
  filename: String, // Original filename
  
  // File info
  fileSize: Number,
  fileType: String,
  
  // Uploader info
  uploadedBy: String,
  uploaderName: String,
  
  // Analytics
  sentCount: {
    total: { type: Number, default: 0 },
    today: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 }
  },
  lastSentAt: Date,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
});

module.exports = mongoose.model('GreetingDesign', greetingDesignSchema);