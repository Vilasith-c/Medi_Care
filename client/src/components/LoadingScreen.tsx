import React, { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, Database, Globe } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  const steps = [
    { title: 'Connecting to RxNorm...', desc: 'Normalizing generic active ingredients', icon: Database },
    { title: 'Checking MedlinePlus Connect...', desc: 'Retrieving official patient monograph', icon: ShieldCheck },
    { title: 'Cross-verifying clinical evidence...', desc: 'Searching trusted medical authorities (NIH, WHO, FDA)', icon: Globe },
    { title: 'Validating safety rules...', desc: 'Verifying dosage form and eliminating unverified claims', icon: ShieldCheck },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const StepIcon = steps[currentStepIndex].icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] p-6 text-center max-w-lg mx-auto">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 border border-emerald-300 flex items-center justify-center text-emerald-700 shadow-sm">
          <StepIcon className="w-8 h-8 text-emerald-600 animate-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
          <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-semibold text-slate-800 mb-1">
        {steps[currentStepIndex].title}
      </h3>
      <p className="text-xs text-slate-500 mb-6 max-w-xs">
        {steps[currentStepIndex].desc}
      </p>

      {/* Progress Dots */}
      <div className="flex items-center gap-2">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentStepIndex
                ? 'w-6 bg-emerald-600'
                : idx < currentStepIndex
                ? 'w-2 bg-emerald-400'
                : 'w-2 bg-slate-200'
            }`}
          />
        ))}
      </div>

      <p className="text-[11px] text-slate-400 mt-8 max-w-xs">
        Free-tier cold starts may take a few seconds on first request.
      </p>
    </div>
  );
};
