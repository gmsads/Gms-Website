const PaymentExtraction = require('./payment-extractor.model');
const {
  EXTRACTION_STATUS,
  REVIEW_STATUS,
  PAYMENT_VERIFICATION_STATUS,
  GOOGLE_SHEETS_SYNC_STATUS,
} = require('./payment-extractor.constants');
const { validateUploadedFile } = require('./payment-extractor.validation');
const { saveImageSecurely, readStoredImageBuffer } = require('./services/image-storage.service');
const { evaluateDuplicates } = require('./services/duplicate-detection.service');
const { getGoogleSheetsIntegrationStatus } = require('./services/google-sheets.service');
const { isGoogleVisionConfigured } = require('./services/ocr.service');
const { processPaymentOcrRecord, enqueuePaymentOcrJob } = require('./jobs/payment-ocr.job');
const { enqueuePaymentSyncJob } = require('./jobs/payment-sync.job');
const { syncRecordToGoogleSheets } = require('./services/payment-sync.service');

/**
 * Handles a batch of uploaded files:
 * - Validates each file independently so one invalid file does not fail the entire batch.
 * - Stores valid images securely in private storage.
 * - Creates a PaymentExtraction record with status PROCESSING.
 * - Enqueues background OCR (or awaits if synchronous mode is requested).
 */
async function processBatchUpload(files, metadata, crmUser, options = {}) {
  const results = [];
  const errors = [];

  for (const file of files) {
    const validation = validateUploadedFile(file);
    if (!validation.valid) {
      errors.push({
        originalFilename: file ? file.originalname : 'Unknown',
        error: validation.error,
      });
      continue;
    }

    try {
      const savedImage = await saveImageSecurely(
        file.buffer,
        file.originalname,
        validation.detectedMime || file.mimetype
      );

      const newRecord = await PaymentExtraction.create({
        image: savedImage,
        uploadedBy: {
          userId: crmUser.userId || null,
          userName: crmUser.userName,
          userRole: crmUser.userRole,
        },
        sourceMetadata: {
          whatsappGroupName: metadata.whatsappGroupName || null,
          whatsappSenderName: metadata.whatsappSenderName || null,
          notes: metadata.notes || null,
        },
        extractionStatus: EXTRACTION_STATUS.PROCESSING,
        reviewStatus: REVIEW_STATUS.PENDING_REVIEW,
        paymentVerificationStatus: PAYMENT_VERIFICATION_STATUS.UNVERIFIED,
        googleSheetsSync: {
          status: GOOGLE_SHEETS_SYNC_STATUS.NOT_SYNCED,
        },
        auditTrail: [
          {
            action: 'UPLOADED',
            actorName: crmUser.userName,
            actorRole: crmUser.userRole,
            details: {
              originalFilename: savedImage.originalFilename,
              sizeBytes: savedImage.sizeBytes,
            },
            timestamp: new Date(),
          },
        ],
      });

      if (options.syncOcr) {
        const processed = await processPaymentOcrRecord(newRecord._id, crmUser);
        results.push(processed || newRecord);
      } else {
        // Trigger background OCR job without blocking the HTTP response
        enqueuePaymentOcrJob(newRecord._id, crmUser).catch(() => {});
        results.push(newRecord);
      }
    } catch (err) {
      errors.push({
        originalFilename: file ? file.originalname : 'Unknown',
        error: String(err.message || 'Failed to save upload'),
      });
    }
  }

  return {
    uploadedRecords: results,
    failedFiles: errors,
  };
}

/**
 * Lists paginated payment extraction records with search, status, and date filters.
 */
