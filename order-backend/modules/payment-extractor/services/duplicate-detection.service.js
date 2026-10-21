const PaymentExtraction = require('../payment-extractor.model');
const { REVIEW_STATUS } = require('../payment-extractor.constants');

/**
 * Checks if a payment extraction record is a potential duplicate of existing records.
 *
 * Rules:
 * 1. Exact transaction ID or UTR match.
 * 2. Bank reference number match where available.
 * 3. Image SHA-256 hash match for identical image uploads.
 * 4. Configurable warning based on amount + transactionDate + payerName when transactionId is missing.
 *    (Never treats two payments with the same amount alone as duplicates.)
 */
async function evaluateDuplicates(record) {
  const excludeId = record._id;
  const extracted = record.extractedData || {};
  const sha256Hash = record.image && record.image.sha256Hash;

  const matchedDocs = new Map();
  let primaryType = 'NONE';

  const baseFilter = {
    _id: { $ne: excludeId },
    reviewStatus: { $ne: REVIEW_STATUS.REJECTED },
  };

  // 1. Exact Transaction ID / UTR match
  if (extracted.transactionId && String(extracted.transactionId).trim()) {
    const txnMatches = await PaymentExtraction.find({
      ...baseFilter,
      'extractedData.transactionId': String(extracted.transactionId).trim(),
    })
      .select(
        'crmPaymentId extractedData reviewStatus extractionStatus uploadedBy createdAt image.originalFilename'
      )
      .lean();

    if (txnMatches.length > 0) {
      primaryType = 'TRANSACTION_ID';
      txnMatches.forEach((doc) => matchedDocs.set(String(doc._id), doc));
    }
  }

  // 2. Bank Reference Number match where available
  if (extracted.bankReference && String(extracted.bankReference).trim()) {
    const refMatches = await PaymentExtraction.find({
      ...baseFilter,
      'extractedData.bankReference': String(extracted.bankReference).trim(),
    })
      .select(
        'crmPaymentId extractedData reviewStatus extractionStatus uploadedBy createdAt image.originalFilename'
      )
      .lean();

    if (refMatches.length > 0) {
      if (primaryType === 'NONE') primaryType = 'BANK_REFERENCE';
      refMatches.forEach((doc) => matchedDocs.set(String(doc._id), doc));
    }
  }

  // 3. Exact Image SHA-256 Hash match
  if (sha256Hash) {
    const hashMatches = await PaymentExtraction.find({
      ...baseFilter,
      'image.sha256Hash': sha256Hash,
    })
      .select(
        'crmPaymentId extractedData reviewStatus extractionStatus uploadedBy createdAt image.originalFilename'
      )
      .lean();

    if (hashMatches.length > 0) {
      if (primaryType === 'NONE') primaryType = 'IMAGE_HASH';
      hashMatches.forEach((doc) => matchedDocs.set(String(doc._id), doc));
    }
  }

  // 4. Warning based on Amount + Transaction Date + Payer Name when Transaction ID is missing
  if (
    (!extracted.transactionId || !String(extracted.transactionId).trim()) &&
    typeof extracted.amount === 'number' &&
    extracted.amount > 0 &&
    extracted.transactionDate &&
    extracted.payerName &&
    String(extracted.payerName).trim()
  ) {
    const escapedPayer = String(extracted.payerName)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const compositeMatches = await PaymentExtraction.find({
      ...baseFilter,
      'extractedData.amount': extracted.amount,
      'extractedData.transactionDate': extracted.transactionDate,
      'extractedData.payerName': new RegExp(`^${escapedPayer}$`, 'i'),
    })
      .select(
        'crmPaymentId extractedData reviewStatus extractionStatus uploadedBy createdAt image.originalFilename'
      )
      .lean();

    if (compositeMatches.length > 0) {
      if (primaryType === 'NONE') primaryType = 'AMOUNT_DATE_PAYER_WARNING';
      compositeMatches.forEach((doc) => matchedDocs.set(String(doc._id), doc));
    }
  }

  const matchedRecords = Array.from(matchedDocs.values());
  const isDuplicate = matchedRecords.length > 0;

  return {
    isDuplicate,
    duplicateType: primaryType,
    matchedRecordIds: matchedRecords.map((m) => m._id),
    matchedRecords,
  };
}

module.exports = {
  evaluateDuplicates,
};
