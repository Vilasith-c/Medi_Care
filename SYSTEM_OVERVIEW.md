# Medi-Care: End-to-End System Architecture, User Journey & Technical Specification

> **Medi-Care** is an intelligent medicine packaging reader and clinical verification platform. It allows users to scan any physical medicine pack (strips, blister foils, bottles, boxes), extract active ingredients and expiry details, and receive an authoritative, sourced clinical summary in English with on-demand Telugu translation.

---

## 1. End-to-End User Journey (Input to Output Process)

The diagram and step-by-step walkthrough below detail the complete lifecycle from the moment a user captures a medicine pack to the final Telugu translation and offline storage.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Patient / Caregiver)
    participant UI as React PWA (Frontend)
    participant Canvas as Browser Canvas / jsQR
    participant ClientOCR as Tesseract.js (Offline)
    participant ServerAPI as FastAPI Backend
    participant Paddle as PaddleOCR Engine
    participant RxNorm as NIH RxNorm API
    participant Medline as MedlinePlus Connect
    participant Tavily as Tavily Search (Trusted)
    participant DB as Dexie.js (IndexedDB)

    User->>UI: 1. Opens app & taps "Scan Medicine"
    UI->>User: 2. Displays camera viewfinder with blister foil tips
    User->>UI: 3. Captures front pack photo + optional crimp edge
    UI->>Canvas: 4. Check brightness & blur; run contrast boost
    Canvas->>Canvas: 5. Detect & decode GS1 / Batch QR (if present)

    alt Online Mode (Default)
        UI->>ServerAPI: 6a. POST /api/v1/ocr/process (Base64 image)
        ServerAPI->>Paddle: 7a. Neural detection, textline orientation & OCR
        Paddle-->>ServerAPI: 8a. Raw text + bounding confidences
        ServerAPI-->>UI: 9a. Returns extracted text (image discarded)
    else Offline Fallback Mode
        UI->>ClientOCR: 6b. Run local Tesseract.js with multi-crop voting
        ClientOCR-->>UI: 7b. Returns extracted local text
    end

    UI->>UI: 10. Regex extraction + Fuzzy Pharmacopeial Match (IP/BP/USP)
    UI->>UI: 11. Calculate Expiry Status (expired / expiring_soon / ok / unknown)
    UI->>User: 12. Displays Confirm Screen with editable fields & safety warnings
    User->>UI: 13. Verifies salt name, form & taps "Continue"

    UI->>ServerAPI: 14. POST /api/v1/lookup (Generic salt, strength, form)
    ServerAPI->>RxNorm: 15. Query RxCUI & canonical drug concept
    RxNorm-->>ServerAPI: 16. Returns RxCUI & US/INN synonyms
    ServerAPI->>Medline: 17. Query patient monograph by RxCUI
    Medline-->>ServerAPI: 18. Official patient topic & citations
    ServerAPI->>Tavily: 19. Search bounded to trusted domains (NIH, WHO, FDA)
    Tavily-->>ServerAPI: 20. Corroborating medical references
    ServerAPI->>ServerAPI: 21. Validation engine (check form conflicts & drug match)
    ServerAPI->>ServerAPI: 22. Fact-check & negation preservation guard (strip dosing)
    ServerAPI-->>UI: 23. Structured clinical result + citations

    UI->>User: 24. Renders Result Screen (What it is, Common uses, Cautions)
    UI->>DB: 25. Saves full snapshot to local IndexedDB
    
    opt User Requests Telugu
        User->>UI: 26. Taps "తెలుగు (Telugu)" button
        UI->>ServerAPI: 27. POST /api/v1/translate (English clinical text)
        ServerAPI->>ServerAPI: 28. IndicTrans2 + Clinical Telugu Glossary
        ServerAPI-->>UI: 29. Natural Telugu translation
        UI->>User: 30. Updates view in Telugu (in-place)
        UI->>DB: 31. Updates stored IndexedDB record with Telugu
    end
