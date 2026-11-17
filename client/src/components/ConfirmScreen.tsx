import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, ArrowLeft, Pill, FileText, ChevronDown } from 'lucide-react';
import type { ConfirmedFields, ExpiryStatus } from '../types';

interface ConfirmScreenProps {
  photo: string;
  initialFields: ConfirmedFields;
  initialExpiryStatus: ExpiryStatus;
  ocrConfidence: number;
  ocrEngine?: string;
  onConfirm: (fields: ConfirmedFields, expiryStatus: ExpiryStatus) => void;
  onCancel: () => void;
}

export const ConfirmScreen: React.FC<ConfirmScreenProps> = ({
  photo,
  initialFields,
  initialExpiryStatus,
  ocrConfidence,
  ocrEngine = 'PaddleOCR',
  onConfirm,
  onCancel,
}) => {
  const [fields, setFields] = useState<ConfirmedFields>(initialFields);
  const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>(initialExpiryStatus);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFieldChange = (key: keyof ConfirmedFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setValidationError(null);
  };

  const handleExpiryDateChange = (dateVal: string) => {
    handleFieldChange('expiry', dateVal);
    // Recalculate status
    const slashMatch = dateVal.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10) - 1;
      let year = parseInt(slashMatch[2], 10);
      if (year < 100) year += 2000;
      const expDate = new Date(year, month + 1, 0);
      const now = new Date();
      const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0) setExpiryStatus('expired');
      else if (diffDays <= 60) setExpiryStatus('expiring_soon');
      else setExpiryStatus('ok');
    } else {
      setExpiryStatus('unknown');
    }
  };

  const handleContinue = () => {
    // Form and either generic_name or brand are required
    if (!fields.generic_name.trim() && !fields.brand.trim()) {
      setValidationError('Please enter either the Active Ingredient (Salt) or Brand Name.');
      return;
    }

    if (!fields.form.trim()) {
      setValidationError('Dosage form (e.g., Tablet, Syrup) is required for safety verification.');
      return;
    }

    onConfirm(fields, expiryStatus);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-20 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-10 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onCancel}
          className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-slate-900">Confirm Medicine Details</h2>
        <div className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {ocrEngine === 'paddleocr' ? 'PaddleOCR' : 'Tesseract'} ({ocrConfidence}%)
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Photo Thumbnail & Tip */}
        <div className="flex gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <img
            src={photo}
            alt="Scanned pack"
            className="w-20 h-20 object-cover rounded-lg border border-slate-200 shrink-0"
          />
          <div className="flex flex-col justify-center text-xs">
            <span className="font-semibold text-slate-800 mb-0.5">Scanned Medicine Label</span>
            <p className="text-slate-500 leading-relaxed">
              Verify the extracted text matches your pack. Correcting the active ingredient (salt) ensures accurate clinical lookup.
            </p>
          </div>
        </div>

        {/* Expiry Banner */}
        {expiryStatus === 'expired' && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold">EXPIRED MEDICINE WARNING:</span> The detected expiry date indicates this medicine has expired. Do not use expired medication.
            </div>
          </div>
        )}

        {expiryStatus === 'expiring_soon' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">Expiring Soon:</span> This medicine expires within 60 days.
            </div>
          </div>
        )}

        {expiryStatus === 'ok' && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Valid expiry date: {fields.expiry || 'Within safe shelf life'}</span>
          </div>
        )}

        {expiryStatus === 'unknown' && (
          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-600 text-xs">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Expiry date not found on label. Check packaging physically.</span>
          </div>
        )}

        {/* Form Fields Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          {/* Active Ingredient / Salt (Prominent) */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
            <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center justify-between">
              <span>Active Ingredient / Salt Name *</span>
              <span className="text-[10px] text-emerald-700 font-normal">Primary lookup key</span>
            </label>
            <input
              type="text"
              value={fields.generic_name}
              onChange={(e) => handleFieldChange('generic_name', e.target.value)}
              placeholder="e.g. Paracetamol, Amoxicillin, Metformin"
              className="w-full px-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-[11px] text-emerald-700 mt-1">
              Indian brand names differ; entering the salt guarantees clinical match.
            </p>
          </div>

          {/* Brand Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Brand Name as Printed
            </label>
            <input
              type="text"
              value={fields.brand}
              onChange={(e) => handleFieldChange('brand', e.target.value)}
              placeholder="e.g. Dolo 650, Calpol, Augmentin"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Strength and Form in two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Strength <span className="text-slate-400 font-normal">(Encouraged)</span>
              </label>
              <input
                type="text"
                value={fields.strength}
                onChange={(e) => handleFieldChange('strength', e.target.value)}
                placeholder="e.g. 500mg, 5mg/5ml"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dosage Form *
              </label>
              <div className="relative">
                <select
                  value={fields.form}
                  onChange={(e) => handleFieldChange('form', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 appearance-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select form...</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Suspension">Suspension</option>
                  <option value="Eye/Ear Drops">Eye/Ear Drops</option>
                  <option value="Drops">Oral Drops</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Cream">Cream</option>
                  <option value="Gel">Gel</option>
                  <option value="Injection">Injection</option>
                  <option value="Inhaler">Inhaler</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={fields.expiry}
                onChange={(e) => handleExpiryDateChange(e.target.value)}
                placeholder="MM/YYYY"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mfg. Date
              </label>
              <input
                type="text"
                value={fields.mfg_date}
                onChange={(e) => handleFieldChange('mfg_date', e.target.value)}
                placeholder="MM/YYYY"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Batch & Manufacturer (Kept as printed) */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Batch No.
              </label>
              <input
                type="text"
                value={fields.batch}
                onChange={(e) => handleFieldChange('batch', e.target.value)}
                placeholder="B.No / Lot"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={fields.manufacturer}
                onChange={(e) => handleFieldChange('manufacturer', e.target.value)}
                placeholder="Mfd by"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Safety Privacy Note */}
        <p className="text-[11px] text-slate-500 text-center px-4">
          Only the active ingredient, brand, strength, and form leave your device for clinical verification. Batch numbers and photos are kept offline on your device.
        </p>

        {/* Submit Action */}
        <button
          onClick={handleContinue}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
        >
          <Pill className="w-4 h-4" /> Continue to Clinical Lookup →
        </button>
      </div>
    </div>
  );
};