async function listPaymentExtractions(queryParams = {}) {
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};

  if (queryParams.extractionStatus) {
    filter.extractionStatus = queryParams.extractionStatus;
  }
  if (queryParams.reviewStatus) {
    filter.reviewStatus = queryParams.reviewStatus;
  }
  if (queryParams.paymentVerificationStatus) {
    filter.paymentVerificationStatus = queryParams.paymentVerificationStatus;
  }
  if (queryParams.syncStatus) {
    filter['googleSheetsSync.status'] = queryParams.syncStatus;
  }
  if (queryParams.isDuplicate === 'true') {
    filter['duplicateCheck.isDuplicate'] = true;
  }

  if (queryParams.startDate || queryParams.endDate) {
    filter.createdAt = {};
    if (queryParams.startDate) {
      filter.createdAt.$gte = new Date(`${queryParams.startDate}T00:00:00.000Z`);
    }
    if (queryParams.endDate) {
      filter.createdAt.$lte = new Date(`${queryParams.endDate}T23:59:59.999Z`);
    }
  }

  if (queryParams.search && String(queryParams.search).trim()) {
    const escaped = String(queryParams.search)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    filter.$or = [
      { crmPaymentId: rx },
      { 'extractedData.transactionId': rx },
      { 'extractedData.bankReference': rx },
      { 'extractedData.payerName': rx },
      { 'extractedData.beneficiaryName': rx },
      { 'sourceMetadata.whatsappGroupName': rx },
      { 'sourceMetadata.whatsappSenderName': rx },
      { 'uploadedBy.userName': rx },
      { 'image.originalFilename': rx },
    ];
  }

  const [records, totalCount] = await Promise.all([
    PaymentExtraction.find(filter)
      .populate(
        'duplicateCheck.matchedRecordIds',
        'crmPaymentId extractedData reviewStatus createdAt uploadedBy image.originalFilename'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PaymentExtraction.countDocuments(filter),
  ]);

  return {
    records,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  };
}

/**
 * Retrieves a single payment extraction record by ID with populated duplicate matches.
 */
async function getPaymentExtractionById(id) {
  return PaymentExtraction.findById(id)
    .populate(
      'duplicateCheck.matchedRecordIds',
      'crmPaymentId extractedData reviewStatus createdAt uploadedBy image.originalFilename'
    )
    .lean();
}

/**
 * Updates editable fields on a payment extraction record before approval (or reconciliation status).
 * Re-runs duplicate detection whenever extractedData is modified.
 */
async function updatePaymentExtraction(id, updates, crmUser) {
  const existing = await PaymentExtraction.findById(id);
  if (!existing) {
    const err = new Error('Payment extraction record not found');
    err.statusCode = 404;
    throw err;
  }

  // If record is already APPROVED, only allow paymentVerificationStatus reconciliation by authorized roles
  if (existing.reviewStatus === REVIEW_STATUS.APPROVED) {
    if (updates.extractedData || updates.sourceMetadata) {
      const err = new Error('Approved payment records cannot have their core extracted fields modified');
      err.statusCode = 400;
      throw err;
    }
  }

  const changedFields = {};

  if (updates.extractedData) {
    for (const [key, val] of Object.entries(updates.extractedData)) {
      existing.extractedData[key] = val;
      changedFields[`extractedData.${key}`] = val;
    }

    // Recompute missing fields list
    const missing = [];
    if (existing.extractedData.amount === null || existing.extractedData.amount === undefined) {
      missing.push('amount');
    }
    if (!existing.extractedData.transactionId) missing.push('transactionId');
    if (!existing.extractedData.transactionDate) missing.push('transactionDate');
    if (!existing.extractedData.payerName) missing.push('payerName');
    if (!existing.extractedData.beneficiaryName) missing.push('beneficiaryName');
    existing.confidence.missingFields = missing;
    // Remove edited fields from uncertainFields
    existing.confidence.uncertainFields = (existing.confidence.uncertainFields || []).filter(
      (f) => !(f in updates.extractedData)
    );
  }

  if (updates.sourceMetadata) {
    for (const [key, val] of Object.entries(updates.sourceMetadata)) {
      existing.sourceMetadata[key] = val;
      changedFields[`sourceMetadata.${key}`] = val;
    }
  }

  if (updates.paymentVerificationStatus) {
    existing.paymentVerificationStatus = updates.paymentVerificationStatus;
    existing.verifiedBy = {
      userName: crmUser.userName,
      userRole: crmUser.userRole,
    };
    existing.verifiedAt = new Date();
    changedFields.paymentVerificationStatus = updates.paymentVerificationStatus;
  }

  // Re-evaluate duplicate check if extractedData was edited
  if (updates.extractedData) {
    const dupResult = await evaluateDuplicates(existing);
    existing.duplicateCheck.isDuplicate = dupResult.isDuplicate;
    existing.duplicateCheck.duplicateType = dupResult.duplicateType;
    existing.duplicateCheck.matchedRecordIds = dupResult.matchedRecordIds;
  }

  existing.auditTrail.push({
    action: updates.paymentVerificationStatus && !updates.extractedData
      ? 'VERIFICATION_STATUS_UPDATED'
      : 'EDITED',
    actorName: crmUser.userName,
    actorRole: crmUser.userRole,
    details: changedFields,
    timestamp: new Date(),
  });

  await existing.save();
  return getPaymentExtractionById(id);
}

