const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PaymentExtraction = require('../modules/payment-extractor/payment-extractor.model');
const paymentExtractorRoutes = require('../modules/payment-extractor/payment-extractor.routes');
const { parsePaymentText } = require('../modules/payment-extractor/services/payment-parser.service');
const { buildSheetRowValues } = require('../modules/payment-extractor/services/google-sheets.service');
const { PRIVATE_STORAGE_ROOT } = require('../modules/payment-extractor/services/image-storage.service');

// Synthetic 1x1 PNG buffer (valid PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A)
function createSyntheticPngBuffer(seedText = 'seed-1') {
  const pngHeader = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
    'hex'
  );
  return Buffer.concat([pngHeader, Buffer.from(seedText, 'utf8')]);
}

let server;
let baseUrl;
const createdIds = [];
const storedFilesToCleanup = [];

async function cleanupTestRecords() {
  if (createdIds.length > 0 && mongoose.connection.readyState === 1) {
    await PaymentExtraction.deleteMany({ _id: { $in: createdIds } });
  }
  for (const filename of storedFilesToCleanup) {
    const full = path.join(PRIVATE_STORAGE_ROOT, filename);
    if (fs.existsSync(full)) {
      try {
        fs.unlinkSync(full);
      } catch (_) {}
    }
  }
}

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  const app = express();
  app.use(express.json());
  app.use('/api/payment-extractor', paymentExtractorRoutes);

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}/api/payment-extractor`;
      resolve();
    });
  });
});

test.after(async () => {
  delete global.__MOCK_OCR_PROVIDER__;
  delete global.__MOCK_GOOGLE_SHEETS_PROVIDER__;
  await cleanupTestRecords();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

/**
 * Helper to upload multipart/form-data using native fetch + FormData
 */
async function uploadMultipart({ files = [], fields = {}, headers = {} }) {
  const formData = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    formData.append(k, v);
  }
  for (const f of files) {
    const blob = new Blob([f.buffer], { type: f.mimeType || 'image/png' });
    formData.append('screenshots', blob, f.filename || 'screenshot.png');
  }

  const res = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (Array.isArray(data.records)) {
    data.records.forEach((r) => {
      if (r._id) createdIds.push(r._id);
      if (r.image && r.image.storedFilename) storedFilesToCleanup.push(r.image.storedFilename);
    });
  }
  return { status: res.status, data };
}

test('Scenario 1 & 17: Successful upload, OCR extraction, and payment marked UNVERIFIED until independently reconciled', async () => {
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: [
      'Google Pay',
      'Transaction Successful',
      '₹14,500.00',
      'Paid to: Global Marketing Solutions',
      'From: Rajesh Sharma',
      '17 Oct 2026, 02:15 PM',
      'UPI Transaction ID: 629011223344',
      'Bank Ref No: RRN99887766',
    ].join('\n'),
    provider: 'MOCK_VISION',
    ocrConfidence: 95,
  });

  const { status, data } = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer('test-1'), filename: 'gpay_receipt.png' }],
    fields: {
      whatsappGroupName: 'GMS Orders Group',
      whatsappSenderName: 'Rajesh Sharma',
      syncOcr: 'true',
    },
    headers: {
      'x-user-name': 'Swathi Admin',
      'x-user-role': 'Admin',
    },
  });

  assert.equal(status, 201);
  assert.equal(data.success, true);
  assert.equal(data.records.length, 1);

  const rec = data.records[0];
  assert.equal(rec.extractionStatus, 'COMPLETED');
  assert.equal(rec.reviewStatus, 'PENDING_REVIEW');
  // Scenario 17: Screenshot never automatically marks payment as bank-verified
  assert.equal(rec.paymentVerificationStatus, 'UNVERIFIED');
  assert.equal(rec.extractedData.amount, 14500);
  assert.equal(rec.extractedData.transactionId, '629011223344');
  assert.equal(rec.extractedData.bankReference, 'RRN99887766');
  assert.equal(rec.extractedData.transactionDate, '2026-10-17');
  assert.equal(rec.extractedData.payerName, 'Rajesh Sharma');
  assert.equal(rec.extractedData.beneficiaryName, 'Global Marketing Solutions');
  assert.equal(rec.extractedData.paymentMethod, 'UPI');
});

test('Scenario 2: Multiple screenshots uploaded together in one batch', async () => {
  let callIndex = 0;
  global.__MOCK_OCR_PROVIDER__ = async () => {
    callIndex++;
    return {
      rawText: `PhonePe\nTransaction Successful\n₹${callIndex * 1000}\nPaid to: GMS\nFrom: Client ${callIndex}\n15 Oct 2026\nUTR: 41002233445${callIndex}`,
      provider: 'MOCK_VISION',
      ocrConfidence: 92,
    };
  };

  const { status, data } = await uploadMultipart({
    files: [
      { buffer: createSyntheticPngBuffer('batch-a'), filename: 'batch1.png' },
      { buffer: createSyntheticPngBuffer('batch-b'), filename: 'batch2.png' },
    ],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });

  assert.equal(status, 201);
  assert.equal(data.records.length, 2);
  assert.equal(data.records[0].extractedData.amount, 1000);
  assert.equal(data.records[1].extractedData.amount, 2000);
});

test('Scenario 3: Unreadable image marks extractionStatus as FAILED and preserves error details', async () => {
  global.__MOCK_OCR_PROVIDER__ = async () => {
    throw new Error('UNREADABLE_IMAGE: No readable text detected in payment screenshot');
  };

  const { status, data } = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer('unreadable-img'), filename: 'blur.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });

  assert.equal(status, 201);
  const rec = data.records[0];
  assert.equal(rec.extractionStatus, 'FAILED');
  assert.match(rec.lastError, /UNREADABLE_IMAGE/);
});

test('Scenario 4 & 16: Unsupported or corrupted file rejected; batch processing handles partial failures without stopping valid images', async () => {
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: 'Paytm\nPaid ₹3,200\nUTR: 991122334455\n16 Oct 2026',
    provider: 'MOCK_VISION',
    ocrConfidence: 90,
  });

  const invalidTextBuffer = Buffer.from('This is not a valid image file header', 'utf8');
  const validPngBuffer = createSyntheticPngBuffer('valid-in-partial-batch');

  const { status, data } = await uploadMultipart({
    files: [
      { buffer: invalidTextBuffer, filename: 'fake.png', mimeType: 'image/png' },
      { buffer: validPngBuffer, filename: 'real.png', mimeType: 'image/png' },
    ],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });

  assert.equal(status, 201);
  assert.equal(data.records.length, 1);
  assert.equal(data.failedFiles.length, 1);
  assert.equal(data.failedFiles[0].originalFilename, 'fake.png');
  assert.equal(data.records[0].extractedData.amount, 3200);
});

test('Scenario 5 & 6: Missing transaction ID and ambiguous/incorrectly recognized amount are flagged rather than invented', async () => {
  // Missing UTR and two conflicting amounts in text
  const parsed = parsePaymentText(
    'Payment Successful\nAmount: ₹5,000\nPaid ₹5,800\nFrom: Suresh Traders\n12 Oct 2026',
    82
  );

  assert.equal(parsed.extractedData.transactionId, null);
  assert.ok(parsed.confidence.missingFields.includes('transactionId'));
  assert.ok(parsed.confidence.uncertainFields.includes('transactionId'));
  assert.ok(parsed.confidence.uncertainFields.includes('amount'));
  assert.equal(parsed.confidence.needsManualReview, true);
});

test('Scenario 7: User edits extracted data before approval and audit trail is recorded', async () => {
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: 'Paid ₹1,500\nFrom: Anita Rao',
    provider: 'MOCK_VISION',
    ocrConfidence: 75,
  });

  const { data: uploadData } = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer('edit-test'), filename: 'edit_me.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Exec User', 'x-user-role': 'Executive' },
  });

  const recId = uploadData.records[0]._id;

  const patchRes = await fetch(`${baseUrl}/${recId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': 'Account Manager',
      'x-user-role': 'Account',
    },
    body: JSON.stringify({
      extractedData: {
        amount: 1550,
        transactionId: '778899001122',
        transactionDate: '2026-10-17',
        payerName: 'Anita Rao',
      },
    }),
  });

  const patchJson = await patchRes.json();
  assert.equal(patchRes.status, 200);
  assert.equal(patchJson.record.extractedData.amount, 1550);
  assert.equal(patchJson.record.extractedData.transactionId, '778899001122');
  assert.ok(patchJson.record.auditTrail.some((a) => a.action === 'EDITED'));
});

