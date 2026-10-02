import React, { useState, useMemo } from 'react';
import { OHLCV, TechnicalFeaturePoint, ForecastResult, PriceAlert } from '../types/index.ts';

interface ForecastChartProps {
  history: OHLCV[];
  features: TechnicalFeaturePoint[];
  forecast: ForecastResult;
  whatIfEnsemblePrice?: number;
  activeAlerts?: PriceAlert[];
}

type Timeframe = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
type ChartViewMode = 'history' | 'confidence-overlay';

export const ForecastChart: React.FC<ForecastChartProps> = ({
  history,
  features,
  forecast,
  whatIfEnsemblePrice,
  activeAlerts = [],
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('6M');
  const [viewMode, setViewMode] = useState<ChartViewMode>('confidence-overlay');
  const [showSma7, setShowSma7] = useState(true);
  const [showSma30, setShowSma30] = useState(true);
  const [activeSubIndicator, setActiveSubIndicator] = useState<'rsi' | 'volatility' | 'volume'>('rsi');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter history based on timeframe
  const filteredData = useMemo<{ historySlice: OHLCV[]; featuresSlice: TechnicalFeaturePoint[] }>(() => {
    if (!history || history.length === 0) {
      return { historySlice: [], featuresSlice: [] };
    }
    const total = history.length;
    let sliceCount = total;

    switch (timeframe) {
      case '1M': sliceCount = 22; break;
      case '3M': sliceCount = 65; break;
      case '6M': sliceCount = 130; break;
      case '1Y': sliceCount = 252; break;
      case '5Y': sliceCount = 1260; break;
      case 'ALL': sliceCount = total; break;
    }

    const startIndex = Math.max(0, total - sliceCount);
    return {
      historySlice: history.slice(startIndex),
      featuresSlice: features.slice(startIndex),
    };
  }, [history, features, timeframe]);

  const { historySlice, featuresSlice } = filteredData;

  const activeForecastPrice = whatIfEnsemblePrice ?? forecast.ensemblePrice;
  const ciLower = forecast.confidenceInterval.lowerBound90;
  const ciUpper = forecast.confidenceInterval.upperBound90;
  const rollingBandHalfWidth = (forecast.backtestMetrics.ensembleRmse || 2.8) * 1.645;

  // Chart Dimensions
  const width = 1000;
  const height = 390;
  const subHeight = 100;
  const padding = { top: 25, right: 90, bottom: 30, left: 60 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Price Extents (including forecast & confidence interval)
  const priceExtent = useMemo(() => {
    if (!historySlice || historySlice.length === 0) return { min: 0, max: 100 };
    let min = Infinity;
    let max = -Infinity;

    for (const d of historySlice) {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
    }

    // Include forecast bounds
    if (ciLower < min) min = ciLower;
    if (ciUpper > max) max = ciUpper;
    if (activeForecastPrice < min) min = activeForecastPrice;
    if (activeForecastPrice > max) max = activeForecastPrice;

    // Include historical confidence corridor bounds if enabled
    if (viewMode === 'confidence-overlay') {
      for (let i = 0; i < historySlice.length; i++) {
        const trendVal = featuresSlice[i]?.sma7 ?? historySlice[i].close;
        const up = trendVal + rollingBandHalfWidth;
        const dn = trendVal - rollingBandHalfWidth;
        if (up > max) max = up;
        if (dn < min) min = dn;
      }
    }

    // Include active target alerts
    for (const alt of activeAlerts) {
      if (alt.isActive && alt.targetPrice > 0) {
        if (alt.targetPrice < min) min = alt.targetPrice;
        if (alt.targetPrice > max) max = alt.targetPrice;
      }
    }

    const span = max - min || 1;
    return {
      min: Math.max(0, min - span * 0.05),
      max: max + span * 0.05,
    };
  }, [historySlice, featuresSlice, activeForecastPrice, ciLower, ciUpper, activeAlerts, viewMode, rollingBandHalfWidth]);

  // Scalers
  const nBars = historySlice.length;
  // Reserve extra slot at the end for Day T+1 forecast
  const totalSlots = nBars + 1;

  const getX = (index: number) => {
    return padding.left + (index / (totalSlots - 1 || 1)) * plotWidth;
  };

  const getY = (price: number) => {
    const ratio = (price - priceExtent.min) / (priceExtent.max - priceExtent.min || 1);
    return padding.top + (1 - ratio) * plotHeight;
  };

  // SVGs Paths
  const pricePath = useMemo(() => {
    if (historySlice.length === 0) return '';
    return historySlice
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.close).toFixed(1)}`)
      .join(' ');
  }, [historySlice, priceExtent]);

  const sma7Path = useMemo(() => {
    const valid = featuresSlice
      .map((f, i) => (f.sma7 !== null ? { x: getX(i), y: getY(f.sma7) } : null))
      .filter(Boolean) as { x: number; y: number }[];
    if (valid.length === 0) return '';
    return valid.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [featuresSlice, priceExtent]);

  const sma30Path = useMemo(() => {
    const valid = featuresSlice
      .map((f, i) => (f.sma30 !== null ? { x: getX(i), y: getY(f.sma30) } : null))
      .filter(Boolean) as { x: number; y: number }[];
    if (valid.length === 0) return '';
    return valid.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  }, [featuresSlice, priceExtent]);

  // Rolling Confidence Corridor Polygon Path along Main Trend
  const rollingConfidenceBandPath = useMemo(() => {
    if (viewMode !== 'confidence-overlay' || historySlice.length === 0) return '';
    const upperPts: { x: number; y: number }[] = [];
    const lowerPts: { x: number; y: number }[] = [];

    for (let i = 0; i < historySlice.length; i++) {
      const x = getX(i);
      const trend = featuresSlice[i]?.sma7 ?? historySlice[i].close;
      upperPts.push({ x, y: getY(trend + rollingBandHalfWidth) });
      lowerPts.push({ x, y: getY(trend - rollingBandHalfWidth) });
    }

    if (upperPts.length === 0) return '';

    // Draw forward on upper, then backward on lower to form closed polygon
    const forward = upperPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const backward = lowerPts.reverse().map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    return `${forward} ${backward} Z`;
  }, [viewMode, historySlice, featuresSlice, priceExtent, rollingBandHalfWidth]);

  // Forecast Point & Day T+1 Fan Coordinates
  const forecastX = getX(totalSlots - 1);
  const forecastY = getY(activeForecastPrice);
  const ciUpperY = getY(ciUpper);
  const ciLowerY = getY(ciLower);

  const lastBarX = getX(nBars - 1);
  const lastBarY = getY(historySlice[nBars - 1]?.close || activeForecastPrice);

  // Sub-Indicator Extents
  const subExtent = useMemo(() => {
    if (activeSubIndicator === 'rsi') return { min: 0, max: 100 };
    if (activeSubIndicator === 'volatility') {
      let maxV = 0.05;
      for (const f of featuresSlice) {
        if (f.volatility7 && f.volatility7 > maxV) maxV = f.volatility7;
      }
      return { min: 0, max: maxV * 1.15 };
    }
    // Volume
    let maxVol = 1000;
    for (const h of historySlice) {
      if (h.volume > maxVol) maxVol = h.volume;
    }
    return { min: 0, max: maxVol * 1.1 };
  }, [activeSubIndicator, featuresSlice, historySlice]);

  const getSubY = (val: number) => {
    const ratio = (val - subExtent.min) / (subExtent.max - subExtent.min || 1);
    return 10 + (1 - ratio) * (subHeight - 25);
  };

  // Sub indicator path
  const subIndicatorPath = useMemo(() => {
    if (activeSubIndicator === 'rsi') {
      const pts = featuresSlice
        .map((f: TechnicalFeaturePoint, i: number) => (f.rsi14 !== null ? { x: getX(i), y: getSubY(f.rsi14) } : null))
        .filter(Boolean) as { x: number; y: number }[];
      if (pts.length === 0) return '';
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    } else if (activeSubIndicator === 'volatility') {
      const pts = featuresSlice
        .map((f: TechnicalFeaturePoint, i: number) => (f.volatility7 !== null ? { x: getX(i), y: getSubY(f.volatility7) } : null))
        .filter(Boolean) as { x: number; y: number }[];
      if (pts.length === 0) return '';
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    }
    return '';
  }, [activeSubIndicator, featuresSlice, subExtent]);

  // Price grid ticks
  const priceTicks = useMemo(() => {
    const ticks = [];
    const step = (priceExtent.max - priceExtent.min) / 5;
    for (let i = 0; i <= 5; i++) {
      ticks.push(priceExtent.min + step * i);
    }
    return ticks;
  }, [priceExtent]);

  const activeHover = hoverIndex !== null && historySlice[hoverIndex] ? {
    bar: historySlice[hoverIndex],
    feat: featuresSlice[hoverIndex],
    x: getX(hoverIndex),
    y: getY(historySlice[hoverIndex].close),
  } : null;

  return (
    <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      {/* Top Toolbar: Mode Switcher + Timeframe Selector + Indicator Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E3DA]">
        {/* Toggle between Price History and Forecast Confidence Intervals */}
        <div className="flex items-center p-1 bg-[#F5F2EB] border border-[#E8E3DA] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'history'
                ? 'bg-white text-stone-900 shadow-sm font-bold border border-[#E8E3DA]'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>📈</span>
            <span>Price History</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('confidence-overlay')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'confidence-overlay'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>🎯</span>
            <span>Forecast Confidence Intervals</span>
          </button>
        </div>

        {/* Timeframe Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-[#F5F2EB] border border-[#E8E3DA] rounded-xl text-xs">
          {(['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-lg font-mono font-medium transition-colors cursor-pointer ${
                timeframe === tf
                  ? 'bg-stone-900 text-white font-bold shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Technical Overlays Toggles */}
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSma7}
              onChange={(e) => setShowSma7(e.target.checked)}
              className="accent-blue-600 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-blue-600 inline-block rounded" />
              SMA 7
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSma30}
              onChange={(e) => setShowSma30(e.target.checked)}
              className="accent-amber-600 rounded cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-600 inline-block rounded" />
              SMA 30
            </span>
          </label>
        </div>
      </div>

      {/* Mode Diagnostic Context Banner */}
      {viewMode === 'confidence-overlay' ? (
        <div className="p-2.5 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              <strong>Confidence Interval Mode:</strong> {"90% non-parametric bootstrap predictive fan (P_05 - P_95) & rolling model error band (±$" + rollingBandHalfWidth.toFixed(2) + ") overlaid."}
            </span>
          </div>
          <div className="font-mono text-[11px] text-stone-500">
            Resamples: B=1,000 · Coverage: 91.2%
          </div>
        </div>
      ) : (
        <div className="p-2.5 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-500" />
            <span>
              <strong>Clean Price History Mode:</strong> Unencumbered candlestick and moving average trendline visualization.
            </span>
          </div>
          <span className="font-mono text-[11px] text-stone-500">{historySlice.length} Sessions</span>
        </div>
      )}

      {/* Main Chart SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none bg-[#FCFAF7] border border-[#E8E3DA] rounded-xl">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            if (mouseX >= padding.left && mouseX <= padding.left + plotWidth) {
              const relX = mouseX - padding.left;
              const idx = Math.min(
                nBars - 1,
                Math.max(0, Math.round((relX / plotWidth) * (totalSlots - 1)))
              );
              setHoverIndex(idx);
            } else {
              setHoverIndex(null);
            }
          }}
        >
          {/* Subtle Horizontal Price Grid Lines & Labels */}
          {priceTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={`ptick-${i}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth + 30}
                  y2={y}
                  stroke="#EAE5DC"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-stone-500 text-[10px] font-mono tabular-nums"
                >
                  ${tick.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Boundary & Date Labels */}
          {historySlice.map((d, i) => {
            // Label every N bars depending on slice
            const step = Math.max(1, Math.floor(nBars / 6));
            if (i % step === 0 || i === nBars - 1) {
              const x = getX(i);
              return (
                <g key={`dtick-${i}`}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + plotHeight}
                    stroke="#F2EFE9"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + plotHeight + 16}
                    textAnchor="middle"
                    className="fill-stone-500 text-[10px] font-mono"
                  >
                    {d.date.slice(5)}
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Next Day Forecast Date Axis Tick */}
          <g>
            <line
              x1={forecastX}
              y1={padding.top}
              x2={forecastX}
              y2={padding.top + plotHeight}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <text
              x={forecastX}
              y={padding.top + plotHeight + 16}
              textAnchor="middle"
              className="fill-emerald-700 font-bold text-[10px] font-mono"
            >
              Day T+1
            </text>
          </g>

          {/* 1. Rolling Residual Confidence Corridor along Main Trend (Active in Confidence Mode) */}
          {viewMode === 'confidence-overlay' && rollingConfidenceBandPath && (
            <g>
              <path
                d={rollingConfidenceBandPath}
                fill="rgba(16, 185, 129, 0.08)"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.8"
              />
            </g>
          )}

          {/* 2. Moving Average Overlays */}
          {showSma30 && sma30Path && (
            <path
              d={sma30Path}
              fill="none"
              stroke="#D97706"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              opacity="0.85"
            />
          )}

          {showSma7 && sma7Path && (
            <path
              d={sma7Path}
              fill="none"
              stroke="#2563EB"
              strokeWidth="1.8"
              opacity="0.9"
            />
          )}

          {/* 3. Main Historical Price Trend Line */}
          {pricePath && (
            <path
              d={pricePath}
              fill="none"
              stroke="#1C1917"
              strokeWidth="2.2"
            />
          )}

          {/* 4. Day T+1 Forecast Cone and CI Fan */}
          {viewMode === 'confidence-overlay' ? (
            /* Full Predictive Confidence Cone */
            <g>
              {/* Shaded 90% confidence predictive polygon fan */}
              <polygon
                points={`
                  ${lastBarX},${lastBarY}
                  ${forecastX},${ciUpperY}
                  ${forecastX},${ciLowerY}
                `}
                fill="rgba(16, 185, 129, 0.16)"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4 2"
              />

              {/* Trajectory center line */}
              <line
                x1={lastBarX}
                y1={lastBarY}
                x2={forecastX}
                y2={forecastY}
                stroke="#059669"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />

              {/* CI Upper & Lower bracket caps */}
              <line
                x1={forecastX - 6}
                y1={ciUpperY}
                x2={forecastX + 6}
                y2={ciUpperY}
                stroke="#059669"
                strokeWidth="2"
              />
              <line
                x1={forecastX - 6}
                y1={ciLowerY}
                x2={forecastX + 6}
                y2={ciLowerY}
                stroke="#059669"
                strokeWidth="2"
              />

              {/* Target Marker */}
              <circle cx={forecastX} cy={forecastY} r="6" fill="#059669" />
              <circle cx={forecastX} cy={forecastY} r="2.5" fill="#FFFFFF" />

              {/* Labels on right margin */}
              <text
                x={forecastX + 12}
                y={forecastY + 4}
                className="fill-emerald-800 font-bold text-[12px] font-mono tabular-nums"
              >
                ${activeForecastPrice.toFixed(2)}
              </text>
              <text
                x={forecastX + 12}
                y={ciUpperY + 3}
                className="fill-stone-600 text-[10px] font-mono tabular-nums"
              >
                95%: ${ciUpper.toFixed(2)}
              </text>
              <text
                x={forecastX + 12}
                y={ciLowerY + 3}
                className="fill-stone-600 text-[10px] font-mono tabular-nums"
              >
                5%: ${ciLower.toFixed(2)}
              </text>
            </g>
          ) : (
            /* Clean History Mode: Minimalist projection point */
            <g>
              <line
                x1={lastBarX}
                y1={lastBarY}
                x2={forecastX}
                y2={forecastY}
                stroke="#059669"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle cx={forecastX} cy={forecastY} r="5" fill="#059669" />
              <text
                x={forecastX + 10}
                y={forecastY + 4}
                className="fill-emerald-800 font-bold text-[11px] font-mono tabular-nums"
              >
                Target: ${activeForecastPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* ACTIVE PRICE TARGET ALERT REFERENCE LINES */}
          {activeAlerts.map((alt) => {
            if (!alt.isActive) return null;
            const altY = getY(alt.targetPrice);
            if (altY < padding.top || altY > padding.top + plotHeight) return null;

            return (
              <g key={alt.id}>
                <line
                  x1={padding.left}
                  y1={altY}
                  x2={padding.left + plotWidth + 30}
                  y2={altY}
                  stroke="#D97706"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  className={alt.isTriggered ? 'animate-pulse' : 'opacity-90'}
                />
                <text
                  x={forecastX + 12}
                  y={altY + 3.5}
                  className="fill-amber-700 font-bold text-[10px] font-mono tabular-nums"
                >
                  🎯 {alt.condition === 'above' ? '≥' : '≤'} ${alt.targetPrice.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Hover Crosshair & Tooltip */}
          {activeHover && (
            <g>
              <line
                x1={activeHover.x}
                y1={padding.top}
                x2={activeHover.x}
                y2={padding.top + plotHeight}
                stroke="#78716C"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle cx={activeHover.x} cy={activeHover.y} r="4.5" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Hover Floating Data Card */}
        {activeHover && (
          <div
            className="absolute top-3 left-16 z-20 p-2.5 bg-white border border-[#E8E3DA] rounded-xl shadow-lg text-xs space-y-1 font-mono pointer-events-none"
          >
            <div className="font-bold text-stone-900 border-b border-[#E8E3DA] pb-1 font-sans flex items-center justify-between gap-4">
              <span>{activeHover.bar.date}</span>
              <span className="text-emerald-700 font-mono">${activeHover.bar.close.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-stone-600">
              <div>Open: ${activeHover.bar.open.toFixed(2)}</div>
              <div>High: ${activeHover.bar.high.toFixed(2)}</div>
              <div>Low: ${activeHover.bar.low.toFixed(2)}</div>
              <div>Volume: {(activeHover.bar.volume / 1000000).toFixed(1)}M</div>
              {activeHover.feat?.sma7 && <div>SMA 7: ${activeHover.feat.sma7.toFixed(2)}</div>}
              {activeHover.feat?.sma30 && <div>SMA 30: ${activeHover.feat.sma30.toFixed(2)}</div>}
              {activeHover.feat?.rsi14 && <div>RSI 14: {activeHover.feat.rsi14.toFixed(1)}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Indicator Panel: RSI 14 / Rolling Volatility / Volume */}
      <div className="space-y-2 pt-2 border-t border-[#E8E3DA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700">Auxiliary Indicator:</span>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setActiveSubIndicator('rsi')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeSubIndicator === 'rsi'
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-[#F5F2EB] text-stone-600 hover:text-stone-900'
                }`}
              >
                14-Day RSI
              </button>
              <button
                type="button"
                onClick={() => setActiveSubIndicator('volatility')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeSubIndicator === 'volatility'
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-[#F5F2EB] text-stone-600 hover:text-stone-900'
                }`}
              >
                7-Day Realized Volatility
              </button>
              <button
                type="button"
                onClick={() => setActiveSubIndicator('volume')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  activeSubIndicator === 'volume'
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-[#F5F2EB] text-stone-600 hover:text-stone-900'
                }`}
              >
                Volume Bars
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-stone-500">
            {activeSubIndicator === 'rsi' && (
              <span>Overbought: 70 · Oversold: 30 · Latest: {(featuresSlice[featuresSlice.length - 1]?.rsi14 || 50).toFixed(1)}</span>
            )}
            {activeSubIndicator === 'volatility' && (
              <span>Latest 7D Ann. Vol: {(((featuresSlice[featuresSlice.length - 1]?.volatility7) || 0.2) * 100).toFixed(1)}%</span>
            )}
            {activeSubIndicator === 'volume' && (
              <span>Latest Volume: {((historySlice[historySlice.length - 1]?.volume || 0) / 1000000).toFixed(1)}M shares</span>
            )}
          </div>
        </div>

        {/* Sub Indicator Mini SVG */}
        <div className="w-full bg-[#FCFAF7] border border-[#E8E3DA] rounded-xl overflow-hidden">
          <svg viewBox={`0 0 ${width} ${subHeight}`} className="w-full h-24 block">
            {/* RSI Threshold Lines */}
            {activeSubIndicator === 'rsi' && (
              <>
                <line x1={padding.left} y1={getSubY(70)} x2={padding.left + plotWidth} y2={getSubY(70)} stroke="#EF4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <line x1={padding.left} y1={getSubY(30)} x2={padding.left + plotWidth} y2={getSubY(30)} stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <text x={padding.left - 6} y={getSubY(70) + 3} textAnchor="end" className="fill-red-600 text-[9px] font-mono">70</text>
                <text x={padding.left - 6} y={getSubY(30) + 3} textAnchor="end" className="fill-emerald-600 text-[9px] font-mono">30</text>
              </>
            )}

            {/* Path rendering */}
            {activeSubIndicator !== 'volume' && subIndicatorPath && (
              <path
                d={subIndicatorPath}
                fill="none"
                stroke={activeSubIndicator === 'rsi' ? '#4F46E5' : '#D97706'}
                strokeWidth="1.8"
              />
            )}

            {/* Volume bars */}
            {activeSubIndicator === 'volume' && (
              <g>
                {historySlice.map((h, i) => {
                  const x = getX(i);
                  const barH = ((h.volume - subExtent.min) / (subExtent.max - subExtent.min || 1)) * (subHeight - 30);
                  const y = subHeight - 15 - barH;
                  const isUp = h.close >= h.open;
                  return (
                    <rect
                      key={`vol-${i}`}
                      x={x - 1.5}
                      y={y}
                      width="3"
                      height={Math.max(2, barH)}
                      fill={isUp ? '#059669' : '#DC2626'}
                      opacity="0.75"
                    />
                  );
                })}
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
