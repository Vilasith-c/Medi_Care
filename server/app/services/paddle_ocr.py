import logging
import base64
import numpy as np
import cv2
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PaddleOCRService:
    def __init__(self):
        self._ocr = None

    def get_ocr(self):
        if self._ocr is None:
            try:
                from paddleocr import PaddleOCR
                logger.info("Initializing PaddleOCR engine with use_angle_cls=True, lang='en'...")
                # Initialize PaddleOCR with direction classifier enabled
                self._ocr = PaddleOCR(use_angle_cls=True, lang='en')
            except Exception as e:
                logger.error(f"Failed to load PaddleOCR model: {e}")
                raise RuntimeError(f"PaddleOCR engine could not be initialized: {e}")
        return self._ocr

    def process_image(self, b64_image: str) -> Dict[str, Any]:
        """
        Runs PaddleOCR text detection and recognition on an input image.
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

            ocr_engine = self.get_ocr()
            # Run PaddleOCR inference
            result = ocr_engine.ocr(img, cls=True)

            lines: List[str] = []
            confidences: List[float] = []

            # PaddleOCR returns list of lines: [ [ [box_coords], (text, score) ], ... ]
            if result and len(result) > 0 and result[0]:
                for line in result[0]:
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
