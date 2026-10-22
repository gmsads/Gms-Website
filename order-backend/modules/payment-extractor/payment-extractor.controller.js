const {
  isValidObjectId,
  validatePatchPayload,
} = require('./payment-extractor.validation');
const { PERMISSION_ROLES } = require('./payment-extractor.permissions');
const {
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
} = require('./payment-extractor.service');

/**
 * POST /api/payment-extractor/upload
 */
async function uploadScreenshotsController(req, res) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one payment screenshot image to upload.',
      });
    }

    const metadata = {
      whatsappGroupName: req.body.whatsappGroupName
        ? String(req.body.whatsappGroupName).trim().slice(0, 200)
        : null,
      whatsappSenderName: req.body.whatsappSenderName
        ? String(req.body.whatsappSenderName).trim().slice(0, 200)
        : null,
      notes: req.body.notes ? String(req.body.notes).trim().slice(0, 1000) : null,
    };

    const syncOcr = req.body.syncOcr === 'true' || req.body.syncOcr === true;

    const { uploadedRecords, failedFiles } = await processBatchUpload(
      files,
      metadata,
      req.crmUser,
      { syncOcr }
    );

    const statusCode =
      uploadedRecords.length === 0 && failedFiles.length > 0 ? 400 : 201;

    return res.status(statusCode).json({
      success: uploadedRecords.length > 0,
      message:
        uploadedRecords.length > 0
          ? `Uploaded ${uploadedRecords.length} payment screenshot(s) for extraction.`
          : 'All uploaded files failed validation.',
      records: uploadedRecords,
      failedFiles,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to upload payment screenshots',
    });
  }
}

/**
 * GET /api/payment-extractor
 */
async function listExtractionsController(req, res) {
  try {
    const result = await listPaymentExtractions(req.query);
    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch payment extraction records',
    });
  }
}

/**
 * GET /api/payment-extractor/stats
 */
async function getStatsController(req, res) {
  try {
    const stats = await getDashboardStats();
    return res.json({
      success: true,
      stats,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch summary statistics',
    });
  }
}

/**
 * GET /api/payment-extractor/google-sheets/status
 */
async function getGoogleSheetsStatusController(req, res) {
  try {
    const status = getIntegrationStatus();
    return res.json({
      success: true,
      ...status,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch Google Sheets integration status',
    });
  }
}

/**
 * GET /api/payment-extractor/:id
 */
async function getExtractionByIdController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const record = await getPaymentExtractionById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Payment extraction record not found' });
    }

    return res.json({
      success: true,
      record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to fetch payment extraction record',
    });
  }
}

/**
 * PATCH /api/payment-extractor/:id
 */
async function updateExtractionController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const validation = validatePatchPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join('; '),
        errors: validation.errors,
      });
    }

    // Enforce strict role check if changing bank/payment verification reconciliation status
    if (
      validation.updates.paymentVerificationStatus &&
      !PERMISSION_ROLES.RECONCILE_VERIFICATION.includes(req.crmUser.userRole)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only Admin or Account roles can update bank payment verification status.',
      });
    }

    const updated = await updatePaymentExtraction(id, validation.updates, req.crmUser);
    return res.json({
      success: true,
      message: 'Payment extraction record updated successfully.',
      record: updated,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to update payment extraction record',
    });
  }
}

/**
 * POST /api/payment-extractor/:id/retry-ocr
 */
async function retryOcrController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const updated = await retryOcrForRecord(id, req.crmUser);
    return res.json({
      success: true,
      message: 'OCR extraction retried.',
      record: updated,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retry OCR extraction',
    });
  }
}

/**
 * POST /api/payment-extractor/:id/approve
 */
async function approveExtractionController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const { record, syncOutcome } = await approvePaymentExtraction(
      id,
      req.body || {},
      req.crmUser
    );

    return res.json({
      success: true,
      message:
        syncOutcome && syncOutcome.syncSuccess
          ? 'Payment record approved and synchronized to Google Sheets.'
          : 'Payment record approved. Google Sheets synchronization status updated.',
      record,
      syncOutcome,
    });
  } catch (err) {
    if (err.isDuplicateConflict) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_DETECTED',
        message: err.message,
        duplicateCheck: err.duplicateCheck,
      });
    }
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to approve payment extraction record',
    });
  }
}

/**
 * POST /api/payment-extractor/:id/reject
 */
async function rejectExtractionController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const reason = req.body && req.body.reason;
    const updated = await rejectPaymentExtraction(id, reason, req.crmUser);

    return res.json({
      success: true,
      message: 'Payment extraction record rejected.',
      record: updated,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to reject payment extraction record',
    });
  }
}

/**
 * POST /api/payment-extractor/:id/sync
 */
async function syncToGoogleSheetsController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const { record, syncOutcome } = await retryGoogleSheetsSync(id, req.crmUser);
    const ok = syncOutcome && (syncOutcome.syncSuccess || syncOutcome.alreadySynced);

    return res.status(ok ? 200 : 502).json({
      success: Boolean(ok),
      message: ok
        ? 'Synchronized to Google Sheets successfully.'
        : `Google Sheets synchronization failed: ${(syncOutcome && syncOutcome.error) || 'Unknown error'}`,
      record,
      syncOutcome,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to synchronize to Google Sheets',
    });
  }
}

/**
 * GET /api/payment-extractor/:id/image
 */
async function getOriginalImageController(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid record ID' });
    }

    const { buffer, mimeType, originalFilename } = await getOriginalScreenshotStreamData(id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(originalFilename)}"`
    );
    return res.send(buffer);
  } catch (err) {
    return res.status(err.statusCode || 404).json({
      success: false,
      message: err.message || 'Image not found',
    });
  }
}

module.exports = {
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
};
