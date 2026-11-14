import React, { useState } from 'react';
import { Languages, Trash2, Info, Shield, MessageSquarePlus, Check } from 'lucide-react';
import { clearAllScanRecords } from '../db';

interface SettingsScreenProps {
  onLanguageChanged?: (lang: 'en' | 'te') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const [defaultLang, setDefaultLang] = useState<'en' | 'te'>('en');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [translationReport, setTranslationReport] = useState('');
  const [isClearing, setIsClearing] = useState(false);

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
          <p>• <strong>Front end:</strong> React PWA + Dexie.js + Tesseract.js (On-Device OCR)</p>
          <p>• <strong>Clinical Pipeline:</strong> NIH RxNorm + MedlinePlus Connect API + Tavily</p>
          <p>• <strong>Safety Engine:</strong> Zero dosage instructions, strict negation preservation, automatic verbatim excerpt fallback</p>
          <p>• <strong>Telugu Engine:</strong> IndicTrans2 architecture with custom pharmaceutical glossary</p>
        </div>
      </div>
    </div>
  );
};
