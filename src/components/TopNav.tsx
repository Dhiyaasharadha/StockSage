import React, { useState } from 'react';
import { Search, RotateCw, Bell } from 'lucide-react';

interface TopNavProps {
  currentTicker: string;
  onSelectTicker: (ticker: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  activeSection: string;
  onSectionClick: (id: string) => void;
  onOpenAlertModal: () => void;
  activeAlertsCount: number;
}

const POPULAR_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'GOOGL', 'AMZN'];

export const TopNav: React.FC<TopNavProps> = ({
  currentTicker,
  onSelectTicker,
  onRefresh,
  isLoading,
  activeSection,
  onSectionClick,
  onOpenAlertModal,
  activeAlertsCount,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSelectTicker(searchInput.trim().toUpperCase());
      setSearchInput('');
    }
  };

  const navLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'chart', label: 'Chart & Forecast' },
    { id: 'whatif', label: 'What-If Lab' },
    { id: 'shap', label: 'SHAP Waterfall' },
    { id: 'diagnostics', label: 'Model Diagnostics' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E3DA] bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single-Element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSectionClick('overview');
            }}
            className="text-lg font-bold tracking-tight text-stone-900 flex items-center gap-2"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-500/20" />
            <span>Stock Sage</span>
          </a>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5F2EB] text-stone-600 border border-[#E8E3DA] hidden md:inline">
            Ivory Edition
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-stone-600">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => onSectionClick(link.id)}
              className={`transition-colors py-1 cursor-pointer ${
                activeSection === link.id
                  ? 'text-stone-900 font-bold border-b-2 border-emerald-600'
                  : 'hover:text-stone-900'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Ticker Selector & Primary Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick ticker pills */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-[#F5F2EB] rounded-xl border border-[#E8E3DA]">
            {POPULAR_TICKERS.map((sym) => (
              <button
                key={sym}
                onClick={() => onSelectTicker(sym)}
                disabled={isLoading}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  currentTicker === sym
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-28 sm:w-40 pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-[#E8E3DA] rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 uppercase"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          {/* Price Target Alert Button */}
          <button
            onClick={onOpenAlertModal}
            title="Set Price Target Alerts"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl transition-colors cursor-pointer relative"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Alerts</span>
            {activeAlertsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center font-mono">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh market data and models"
            className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-[#E8E3DA] rounded-xl hover:border-stone-400 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
