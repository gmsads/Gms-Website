const mongoose = require('mongoose');
const path = require('path');
const {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  PAYMENT_VERIFICATION_STATUS,
} = require('./payment-extractor.constants');

/**
 * Inspects magic bytes of an image buffer to verify it is genuinely JPEG, PNG, or WebP.
 */
function verifyImageMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return { valid: false, detectedMime: null };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png' };
  }

  // WebP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: 'image/webp' };
  }

  return { valid: false, detectedMime: null };
}

/**
 * Validates an uploaded Multer file object (memory buffer).
 */
function validateUploadedFile(file) {
  if (!file) {
    return { valid: false, error: 'File is missing' };
  }

  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Unsupported MIME type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size ${(file.size / (1024 * 1024)).toFixed(2)}MB exceeds maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
    };
  }

  const magicCheck = verifyImageMagicBytes(file.buffer);
  if (!magicCheck.valid) {
    return {
      valid: false,
      error: 'Invalid or corrupted image file signature (magic bytes mismatch)',
    };
  }

  return { valid: true, detectedMime: magicCheck.detectedMime };
}

/**
 * Validates MongoDB ObjectId parameter
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Sanitizes and validates editable payment fields payload
 */
function validatePatchPayload(body) {
  const errors = [];
  const updates = {};

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }

  if (body.extractedData && typeof body.extractedData === 'object') {
    const ed = body.extractedData;
    updates.extractedData = {};

    if (ed.payerName !== undefined) {
      updates.extractedData.payerName = ed.payerName ? String(ed.payerName).trim().slice(0, 200) : null;
    }
    if (ed.beneficiaryName !== undefined) {
      updates.extractedData.beneficiaryName = ed.beneficiaryName
        ? String(ed.beneficiaryName).trim().slice(0, 200)
        : null;
    }
    if (ed.amount !== undefined) {
      if (ed.amount === null || ed.amount === '') {
        updates.extractedData.amount = null;
      } else {
        const num = Number(String(ed.amount).replace(/,/g, ''));
        if (Number.isNaN(num) || num < 0 || num > 1000000000) {
          errors.push('Amount must be a valid positive number');
        } else {
          updates.extractedData.amount = Number(num.toFixed(2));
        }
      }
    }
    if (ed.currency !== undefined) {
      updates.extractedData.currency = ed.currency
        ? String(ed.currency).trim().toUpperCase().slice(0, 10)
        : 'INR';
    }
    if (ed.transactionDate !== undefined) {
      updates.extractedData.transactionDate = ed.transactionDate
        ? String(ed.transactionDate).trim().slice(0, 30)
        : null;
    }
    if (ed.transactionTime !== undefined) {
      updates.extractedData.transactionTime = ed.transactionTime
        ? String(ed.transactionTime).trim().slice(0, 30)
        : null;
    }
    if (ed.transactionId !== undefined) {
      // Preserve exact transaction ID characters, only trim outer whitespace
      updates.extractedData.transactionId = ed.transactionId
        ? String(ed.transactionId).trim().slice(0, 120)
        : null;
    }
    if (ed.bankReference !== undefined) {
      updates.extractedData.bankReference = ed.bankReference
        ? String(ed.bankReference).trim().slice(0, 120)
        : null;
    }
    if (ed.paymentMethod !== undefined) {
      updates.extractedData.paymentMethod = ed.paymentMethod
        ? String(ed.paymentMethod).trim().slice(0, 60)
        : null;
    }
    if (ed.paymentApp !== undefined) {
      updates.extractedData.paymentApp = ed.paymentApp
        ? String(ed.paymentApp).trim().slice(0, 80)
        : null;
    }
  }

  if (body.sourceMetadata && typeof body.sourceMetadata === 'object') {
    const sm = body.sourceMetadata;
    updates.sourceMetadata = {};
    if (sm.whatsappGroupName !== undefined) {
      updates.sourceMetadata.whatsappGroupName = sm.whatsappGroupName
        ? String(sm.whatsappGroupName).trim().slice(0, 200)
        : null;
    }
    if (sm.whatsappSenderName !== undefined) {
      updates.sourceMetadata.whatsappSenderName = sm.whatsappSenderName
        ? String(sm.whatsappSenderName).trim().slice(0, 200)
        : null;
    }
    if (sm.notes !== undefined) {
      updates.sourceMetadata.notes = sm.notes ? String(sm.notes).trim().slice(0, 1000) : null;
    }
  }

  if (body.paymentVerificationStatus !== undefined) {
    if (!Object.values(PAYMENT_VERIFICATION_STATUS).includes(body.paymentVerificationStatus)) {
      errors.push(
        `Invalid paymentVerificationStatus. Must be one of: ${Object.values(PAYMENT_VERIFICATION_STATUS).join(', ')}`
      );
    } else {
      updates.paymentVerificationStatus = body.paymentVerificationStatus;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    updates,
  };
}

module.exports = {
  verifyImageMagicBytes,
  validateUploadedFile,
  isValidObjectId,
  validatePatchPayload,
};
