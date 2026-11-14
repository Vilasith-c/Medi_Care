# Medi-Care (v0)

A progressive web app (PWA) to scan medicine packaging, confirm extracted drug specifications on-device, and retrieve authoritative, sourced clinical summaries (English) with on-demand Telugu translation.

---

## Architecture Overview

```
Phone (PWA - React / Dexie.js)          Backend (FastAPI)
-----------------------------          -----------------
1. Camera / Gallery
2. Image quality check (brightness/blur)
3. On-device OCR (Tesseract.js)
4. Field extraction (regex + keywords)
5. Confirm / Edit screen
         |
         | (confirmed fields only: salt, form, strength)
         +-----------------------------> POST /api/v1/lookup
                                           1. RxNorm: normalise generic name / RxCUI
                                           2. MedlinePlus Connect: patient monograph
                                           3. Tavily: 1 query across trusted domains
                                           4. Clinical validation engine
                                           5. DistilBART / Extractive summary + fact check
         <----------------------------- structured result + citations
6. Result screen
7. Save to history (Dexie.js IndexedDB)
         |
         | (stored English sections)
         +-----------------------------> POST /api/v1/translate
                                           IndicTrans2 + Clinical Glossary (En -> Telugu)
         <----------------------------- Telugu translation
8. In-place record update
```

---

## Key Features in v0

- **On-Device OCR & Privacy:** Tesseract.js runs entirely on the client. Images, batch numbers, and full packaging text never leave the phone. Only verified clinical attributes (`generic_name`, `brand`, `strength`, `form`) are sent for lookup.
- **Expiry Status Engine:** Calculates `expired`, `expiring_soon` (within 60 days), `ok`, or `unknown`. Expired medication triggers a persistent banner warning.
- **Authoritative Clinical Lookup:** Integrates NIH RxNorm and MedlinePlus Connect APIs with cross-source validation.
- **Safety & Negation Guards:**
  - Strict block on dosing advice, prescriber commands, and quantity instructions.
  - Negation preservation check (prevents dropping critical cautions such as "avoid" or "do not take").
  - Automatic fallback to verbatim source excerpts if summaries fail fact-checking.
- **Telugu Medical Translation:** On-demand translation with a customized pharmaceutical glossary keeping salt names recognizable with phonetic guidance.
- **Offline History (IndexedDB):** Saved records persist offline with complete snapshots, one-tap delete, and re-lookup capabilities.

---

## Monorepo Layout

```
Medi_Care/
├── client/                     # React PWA (Vite, TailwindCSS, Dexie.js, Tesseract.js)
│   ├── src/
│   │   ├── components/         # Home, Capture, OCR, Confirm, Loading, Result, History
│   │   ├── ocr/                # Tesseract worker & regex field extractors
│   │   ├── db/                 # Dexie.js IndexedDB schema and repository
│   │   ├── services/           # Backend API client (/lookup, /translate)
│   │   └── utils/              # Expiry date parsing & canvas image quality checks
│   ├── test-extractors.ts      # Automated field extraction test suite
│   ├── package.json
│   └── vite.config.ts
├── server/                     # FastAPI Backend (Python 3.9+)
│   ├── app/
│   │   ├── core/               # Configuration & trusted medical domain settings
│   │   ├── models/             # Pydantic request / response schemas
│   │   ├── services/           # RxNorm, MedlinePlus, Tavily, Validator, Summarizer, Translator
│   │   └── main.py             # FastAPI entrypoint (/lookup, /translate, /health)
│   ├── tests/                  # Pytest test suite
│   ├── pytest.ini
│   └── requirements.txt
└── README.md
```

---

## Quickstart

### 1. Run the Backend (FastAPI)
```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation will be accessible at: `http://localhost:8000/docs`

### 2. Run the Frontend (React PWA)
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your mobile browser or emulator.

---

## Running Automated Tests

### Client Field Extraction Test Suite:
```bash
cd client
npx tsx test-extractors.ts
```

### Backend Clinical Pipeline Test Suite:
```bash
cd server
pytest tests/test_pipeline.py -v
```
