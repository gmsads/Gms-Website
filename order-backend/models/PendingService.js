const mongoose = require('mongoose');

const pendingServiceSchema = new mongoose.Schema({
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order',
    required: true 
  },
  rowIndex: { 
    type: Number, 
    required: true 
  },
  executive: String,
  business: String,
  customer: String,
  contact: String,
  orderNo: String,
  requirement: String,
  deliveryDate: Date,
  originalRemark: String,
  currentStatus: { 
    type: String, 
    enum: ['pending', 'assigned', 'completed', 'design pending', 'printing', 'installation pending'],
    default: 'pending'
  },
  assignedTo: String,
  lastUpdated: Date
}, { timestamps: true });

module.exports = mongoose.model('PendingService', pendingServiceSchema);