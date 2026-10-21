const PaymentExtraction = require('../payment-extractor.model');
const { EXTRACTION_STATUS } = require('../payment-extractor.constants');
const { readStoredImageBuffer } = require('../services/image-storage.service');
const { extractTextFromImage } = require('../services/ocr.service');
const { parsePaymentText } = require('../services/payment-parser.service');
const { evaluateDuplicates } = require('../services/duplicate-detection.service');

// Lightweight in-process async queue so large batches don't block the Express event loop
const ocrQueue = [];
let activeWorkers = 0;
const MAX_CONCURRENT_OCR = 2;

/**
 * Processes OCR and structured field extraction for a single PaymentExtraction record ID.
 */
async function processPaymentOcrRecord(recordId, actor = { userName: 'System', userRole: 'System' }) {
  const record = await PaymentExtraction.findByIdAndUpdate(
    recordId,
    {
      $set: {
        extractionStatus: EXTRACTION_STATUS.PROCESSING,
        lastError: null,
      },
      $inc: {
        processingAttempts: 1,
      },
    },
    { new: true }
  );

  if (!record) {
    return null;
  }

  try {
    delete require.cache[require.resolve('../services/ocr.service')];
    delete require.cache[require.resolve('../services/payment-parser.service')];
    const { extractTextFromImage: runOcr } = require('../services/ocr.service');
    const { parsePaymentText: runParser } = require('../services/payment-parser.service');

    const imageBuffer = await readStoredImageBuffer(
      record.image.storedFilename,
      record.image.cloudinaryUrl
    );
    const ocrResult = await runOcr(imageBuffer);
    const parsed = runParser(ocrResult.rawText, ocrResult.ocrConfidence);

    // Temporarily attach extractedData to evaluate duplicates
    record.extractedData = parsed.extractedData;
    const dupResult = await evaluateDuplicates(record);

    const updated = await PaymentExtraction.findByIdAndUpdate(
      recordId,
      {
        $set: {
          rawOcrText: ocrResult.rawText,
          ocrProvider: ocrResult.provider,
          extractedData: parsed.extractedData,
          confidence: parsed.confidence,
          extractionStatus: EXTRACTION_STATUS.COMPLETED,
          lastError: null,
          'duplicateCheck.isDuplicate': dupResult.isDuplicate,
          'duplicateCheck.duplicateType': dupResult.duplicateType,
          'duplicateCheck.matchedRecordIds': dupResult.matchedRecordIds,
        },
        $push: {
          auditTrail: {
            action: 'OCR_COMPLETED',
            actorName: actor.userName || 'System',
            actorRole: actor.userRole || 'System',
            details: {
              provider: ocrResult.provider,
              confidence: parsed.confidence.overall,
              isDuplicate: dupResult.isDuplicate,
              duplicateType: dupResult.duplicateType,
            },
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );

    return updated;
  } catch (err) {
    const safeError = String(err.message || 'OCR extraction failed').slice(0, 500);
    const updated = await PaymentExtraction.findByIdAndUpdate(
      recordId,
      {
        $set: {
          extractionStatus: EXTRACTION_STATUS.FAILED,
          lastError: safeError,
        },
        $push: {
          auditTrail: {
            action: 'OCR_FAILED',
            actorName: actor.userName || 'System',
            actorRole: actor.userRole || 'System',
            reason: safeError,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );
    return updated;
  }
}

function drainQueue() {
  while (activeWorkers < MAX_CONCURRENT_OCR && ocrQueue.length > 0) {
    const job = ocrQueue.shift();
    activeWorkers++;
    processPaymentOcrRecord(job.recordId, job.actor)
      .then((res) => {
        if (job.resolve) job.resolve(res);
      })
      .catch((err) => {
        if (job.reject) job.reject(err);
      })
      .finally(() => {
        activeWorkers--;
        setImmediate(drainQueue);
      });
  }
}

/**
 * Enqueues a payment record for asynchronous background OCR processing.
 * Returns a promise that resolves when processing completes (callers may choose not to await it).
 */
function enqueuePaymentOcrJob(recordId, actor) {
  return new Promise((resolve, reject) => {
    ocrQueue.push({ recordId, actor, resolve, reject });
    setImmediate(drainQueue);
  });
}

module.exports = {
  processPaymentOcrRecord,
  enqueuePaymentOcrJob,
};
