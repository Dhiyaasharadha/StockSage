import React from 'react';
import { ForecastResult } from '../types/index.ts';
import { Sliders, RotateCcw, Zap } from 'lucide-react';

interface WhatIfSimulatorProps {
  forecast: ForecastResult;
  sentimentOverride: number;
  onSentimentChange: (val: number) => void;
  volatilityMultiplier: number;
  onVolatilityChange: (val: number) => void;
  priceShockPercent: number;
  onPriceShockChange: (val: number) => void;
  onReset: () => void;
  simulatedPrice?: number;
  simulatedReturn?: number;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  forecast,
  sentimentOverride,
  onSentimentChange,
  volatilityMultiplier,
  onVolatilityChange,
  priceShockPercent,
  onPriceShockChange,
  onReset,
  simulatedPrice,
  simulatedReturn,
}) => {
  const basePrice = forecast.ensemblePrice;
  const activePrice = simulatedPrice ?? basePrice;
  const activeReturn = simulatedReturn ?? forecast.ensembleReturnPercent;
  const deltaFromBase = activePrice - basePrice;
  const isChanged =
    sentimentOverride !== forecast.sentiment.dailyAverage ||
    volatilityMultiplier !== 1.0 ||
    priceShockPercent !== 0;

  // Preset scenarios
  const applyPreset = (preset: 'bullishPR' | 'earningsShock' | 'volSpike') => {
    switch (preset) {
      case 'bullishPR':
        onSentimentChange(0.75);
        onVolatilityChange(0.85);
        onPriceShockChange(1.5);
        break;
      case 'earningsShock':
        onSentimentChange(-0.65);
        onVolatilityChange(1.8);
        onPriceShockChange(-2.5);
        break;
      case 'volSpike':
        onSentimentChange(-0.2);
        onVolatilityChange(2.2);
        onPriceShockChange(-0.5);
        break;
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-white border border-[#E8E3DA] rounded-2xl space-y-6 shadow-xs">
      {/* Header & Reset Action */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Live "What-If" Sensitivity Simulator
            </h3>
            <p className="text-xs text-stone-500">
              Instantly recomputes next-day prediction and SHAP waterfall without retraining.
            </p>
          </div>
        </div>

        {isChanged && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-[#FAF8F5] border border-[#E8E3DA] rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Baseline</span>
          </button>
        )}
      </div>

      {/* Preset Action Strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-stone-500 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          Quick Scenarios:
        </span>
        <button
          onClick={() => applyPreset('bullishPR')}
          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
        >
          🚀 Bullish Product Catalyst
        </button>
        <button
          onClick={() => applyPreset('earningsShock')}
          className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors cursor-pointer"
        >
          ⚠️ Earnings Guidance Miss
        </button>
        <button
          onClick={() => applyPreset('volSpike')}
          className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
        >
          ⚡ High Volatility Regime
        </button>
      </div>

      {/* Interactive Sliders */}
      <div className="space-y-5">
        {/* Slider 1: Sentiment Override */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-stone-800">
              Sentiment Override
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                sentimentOverride > 0
                  ? 'text-emerald-700'
                  : sentimentOverride < 0
                  ? 'text-rose-700'
                  : 'text-stone-500'
              }`}
            >
              {sentimentOverride > 0 ? '+' : ''}
              {sentimentOverride.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.0"
            step="0.05"
            value={sentimentOverride}
            onChange={(e) => onSentimentChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#E8E3DA] rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-stone-500 font-mono">
            <span>-1.0 (Extreme Bearish)</span>
            <span>0.0 (Neutral)</span>
            <span>+1.0 (Extreme Bullish)</span>
          </div>
        </div>

        {/* Slider 2: Volatility Multiplier */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-stone-800">
              Volatility Regime Multiplier
            </span>
            <span className="font-mono font-bold text-indigo-700 tabular-nums">
              {volatilityMultiplier.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={volatilityMultiplier}
            onChange={(e) => onVolatilityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#E8E3DA] rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-stone-500 font-mono">
            <span>0.5x (Calm)</span>
            <span>1.0x (Standard)</span>
            <span>2.5x (High Turbulence)</span>
          </div>
        </div>

        {/* Slider 3: Price Momentum Shock */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-stone-800">
              Simulated Intraday Price Shock
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                priceShockPercent > 0
                  ? 'text-emerald-700'
                  : priceShockPercent < 0
                  ? 'text-rose-700'
                  : 'text-stone-500'
              }`}
            >
              {priceShockPercent > 0 ? '+' : ''}
              {priceShockPercent.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="-5.0"
            max="5.0"
            step="0.25"
            value={priceShockPercent}
            onChange={(e) => onPriceShockChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#E8E3DA] rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-[10px] text-stone-500 font-mono">
            <span>-5.0% Pullback</span>
            <span>0.0% Unchanged</span>
            <span>+5.0% Rally</span>
          </div>
        </div>
      </div>

      {/* Real-time Scenario Comparison Callout */}
      <div className="p-4 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-stone-500">
            Simulated Next-Day Price Target
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
              ${activePrice.toFixed(2)}
            </span>
            <span
              className={`text-xs font-bold tabular-nums ${
                activeReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              ({activeReturn >= 0 ? '+' : ''}
              {activeReturn.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono">
          <div>
            <span className="text-stone-400 block text-[11px]">Baseline Forecast</span>
            <span className="font-semibold text-stone-800 tabular-nums">
              ${basePrice.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Net Scenario Delta</span>
            <span
              className={`font-bold tabular-nums ${
                deltaFromBase >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {deltaFromBase >= 0 ? '+' : ''}${deltaFromBase.toFixed(2)} (
              {((deltaFromBase / basePrice) * 100).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
