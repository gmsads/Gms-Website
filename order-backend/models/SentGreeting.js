const mongoose = require('mongoose');

const sentGreetingSchema = new mongoose.Schema({
  designId: { type: mongoose.Schema.Types.ObjectId, ref: 'GreetingDesign', required: true },
  designTitle: String,
  designImage: String,
  occasion: String,
  
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: String,
  clientPhone: String,
  clientEmail: String,
  
  sentBy: String,
  senderName: String,
  sentAt: { type: Date, default: Date.now },
  
  status: { type: String, enum: ['sent', 'delivered', 'seen', 'failed'], default: 'sent' },
  deliveredAt: Date,
  seenAt: Date,
  
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], default: 'whatsapp' }
});

module.exports = mongoose.model('SentGreeting', sentGreetingSchema);