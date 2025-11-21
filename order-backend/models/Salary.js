// Import the mongoose library for MongoDB object modeling
const mongoose = require('mongoose');

// Define the Payment sub-schema for individual payment records
const PaymentSchema = new mongoose.Schema({
  // Field for the month in YYYY-MM format (e.g., "2024-01")
  month: { 
    type: String, 
    required: true, // This field is mandatory
    validate: {
      // Custom validator function to check month format
      validator: function(v) {
        // Regular expression to validate YYYY-MM format
        return /^\d{4}-\d{2}$/.test(v);
      },
      // Custom error message if validation fails
      message: props => `${props.value} is not a valid month format (YYYY-MM)`
    }
  },
  // Field for the payment amount
  amount: { 
    type: Number, 
    required: true, // This field is mandatory
    min: 0 // Ensure amount is not negative
  },
  // Field for the payment date
  paymentDate: { 
    type: Date, 
    default: Date.now // Default to current date/time if not provided
  },
  // Field for payment status
  status: {
    type: String,
    enum: ['pending', 'paid'], // Only allow these specific values
    default: 'paid' // Default value is 'paid'
  },
  // Field for additional notes
  notes: {
    type: String,
    default: '' // Default to empty string
  }
}, { timestamps: true }); // Enable automatic createdAt and updatedAt fields

// Define the main Salary schema
const SalarySchema = new mongoose.Schema({
  // Reference to the Employee model
  employeeId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: 'Employee', // Reference to Employee collection
    required: true // This field is mandatory
  },
  // Store employee name directly for quick access
  employeeName: {
    type: String,
    required: true // This field is mandatory
  },
  // Field for basic salary amount
  basicSalary: { 
    type: Number, 
    required: true, // This field is mandatory
    min: 0 // Ensure basic salary is not negative
  },
  // Array of payment history using PaymentSchema
  paymentHistory: [PaymentSchema]
}, { timestamps: true }); // Enable automatic createdAt and updatedAt fields

// Create a compound index to ensure one salary record per employee
SalarySchema.index({ employeeId: 1 }, { unique: true });

// Static method to find salary by employeeId
SalarySchema.statics.findByEmployeeId = function(employeeId) {
  // Return a promise that finds one salary by employeeId
  return this.findOne({ employeeId })
    .populate('employeeId', 'name role employeeId active') // Populate specific employee fields
    .exec(); // Execute the query
};

// Static method to get all salaries
SalarySchema.statics.findAll = function() {
  // Return a promise that finds all salaries
  return this.find({})
    .populate('employeeId', 'name role employeeId active department') // Populate employee data
    .exec(); // Execute the query
};

// Instance method to add or update payment for a month
SalarySchema.methods.addMonthlyPayment = function(month, amount, notes = '') {
  // Find index of existing payment for the month
  const existingPaymentIndex = this.paymentHistory.findIndex(
    payment => payment.month === month
  );
  
  // Check if payment already exists for this month
  if (existingPaymentIndex !== -1) {
    // Update existing payment
    this.paymentHistory[existingPaymentIndex].amount = amount;
    this.paymentHistory[existingPaymentIndex].paymentDate = new Date();
    this.paymentHistory[existingPaymentIndex].status = 'paid';
    this.paymentHistory[existingPaymentIndex].notes = notes;
  } else {
    // Add new payment
    this.paymentHistory.push({
      month: month,
      amount: amount,
      paymentDate: new Date(),
      status: 'paid',
      notes: notes
    });
  }
  
  // Save the document and return the promise
  return this.save();
};

// Export the Salary model for use in other files
module.exports = mongoose.model('Salary', SalarySchema);