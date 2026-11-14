import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, ChevronRight, AlertCircle, RefreshCw, AlertTriangle, CheckCircle2, ArrowLeft, ShieldAlert } from 'lucide-react';
import type { HistoryRecord } from '../types';
import { getAllScanRecords, deleteScanRecord, clearAllScanRecords } from '../db';
import { ResultScreen } from './ResultScreen';

interface HistoryScreenProps {
  onScanNew: () => void;
  onRefreshLookup: (record: HistoryRecord) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onScanNew, onRefreshLookup }) => {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const items = await getAllScanRecords();
      setRecords(items);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleDeleteOne = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this saved medicine scan?')) {
      await deleteScanRecord(id);
      await loadRecords();
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    }
  };

  const handleClearAll = async () => {
    if (records.length === 0) return;
    if (confirm('Clear all scan history from this device?')) {
      await clearAllScanRecords();
      await loadRecords();
      setSelectedRecord(null);
    }
  };

  if (selectedRecord) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSelectedRecord(null)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to History
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRefreshLookup(selectedRecord)}
              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1 hover:bg-emerald-100"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Lookup
            </button>
            <button
              onClick={(e) => selectedRecord.id && handleDeleteOne(selectedRecord.id, e)}
              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg"
              title="Delete scan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Information as of {new Date(selectedRecord.created_at).toLocaleDateString()}</span>
          <span>IndexedDB local offline record</span>
        </div>

        <ResultScreen
          confirmed={selectedRecord.confirmed}
          expiryStatus={selectedRecord.expiry_status}
          result={selectedRecord.result_en}
          onSaveToHistory={async () => {}}
          onScanAnother={onScanNew}
          isSaved={true}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="text-base font-bold text-slate-900">Scan History</h2>
          <p className="text-[11px] text-slate-500">Stored safely on device</p>
        </div>
        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading saved history...</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No scanned medicines yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Scan medicine packs to keep track of active ingredients, expiration dates, and clinical cautions.
            </p>
            <button
              onClick={onScanNew}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:bg-emerald-700 active:scale-98 transition-all"
            >
              Scan Your First Medicine
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <div
                key={rec.id}
                onClick={() => setSelectedRecord(rec)}
                className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-99"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {rec.photo ? (
                    <img
                      src={rec.photo}
                      alt="Medicine thumbnail"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {rec.confirmed.brand || rec.confirmed.generic_name}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {rec.confirmed.generic_name} • {rec.confirmed.strength || rec.confirmed.form}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {rec.expiry_status === 'expired' && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> Expired
                        </span>
                      )}
                      {rec.expiry_status === 'expiring_soon' && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Expiring Soon
                        </span>
                      )}
                      {rec.result_en.status === 'verified' && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Verified
                        </span>
                      )}
                      {rec.result_en.status === 'unverified' && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                          <ShieldAlert className="w-2.5 h-2.5" /> Unverified
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={(e) => rec.id && handleDeleteOne(rec.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
