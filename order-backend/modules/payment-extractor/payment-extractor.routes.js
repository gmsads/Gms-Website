const express = require('express');
const multer = require('multer');
const {
  MAX_FILE_SIZE_BYTES,
  MAX_BATCH_FILES,
} = require('./payment-extractor.constants');
const { requirePermission } = require('./payment-extractor.permissions');
const {
  uploadScreenshotsController,
  listExtractionsController,
  getStatsController,
  getGoogleSheetsStatusController,
  getExtractionByIdController,
  updateExtractionController,
  retryOcrController,
  approveExtractionController,
  rejectExtractionController,
  syncToGoogleSheetsController,
  getOriginalImageController,
} = require('./payment-extractor.controller');

const router = express.Router();

// Lightweight in-memory rate limiter for upload and OCR endpoints
const rateBuckets = new Map();
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip || 'local'}:${req.headers['x-user-name'] || 'anon'}`;
    const now = Date.now();
    const entry = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    rateBuckets.set(key, entry);

    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a moment and try again.',
      });
    }
    next();
  };
}

// Configure Multer with memory storage so we can validate per-file magic bytes & size gracefully
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES * 2, // Allow slightly higher in multer so our validator returns structured per-file errors
    files: MAX_BATCH_FILES,
  },
});

function handleMulterUpload(req, res, next) {
  const uploader = uploadMiddleware.array('screenshots', MAX_BATCH_FILES);
  uploader(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `One or more files exceed the maximum size limit (${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`,
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: `Maximum ${MAX_BATCH_FILES} screenshots can be uploaded in a single batch.`,
          });
        }
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error',
      });
    }
    next();
  });
}

// Summary & integration status routes (before /:id)
router.get('/stats', requirePermission('VIEW'), getStatsController);
router.get('/google-sheets/status', requirePermission('VIEW'), getGoogleSheetsStatusController);

// Upload batch of payment screenshots
router.post(
  '/upload',
  rateLimit(30, 60 * 1000),
  requirePermission('UPLOAD'),
  handleMulterUpload,
  uploadScreenshotsController
);

// List paginated payment extraction records
router.get('/', requirePermission('VIEW'), listExtractionsController);

// Single record routes
router.get('/:id', requirePermission('VIEW'), getExtractionByIdController);
router.get('/:id/image', requirePermission('VIEW'), getOriginalImageController);

router.patch('/:id', requirePermission('EDIT'), updateExtractionController);

router.post(
  '/:id/retry-ocr',
  rateLimit(20, 60 * 1000),
  requirePermission('EDIT'),
  retryOcrController
);

router.post('/:id/approve', requirePermission('APPROVE_REJECT'), approveExtractionController);
router.post('/:id/reject', requirePermission('APPROVE_REJECT'), rejectExtractionController);
router.post('/:id/sync', requirePermission('SYNC_SHEETS'), syncToGoogleSheetsController);

module.exports = router;
