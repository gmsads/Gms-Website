const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const path = require('path');

console.log('✅ Banner routes file loaded');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all banners
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/banners - Fetching all banners');
    const banners = await Banner.find().sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get active banners for frontend
router.get('/active', async (req, res) => {
  try {
    console.log('GET /api/banners/active - Fetching active banners');
    const banners = await Banner.getActiveBanners();
    res.json({ success: true, banners });
  } catch (error) {
    console.error('Error fetching active banners:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single banner
router.get('/:id', async (req, res) => {
  try {
    console.log('GET /api/banners/:id - Fetching banner:', req.params.id);
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    res.json({ success: true, banner });
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create banner with image upload
router.post('/', upload.single('bannerImage'), async (req, res) => {
  try {
    console.log('POST /api/banners - Creating new banner');
    console.log('Request body:', req.body);
    console.log('File received:', req.file ? 'Yes' : 'No');
    
    const {
      title,
      bannerType,
      startDate,
      endDate,
      specificDate,
      duration,
      durationUnit,
      priority,
      clickUrl,
      description,
      isActive
    } = req.body;

    // Validate required fields
    if (!title || !bannerType) {
      return res.status(400).json({ success: false, message: 'Title and banner type are required' });
    }

    // Validate image
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Banner image is required' });
    }

    // Upload image to Cloudinary
    let result;
    try {
      result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'banners',
            transformation: [{ width: 1920, height: 600, crop: 'fill' }],
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      console.log('Image uploaded to Cloudinary:', result.secure_url);
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to upload image to Cloudinary' });
    }

    // Prepare banner data
    const bannerData = {
      title,
      imageUrl: result.secure_url,
      imagePublicId: result.public_id,
      bannerType,
      priority: parseInt(priority) || 0,
      clickUrl: clickUrl || '',
      description: description || '',
      isActive: isActive === 'true' || isActive === true
    };

    // Add date/duration fields based on type
    switch (bannerType) {
      case 'single_day':
        if (!specificDate) {
          return res.status(400).json({ success: false, message: 'Specific date is required for single day banner' });
        }
        bannerData.specificDate = new Date(specificDate);
        break;
      
      case 'date_range':
        if (!startDate || !endDate) {
          return res.status(400).json({ success: false, message: 'Start date and end date are required for date range banner' });
        }
        bannerData.startDate = new Date(startDate);
        bannerData.endDate = new Date(endDate);
        if (bannerData.startDate > bannerData.endDate) {
          return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
        }
        break;
      
      case 'ongoing':
        if (duration && durationUnit) {
          bannerData.duration = {
            value: parseInt(duration),
            unit: durationUnit
          };
        }
        break;
      
      default:
        return res.status(400).json({ success: false, message: 'Invalid banner type' });
    }

    const banner = new Banner(bannerData);
    await banner.save();
    
    console.log('Banner created successfully:', banner._id);
    res.status(201).json({ success: true, banner, message: 'Banner created successfully' });
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update banner
router.put('/:id', upload.single('bannerImage'), async (req, res) => {
  try {
    console.log('PUT /api/banners/:id - Updating banner:', req.params.id);
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    const {
      title,
      bannerType,
      startDate,
      endDate,
      specificDate,
      duration,
      durationUnit,
      priority,
      clickUrl,
      description,
      isActive
    } = req.body;

    // Update basic fields
    if (title) banner.title = title;
    if (bannerType) banner.bannerType = bannerType;
    if (priority !== undefined) banner.priority = parseInt(priority);
    if (clickUrl !== undefined) banner.clickUrl = clickUrl;
    if (description !== undefined) banner.description = description;
    if (isActive !== undefined) banner.isActive = isActive === 'true' || isActive === true;

    // Handle image upload if new image provided
    if (req.file) {
      console.log('Updating banner image');
      // Delete old image from Cloudinary
      if (banner.imagePublicId) {
        await cloudinary.uploader.destroy(banner.imagePublicId);
      }
      
      // Upload new image
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'banners',
            transformation: [{ width: 1920, height: 600, crop: 'fill' }]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
      
      banner.imageUrl = result.secure_url;
      banner.imagePublicId = result.public_id;
    }

    // Update date/duration fields based on type
    if (bannerType) {
      switch (bannerType) {
        case 'single_day':
          if (specificDate) banner.specificDate = new Date(specificDate);
          banner.startDate = undefined;
          banner.endDate = undefined;
          banner.duration = undefined;
          break;
        
        case 'date_range':
          if (startDate) banner.startDate = new Date(startDate);
          if (endDate) banner.endDate = new Date(endDate);
          banner.specificDate = undefined;
          banner.duration = undefined;
          break;
        
        case 'ongoing':
          if (duration && durationUnit) {
            banner.duration = {
              value: parseInt(duration),
              unit: durationUnit
            };
          }
          banner.startDate = undefined;
          banner.endDate = undefined;
          banner.specificDate = undefined;
          break;
      }
    }

    await banner.save();
    console.log('Banner updated successfully:', banner._id);
    res.json({ success: true, banner, message: 'Banner updated successfully' });
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete banner
router.delete('/:id', async (req, res) => {
  try {
    console.log('DELETE /api/banners/:id - Deleting banner:', req.params.id);
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    // Delete image from Cloudinary
    if (banner.imagePublicId) {
      await cloudinary.uploader.destroy(banner.imagePublicId);
    }

    await banner.deleteOne();
    console.log('Banner deleted successfully:', banner._id);
    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

console.log('✅ Banner routes registered:');
console.log('   - POST   /api/banners/');
console.log('   - GET    /api/banners/');
console.log('   - GET    /api/banners/active');
console.log('   - GET    /api/banners/:id');
console.log('   - PUT    /api/banners/:id');
console.log('   - DELETE /api/banners/:id');

module.exports = router;