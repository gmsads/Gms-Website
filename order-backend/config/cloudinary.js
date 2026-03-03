// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for greeting designs
const greetingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'greeting-designs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `greeting-${uniqueSuffix}`;
    }
  }
});

// Storage for employee profiles
const employeeStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee-profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `employee-${uniqueSuffix}`;
    }
  }
});

// Storage for employee documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'employee-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fieldName = file.fieldname || 'document';
      return `${fieldName}-${uniqueSuffix}`;
    }
  }
});

// Storage for visit photos
const visitStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'visits',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `visit-${uniqueSuffix}`;
    }
  }
});

// Create multer upload instances
const uploadGreeting = multer({ 
  storage: greetingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const uploadEmployee = multer({ 
  storage: employeeStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const uploadDocuments = multer({ 
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, GIF and PDF files are allowed!'), false);
    }
  }
});

const uploadVisit = multer({ 
  storage: visitStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// SINGLE module.exports with ALL exports
module.exports = { 
  cloudinary, 
  greetingStorage, 
  employeeStorage,
  documentStorage,
  visitStorage,
  uploadGreeting,
  uploadEmployee,
  uploadDocuments,
  uploadVisit 
};