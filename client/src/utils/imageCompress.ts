import jsQR from 'jsqr';

export interface CompressedImageResult {
  compressed: string;
  qrData?: string;
  originalSizeEstimateKb: number;
  compressedSizeEstimateKb: number;
}

/**
 * Compresses and scales an input image data URL using high-quality bicubic canvas rendering.
 * Keeps packaging text crisp and legible for deep learning DBNet and CRNN inference
 * while drastically slashing payload size for low-latency network transmission to FastAPI.
 */
export async function compressMedicineImage(
  dataUrl: string,
  maxDimension = 1600,
  quality = 0.85
): Promise<CompressedImageResult> {
  const origLength = dataUrl.length;
  const originalSizeEstimateKb = Math.round((origLength * 3) / 4 / 1024);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;

      // Rescale down to maxDimension preserving exact aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        resolve({
          compressed: dataUrl,
          originalSizeEstimateKb,
          compressedSizeEstimateKb: originalSizeEstimateKb,
        });
        return;
      }

      // High-precision image smoothing for sharp font contours
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Opportunistically detect GS1 / 2D packaging DataMatrix QR codes
      let qrData: string | undefined;
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imgData.data, width, height);
        if (code && code.data) {
          qrData = code.data;
        }
      } catch (err) {
        // QR scan is optional; fail-safe
      }

      // Convert to compressed JPEG data URL
      const compressed = canvas.toDataURL('image/jpeg', quality);
      const compressedSizeEstimateKb = Math.round((compressed.length * 3) / 4 / 1024);

      resolve({
        compressed,
        qrData,
        originalSizeEstimateKb,
        compressedSizeEstimateKb,
      });
    };

    img.onerror = () => {
      resolve({
        compressed: dataUrl,
        originalSizeEstimateKb,
        compressedSizeEstimateKb: originalSizeEstimateKb,
      });
    };

    img.src = dataUrl;
  });
}
