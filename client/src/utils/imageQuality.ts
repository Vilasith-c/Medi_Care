export interface ImageQualityResult {
  isGood: boolean;
  brightness: number; // 0 - 255
  message?: string;
}

export function checkImageQuality(imageDataUrl: string): Promise<ImageQualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ isGood: true, brightness: 128 });
          return;
        }

        // Downsample for fast check
        const w = 150;
        const h = Math.round((img.height / img.width) * 150) || 150;
        canvas.width = w;
        canvas.height = h;

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Standard luminance: 0.299R + 0.587G + 0.114B
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalBrightness += luma;
        }

        const avgBrightness = totalBrightness / (data.length / 4);

        if (avgBrightness < 35) {
          resolve({
            isGood: false,
            brightness: Math.round(avgBrightness),
            message: 'Photo appears too dark. Ensure good lighting for accurate medicine reading.'
          });
          return;
        }

        if (avgBrightness > 240) {
          resolve({
            isGood: false,
            brightness: Math.round(avgBrightness),
            message: 'Photo has strong glare/overexposure. Hold pack flat to reduce reflection.'
          });
          return;
        }

        resolve({
          isGood: true,
          brightness: Math.round(avgBrightness)
        });
      } catch (e) {
        resolve({ isGood: true, brightness: 128 });
      }
    };
    img.onerror = () => {
      resolve({ isGood: true, brightness: 128 });
    };
    img.src = imageDataUrl;
  });
}
