// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: [true, 'Date is required'] 
  },
  type: { 
    type: String, 
    enum: ['in', 'out'], 
    required: [true, 'Type is required (in/out)'] 
  },
  amount: { 
    type: Number, 
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive']
  },
  category: { 
    type: String, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Expense', expenseSchema);