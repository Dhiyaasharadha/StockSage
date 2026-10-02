import React from 'react';
import { Bell, Sliders, ShieldCheck, Cpu, GitBranch, ArrowUpRight, TrendingUp } from 'lucide-react';

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
    <div className="relative overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white p-6 sm:p-8 shadow-sm">
      {/* Decorative Warm Ivory Corner Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#F5F2EB]/80 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Platform Branding, Quantitative Pillars & CTAs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Explainable Quantitative Platform
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-stone-500 text-xs font-mono">
              Live Alpha Vantage Stream
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900 leading-tight">
            Institutional-Grade Multi-Model Equity Forecasting
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xl">
            Stock Sage fuses <strong className="text-emerald-700 font-semibold">Gradient-Boosted Trees</strong>,{' '}
            <strong className="text-blue-700 font-semibold">Autoregressive Ridge Time-Series</strong>, and{' '}
            <strong className="text-amber-700 font-semibold">FinBERT Sentiment</strong> with{' '}
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

        {/* Right Column: Visual Photographic Card & Live Ticker Pill (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Main Visual Photo Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[#E8E3DA] shadow-md bg-stone-100 group">
            <img
              src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80"
              alt="Institutional Financial Trading Terminal"
              className="w-full h-48 sm:h-52 object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

            {/* Overlaid Badge */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                  alt="Lead Quantitative Analyst"
                  className="w-7 h-7 rounded-full border border-white/60 object-cover"
                />
                <div>
                  <div className="font-bold text-white text-[11px] leading-tight">Quantitative Research Lab</div>
                  <div className="text-[10px] text-stone-300">Alpha Vantage Certified Feed</div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-500 text-stone-950 font-bold text-[10px] flex items-center gap-1 font-mono">
                <TrendingUp className="w-3 h-3" />
                Live Feed
              </span>
            </div>
          </div>

          {/* Real-time Ticker Snapshot Pill */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-bold">
                {ticker} Next Session Target (Day T+1)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold font-mono text-stone-900 tabular-nums">
                  ${ensemblePrice.toFixed(2)}
                </span>
                <span className={`text-xs font-mono font-bold flex items-center ${isUp ? 'text-emerald-700' : 'text-rose-700'}`}>
                  <ArrowUpRight className={`w-3.5 h-3.5 ${!isUp ? 'rotate-90' : ''}`} />
                  {isUp ? '+' : ''}{returnPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="text-right border-l border-[#E8E3DA] pl-4">
              <span className="text-[10px] text-stone-500 block">Settled Close</span>
              <span className="text-sm font-mono text-stone-800 font-semibold tabular-nums">
                ${lastClose.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
