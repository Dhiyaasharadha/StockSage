import React from 'react';
import { ForecastResult } from '../types/index.ts';
import { TrendingUp, TrendingDown, Database } from 'lucide-react';

interface MetricCardsProps {
  forecast: ForecastResult;
  whatIfEnsemblePrice?: number;
  whatIfReturnPercent?: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  forecast,
  whatIfEnsemblePrice,
  whatIfReturnPercent,
}) => {
  const isWhatIfActive = whatIfEnsemblePrice !== undefined;
  const activeEnsemblePrice = isWhatIfActive ? whatIfEnsemblePrice : forecast.ensemblePrice;
  const activeReturnPercent = isWhatIfActive ? whatIfReturnPercent! : forecast.ensembleReturnPercent;
  const isBullish = activeReturnPercent >= 0;

  const sentiment = forecast.sentiment;
  const sentimentVal = sentiment.dailyAverage;
  const sentimentLabel =
    sentimentVal > 0.25
      ? 'Bullish'
      : sentimentVal < -0.25
      ? 'Bearish'
      : 'Neutral';

  return (
    <div className="space-y-4">
      {/* Ticker & Source Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E3DA]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {forecast.ticker}
            </h1>
            <span className="text-sm font-medium text-stone-500">
              {forecast.companyName}
            </span>
          </div>

          {/* Clean Unboxed Metadata in Ivory Stone */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 mt-1">
            <span>Trading Day: <strong>{forecast.lastDate}</strong></span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Forecast Horizon: Next Session ({forecast.forecastDate})</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${!forecast.dataSource.isFallback ? 'bg-emerald-600 ring-2 ring-emerald-500/20 animate-pulse' : 'bg-amber-500'}`} />
              Source: <strong className="text-stone-800 font-semibold">{forecast.dataSource.sourceName}</strong>
              {!forecast.dataSource.isFallback && (
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider ml-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Real Market Data
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Live / Fallback notice */}
        <div className="text-right text-xs text-stone-500">
          <div>{forecast.dataSource.recordsCount} historical daily bars (2015–Present)</div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {forecast.dataSource.attributionNote}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid in Crisp White with Warm Ivory Borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Last Close Price */}
        <div className="p-4 bg-white border border-[#E8E3DA] rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Last Settled Close
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
              ${forecast.lastClose.toFixed(2)}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              USD
            </span>
          </div>
          <div className="mt-2 text-xs text-stone-600">
            Base Expectation E[f(x)]: <span className="tabular-nums font-semibold text-stone-800">${forecast.expectedValueBasePrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 2: Next-Day Ensemble Forecast */}
        <div className="p-4 bg-white border border-[#E8E3DA] rounded-2xl shadow-xs relative overflow-hidden">
          {isWhatIfActive && (
            <div className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              What-If Override
            </div>
          )}
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Next-Day Ensemble Target
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
              ${activeEnsemblePrice.toFixed(2)}
            </span>
            <div className={`flex items-center text-xs font-bold tabular-nums ${isBullish ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isBullish ? <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
              {isBullish ? '+' : ''}{activeReturnPercent.toFixed(2)}%
            </div>
          </div>
          <div className="mt-2 text-xs text-stone-600">
            GBDT ({Math.round(forecast.models.gbdt.weight * 100)}%) + AR Ridge ({Math.round(forecast.models.timeSeries.weight * 100)}%)
          </div>
        </div>

        {/* Card 3: 90% Bootstrap Confidence Interval */}
        <div className="p-4 bg-white border border-[#E8E3DA] rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            90% Bootstrap Residual CI
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-stone-900 tabular-nums">
              ${forecast.confidenceInterval.lowerBound90.toFixed(2)} – ${forecast.confidenceInterval.upperBound90.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-xs text-stone-600">
            <span>B=1000 Resamples</span>
            <span className="mx-1 text-stone-300" aria-hidden="true">·</span>
            <span>Skew: <span className="tabular-nums font-mono">{forecast.confidenceInterval.skewness > 0 ? '+' : ''}{forecast.confidenceInterval.skewness.toFixed(2)}</span></span>
            <span className="mx-1 text-stone-300" aria-hidden="true">·</span>
            <span>Kurt: <span className="tabular-nums font-mono">{forecast.confidenceInterval.kurtosis.toFixed(2)}</span></span>
          </div>
        </div>

        {/* Card 4: News Sentiment Indicator */}
        <div className="p-4 bg-white border border-[#E8E3DA] rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            FinBERT News Sentiment
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
              {sentimentVal > 0 ? '+' : ''}{sentimentVal.toFixed(2)}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              sentimentLabel === 'Bullish'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : sentimentLabel === 'Bearish'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-stone-100 text-stone-700'
            }`}>
              {sentimentLabel}
            </span>
          </div>
          <div className="mt-2 text-xs text-stone-600">
            <span>{sentiment.headlineCount} headlines</span>
            <span className="mx-1 text-stone-300" aria-hidden="true">·</span>
            <span className="text-emerald-700 font-semibold">{sentiment.bullishCount} bull</span>
            <span className="mx-1 text-stone-300" aria-hidden="true">/</span>
            <span className="text-rose-700 font-semibold">{sentiment.bearishCount} bear</span>
          </div>
        </div>
      </div>
    </div>
  );
};
