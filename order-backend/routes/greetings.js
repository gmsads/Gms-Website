const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cloudinary, storage } = require('../config/cloudinary');
const GreetingDesign = require('../models/GreetingDesign');
const SentGreeting = require('../models/SentGreeting');

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ==================== GREETING DESIGN ROUTES ====================

// TEST ROUTE
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Greetings API is working!',
    timestamp: new Date().toISOString()
  });
});

// 1. UPLOAD DESIGN TO CLOUDINARY
router.post('/designs', upload.single('design'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get Cloudinary file info
    const { path, filename, size, mimetype } = req.file;
    
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

    // Create design document
    const design = new GreetingDesign({
      occasion,
      title: title || occasion,
      description,
      scheduledDate,
      category: category || 'festival',
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isActive: isActive === 'true' || isActive === true,
      
      // Cloudinary info
      imageUrl: path, // Cloudinary URL
      cloudinaryId: filename, // Cloudinary public ID
      filename: req.file.originalname,
      
      fileSize: size,
      fileType: mimetype,
      
      uploadedBy: uploadedBy || '1',
      uploaderName: uploaderName || 'Designer',
      
      sentCount: { total: 0, today: 0, weekly: 0, monthly: 0 }
    });

    await design.save();
    
    res.status(201).json({
      success: true,
      message: 'Greeting design uploaded to Cloudinary successfully',
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

// 2. GET ALL DESIGNS
router.get('/designs', async (req, res) => {
  try {
    const designs = await GreetingDesign.find().sort({ scheduledDate: 1, createdAt: -1 });
    res.json({ success: true, data: designs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching designs' });
  }
});

// 3. UPDATE DESIGN STATUS
router.patch('/designs/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    const design = await GreetingDesign.findByIdAndUpdate(
      req.params.id,
      { isActive, updatedAt: new Date() },
      { new: true }
    );
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }
    res.json({ success: true, data: design });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating design' });
  }
});

// 4. DELETE DESIGN (from Cloudinary and Database)
router.delete('/designs/:id', async (req, res) => {
  try {
    const design = await GreetingDesign.findById(req.params.id);
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }
    
    // Delete from Cloudinary
    if (design.cloudinaryId) {
      await cloudinary.uploader.destroy(design.cloudinaryId);
    }
    
    // Delete from database
    await design.deleteOne();
    
    res.json({ success: true, message: 'Design deleted successfully from Cloudinary and database' });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({ success: false, message: 'Error deleting design' });
  }
});

// 5. BATCH DELETE DESIGNS
router.post('/designs/batch-delete', async (req, res) => {
  try {
    const { designIds } = req.body;
    
    if (!designIds || !designIds.length) {
      return res.status(400).json({ success: false, message: 'No design IDs provided' });
    }
    
    const designs = await GreetingDesign.find({ _id: { $in: designIds } });
    
    // Delete from Cloudinary
    for (const design of designs) {
      if (design.cloudinaryId) {
        await cloudinary.uploader.destroy(design.cloudinaryId);
      }
    }
    
    // Delete from database
    await GreetingDesign.deleteMany({ _id: { $in: designIds } });
    
    res.json({ 
      success: true, 
      message: `${designs.length} designs deleted successfully` 
    });
  } catch (error) {
    console.error('Error batch deleting designs:', error);
    res.status(500).json({ success: false, message: 'Error deleting designs' });
  }
});

// 6. SEND GREETINGS TO CLIENTS
router.post('/send', async (req, res) => {
  try {
    const { designId, clientIds, sentBy, senderName } = req.body;
    
    if (!designId || !clientIds || !clientIds.length) {
      return res.status(400).json({ success: false, message: 'Design ID and client IDs are required' });
    }
    
    const design = await GreetingDesign.findById(designId);
    if (!design) {
      return res.status(404).json({ success: false, message: 'Design not found' });
    }
    
    const Client = require('../models/Client');
    const clients = await Client.find({ _id: { $in: clientIds } });
    
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
    
    // Update design sent count
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
    res.status(500).json({ success: false, message: 'Error sending greetings' });
  }
});

// 7. GET ALL OCCASIONS
router.get('/occasions', async (req, res) => {
  try {
    const occasions = await GreetingDesign.distinct('occasion');
    res.json({ success: true, data: occasions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching occasions' });
  }
});

// 8. GET ANALYTICS
router.get('/analytics', async (req, res) => {
  try {
    const totalDesigns = await GreetingDesign.countDocuments();
    const activeDesigns = await GreetingDesign.countDocuments({ isActive: true });
    
    const sentStats = await SentGreeting.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          today: {
            $sum: {
              $cond: [
                { $gte: ['$sentAt', new Date(new Date().setHours(0,0,0,0))] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        totalDesigns,
        activeDesigns,
        totalSent: sentStats[0]?.total || 0,
        todaySent: sentStats[0]?.today || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// 9. TRACK SENT GREETING
router.post('/track-send', async (req, res) => {
  try {
    const { designId, clientId, clientName, clientPhone, sentBy, senderName } = req.body;
    
    const sentGreeting = new SentGreeting({
      designId,
      clientId,
      clientName,
      clientPhone,
      sentBy,
      senderName,
      sentAt: new Date(),
      status: 'sent',
      channel: 'whatsapp'
    });
    
    await sentGreeting.save();
    
    // Update design sent count
    await GreetingDesign.findByIdAndUpdate(designId, {
      $inc: {
        'sentCount.total': 1,
        'sentCount.today': 1,
        'sentCount.weekly': 1,
        'sentCount.monthly': 1
      },
      lastSentAt: new Date()
    });
    
    res.json({ success: true, message: 'Send tracked successfully' });
  } catch (error) {
    console.error('Error tracking send:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;