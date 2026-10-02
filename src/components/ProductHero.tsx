import React from 'react';
import { Bell, Sliders, ShieldCheck, Cpu, GitBranch, ArrowUpRight, Database, CheckCircle2 } from 'lucide-react';

interface ProductHeroProps {
  ticker: string;
  lastClose: number;
  ensemblePrice: number;
  returnPercent: number;
  onOpenAlertModal: () => void;
  onScrollToWhatIf: () => void;
}

export const ProductHero: React.FC<ProductHeroProps> = ({
  ticker,
  lastClose,
  ensemblePrice,
  returnPercent,
  onOpenAlertModal,
  onScrollToWhatIf,
}) => {
  const isUp = returnPercent >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white p-6 sm:p-8 shadow-xs">
      {/* Decorative Subtle Warm Ivory Gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#FAF8F5] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Platform Branding, Quantitative Pillars & CTAs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Explainable Quantitative Platform
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-stone-500 text-xs font-mono">
              Live Alpha Vantage Daily REST
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900 leading-tight">
            Institutional-Grade Multi-Model Equity Forecasting
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
            Stock Sage fuses <strong className="text-emerald-700 font-semibold">Gradient-Boosted Trees</strong>,{' '}
            <strong className="text-blue-700 font-semibold">Autoregressive Ridge Time-Series</strong>, and{' '}
            <strong className="text-amber-700 font-semibold">Financial Lexicon Sentiment</strong> with{' '}
            <strong className="text-stone-900 font-semibold">TreeSHAP</strong> marginal attribution and non-parametric bootstrap confidence corridors.
          </p>

          {/* Model Badges */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              GBDT + Ridge Ensemble
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <GitBranch className="w-3.5 h-3.5 text-blue-600" />
              TreeSHAP Marginal Axioms
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              90% Bootstrap Resampling (B=1000)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenAlertModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span>Set Target Price Alert</span>
            </button>

            <button
              onClick={onScrollToWhatIf}
              className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F5F2EB] text-stone-800 font-semibold text-xs rounded-xl border border-[#E8E3DA] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Interactive What-If Lab</span>
            </button>
          </div>
        </div>

        {/* Right Column: Clean Quantitative Summary Card (No Pictures) (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Main Predictive Snapshot Card */}
          <div className="p-5 bg-[#FAF8F5] border border-[#E8E3DA] rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="font-bold text-stone-900 text-sm">{ticker} Execution Model</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Live Stream
              </span>
            </div>

            {/* Target Price Row */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-500 block uppercase font-semibold">Day T+1 Target</span>
                <span className="text-2xl font-bold font-mono text-stone-900 tabular-nums">
                  ${ensemblePrice.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500 block uppercase font-semibold">Settled Close</span>
                <span className="text-base font-mono text-stone-700 font-semibold tabular-nums">
                  ${lastClose.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500 block uppercase font-semibold">Expected Delta</span>
                <span className={`text-sm font-mono font-bold flex items-center justify-end ${isUp ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <ArrowUpRight className={`w-3.5 h-3.5 ${!isUp ? 'rotate-90' : ''}`} />
                  {isUp ? '+' : ''}{returnPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Mini Quantitative Architecture Breakdown */}
            <div className="space-y-2 pt-2 border-t border-[#E8E3DA] text-xs">
              <div className="flex items-center justify-between text-stone-600 font-mono text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Gradient-Boosted Trees:
                </span>
                <span className="font-bold text-stone-800">55% weight</span>
              </div>
              <div className="w-full bg-[#E8E3DA] h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '55%' }} />
              </div>

              <div className="flex items-center justify-between text-stone-600 font-mono text-[11px] pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Autoregressive Ridge:
                </span>
                <span className="font-bold text-stone-800">45% weight</span>
              </div>
              <div className="w-full bg-[#E8E3DA] h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="text-[11px] text-stone-500 pt-1 flex items-center justify-between border-t border-[#E8E3DA]">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-600" />
                Alpha Vantage TIME_SERIES_DAILY
              </span>
              <span className="font-mono text-stone-400">T+1 Session</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
