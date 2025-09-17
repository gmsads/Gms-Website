const mongoose = require('mongoose');

const priceItemSchema = new mongoose.Schema({
  product: {
    type: String,
    required: true
  },
  sizes: [{
    size: {
      type: String,
      required: true
    },
    color: String,
    price: {
      type: Number,
      required: true
    }
  }],
  minQty: String,
  listType: {
    type: String,
    enum: ['agent', 'client', 'custom'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PriceItem', priceItemSchema);