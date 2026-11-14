from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    PARTIAL = "partial"
    UNVERIFIED = "unverified"

class ExpiryStatus(str, Enum):
    EXPIRED = "expired"
    EXPIRING_SOON = "expiring_soon"
    OK = "ok"
    UNKNOWN = "unknown"

class LookupRequest(BaseModel):
    generic_name: str = Field(..., description="Active pharmaceutical ingredient or salt name")
    brand: Optional[str] = Field("", description="Commercial brand name if any")
    strength: Optional[str] = Field("", description="Dosage strength e.g., 500mg, 5mg/5ml")
    form: Optional[str] = Field("", description="Dosage form e.g., tablet, syrup, capsule")
    country: Optional[str] = Field("India", description="Country context")

class SourceCitation(BaseModel):
    title: str
    url: str
    domain: str

class ClinicalSections(BaseModel):
    what_it_is: str = Field(..., description="Plain-language description of drug class and function")
    common_uses: str = Field(..., description="Common medical conditions treated")
    key_cautions: str = Field(..., description="Key safety warnings and precautions (no dosing)")
    label_details: Optional[str] = Field(None, description="Exact verified label specifications")

class LookupResponse(BaseModel):
    status: VerificationStatus
    sections: Optional[ClinicalSections] = None
    sources: List[SourceCitation] = Field(default_factory=list)
    retrieved_at: str
    notes: List[str] = Field(default_factory=list)
    rxcui: Optional[str] = None

class TranslateRequest(BaseModel):
    sections: ClinicalSections
    target_lang: str = "te"

class TranslateResponse(BaseModel):
    translated_sections: ClinicalSections
    target_lang: str = "te"
    translator_version: str = "indictrans2-v0"

class PreprocessRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded medicine packaging image")

class PreprocessResponse(BaseModel):
    processed_image: str = Field(..., description="CLAHE enhanced base64 image")
