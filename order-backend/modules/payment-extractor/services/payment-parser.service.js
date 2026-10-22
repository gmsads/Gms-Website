const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const { PAYMENT_METHODS } = require('../payment-extractor.constants');

const DATE_FORMATS = [
  'DD MMM YYYY',
  'D MMM YYYY',
  'DD MMMM YYYY',
  'D MMMM YYYY',
  'MMM DD, YYYY',
  'MMM D, YYYY',
  'MMMM DD, YYYY',
  'MMMM D, YYYY',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'DD-MM-YYYY',
  'D-M-YYYY',
  'DD.MM.YYYY',
  'YYYY-MM-DD',
  'DD/MM/YY',
  'DD-MM-YY',
  'DD MMM YY',
  'D MMM YY',
];

/**
 * Identifies the payment application or bank from raw OCR text.
 * Checks definitive receipt structure and transaction ID labels first so cross-app UPI handles
 * (e.g., "...@ybl on PhonePe" inside a Google Pay screenshot, or "Sent to: G Pay" inside PhonePe)
 * never misclassify the payment app.
 */
function detectPaymentApp(text) {
  if (!text) return null;

  // 1. Definitive app-specific Transaction ID labels or receipt structures
  if (/Google\s*transaction\s*ID/i.test(text)) {
    return 'Google Pay';
  }
  if (/PhonePe\s*Transaction\s*ID/i.test(text)) {
    return 'PhonePe';
  }
  if (/Paytm\s*Transaction\s*ID|Wallet\s*\/?\s*UPI/i.test(text)) {
    return 'Paytm';
  }
  if (/Amazon\s*Pay\s*(?:Transaction|Reference)\s*ID/i.test(text)) {
    return 'Amazon Pay';
  }

  // 2. Check sender line ("From: ... on Google Pay" / "From: ... on PhonePe") or standalone footer logo ("G Pay")
  if (
    /From\s*:[^\n]*\bon\s+Google\s*Pay\b/i.test(text) ||
    /^\s*G\s*Pay\s*$/im.test(text) ||
    (/UPI\s*transaction\s*ID/i.test(text) && /\bCompleted\b/i.test(text))
  ) {
    return 'Google Pay';
  }

  if (/Transaction\s*Successful/i.test(text) && /Debited\s*from/i.test(text)) {
    return 'PhonePe';
  }

  // Google Pay splash screen ("Paid to" + "Banking name:" or "PAYMENTS INTERFACE" without "Debited from")
  if (
    (/Banking\s*name\s*:/i.test(text) || /PAYMENTS\s+INTERFACE/i.test(text)) &&
    /Paid\s*to/i.test(text) &&
    !/Debited\s*from/i.test(text) &&
    !/Transaction\s*Successful/i.test(text)
  ) {
    return 'Google Pay';
  }

  // 3. Strip cross-app recipient handle mentions ("on PhonePe", "PhonePe - 8555...@ybl", "Sent to : G Pay") before generic matching
  const cleanedLower = text
    .replace(/\bon\s+(?:PhonePe|Google\s*Pay|Paytm|BHIM)\b/gi, '')
    .replace(/\b(?:PhonePe|Google\s*Pay|G\s*Pay|Paytm|BHIM)\s*[\-•*·]\s*[^\n]*@[a-z0-9]+/gi, '')
    .replace(/Sent\s+to\s*:\s*G\s*Pay/gi, '')
    .toLowerCase();

  if (cleanedLower.includes('google pay') || cleanedLower.includes('gpay')) {
    return 'Google Pay';
  }
  if (cleanedLower.includes('phonepe')) {
    return 'PhonePe';
  }
  if (cleanedLower.includes('paytm')) {
    return 'Paytm';
  }
  if (cleanedLower.includes('bhim')) return 'BHIM UPI';
  if (cleanedLower.includes('amazon pay')) return 'Amazon Pay';
  if (cleanedLower.includes('cred')) return 'CRED';
  if (cleanedLower.includes('super.money') || cleanedLower.includes('supermoney')) return 'super.money';
  if (cleanedLower.includes('navi')) return 'Navi UPI';
  if (cleanedLower.includes('hdfc')) return 'HDFC Bank';
  if (cleanedLower.includes('icici') || cleanedLower.includes('imobile')) return 'ICICI Bank';
  if (
    cleanedLower.includes('sbi') ||
    cleanedLower.includes('state bank of india') ||
    cleanedLower.includes('yono')
  ) {
    return 'SBI / YONO';
  }
  if (cleanedLower.includes('axis bank')) return 'Axis Bank';
  if (cleanedLower.includes('union bank')) return 'Union Bank of India';
  if (cleanedLower.includes('kotak')) return 'Kotak Mahindra Bank';
  if (cleanedLower.includes('idbi')) return 'IDBI Bank';
  return null;
}

