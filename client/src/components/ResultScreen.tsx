import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Languages,
  BookmarkCheck,
  Bookmark,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Calendar,
  Building2,
  Tag
} from 'lucide-react';
import type { ConfirmedFields, ExpiryStatus, LookupResult, ClinicalSections } from '../types';
import { translateToTelugu } from '../services/api';

interface ResultScreenProps {
  confirmed: ConfirmedFields;
  expiryStatus: ExpiryStatus;
  result: LookupResult;
  onSaveToHistory: (teluguSections?: ClinicalSections) => Promise<void>;
  onScanAnother: () => void;
  isSaved?: boolean;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  confirmed,
  expiryStatus,
  result,
  onSaveToHistory,
  onScanAnother,
  isSaved = false,
}) => {
  const [currentLang, setCurrentLang] = useState<'en' | 'te'>('en');
  const [teluguSections, setTeluguSections] = useState<ClinicalSections | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(isSaved);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleTelugu = async () => {
    if (currentLang === 'te') {
      setCurrentLang('en');
      return;
    }

    if (teluguSections) {
      setCurrentLang('te');
      return;
    }

    if (!result.sections) return;

    try {
      setIsTranslating(true);
      setTranslationError(null);
      const translated = await translateToTelugu(result.sections);
      setTeluguSections(translated);
      setCurrentLang('te');
    } catch (err: any) {
      setTranslationError(err.message || 'Failed to translate to Telugu. Showing English.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (hasSaved || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveToHistory(teluguSections || undefined);
      setHasSaved(true);
    } catch (err) {
      console.error('Failed to save scan record:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSections = currentLang === 'te' && teluguSections ? teluguSections : result.sections;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24 max-w-lg mx-auto">
      {/* Expiry Alert (If Expired, Prominently on Top) */}
      {expiryStatus === 'expired' && (
        <div className="bg-rose-600 text-white p-4 sticky top-0 z-20 shadow-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">EXPIRED MEDICINE ALERT</h4>
              <p className="text-xs text-rose-100 mt-0.5 leading-snug">
                This medicine expired on <span className="font-semibold underline">{confirmed.expiry || 'recorded date'}</span>. Chemically degraded or expired medicine should not be ingested. Consult a pharmacist for safe disposal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Medicine Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {confirmed.form || 'Medicine'}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-1">
                {confirmed.brand || confirmed.generic_name}
              </h1>
              {confirmed.brand && confirmed.generic_name && (
                <p className="text-xs font-semibold text-slate-600">
                  Salt: {confirmed.generic_name}
                </p>
              )}
            </div>

            {/* Verification Status Badge */}
            <div>
              {result.status === 'verified' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                </span>
              )}
              {result.status === 'partial' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Partial
                </span>
              )}
              {result.status === 'unverified' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Unverified
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Strength: <strong>{confirmed.strength || 'As labeled'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Expiry: <strong>{confirmed.expiry || 'Not stated'}</strong></span>
            </div>
          </div>
        </div>

        {/* Translation Banner / Toggle Button */}
        {result.status !== 'unverified' && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              <Languages className="w-4 h-4 text-emerald-600" />
              <span className="font-medium text-slate-700">
                {currentLang === 'te' ? 'తెలుగులో చూస్తున్నారు' : 'Read in Telugu (తెలుగు)'}
              </span>
            </div>
            <button
              onClick={handleToggleTelugu}
              disabled={isTranslating}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentLang === 'te'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Translating...
                </>
              ) : currentLang === 'te' ? (
                'English'
              ) : (
                'తెలుగు'
              )}
            </button>
          </div>
        )}

        {translationError && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
            {translationError}
          </div>
        )}

        {/* UNVERIFIED STATE */}
        {result.status === 'unverified' ? (
          <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              We couldn't verify this medicine
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              The extracted name or dosage form could not be corroborated across trusted clinical databases (MedlinePlus / NIH / WHO).
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs text-left">
              <span className="font-semibold block mb-1">Recommended action:</span>
              Please consult a licensed pharmacist or doctor with your medicine pack.
            </div>
            {result.notes.length > 0 && (
              <div className="text-[11px] text-slate-400 text-left pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-500">System verification notes:</span>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {result.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* VERIFIED / PARTIAL CLINICAL SECTIONS */
          <div className="space-y-3">
            {/* What it is */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {currentLang === 'te' ? 'ఇది ఏమిటి (What It Is)' : 'What It Is'}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeSections?.what_it_is}
              </p>
            </div>

            {/* Common uses */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                {currentLang === 'te' ? 'సాధారణ ఉపయోగాలు (Common Uses)' : 'Common Uses'}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeSections?.common_uses}
              </p>
            </div>

            {/* Key cautions (Strictly non-prescriptive) */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {currentLang === 'te' ? 'ముఖ్యమైన జాగ్రత్తలు (Key Cautions)' : 'Key Cautions'}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeSections?.key_cautions}
              </p>
            </div>

            {/* Label details as printed */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1.5">
              <h4 className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                Packaging Details (As Printed)
              </h4>
              {confirmed.manufacturer && (
                <div className="flex items-start gap-1.5 text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Manufacturer: {confirmed.manufacturer}</span>
                </div>
              )}
              {confirmed.batch && (
                <div className="text-slate-600 pl-5">
                  Batch: <span className="font-mono font-medium">{confirmed.batch}</span>
                </div>
              )}
            </div>

            {/* Authoritative Sources */}
            <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 text-xs">
              <h4 className="font-semibold text-slate-700 mb-2 flex items-center justify-between">
                <span>Authoritative Clinical Sources</span>
                <span className="text-[10px] text-slate-400">
                  Retrieved {new Date(result.retrieved_at).toLocaleDateString()}
                </span>
              </h4>
              <ul className="space-y-1.5">
                {result.sources.map((src, i) => (
                  <li key={i}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{src.title} ({src.domain})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Mandatory Safety Disclaimer */}
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
          <strong>Medical Disclaimer:</strong> General information only. Never adjust medication without consulting a doctor or pharmacist. No dosage advice is provided.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={hasSaved || isSaving}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              hasSaved
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 active:scale-98'
            }`}
          >
            {hasSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-emerald-600" /> Saved to History
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4 text-slate-500" /> Save Record
              </>
            )}
          </button>

          <button
            onClick={onScanAnother}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/20 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Scan Another
          </button>
        </div>
      </div>
    </div>
  );
};
