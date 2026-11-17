import React, { useState, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Plus,
  Sparkles,
  ShieldCheck,
  Cpu,
  Loader2,
  ScanLine,
  CheckCircle2,
} from 'lucide-react';
import { checkImageQuality } from '../utils/imageQuality';
import { compressMedicineImage, type CompressedImageResult } from '../utils/imageCompress';
import { runPaddleOcrPipeline, type PaddleOcrResult } from '../ocr/ocrEngine';

export interface ProcessedOcrData {
  text: string;
  confidence: number;
  engine: string;
  qrData?: string;
}

interface CaptureScreenProps {
  onCaptureCompleted: (
    primaryPhoto: string,
    ocrData: ProcessedOcrData,
    edgePhoto?: string
  ) => void;
  onCancel: () => void;
  onManualEntryFallback?: (primaryPhoto: string, edgePhoto?: string) => void;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  onCaptureCompleted,
  onCancel,
  onManualEntryFallback,
}) => {
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [edgeImage, setEdgeImage] = useState<string | null>(null);
  const [primaryStats, setPrimaryStats] = useState<CompressedImageResult | null>(null);
  const [edgeStats, setEdgeStats] = useState<CompressedImageResult | null>(null);

  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'primary' | 'edge'>('primary');

  // Backend PaddleOCR in-flight state
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      setIsCheckingQuality(true);
      setQualityWarning(null);
      setOcrError(null);

      // Check lighting and blur
      const quality = await checkImageQuality(rawDataUrl);
      if (!quality.isGood && quality.message) {
        setQualityWarning(quality.message);
      }

      // Compress client-side via bicubic HTML5 canvas downscaling
      const compressedRes = await compressMedicineImage(rawDataUrl, 1600, 0.85);
      setIsCheckingQuality(false);

      if (activeSlot === 'primary') {
        setPrimaryImage(compressedRes.compressed);
        setPrimaryStats(compressedRes);
      } else {
        setEdgeImage(compressedRes.compressed);
        setEdgeStats(compressedRes);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (slot: 'primary' | 'edge') => {
    setActiveSlot(slot);
    fileInputRef.current?.click();
  };

  const handleProcessWithPaddleOcr = async () => {
    if (!primaryImage) return;

    setIsProcessingOcr(true);
    setOcrError(null);
    setOcrStatusText('Compressing packaging image for neural processing...');

    try {
      // 1. Process primary face image with backend PaddleOCR
      setOcrStatusText('POST /api/v1/ocr/process -> Transmitting image to FastAPI backend...');
      const primaryRes: PaddleOcrResult = await runPaddleOcrPipeline(primaryImage, (p) => {
        setOcrStatusText(p.status);
      });

      let combinedText = primaryRes.text;
      let combinedQr = primaryRes.qrData || primaryStats?.qrData;
      let averageConf = primaryRes.confidence;

      // 2. If dedicated crimp edge shot was added, run PaddleOCR on edge image to extract embossed EXP/BATCH
      if (edgeImage) {
        setOcrStatusText('Analyzing crimped batch & expiry edge with PaddleOCR...');
        try {
          const edgeRes = await runPaddleOcrPipeline(edgeImage);
          if (edgeRes.text.trim()) {
            combinedText += '\n' + edgeRes.text;
            averageConf = Math.round((averageConf + edgeRes.confidence) / 2);
          }
          if (edgeRes.qrData && !combinedQr) {
            combinedQr = edgeRes.qrData;
          }
        } catch (edgeErr) {
          console.warn('Edge photo OCR skipped or failed:', edgeErr);
        }
      }

      setOcrStatusText('PaddleOCR extraction complete! Populating details...');

      // Deliver extracted JSON results to parent
      onCaptureCompleted(
        primaryImage,
        {
          text: combinedText,
          confidence: averageConf,
          engine: 'paddleocr',
          qrData: combinedQr,
        },
        edgeImage || undefined
      );
    } catch (err: any) {
      console.error('Backend PaddleOCR failed:', err);
      setIsProcessingOcr(false);
      setOcrError(
        err.message ||
          'Could not complete PaddleOCR recognition. Ensure your FastAPI server is running on http://localhost:8000.'
      );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white p-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          onClick={onCancel}
          disabled={isProcessingOcr}
          className="p-2 rounded-full hover:bg-slate-800 active:scale-95 text-slate-300 disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-semibold text-white">Scan Medicine Packaging</h2>
          <div className="text-[10px] text-emerald-400 font-medium flex items-center justify-center gap-1 mt-0.5">
            <Cpu className="w-3 h-3" /> Powered by Backend PaddleOCR (DBNet + CRNN)
          </div>
        </div>
        <div className="w-9" />
      </div>

      {/* Foil Strip & Pill Bottle Capture Tips Banner */}
      <div className="my-3 p-3.5 bg-emerald-950/70 border border-emerald-700/60 rounded-2xl text-xs text-emerald-200 space-y-1.5">
        <div className="font-bold text-emerald-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Camera Tips for Foil Strips & Curved Bottles:
        </div>
        <ul className="text-[11px] text-emerald-300 space-y-1 list-disc pl-4 leading-relaxed">
          <li><strong>Tilt 10°–15°:</strong> Deflects metallic foil reflection and glossy bottle glare away from lens.</li>
          <li><strong>No camera flash:</strong> Flash washes out curved blister foil with white hot-spots. Use ambient light.</li>
          <li><strong>Fill frame:</strong> PaddleOCR's DBNet handles curved lines and rotated print automatically.</li>
        </ul>
      </div>

      {/* Primary Capture Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {primaryImage ? (
          <div className="w-full flex flex-col items-center">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border-2 border-emerald-500 bg-black shadow-2xl">
              <img
                src={primaryImage}
                alt="Captured medicine pack"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => triggerUpload('primary')}
                disabled={isProcessingOcr}
                className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-md border border-slate-700 hover:bg-slate-900 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retake
              </button>

              {/* Compression stats badge */}
              {primaryStats && (
                <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] text-emerald-300 flex items-center gap-1.5 shadow">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>
                    Compressed {primaryStats.originalSizeEstimateKb}KB → {primaryStats.compressedSizeEstimateKb}KB
                  </span>
                </div>
              )}
            </div>

            {/* Quality Warning if any */}
            {qualityWarning && (
              <div className="w-full mt-3 p-2.5 bg-amber-950/70 border border-amber-600/50 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{qualityWarning} (You can retake or proceed with PaddleOCR)</span>
              </div>
            )}

            {/* Error Notification if backend fails */}
            {ocrError && (
              <div className="w-full mt-3 p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-xs text-rose-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-semibold text-rose-100">{ocrError}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleProcessWithPaddleOcr}
                    className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white font-medium rounded-lg text-[11px]"
                  >
                    Retry PaddleOCR
                  </button>
                  <button
                    onClick={() => {
                      if (onManualEntryFallback) {
                        onManualEntryFallback(primaryImage, edgeImage || undefined);
                      } else {
                        onCaptureCompleted(
                          primaryImage,
                          { text: '', confidence: 0, engine: 'manual' },
                          edgeImage || undefined
                        );
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px]"
                  >
                    Enter Medicine Manually →
                  </button>
                </div>
              </div>
            )}

            {/* Dedicated Batch & Expiry Crimp Edge Slot */}
            <div className="w-full mt-4 p-3 bg-slate-800/70 border border-slate-700/70 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Batch & Expiry Crimp Edge Photo (Optional)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Most blister strips emboss EXP/BATCH onto the crimped border.
                  </div>
                </div>

                {edgeImage ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={edgeImage}
                      alt="Crimp edge"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-600"
                    />
                    <button
                      onClick={() => triggerUpload('edge')}
                      disabled={isProcessingOcr}
                      className="text-xs text-emerald-400 underline disabled:opacity-50"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => triggerUpload('edge')}
                    disabled={isProcessingOcr}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Edge Shot
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center gap-4 py-6">
            <div
              onClick={() => triggerUpload('primary')}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-800/40 flex flex-col items-center justify-center p-6 cursor-pointer active:scale-98 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-200 text-center">
                Capture Medicine Packaging Face
              </p>
              <p className="text-xs text-slate-400 mt-1 text-center">
                Tilt slightly to minimize foil reflection and camera glare
              </p>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => triggerUpload('primary')}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" /> Open Camera
              </button>
              <button
                onClick={() => triggerUpload('primary')}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
              >
                <ImageIcon className="w-4 h-4" /> Choose File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Bottom Action Button or Neural In-Flight HUD */}
      {primaryImage && (
        <div className="pt-4 pb-6">
          {isProcessingOcr ? (
            <div className="p-4 bg-slate-800/90 border border-emerald-500/40 rounded-xl space-y-2.5 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Running Backend PaddleOCR Deep Learning Engine</span>
              </div>
              <div className="text-[11px] text-slate-300">{ocrStatusText}</div>
              <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse w-3/4 mx-auto" />
              </div>
              <div className="text-[10px] text-slate-400">
                DBNet polygon text detection + CRNN character recognition
              </div>
            </div>
          ) : (
            <button
              onClick={handleProcessWithPaddleOcr}
              disabled={isCheckingQuality}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <ScanLine className="w-4 h-4" />
              {isCheckingQuality
                ? 'Compressing & Checking...'
                : 'Process with Backend PaddleOCR →'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