/**
 * Identifies the payment method (UPI, IMPS, NEFT, RTGS, Bank Transfer).
 */
function detectPaymentMethod(text) {
  if (
    /\b(?:upi|utr|gpay|google\s*pay|phonepe|paytm|bhim|payments\s+interface|banking\s+name|@[a-z0-9]{2,})\b/i.test(
      text
    )
  ) {
    return PAYMENT_METHODS.UPI;
  }
  if (/\bimps\b/i.test(text)) return PAYMENT_METHODS.IMPS;
  if (/\bneft\b/i.test(text)) return PAYMENT_METHODS.NEFT;
  if (/\brtgs\b/i.test(text)) return PAYMENT_METHODS.RTGS;
  if (/\b(?:bank transfer|account transfer|beneficiary)\b/i.test(text)) {
    return PAYMENT_METHODS.BANK_TRANSFER;
  }
  return null;
}

/**
 * Normalizes an OCR numeric string into a float:
 * - Converts dots followed by 3 digits (e.g. "28.150" or "1.000") into thousands separators ("28150", "1000"),
 *   because INR currency never has 3 decimal places (paise is always 1 or 2 digits).
 * - Removes standard commas.
 */
function parseInrNumber(rawStr) {
  if (!rawStr) return NaN;
  const normalized = String(rawStr)
    .trim()
    .replace(/,/g, '')
    .replace(/\.(?=[0-9]{3}(?:\b|\.[0-9]{1,2}))/g, '');
  return parseFloat(normalized);
}

/**
 * Extracts payment amount in INR without inventing numbers.
 * Handles Tesseract OCR variations of the Rupee symbol (₹, Rs, INR, ¥, R220, R/6 -> 76)
 * as well as standalone hero amounts (e.g. "28.150" -> 28150, "20.00" -> 20).
 */
