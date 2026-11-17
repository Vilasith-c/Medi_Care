import type { ClinicalSections, LookupResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export async function processPaddleOcr(imageDataUrl: string): Promise<{
  text: string;
  confidence: number;
  engine: string;
}> {
  const response = await fetch(`${API_BASE_URL}/ocr/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageDataUrl,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `PaddleOCR server error (${response.status})`);
  }

  return await response.json();
}

export async function lookupMedicine(params: {
  generic_name: string;
  brand?: string;
  strength?: string;
  form?: string;
  country?: string;
}): Promise<LookupResult> {
  const response = await fetch(`${API_BASE_URL}/lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generic_name: params.generic_name,
      brand: params.brand || '',
      strength: params.strength || '',
      form: params.form || '',
      country: params.country || 'India',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error (${response.status}) while verifying medicine.`);
  }

  return await response.json();
}

export async function translateToTelugu(sections: ClinicalSections): Promise<ClinicalSections> {
  const response = await fetch(`${API_BASE_URL}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sections,
      target_lang: 'te',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Telugu translation service is currently unavailable.');
  }

  const data = await response.json();
  return data.translated_sections;
}
