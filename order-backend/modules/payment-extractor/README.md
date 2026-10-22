# Payment Screenshot Extractor — Setup, Architecture & Deployment Guide

## 1. Overview

The **Payment Screenshot Extractor** module enables authorized GMS CRM users (`Admin`, `Account`, `Sales Manager`, `Service Manager`, `Executive`, etc.) to upload WhatsApp payment screenshots in batches, automatically extract structured payment details via OCR, inspect and edit fields alongside the original image, detect duplicate transactions, and synchronize approved payment records to Google Sheets.

---

## 2. Environment Variables (`order-backend/.env`)

Add the following environment variables to `order-backend/.env` (keep all private keys and service account JSON files out of Git and never place them in frontend `VITE_*` variables):

```env
# Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id

# Option A: Path to Service Account JSON key file outside source control
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/to/gcp-service-account.json

# Option B (Alternative for Cloud/Container environments): Inline JSON string
# GOOGLE_VISION_CREDENTIALS_JSON={"type":"service_account",...}
# GOOGLE_SHEETS_CREDENTIALS_JSON={"type":"service_account",...}

# Google Sheets Target Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your-google-spreadsheet-id
GOOGLE_SHEETS_WORKSHEET_NAME=Payments
```

> **Note on Local OCR Fallback**: If `GOOGLE_APPLICATION_CREDENTIALS` is not yet configured in the environment, the OCR service automatically falls back to local `tesseract.js` OCR so uploads and extraction remain functional during development. Once Google Cloud Vision credentials are provided, `GOOGLE_CLOUD_VISION_DOCUMENT` becomes the primary OCR engine automatically.

---

## 3. Google Cloud Vision & Google Sheets Configuration Steps

1. **Create or Select a Google Cloud Project**:
   - Open the [Google Cloud Console](https://console.cloud.google.com/).
   - Enable the **Cloud Vision API** and **Google Sheets API**.

2. **Create a Service Account**:
   - Navigate to **IAM & Admin → Service Accounts → Create Service Account**.
   - Grant minimal required roles (e.g., Cloud Vision user if required by your org policy).
   - Generate a JSON key and store it securely outside the repository (or in your secret manager), and point `GOOGLE_APPLICATION_CREDENTIALS` to its path.

3. **Share the Destination Google Sheet**:
   - Create a Google Spreadsheet and ensure it has a tab named `Payments` (or match `GOOGLE_SHEETS_WORKSHEET_NAME`).
   - Copy the Spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`) into `GOOGLE_SHEETS_SPREADSHEET_ID`.
   - Click **Share** on the Google Sheet and share it with your Service Account's `client_email` with **Editor** permissions.

---

## 4. Google Sheet Column Layout (19 Columns `A:S`)

When the first approved payment is synchronized to an empty sheet, the service automatically creates the following 19 header columns in `A1:S1`:

1. `CRM Payment ID`
2. `Uploaded Date`
3. `Uploaded By`
4. `Source Group`
5. `Source Sender`
6. `Payer Name`
7. `Beneficiary Name`
8. `Amount (INR)`
9. `Transaction Date`
10. `Transaction ID / UTR`
11. `Bank Reference`
12. `Payment Method`
13. `Extraction Status`
14. `Review Status`
15. `Payment Verification Status`
16. `Original Image Link` (Protected authenticated CRM endpoint `/api/payment-extractor/:id/image`)
17. `Approved By`
18. `Approved At`
19. `Google Sheets Sync Timestamp`

### Idempotent Synchronization & Deduplication
Before appending a row on initial approval or `Retry Sync`, `google-sheets.service.js` inspects Column A (`CRM Payment ID`). If the `crmPaymentId` already exists in the worksheet (for example, from a prior network timeout after the row was written), it reconciles and stores the existing row reference instead of creating a duplicate row.

---

## 5. Security & Role-Based Access Control

- **Private Image Storage**: Payment screenshots are stored outside the public `/uploads` folder inside `order-backend/private_uploads/payment_screenshots` with SHA-256 hashing, magic-byte signature validation (`JPG`, `JPEG`, `PNG`, `WebP`), and path traversal protection.
- **Role Permissions**:
  - **Upload & View**: `Admin`, `Account`, `Sales Manager`, `Service Manager`, `Executive`, `Service Executive`, `FieldExecutive`, `Agent`, `IT`.
  - **Approve / Reject / Sync to Google Sheets**: `Admin`, `Account`, `Sales Manager`.
  - **Bank Reconciliation (`paymentVerificationStatus` → `VERIFIED` / `DISPUTED`)**: `Admin`, `Account`.

---

## 6. Running Tests

To execute the unit and integration test suite covering all 18 scenarios:

```bash
cd order-backend
npm test
```
