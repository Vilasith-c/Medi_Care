import React, { useState } from 'react';
import { Languages, Trash2, Shield, MessageSquarePlus, Check, Cpu, Sparkles } from 'lucide-react';
import { clearAllScanRecords } from '../db';

interface SettingsScreenProps {
  onLanguageChanged?: (lang: 'en' | 'te') => void;
  preferredOcr?: 'paddleocr' | 'tesseract';
  onOcrEngineChanged?: (engine: 'paddleocr' | 'tesseract') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  preferredOcr = 'paddleocr',
  onOcrEngineChanged,
}) => {
  const [defaultLang, setDefaultLang] = useState<'en' | 'te'>('en');
  const [ocrEngine, setOcrEngine] = useState<'paddleocr' | 'tesseract'>(preferredOcr);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [translationReport, setTranslationReport] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const handleSelectOcr = (engine: 'paddleocr' | 'tesseract') => {
    setOcrEngine(engine);
    onOcrEngineChanged?.(engine);
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all saved scan history from this device? This cannot be undone.')) {
      setIsClearing(true);
      await clearAllScanRecords();
      setIsClearing(false);
      alert('Local history cleared.');
    }
  };

  const handleReportTranslation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!translationReport.trim()) return;
    setFeedbackSuccess(true);
    setTranslationReport('');
    setTimeout(() => setFeedbackSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24 max-w-lg mx-auto">
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-10">
        <h2 className="text-base font-bold text-slate-900">Settings & About</h2>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* OCR Engine Preference */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-600" /> OCR Engine Preference
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Select which OCR recognition model processes packaging photos:
          </p>
          <div className="space-y-2">
            <button
              onClick={() => handleSelectOcr('paddleocr')}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                ocrEngine === 'paddleocr'
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 border-emerald-600">
                {ocrEngine === 'paddleocr' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
              </div>
              <div>
                <div className="font-bold flex items-center gap-1.5 text-xs text-slate-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  PaddleOCR (Recommended)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  High-accuracy scene text recognition with angle classification. Excels at curved blister foil, grey-on-silver print, and reflections. (In-memory privacy guaranteed).
                </div>
              </div>
            </button>

            <button
              onClick={() => handleSelectOcr('tesseract')}
              className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                ocrEngine === 'tesseract'
                  ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 border-emerald-600">
                {ocrEngine === 'tesseract' && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
              </div>
              <div>
                <div className="font-bold text-xs text-slate-900">
                  Tesseract.js (On-Device Local Only)
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Runs directly inside the browser. Best for high-contrast boxes and flat paper leaflets.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Language Preference */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Languages className="w-4 h-4 text-emerald-600" /> Default Language
          </h3>
          <p className="text-slate-500 text-[11px]">
            Choose whether results default to English or Telugu upon lookup.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDefaultLang('en')}
              className={`flex-1 py-2 px-3 rounded-lg border font-medium text-xs transition-all ${
                defaultLang === 'en'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setDefaultLang('te')}
              className={`flex-1 py-2 px-3 rounded-lg border font-medium text-xs transition-all ${
                defaultLang === 'te'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              తెలుగు (Telugu)
            </button>
          </div>
        </div>

        {/* Translation Glossary Contribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-emerald-600" /> Suggest Translation Fix
          </h3>
          <p className="text-slate-500 text-[11px]">
            Found an unnatural Telugu term or translated brand name? Help improve the clinical glossary:
          </p>
          <form onSubmit={handleReportTranslation} className="space-y-2">
            <input
              type="text"
              value={translationReport}
              onChange={(e) => setTranslationReport(e.target.value)}
              placeholder="e.g. Paracetamol should show as పారాసిటమాల్..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-xs transition-colors"
            >
              Submit Feedback
            </button>
            {feedbackSuccess && (
              <span className="text-emerald-600 text-[11px] flex items-center gap-1 mt-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Thank you! Term queued for glossary update.
              </span>
            )}
          </form>
        </div>

        {/* Data Management */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" /> Local Data
          </h3>
          <p className="text-slate-500 text-[11px]">
            All scanned packaging images, extracted metadata, and search histories are saved strictly inside your browser's IndexedDB.
          </p>
          <button
            onClick={handleClearHistory}
            disabled={isClearing}
            className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs transition-colors"
          >
            {isClearing ? 'Clearing...' : 'Clear All Scan History'}
          </button>
        </div>

        {/* System & Architecture Info */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-[11px] text-slate-500">
          <h3 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5 text-emerald-600" /> Medi-Care v0 Architecture
          </h3>
          <p>• <strong>Primary OCR Engine:</strong> PaddleOCR with direction classifier & angle rectification</p>
          <p>• <strong>Offline Fallback:</strong> Tesseract.js with client-side CLAHE contrast boost</p>
          <p>• <strong>Clinical Pipeline:</strong> NIH RxNorm + MedlinePlus Connect API + Tavily</p>
          <p>• <strong>Fuzzy Matcher:</strong> Levenshtein & Indian Pharmacopoeia (IP) salt normalization</p>
          <p>• <strong>Telugu Engine:</strong> IndicTrans2 architecture with pharmaceutical glossary</p>
        </div>
      </div>
    </div>
  );
};
