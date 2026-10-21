const fs = require('fs');
const { MAX_OCR_RETRIES } = require('../payment-extractor.constants');

/**
 * Checks whether Google Cloud Vision credentials are configured and available.
 */
function isGoogleVisionConfigured() {
  if (process.env.GOOGLE_VISION_CREDENTIALS_JSON) {
    return true;
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && fs.existsSync(credPath)) {
    return true;
  }
  return false;
}

/**
 * Creates a Google Cloud Vision ImageAnnotatorClient instance safely without logging secrets.
 */
function createVisionClient() {
  const vision = require('@google-cloud/vision');
  if (process.env.GOOGLE_VISION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS_JSON);
    return new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || credentials.project_id,
      credentials,
    });
  }
  return new vision.ImageAnnotatorClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
}

/**
 * Executes an async operation with exponential backoff for transient errors.
 */
async function withRetry(fn, maxRetries = MAX_OCR_RETRIES, baseDelayMs = 400) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const isPermanent =
        err &&
        (err.code === 3 || // INVALID_ARGUMENT
          err.code === 7 || // PERMISSION_DENIED
          err.status === 400 ||
          err.status === 403 ||
          String(err.message || '').includes('UNREADABLE_IMAGE'));

      if (isPermanent || attempt === maxRetries) {
        break;
      }
      const waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

/**
 * Runs local Tesseract.js OCR on an image buffer.
 */
async function runTesseractOcr(imageBuffer) {
  return withRetry(async () => {
    const Tesseract = require('tesseract.js');
    const worker = await Tesseract.createWorker('eng');
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '3',
      });
      const result = await worker.recognize(imageBuffer);
      const rawText = result && result.data && result.data.text ? result.data.text.trim() : '';
      const ocrConfidence =
        result && result.data && typeof result.data.confidence === 'number'
          ? Math.round(result.data.confidence)
          : 0;

      if (!rawText || rawText.length < 3) {
        throw new Error('UNREADABLE_IMAGE: No readable text detected in payment screenshot');
      }

      return {
        rawText,
        provider: 'TESSERACT_FALLBACK',
        ocrConfidence,
      };
    } finally {
      await worker.terminate().catch(() => {});
    }
  });
}

/**
 * Extracts text from a payment screenshot buffer using Google Cloud Vision
 * (`documentTextDetection` with fallback to `textDetection`).
 * If Google Cloud Vision is not configured OR returns a billing/permission error
 * (e.g., when a free service account is configured only for Google Sheets without GCP billing),
 * automatically falls back to local Tesseract.js OCR so extraction works seamlessly.
 */
async function extractTextFromImage(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new Error('UNREADABLE_IMAGE: Image buffer is empty');
  }

  // Allow custom test hook injection for deterministic unit/integration testing without live credentials
  if (typeof global.__MOCK_OCR_PROVIDER__ === 'function') {
    return withRetry(() => global.__MOCK_OCR_PROVIDER__(imageBuffer));
  }

  if (isGoogleVisionConfigured()) {
    try {
      return await withRetry(async () => {
        const client = createVisionClient();
        const [docResult] = await client.documentTextDetection({
          image: { content: imageBuffer },
        });

        const fullTextAnnotation = docResult && docResult.fullTextAnnotation;
        if (fullTextAnnotation && fullTextAnnotation.text && fullTextAnnotation.text.trim()) {
          let confidenceSum = 0;
          let confidenceCount = 0;
          if (Array.isArray(fullTextAnnotation.pages)) {
            for (const page of fullTextAnnotation.pages) {
              if (Array.isArray(page.blocks)) {
                for (const block of page.blocks) {
                  if (typeof block.confidence === 'number') {
                    confidenceSum += block.confidence;
                    confidenceCount++;
                  }
                }
              }
            }
          }
          const ocrConfidence =
            confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) : 90;

          return {
            rawText: fullTextAnnotation.text.trim(),
            provider: 'GOOGLE_CLOUD_VISION_DOCUMENT',
            ocrConfidence,
          };
        }

        // Fallback to standard textDetection
        const [textResult] = await client.textDetection({
          image: { content: imageBuffer },
        });
        const detections = textResult && textResult.textAnnotations;
        if (Array.isArray(detections) && detections.length > 0 && detections[0].description) {
          return {
            rawText: String(detections[0].description).trim(),
            provider: 'GOOGLE_CLOUD_VISION_TEXT',
            ocrConfidence: 85,
          };
        }

        throw new Error('UNREADABLE_IMAGE: No readable text detected in payment screenshot');
      });
    } catch (visionErr) {
      const msg = String(visionErr.message || '');
      if (msg.includes('UNREADABLE_IMAGE')) {
        throw visionErr;
      }
      // If Google Cloud Vision fails due to billing not enabled (code 7 PERMISSION_DENIED) or API disabled,
      // seamlessly fall back to local Tesseract OCR so the user can use free Google Sheets + free local OCR!
      return runTesseractOcr(imageBuffer);
    }
  }

  return runTesseractOcr(imageBuffer);
}

module.exports = {
  isGoogleVisionConfigured,
  extractTextFromImage,
  withRetry,
};
