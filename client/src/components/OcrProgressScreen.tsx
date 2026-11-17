import React from 'react';
import { Loader2, ScanLine, Sparkles, Cpu } from 'lucide-react';

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
        <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md">
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold rounded-full mb-3">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
        PaddleOCR Scene-Text Engine
      </div>

      <h3 className="text-lg font-semibold text-slate-800 mb-1">
        Analyzing Medicine Pack
      </h3>
      <p className="text-xs text-slate-500 mb-6 max-w-xs leading-relaxed">
        {statusText || 'Executing neural text detection & angle rectification for blister foil...'}
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-xs bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(10, progress)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 mt-2">{progress}%</span>

      {/* Privacy Guarantee Note */}
      <div className="mt-8 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl max-w-xs text-left space-y-1">
        <div className="font-semibold text-slate-700 flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-emerald-600" /> In-Memory Privacy Guarantee:
        </div>
        <div>
          Images sent to the PaddleOCR neural engine are analyzed in volatile memory and immediately discarded. No photos are stored on the server.
        </div>
      </div>
    </div>
  );
};