```

### Step-by-Step Walkthrough

| Stage | Input | Processing / Operation | Output | Privacy & Safety Guarantee |
|---|---|---|---|---|
| **1. Capture & Quality Check** | User captures phone camera shot or selects file. | Browser canvas evaluates brightness histogram (detects underexposure <35 or glare >240) and prompts tilt correction. | Validated image stream or retry tip. | Photo exists only in browser RAM. |
| **2. Preprocessing & QR Scanning** | Raw image data URL. | Dynamic range stretching, CLAHE simulation, blister row slicing, and `jsQR` scan for GS1 DataMatrix codes. | Enhanced image, blister crops, and decoded batch/expiry QR data. | Client-side only. |
| **3. Text Recognition (OCR)** | Preprocessed image buffer. | **PaddleOCR** runs text detection (`PP-OCRv6_det`), angle rectification (`PP-LCNet`), and recognition (`PP-OCRv6_rec`). Fallback to local **Tesseract.js**. | Raw text lines with confidence scores. | **In-memory guarantee:** Backend receives image over HTTPS, processes in RAM, and immediately discards it. Zero disk writes. |
| **4. Extraction & Fuzzy Matching** | Raw OCR text + QR data. | Multi-pattern regex for strength ratios and dosage forms. Levenshtein fuzzy matcher maps noisy text (e.g. *"Ascorbc Acid IP 500mg"*) to official salts. | Structured fields: `{brand, generic_name, strength, form, batch, expiry}`. | Strict rule: Never hallucinate missing fields; leave blank if unverified. |
| **5. Confirmation Gate** | Extracted fields. | User reviews active ingredients on the Confirm Screen. If the detected date is past, a red banner displays: **"EXPIRED MEDICINE WARNING"**. | User-confirmed drug specifications. | User is the human-in-the-loop safety validator before any query is made. |
| **6. Clinical Normalization** | Confirmed `{generic_name, form, strength}`. | NIH RxNorm REST API maps international INN names to canonical RxCUIs and resolves synonyms (e.g., Paracetamol ↔ Acetaminophen). | Canonical RxCUI (e.g., `1151` for Ascorbic Acid, `161` for Paracetamol). | Only drug metadata leaves the phone. Photos, batch codes, and personal IDs never leave device. |
| **7. Multi-Source Retrieval** | Canonical RxCUI & query. | 1. MedlinePlus Connect returns official patient monograph. <br/> 2. Exactly **1** Tavily search bounded strictly to trusted domains (`nih.gov`, `who.int`, `fda.gov`, `nhs.uk`, `cdsco.gov.in`). | Primary patient monograph + top 2-3 corroborating clinical sources. | Strictly bounded to accredited clinical authorities. |
| **8. Safety Guard & Summarization** | Multi-source clinical texts. | 1. **Dosing Sanitizer:** Strips prescriber commands (*"take 2 tablets"*, *"increase dose"*). <br/> 2. **Negation Guard:** Enforces preservation of *"avoid"*, *"do not"*, *"never"*. <br/> 3. **Fact-Checker:** Verifies numbers & active ingredients against source. | Verified clinical sections: *What it is*, *Common uses*, *Key cautions*, *Citations*. | If rewritten text fails fact-checking, falls back to verbatim source excerpts. |
| **9. Result Display & Telugu Translation** | Structured clinical sections. | Displayed with prominent expiry status. When requested, translates English sections to natural Telugu via medical sentence segmentation and clinical phonetic glossary. | Clean English or Telugu clinical card. | Stored permanently in offline IndexedDB for zero-network re-reading. |

---

## 2. Core Functionalities

### 1. Specular Blister Foil Handling
* **Tilt & Glare Guidance:** Viewfinder UI instructs users to angle foil strips by 10°–15° to deflect specular reflection away from the lens.
* **Batch/Expiry Crimp Edge Slot:** Dedicated second photo slot to capture embossed expiry markings stamped along the aluminum crimp edge.
* **Blister Row Multi-Crop Exploitation:** Slices repeated horizontal composition lines across blister pockets so un-glared lines vote and recover obscured letters.

### 2. Pharmacopeial ("IP / BP / USP") Fuzzy Matching
* Normalizes Indian Pharmacopoeia (`IP`), British Pharmacopoeia (`BP`), and United States Pharmacopeia (`USP`) markings.
* Levenshtein distance and n-gram sliding window fuzzy matching reconcile glare typos (e.g. `Ascorbc Acid` → `Ascorbic Acid`).

### 3. Expiry Date Intelligence Engine
* Parses `EXP`, `EXPIRY`, `USE BEFORE`, and GS1 AI `(17)` dates.
* Classifies shelf-life into four distinct clinical states:
  * 🔴 **Expired:** Date is in the past. Triggers a prominent red top banner instructing the user not to consume degraded medicine.
  * 🟡 **Expiring Soon:** Within 60 days of expiration.
  * 🟢 **OK:** Valid future date beyond 60 days.
  * ⚪ **Unknown:** Date unreadable; prompts user to check packaging manually.

### 4. Zero Dosing Advice & Negation Preservation Rule
* **Dosing Sanitizer:** Any pattern instructing dosages, daily frequencies, or pill counts is automatically stripped or blocked.
* **Negation Preservation:** If source documentation contains contraindications (e.g., *"avoid alcohol"*, *"do not take during pregnancy"*), the engine guarantees these negative constraints cannot be omitted or inverted.

### 5. On-Demand Telugu Translation with Phonetic Glossary
* Translates on request without re-searching the web, guaranteeing 1:1 factual correspondence with the English verification.
* Custom clinical glossary preserves recognizable phonetic drug names (e.g. *పారాసిటమాల్ (Paracetamol)*, *విటమిన్ సి (Vitamin C)*) while providing natural Telugu terms for organs and symptoms.

---

## 3. Technology Stack

```
========================================================================================
LAYER                 TECHNOLOGY / RUNTIME          PURPOSE
========================================================================================
Client Runtime        Node.js v22.17.0              Development & build environment
Frontend Framework    React 19 / TypeScript         Single-page Progressive Web App (PWA)
Bundler & Dev Server  Vite 8.3                      Lightning-fast ESM HMR & asset bundler
Styling Engine        Tailwind CSS v4 / PostCSS     Mobile-first, responsive healthcare UI
Iconography           Lucide React                  Accessible SVG clinical iconography
Client Database       Dexie.js (IndexedDB v4)       Zero-network local offline scan storage
Client-Side OCR       Tesseract.js v7               On-device offline OCR engine
Barcode / QR Parser   jsQR                          Fast 2D canvas DataMatrix & QR reader
----------------------------------------------------------------------------------------
Backend Framework     FastAPI / Starlette           High-performance async REST API
ASGI Web Server       Uvicorn 0.30 (standard)       Production async server with uvloop
Data Validation       Pydantic v2.9 / Settings      Strict type validation & schema contracts
HTTP Async Client     HTTPx 0.27                    Non-blocking clinical API communication
Computer Vision       OpenCV 4.12 & Pillow 10.4     CLAHE, bilateral filtering, de-glaring
Neural OCR Engine     PaddleOCR v3.7 / PaddlePaddle High-accuracy text detection & recognition
Test Framework        Pytest / pytest-asyncio       Automated clinical test suite & CI/CD
========================================================================================
```

---

## 4. APIs & External Services

### 1. NIH RxNav / RxNorm REST API
* **Provider:** U.S. National Library of Medicine (NLM), National Institutes of Health.
* **Base URL:** `https://rxnav.nlm.nih.gov/REST`
* **Endpoints Used:**
  * `GET /rxcui.json?name={drug_name}&search=1`: Exact RxCUI lookup for active ingredient.
  * `GET /approximateTerm.json?term={drug_name}&maxEntries=1`: Approximate matching for misspelt salts.
  * `GET /rxcui/{rxcui}/properties.json`: Retrieves normalized canonical drug properties and generic names.
