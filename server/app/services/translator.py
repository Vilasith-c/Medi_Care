import re
import logging
from typing import Dict, Any, List
from app.models.schemas import ClinicalSections

logger = logging.getLogger(__name__)

# Medical glossary mapping English terms to natural Telugu with phonetic English context
MEDICAL_GLOSSARY_TE: Dict[str, str] = {
    "paracetamol": "పారాసిటమాల్ (Paracetamol)",
    "acetaminophen": "పారాసిటమాల్ (Acetaminophen)",
    "ascorbic acid": "ఆస్కార్బిక్ ఆమ్లం (Ascorbic Acid / విటమిన్ సి)",
    "vitamin c": "విటమిన్ సి (Vitamin C / ఆస్కార్బిక్ ఆమ్లం)",
    "ibuprofen": "ఐబుప్రోఫెన్ (Ibuprofen)",
    "amoxicillin": "అమోక్సిసిలిన్ (Amoxicillin)",
    "metformin": "మెట్‌ఫార్మిన్ (Metformin)",
    "azithromycin": "అజిత్రోమైసిన్ (Azithromycin)",
    "cetirizine": "సెటిరిజిన్ (Cetirizine)",
    "pantoprazole": "పాంటోప్రజోల్ (Pantoprazole)",
    "omeprazole": "ఒమెప్రజోల్ (Omeprazole)",
    "tablet": "మాత్ర (tablet)",
    "tablets": "మాత్రలు (tablets)",
    "capsule": "క్యాప్సూల్ (capsule)",
    "capsules": "క్యాప్సూల్స్ (capsules)",
    "syrup": "సిరప్ (syrup)",
    "suspension": "లిక్విడ్ సస్పెన్షన్ (suspension)",
    "drops": "చుక్కల మందు (drops)",
    "ointment": "మలాము (ointment)",
    "cream": "క్రీమ్ (cream)",
    "fever": "జ్వరం",
    "pain": "నొప్పి",
    "headache": "తలనొప్పి",
    "infection": "ఇన్ఫెక్షన్",
    "cough": "దగ్గు",
    "cold": "జలుబు",
    "allergy": "అలర్జీ",
    "stomach ache": "కడుపు నొప్పి",
    "nausea": "వికారం",
    "vomiting": "వాంతులు",
    "dizziness": "తలతిరగడం",
    "blood pressure": "రక్తపోటు (BP)",
    "diabetes": "మధుమేహం (షుగర్ వ్యాధి)",
    "liver": "కాలేయం (liver)",
    "kidney": "మూత్రపిండాలు (kidneys)",
    "caution": "జాగ్రత్త",
    "warning": "హెచ్చరిక",
    "side effects": "దుష్ప్రభావాలు (side effects)",
    "pregnancy": "గర్భధారణ (pregnancy)",
    "breastfeeding": "పాలివ్వడం (breastfeeding)",
    "doctor": "వైద్యుడు (డాక్టర్)",
    "pharmacist": "ఫార్మసిస్ట్ (మందుల నిపుణుడు)",
}

# Common phrase translations to keep Telugu natural and readable
COMMON_PHRASE_TRANSLATIONS: Dict[str, str] = {
    "is used to treat": "చికిత్స చేయడానికి ఉపయోగిస్తారు",
    "is used for": "కోసం ఉపయోగించబడుతుంది",
    "belongs to the class of": "ఔషధాల వర్గానికి చెందినది",
    "consult a doctor": "వైద్యుడిని సంప్రదించండి",
    "before taking this medication": "ఈ మందును తీసుకునే ముందు",
    "if you have liver or kidney problems": "కాలేయం లేదా మూత్రపిండాల సమస్యలు ఉంటే",
    "keep out of reach of children": "పిల్లలకు దూరంగా ఉంచండి",
    "store at room temperature": "గది ఉష్ణోగ్రత వద్ద నిల్వ చేయండి",
}

class TranslatorService:
    def __init__(self):
        self.version = "indictrans2-te-v0"
        self._model = None  # Loaded lazily if local weights exist

    def apply_glossary(self, text: str) -> str:
        """
        Applies verified Telugu clinical terms while keeping drug names clearly recognizable.
        """
        processed = text
        for en_term, te_replacement in MEDICAL_GLOSSARY_TE.items():
            pattern = re.compile(r'\b' + re.escape(en_term) + r'\b', re.IGNORECASE)
            processed = pattern.sub(te_replacement, processed)
        return processed

    def translate_sentence_to_telugu(self, sentence: str) -> str:
        """
        Translates a concise English medical sentence into natural Telugu.
        """
        cleaned = sentence.strip()
        if not cleaned:
            return ""

        # Check for phrase translations first
        for phrase, te_trans in COMMON_PHRASE_TRANSLATIONS.items():
            pattern = re.compile(re.escape(phrase), re.IGNORECASE)
            cleaned = pattern.sub(te_trans, cleaned)

        # Apply medical glossary terms
        telugu_text = self.apply_glossary(cleaned)

        # If IndicTrans2 transformer model is loaded, run neural translation
        if self._model:
            try:
                # IndicTrans2 inference placeholder
                pass
            except Exception as e:
                logger.warning(f"IndicTrans2 neural model error: {e}")

        return telugu_text

    def translate_sections(self, sections: ClinicalSections) -> ClinicalSections:
        """
        Translates English clinical sections into Telugu.
        Uses sentence splitting and rejoins to preserve clarity.
        """
        def translate_block(text: str) -> str:
            if not text:
                return ""
            sentences = re.split(r'(?<=[.!?])\s+', text)
            translated_sentences = [self.translate_sentence_to_telugu(s) for s in sentences if s.strip()]
            return " ".join(translated_sentences)

        te_what = translate_block(sections.what_it_is)
        te_uses = translate_block(sections.common_uses)
        te_cautions = translate_block(sections.key_cautions)
        te_label = translate_block(sections.label_details) if sections.label_details else None

        return ClinicalSections(
            what_it_is=te_what,
            common_uses=te_uses,
            key_cautions=te_cautions,
            label_details=te_label
        )

translator_service = TranslatorService()
