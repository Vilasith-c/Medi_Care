import type { ExtractedFields, ExpiryStatus } from '../types';
import { fuzzyMatchSaltInText } from './fuzzyMatcher';

const FORM_KEYWORDS = [
  { form: 'Tablet', regex: /\b(tablets?|tab\.?|dispersible\s+tablets?|chewable\s+tablets?)\b/i },
  { form: 'Capsule', regex: /\b(capsules?|cap\.?)\b/i },
  { form: 'Syrup', regex: /\b(syrup|syp\.?)\b/i },
  { form: 'Suspension', regex: /\b(suspension|susp\.?)\b/i },
  { form: 'Eye/Ear Drops', regex: /\b(eye\/ear\s+drops|eye\s+drops|ear\s+drops|ophthalmic\s+solution)\b/i },
  { form: 'Drops', regex: /\b(oral\s+drops|drops)\b/i },
  { form: 'Ointment', regex: /\b(ointments?|oint\.?)\b/i },
  { form: 'Cream', regex: /\b(creams?)\b/i },
  { form: 'Gel', regex: /\b(gels?)\b/i },
  { form: 'Injection', regex: /\b(injection|inj\.?)\b/i },
  { form: 'Inhaler', regex: /\b(inhaler|rotacaps?)\b/i },
];

export function extractStrength(text: string): string {
  // Check for ratio concentrations first, e.g., "5 mg/5 ml", "125mg / 5ml", "30 mg / 5 ml"
  const ratioMatch = text.match(/\b\d+(?:\.\d+)?\s?(?:mg|mcg|g)\s?\/\s?\d+(?:\.\d+)?\s?ml\b/i);
  if (ratioMatch) {
    return ratioMatch[0].trim();
  }

  // Check for percentage concentrations e.g., "0.3% w/v", "1% w/w", "2%"
  const percentMatch = text.match(/\b\d+(?:\.\d+)?\s?%(?:\s?[wW]\/[vVwW])?/);
  if (percentMatch) {
    return percentMatch[0].trim();
  }

  // Standard strength: 500mg, 650 mg, 0.5 mcg, 5000 IU
  const strengthMatch = text.match(/\b\d+(?:\.\d+)?\s?(mg|mcg|g|ml|IU)\b/i);
  if (strengthMatch) {
    return strengthMatch[0].trim();
  }

  return '';
}

export function extractForm(text: string): string {
  for (const item of FORM_KEYWORDS) {
    if (item.regex.test(text)) {
      return item.form;
    }
  }
  return '';
}

export function parseExpiryDate(text: string): { dateStr: string; status: ExpiryStatus } {
  // Patterns like EXP. 12/2026, EXP: 04/25, EXPIRY DATE: NOV 2025, EXP-08-2027
  const expMatch = text.match(/(?:EXP(?:IRY)?(?:\.?\s*DATE)?|USE\s*BEFORE)\s*[:.\-]?\s*([0-9A-Za-z/.\-]+)/i);
  if (!expMatch) {
    return { dateStr: '', status: 'unknown' };
  }

  const rawDate = expMatch[1].trim();
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  let expDate: Date | null = null;

  // Format: MM/YYYY or MM/YY
  const slashMatch = rawDate.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10) - 1;
    let year = parseInt(slashMatch[2], 10);
    if (year < 100) year += 2000;
    // Expiry date is usually end of that month
    expDate = new Date(year, month + 1, 0);
  }

  // Format: MMM YYYY or MMM/YY (e.g., NOV 2025)
  const textMonthMatch = rawDate.match(/^([a-zA-Z]{3})[\/\s.\-](\d{2,4})$/);
  if (textMonthMatch) {
    const mStr = textMonthMatch[1].toLowerCase().slice(0, 3);
    if (monthMap[mStr] !== undefined) {
      let year = parseInt(textMonthMatch[2], 10);
      if (year < 100) year += 2000;
      expDate = new Date(year, monthMap[mStr] + 1, 0);
    }
  }

  if (!expDate || isNaN(expDate.getTime())) {
    return { dateStr: rawDate, status: 'unknown' };
  }

  const now = new Date();
  const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  let status: ExpiryStatus = 'ok';
  if (diffDays < 0) {
    status = 'expired';
  } else if (diffDays <= 60) {
    status = 'expiring_soon';
  } else {
    status = 'ok';
  }

  return {
    dateStr: `${expDate.getMonth() + 1}/${expDate.getFullYear()}`,
    status
  };
}

export function extractMfgDate(text: string): string {
  // Specifically look for date pattern (MM/YY or MM/YYYY or MMM YY) following MFG or M/D,
  // while explicitly ignoring "Mfg. Lic. No." (manufacturing license number)
  const mfgMatch = text.match(/(?:MFG(?:\.?\s*DATE)?|M\/D)(?!\s*Lic)\s*[:.\-]?\s*([0-9]{1,2}[\/\.-][0-9]{2,4}|[A-Za-z]{3}[\/\s.\-][0-9]{2,4})/i);
  return mfgMatch ? mfgMatch[1].trim() : '';
}