function extractAmount(text) {
  const candidates = [];
  let match;

  // 1. Explicit currency symbol or OCR-misread Rupee prefix (₹, Rs., INR, ¥)
  const symbolRegex =
    /(?:₹|Rs\.?|INR|¥)\s*([0-9]{1,3}(?:[.,][0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  while ((match = symbolRegex.exec(text)) !== null) {
    const parsed = parseInrNumber(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
      candidates.push({ value: parsed, priority: 1 });
    }
  }

  // 2. Contextual amount keywords ("Amount", "Paid", "Total Amount")
  const contextRegex =
    /(?:amount(?:\s+paid)?|paid\s+amount|total\s+amount|paid)\s*[:\-]?\s*(?:₹|Rs\.?|INR|¥)\s*([0-9]{1,3}(?:[.,][0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  while ((match = contextRegex.exec(text)) !== null) {
    const parsed = parseInrNumber(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
      candidates.push({ value: parsed, priority: 1 });
    }
  }

  // 2b. Contextual keyword without currency symbol ("Amount: 5000")
  const contextNoSymbolRegex =
    /(?:amount(?:\s+paid)?|paid\s+amount|total\s+amount)\s*[:\-]\s*([0-9]{1,3}(?:[.,][0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  while ((match = contextNoSymbolRegex.exec(text)) !== null) {
    const parsed = parseInrNumber(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
      candidates.push({ value: parsed, priority: 2 });
    }
  }

  // 3. Standalone hero amount line:
  // - Where Tesseract reads ₹ as "R" (e.g. "R220", "R 500", "R1,200", "R28.150")
  // - Where Tesseract reads "₹7" as "R/" (e.g. "R/6" -> 76 on Google Pay splash screens)
  // - Where Tesseract drops ₹ on a standalone 2-decimal currency line (e.g. "20.00" in BHIM / Paytm)
  // - Where Tesseract reads thousands comma as dot on a standalone hero line (e.g. "28.150" -> 28150)
  // - Or a standalone number on the line immediately after "Paid" / "To <Name>" or before "Paid to" / "Paid in" / "Completed"
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const rAmountMatch = line.match(
      /^[R?zZt₹¥]\s*([0-9]{1,3}(?:[.,][0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]{1,7}(?:\.[0-9]{1,2})?)$/
    );
    if (rAmountMatch) {
      const parsed = parseInrNumber(rAmountMatch[1]);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
        candidates.push({ value: parsed, priority: 1 });
      }
    }

    const rSlashSevenMatch = line.match(/^[R?zZt]\/([0-9]{1,6}(?:\.[0-9]{1,2})?)$/);
    if (rSlashSevenMatch) {
      const parsed = parseInrNumber(`7${rSlashSevenMatch[1]}`);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
        candidates.push({ value: parsed, priority: 2 });
      }
    }

    // Standalone decimal amount line like "20.00" or "450.50"
    const standaloneDecimalMatch = line.match(/^([0-9]{1,7}\.[0-9]{2})$/);
    if (standaloneDecimalMatch) {
      const parsed = parseFloat(standaloneDecimalMatch[1]);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
        candidates.push({ value: parsed, priority: 1 });
      }
    }

    // Standalone thousands-dot or comma line like "28.150" or "28,150"
    const standaloneThousandsMatch = line.match(
      /^([0-9]{1,2}(?:[.,][0-9]{2})*[.,][0-9]{3}|[0-9]{1,3}(?:[.,][0-9]{3})+)(?:\.[0-9]{1,2})?$/
    );
    if (standaloneThousandsMatch) {
      const parsed = parseInrNumber(line);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
        candidates.push({ value: parsed, priority: 1 });
      }
    }

    // Standalone integer/decimal line within 2 lines of "Paid" / "Paid to" / "To <Name>" / "Completed" / "Paid in"
    const prevWindow = [lines[i - 1] || '', lines[i - 2] || ''].join(' ');
    const nextWindow = [lines[i + 1] || '', lines[i + 2] || ''].join(' ');
    if (
      /\b(?:Paid|Sent|Completed|^To\s+[A-Z])\b/i.test(prevWindow) ||
      /\b(?:Paid\s+to|Paid\s+in|Completed|Pay\s+again|Success|Banking\s+name)\b/i.test(nextWindow)
    ) {
      const bareHeroMatch = line.match(
        /^([0-9]{1,3}(?:[.,][0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]{1,6}(?:\.[0-9]{1,2})?)$/
      );
      if (bareHeroMatch) {
        const parsed = parseInrNumber(bareHeroMatch[1]);
        // Exclude 3-digit account suffixes after bank names or 4-digit years
        if (
          !Number.isNaN(parsed) &&
          parsed > 0 &&
          !(parsed >= 2020 && parsed <= 2035) &&
          !/bank|india/i.test(lines[i - 1] || '')
        ) {
          candidates.push({ value: parsed, priority: 1 });
        }
      }
    }
  }

  // 4. Formatted comma-separated Indian currency amount anywhere on Paid to / Debited from lines (e.g. "1,000" or "12,500.00")
  const commaNumberRegex =
    /\b([0-9]{1,2}(?:,[0-9]{2})*,[0-9]{3}(?:\.[0-9]{1,2})?|[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)\b/g;
  while ((match = commaNumberRegex.exec(text)) !== null) {
    const parsed = parseInrNumber(match[1]);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 100000000) {
      candidates.push({ value: parsed, priority: 2 });
    }
  }

  if (candidates.length === 0) {
    return { amount: null, uncertain: true };
  }

  // Deduplicate distinct values
  const distinctValues = [...new Set(candidates.map((c) => c.value))];
  const uncertain = distinctValues.length > 1;

  // Sort by priority
  candidates.sort((a, b) => a.priority - b.priority);
  return {
    amount: candidates[0].value,
    uncertain,
  };
}

/**
 * Extracts UPI Transaction ID / UTR without altering characters.
 * Prioritizes 12-digit UTR / UPI Transaction ID, including two-column layouts (like BHIM "Transaction ID Date & Time\n230006562331 ...").
 */
function extractTransactionId(text) {
  // 1. Explicit 12-digit UTR or UPI Transaction ID
  const explicitUtrMatch = text.match(
    /\b(?:UTR(?:\s*No\.?|\s*Number)?|UPI\s*transaction\s*ID|UPI\s*Ref(?:\s*No\.?|\s*ID)?)\s*[:\-#]?\s*\n?\s*([0-9]{12})\b/i
  );
  if (explicitUtrMatch && explicitUtrMatch[1]) {
    return { transactionId: explicitUtrMatch[1].trim(), uncertain: false };
  }

  // 2. Scan lines near "Transaction ID" / "UTR" / "UPI Ref" (handles 2-column layouts like BHIM where "Transaction ID Date & Time" is on line i and "230006562331 3rd Oct 26" is on line i+1)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    if (/(?:upi\s*transaction\s*id|utr|upi\s*ref|transaction\s*id|ref(?:erence)?\s*(?:no|id))/i.test(lines[i])) {
      const sameLine12 = lines[i].match(/\b([0-9]{12})\b/);
      if (sameLine12) {
        return { transactionId: sameLine12[1], uncertain: false };
      }
      if (i + 1 < lines.length) {
        const nextLine12 = lines[i + 1].match(/\b([0-9]{12})\b/);
        if (nextLine12) {
          return { transactionId: nextLine12[1], uncertain: false };
        }
        const nextLineAlphaNum = lines[i + 1].match(/^([A-Za-z0-9]{10,28})\b/);
        if (nextLineAlphaNum && /[0-9]{4,}/.test(nextLineAlphaNum[1])) {
          return { transactionId: nextLineAlphaNum[1], uncertain: false };
        }
      }
    }
  }

  // 3. General Transaction ID / UTR label followed by alphanumeric ID on same or next line
  const patterns = [
    /(?:UPI\s*Transaction\s*ID|PhonePe\s*Transaction\s*ID|Transaction\s*ID|UPI\s*Ref(?:\s*No\.?|\s*ID)?|UTR(?:\s*No\.?|\s*Number)?|Ref(?:\.|erence)?\s*(?:No\.?|ID))\s*[:\-#]?\s*\n?\s*([A-Za-z0-9]{10,28})/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (/[0-9]{4,}/.test(candidate)) {
        return { transactionId: candidate, uncertain: false };
      }
    }
  }

  // 4. Fallback: standalone 12-digit NPCI UPI reference number on its own line
  for (const line of lines) {
    const standalone12 = line.match(/^([0-9]{12})$/);
    if (standalone12) {
      return { transactionId: standalone12[1], uncertain: false };
    }
  }

  return { transactionId: null, uncertain: true };
}

/**
 * Extracts secondary Transaction Id (Google transaction ID, PhonePe Transaction ID, Paytm Order ID, Bank Ref / RRN).
 */
function extractBankReference(text, primaryTransactionId) {
  // 1. Check Google transaction ID (e.g. "CICAgPiWy-jBlw"), PhonePe Transaction ID ("T260928..."), Paytm Order ID
  const appTransactionPatterns = [
    /Google\s*transaction\s*ID\s*[:\-#]?\s*\n?\s*([A-Za-z0-9_\-]{8,36})/i,
    /PhonePe\s*Transaction\s*ID\s*[:\-#]?\s*\n?\s*([A-Za-z0-9_\-]{8,36})/i,
    /Paytm\s*(?:Transaction|Order)\s*ID\s*[:\-#]?\s*\n?\s*([A-Za-z0-9_\-]{8,36})/i,
    /Order\s*ID\s*[:\-#]?\s*\n?\s*([A-Za-z0-9_\-]{8,36})/i,
  ];

  for (const regex of appTransactionPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate && candidate !== primaryTransactionId) {
        return candidate;
      }
    }
  }

  // 2. Check explicit Bank Ref / RRN
  const explicitPatterns = [
    /(?:Bank\s*Ref(?:erence)?(?:\s*No\.?|\s*Number)?|RRN|Cust(?:omer)?\s*Ref(?:\s*No\.?)?)\s*[:\-#]?\s*\n?\s*([A-Za-z0-9]{8,28})/i,
  ];

  for (const regex of explicitPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (/[0-9]{4,}/.test(candidate) && candidate !== primaryTransactionId) {
        return candidate;
      }
    }
  }

  // 3. Check UTR or generic Transaction ID if not already equal to primaryTransactionId
  const utrMatch = text.match(/\bUTR\s*[:\-#]?\s*([0-9]{10,16})\b/i);
  if (utrMatch && utrMatch[1] && utrMatch[1].trim() !== primaryTransactionId) {
    return utrMatch[1].trim();
  }

  const genericTxnIdMatch = text.match(
    /\bTransaction\s*ID\s*[:\-#]?\s*\n?\s*([A-Za-z0-9_\-]{10,32})/i
  );
  if (
    genericTxnIdMatch &&
    genericTxnIdMatch[1] &&
    genericTxnIdMatch[1].trim() !== primaryTransactionId &&
    /[0-9]{4,}/.test(genericTxnIdMatch[1])
  ) {
    return genericTxnIdMatch[1].trim();
  }

  return null;
}

/**
 * Normalizes non-standard month abbreviations ("Sept" -> "Sep") and ordinal day suffixes ("3rd Oct 26" -> "3 Oct 26").
 */
function normalizeDateString(rawDateStr) {
  return String(rawDateStr || '')
    .replace(/\b([0-3]?[0-9])(?:st|nd|rd|th)\b/gi, '$1')
    .replace(/\bSept\b/gi, 'Sep')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts and normalizes transaction date (YYYY-MM-DD) and transaction time (HH:mm AM/PM).
 */
function extractDateAndTime(text) {
  let normalizedDate = null;
  let extractedTime = null;

  // Time pattern: e.g., "09:07 pm", "10:45 AM", "11:00 pm"
  const timeMatch = text.match(/\b([01]?[0-9]:[0-5][0-9](?::[0-5][0-9])?\s*(?:AM|PM|am|pm))\b/);
  if (timeMatch) {
    extractedTime = timeMatch[1].toUpperCase();
  }

  // Date patterns in text (supports ordinal days like "3rd Oct 26", "13 October 2026", "28 Sept 2026", "13/10/2026")
  const dateRegexes = [
    /\b([0-3]?[0-9](?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*,?\s*20[0-9]{2})\b/i,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+[0-3]?[0-9](?:st|nd|rd|th)?\s*,?\s*20[0-9]{2})\b/i,
    /\b([0-3]?[0-9][\/\-][01]?[0-9][\/\-]20[0-9]{2})\b/,
    /\b(20[0-9]{2}[\/\-][01]?[0-9][\/\-][0-3]?[0-9])\b/,
    /\b([0-3]?[0-9](?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*,?\s*[0-9]{2})\b/i,
  ];

  for (const rx of dateRegexes) {
    const m = text.match(rx);
    if (m && m[1]) {
      const cleaned = normalizeDateString(m[1]);
      const parsed = dayjs(cleaned, DATE_FORMATS, false);
      if (parsed.isValid()) {
        normalizedDate = parsed.format('YYYY-MM-DD');
        break;
      }
    }
  }

  return {
    transactionDate: normalizedDate,
    transactionTime: extractedTime,
  };
}

/**
 * Cleans an extracted party line by removing trailing amounts (like "₹1,000" or "¥1,000"),
 * leading avatar initials (like "RC " or "Re " or "0 "), and extra symbols.
 */
function cleanPartyLine(rawLine) {
  if (!rawLine) return null;
  let cleaned = String(rawLine)
    // Remove trailing currency + amount on the same line (e.g. "¥1,000", "₹1,000", "1,000")
    .replace(/\s+(?:₹|Rs\.?|INR|¥|#)?\s*[0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?\s*$/i, '')
    .replace(/\s+(?:₹|Rs\.?|INR|¥)\s*[0-9]+(?:\.[0-9]{1,2})?\s*$/i, '')
    // Remove trailing verification badge character (@, ©, etc.)
    .replace(/\s+[@©✓✔•*]+\s*$/, '')
    // Remove leading 1-2 character OCR avatar noise before an uppercase name or masked account (e.g., "Re R BALA", "0 XXXXXX7207")
    .replace(/^(?:[0O]|Re|RC|@\®|\([n\]|\[n\])\s+(?=[A-Z]{2,}|X{3,})/i, '')
    .trim();

  // Reject column headers that start with "To" or "From" such as "UPI ID From UPI ID"
  if (/^(?:upi\s*id|from\s*upi\s*id|to\s*upi\s*id|remarks|date\s*&\s*time)$/i.test(cleaned)) {
    return null;
  }
  if (/upi\s*id\s+from\s+upi\s*id/i.test(cleaned)) {
    return null;
  }

  return cleaned.length >= 2 ? cleaned : null;
}

/**
 * Extracts Payer Name and Paid-To / Beneficiary Name from common UPI/bank layouts
 * (PhonePe, Google Pay, Paytm, BHIM, Amazon Pay, CRED, Bank Apps).
 */
function extractParties(text) {
  let beneficiaryName = null;
  let payerName = null;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Check explicit "Banking Name : <Name>" (same line) or "Banking Name\n<Name>" (next line, e.g. BHIM)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bankingNameInline = line.match(/Banking\s+Name\s*[:\-]\s*(.+)$/i);
    if (bankingNameInline && bankingNameInline[1]) {
      const candidate = cleanPartyLine(bankingNameInline[1]);
      if (candidate) {
        beneficiaryName = candidate;
        break;
      }
    }
    if (/^Banking\s+Name$/i.test(line) && i + 1 < lines.length) {
      const candidate = cleanPartyLine(lines[i + 1]);
      if (candidate) {
        beneficiaryName = candidate;
        break;
      }
    }
  }

  // 2. Check BHIM explicit process details ("Payment received by <Name>", "Payment initiated by <Name>")
  for (const line of lines) {
    if (!beneficiaryName) {
      const recBy = line.match(/Payment\s+received\s+by\s+([A-Za-z0-9 .&\-\(\)]+)$/i);
      if (recBy && recBy[1]) {
        const candidate = cleanPartyLine(recBy[1]);
        if (candidate) beneficiaryName = candidate;
      }
    }
    if (!payerName) {
      const initBy = line.match(/Payment\s+initiated\s+by\s+([A-Za-z0-9 .&\-\(\)]+)$/i);
      if (initBy && initBy[1]) {
        const candidate = cleanPartyLine(initBy[1]);
        if (candidate) payerName = candidate;
      }
      const transFrom = line.match(/Payment\s+transferred\s+from\s+([A-Za-z0-9 .]+?)(?:'s\s+account)?$/i);
      if (!payerName && transFrom && transFrom[1]) {
        const candidate = cleanPartyLine(transFrom[1]);
        if (candidate) payerName = candidate;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip BHIM two-column header "To UPI ID From UPI ID"
    if (/^To\s+UPI\s+ID/i.test(line) || /^From\s+UPI\s+ID/i.test(line)) {
      continue;
    }

    // Paid to / To / Beneficiary
    if (!beneficiaryName) {
      const toMatch = line.match(
        /^(?:Paid\s+to|To|Beneficiary(?:\s+Name)?)\s*[:\-]?\s*(.*)$/i
      );
      if (toMatch) {
        const inlineVal = cleanPartyLine(toMatch[1]);
        if (inlineVal && !/^(?:bank|upi|account)$/i.test(inlineVal)) {
          beneficiaryName = inlineVal;
        } else if (i + 1 < lines.length) {
          const nextVal = cleanPartyLine(lines[i + 1]);
          if (nextVal) beneficiaryName = nextVal;
        }
      }
    }

    // Fallback to "Sent to" if beneficiaryName still not found
    if (!beneficiaryName) {
      const sentToMatch = line.match(/^Sent\s+to\s*[:\-]?\s*(.+)$/i);
      if (sentToMatch && sentToMatch[1]) {
        const cleaned = cleanPartyLine(sentToMatch[1].replace(/^G\s*Pay\s*[*•·]\s*/i, ''));
        if (cleaned) beneficiaryName = cleaned;
      }
    }

    // From / Paid by / Sender / Debited from
    if (!payerName) {
      const fromMatch = line.match(
        /^(?:From|Paid\s+by|Sender(?:\s+Name)?|Debited\s+from)\s*[:\-]?\s*(.*)$/i
      );
      if (fromMatch) {
        const inlineVal = cleanPartyLine(fromMatch[1]);
        if (inlineVal) {
          payerName = inlineVal;
        } else if (i + 1 < lines.length) {
          const nextVal = cleanPartyLine(lines[i + 1]);
          if (nextVal) payerName = nextVal;
        }
      }
    }
  }

  return { payerName, beneficiaryName };
}

/**
 * Extracts payment success/status label if present.
 */
function extractPaymentStatusLabel(text) {
  const match = text.match(
    /\b(Transaction\s+Successful|Payment\s+Successful|Paid\s+Successfully|Completed|Success|Pending|Failed)\b/i
  );
  return match ? match[1] : null;
}

/**
 * Main deterministic parser: converts raw OCR text into structured payment fields
 * and computes field-level missing/uncertainty flags without inventing any missing values.
 */
function parsePaymentText(rawText, ocrConfidence = 85) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      extractedData: {
        payerName: null,
        beneficiaryName: null,
        amount: null,
        currency: 'INR',
        transactionDate: null,
        transactionTime: null,
        transactionId: null,
        bankReference: null,
        paymentMethod: null,
        paymentApp: null,
        paymentStatusLabel: null,
      },
      confidence: {
        overall: 0,
        missingFields: [
          'amount',
          'transactionId',
          'transactionDate',
          'payerName',
          'beneficiaryName',
        ],
        uncertainFields: ['amount', 'transactionId', 'transactionDate'],
        needsManualReview: true,
      },
    };
  }

  const amountResult = extractAmount(rawText);
  const txnIdResult = extractTransactionId(rawText);
  const bankReference = extractBankReference(rawText, txnIdResult.transactionId);
  const { transactionDate, transactionTime } = extractDateAndTime(rawText);
  const { payerName, beneficiaryName } = extractParties(rawText);
  const paymentApp = detectPaymentApp(rawText);
  const paymentMethod = detectPaymentMethod(rawText);
  const paymentStatusLabel = extractPaymentStatusLabel(rawText);

  const missingFields = [];
  const uncertainFields = [];

  if (amountResult.amount === null) {
    missingFields.push('amount');
    uncertainFields.push('amount');
  } else if (amountResult.uncertain) {
    uncertainFields.push('amount');
  }

  if (!txnIdResult.transactionId) {
    missingFields.push('transactionId');
    uncertainFields.push('transactionId');
  }

  if (!transactionDate) {
    missingFields.push('transactionDate');
    uncertainFields.push('transactionDate');
  }

  if (!payerName) {
    missingFields.push('payerName');
  }

  if (!beneficiaryName) {
    missingFields.push('beneficiaryName');
  }

  if (!paymentMethod) {
    missingFields.push('paymentMethod');
  }

  // Calculate overall confidence score (0 - 100)
  let score = Math.max(ocrConfidence || 85, 85);
  if (amountResult.amount === null) score -= 30;
  if (amountResult.uncertain && amountResult.amount !== null) score -= 15;
  if (!txnIdResult.transactionId) score -= 30;
  if (!transactionDate) score -= 15;
  if (!payerName && !beneficiaryName) score -= 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const needsManualReview =
    missingFields.includes('amount') ||
    missingFields.includes('transactionId') ||
    uncertainFields.length > 0;

  return {
    extractedData: {
      payerName: payerName || null,
      beneficiaryName: beneficiaryName || null,
      amount: amountResult.amount,
      currency: 'INR',
      transactionDate: transactionDate || null,
      transactionTime: transactionTime || null,
      transactionId: txnIdResult.transactionId || null,
      bankReference: bankReference || null,
      paymentMethod: paymentMethod || null,
      paymentApp: paymentApp || null,
      paymentStatusLabel: paymentStatusLabel || null,
    },
    confidence: {
      overall: score,
      missingFields,
      uncertainFields,
      needsManualReview,
    },
  };
}

module.exports = {
  parsePaymentText,
  extractAmount,
  extractTransactionId,
  extractBankReference,
  extractDateAndTime,
  extractParties,
  detectPaymentApp,
  detectPaymentMethod,
};
