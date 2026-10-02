import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ResearchDisclaimer: React.FC = () => {
  return (
    <div className="border border-[#E8E3DA] bg-[#FAF8F5] rounded-2xl p-5 text-xs text-stone-600 space-y-2.5 shadow-xs">
      <div className="flex items-center gap-2 font-bold text-stone-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Academic Research & Quantitative Education Notice</span>
      </div>
      <p className="leading-relaxed">
        <strong>Stock Sage</strong> is an open research platform demonstrating explainable machine learning architectures (TreeSHAP, Gradient-Boosted Decision Trees, regularized statistical time-series, and empirical residual bootstrap confidence intervals) on real financial market series. Next-day equity price forecasting from public market data and RSS headlines is inherently stochastic with high noise-to-signal ratios. This software does not provide financial, investment, or trading advice. Past model performance is no guarantee of future returns.
      </p>
      <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-stone-500 font-mono">
        <span>Methodology: Non-parametric Residual Bootstrap (B=1000)</span>
        <span aria-hidden="true" className="text-stone-300">·</span>
        <span>Feature Attribution: Lundberg & Lee (2017) TreeSHAP</span>
        <span aria-hidden="true" className="text-stone-300">·</span>
        <span>Data Feed: Alpha Vantage Official Daily REST API</span>
      </div>
    </div>
  );
};
