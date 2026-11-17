import React, { useState } from 'react';
import type {
  ConfirmedFields,
  ExpiryStatus,
  LookupResult,
  HistoryRecord,
  ClinicalSections
} from './types';
import { extractAllFields } from './ocr/fieldExtractor';
import { runPaddleOcrPipeline, type OcrProgress } from './ocr/ocrEngine';
import { lookupMedicine } from './services/api';
import { saveScanRecord } from './db';

import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { CaptureScreen, type ProcessedOcrData } from './components/CaptureScreen';
import { OcrProgressScreen } from './components/OcrProgressScreen';
import { ConfirmScreen } from './components/ConfirmScreen';
import { LoadingScreen } from './components/LoadingScreen';
import { ResultScreen } from './components/ResultScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';

type AppStep = 'main' | 'capturing' | 'ocr_running' | 'confirming' | 'loading_lookup' | 'result_view';

export function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'scan' | 'history' | 'settings'>('home');
  const [currentStep, setCurrentStep] = useState<AppStep>('main');

  // Active scan state
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [secondaryPhoto, setSecondaryPhoto] = useState<string | undefined>(undefined);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({ progress: 0, status: '' });
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [confirmedFields, setConfirmedFields] = useState<ConfirmedFields>({
    brand: '',
    generic_name: '',
    strength: '',
    form: '',
    manufacturer: '',
    batch: '',
    mfg_date: '',
    expiry: '',
  });
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>('unknown');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [savedScanId, setSavedScanId] = useState<number | null>(null);

  const [preferredOcrEngine, setPreferredOcrEngine] = useState<'paddleocr' | 'tesseract'>('paddleocr');
  const [activeEngineUsed, setActiveEngineUsed] = useState<string>('paddleocr');

  // Start new scan flow
  const handleStartScan = () => {
    setCurrentTab('scan');
    setCurrentStep('capturing');
    setApiError(null);
    setLookupResult(null);
    setSavedScanId(null);
  };

  // PaddleOCR backend completes inference directly from CaptureScreen
  const handleCaptureCompleted = (
    primary: string,
    ocrData: ProcessedOcrData,
    secondary?: string
  ) => {
    setCapturedPhoto(primary);
    setSecondaryPhoto(secondary);
    setActiveEngineUsed(ocrData.engine || 'paddleocr');
    setRawOcrText(ocrData.text);
    setOcrConfidence(ocrData.confidence);

    // Extract fields with regex, GS1 QR parsing, and fuzzy salt matching
    const extracted = extractAllFields(ocrData.text, ocrData.confidence, ocrData.qrData);
    setConfirmedFields({
      brand: extracted.brand,
      generic_name: extracted.generic_name,
      strength: extracted.strength,
      form: extracted.form,
      manufacturer: extracted.manufacturer,
      batch: extracted.batch,
      mfg_date: extracted.mfg_date,
      expiry: extracted.expiry,
    });
    setExpiryStatus(extracted.expiry_status);

    setCurrentStep('confirming');
  };

  // Fallback if user prefers to enter medicine details manually without OCR
  const handleManualEntryFallback = (primary: string, secondary?: string) => {
    setCapturedPhoto(primary);
    setSecondaryPhoto(secondary);
    setActiveEngineUsed('manual');
    setRawOcrText('');
    setOcrConfidence(0);
    setConfirmedFields({
      brand: '',
      generic_name: '',
      strength: '',
      form: '',
      manufacturer: '',
      batch: '',
      mfg_date: '',
      expiry: '',
    });
    setExpiryStatus('unknown');
    setCurrentStep('confirming');
  };

  // User confirmed/edited fields -> trigger backend lookup
  const handleConfirmFields = async (fields: ConfirmedFields, expStatus: ExpiryStatus) => {
    setConfirmedFields(fields);
    setExpiryStatus(expStatus);
    setCurrentStep('loading_lookup');
    setApiError(null);

    try {
      // Query backend (RxNorm -> MedlinePlus -> Tavily -> Validator -> Summarizer)
      const res = await lookupMedicine({
        generic_name: fields.generic_name || fields.brand,
        brand: fields.brand,
        strength: fields.strength,
        form: fields.form,
        country: 'India',
      });

      setLookupResult(res);
      setCurrentStep('result_view');
    } catch (err: any) {
      console.error('Lookup failed:', err);
      setApiError(
        err.message || 'Lookup is unavailable right now. Please check your network or try again.'
      );
      // Stay on confirm screen with error so user does not lose input or photo
      setCurrentStep('confirming');
    }
  };

  // Save scan to IndexedDB
  const handleSaveToHistory = async (teluguSections?: ClinicalSections) => {
    if (!lookupResult) return;

    const record: Omit<HistoryRecord, 'id'> = {
      created_at: new Date().toISOString(),
      photo: capturedPhoto,
      raw_ocr_text: rawOcrText,
      ocr_confidence: ocrConfidence,
      confirmed: confirmedFields,
      expiry_status: expiryStatus,
      result_en: lookupResult,
      result_te: teluguSections || null,
      versions: {
        summariser: 'distilbart-extractive-v0',
        translator: 'indictrans2-te-v0',
        rules: 'v0-safety-strict',
      },
    };

    const newId = await saveScanRecord(record);
    setSavedScanId(newId);
  };

  // Refresh past lookup
  const handleRefreshLookup = async (rec: HistoryRecord) => {
    setCapturedPhoto(rec.photo);
    setConfirmedFields(rec.confirmed);
    setExpiryStatus(rec.expiry_status);
    setCurrentStep('loading_lookup');

    try {
      const res = await lookupMedicine({
        generic_name: rec.confirmed.generic_name || rec.confirmed.brand,
        brand: rec.confirmed.brand,
        strength: rec.confirmed.strength,
        form: rec.confirmed.form,
      });

      setLookupResult(res);
      setCurrentStep('result_view');
    } catch (err: any) {
      alert(`Refresh failed: ${err.message || 'Network error'}`);
      setCurrentStep('main');
    }
  };

  // History detail selection
  const handleSelectHistoryRecord = (rec: HistoryRecord) => {
    setCapturedPhoto(rec.photo);
    setConfirmedFields(rec.confirmed);
    setExpiryStatus(rec.expiry_status);
    setLookupResult(rec.result_en);
    setSavedScanId(rec.id || null);
    setCurrentStep('result_view');
  };

  const handleTabChange = (tab: 'home' | 'scan' | 'history' | 'settings') => {
    setCurrentTab(tab);
    if (tab === 'scan') {
      handleStartScan();
    } else {
      setCurrentStep('main');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Active Flow Views */}
      {currentStep === 'capturing' && (
        <CaptureScreen
          onCaptureCompleted={handleCaptureCompleted}
          onManualEntryFallback={handleManualEntryFallback}
          onCancel={() => {
            setCurrentStep('main');
            setCurrentTab('home');
          }}
        />
      )}

      {currentStep === 'confirming' && (
        <>
          {apiError && (
            <div className="p-3 bg-rose-600 text-white text-xs text-center font-medium sticky top-0 z-50 shadow-md">
              {apiError}
            </div>
          )}
          <ConfirmScreen
            photo={capturedPhoto}
            initialFields={confirmedFields}
            initialExpiryStatus={expiryStatus}
            ocrConfidence={ocrConfidence}
            ocrEngine={activeEngineUsed}
            onConfirm={handleConfirmFields}
            onCancel={() => {
              setCurrentStep('main');
              setCurrentTab('home');
            }}
          />
        </>
      )}

      {currentStep === 'loading_lookup' && <LoadingScreen />}

      {currentStep === 'result_view' && lookupResult && (
        <ResultScreen
          confirmed={confirmedFields}
          expiryStatus={expiryStatus}
          result={lookupResult}
          onSaveToHistory={handleSaveToHistory}
          onScanAnother={handleStartScan}
          isSaved={savedScanId !== null}
        />
      )}

      {/* Main Tab Views */}
      {currentStep === 'main' && (
        <>
          {currentTab === 'home' && (
            <HomeScreen
              onStartScan={handleStartScan}
              onViewHistory={() => setCurrentTab('history')}
              onSelectRecord={handleSelectHistoryRecord}
            />
          )}

          {currentTab === 'history' && (
            <HistoryScreen
              onScanNew={handleStartScan}
              onRefreshLookup={handleRefreshLookup}
            />
          )}

          {currentTab === 'settings' && <SettingsScreen />}

          {/* Persistent Bottom Navigation */}
          <Navbar currentTab={currentTab} onSelectTab={handleTabChange} />
        </>
      )}
    </div>
  );
}

export default App;
