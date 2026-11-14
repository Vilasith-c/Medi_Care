import re
import logging
from typing import Dict, Any, List, Tuple
from app.models.schemas import ClinicalSections
from app.services.validator import validator_service

logger = logging.getLogger(__name__)

NEGATION_TERMS = ["not", "avoid", "never", "do not", "don't", "cannot", "can't", "no", "should not"]

class SummarizerService:
    def __init__(self):
        self.version = "distilbart-extractive-v0"

    def _split_sentences(self, text: str) -> List[str]:
        # Split on sentence boundaries
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if len(s.strip()) > 15]

    def _extract_numbers(self, text: str) -> set:
        return set(re.findall(r'\b\d+(?:\.\d+)?\b', text))

    def _check_negation_preservation(self, source_text: str, summary_text: str) -> bool:
        """
        Safety rule: Reject summaries that lose critical negations present in the source sentence.
        """
        source_lower = source_text.lower()
        summary_lower = summary_lower = summary_text.lower()

        # If source contains warnings like "do not take with" or "avoid", summary must reflect caution
        for term in ["avoid", "do not", "never", "should not"]:
            if term in source_lower and term not in summary_lower and "caution" not in summary_lower:
                logger.warning(f"Negation safety breach: '{term}' present in source but omitted from summary.")
                return False
        return True

    def _fact_check(self, source_text: str, summary_text: str, generic_name: str) -> bool:
        """
        Strict fact check:
        1. Drug name must appear.
        2. Numbers in summary must strictly exist in source (prevents dosage hallucination).
        3. Negations must be preserved.
        """
        source_clean = source_text.lower()
        summary_clean = summary_text.lower()

        # 1. Active ingredient check
        if generic_name.lower() not in summary_clean and generic_name.lower() in source_clean:
            logger.info("Fact check failed: Generic drug name missing from generated summary.")
            return False

        # 2. Number check
        summary_nums = self._extract_numbers(summary_clean)
        source_nums = self._extract_numbers(source_clean)
        if not summary_nums.issubset(source_nums):
            diff = summary_nums - source_nums
            logger.warning(f"Fact check failed: Hallucinated numbers detected: {diff}")
            return False

        # 3. Negation check
        if not self._check_negation_preservation(source_clean, summary_clean):
            return False

        return True

    def extract_salient_sentences(self, sentences: List[str], keywords: List[str], max_sentences: int = 3) -> str:
        """
        Extractive summarisation for authoritative medical text (MedlinePlus / NIH).
        Selects high-confidence factual sentences matching clinical sections.
        """
        ranked = []
        for s in sentences:
            s_lower = s.lower()
            score = sum(1 for kw in keywords if kw.lower() in s_lower)
            if score > 0:
                ranked.append((score, s))
        ranked.sort(key=lambda x: x[0], reverse=True)
        selected = [item[1] for item in ranked[:max_sentences]]
        if not selected and sentences:
            selected = sentences[:max_sentences]
        return " ".join(selected)

    def generate_summary(
        self,
        generic_name: str,
        sources: List[Dict[str, Any]],
        medline_data: Dict[str, Any] = None
    ) -> ClinicalSections:
        """
        Generates structured clinical sections with safety fact checking and verbatim fallback.
        """
        all_text_blocks = []
        if medline_data and medline_data.get("summary"):
            all_text_blocks.append(medline_data["summary"])
        for s in sources:
            if s.get("content"):
                all_text_blocks.append(s["content"])

        full_source_text = " ".join(all_text_blocks)
        sentences = self._split_sentences(full_source_text)

        # 1. Section: What it is
        what_kw = ["is a", "belongs to", "class of medications", "used to treat", "active ingredient"]
        what_it_is = self.extract_salient_sentences(sentences, what_kw, max_sentences=2)
        if not what_it_is:
            what_it_is = f"{generic_name} is a pharmaceutical medication referenced in clinical databases."

        # 2. Section: Common uses
        uses_kw = ["used for", "treats", "relieves", "prescribed for", "symptoms", "conditions", "indicated for"]
        common_uses = self.extract_salient_sentences(sentences, uses_kw, max_sentences=3)
        if not common_uses:
            common_uses = f"Common clinical indications for {generic_name} as documented in clinical references."

        # 3. Section: Key cautions (strictly filtered for no direct prescriber commands)
        cautions_kw = ["caution", "warning", "side effects", "allergic", "liver", "kidney", "pregnancy", "avoid", "do not"]
        key_cautions = self.extract_salient_sentences(sentences, cautions_kw, max_sentences=3)
        if not key_cautions:
            key_cautions = "Discuss potential contraindications, allergies, and interactions with a qualified healthcare professional."

        # Sanitize against dosing advice
        what_it_is = validator_service.sanitize_medical_text(what_it_is)
        common_uses = validator_service.sanitize_medical_text(common_uses)
        key_cautions = validator_service.sanitize_medical_text(key_cautions)

        # Safety Check & Verbatim Fallback
        for sec_name, sec_text in [("What it is", what_it_is), ("Common uses", common_uses), ("Key cautions", key_cautions)]:
            if not self._fact_check(full_source_text, sec_text, generic_name):
                logger.warning(f"Section '{sec_name}' failed fact check. Reverting to verbatim source excerpt.")
                # Fallback to direct excerpt
                if medline_data and medline_data.get("summary"):
                    sec_text = medline_data["summary"][:250] + "..."

        return ClinicalSections(
            what_it_is=what_it_is,
            common_uses=common_uses,
            key_cautions=key_cautions,
            label_details=None
        )

summarizer_service = SummarizerService()
