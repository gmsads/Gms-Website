const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  EXTRACTION_STATUS,
  REVIEW_STATUS,
  PAYMENT_VERIFICATION_STATUS,
  GOOGLE_SHEETS_SYNC_STATUS,
} = require('./payment-extractor.constants');

const AuditTrailSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'UPLOADED',
        'OCR_COMPLETED',
        'OCR_FAILED',
        'OCR_RETRIED',
        'EDITED',
        'APPROVED',
        'APPROVED_WITH_DUPLICATE_OVERRIDE',
        'REJECTED',
        'VERIFICATION_STATUS_UPDATED',
        'SYNC_SUCCESS',
        'SYNC_FAILED',
        'SYNC_RETRIED',
      ],
    },
    actorName: { type: String, required: true },
    actorRole: { type: String, default: 'Unknown' },
    reason: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PaymentExtractionSchema = new mongoose.Schema(
  {
    crmPaymentId: {
      type: String,
      unique: true,
      index: true,
      default: () => {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `PAY-${datePart}-${randPart}`;
      },
    },
    image: {
      originalFilename: { type: String, required: true },
      storedFilename: { type: String, required: true },
      storagePath: { type: String, required: true },
      mimeType: { type: String, required: true },
      sizeBytes: { type: Number, required: true },
      sha256Hash: { type: String, required: true, index: true },
      cloudinaryUrl: { type: String, default: null },
      cloudinaryPublicId: { type: String, default: null },
    },
    uploadedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, default: null },
      userName: { type: String, required: true, index: true },
      userRole: { type: String, required: true },
    },
    sourceMetadata: {
      whatsappGroupName: { type: String, default: null, trim: true },
      whatsappSenderName: { type: String, default: null, trim: true },
      notes: { type: String, default: null, trim: true },
    },
    extractedData: {
      payerName: { type: String, default: null, trim: true },
      beneficiaryName: { type: String, default: null, trim: true },
      amount: { type: Number, default: null, index: true },
      currency: { type: String, default: 'INR', trim: true },
      transactionDate: { type: String, default: null, index: true }, // Normalized YYYY-MM-DD
      transactionTime: { type: String, default: null, trim: true },
      transactionId: { type: String, default: null, trim: true, index: true },
      bankReference: { type: String, default: null, trim: true, index: true },
      paymentMethod: { type: String, default: null, trim: true },
      paymentApp: { type: String, default: null, trim: true },
      paymentStatusLabel: { type: String, default: null, trim: true },
    },
    rawOcrText: {
      type: String,
      default: null,
    },
    ocrProvider: {
      type: String,
      default: null,
    },
    confidence: {
      overall: { type: Number, default: 0, min: 0, max: 100 },
      missingFields: [{ type: String }],
      uncertainFields: [{ type: String }],
      needsManualReview: { type: Boolean, default: true },
    },
    extractionStatus: {
      type: String,
      enum: Object.values(EXTRACTION_STATUS),
      default: EXTRACTION_STATUS.PENDING,
      index: true,
    },
    reviewStatus: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING_REVIEW,
      index: true,
    },
    paymentVerificationStatus: {
      type: String,
      enum: Object.values(PAYMENT_VERIFICATION_STATUS),
      default: PAYMENT_VERIFICATION_STATUS.UNVERIFIED,
      index: true,
    },
    duplicateCheck: {
      isDuplicate: { type: Boolean, default: false },
      duplicateType: {
        type: String,
        enum: ['NONE', 'TRANSACTION_ID', 'BANK_REFERENCE', 'IMAGE_HASH', 'AMOUNT_DATE_PAYER_WARNING'],
        default: 'NONE',
      },
      matchedRecordIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PaymentExtraction' }],
      overrideReason: { type: String, default: null },
      overriddenBy: { type: String, default: null },
      overriddenAt: { type: Date, default: null },
    },
    googleSheetsSync: {
      status: {
        type: String,
        enum: Object.values(GOOGLE_SHEETS_SYNC_STATUS),
        default: GOOGLE_SHEETS_SYNC_STATUS.NOT_SYNCED,
        index: true,
      },
      spreadsheetId: { type: String, default: null },
      worksheetName: { type: String, default: null },
      rowReference: { type: String, default: null },
      syncedAt: { type: Date, default: null },
      syncAttempts: { type: Number, default: 0 },
      lastSyncError: { type: String, default: null },
      syncLockUntil: { type: Date, default: null },
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
      default: null,
    },
    approvedBy: {
      userName: { type: String, default: null },
      userRole: { type: String, default: null },
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      userName: { type: String, default: null },
      userRole: { type: String, default: null },
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    verifiedBy: {
      userName: { type: String, default: null },
      userRole: { type: String, default: null },
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    auditTrail: [AuditTrailSchema],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries and duplicate checks
PaymentExtractionSchema.index({ createdAt: -1 });
PaymentExtractionSchema.index({ reviewStatus: 1, extractionStatus: 1 });
PaymentExtractionSchema.index({
  'extractedData.transactionId': 1,
  reviewStatus: 1,
});
PaymentExtractionSchema.index({
  'extractedData.bankReference': 1,
  reviewStatus: 1,
});

module.exports =
  mongoose.models.PaymentExtraction ||
  mongoose.model('PaymentExtraction', PaymentExtractionSchema);