export function extractBatch(text: string): string {
  const batchMatch = text.match(/(?:B(?:\.|\s*)?NO\.?|BATCH(?:\s*NO\.?)?|LOT(?:\s*NO\.?)?)\s*[:.\-]?\s*([A-Za-z0-9\-]+)/i);
  return batchMatch ? batchMatch[1].trim() : '';
}

export function extractManufacturer(text: string): string {
  const mfgMatch = text.match(/(?:Mfd\.?\s*(?:in\s+India\s+)?by|Manufactured\s*(?:in\s+India\s+)?by|Marketed\s*by)\s*[:.\-]?\s*([A-Za-z0-9\s.,]+?)(?=\n|Batch|Exp|Lic|Sy\.|Plot|Regd|$)/i);
  if (mfgMatch) {
    return mfgMatch[1].replace(/[:,\-]/g, '').trim().slice(0, 60);
  }
  // Fallback for lines containing pharmaceutical company keywords
  const lines = text.split('\n');
  for (const line of lines) {
    if (/\b(?:Pharma|Laboratories|Organics|Therapeutics|Remedies|Biotech)\b/i.test(line) && !/keep out|mfg|lic|telangana/i.test(line)) {
      return line.trim().slice(0, 60);
    }
  }
  return '';
}

/**
 * Parses GS1 formatted QR data often found on pharmaceutical packaging.
 * e.g. (01)08901148205121(17)261231(10)DL9042
 */
export function parseQrData(qrStr: string): Partial<ExtractedFields> {
  const result: Partial<ExtractedFields> = {};

  // Batch AI (10) - matches (10)BT9941 or similar
  const parenBatch = qrStr.match(/\(10\)\s*([A-Za-z0-9\-]+)/);
  if (parenBatch) {
    result.batch = parenBatch[1];
  } else {
    const rawBatch = qrStr.match(/(?:^|[^\d])10([A-Za-z0-9\-]{3,})/);
    if (rawBatch) result.batch = rawBatch[1];
  }

  // Expiry AI (17): YYMMDD
  const parenExp = qrStr.match(/\(17\)\s*(\d{6})/);
  const rawExpMatch = parenExp || qrStr.match(/(?:^|[^\d])17(\d{6})/);
  if (rawExpMatch) {
    const raw = rawExpMatch[1];
    const year = 2000 + parseInt(raw.slice(0, 2), 10);
    const month = parseInt(raw.slice(2, 4), 10);
    const day = parseInt(raw.slice(4, 6), 10);
    const expDate = new Date(year, month - 1, day);
    const now = new Date();
    const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    result.expiry = `${month}/${year}`;
    if (diffDays < 0) result.expiry_status = 'expired';
    else if (diffDays <= 60) result.expiry_status = 'expiring_soon';
    else result.expiry_status = 'ok';
  }

  return result;
}

export function extractAllFields(ocrText: string, ocrConfidence: number, qrData?: string): ExtractedFields {
  const strength = extractStrength(ocrText);
  const form = extractForm(ocrText);

  // Use fuzzy matcher to identify the salt even with foil glare & typos
  const fuzzySalt = fuzzyMatchSaltInText(ocrText);
  const generic_name = fuzzySalt ? fuzzySalt.canonicalName : '';

  let { dateStr: expiry, status: expiry_status } = parseExpiryDate(ocrText);
  let batch = extractBatch(ocrText);
  const mfg_date = extractMfgDate(ocrText);
  const manufacturer = extractManufacturer(ocrText);

  // If QR code data was decoded from strip, use it to populate/override batch and expiry
  if (qrData) {
    const qrFields = parseQrData(qrData);
    if (qrFields.batch) batch = qrFields.batch;
    if (qrFields.expiry) expiry = qrFields.expiry;
    if (qrFields.expiry_status) expiry_status = qrFields.expiry_status;
  }

  // Extract brand name: look for prominent product title
  let brand = '';
  const vitaminBZincMatch = ocrText.match(/Vitamin\s*B-?Complex(?:\s*with\s*Zinc)?(?:\s*Tablets?)?/i);
  if (vitaminBZincMatch) {
    brand = vitaminBZincMatch[0].trim();
  } else {
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length >= 4);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        !lower.includes('keep out') &&
        !lower.includes('mfg') &&
        !lower.includes('exp') &&
        !lower.includes('batch') &&
        !lower.includes('store') &&
        !lower.includes('each uncoated') &&
        !lower.includes('each film') &&
        !lower.includes('composition') &&
        !lower.includes('not for sale') &&
        !lower.includes('government supply') &&
        !lower.includes('schedule') &&
        !lower.includes('telangana') &&
        !lower.includes('cipients') &&
        !lower.includes('preservative') &&
        !lower.includes('manufactured') &&
        !lower.includes('medchat') &&
        line !== generic_name
      ) {
        brand = line.replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
        if (brand.length >= 4) break;
      }
    }
  }

  return {
    brand: brand.slice(0, 35),
    generic_name,
    strength,
    form,
    manufacturer,
    batch,
    mfg_date,
    expiry,
    expiry_status,
    confidence: ocrConfidence
  };
}