/**
 * Approves a payment extraction record with concurrency protection and duplicate verification:
 * - Checks duplicate detection before approving.
 * - If duplicate is detected and `overrideDuplicate` is not true with a valid `overrideReason`, returns 409 Conflict with matched records.
 * - Atomically transitions reviewStatus from PENDING_REVIEW to APPROVED so two concurrent approvals cannot both win.
 * - Never automatically marks `paymentVerificationStatus` as VERIFIED.
 * - Triggers Google Sheets synchronization.
 */
async function approvePaymentExtraction(id, body = {}, crmUser) {
  const existing = await PaymentExtraction.findById(id);
  if (!existing) {
    const err = new Error('Payment extraction record not found');
    err.statusCode = 404;
    throw err;
  }

  if (existing.reviewStatus === REVIEW_STATUS.APPROVED) {
    const err = new Error('This payment record has already been approved');
    err.statusCode = 409;
    err.alreadyApproved = true;
    throw err;
  }

  if (existing.reviewStatus === REVIEW_STATUS.REJECTED) {
    const err = new Error('Rejected payment records cannot be approved');
    err.statusCode = 400;
    throw err;
  }

  // Validate required fields before approval
  const amount = existing.extractedData && existing.extractedData.amount;
  if (typeof amount !== 'number' || amount <= 0) {
    const err = new Error('A valid positive payment amount is required before approving');
    err.statusCode = 400;
    throw err;
  }

  // Fresh duplicate check right before approval
  const dupResult = await evaluateDuplicates(existing);
  const overrideDuplicate = Boolean(body.overrideDuplicate);
  const overrideReason = body.overrideReason ? String(body.overrideReason).trim() : '';

  if (dupResult.isDuplicate) {
    if (!overrideDuplicate || overrideReason.length < 3) {
      // Persist duplicate detection state on record so reviewer can inspect it
      await PaymentExtraction.findByIdAndUpdate(id, {
        $set: {
          'duplicateCheck.isDuplicate': true,
          'duplicateCheck.duplicateType': dupResult.duplicateType,
          'duplicateCheck.matchedRecordIds': dupResult.matchedRecordIds,
        },
      });

      const err = new Error(
        `Potential duplicate payment detected (${dupResult.duplicateType}). Please inspect the matched record or provide an override reason.`
      );
      err.statusCode = 409;
      err.isDuplicateConflict = true;
      err.duplicateCheck = dupResult;
      throw err;
    }
  }

  const now = new Date();
  const auditEntry = {
    action: dupResult.isDuplicate ? 'APPROVED_WITH_DUPLICATE_OVERRIDE' : 'APPROVED',
    actorName: crmUser.userName,
    actorRole: crmUser.userRole,
    reason: dupResult.isDuplicate ? overrideReason : null,
    details: {
      duplicateType: dupResult.duplicateType,
      matchedRecordIds: dupResult.matchedRecordIds,
    },
    timestamp: now,
  };

  // Atomic state transition from PENDING_REVIEW -> APPROVED
  const approvedRecord = await PaymentExtraction.findOneAndUpdate(
    {
      _id: id,
      reviewStatus: REVIEW_STATUS.PENDING_REVIEW,
    },
    {
      $set: {
        reviewStatus: REVIEW_STATUS.APPROVED,
        approvedBy: {
          userName: crmUser.userName,
          userRole: crmUser.userRole,
        },
        approvedAt: now,
        'duplicateCheck.isDuplicate': dupResult.isDuplicate,
        'duplicateCheck.duplicateType': dupResult.duplicateType,
        'duplicateCheck.matchedRecordIds': dupResult.matchedRecordIds,
        'duplicateCheck.overrideReason': dupResult.isDuplicate ? overrideReason : null,
        'duplicateCheck.overriddenBy': dupResult.isDuplicate ? crmUser.userName : null,
        'duplicateCheck.overriddenAt': dupResult.isDuplicate ? now : null,
        'googleSheetsSync.status': GOOGLE_SHEETS_SYNC_STATUS.SYNC_PENDING,
      },
      $push: {
        auditTrail: auditEntry,
      },
    },
    { new: true }
  );

  if (!approvedRecord) {
    const err = new Error('Concurrent approval detected: record was already processed');
    err.statusCode = 409;
    err.alreadyApproved = true;
    throw err;
  }

  // Trigger Google Sheets synchronization (durable: if it fails, record stays APPROVED with SYNC_FAILED)
  let syncOutcome = null;
  if (body.asyncSync) {
    enqueuePaymentSyncJob(approvedRecord._id, crmUser).catch(() => {});
  } else {
    syncOutcome = await syncRecordToGoogleSheets(approvedRecord._id, crmUser);
  }

  const finalRecord = await getPaymentExtractionById(id);
  return {
    record: finalRecord,
    syncOutcome,
  };
}

