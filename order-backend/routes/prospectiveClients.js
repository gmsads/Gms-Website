const express = require('express');
const router = express.Router();
const ProspectiveClient = require('../models/ProspectiveClients');
const PRIVILEGED_EXECUTIVES = ['admin1','Aleem', 'Sirisha', 'Rajesh'];

// Helper function to get calendar year start and end dates (Jan-Dec)
const getCalendarYearDates = (year) => {
  if (year === 'all' || !year) {
    return { startDate: null, endDate: null };
  }
  
  const startDate = new Date(year, 0, 1); // January 1st
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
  
  return { startDate, endDate };
};

// Helper function to get month start and end dates for calendar month
const getCalendarMonthDates = (year, month) => {
  const monthIndex = month - 1; // 0-11 where 0=Jan
  const startDate = new Date(year, monthIndex, 1);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(year, monthIndex + 1, 1);
  endDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
};

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

// GET all prospective clients with filtering (UPDATED for calendar year)
router.get('/', async (req, res) => {
    try {
        const { userName, role, search, status, executiveName, filterByExecutive, month, year, startDate, endDate } = req.query;

        console.log('📥 Backend received query:', {
            userName, role, executiveName, filterByExecutive, search, status, month, year, startDate, endDate
        });

        let query = {};
        
        // Build date filter based on calendar year or date range
        if (startDate && endDate) {
            // Date range filter
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            
            query.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime
            };
            
            console.log('📅 Date range filter:', { startDate: startDateTime, endDate: endDateTime });
        } else if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
            const selectedYear = parseInt(year);
            
            if (month && month !== 'undefined' && month !== 'null') {
                // Specific month in calendar year
                const selectedMonth = parseInt(month);
                const { startDate: monthStart, endDate: monthEnd } = getCalendarMonthDates(selectedYear, selectedMonth);
                
                query.createdAt = {
                    $gte: monthStart,
                    $lt: monthEnd
                };
                
                console.log('📅 Calendar month filter:', { year: selectedYear, month: selectedMonth, monthStart, monthEnd });
            } else {
                // Full calendar year
                const { startDate: yearStart, endDate: yearEnd } = getCalendarYearDates(selectedYear);
                
                if (yearStart && yearEnd) {
                    query.createdAt = {
                        $gte: yearStart,
                        $lte: yearEnd
                    };
                    
                    console.log('📅 Calendar year filter:', { year: selectedYear, yearStart, yearEnd });
                }
            }
        }
        
        // CASE 1: If specific executive filtering is requested (from performance view)
        if (filterByExecutive === 'true' && executiveName) {
            console.log('🎯 Filtering by executive from performance view:', executiveName);
            query.ExcutiveName = executiveName;
        }
        // CASE 2: Admin or privileged users seeing all prospects
        else if (role === 'Admin' || PRIVILEGED_EXECUTIVES.includes(userName)) {
            console.log('👑 Admin/Privileged user - showing all prospects');
            // No query filter = show all prospects
        }
        // CASE 3: Regular executive - only their own prospects
        else {
            console.log('👤 Regular executive - showing own prospects only:', userName);
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

        console.log('🔍 Final MongoDB query:', JSON.stringify(query, null, 2));

        const clients = await ProspectiveClient.find(query)
            .sort({ followUpDate: 1, createdAt: -1 });
            
        console.log('✅ Found clients:', clients.length);
        
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

// Get prospective stats (UPDATED for calendar year)
router.get('/stats', async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    
    console.log('📊 Prospective stats request:', { year, month, startDate, endDate });
    
    // Build date filter based on calendar year or date range
    let dateFilter = {};
    
    if (startDate && endDate) {
      // Date range filter
      const startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      
      dateFilter.createdAt = {
        $gte: startDateTime,
        $lte: endDateTime
      };
      
      console.log('📅 Date range filter for stats:', { startDateTime, endDateTime });
    } else if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
      const selectedYear = parseInt(year);
      
      if (month && month !== 'undefined' && month !== 'null') {
        // Specific month in calendar year
        const selectedMonth = parseInt(month);
        const { startDate: monthStart, endDate: monthEnd } = getCalendarMonthDates(selectedYear, selectedMonth);
        
        dateFilter.createdAt = {
          $gte: monthStart,
          $lt: monthEnd
        };
        
        console.log('📅 Calendar month filter for stats:', { year: selectedYear, month: selectedMonth, monthStart, monthEnd });
      } else {
        // Full calendar year
        const { startDate: yearStart, endDate: yearEnd } = getCalendarYearDates(selectedYear);
        
        if (yearStart && yearEnd) {
          dateFilter.createdAt = {
            $gte: yearStart,
            $lte: yearEnd
          };
          
          console.log('📅 Calendar year filter for stats:', { year: selectedYear, yearStart, yearEnd });
        }
      }
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
      year: year || 'all',
      month: month ? parseInt(month) : null,
      startDate: startDate || null,
      endDate: endDate || null
    };

    console.log('📊 Stats result:', result);
    res.json(result);
  } catch (error) {
    console.error('Error getting prospective stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// Get all prospective clients for privileged executives (separate route) - UPDATED for calendar year
router.get('/privileged/all', async (req, res) => {
    try {
        const { userName, search, status, year, month, startDate, endDate } = req.query;

        // Verify the user is a privileged executive
        if (!PRIVILEGED_EXECUTIVES.includes(userName)) {
            return res.status(403).json({ 
                message: 'Access denied. Privileged executive access required.' 
            });
        }

        let query = {};
        
        // Build date filter based on calendar year or date range
        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            
            query.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime
            };
        } else if (year && year !== 'all' && year !== 'undefined' && year !== 'null') {
            const selectedYear = parseInt(year);
            
            if (month && month !== 'undefined' && month !== 'null') {
                const selectedMonth = parseInt(month);
                const { startDate: monthStart, endDate: monthEnd } = getCalendarMonthDates(selectedYear, selectedMonth);
                
                query.createdAt = {
                    $gte: monthStart,
                    $lt: monthEnd
                };
            } else {
                const { startDate: yearStart, endDate: yearEnd } = getCalendarYearDates(selectedYear);
                
                if (yearStart && yearEnd) {
                    query.createdAt = {
                        $gte: yearStart,
                        $lte: yearEnd
                    };
                }
            }
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
        console.error('Error fetching all prospective clients for privileged executive:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

module.exports = router;