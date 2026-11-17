from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import logging

from app.core.config import settings
from app.models.schemas import (
    LookupRequest,
    LookupResponse,
    TranslateRequest,
    TranslateResponse,
    PreprocessRequest,
    PreprocessResponse,
    OcrProcessRequest,
    OcrProcessResponse,
    VerificationStatus,
    SourceCitation,
)
from app.services.rxnorm import rxnorm_service
from app.services.medline import medline_service
from app.services.search import search_service
from app.services.validator import validator_service
from app.services.summarizer import summarizer_service
from app.services.translator import translator_service
from app.services.image_preprocess import image_preprocess_service
from app.services.paddle_ocr import paddle_ocr_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medi_care")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend clinical lookup and verification pipeline for Medi-Care"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.post(f"{settings.API_V1_STR}/lookup", response_model=LookupResponse)
async def lookup_medicine(req: LookupRequest):
    """
    Executes the clinical lookup pipeline:
    1. RxNorm normalization
    2. MedlinePlus Connect retrieval
    3. Tavily trusted-domain search (1 query)
    4. Multi-source clinical validation
    5. Summarization with negation and fact-check guards
    """
    generic_name = req.generic_name.strip()
    if not generic_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active pharmaceutical ingredient or generic name is required."
        )

    retrieved_at = datetime.now(timezone.utc).isoformat()
    sources_collected = []
    notes = []

    # Step 1: RxNorm Normalization
    rxcui, canonical_name = await rxnorm_service.get_rxcui_and_name(generic_name)
    if rxcui:
        logger.info(f"RxNorm match found for '{generic_name}': RxCUI {rxcui} ({canonical_name})")
    else:
        notes.append("No exact RxNorm code found for this salt name. Proceeding with clinical search.")

    # Step 2: MedlinePlus Connect by RxCUI
    medline_data = None
    if rxcui:
        medline_data = await medline_service.lookup_by_rxcui(rxcui)
        if medline_data:
            sources_collected.append({
                "title": medline_data["title"],
                "url": medline_data["url"],
                "domain": "medlineplus.gov",
                "content": medline_data.get("summary", "")
            })

    # Step 3: Tavily trusted domain search (1 query)
    tavily_results = await search_service.search_trusted(
        generic_name=generic_name,
        strength=req.strength or "",
        form=req.form or ""
    )
    for res in tavily_results:
        sources_collected.append(res)

    has_medline = medline_data is not None

    # Step 4: Validation Engine
    verification_status, val_notes = validator_service.validate_clinical_data(
        generic_name=generic_name,
        form=req.form or "",
        sources=sources_collected,
        has_medline=has_medline,
        canonical_name=canonical_name
    )
    notes.extend(val_notes)

    # Convert sources to SourceCitation response schema
    formatted_sources = [
        SourceCitation(
            title=s.get("title", "Clinical Reference"),
            url=s.get("url", "#"),
            domain=s.get("domain", "trusted-source")
        )
        for s in sources_collected
    ]

    # If status is UNVERIFIED, do not generate clinical text
    if verification_status == VerificationStatus.UNVERIFIED:
        return LookupResponse(
            status=VerificationStatus.UNVERIFIED,
            sections=None,
            sources=formatted_sources,
            retrieved_at=retrieved_at,
            notes=notes,
            rxcui=rxcui
        )

    # Step 5: Summarize with safety & negation guards
    sections = summarizer_service.generate_summary(
        generic_name=generic_name,
        sources=sources_collected,
        medline_data=medline_data
    )

    return LookupResponse(
        status=verification_status,
        sections=sections,
        sources=formatted_sources,
        retrieved_at=retrieved_at,
        notes=notes,
        rxcui=rxcui
    )

@app.post(f"{settings.API_V1_STR}/ocr/preprocess", response_model=PreprocessResponse)
async def preprocess_image(req: PreprocessRequest):
    """
    OpenCV CLAHE (Contrast Limited Adaptive Histogram Equalization) service.
    Denoises metallic foil glare and boosts character contrast for foil blister strips.
    Privacy guarantee: In-memory processing only; images are never written to disk or logged.
    """
    processed = image_preprocess_service.preprocess_foil_strip(req.image)
    return PreprocessResponse(processed_image=processed)

@app.post(f"{settings.API_V1_STR}/ocr/process", response_model=OcrProcessResponse)
async def process_ocr(req: OcrProcessRequest):
    """
    PaddleOCR text detection and recognition endpoint.
    Optimized for photographed scene text, curved blister foils, and rotated print.
    Privacy guarantee: In-memory processing only; raw image data is immediately discarded.
    """
    try:
        res = paddle_ocr_service.process_image(req.image)
        return OcrProcessResponse(
            text=res["text"],
            confidence=res["confidence"],
            engine=res["engine"]
        )
    except Exception as e:
        logger.error(f"PaddleOCR processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PaddleOCR processing error: {str(e)}"
        )

@app.post(f"{settings.API_V1_STR}/translate", response_model=TranslateResponse)
async def translate_to_telugu(req: TranslateRequest):
    """
    Translates confirmed English clinical sections to Telugu.
    Never initiates a new search; strictly preserves English factual meaning.
    """
    translated = translator_service.translate_sections(req.sections)
    return TranslateResponse(
        translated_sections=translated,
        target_lang="te",
        translator_version=translator_service.version
    )
