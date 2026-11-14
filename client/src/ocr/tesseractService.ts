import { createWorker } from 'tesseract.js';
import { preprocessMedicineImage } from './imagePreprocess';

export interface OcrProgress {
  progress: number;
  status: string;
}

export interface OcrResult {
  text: string;
  confidence: number;
  qrData?: string;
}

export async function performOcr(
  imageSource: string,
  onProgress?: (p: OcrProgress) => void
): Promise<OcrResult> {
  try {
    onProgress?.({ progress: 10, status: 'Pre-processing image (contrast boost & glare filter)...' });

    // 1. Contrast stretch, CLAHE simulation, and QR scan
    const preprocessed = await preprocessMedicineImage(imageSource);
    const qrData = preprocessed.qrData;

    onProgress?.({ progress: 20, status: 'Initializing OCR worker...' });
    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const pct = Math.min(90, Math.round((m.progress || 0) * 70) + 20);
          onProgress?.({ progress: pct, status: 'Reading medicine packaging & repeated blister rows...' });
        }
      }
    });

    // 2. Perform OCR on enhanced primary image
    onProgress?.({ progress: 30, status: 'Scanning high-contrast text...' });
    const primaryRet = await worker.recognize(preprocessed.enhancedFull);
    let combinedText = primaryRet.data.text || '';
    let totalConfidence = primaryRet.data.confidence || 0;
    let runsCount = 1;

    // 3. Multi-crop voting: If packaging has repeated blister rows, scan crops to capture obscured lines
    if (preprocessed.crops.length > 0) {
      onProgress?.({ progress: 75, status: 'Scanning repeated blister rows to recover obscured characters...' });
      for (const cropUrl of preprocessed.crops.slice(0, 2)) {
        try {
          const cropRet = await worker.recognize(cropUrl);
          if (cropRet.data.text && cropRet.data.text.trim().length > 10) {
            combinedText += '\n' + cropRet.data.text;
            totalConfidence += cropRet.data.confidence;
            runsCount++;
          }
        } catch (e) {
          // Continue if crop fails
        }
      }
    }

    await worker.terminate();
    onProgress?.({ progress: 100, status: 'Packaging text extraction complete' });

    return {
      text: combinedText,
      confidence: Math.round(totalConfidence / runsCount),
      qrData
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    throw new Error('Failed to extract text from medicine photo. Please try a clearer picture.');
  }
}
