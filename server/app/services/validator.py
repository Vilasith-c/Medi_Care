import re
import logging
from typing import List, Dict, Any, Tuple
from app.models.schemas import VerificationStatus

logger = logging.getLogger(__name__)

# Patterns that strictly violate the "No Dosing Advice" rule
FORBIDDEN_DOSING_PATTERNS = [
    re.compile(r'\b(take|taken|taking)\s+\d+\b', re.IGNORECASE),
    re.compile(r'\b\d+\s+(tablet|tablets|capsule|capsules|pills|spoons|ml|mg)\s+(daily|per day|twice|every)', re.IGNORECASE),
    re.compile(r'\bdosage\s*:\s*\d+', re.IGNORECASE),
    re.compile(r'\bstop\s+taking\s+immediately\b', re.IGNORECASE),
    re.compile(r'\bincrease\s+the\s+dose\b', re.IGNORECASE),
    re.compile(r'\bdecrease\s+the\s+dose\b', re.IGNORECASE),
]

# Form conflict dictionaries (detect if text describes incompatible dosage forms)
FORM_INCOMPATIBILITIES = {
    "syrup": ["swallow the tablet", "chew the tablet", "tablet whole", "capsule with water"],
    "suspension": ["swallow the tablet", "chew the tablet", "tablet whole"],
    "tablet": ["shake the liquid well", "shake the bottle", "drops into the eye"],
    "capsule": ["shake the liquid well", "drops into the eye", "ointment to the skin"],
    "drops": ["swallow the tablet", "swallow whole with water"],
    "ointment": ["swallow with water", "take with food", "oral administration"],
    "cream": ["swallow with water", "take with food", "oral administration"],
    "gel": ["swallow with water", "take with food"],
    "injection": ["swallow whole", "chew thoroughly", "apply topically"]
}

GLOBAL_SYNONYMS = {
    "paracetamol": ["acetaminophen", "paracetamol"],
    "acetaminophen": ["paracetamol", "acetaminophen"],
    "ascorbic acid": ["vitamin c", "ascorbic acid"],
    "vitamin c": ["ascorbic acid", "vitamin c"],
    "salbutamol": ["albuterol", "salbutamol"],
    "albuterol": ["salbutamol", "albuterol"],
}

class ValidationService:
    def sanitize_medical_text(self, text: str) -> str:
        """
        Removes any accidental dosing recommendations or prescriber instructions.
        """
        cleaned = text
        for pattern in FORBIDDEN_DOSING_PATTERNS:
            cleaned = pattern.sub("[consult pharmacist/physician for dosing]", cleaned)
        return cleaned

    def validate_clinical_data(
        self,
        generic_name: str,
        form: str,
        sources: List[Dict[str, Any]],
        has_medline: bool,
        canonical_name: str = None
    ) -> Tuple[VerificationStatus, List[str]]:
        """
        Validates gathered clinical sources against safety and accuracy rules.
        """
        notes = []
        gen_clean = generic_name.strip().lower()
        form_clean = (form or "").strip().lower()

        # Build list of allowable matching names (original, RxNorm canonical, and global synonyms)
        acceptable_names = {gen_clean}
        if canonical_name:
            acceptable_names.add(canonical_name.strip().lower())
        for syn in GLOBAL_SYNONYMS.get(gen_clean, []):
            acceptable_names.add(syn.lower())

        if not sources and not has_medline:
            notes.append("No authoritative clinical source returned data for this salt name.")
            return VerificationStatus.UNVERIFIED, notes

        # 1. At least one source names the confirmed generic name or canonical synonym
        found_name = False
        all_text = " ".join([f"{s.get('title', '')} {s.get('content', '')} {s.get('summary', '')}" for s in sources]).lower()
        for name in acceptable_names:
            if name in all_text:
                found_name = True
                break

        if not found_name:
            notes.append(f"Confirmed generic ingredient '{generic_name}' was not verified in source texts.")
            return VerificationStatus.UNVERIFIED, notes

        # 2. Check for dosage form mismatch
        if form_clean:
            for key_form, conflicting_phrases in FORM_INCOMPATIBILITIES.items():
                if key_form in form_clean:
                    for phrase in conflicting_phrases:
                        if phrase in all_text:
                            notes.append(f"Source text contains contradictory administration instructions ({phrase}) for {form_clean}.")
                            # Form conflicts require pharmacist verification
                            return VerificationStatus.UNVERIFIED, notes

        # 3. Source count verification
        # If only MedlinePlus is found, mark partial
        if has_medline and len(sources) <= 1:
            notes.append("Verified via primary reference (MedlinePlus Connect). Secondary web references pending.")
            return VerificationStatus.PARTIAL, notes

        if len(sources) >= 2 or (has_medline and len(sources) >= 1):
            notes.append("Cross-verified across authoritative clinical reference databases.")
            return VerificationStatus.VERIFIED, notes

        notes.append("Limited reference data available. Verify with licensed pharmacist.")
        return VerificationStatus.PARTIAL, notes

validator_service = ValidationService()
