const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import models
const GreetingDesign = require('../models/GreetingDesign');
const SentGreeting = require('../models/SentGreeting');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/greetings');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'greeting-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ==================== ROUTES ====================

// TEST ROUTE - Check if route is working
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Greetings API is working!',
    timestamp: new Date().toISOString()
  });
});

// 1. UPLOAD DESIGN - POST /api/greetings/designs
router.post('/designs', upload.single('design'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { 
      occasion, 
      title, 
      description, 
      scheduledDate, 
      category, 
      tags, 
      isActive,
      uploadedBy,
      uploaderName 
    } = req.body;

    // Create base URL for image
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/greetings/${req.file.filename}`;

    const design = new GreetingDesign({
      occasion,
      title: title || occasion,
      description,
      scheduledDate,
      category: category || 'festival',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isActive: isActive === 'true' || isActive === true,
      imageUrl: imageUrl,
      filename: req.file.filename,
      uploadedBy: uploadedBy || '1',
      uploaderName: uploaderName || 'Designer',
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      sentCount: { total: 0, today: 0, weekly: 0, monthly: 0 }
    });

    await design.save();
    
    res.status(201).json({
      success: true,
      message: 'Greeting design uploaded successfully',
      data: design
    });
  } catch (error) {
    console.error('Error uploading design:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading design',
      error: error.message
    });
  }
});

// 2. GET ALL DESIGNS - GET /api/greetings/designs
router.get('/designs', async (req, res) => {
  try {
    const designs = await GreetingDesign.find()
      .sort({ scheduledDate: 1, createdAt: -1 });
    
    res.json({
      success: true,
      data: designs
    });
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching designs'
    });
  }
});

// 3. UPDATE DESIGN STATUS - PATCH /api/greetings/designs/:id
router.patch('/designs/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const design = await GreetingDesign.findByIdAndUpdate(
      req.params.id,
      { isActive, updatedAt: new Date() },
      { new: true }
    );
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    res.json({
      success: true,
      message: `Design ${isActive ? 'activated' : 'deactivated'}`,
      data: design
    });
  } catch (error) {
    console.error('Error updating design:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating design'
    });
  }
});

// 4. DELETE DESIGN - DELETE /api/greetings/designs/:id
router.delete('/designs/:id', async (req, res) => {
  try {
    const design = await GreetingDesign.findByIdAndDelete(req.params.id);
    
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Delete file from uploads folder
    if (design.filename) {
      const filePath = path.join(uploadDir, design.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({
      success: true,
      message: 'Design deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting design'
    });
  }
});

// 5. SEND GREETINGS TO CLIENTS - POST /api/greetings/send
router.post('/send', async (req, res) => {
  try {
    const { designId, clientIds, sentBy, senderName } = req.body;
    
    if (!designId || !clientIds || !clientIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Design ID and client IDs are required'
      });
    }
    
    const design = await GreetingDesign.findById(designId);
    if (!design) {
      return res.status(404).json({
        success: false,
        message: 'Design not found'
      });
    }
    
    // Import Client model
    const Client = require('../models/Client');
    const clients = await Client.find({ _id: { $in: clientIds } });
    
    // Record each sent greeting
    const sentGreetings = [];
    for (const client of clients) {
      const sentGreeting = new SentGreeting({
        designId,
        designTitle: design.title,
        designImage: design.imageUrl,
        occasion: design.occasion,
        clientId: client._id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        sentBy: sentBy || '1',
        senderName: senderName || 'User',
        sentAt: new Date(),
        status: 'sent'
      });
      
      await sentGreeting.save();
      sentGreetings.push(sentGreeting);
    }
    
    // Update design sent counts
    design.sentCount.total = (design.sentCount.total || 0) + clients.length;
    design.sentCount.today = (design.sentCount.today || 0) + clients.length;
    design.sentCount.weekly = (design.sentCount.weekly || 0) + clients.length;
    design.sentCount.monthly = (design.sentCount.monthly || 0) + clients.length;
    design.lastSentAt = new Date();
    await design.save();
    
    res.json({
      success: true,
      message: `Greetings sent to ${clients.length} clients`,
      data: sentGreetings
    });
  } catch (error) {
    console.error('Error sending greetings:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending greetings',
      error: error.message
    });
  }
});

// 6. GET ALL OCCASIONS - GET /api/greetings/occasions
router.get('/occasions', async (req, res) => {
  try {
    const occasions = await GreetingDesign.distinct('occasion');
    
    res.json({
      success: true,
      data: occasions
    });
  } catch (error) {
    console.error('Error fetching occasions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching occasions'
    });
  }
});

module.exports = router;