test('Scenario 8: Duplicate transaction ID is detected and blocked on approval unless overridden with reason', async () => {
  const sharedUtr = `UTR9000${Date.now().toString().slice(-5)}`;
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: `Google Pay\n₹4,500\nUPI Transaction ID: ${sharedUtr}\n17 Oct 2026`,
    provider: 'MOCK_VISION',
    ocrConfidence: 95,
  });
  global.__MOCK_GOOGLE_SHEETS_PROVIDER__ = async () => ({
    spreadsheetId: 'mock-sheet-id',
    worksheetName: 'Payments',
    rowReference: 'Payments!A2:S2',
    syncedAt: new Date(),
    reconciledExistingRow: false,
  });

  // Upload first screenshot
  const firstUpload = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer('dup-1'), filename: 'first.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });
  const firstId = firstUpload.data.records[0]._id;

  // Approve first screenshot
  const firstApprove = await fetch(`${baseUrl}/${firstId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': 'Swathi Admin',
      'x-user-role': 'Admin',
    },
    body: JSON.stringify({}),
  });
  assert.equal(firstApprove.status, 200);

  // Upload second screenshot with different image bytes but identical UTR
  const secondUpload = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer('dup-2-diff-bytes'), filename: 'second.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });
  const secondRec = secondUpload.data.records[0];
  assert.equal(secondRec.duplicateCheck.isDuplicate, true);
  assert.equal(secondRec.duplicateCheck.duplicateType, 'TRANSACTION_ID');

  // Attempt approval without override -> must return 409 Conflict
  const conflictApprove = await fetch(`${baseUrl}/${secondRec._id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': 'Swathi Admin',
      'x-user-role': 'Admin',
    },
    body: JSON.stringify({}),
  });
  const conflictJson = await conflictApprove.json();
  assert.equal(conflictApprove.status, 409);
  assert.equal(conflictJson.code, 'DUPLICATE_DETECTED');

  // Approve with explicit override reason -> succeeds and records audit trail
  const overrideApprove = await fetch(`${baseUrl}/${secondRec._id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': 'Swathi Admin',
      'x-user-role': 'Admin',
    },
    body: JSON.stringify({
      overrideDuplicate: true,
      overrideReason: 'Verified split entry by Accounts Manager',
    }),
  });
  const overrideJson = await overrideApprove.json();
  assert.equal(overrideApprove.status, 200);
  assert.equal(overrideJson.record.reviewStatus, 'APPROVED');
  assert.ok(
    overrideJson.record.auditTrail.some((a) => a.action === 'APPROVED_WITH_DUPLICATE_OVERRIDE')
  );
});

test('Scenario 9: Two concurrent attempts to approve the same record allow only one winner', async () => {
  const uniqueUtr = `UTRCONC${Date.now()}`;
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: `PhonePe\n₹8,900\nUPI Transaction ID: ${uniqueUtr}\n17 Oct 2026`,
    provider: 'MOCK_VISION',
    ocrConfidence: 95,
  });

  let sheetAppendCalls = 0;
  global.__MOCK_GOOGLE_SHEETS_PROVIDER__ = async () => {
    sheetAppendCalls++;
    await new Promise((r) => setTimeout(r, 50));
    return {
      spreadsheetId: 'mock-sheet-id',
      worksheetName: 'Payments',
      rowReference: 'Payments!A5:S5',
      syncedAt: new Date(),
      reconciledExistingRow: false,
    };
  };

  const { data: uploadData } = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer(`conc-${uniqueUtr}`), filename: 'conc.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });
  const recId = uploadData.records[0]._id;

  const [res1, res2] = await Promise.all([
    fetch(`${baseUrl}/${recId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': 'Admin One',
        'x-user-role': 'Admin',
      },
      body: JSON.stringify({}),
    }),
    fetch(`${baseUrl}/${recId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-name': 'Admin Two',
        'x-user-role': 'Account',
      },
      body: JSON.stringify({}),
    }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  assert.deepEqual(statuses, [200, 409]);
  assert.equal(sheetAppendCalls, 1);
});

test('Scenario 10, 11, 12, 13 & 18: Google Sheets append, permission failure, timeout retry, and idempotent retry sync without duplicate rows', async () => {
  const uniqueUtr = `UTRSHEET${Date.now()}`;
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: `Google Pay\n₹19,250\nUPI Transaction ID: ${uniqueUtr}\n17 Oct 2026\nPaid to: GMS`,
    provider: 'MOCK_VISION',
    ocrConfidence: 95,
  });

  // Scenario 11 & 18: Simulate Google Sheets permission/unavailable failure during initial approval
  global.__MOCK_GOOGLE_SHEETS_PROVIDER__ = async () => {
    const err = new Error('PERMISSION_DENIED: The caller does not have permission to spreadsheet');
    err.status = 403;
    throw err;
  };

  const { data: uploadData } = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer(`sheet-${uniqueUtr}`), filename: 'sheet.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });
  const recId = uploadData.records[0]._id;

  // Approve while Google Sheets is failing: record must stay APPROVED with SYNC_FAILED
  const approveRes = await fetch(`${baseUrl}/${recId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': 'Swathi Admin',
      'x-user-role': 'Admin',
    },
    body: JSON.stringify({}),
  });
  const approveJson = await approveRes.json();
  assert.equal(approveRes.status, 200);
  assert.equal(approveJson.record.reviewStatus, 'APPROVED');
  assert.equal(approveJson.record.googleSheetsSync.status, 'SYNC_FAILED');

  // Scenario 12 & 10: Simulate transient timeout on attempt 1, then success on attempt 2
  let attempts = 0;
  global.__MOCK_GOOGLE_SHEETS_PROVIDER__ = async (rec) => {
    attempts++;
    if (attempts === 1) {
      const timeoutErr = new Error('ETIMEDOUT: Google Sheets API network timeout');
      timeoutErr.code = 503;
      throw timeoutErr;
    }
    const rowValues = buildSheetRowValues(rec, new Date().toISOString());
    assert.equal(rowValues.length, 14);
    assert.equal(rowValues[0], rec.crmPaymentId);
    return {
      spreadsheetId: 'sheet-123',
      worksheetName: 'Payments',
      rowReference: 'Payments!A10:N10',
      syncedAt: new Date(),
      reconciledExistingRow: false,
    };
  };

  const retrySyncRes = await fetch(`${baseUrl}/${recId}/sync`, {
    method: 'POST',
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });
  const retrySyncJson = await retrySyncRes.json();
  assert.equal(retrySyncRes.status, 200);
  assert.equal(attempts, 2);
  assert.equal(retrySyncJson.record.googleSheetsSync.status, 'SYNCED');
  assert.equal(retrySyncJson.record.googleSheetsSync.rowReference, 'Payments!A10:N10');

  // Scenario 13: Retrying sync again when already SYNCED does not call Google Sheets append again
  const duplicateSyncRes = await fetch(`${baseUrl}/${recId}/sync`, {
    method: 'POST',
    headers: { 'x-user-name': 'Swathi Admin', 'x-user-role': 'Admin' },
  });
  const duplicateSyncJson = await duplicateSyncRes.json();
  assert.equal(duplicateSyncRes.status, 200);
  assert.equal(duplicateSyncJson.syncOutcome.alreadySynced, true);
  assert.equal(attempts, 2); // No extra append call made
});

