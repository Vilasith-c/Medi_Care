import { performOcr as performClientOcr, type OcrProgress } from './tesseractService';
import { processPaddleOcr } from '../services/api';
import { preprocessMedicineImage } from './imagePreprocess';

export interface UnifiedOcrResult {
  text: string;
  confidence: number;
  engine: 'paddleocr' | 'tesseract';
  qrData?: string;
}

export async function runOcrPipeline(
  imageDataUrl: string,
  preferredEngine: 'paddleocr' | 'tesseract' = 'paddleocr',
  onProgress?: (p: OcrProgress) => void
): Promise<UnifiedOcrResult> {
  // 1. Always run on-device QR scanner and dynamic contrast normalization first
  onProgress?.({ progress: 15, status: 'Scanning for packaging QR/GS1 DataMatrix codes...' });
  const preprocessed = await preprocessMedicineImage(imageDataUrl);
  const qrData = preprocessed.qrData;

  // 2. If user preferred or defaulted to PaddleOCR, attempt high-accuracy server inference
  if (preferredEngine === 'paddleocr') {
    try {
      onProgress?.({ progress: 40, status: 'Running PaddleOCR neural text detection (curved foil model)...' });
      const paddleRes = await processPaddleOcr(preprocessed.enhancedFull);

      onProgress?.({ progress: 100, status: 'PaddleOCR scene recognition complete' });
      return {
        text: paddleRes.text,
        confidence: paddleRes.confidence,
        engine: 'paddleocr',
        qrData
      };
    } catch (paddleError) {
      console.warn('PaddleOCR server unavailable, seamlessly falling back to local Tesseract.js:', paddleError);
      onProgress?.({ progress: 50, status: 'Falling back to on-device Tesseract.js engine...' });
    }
  }

  // 3. Fallback to client-side Tesseract.js with multi-crop voting
  const localRes = await performClientOcr(imageDataUrl, onProgress);
  return {
    text: localRes.text,
    confidence: localRes.confidence,
    engine: 'tesseract',
    qrData: qrData || localRes.qrData
  };
}
