const PaymentExtraction = require('../payment-extractor.model');
const {
  REVIEW_STATUS,
  GOOGLE_SHEETS_SYNC_STATUS,
} = require('../payment-extractor.constants');
const { appendApprovedPaymentToSheet } = require('./google-sheets.service');

/**
 * Synchronizes an approved payment extraction record to Google Sheets with
 * atomic MongoDB lock protection to prevent concurrent duplicate row writes.
 */
async function syncRecordToGoogleSheets(recordId, actor = { userName: 'System', userRole: 'System' }) {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + 60 * 1000); // 60s lock

  // Atomically acquire lock only if record is APPROVED and not already SYNCED or actively locked
  const lockedRecord = await PaymentExtraction.findOneAndUpdate(
    {
      _id: recordId,
      reviewStatus: REVIEW_STATUS.APPROVED,
      'googleSheetsSync.status': { $ne: GOOGLE_SHEETS_SYNC_STATUS.SYNCED },
      $or: [
        { 'googleSheetsSync.syncLockUntil': null },
        { 'googleSheetsSync.syncLockUntil': { $lt: now } },
      ],
    },
    {
      $set: {
        'googleSheetsSync.status': GOOGLE_SHEETS_SYNC_STATUS.SYNC_PENDING,
        'googleSheetsSync.syncLockUntil': lockExpiry,
      },
      $inc: {
        'googleSheetsSync.syncAttempts': 1,
      },
    },
    { new: true }
  );

  if (!lockedRecord) {
    const current = await PaymentExtraction.findById(recordId);
    if (!current) {
      throw new Error('Payment extraction record not found');
    }
    if (current.reviewStatus !== REVIEW_STATUS.APPROVED) {
      throw new Error('Only APPROVED payment records can be synchronized to Google Sheets');
    }
    if (current.googleSheetsSync && current.googleSheetsSync.status === GOOGLE_SHEETS_SYNC_STATUS.SYNCED) {
      return {
        alreadySynced: true,
        record: current,
      };
    }
    return {
      syncInProgress: true,
      record: current,
    };
  }

  try {
    const syncResult = await appendApprovedPaymentToSheet(lockedRecord);

    const updated = await PaymentExtraction.findByIdAndUpdate(
      recordId,
      {
        $set: {
          'googleSheetsSync.status': GOOGLE_SHEETS_SYNC_STATUS.SYNCED,
          'googleSheetsSync.spreadsheetId': syncResult.spreadsheetId,
          'googleSheetsSync.worksheetName': syncResult.worksheetName,
          'googleSheetsSync.rowReference': syncResult.rowReference,
          'googleSheetsSync.syncedAt': syncResult.syncedAt,
          'googleSheetsSync.lastSyncError': null,
          'googleSheetsSync.syncLockUntil': null,
        },
        $push: {
          auditTrail: {
            action: 'SYNC_SUCCESS',
            actorName: actor.userName || 'System',
            actorRole: actor.userRole || 'System',
            details: {
              spreadsheetId: syncResult.spreadsheetId,
              worksheetName: syncResult.worksheetName,
              rowReference: syncResult.rowReference,
              reconciledExistingRow: syncResult.reconciledExistingRow,
            },
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    return {
      alreadySynced: false,
      syncSuccess: true,
      record: updated,
    };
  } catch (err) {
    const safeErrorMessage = String(err.message || 'Google Sheets sync failed').slice(0, 500);

    const updated = await PaymentExtraction.findByIdAndUpdate(
      recordId,
      {
        $set: {
          'googleSheetsSync.status': GOOGLE_SHEETS_SYNC_STATUS.SYNC_FAILED,
          'googleSheetsSync.lastSyncError': safeErrorMessage,
          'googleSheetsSync.syncLockUntil': null,
        },
        $push: {
          auditTrail: {
            action: 'SYNC_FAILED',
            actorName: actor.userName || 'System',
            actorRole: actor.userRole || 'System',
            reason: safeErrorMessage,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    return {
      alreadySynced: false,
      syncSuccess: false,
      error: safeErrorMessage,
      record: updated,
    };
  }
}

module.exports = {
  syncRecordToGoogleSheets,
};
