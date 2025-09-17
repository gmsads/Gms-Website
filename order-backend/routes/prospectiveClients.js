const express = require('express');
const router = express.Router();
const ProspectiveClient = require('../models/ProspectiveClients');

// Create a new prospective client
router.post('/', async (req, res) => {
    try {
        const {
            ExcutiveName,
            businessName,
            phoneNumber,
            contactPerson,
            location,
            requirementDescription,
            followUpDate,
            prospectType,
            whatsappStatus,
            leadFrom,
            otherLeadSource
        } = req.body;

        // Determine final lead source value
        const finalLeadFrom = leadFrom === 'Other Specify' ? otherLeadSource : leadFrom;

        // Check for all required fields
        const requiredFields = [
            'ExcutiveName', 'businessName', 'phoneNumber', 
            'contactPerson', 'location', 'followUpDate',
            'prospectType', 'whatsappStatus', 'leadFrom'
        ];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                missingFields 
            });
        }

        if (leadFrom === 'Other Specify' && !otherLeadSource) {
            return res.status(400).json({ 
                message: 'Please specify the lead source' 
            });
        }

        const newClient = new ProspectiveClient({
            ExcutiveName,
            businessName,
            phoneNumber,
            contactPerson,
            location,
            requirementDescription,
            followUpDate: new Date(followUpDate),
            prospectType,
            whatsappStatus,
            leadFrom: finalLeadFrom
        });

        const savedClient = await newClient.save();
        res.status(201).json(savedClient);
    } catch (error) {
        console.error('Error creating prospective client:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation failed',
                errors 
            });
        }
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Get all prospective clients
router.get('/', async (req, res) => {
    try {
        const { userName, role, search, status } = req.query;

        let query = {};
        
        // Filter by executive if not admin
        if (role !== 'Admin') {
            query.ExcutiveName = userName;
        }

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Search functionality
        if (search) {
            query.$text = { $search: search };
        }

        const clients = await ProspectiveClient.find(query)
            .sort({ followUpDate: 1, createdAt: -1 });
            
        res.json(clients);
    } catch (error) {
        console.error('Error fetching prospective clients:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Get client by phone number
router.get('/by-phone', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone || phone.length !== 10) {
            return res.status(400).json({ 
                message: 'Valid 10-digit phone number is required' 
            });
        }

        const clients = await ProspectiveClient.find({ phoneNumber: phone })
            .sort({ createdAt: -1 })
            .limit(5);
            
        res.json(clients);
    } catch (error) {
        console.error('Error checking phone number:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Add this to your prospective-clients routes
// Add this to your prospective-clients routes
router.get('/stats', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Create date range based on year and month
    let dateFilter = {};
    
    if (year || month) {
      const selectedYear = year ? parseInt(year) : new Date().getFullYear();
      const selectedMonth = month ? parseInt(month) - 1 : new Date().getMonth();
      
      let startDate, endDate;
      
      if (month) {
        // Specific month and year
        startDate = new Date(selectedYear, selectedMonth, 1);
        endDate = new Date(selectedYear, selectedMonth + 1, 1);
      } else {
        // Whole year
        startDate = new Date(`${selectedYear}-01-01`);
        endDate = new Date(`${selectedYear + 1}-01-01`);
      }
      
      // Add date filter (assuming you want to filter by createdAt)
      dateFilter.createdAt = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const stats = await ProspectiveClient.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: "$prospectType",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          count: 1
        }
      }
    ]);

    // Convert to object format
    const result = {};
    stats.forEach(stat => {
      result[stat.type] = stat.count;
    });

    // Add time period info to response
    result.timePeriod = {
      year: year ? parseInt(year) : new Date().getFullYear(),
      month: month ? parseInt(month) : null
    };

    res.json(result);
  } catch (error) {
    console.error('Error getting prospective stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single prospective client
router.get('/:id', async (req, res) => {
    try {
        const client = await ProspectiveClient.findById(req.params.id);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Update prospective client
router.patch('/:id', async (req, res) => {
    try {
        const {
            status,
            followUpDate,
            notes,
            prospectType,
            whatsappStatus,
            leadFrom,
            otherLeadSource
        } = req.body;

        const updateData = {};

        if (status) updateData.status = status;
        if (followUpDate) updateData.followUpDate = new Date(followUpDate);
        if (prospectType) updateData.prospectType = prospectType;
        if (whatsappStatus) updateData.whatsappStatus = whatsappStatus;
        
        // Handle lead source update
        if (leadFrom) {
            updateData.leadFrom = leadFrom === 'Other Specify' 
                ? otherLeadSource 
                : leadFrom;
        }

        // Add new note if provided
        if (notes && notes.content && notes.createdBy) {
            updateData.$push = {
                notes: {
                    content: notes.content,
                    createdBy: notes.createdBy
                }
            };
        }

        const updatedClient = await ProspectiveClient.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.json(updatedClient);
    } catch (error) {
        console.error('Error updating client:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation failed',
                errors 
            });
        }
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Delete prospective client
router.delete('/:id', async (req, res) => {
    try {
        const deletedClient = await ProspectiveClient.findByIdAndDelete(req.params.id);
        if (!deletedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json({ 
            message: 'Client deleted successfully',
            deletedClient 
        });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

module.exports = router;