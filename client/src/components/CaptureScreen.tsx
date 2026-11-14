import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, AlertCircle, RefreshCw, ArrowLeft, Plus, Sparkles, Sun, ShieldCheck } from 'lucide-react';
import { checkImageQuality } from '../utils/imageQuality';

interface CaptureScreenProps {
  onImageSelected: (dataUrl: string, secondaryDataUrl?: string) => void;
  onCancel: () => void;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ onImageSelected, onCancel }) => {
  const [primaryImage, setPrimaryImage] = useState<string | null>(null);
  const [edgeImage, setEdgeImage] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'primary' | 'edge'>('primary');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setIsCheckingQuality(true);
      setQualityWarning(null);

      const quality = await checkImageQuality(dataUrl);
      setIsCheckingQuality(false);

      if (!quality.isGood && quality.message) {
        setQualityWarning(quality.message);
      }

      if (activeSlot === 'primary') {
        setPrimaryImage(dataUrl);
      } else {
        setEdgeImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (slot: 'primary' | 'edge') => {
    setActiveSlot(slot);
    fileInputRef.current?.click();
  };

  const handleProceed = () => {
    if (primaryImage) {
      onImageSelected(primaryImage, edgeImage || undefined);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white p-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-slate-800 active:scale-95 text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-white">Scan Medicine Packaging</h2>
        <div className="w-9" />
      </div>

      {/* Foil Strip Pro-Tips Banner */}
      <div className="my-3 p-3.5 bg-emerald-950/70 border border-emerald-700/60 rounded-2xl text-xs text-emerald-200 space-y-1.5">
        <div className="font-bold text-emerald-100 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Foil Strip Capture Tips (Reduces Glare & Blurs):
        </div>
        <ul className="text-[11px] text-emerald-300 space-y-1 list-disc pl-4 leading-relaxed">
          <li><strong>Tilt slightly (10°–15°):</strong> Deflects metallic reflection and foil glare away from the camera lens.</li>
          <li><strong>No flash:</strong> Direct flash creates white specular spots on blister curves. Use diffuse room light.</li>
          <li><strong>Fill the frame:</strong> Place strip flat on a dark surface and hold steady.</li>
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
                className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 backdrop-blur-md border border-slate-700 hover:bg-slate-900"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retake
              </button>
            </div>

            {/* Quality Warning if any */}
            {qualityWarning && (
              <div className="w-full mt-3 p-2.5 bg-amber-950/70 border border-amber-600/50 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{qualityWarning} (You can retake or proceed anyway)</span>
              </div>
            )}

            {/* Dedicated Batch & Expiry Crimp Edge Slot */}
            <div className="w-full mt-4 p-3 bg-slate-800/70 border border-slate-700/70 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Batch & Expiry Crimp Edge Photo
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
                      className="text-xs text-emerald-400 underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => triggerUpload('edge')}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
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

      {/* Bottom Action */}
      {primaryImage && (
        <div className="pt-4 pb-6">
          <button
            onClick={handleProceed}
            disabled={isCheckingQuality}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isCheckingQuality ? 'Checking Image Quality...' : 'Process with Glare-Filtered OCR →'}
          </button>
        </div>
      )}
    </div>
  );
};
