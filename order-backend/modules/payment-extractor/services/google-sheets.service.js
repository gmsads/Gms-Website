const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { GOOGLE_SHEET_HEADERS, MAX_SYNC_RETRIES } = require('../payment-extractor.constants');

const LOCAL_SHEETS_DIR = path.resolve(process.cwd(), 'exports');
const LOCAL_SHEETS_FILE = path.resolve(LOCAL_SHEETS_DIR, 'Payment_Extractions_Sheet.xlsx');

/**
 * Returns non-sensitive Google Sheets & OCR configuration status for the CRM UI.
 */
function getGoogleSheetsIntegrationStatus() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || null;
  const worksheetName = process.env.GOOGLE_SHEETS_WORKSHEET_NAME || 'Payments';
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || null;

  let credentialsConfigured = false;
  let authMethod = 'LOCAL_EXCEL_FALLBACK';

  if (process.env.GOOGLE_SHEETS_CREDENTIALS_JSON || process.env.GOOGLE_VISION_CREDENTIALS_JSON) {
    credentialsConfigured = true;
    authMethod = 'SERVICE_ACCOUNT_ENV_JSON';
  } else if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    credentialsConfigured = true;
    authMethod = 'SERVICE_ACCOUNT_KEY_FILE';
  }

  return {
    configured: Boolean(spreadsheetId && credentialsConfigured),
    spreadsheetIdConfigured: Boolean(spreadsheetId),
    spreadsheetIdPreview: spreadsheetId
      ? `${spreadsheetId.slice(0, 6)}...${spreadsheetId.slice(-4)}`
      : null,
    worksheetName,
    projectIdConfigured: Boolean(projectId),
    credentialsConfigured,
    authMethod,
  };
}

/**
 * Creates an authenticated Google Sheets v4 client using service-account credentials.
 */
async function createSheetsClient() {
  const { google } = require('googleapis');
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

  let auth;
  const rawJson =
    process.env.GOOGLE_SHEETS_CREDENTIALS_JSON || process.env.GOOGLE_VISION_CREDENTIALS_JSON;

  if (rawJson) {
    const credentials = JSON.parse(rawJson);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes,
    });
  } else if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ) {
    auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes,
    });
  } else {
    throw new Error(
      'GOOGLE_SHEETS_NOT_CONFIGURED: Missing GOOGLE_APPLICATION_CREDENTIALS or service account JSON'
    );
  }

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

/**
 * Formats a PaymentExtraction document into the 14-column Google Sheet row:
 * 1. CRM Payment ID
 * 2. Uploaded Date
 * 3. Uploaded By
 * 4. Source Group
 * 5. Source Sender
 * 6. Payer Name
 * 7. Beneficiary Name
 * 8. Amount (INR)
 * 9. Transaction Date
 * 10. Transaction ID / UTR
 * 11. Transaction Id
 * 12. Payment Method
 * 13. Review Status
 * 14. Approved By
 */
function buildSheetRowValues(record) {
  const ed = record.extractedData || {};
  const sm = record.sourceMetadata || {};
  const up = record.uploadedBy || {};
  const ap = record.approvedBy || {};

  return [
    record.crmPaymentId || String(record._id),
    record.createdAt ? new Date(record.createdAt).toISOString() : '',
    up.userName ? `${up.userName} (${up.userRole || ''})` : '',
    sm.whatsappGroupName || '',
    sm.whatsappSenderName || '',
    ed.payerName || '',
    ed.beneficiaryName || '',
    ed.amount !== null && ed.amount !== undefined ? Number(ed.amount) : '',
    ed.transactionDate || '',
    ed.transactionId || '',
    ed.bankReference || '',
    ed.paymentMethod || '',
    record.reviewStatus || '',
    ap.userName ? `${ap.userName} (${ap.userRole || ''})` : '',
  ];
}

/**
 * Executes a Google Sheets operation with retry and backoff for rate limits (429) or transient 5xx/timeout errors.
 */
async function withSheetsRetry(fn, maxRetries = MAX_SYNC_RETRIES, baseDelayMs = 400) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const status = err.code || err.status || (err.response && err.response.status);
      const isPermissionOrConfigError =
        status === 401 ||
        status === 403 ||
        status === 404 ||
        String(err.message || '').includes('GOOGLE_SHEETS_NOT_CONFIGURED') ||
        String(err.message || '').includes('PERMISSION_DENIED');

      if (isPermissionOrConfigError || attempt === maxRetries) {
        break;
      }
      const waitMs = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastError;
}

/**
 * Local Excel Sheet fallback (`order-backend/exports/Payment_Extractions_Sheet.xlsx`)
 * used when live Google Cloud service account credentials are not configured in `.env`.
 */
