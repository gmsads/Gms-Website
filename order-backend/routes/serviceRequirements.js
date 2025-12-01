const express = require('express');
const router = express.Router();
const ServiceRequirement = require('../models/ServiceRequirement');

// Create service requirement
router.post('/', async (req, res) => {
  try {
    const {
      requirementType,
      vendorName,
      vendorPhone,
      supplierName,
      supplierContact,
      numberOfDays,
      vehicleNumber,
      aadharNumber,
      dieselPaymentDays,
      dieselAmount,
      rentAmount,
      startDate,
      clientName,
      businessName
    } = req.body;

    console.log('Creating vendor with data:', {
      requirementType,
      vendorName,
      vendorPhone,
      supplierName,
      supplierContact,
      numberOfDays,
      vehicleNumber,
      aadharNumber,
      dieselPaymentDays,
      dieselAmount,
      rentAmount,
      startDate,
      clientName,
      businessName
    });

    // Validate required fields
    if (!requirementType || !vendorName || !vendorPhone || !vehicleNumber || !aadharNumber || !rentAmount || !startDate || !clientName || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Calculate end date
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + parseInt(numberOfDays));

    const serviceRequirement = new ServiceRequirement({
      requirementType,
      vendorName,
      vendorPhone,
      supplierName: supplierName || '',
      supplierContact: supplierContact || '',
      numberOfDays: parseInt(numberOfDays) || 1,
      vehicleNumber,
      aadharCard: {
        number: aadharNumber
      },
      dieselPaymentDays: parseInt(dieselPaymentDays) || 3,
      dieselAmount: parseFloat(dieselAmount) || 0,
      rentAmount: parseFloat(rentAmount),
      startDate: start,
      endDate: endDate,
      clientName,
      businessName
    });

    await serviceRequirement.save();

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: serviceRequirement
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating vendor',
      error: error.message
    });
  }
});

// Update service requirement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      requirementType,
      vendorName,
      vendorPhone,
      supplierName,
      supplierContact,
      numberOfDays,
      vehicleNumber,
      aadharNumber,
      dieselPaymentDays,
      dieselAmount,
      rentAmount,
      startDate,
      clientName,
      businessName
    } = req.body;

    console.log('Updating vendor with data:', {
      requirementType,
      vendorName,
      vendorPhone,
      supplierName,
      supplierContact,
      numberOfDays,
      vehicleNumber,
      aadharNumber,
      dieselPaymentDays,
      dieselAmount,
      rentAmount,
      startDate,
      clientName,
      businessName
    });

    const vendor = await ServiceRequirement.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update vendor fields
    vendor.requirementType = requirementType;
    vendor.vendorName = vendorName;
    vendor.vendorPhone = vendorPhone;
    vendor.supplierName = supplierName || '';
    vendor.supplierContact = supplierContact || '';
    vendor.numberOfDays = parseInt(numberOfDays) || 1;
    vendor.vehicleNumber = vehicleNumber;
    vendor.aadharCard.number = aadharNumber;
    vendor.dieselPaymentDays = parseInt(dieselPaymentDays) || 3;
    vendor.dieselAmount = parseFloat(dieselAmount) || 0;
    vendor.rentAmount = parseFloat(rentAmount);
    vendor.startDate = new Date(startDate);
    vendor.clientName = clientName;
    vendor.businessName = businessName;

    // Recalculate end date
    const start = new Date(vendor.startDate);
    const endDate = new Date(start);
    endDate.setDate(start.getDate() + parseInt(vendor.numberOfDays));
    vendor.endDate = endDate;

    // Regenerate payment schedules
    vendor.paymentSchedules = vendor.generatePaymentSchedules();

    await vendor.save();

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vendor',
      error: error.message
    });
  }
});

// Get ALL vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await ServiceRequirement.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      vendors,
      count: vendors.length
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendors',
      error: error.message
    });
  }
});

// Update payment status with balance tracking
router.patch('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentType, scheduleIndex, status, amount, notes } = req.body;

    const vendor = await ServiceRequirement.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const paymentArray = vendor.paymentSchedules[paymentType];
    if (paymentArray && paymentArray[scheduleIndex]) {
      const payment = paymentArray[scheduleIndex];
      const paidAmount = parseFloat(amount) || 0;
      
      // Update payment details
      payment.paidAmount = paidAmount;
      payment.balanceAmount = Math.max(0, payment.amount - paidAmount);
      
      // Auto-determine status based on payment amounts
      if (paidAmount >= payment.amount) {
        payment.status = 'paid';
        payment.paymentDate = new Date();
      } else if (paidAmount > 0) {
        payment.status = 'partial';
        payment.paymentDate = new Date();
      } else {
        payment.status = 'pending';
        payment.paymentDate = null;
      }
      
      payment.notes = notes || '';

      await vendor.save();

      res.json({
        success: true,
        message: 'Payment updated successfully',
        data: vendor
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Payment schedule not found'
      });
    }
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment',
      error: error.message
    });
  }
});

// Update diesel amount for all payments
router.patch('/:id/diesel-amount', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const vendor = await ServiceRequirement.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update diesel amount for the vendor
    vendor.dieselAmount = parseFloat(amount) || 0;
    
    // Update amount for all diesel payments
    vendor.paymentSchedules.diesel.forEach(payment => {
      payment.amount = vendor.dieselAmount;
      payment.balanceAmount = vendor.dieselAmount - payment.paidAmount;
      
      // Update status based on payment
      if (payment.paidAmount === 0) {
        payment.status = 'pending';
      } else if (payment.paidAmount < vendor.dieselAmount) {
        payment.status = 'partial';
      } else if (payment.paidAmount >= vendor.dieselAmount) {
        payment.status = 'paid';
      }
    });

    await vendor.save();

    res.json({
      success: true,
      message: 'Diesel amount updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Error updating diesel amount:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating diesel amount',
      error: error.message
    });
  }
});

// Update individual diesel payment amount
router.patch('/:id/diesel-payment-amount', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduleIndex, amount } = req.body;

    const vendor = await ServiceRequirement.findById(id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const dieselPayment = vendor.paymentSchedules.diesel[scheduleIndex];
    if (dieselPayment) {
      dieselPayment.amount = parseFloat(amount) || 0;
      dieselPayment.balanceAmount = dieselPayment.amount - dieselPayment.paidAmount;
      
      // Update status based on payment
      if (dieselPayment.paidAmount === 0) {
        dieselPayment.status = 'pending';
      } else if (dieselPayment.paidAmount < dieselPayment.amount) {
        dieselPayment.status = 'partial';
      } else if (dieselPayment.paidAmount >= dieselPayment.amount) {
        dieselPayment.status = 'paid';
      }
      
      await vendor.save();

      res.json({
        success: true,
        message: 'Diesel payment amount updated successfully',
        data: vendor
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Diesel payment schedule not found'
      });
    }
  } catch (error) {
    console.error('Error updating diesel payment amount:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating diesel payment amount',
      error: error.message
    });
  }
});

module.exports = router;