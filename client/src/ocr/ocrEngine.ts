import { processPaddleOcr } from '../services/api';
import { compressMedicineImage } from '../utils/imageCompress';

export interface OcrProgress {
  progress: number;
  status: string;
}

export interface PaddleOcrResult {
  text: string;
  confidence: number;
  engine: 'paddleocr';
  qrData?: string;
  compressedImage: string;
  originalSizeKb: number;
  compressedSizeKb: number;
}

/**
 * Runs the production PaddleOCR deep-learning pipeline:
 * 1. Slightly compresses and scales image client-side to preserve battery, speed, and sharp packaging font contours.
 * 2. Scans for any embedded GS1 / 2D DataMatrix code in-memory.
 * 3. Sends compressed payload via POST /ocr/process to the FastAPI backend.
 * 4. Backend PaddleOCR runs DBNet (polygonal text detection) + CRNN (recurrent recognition)
 *    to read curved pill bottles, reflective blister foil, and rotated packaging.
 */
export async function runPaddleOcrPipeline(
  imageDataUrl: string,
  onProgress?: (p: OcrProgress) => void
): Promise<PaddleOcrResult> {
  // Step 1: Client-side compression & optional QR check
  onProgress?.({ progress: 20, status: 'Optimizing and compressing packaging image...' });
  const compressionResult = await compressMedicineImage(imageDataUrl, 1600, 0.85);

  // Step 2: Transmit to FastAPI PaddleOCR backend
  onProgress?.({
    progress: 50,
    status: `Sending ${compressionResult.compressedSizeEstimateKb}KB to PaddleOCR neural engine...`,
  });

  const paddleRes = await processPaddleOcr(compressionResult.compressed);

  onProgress?.({
    progress: 100,
    status: 'PaddleOCR deep-learning extraction complete',
  });

  return {
    text: paddleRes.text,
    confidence: paddleRes.confidence,
    engine: 'paddleocr',
    qrData: compressionResult.qrData,
    compressedImage: compressionResult.compressed,
    originalSizeKb: compressionResult.originalSizeEstimateKb,
    compressedSizeKb: compressionResult.compressedSizeEstimateKb,
  };
}
