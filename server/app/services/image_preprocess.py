import cv2
import numpy as np
import base64
import logging

logger = logging.getLogger(__name__)

class ImagePreprocessService:
    @staticmethod
    def decode_base64_to_cv2(data_url_or_b64: str) -> np.ndarray:
        if "," in data_url_or_b64:
            data_url_or_b64 = data_url_or_b64.split(",")[1]
        img_bytes = base64.b64decode(data_url_or_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img

    @staticmethod
    def encode_cv2_to_base64(img: np.ndarray) -> str:
        _, buffer = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        b64_str = base64.b64encode(buffer).decode("utf-8")
        return f"data:image/jpeg;base64,{b64_str}"

    def apply_clahe_contrast_enhancement(self, img: np.ndarray) -> np.ndarray:
        """
        Applies CLAHE (Contrast Limited Adaptive Histogram Equalization) in LAB color space.
        Equalizes intense specular reflections on curved blister foil and pill bottles
        while preserving chromatic hue so pink/purple/cyan ink stands out against silver foil.
        """
        if img is None:
            return img

        try:
            # 1. Convert to LAB color space to separate lightness from color chromaticity
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)

            # 2. Apply CLAHE on L (lightness) channel
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)

            # 3. Merge back and convert to BGR
            enhanced_lab = cv2.merge((cl, a, b))
            enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)

            return enhanced_bgr
        except Exception as e:
            logger.warning(f"CLAHE contrast enhancement failed: {e}")
            return img

    def preprocess_foil_strip(self, b64_img: str) -> str:
        """
        Applies CLAHE (Contrast Limited Adaptive Histogram Equalization),
        morphological noise reduction, and edge contrast enhancement to punch through
        shiny blister foil glare and embossed textures.
        """
        try:
            img = self.decode_base64_to_cv2(b64_img)
            if img is None:
                return b64_img

            # 1. Grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # 2. CLAHE (Adaptive histogram equalization)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            contrast_boosted = clahe.apply(gray)

            # 3. Bilateral filter to smooth foil grain while keeping font edges crisp
            denoised = cv2.bilateralFilter(contrast_boosted, d=7, sigmaColor=50, sigmaSpace=50)

            # 4. Morphological gradient sharpening
            kernel = np.array([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
            sharpened = cv2.filter2D(denoised, -1, kernel)

            # Blend back with contrast boosted image to avoid over-sharpening noise
            final_img = cv2.addWeighted(sharpened, 0.4, contrast_boosted, 0.6, 0)

            return self.encode_cv2_to_base64(final_img)
        except Exception as e:
            logger.warning(f"OpenCV preprocessing error: {e}")
            return b64_img

image_preprocess_service = ImagePreprocessService()
