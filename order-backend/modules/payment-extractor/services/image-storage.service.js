const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cloudinary, isCloudinaryConfigured } = require('../../../config/cloudinary');

// Private directory outside the publicly exposed /uploads folder
const PRIVATE_STORAGE_ROOT = path.resolve(
  process.cwd(),
  'private_uploads',
  'payment_screenshots'
);

function ensureStorageDir() {
  if (!fs.existsSync(PRIVATE_STORAGE_ROOT)) {
    fs.mkdirSync(PRIVATE_STORAGE_ROOT, { recursive: true });
  }
}

/**
 * Computes SHA-256 hash of a file buffer for exact image deduplication.
 */
function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates a safe filename preventing path traversal or unsafe characters.
 */
function generateSafeFilename(originalFilename) {
  const ext = path
    .extname(originalFilename || '.jpg')
    .toLowerCase()
    .replace(/[^.a-z0-9]/g, '');
  const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
  const timestamp = Date.now();
  const rand = crypto.randomBytes(8).toString('hex');
  return `pmt_${timestamp}_${rand}${safeExt}`;
}

/**
 * Uploads image buffer to Cloudinary under the `payment-screenshots` folder so images persist across cloud deployments.
 */
async function uploadBufferToCloudinary(fileBuffer, storedFilename) {
  if (
    !isCloudinaryConfigured() ||
    process.env.NODE_ENV === 'test' ||
    typeof global.__MOCK_OCR_PROVIDER__ === 'function'
  ) {
    return null;
  }

  try {
    const publicIdBase = path.basename(storedFilename, path.extname(storedFilename));
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'payment-screenshots',
          public_id: publicIdBase,
          resource_type: 'image',
        },
        (error, res) => {
          if (error) reject(error);
          else resolve(res);
        }
      );
      stream.end(fileBuffer);
    });

    return {
      cloudinaryUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
    };
  } catch (err) {
    console.error('Cloudinary upload warning (falling back to local storage):', err.message);
    return null;
  }
}

/**
 * Saves an uploaded image buffer to Cloudinary (for permanent persistence after deployment)
 * and also caches locally in private storage.
 */
async function saveImageSecurely(fileBuffer, originalFilename, mimeType) {
  ensureStorageDir();
  const sha256Hash = computeSha256(fileBuffer);
  const storedFilename = generateSafeFilename(originalFilename);
  const fullPath = path.resolve(PRIVATE_STORAGE_ROOT, storedFilename);

  // Path traversal defense check
  if (!fullPath.startsWith(PRIVATE_STORAGE_ROOT)) {
    throw new Error('Unsafe storage path detected');
  }

  await fs.promises.writeFile(fullPath, fileBuffer, { mode: 0o600 });

  // Also upload to Cloudinary so the image is saved in Cloudinary + MongoDB for post-deployment persistence
  const cloudResult = await uploadBufferToCloudinary(fileBuffer, storedFilename);

  return {
    originalFilename: path.basename(originalFilename || 'screenshot.jpg'),
    storedFilename,
    storagePath: cloudResult ? cloudResult.cloudinaryUrl : storedFilename,
    mimeType,
    sizeBytes: fileBuffer.length,
    sha256Hash,
    cloudinaryUrl: cloudResult ? cloudResult.cloudinaryUrl : null,
    cloudinaryPublicId: cloudResult ? cloudResult.cloudinaryPublicId : null,
  };
}

/**
 * Resolves and validates the absolute path to a stored image, preventing path traversal.
 */
function resolveSafeImagePath(storedFilename) {
  ensureStorageDir();
  const sanitizedName = path.basename(String(storedFilename || ''));
  const resolved = path.resolve(PRIVATE_STORAGE_ROOT, sanitizedName);
  if (!resolved.startsWith(PRIVATE_STORAGE_ROOT)) {
    throw new Error('Path traversal attempt blocked');
  }
  return resolved;
}

/**
 * Reads the stored image buffer from local disk or fetches from Cloudinary if local disk was wiped after deployment.
 */
async function readStoredImageBuffer(storedFilename, cloudinaryUrl = null) {
  if (storedFilename) {
    const fullPath = resolveSafeImagePath(storedFilename);
    if (fs.existsSync(fullPath)) {
      return fs.promises.readFile(fullPath);
    }
  }

  // Fallback to fetching from Cloudinary URL when running on a deployed server where local disk is ephemeral
  if (cloudinaryUrl && /^https?:\/\//i.test(cloudinaryUrl)) {
    const response = await fetch(cloudinaryUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch payment screenshot from Cloudinary (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error('Stored payment screenshot file not found on disk or Cloudinary');
}

module.exports = {
  PRIVATE_STORAGE_ROOT,
  ensureStorageDir,
  computeSha256,
  saveImageSecurely,
   uploadBufferToCloudinary,
  resolveSafeImagePath,
  readStoredImageBuffer,
};
