import React from 'react';
import { HeadlineSentiment } from '../types/index.ts';
import { Newspaper, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface SentimentGaugeCardProps {
  score: number; // [-1.0, 1.0]
  headlines: HeadlineSentiment[];
  sourceLabel: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
}

export const SentimentGaugeCard: React.FC<SentimentGaugeCardProps> = ({
  score,
  headlines,
  sourceLabel,
  bullishCount,
  bearishCount,
  neutralCount,
}) => {
  // Semicircular gauge math: angle ranges from -90 deg (-1.0 score) to +90 deg (+1.0 score)
  const clampedScore = Math.max(-1, Math.min(1, score));
  const angleDeg = clampedScore * 90; // -90 (far left, bearish) to +90 (far right, bullish)
  const angleRad = (angleDeg * Math.PI) / 180;

  // Center: (100, 95), radius 70
  const cx = 100;
  const cy = 95;
  const needleLen = 58;

  // Needle tip
  const needleX = cx + needleLen * Math.sin(angleRad);
  const needleY = cy - needleLen * Math.cos(angleRad);

  const getSentimentText = (val: number) => {
    if (val > 0.4) return { label: 'Strong Bullish', color: 'text-emerald-800' };
    if (val > 0.15) return { label: 'Moderately Bullish', color: 'text-emerald-700' };
    if (val < -0.4) return { label: 'Strong Bearish', color: 'text-rose-800' };
    if (val < -0.15) return { label: 'Moderately Bearish', color: 'text-rose-700' };
    return { label: 'Neutral / Balanced', color: 'text-stone-600' };
  };

  const sentimentInfo = getSentimentText(clampedScore);

  return (
    <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E3DA]">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-stone-900 flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-emerald-600" />
            Financial Sentiment Radar
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time financial headline sentiment scoring trained on market press & earnings releases.
          </p>
        </div>
        <div className="text-xs text-stone-500">
          Source: <strong className="text-stone-800">{sourceLabel}</strong>
        </div>
      </div>

      {/* Semicircular Gauge & Quantitative Score Card */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-[#FAF8F5] border border-[#E8E3DA] p-4 rounded-xl">
        {/* SVG Gauge Graphic */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <svg viewBox="0 0 200 120" className="w-48 h-auto overflow-visible">
            {/* Background Arc: Bearish zone (red) */}
            <path
              d="M 30 95 A 70 70 0 0 1 75 35"
              fill="none"
              stroke="#FCA5A5"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Background Arc: Neutral zone (amber/stone) */}
            <path
              d="M 77 33 A 70 70 0 0 1 123 33"
              fill="none"
              stroke="#E8E3DA"
              strokeWidth="14"
            />
            {/* Background Arc: Bullish zone (green) */}
            <path
              d="M 125 35 A 70 70 0 0 1 170 95"
              fill="none"
              stroke="#A7F3D0"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* Pivot Pin Base */}
            <circle cx={cx} cy={cy} r="6" fill="#1C1917" />

            {/* Needle Line */}
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke="#1C1917"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Tick Text Markers */}
            <text x="24" y="112" textAnchor="middle" className="fill-rose-700 text-[10px] font-mono font-bold">-1.0</text>
            <text x="100" y="20" textAnchor="middle" className="fill-stone-500 text-[10px] font-mono font-medium">0.0</text>
            <text x="176" y="112" textAnchor="middle" className="fill-emerald-800 text-[10px] font-mono font-bold">+1.0</text>
          </svg>
        </div>

        {/* Breakdown Stats */}
        <div className="sm:col-span-7 space-y-3">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wide font-semibold">Aggregate Daily Sentiment Score</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-stone-900 tabular-nums">
                {clampedScore > 0 ? '+' : ''}{clampedScore.toFixed(2)}
              </span>
              <span className={`text-xs font-bold ${sentimentInfo.color}`}>
                {sentimentInfo.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E8E3DA] text-xs">
            <div className="bg-white p-2 rounded-lg border border-[#E8E3DA]">
              <div className="text-emerald-800 font-bold font-mono tabular-nums">{bullishCount}</div>
              <div className="text-[10px] text-stone-500">Bullish</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-[#E8E3DA]">
              <div className="text-stone-700 font-bold font-mono tabular-nums">{neutralCount}</div>
              <div className="text-[10px] text-stone-500">Neutral</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-[#E8E3DA]">
              <div className="text-rose-800 font-bold font-mono tabular-nums">{bearishCount}</div>
              <div className="text-[10px] text-stone-500">Bearish</div>
            </div>
          </div>
        </div>
      </div>

      {/* Parsed Headlines Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-600 font-semibold">
          <span>Processed Institutional Headlines ({headlines.length})</span>
          <span className="text-[11px] text-stone-400 font-normal">Lexicon Scored</span>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {headlines.map((item) => {
            const isPos = item.score > 0.15;
            const isNeg = item.score < -0.15;
            return (
              <div
                key={item.id}
                className="p-3 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl hover:border-stone-400 transition-colors space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-stone-800 hover:text-emerald-700 leading-snug flex-1 transition-colors flex items-start gap-1"
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
                  </a>

                  {/* Sentiment Score Pill */}
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[10px] font-mono font-bold rounded flex items-center gap-0.5 tabular-nums ${
                      isPos
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isNeg
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {isPos ? <ArrowUpRight className="w-3 h-3" /> : isNeg ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {item.score > 0 ? '+' : ''}{item.score.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-700">{item.source}</span>
                    <span>·</span>
                    <span>Conf: {Math.round(item.confidence * 100)}%</span>
                  </div>

                  {item.keyPhrases && item.keyPhrases.length > 0 && (
                    <div className="flex items-center gap-1">
                      {item.keyPhrases.map((kp, kpi) => (
                        <span key={kpi} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E8E3DA] text-stone-600">
                          {kp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
