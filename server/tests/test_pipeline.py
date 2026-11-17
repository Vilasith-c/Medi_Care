import pytest
import asyncio
import io
import base64
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient
from app.main import app
from app.services.validator import validator_service
from app.services.summarizer import summarizer_service
from app.services.translator import translator_service
from app.models.schemas import ClinicalSections

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "Medi-Care API" in data["service"]

def test_paddleocr_endpoint_synthetic_image():
    """
    Test PaddleOCR backend inference on a synthetic test medicine label image.
    Generates a high-contrast label image and runs through PaddleOCR endpoint.
    """
    # Create synthetic test image
    img = Image.new("RGB", (400, 100), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 30), "Vitamin C Tablets IP 500 mg", fill=(0, 0, 0))
    draw.text((20, 60), "Ascorbic Acid IP 500mg", fill=(0, 0, 0))

    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    b64_img = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    response = client.post(
        "/api/v1/ocr/process",
        json={"image": b64_img}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["engine"] == "paddleocr"
    assert len(data["text"]) > 0
    # Text should capture keywords
    upper_text = data["text"].upper()
    assert "VITAMIN" in upper_text or "TABLET" in upper_text or "500" in upper_text or "ACID" in upper_text

def test_paracetamol_live_lookup():
    """
    Test live integration: RxNorm -> MedlinePlus Connect -> Clinical validation -> Summary
    """
    response = client.post(
        "/api/v1/lookup",
        json={
            "generic_name": "Paracetamol",
            "brand": "Dolo 650",
            "strength": "650mg",
            "form": "Tablet",
            "country": "India"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["verified", "partial"]
    assert data["rxcui"] is not None
    assert data["sections"] is not None
    assert len(data["sections"]["what_it_is"]) > 10
    assert len(data["sections"]["common_uses"]) > 10
    assert len(data["sections"]["key_cautions"]) > 10
    assert len(data["sources"]) >= 1

def test_ascorbic_acid_vitamin_c_lookup():
    """
    Test Ascorbic Acid / Vitamin C blister strip lookup
    """
    response = client.post(
        "/api/v1/lookup",
        json={
            "generic_name": "Ascorbic Acid",
            "brand": "Vitamin C Tablets IP 500 mg",
            "strength": "500 mg",
            "form": "Tablet",
            "country": "India"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["verified", "partial"]
    assert data["rxcui"] == "1151"
    assert data["sections"] is not None
    assert "ascorbic acid" in data["sections"]["what_it_is"].lower() or "vitamin c" in data["sections"]["what_it_is"].lower()

def test_unverified_drug_returns_clean_state():
    """
    When a non-existent or unrecognized drug is submitted, it must fail cleanly to unverified
    """
    response = client.post(
        "/api/v1/lookup",
        json={
            "generic_name": "NonExistentFakeChemicalXYZ",
            "brand": "FakeBrand",
            "strength": "100mg",
            "form": "Tablet"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "unverified"
    assert data["sections"] is None

def test_dosing_instructions_strictly_sanitized():
    """
    Safety Rule: No dosing advice, 'take 2 pills', or prescriber commands.
    """
    dirty_text = "Patient should take 2 tablets daily every 8 hours with food. Increase the dose if pain persists."
    clean_text = validator_service.sanitize_medical_text(dirty_text)
    assert "take 2" not in clean_text
    assert "Increase the dose" not in clean_text

def test_negation_preservation():
    """
    Safety Rule: Summary must NOT drop critical negations ('avoid', 'do not take').
    """
    source = "Patients with liver disease should avoid alcohol and must not take acetaminophen."
    hallucinated_summary = "Patients with liver disease can take acetaminophen with alcohol."
    
    is_safe = summarizer_service._check_negation_preservation(source, hallucinated_summary)
    assert is_safe is False

def test_telugu_translation_with_glossary():
    """
    Telugu translation pipeline: preserves recognizable drug names and applies natural Telugu terms.
    """
    sections = ClinicalSections(
        what_it_is="Ascorbic Acid is used to treat vitamin deficiency.",
        common_uses="It is used for scurvy and immune health.",
        key_cautions="Consult a doctor if you have kidney stones."
    )
    
    response = client.post(
        "/api/v1/translate",
        json={
            "sections": sections.model_dump(),
            "target_lang": "te"
        }
    )
    assert response.status_code == 200
    data = response.json()
    te_sections = data["translated_sections"]
    
    # Must contain recognizable phonetic terms and glossary translations
    assert "విటమిన్" in te_sections["what_it_is"] or "ఆస్కార్బిక్" in te_sections["what_it_is"]
    assert "వైద్యుడిని" in te_sections["key_cautions"] or "డాక్టర్" in te_sections["key_cautions"]