test('Scenario 14 & 15: Unauthorized user cannot approve a payment or access private images without auth', async () => {
  const uniqueUtr = `UTRSEC${Date.now()}`;
  global.__MOCK_OCR_PROVIDER__ = async () => ({
    rawText: `Google Pay\n₹2,100\nUPI Transaction ID: ${uniqueUtr}\n17 Oct 2026`,
    provider: 'MOCK_VISION',
    ocrConfidence: 90,
  });

  const { data: uploadData } = await uploadMultipart({
    files: [{ buffer: createSyntheticPngBuffer(`sec-${uniqueUtr}`), filename: 'sec.png' }],
    fields: { syncOcr: 'true' },
    headers: { 'x-user-name': 'Exec User', 'x-user-role': 'Executive' },
  });
  const recId = uploadData.records[0]._id;

  // Scenario 14: Executive role attempting to approve -> 403 Forbidden
  const execApproveRes = await fetch(`${baseUrl}/${recId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-name': 'Exec User',
      'x-user-role': 'Executive',
    },
    body: JSON.stringify({}),
  });
  assert.equal(execApproveRes.status, 403);

  // Scenario 15a: Unauthenticated request to private image -> 401 Unauthorized
  const unauthImgRes = await fetch(`${baseUrl}/${recId}/image`);
  assert.equal(unauthImgRes.status, 401);

  // Scenario 15b: Authorized CRM user accessing private image -> 200 OK with image/png
  const authImgRes = await fetch(
    `${baseUrl}/${recId}/image?userName=Swathi%20Admin&userRole=Admin`
  );
  assert.equal(authImgRes.status, 200);
  assert.match(authImgRes.headers.get('content-type') || '', /image\/png/);
});
