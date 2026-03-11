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
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configured successfully');
  }
} catch (error) {
  console.error('❌ Cloudinary configuration error:', error);
}

// Helper to create storage with error handling
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
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fieldName = file.fieldname || 'document';
        return `${fieldName}-${uniqueSuffix}`;
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

const documentStorage = createStorage(
  'employee-documents',
  ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
  [] // No transformation for documents
);

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
const createUploader = (storage, fileFilter, maxSize, fieldName) => {
  return multer({ 
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: fileFilter
  }).fields(fieldName);
};

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

const uploadDocuments = multer({ 
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: documentFilter
});

const uploadVisit = multer({ 
  storage: visitStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

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
  isCloudinaryConfigured // Export this helper
};