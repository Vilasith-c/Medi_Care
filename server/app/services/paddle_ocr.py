import logging
import base64
import numpy as np
import cv2
from typing import Dict, Any, List

try:
    from app.services.image_preprocess import image_preprocess_service
except ImportError:
    from server.app.services.image_preprocess import image_preprocess_service

logger = logging.getLogger(__name__)

class PaddleOCRService:
    def __init__(self):
        self._ocr = None

    def get_ocr(self):
        if self._ocr is None:
            try:
                from paddleocr import PaddleOCR
                logger.info("Initializing PaddleOCR engine with use_textline_orientation=True, lang='en'...")
                # Initialize PaddleOCR with orientation detection enabled
                self._ocr = PaddleOCR(use_textline_orientation=True, lang='en')
            except Exception as e:
                logger.error(f"Failed to load PaddleOCR model: {e}")
                raise RuntimeError(f"PaddleOCR engine could not be initialized: {e}")
        return self._ocr

    def process_image(self, b64_image: str) -> Dict[str, Any]:
        """
        Runs PaddleOCR text detection (DBNet) and recognition (CRNN) on an input image.
        In-memory processing only: image is decoded to numpy, processed, and discarded.
        Never written to disk or logged.
        """
        try:
            if "," in b64_image:
                b64_image = b64_image.split(",")[1]
            img_bytes = base64.b64decode(b64_image)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img is None:
                raise ValueError("Could not decode image from provided data.")

            # Step 1: Preprocess with CLAHE in LAB color space to equalize metallic foil glare
            # and amplify contrast of low-opacity inks (pink, purple, cyan on foil)
            enhanced_img = image_preprocess_service.apply_clahe_contrast_enhancement(img)

            ocr_engine = self.get_ocr()
            # Step 2: Run PaddleOCR multi-directional inference (DBNet polygon detection + CRNN text recognition)
            result = ocr_engine.predict(enhanced_img)

            lines: List[str] = []
            confidences: List[float] = []

            # Handle both PaddleX pipeline dict output and classic nested list output
            if isinstance(result, list) and len(result) > 0:
                first_item = result[0]
                if isinstance(first_item, dict) and "rec_texts" in first_item:
                    texts = first_item.get("rec_texts", [])
                    scores = first_item.get("rec_scores", [])
                    for t, s in zip(texts, scores):
                        t_str = str(t).strip()
                        if t_str:
                            lines.append(t_str)
                            confidences.append(float(s))
                elif isinstance(first_item, list):
                    for line in first_item:
                        if line and len(line) >= 2:
                            text_score = line[1]
                            text = str(text_score[0]).strip()
                            score = float(text_score[1])
                            if text:
                                lines.append(text)
                                confidences.append(score)

            full_text = "\n".join(lines)
            avg_conf = int(np.mean(confidences) * 100) if confidences else 0

            return {
                "text": full_text,
                "confidence": avg_conf,
                "lines_count": len(lines),
                "engine": "paddleocr"
            }
        except Exception as e:
            logger.error(f"PaddleOCR processing error: {e}")
            raise

paddle_ocr_service = PaddleOCRService()
