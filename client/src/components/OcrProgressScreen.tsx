import React from 'react';
import { Loader2, ScanLine } from 'lucide-react';

interface OcrProgressScreenProps {
  progress: number;
  statusText: string;
}

export const OcrProgressScreen: React.FC<OcrProgressScreenProps> = ({ progress, statusText }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center max-w-lg mx-auto">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
          <ScanLine className="w-10 h-10 animate-pulse text-emerald-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-1">
        Reading Medicine Label
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        {statusText || 'Extracting active ingredients, form, strength, and dates...'}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-xs bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(8, progress)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 mt-2">{progress}%</span>

      <div className="mt-8 text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg max-w-xs">
        Running fully on-device via Tesseract.js. No photos leave your phone.
      </div>
    </div>
  );
};
