const express = require('express');
const router = express.Router();
const { Visit, Report } = require('../models/marketers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = 'uploads/visits';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'visit-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// ================== ADMIN ROUTES ==================

// Test endpoint
router.get('/admin/test', (req, res) => {
    res.json({ message: 'Admin API is working', timestamp: new Date().toISOString() });
});

// Get all executives for admin
router.get('/admin/executives', async (req, res) => {
    try {
        console.log('Fetching executives list...');
        const executives = await Visit.distinct('executive');
        const filteredExecutives = executives.filter(exec => exec && exec.trim() !== '');
        console.log('Found executives:', filteredExecutives);
        res.json(filteredExecutives);
    } catch (err) {
        console.error('Error fetching executives:', err);
        res.status(500).json({ error: 'Failed to fetch executives', details: err.message });
    }
});

// Get all visits for admin (simple version)
router.get('/admin/simple-visits', async (req, res) => {
    try {
        console.log('Fetching simple visits...');
        const visits = await Visit.find()
            .sort({ date: -1, createdAt: -1 })
            .lean();
        
        console.log(`Found ${visits.length} visits`);
        
        // Get reports for these visits
        const visitIds = visits.map(v => v._id);
        const reports = await Report.find({ visitId: { $in: visitIds } });
        
        // Combine visits with their reports
        const visitsWithReports = visits.map(visit => {
            const visitReports = reports.filter(r => r.visitId && r.visitId.toString() === visit._id.toString());
            return {
                ...visit,
                reports: visitReports
            };
        });
        
        res.json(visitsWithReports);
    } catch (err) {
        console.error('Error fetching simple visits:', err);
        res.status(500).json({ error: 'Failed to fetch visits', details: err.message });
    }
});

// Get all visits for admin (full version)
router.get('/admin/visits', async (req, res) => {
    try {
        console.log('Fetching all visits with reports...');
        const visits = await Visit.find()
            .sort({ date: -1, createdAt: -1 })
            .lean();
        
        console.log(`Found ${visits.length} visits`);
        
        // Get reports for these visits
        const visitIds = visits.map(v => v._id);
        const reports = await Report.find({ visitId: { $in: visitIds } });
        
        const visitsWithReports = visits.map(visit => {
            const visitReports = reports.filter(r => r.visitId && r.visitId.toString() === visit._id.toString());
            return {
                ...visit,
                reports: visitReports
            };
        });
        
        res.json(visitsWithReports);
    } catch (err) {
        console.error('Error fetching admin visits:', err);
        res.status(500).json({ error: 'Failed to fetch visits', details: err.message });
    }
});

// ================== EXISTING FIELD EXECUTIVE ROUTES ==================

// Get data for specific executive
router.get('/data', async (req, res) => {
    try {
        const { executive } = req.query;

        if (!executive) {
            return res.status(400).json({ error: 'Executive name is required' });
        }

        // Get visits of the executive
        const visits = await Visit.find({ executive }).sort({ date: -1 });

        // Get total leads from reports
        const reports = await Report.find({ executive });
        const totalLeads = reports.reduce((sum, r) => sum + (r.leads || 0), 0);

        res.json({
            activities: visits,
            leads: totalLeads
        });
    } catch (err) {
        console.error('Error fetching field executive data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Add new visit with file upload
router.post('/visit', upload.single('photo'), async (req, res) => {
    try {
        const { executive, client, contactNumber, businessName, location, date, purpose, notes, status } = req.body;

        console.log('Received visit data:', {
            executive, client, contactNumber, businessName, location, date, purpose, notes
        });
        console.log('File received:', req.file);

        // Phone number validation
        if (!contactNumber || !/^\d{10}$/.test(contactNumber)) {
            // Delete uploaded file if validation fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
        }

        const newVisit = new Visit({
            executive,
            client,
            contactNumber,
            businessName,
            location,
            date,
            purpose,
            notes,
            photo: req.file ? `/uploads/visits/${req.file.filename}` : null,
            status: status || 'scheduled'
        });

        await newVisit.save();
        res.status(201).json({ 
            message: 'Visit scheduled successfully', 
            visit: newVisit 
        });
    } catch (err) {
        console.error('Error scheduling visit:', err);
        
        // Delete uploaded file if error occurs
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Failed to schedule visit' });
    }
});

// Submit report
router.post('/report', async (req, res) => {
    try {
        const { visitId, executive, outcome, details, leads } = req.body;

        // Create report
        const newReport = new Report({
            visitId,
            executive,
            outcome,
            details,
            leads: parseInt(leads) || 0
        });

        await newReport.save();

        // Update visit status to completed
        await Visit.findByIdAndUpdate(visitId, { status: 'completed' });

        res.status(201).json({ message: 'Report submitted successfully', report: newReport });
    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// Get data with date filters
router.get('/data-filtered', async (req, res) => {
    try {
        const { executive, year, month, day } = req.query;

        let dateFilter = {};
        if (year) {
            const start = new Date(year, month ? month - 1 : 0, day || 1);
            const end = day
                ? new Date(year, month ? month - 1 : 0, parseInt(day) + 1)
                : month
                ? new Date(year, month, 1)
                : new Date(parseInt(year) + 1, 0, 1);

            dateFilter.date = { $gte: start, $lt: end };
        }

        const visits = await Visit.find({
            executive,
            ...dateFilter
        }).sort({ date: -1 });

        const reports = await Report.find({
            executive,
            ...(dateFilter.date ? { reportDate: dateFilter.date } : {})
        });

        const totalLeads = reports.reduce((sum, r) => sum + (r.leads || 0), 0);

        res.json({
            activities: visits,
            leads: totalLeads
        });
    } catch (err) {
        console.error('Error fetching field executive data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Update visit status
router.put('/visit-status', async (req, res) => {
    try {
        const { visitId, status, followUpDate, remark } = req.body;

        const updateData = { status };
        if (followUpDate) updateData.followUpDate = followUpDate;
        if (remark) updateData.remark = remark;

        const updatedVisit = await Visit.findByIdAndUpdate(
            visitId,
            updateData,
            { new: true }
        );

        res.json({ message: 'Status updated successfully', visit: updatedVisit });
    } catch (err) {
        console.error('Error updating visit status:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});
// ================== ADMIN EDIT & DELETE ROUTES ==================

// Delete visit
router.delete('/admin/visits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find and delete the visit
        const visit = await Visit.findById(id);
        if (!visit) {
            return res.status(404).json({ error: 'Visit not found' });
        }

        // Delete associated reports
        await Report.deleteMany({ visitId: id });

        // Delete the visit
        await Visit.findByIdAndDelete(id);

        res.json({ message: 'Visit deleted successfully' });
    } catch (err) {
        console.error('Error deleting visit:', err);
        res.status(500).json({ error: 'Failed to delete visit', details: err.message });
    }
});

// Update visit (admin)
router.put('/admin/visits/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { client, contactNumber, businessName, location, purpose, status, notes } = req.body;

        // Validate phone number if provided
        if (contactNumber && !/^\d{10}$/.test(contactNumber)) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
        }

        const updatedVisit = await Visit.findByIdAndUpdate(
            id,
            {
                client,
                contactNumber,
                businessName,
                location,
                purpose,
                status,
                notes
            },
            { new: true, runValidators: true }
        );

        if (!updatedVisit) {
            return res.status(404).json({ error: 'Visit not found' });
        }

        res.json({ 
            message: 'Visit updated successfully', 
            visit: updatedVisit 
        });
    } catch (err) {
        console.error('Error updating visit:', err);
        
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Failed to update visit', details: err.message });
    }
});
// Add this route to your existing backend (field-executive.js)
router.get('/check-phone', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Check if phone number exists
        const existingVisit = await Visit.findOne({ contactNumber: phone })
            .sort({ createdAt: -1 })
            .lean();

        if (existingVisit) {
            return res.json({
                exists: true,
                message: 'Phone number already exists',
                existingData: {
                    client: existingVisit.client,
                    businessName: existingVisit.businessName,
                    location: existingVisit.location,
                    lastVisitDate: existingVisit.date,
                    purpose: existingVisit.purpose,
                    status: existingVisit.status
                }
            });
        }

        res.json({
            exists: false,
            message: 'Phone number not found, you can create new visit'
        });

    } catch (err) {
        console.error('Error checking phone:', err);
        res.status(500).json({ error: 'Failed to check phone number' });
    }
});
// Get data for specific executive with month/year filtering
router.get('/data', async (req, res) => {
    try {
        const { executive, month, year } = req.query;

        if (!executive) {
            return res.status(400).json({ error: 'Executive name is required' });
        }

        // Build date filter if month and year are provided
        let dateFilter = {};
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            dateFilter.date = { $gte: startDate, $lte: endDate };
        }

        // Get visits of the executive with date filter
        const visits = await Visit.find({ 
            executive,
            ...dateFilter 
        }).sort({ date: -1 });

        // Get total leads from reports (filter by date if needed)
        const reportFilter = { executive };
        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            reportFilter.reportDate = { $gte: startDate, $lte: endDate };
        }
        
        const reports = await Report.find(reportFilter);
        const totalLeads = reports.reduce((sum, r) => sum + (r.leads || 0), 0);

        res.json({
            activities: visits,
            leads: totalLeads
        });
    } catch (err) {
        console.error('Error fetching field executive data:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});
module.exports = router;