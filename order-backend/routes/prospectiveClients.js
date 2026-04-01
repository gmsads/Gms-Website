const express = require('express');
const router = express.Router();
const ProspectiveClient = require('../models/ProspectiveClients');
const PRIVILEGED_EXECUTIVES = ['admin1','Soujanya', 'Aleem', 'Sirisha', 'Rajesh'];

// Helper function to get financial year start and end dates
const getFinancialYearDates = (financialYear) => {
  if (financialYear === 'all' || !financialYear) {
    return { startDate: null, endDate: null };
  }
  
  const [startYear, endYear] = financialYear.split('-').map(Number);
  const startDate = new Date(startYear, 3, 1); // April 1st (month 3 = April)
  const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31st (month 2 = March)
  
  return { startDate, endDate };
};

// Helper function to get month start and end dates for financial month
const getFinancialMonthDates = (financialYear, financialMonth) => {
  const monthIndex = financialMonth - 1; // 0-11 where 0=April
  const [startYear, endYear] = financialYear.split('-').map(Number);
  
  let calendarMonth, year;
  
  if (monthIndex <= 8) { // April to December (0-8)
    calendarMonth = monthIndex + 3; // Apr=3, May=4, etc.
    year = startYear;
  } else { // January to March (9-11)
    calendarMonth = monthIndex - 9; // Jan=0, Feb=1, Mar=2
    year = endYear;
  }
  
  const startDate = new Date(year, calendarMonth, 1);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(year, calendarMonth + 1, 1);
  endDate.setHours(0, 0, 0, 0);
  
  return { startDate, endDate };
};

// Helper function to get financial year from date
const getFinancialYearFromDate = (date) => {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  if (month >= 3) { // April to December
    return `${year}-${year + 1}`;
  } else { // January to March
    return `${year - 1}-${year}`;
  }
};

// Helper function to get financial month from date (1-12 where 1=April)
const getFinancialMonthFromDate = (date) => {
  const month = date.getMonth(); // 0-11
  if (month >= 3) { // April to December
    return month - 2; // Apr=1, May=2, ..., Dec=10
  } else { // January to March
    return month + 10; // Jan=11, Feb=12, Mar=13? Wait, Mar should be 12
    // Let's fix: Jan=11, Feb=12, Mar=13? Actually Mar should be 12
    // So: Jan=10, Feb=11, Mar=12
  }
};

// Corrected: Get financial month (1-12 where 1=April)
const getFinancialMonthCorrect = (date) => {
  const month = date.getMonth(); // 0=Jan, 1=Feb, 2=Mar, 3=Apr...
  if (month === 0) return 10; // Jan -> 10th month
  if (month === 1) return 11; // Feb -> 11th month
  if (month === 2) return 12; // Mar -> 12th month
  return month - 2; // Apr=1, May=2, Jun=3, Jul=4, Aug=5, Sep=6, Oct=7, Nov=8, Dec=9
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

// GET all prospective clients with filtering (UPDATED for financial year)
router.get('/', async (req, res) => {
    try {
        const { userName, role, search, status, executiveName, filterByExecutive, month, financialYear, startDate, endDate } = req.query;

        console.log('📥 Backend received query:', {
            userName, role, executiveName, filterByExecutive, search, status, month, financialYear, startDate, endDate
        });

        let query = {};
        
        // Build date filter based on financial year or date range
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
        } else if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
            if (month) {
                // Specific month in financial year
                const financialMonth = parseInt(month);
                const { startDate: monthStart, endDate: monthEnd } = getFinancialMonthDates(financialYear, financialMonth);
                
                query.createdAt = {
                    $gte: monthStart,
                    $lt: monthEnd
                };
                
                console.log('📅 Financial month filter:', { financialYear, month, monthStart, monthEnd });
            } else {
                // Full financial year
                const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(financialYear);
                
                if (fyStart && fyEnd) {
                    query.createdAt = {
                        $gte: fyStart,
                        $lte: fyEnd
                    };
                    
                    console.log('📅 Financial year filter:', { financialYear, fyStart, fyEnd });
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

// Get prospective stats (UPDATED for financial year)
router.get('/stats', async (req, res) => {
  try {
    const { financialYear, month, startDate, endDate } = req.query;
    
    console.log('📊 Prospective stats request:', { financialYear, month, startDate, endDate });
    
    // Build date filter based on financial year or date range
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
    } else if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
      if (month) {
        // Specific month in financial year
        const financialMonth = parseInt(month);
        const { startDate: monthStart, endDate: monthEnd } = getFinancialMonthDates(financialYear, financialMonth);
        
        dateFilter.createdAt = {
          $gte: monthStart,
          $lt: monthEnd
        };
        
        console.log('📅 Financial month filter for stats:', { financialYear, month, monthStart, monthEnd });
      } else {
        // Full financial year
        const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(financialYear);
        
        if (fyStart && fyEnd) {
          dateFilter.createdAt = {
            $gte: fyStart,
            $lte: fyEnd
          };
          
          console.log('📅 Financial year filter for stats:', { financialYear, fyStart, fyEnd });
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
      financialYear: financialYear || 'all',
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

// Get all prospective clients for privileged executives (separate route) - UPDATED for financial year
router.get('/privileged/all', async (req, res) => {
    try {
        const { userName, search, status, financialYear, month, startDate, endDate } = req.query;

        // Verify the user is a privileged executive
        if (!PRIVILEGED_EXECUTIVES.includes(userName)) {
            return res.status(403).json({ 
                message: 'Access denied. Privileged executive access required.' 
            });
        }

        let query = {};
        
        // Build date filter based on financial year or date range
        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            
            query.createdAt = {
                $gte: startDateTime,
                $lte: endDateTime
            };
        } else if (financialYear && financialYear !== 'all' && financialYear !== 'undefined' && financialYear !== 'null') {
            if (month) {
                const financialMonth = parseInt(month);
                const { startDate: monthStart, endDate: monthEnd } = getFinancialMonthDates(financialYear, financialMonth);
                
                query.createdAt = {
                    $gte: monthStart,
                    $lt: monthEnd
                };
            } else {
                const { startDate: fyStart, endDate: fyEnd } = getFinancialYearDates(financialYear);
                
                if (fyStart && fyEnd) {
                    query.createdAt = {
                        $gte: fyStart,
                        $lte: fyEnd
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