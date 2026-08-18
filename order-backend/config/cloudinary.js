const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Configure Cloudinary with error handling
try {
  if (!isCloudinaryConfigured()) {
    console.error('❌ Cloudinary configuration missing! Please check your environment variables.');
    console.error('Current env:', {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Missing',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing'
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configured successfully');
    
    // Test the configuration
    cloudinary.api.ping()
      .then(result => console.log('✅ Cloudinary connection test passed'))
      .catch(err => console.error('❌ Cloudinary connection test failed:', err.message));
  }
} catch (error) {
  console.error('❌ Cloudinary configuration error:', error);
}

// Helper to create storage with error handling - FIXED VERSION
const createStorage = (folder, allowedFormats, transformation = []) => {
  if (!isCloudinaryConfigured()) {
    console.warn(`⚠️ Cloudinary not configured, ${folder} uploads will fail`);
  }
  
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      allowed_formats: allowedFormats,
      transformation: transformation,
      // FIX: Don't set public_id - let Cloudinary generate it
      // If you need custom naming, use a function that returns a string
      public_id: (req, file) => {
        // Use a simpler naming convention without special characters
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const fieldName = file.fieldname || 'doc';
        return `${fieldName}-${timestamp}-${random}`;
      }
    }
  });
};

// Create storage instances
const greetingStorage = createStorage(
  'greeting-designs',
  ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  [{ width: 1000, height: 1000, crop: 'limit' }]
);

const employeeStorage = createStorage(
  'employee-profiles',
  ['jpg', 'jpeg', 'png', 'gif'],
  [{ width: 500, height: 500, crop: 'limit' }]
);

// FIX: For document storage, use a simpler configuration
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
    resource_type: 'auto',
    // FIX: Use a simpler public_id format
    public_id: (req, file) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const fieldName = file.fieldname || 'doc';
      return `${fieldName}-${timestamp}-${random}`;
    }
  }
});

const visitStorage = createStorage(
  'visits',
  ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  [{ width: 1200, height: 1200, crop: 'limit' }]
);

// File filter functions
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, GIF and PDF files are allowed!'), false);
  }
};

// Create multer upload instances with error handling
const uploadGreeting = multer({ 
  storage: greetingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

const uploadEmployee = multer({ 
  storage: employeeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

// FIX: For documents, use fields() method properly
const uploadDocuments = multer({ 
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: documentFilter
}).fields([
  { name: 'aadhar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'educational', maxCount: 1 },
  { name: 'experience', maxCount: 1 }
]);

const uploadVisit = multer({ 
  storage: visitStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

// Add a test endpoint helper
const testCloudinaryConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test passed');
    return { success: true, result };
  } catch (error) {
    console.error('❌ Cloudinary connection test failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { 
  cloudinary, 
  greetingStorage, 
  employeeStorage,
  documentStorage,
  visitStorage,
  uploadGreeting,
  uploadEmployee,
  uploadDocuments,
  uploadVisit,
  isCloudinaryConfigured,
  testCloudinaryConnection
};