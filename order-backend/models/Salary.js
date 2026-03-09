// models/Salary.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  month: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return v && /^\d{4}-\d{2}$/.test(v);
      },
      message: props => `${props.value} is not a valid month format (YYYY-MM)`
    }
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  paymentDate: { 
    type: Date, 
    default: Date.now 
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'paid'
  },
  notes: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true,
  strict: true // Enforce schema
});

const SalarySchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required'],
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid employee ID format'
    }
  },
  employeeName: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  basicSalary: { 
    type: Number, 
    required: [true, 'Basic salary is required'],
    min: [0, 'Basic salary cannot be negative']
  },
  paymentHistory: {
    type: [PaymentSchema],
    default: []
  }
}, { 
  timestamps: true,
  strict: true 
});

// Create indexes
SalarySchema.index({ employeeId: 1 }, { unique: true });

module.exports = mongoose.model('Salary', SalarySchema);