async function appendToLocalSpreadsheetFallback(record, worksheetName, syncTimestampIso) {
  if (!fs.existsSync(LOCAL_SHEETS_DIR)) {
    fs.mkdirSync(LOCAL_SHEETS_DIR, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(LOCAL_SHEETS_FILE)) {
    await workbook.xlsx.readFile(LOCAL_SHEETS_FILE);
  }

  let sheet = workbook.getWorksheet(worksheetName);
  if (!sheet) {
    sheet = workbook.addWorksheet(worksheetName);
    sheet.addRow(GOOGLE_SHEET_HEADERS);
  } else if (sheet.rowCount === 0) {
    sheet.addRow(GOOGLE_SHEET_HEADERS);
  } else {
    // Ensure Row 1 header matches the 14 columns
    const headerRow = sheet.getRow(1);
    headerRow.values = GOOGLE_SHEET_HEADERS;
  }

  // Idempotency check: scan column 1 for CRM Payment ID
  let existingRowNumber = null;
  sheet.eachRow((row, rowNumber) => {
    const cellVal = row.getCell(1).value;
    if (cellVal && String(cellVal).trim() === record.crmPaymentId) {
      existingRowNumber = rowNumber;
    }
  });

  if (existingRowNumber) {
    return {
      spreadsheetId: 'LOCAL_SHEET_FALLBACK',
      worksheetName,
      rowReference: `${worksheetName}!A${existingRowNumber}:N${existingRowNumber}`,
      syncedAt: new Date(syncTimestampIso),
      reconciledExistingRow: true,
    };
  }

  const rowValues = buildSheetRowValues(record, syncTimestampIso);
  const addedRow = sheet.addRow(rowValues);
  const newRowNum = addedRow.number;

  await workbook.xlsx.writeFile(LOCAL_SHEETS_FILE);

  return {
    spreadsheetId: 'LOCAL_SHEET_FALLBACK',
    worksheetName,
    rowReference: `${worksheetName}!A${newRowNum}:N${newRowNum}`,
    syncedAt: new Date(syncTimestampIso),
    reconciledExistingRow: false,
  };
}

/**
 * Appends an approved payment record to Google Sheets idempotently:
 * 1. If Google Cloud credentials and GOOGLE_SHEETS_SPREADSHEET_ID are configured, appends to live Google Sheets.
 * 2. If not configured in `.env` yet, synchronizes idempotently to the local spreadsheet (`exports/Payment_Extractions_Sheet.xlsx`).
 */
async function appendApprovedPaymentToSheet(record) {
  // Support deterministic test hook for automated integration tests
  if (typeof global.__MOCK_GOOGLE_SHEETS_PROVIDER__ === 'function') {
    return withSheetsRetry(() => global.__MOCK_GOOGLE_SHEETS_PROVIDER__(record));
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const worksheetName = process.env.GOOGLE_SHEETS_WORKSHEET_NAME || 'Payments';
  const statusInfo = getGoogleSheetsIntegrationStatus();
  const syncTimestampIso = new Date().toISOString();

  // If live Google Sheets credentials or spreadsheet ID are not configured, use local Excel sheet fallback
  if (!spreadsheetId || !statusInfo.credentialsConfigured) {
    return appendToLocalSpreadsheetFallback(record, worksheetName, syncTimestampIso);
  }

  return withSheetsRetry(async () => {
    const sheets = await createSheetsClient();

    // Step 1: Read A1:Z to check headers & existing CRM Payment IDs
    const colARes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${worksheetName}!A1:Z`,
    });

    const rows = (colARes.data && colARes.data.values) || [];

    // Ensure headers exist if sheet is empty, or update row 1 if old 19-column headers were present
    if (rows.length === 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${worksheetName}!A1:N1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [GOOGLE_SHEET_HEADERS],
        },
      });
    } else {
      const currentHeaders = rows[0] || [];
      if (
        currentHeaders.length !== GOOGLE_SHEET_HEADERS.length ||
        currentHeaders[9] !== 'UTR' ||
        currentHeaders[10] !== 'Transaction Id'
      ) {
        // Clear old header columns O:Z and set A1:N1 to exact 14 headers
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${worksheetName}!O1:Z1000`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${worksheetName}!A1:N1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [GOOGLE_SHEET_HEADERS],
          },
        });
      }

      // Idempotency reconciliation check: search Column A for crmPaymentId
      for (let idx = 0; idx < rows.length; idx++) {
        const cellA = rows[idx] && rows[idx][0] ? String(rows[idx][0]).trim() : '';
        if (cellA === record.crmPaymentId) {
          const existingRowNumber = idx + 1;
          const updatedRowValues = buildSheetRowValues(record, syncTimestampIso);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${worksheetName}!A${existingRowNumber}:N${existingRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [updatedRowValues],
            },
          });
          return {
            spreadsheetId,
            worksheetName,
            rowReference: `${worksheetName}!A${existingRowNumber}:N${existingRowNumber}`,
            syncedAt: new Date(syncTimestampIso),
            reconciledExistingRow: true,
          };
        }
      }
    }

    // Step 2: Append the new payment row (14 columns A:N)
    const rowValues = buildSheetRowValues(record, syncTimestampIso);
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${worksheetName}!A:N`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });

    const updatedRange =
      (appendRes.data &&
        appendRes.data.updates &&
        appendRes.data.updates.updatedRange) ||
      `${worksheetName}!A:N`;

    return {
      spreadsheetId,
      worksheetName,
      rowReference: updatedRange,
      syncedAt: new Date(syncTimestampIso),
      reconciledExistingRow: false,
    };
  });
}

module.exports = {
  getGoogleSheetsIntegrationStatus,
  buildSheetRowValues,
  appendApprovedPaymentToSheet,
  withSheetsRetry,
  LOCAL_SHEETS_FILE,
};
