const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  handlingPerson: {
    type: String,
    required: [true, 'Handling person name is required'],
    trim: true,
    maxlength: [50, 'Handling person name cannot exceed 50 characters']
  },
  itemType: {
    type: String,
    enum: [
      'Try Cycles',
      'Rounds',
      'Mobile Vans',
      'Frames',
      'Welding Machine',
      'Racks',
      'Laptops',
      'Chairs',
      'Desktops',
      'Fans',
      'Other'
    ],
    required: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update lastUpdated timestamp before saving
inventorySchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);