/**
 * Rejects a payment extraction record with a mandatory reason.
 */
async function rejectPaymentExtraction(id, reason, crmUser) {
  const cleanReason = reason ? String(reason).trim() : '';
  if (cleanReason.length < 2) {
    const err = new Error('A rejection reason is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await PaymentExtraction.findById(id);
  if (!existing) {
    const err = new Error('Payment extraction record not found');
    err.statusCode = 404;
    throw err;
  }

  if (existing.reviewStatus === REVIEW_STATUS.APPROVED) {
    const err = new Error('Approved payment records cannot be rejected');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  const updated = await PaymentExtraction.findOneAndUpdate(
    {
      _id: id,
      reviewStatus: { $ne: REVIEW_STATUS.APPROVED },
    },
    {
      $set: {
        reviewStatus: REVIEW_STATUS.REJECTED,
        rejectedBy: {
          userName: crmUser.userName,
          userRole: crmUser.userRole,
        },
        rejectedAt: now,
        rejectionReason: cleanReason,
      },
      $push: {
        auditTrail: {
          action: 'REJECTED',
          actorName: crmUser.userName,
          actorRole: crmUser.userRole,
          reason: cleanReason,
          timestamp: now,
        },
      },
    },
    { new: true }
  );

  return updated;
}

/**
 * Retries OCR extraction on a record.
 */
async function retryOcrForRecord(id, crmUser) {
  const existing = await PaymentExtraction.findById(id);
  if (!existing) {
    const err = new Error('Payment extraction record not found');
    err.statusCode = 404;
    throw err;
  }

  if (existing.reviewStatus === REVIEW_STATUS.APPROVED) {
    const err = new Error('Cannot re-run OCR on an already approved record');
    err.statusCode = 400;
    throw err;
  }

  await PaymentExtraction.findByIdAndUpdate(id, {
    $push: {
      auditTrail: {
        action: 'OCR_RETRIED',
        actorName: crmUser.userName,
        actorRole: crmUser.userRole,
        timestamp: new Date(),
      },
    },
  });

  const updated = await processPaymentOcrRecord(id, crmUser);
  return getPaymentExtractionById(updated ? updated._id : id);
}

/**
 * Retries Google Sheets synchronization for an approved record.
 */
async function retryGoogleSheetsSync(id, crmUser) {
  const existing = await PaymentExtraction.findById(id);
  if (!existing) {
    const err = new Error('Payment extraction record not found');
    err.statusCode = 404;
    throw err;
  }

  if (existing.reviewStatus !== REVIEW_STATUS.APPROVED) {
    const err = new Error('Only APPROVED payment records can be synchronized to Google Sheets');
    err.statusCode = 400;
    throw err;
  }

  await PaymentExtraction.findByIdAndUpdate(id, {
    $push: {
      auditTrail: {
        action: 'SYNC_RETRIED',
        actorName: crmUser.userName,
        actorRole: crmUser.userRole,
        timestamp: new Date(),
      },
    },
  });

  const syncOutcome = await syncRecordToGoogleSheets(id, crmUser);
  const updated = await getPaymentExtractionById(id);
  return {
    record: updated,
    syncOutcome,
  };
}

/**
 * Reads the original screenshot buffer for secure streaming to authorized CRM users.
 */
async function getOriginalScreenshotStreamData(id) {
  const record = await PaymentExtraction.findById(id).select('image').lean();
  if (!record || !record.image || (!record.image.storedFilename && !record.image.cloudinaryUrl)) {
    const err = new Error('Payment screenshot not found');
    err.statusCode = 404;
    throw err;
  }

  const buffer = await readStoredImageBuffer(
    record.image.storedFilename,
    record.image.cloudinaryUrl
  );
  return {
    buffer,
    mimeType: record.image.mimeType || 'image/jpeg',
    originalFilename: record.image.originalFilename || 'payment-screenshot.jpg',
  };
}

/**
 * Computes dashboard summary card statistics required in Section 3:
 * - Total uploaded images
 * - Successfully extracted records
 * - Records awaiting verification (PENDING_REVIEW)
 * - Approved records
 * - Failed extractions
 * - Successfully synchronized records
 */
async function getDashboardStats() {
  const [
    totalUploaded,
    successfullyExtracted,
    awaitingVerification,
    approvedRecords,
    rejectedRecords,
    failedExtractions,
    successfullySynchronized,
    syncFailed,
    duplicatesFlagged,
  ] = await Promise.all([
    PaymentExtraction.countDocuments({}),
    PaymentExtraction.countDocuments({ extractionStatus: EXTRACTION_STATUS.COMPLETED }),
    PaymentExtraction.countDocuments({ reviewStatus: REVIEW_STATUS.PENDING_REVIEW }),
    PaymentExtraction.countDocuments({ reviewStatus: REVIEW_STATUS.APPROVED }),
    PaymentExtraction.countDocuments({ reviewStatus: REVIEW_STATUS.REJECTED }),
    PaymentExtraction.countDocuments({ extractionStatus: EXTRACTION_STATUS.FAILED }),
    PaymentExtraction.countDocuments({
      'googleSheetsSync.status': GOOGLE_SHEETS_SYNC_STATUS.SYNCED,
    }),
    PaymentExtraction.countDocuments({
      'googleSheetsSync.status': GOOGLE_SHEETS_SYNC_STATUS.SYNC_FAILED,
    }),
    PaymentExtraction.countDocuments({
      'duplicateCheck.isDuplicate': true,
      reviewStatus: REVIEW_STATUS.PENDING_REVIEW,
    }),
  ]);

  return {
    totalUploaded,
    successfullyExtracted,
    awaitingVerification,
    approvedRecords,
    rejectedRecords,
    failedExtractions,
    successfullySynchronized,
    syncFailed,
    duplicatesFlagged,
  };
}

/**
 * Returns integration status for both Google Sheets and Google Cloud Vision OCR.
 */
function getIntegrationStatus() {
  const sheetsStatus = getGoogleSheetsIntegrationStatus();
  const visionConfigured = isGoogleVisionConfigured();

  return {
    googleSheets: sheetsStatus,
    ocr: {
      googleCloudVisionConfigured: visionConfigured,
      activeProvider: visionConfigured ? 'GOOGLE_CLOUD_VISION' : 'TESSERACT_FALLBACK',
    },
  };
}

module.exports = {
  processBatchUpload,
  listPaymentExtractions,
  getPaymentExtractionById,
  updatePaymentExtraction,
  approvePaymentExtraction,
  rejectPaymentExtraction,
  retryOcrForRecord,
  retryGoogleSheetsSync,
  getOriginalScreenshotStreamData,
  getDashboardStats,
  getIntegrationStatus,
};
