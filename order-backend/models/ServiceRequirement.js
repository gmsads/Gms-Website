const mongoose = require('mongoose');

const paymentScheduleSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'partial', 'balance'], 
    default: 'pending' 
  },
  type: { 
    type: String, 
    enum: ['diesel', 'rent'], 
    required: true 
  },
  paidAmount: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  paymentDate: { type: Date },
  notes: { type: String, default: '' },
  description: { type: String },
  period: { type: String }
});

const serviceRequirementSchema = new mongoose.Schema({
  requirementType: { 
    type: String, 
    enum: ['mobile_van', 'tricycle'], 
    required: true 
  },
  vendorName: { type: String, required: true },
  vendorPhone: { type: String, required: true },
  supplierName: { type: String },
  supplierContact: { type: String },
  numberOfDays: { type: Number, required: true },
  vehicleNumber: { type: String, required: true },
  aadharCard: {
    number: { type: String, required: true }
  },
  dieselPaymentDays: { type: Number, default: 3 },
  dieselAmount: { type: Number, default: 0 },
  rentAmount: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  clientName: { type: String, required: true },
  businessName: { type: String, required: true },
  paymentSchedules: {
    diesel: [paymentScheduleSchema],
    rent: [paymentScheduleSchema]
  },
  status: { 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active' 
  }
}, { timestamps: true });

// Auto-generate payment schedules before saving
serviceRequirementSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('startDate') || this.isModified('numberOfDays') || this.isModified('dieselPaymentDays') || this.isModified('rentAmount') || this.isModified('dieselAmount')) {
    
    // Calculate end date
    const start = new Date(this.startDate);
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + parseInt(this.numberOfDays));
    this.endDate = endDate;

    // Generate payment schedules
    this.paymentSchedules = this.generatePaymentSchedules();
  }
  next();
});

// Method to generate payment schedules
serviceRequirementSchema.methods.generatePaymentSchedules = function() {
  const schedules = {
    diesel: [],
    rent: []
  };

  const start = new Date(this.startDate);
  const end = new Date(this.endDate);

  // Generate diesel payments based on interval with periods
  if (this.dieselPaymentDays > 0) {
    let currentDate = new Date(start);
    let paymentCount = 1;
    let dayCounter = 1;
    
    while (currentDate <= end) {
      const periodStartDay = dayCounter;
      const periodEndDay = Math.min(dayCounter + this.dieselPaymentDays - 1, this.numberOfDays);
      
      const periodDescription = `Day ${periodStartDay}-${periodEndDay}`;
      
      schedules.diesel.push({
        date: new Date(currentDate),
        amount: this.dieselAmount || 0,
        status: 'pending',
        type: 'diesel',
        paidAmount: 0,
        balanceAmount: this.dieselAmount || 0,
        description: `Diesel Payment ${paymentCount}`,
        period: periodDescription
      });
      
      currentDate.setDate(currentDate.getDate() + parseInt(this.dieselPaymentDays));
      dayCounter += this.dieselPaymentDays;
      paymentCount++;
    }
  }

  // Generate rent payments (weekly)
  let rentDate = new Date(start);
  const weeks = Math.ceil(this.numberOfDays / 7);
  const rentPerWeek = this.rentAmount / weeks;
  let rentCount = 1;
  
  while (rentDate <= end) {
    schedules.rent.push({
      date: new Date(rentDate),
      amount: Math.round(rentPerWeek * 100) / 100,
      status: 'pending',
      type: 'rent',
      paidAmount: 0,
      balanceAmount: Math.round(rentPerWeek * 100) / 100,
      description: `Rent Payment Week ${rentCount}`
    });
    
    rentDate.setDate(rentDate.getDate() + 7);
    rentCount++;
  }

  return schedules;
};

module.exports = mongoose.model('ServiceRequirement', serviceRequirementSchema);