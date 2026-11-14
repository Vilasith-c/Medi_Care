import React, { useState, useEffect } from 'react';
import { Camera, ShieldCheck, History, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import type { HistoryRecord } from '../types';
import { getAllScanRecords } from '../db';

interface HomeScreenProps {
  onStartScan: () => void;
  onViewHistory: () => void;
  onSelectRecord: (record: HistoryRecord) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartScan,
  onViewHistory,
  onSelectRecord,
}) => {
  const [recentRecords, setRecentRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    getAllScanRecords().then((records) => {
      setRecentRecords(records.slice(0, 3));
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24 max-w-lg mx-auto">
      {/* Top App Bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 font-bold text-sm">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">Medi-Care</h1>
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">v0 Clinical Reader</span>
          </div>
        </div>

        <button
          onClick={onStartScan}
          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" /> Scan
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Mandatory One-Line Clinical Disclaimer Banner */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-emerald-900 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong>General information only:</strong> Always ask a doctor or pharmacist about your own use. No dosing advice is given.
          </p>
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              <Sparkles className="w-3 h-3 text-emerald-300" /> Sourced Medicine Insights
            </span>
            <h2 className="text-xl font-bold leading-tight">
              Know what's in your medicine before taking it.
            </h2>
            <p className="text-xs text-emerald-100/90 leading-relaxed max-w-sm">
              Scan packaging to extract active salts, verify expiry status, and read trusted NIH/MedlinePlus summaries in English and Telugu.
            </p>

            <div className="pt-2">
              <button
                onClick={onStartScan}
                className="w-full py-3.5 px-4 bg-emerald-400 hover:bg-emerald-300 active:scale-98 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-black/20 flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                Scan Medicine Pack Now
              </button>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-emerald-600 font-bold text-xs">On-Device OCR</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Tesseract.js engine</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-emerald-600 font-bold text-xs">RxNorm & Medline</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Verified clinical data</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-emerald-600 font-bold text-xs">తెలుగు అనువాదం</div>
            <div className="text-[10px] text-slate-500 mt-0.5">IndicTrans2 Telugu</div>
          </div>
        </div>

        {/* Recent Scans Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" /> Recent Scans
            </h3>
            {recentRecords.length > 0 && (
              <button
                onClick={onViewHistory}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                View all ({recentRecords.length}) <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {recentRecords.length === 0 ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-500">No recent scans on this device.</p>
              <button
                onClick={onStartScan}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Scan a strip or bottle to get started →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRecords.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onSelectRecord(rec)}
                  className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-300 shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-99"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {rec.photo ? (
                      <img
                        src={rec.photo}
                        alt="Medicine"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {rec.confirmed.brand || rec.confirmed.generic_name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {rec.confirmed.generic_name} • {rec.confirmed.form}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
