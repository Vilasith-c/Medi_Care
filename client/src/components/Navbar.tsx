import React from 'react';
import { Camera, History, Settings, Shield } from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'scan' | 'history' | 'settings';
  onSelectTab: (tab: 'home' | 'scan' | 'history' | 'settings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 max-w-lg mx-auto pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'home' ? 'text-emerald-600 font-medium' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-5 h-5 mb-0.5" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => onSelectTab('scan')}
          className="flex flex-col items-center justify-center flex-1 -mt-5"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform p-3">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-emerald-700 mt-1">Scan</span>
        </button>

        <button
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'history' ? 'text-emerald-600 font-medium' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-xs">History</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            currentTab === 'settings' ? 'text-emerald-600 font-medium' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </nav>
  );
};
