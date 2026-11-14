import jsQR from 'jsqr';

export interface PreprocessedImages {
  enhancedFull: string;
  crops: string[];
  qrData?: string;
}

export async function preprocessMedicineImage(dataUrl: string): Promise<PreprocessedImages> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Original dimensions
      const origW = img.width;
      const origH = img.height;

      // Upscale if small, or keep max 1600px for speed and crispness
      const maxDim = 1600;
      let targetW = origW;
      let targetH = origH;
      if (origW > maxDim || origH > maxDim) {
        if (origW > origH) {
          targetW = maxDim;
          targetH = Math.round((origH / origW) * maxDim);
        } else {
          targetH = maxDim;
          targetW = Math.round((origW / origH) * maxDim);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve({ enhancedFull: dataUrl, crops: [] });
        return;
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      const imgData = ctx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      // 1. Try decoding QR Code first before modifying pixel values
      let qrDecoded: string | undefined = undefined;
      try {
        const qrResult = jsQR(d, targetW, targetH);
        if (qrResult && qrResult.data) {
          qrDecoded = qrResult.data;
        }
      } catch (e) {
        // Continue if QR fails
      }

      // 2. Grayscale & Contrast Histogram Stretch (kills foil specular washouts)
      let minVal = 255;
      let maxVal = 0;
      const grayBuffer = new Uint8Array(targetW * targetH);

      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        // Luminance
        const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        grayBuffer[p] = gray;
        if (gray < minVal) minVal = gray;
        if (gray > maxVal) maxVal = gray;
      }

      // Expand dynamic range (contrast boost)
      const range = Math.max(1, maxVal - minVal);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        let stretched = Math.round(((grayBuffer[p] - minVal) / range) * 255);
        // Apply high-contrast gamma curve to suppress silver background and darken print
        if (stretched > 180) {
          stretched = Math.min(255, stretched + 30);
        } else if (stretched < 110) {
          stretched = Math.max(0, stretched - 35);
        }
        d[i] = stretched;
        d[i + 1] = stretched;
        d[i + 2] = stretched;
      }

      ctx.putImageData(imgData, 0, 0);
      const enhancedFull = canvas.toDataURL('image/jpeg', 0.92);

      // 3. Multi-Crop Generation to exploit repeated blister strip lines
      // Top horizontal band (blister row 1)
      const crops: string[] = [];
      const sliceDefs = [
        { y: 0.05, h: 0.40 }, // Top band
        { y: 0.30, h: 0.40 }, // Middle band
        { y: 0.55, h: 0.40 }  // Bottom band
      ];

      for (const s of sliceDefs) {
        const cropCanvas = document.createElement('canvas');
        const cW = targetW;
        const cH = Math.round(targetH * s.h);
        cropCanvas.width = cW;
        cropCanvas.height = cH;
        const cropCtx = cropCanvas.getContext('2d');
        if (cropCtx) {
          cropCtx.drawImage(
            canvas,
            0, Math.round(targetH * s.y), cW, cH,
            0, 0, cW, cH
          );
          crops.push(cropCanvas.toDataURL('image/jpeg', 0.90));
        }
      }

      resolve({
        enhancedFull,
        crops,
        qrData: qrDecoded
      });
    };

    img.onerror = () => {
      resolve({ enhancedFull: dataUrl, crops: [] });
    };

    img.src = dataUrl;
  });
}