* **Authentication:** Free, public access (no API key required).

### 2. MedlinePlus Connect Web Service
* **Provider:** U.S. National Library of Medicine.
* **Endpoint:** `https://connect.medlineplus.gov/service`
* **Parameters:**
  * `knowledgeResponseType=application/json`
  * `mainSearchCriteria.v.cs=2.16.840.1.113883.6.88` (RxNorm OID)
  * `mainSearchCriteria.v.c={rxcui}`
* **Purpose:** Retrieves official, peer-reviewed patient monographs, warnings, and usage descriptions.
* **Authentication:** Free, public access (no API key required).

### 3. Tavily AI Search API
* **Provider:** Tavily Search.
* **Endpoint:** `https://api.tavily.com/search`
* **Configuration:**
  * `search_depth`: `"basic"`
  * `max_results`: `3`
  * `include_domains`: `["medlineplus.gov", "nih.gov", "fda.gov", "nhs.uk", "who.int", "cdsco.gov.in"]`
* **Purpose:** Exactly 1 bounded search query per scan to gather corroborating evidence exclusively from verified medical authorities.

### 4. Medi-Care Internal REST APIs ([server/app/main.py](file:///c:/Medi_Care/server/app/main.py))
* `GET /health`: Health-check endpoint reporting server status, version, and UTC timestamp.
* `POST /api/v1/ocr/process`: Accepts `{ image: base64 }`. Runs PaddleOCR text detection and angle rectification. Returns extracted text lines and confidence.
* `POST /api/v1/ocr/preprocess`: Accepts `{ image: base64 }`. Runs OpenCV CLAHE contrast enhancement for foil strips.
* `POST /api/v1/lookup`: Accepts `{ generic_name, brand, strength, form, country }`. Executes RxNorm normalization, MedlinePlus Connect lookup, Tavily corroboration, and safety validation.
* `POST /api/v1/translate`: Accepts `{ sections, target_lang: "te" }`. Runs the Telugu translation pipeline with clinical phonetic glossary.

