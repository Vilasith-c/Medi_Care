export type ExpiryStatus = 'expired' | 'expiring_soon' | 'ok' | 'unknown';
export type VerificationStatus = 'verified' | 'partial' | 'unverified';

export interface ConfirmedFields {
  brand: string;
  generic_name: string;
  strength: string;
  form: string;
  manufacturer: string;
  batch: string;
  mfg_date: string;
  expiry: string;
}

export interface SourceCitation {
  title: string;
  url: string;
  domain: string;
}

export interface ClinicalSections {
  what_it_is: string;
  common_uses: string;
  key_cautions: string;
  label_details?: string;
}

export interface LookupResult {
  status: VerificationStatus;
  sections: ClinicalSections | null;
  sources: SourceCitation[];
  retrieved_at: string;
  notes: string[];
  rxcui?: string;
}

export interface HistoryRecord {
  id?: number;
  created_at: string;
  photo: string; // Base64 data URL
  raw_ocr_text: string;
  ocr_confidence: number;
  confirmed: ConfirmedFields;
  expiry_status: ExpiryStatus;
  result_en: LookupResult;
  result_te: ClinicalSections | null;
  versions: {
    summariser: string;
    translator: string;
    rules: string;
  };
}

export interface ExtractedFields {
  brand: string;
  generic_name: string;
  strength: string;
  form: string;
  manufacturer: string;
  batch: string;
  mfg_date: string;
  expiry: string;
  expiry_status: ExpiryStatus;
  confidence: number;
}
