const express = require('express');
const router = express.Router();
const Appointment = require('../models/appointmentModel');

// POST - Schedule a new appointment
router.post('/', async (req, res) => {
  try {
    // 1. Validate required fields
    const requiredFields = ['executiveName', 'contactName', 'businessName', 'phoneNumber', 'date', 'time', 'venue'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields: missingFields
      });
    }

    // 2. Validate phone number format (example: 10 digits)
    if (!/^\d{10}$/.test(req.body.phoneNumber)) {
      return res.status(400).json({
        error: 'Invalid phone number format',
        details: 'Phone number must be 10 digits'
      });
    }

    // 3. Create and save appointment
    const appointment = new Appointment({
      executiveName: req.body.executiveName,
      contactName: req.body.contactName,
      businessName: req.body.businessName,
      phoneNumber: req.body.phoneNumber,
      date: req.body.date,
      time: req.body.time,
      venue: req.body.venue,
      status: 'pending'
    });

    const savedAppointment = await appointment.save();
    
    // 4. Return success response
    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      appointment: savedAppointment
    });

  } catch (error) {
    console.error('Error saving appointment:', error);
    
    // Handle different types of errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to schedule appointment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET - Fetch appointments for specific executive
router.get('/appointments/:executiveName', async (req, res) => {
  try {
    const appointments = await Appointment.find({ 
      executiveName: req.params.executiveName 
    }).sort({ date: 1 });
    
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// GET all appointments
router.get('/', async (req, res) => {
  try {
    const appointments = await Appointment.find();
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ NEW: Get only pending appointments (for Selected Appointments)
router.get('/appointments/pending/:executiveName', async (req, res) => {
  try {
    const pendingAppointments = await Appointment.find({ 
      status: 'pending',
      executiveName: req.params.executiveName 
    }).sort({ date: 1 });
    
    res.status(200).json(pendingAppointments);
  } catch (error) {
    console.error('Error fetching pending appointments:', error);
    res.status(500).json({ error: 'Failed to fetch pending appointments' });
  }
});

// ✅ NEW: Get only assigned appointments for a specific executive (for New Appointments)
router.get('/appointments/assigned/:executiveName', async (req, res) => {
  try {
    const assignedAppointments = await Appointment.find({
      status: 'assigned',
      executiveName: req.params.executiveName
    }).sort({ date: 1 });
    res.status(200).json(assignedAppointments);
  } catch (error) {
    console.error('Error fetching assigned appointments:', error);
    res.status(500).json({ error: 'Failed to fetch assigned appointments' });
  }
});

// PUT - Assign an executive
router.put('/:id/assign', async (req, res) => {
  const { executiveName } = req.body;
  console.log(`Attempting to assign appointment ${req.params.id} to ${executiveName}`);
  
  try {
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { executiveName, status: 'assigned' },
      { new: true }
    );
    
    if (!updatedAppointment) {
      console.log(`Appointment ${req.params.id} not found`);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    console.log(`Successfully assigned appointment ${req.params.id}`);
    res.json(updatedAppointment);
  } catch (err) {
    console.error('Error assigning executive:', err);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// PUT - Update appointment status
// PUT - Update appointment status
router.put('/appointments/:id/status', async (req, res) => {
  try {
    const { status, closedBy } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const allowedStatuses = ['pending', 'assigned', 'contacted', 'in progress', 'completed', 'cancelled', 'postponded', 'sale closed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const updateData = { status };
    if (status === 'sale closed') {
      if (!closedBy || closedBy.trim() === '') {
        return res.status(400).json({ error: 'Closed by name is required for sale closed status' });
      }
      updateData.closedBy = closedBy;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ 
      error: 'Failed to update appointment status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