---

## 5. Software Packages & Dependencies

### Client-Side Packages ([client/package.json](file:///c:/Medi_Care/client/package.json))
* `react` & `react-dom` (`^19.x`): Core declarative user interface library.
* `dexie` (`^4.4.7`): Minimalistic, reactive wrapper for browser IndexedDB storage.
* `tesseract.js` (`^7.0.0`): Pure JavaScript port of Tesseract OCR compiled to WebAssembly.
* `jsqr` (`^1.4.0`): High-speed QR Code and GS1 DataMatrix scanning library running in canvas context.
* `lucide-react` (`^1.73.0`): Icon library for UI elements (pills, cameras, shields, alerts).
* `tailwindcss` (`^4.3.5`) & `@tailwindcss/postcss`: Utility-first CSS styling framework.
* `vite` (`^8.3.6`) & `@vitejs/plugin-react`: Build tool and development server.

### Server-Side Packages ([server/requirements.txt](file:///c:/Medi_Care/server/requirements.txt))
* `fastapi` (`>=0.110.0`): Modern asynchronous web framework.
* `uvicorn[standard]` (`>=0.28.0`): Asynchronous Server Gateway Interface (ASGI) server.
* `pydantic` (`>=2.6.0`) & `pydantic-settings`: Runtime data parsing and validation.
* `httpx` (`>=0.27.0`): Async HTTP client supporting HTTP/2 and connection pooling.
* `opencv-python` (`>=4.10.0`): Image processing library (CLAHE, bilateral denoising, thresholding).
* `pillow` (`>=10.4.0`): Python Imaging Library for buffer conversions.
* `paddlepaddle` & `paddleocr`: Deep learning OCR framework specializing in scene text and textline orientation.
* `python-dotenv`: Environment variable management.

---

## 6. Privacy, Security & Data Flow Integrity

1. **No Cloud Photo Retention:**
   * Images uploaded to the backend OCR endpoint are converted directly from base64 into an in-memory NumPy array.
   * After character coordinates are extracted, the array is dereferenced and garbage collected. No images are saved to disk, object storage, or cloud buckets.
2. **Minimal Payload Policy:**
   * The phone only transmits: `generic_name`, `brand`, `strength`, `form`, and `country`.
   * Packaging photos, serial numbers, patient camera frames, and batch stamps never leave the user's phone during the clinical lookup step.
3. **Offline First Storage:**
   * Scans, confirmed metadata, and results are written directly to the client's local IndexedDB. Users can view past scans, re-read precautions, and delete individual or all records completely offline.
4. **Mandatory Disclaimer:**
   * Every result screen prominently displays: *"Medical Disclaimer: General information only. Never adjust medication without consulting a doctor or pharmacist. No dosage advice is provided."*

---

## 7. How to Run & Verify

### 1. Launch the FastAPI Backend
```powershell
cd c:\Medi_Care\server
uvicorn app.main:app --reload --port 8000
```
* Interactive Swagger Docs: `http://localhost:8000/docs`

### 2. Launch the React PWA Client
```powershell
cd c:\Medi_Care\client
npm run dev
```
* Web Application: `http://localhost:5173`

### 3. Run Automated Quality Test Suites
* **Client Extractor & Fuzzy Matcher Suite:**
  ```powershell
  cd c:\Medi_Care\client
  npx tsx test-extractors.ts
  # Result: 5/5 test packs passing (Vitamin C, Dolo 650, Augmentin, Ascoril, Ciplox)
  ```
* **Backend Clinical Pipeline Test Suite:**
  ```powershell
  cd c:\Medi_Care\server
  pytest tests\test_pipeline.py -v
  # Result: 7/7 tests passing (Health, Live RxNorm, MedlinePlus Connect, Sanitizer, Negation guard, Telugu glossary)
  ```
