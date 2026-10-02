import { ShapAttribution } from '../../types/index.ts';

export const FEATURE_METADATA: Record<string, {
  name: string;
  format: (val: number) => string;
  generateText: (val: number, phi: number, ticker: string) => string;
}> = {
  rsi14: {
    name: '14-Day RSI',
    format: (v) => `${(v <= 1 ? v * 100 : v).toFixed(1)} / 100`,
    generateText: (v, phi) => {
      const scaled = v <= 1 ? v * 100 : v;
      if (scaled > 70) {
        return `RSI is in overbought territory (${scaled.toFixed(1)} > 70). Mean-reversion forces ${phi >= 0 ? 'modestly supported' : 'dragged down'} the next-day price projection by $${Math.abs(phi).toFixed(2)}.`;
      } else if (scaled < 30) {
        return `RSI is in oversold territory (${scaled.toFixed(1)} < 30). Technical bounce probability ${phi >= 0 ? 'lifted' : 'pressured'} the forecast by $${Math.abs(phi).toFixed(2)}.`;
      } else {
        return `RSI is balanced at neutral momentum (${scaled.toFixed(1)}). Contributed $${phi >= 0 ? '+' : '-'}${Math.abs(phi).toFixed(2)} to expected path.`;
      }
    },
  },
  volatility7: {
    name: '7-Day Rolling Volatility',
    format: (v) => `${(v * 100).toFixed(1)}% ann.`,
    generateText: (v, phi) => {
      const ann = v * 100;
      if (ann > 35) {
        return `Elevated 7-day realized volatility (${ann.toFixed(1)}% ann.) reflects heightened regime variance, ${phi >= 0 ? 'expanding upside drift' : 'discounting risk premium'} by $${Math.abs(phi).toFixed(2)}.`;
      } else {
        return `Subdued volatility (${ann.toFixed(1)}% ann.) suggests stable institutional price consolidation, impacting the forecast by $${phi >= 0 ? '+' : '-'}${Math.abs(phi).toFixed(2)}.`;
      }
    },
  },
  spreadSma7: {
    name: '7-Day SMA Spread',
    format: (v) => `${(v * 100).toFixed(2)}%`,
    generateText: (v, phi) => {
      const pct = (v * 100).toFixed(2);
      if (v > 0) {
        return `Trading ${pct}% above 7-day moving average. Short-term trend momentum ${phi >= 0 ? 'reinforces upside drift' : 'faces mean-reversion pull'} of $${Math.abs(phi).toFixed(2)}.`;
      } else {
        return `Trading ${Math.abs(Number(pct))}% below 7-day moving average. Short-term discount ${phi >= 0 ? 'triggers value accumulation' : 'adds downward pressure'} of $${Math.abs(phi).toFixed(2)}.`;
      }
    },
  },
  spreadSma30: {
    name: '30-Day SMA Spread',
    format: (v) => `${(v * 100).toFixed(2)}%`,
    generateText: (v, phi) => {
      const pct = (v * 100).toFixed(2);
      if (v > 0) {
        return `Intermediate trend confirms bullish structure (+${pct}% vs 30-day baseline), contributing $${phi >= 0 ? '+' : '-'}${Math.abs(phi).toFixed(2)}.`;
      } else {
        return `Below 30-day moving average (-${Math.abs(Number(pct))}%), indicating medium-term resistance, contributing $${phi >= 0 ? '+' : '-'}${Math.abs(phi).toFixed(2)}.`;
      }
    },
  },
  sentimentScore: {
    name: 'News Sentiment Score',
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`,
    generateText: (v, phi) => {
      if (v > 0.2) {
        return `Lexicon-scored news headlines tilt bullish (+${v.toFixed(2)}). Positive headline narrative added $${Math.abs(phi).toFixed(2)} to forecast.`;
      } else if (v < -0.2) {
        return `Lexicon-scored news headlines tilt bearish (${v.toFixed(2)}). Negative media tone deducted $${Math.abs(phi).toFixed(2)} from forecast.`;
      } else {
        return `News coverage is broadly neutral/balanced (${v.toFixed(2)}). Minimal narrative bias ($${phi >= 0 ? '+' : '-'}${Math.abs(phi).toFixed(2)}).`;
      }
    },
  },
  momentum5: {
    name: '5-Day Price Momentum',
    format: (v) => `${(v * 100).toFixed(2)}%`,
    generateText: (v, phi) => {
      const pct = (v * 100).toFixed(2);
      return `5-day cumulative return is ${pct}%. Momentum factor contributed $${phi >= 0 ? '+' : '-'}${Math.abs(phi).toFixed(2)} to tree model splitting paths.`;
    },
  },
};

export function buildShapAttributions(
  featureKeys: string[],
  featureValues: number[],
  rawPhi: number[],
  lastClose: number,
  ticker: string
): ShapAttribution[] {
  const totalAbsPhi = rawPhi.reduce((a, b) => a + Math.abs(b), 0) || 1;

  return featureKeys.map((key, idx) => {
    const val = featureValues[idx] ?? 0;
    const phi = rawPhi[idx] ?? 0;
    const meta = FEATURE_METADATA[key] || {
      name: key,
      format: (v: number) => v.toFixed(2),
      generateText: (_v: number, p: number) => `Factor contributed $${p.toFixed(2)} to forecast.`,
    };

    const percentContribution = Math.round((Math.abs(phi) / totalAbsPhi) * 1000) / 10;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (phi > 0.03) direction = 'bullish';
    else if (phi < -0.03) direction = 'bearish';

    return {
      featureName: key,
      displayName: meta.name,
      featureValue: val,
      formattedValue: meta.format(val),
      attribution: Math.round(phi * 100) / 100,
      percentContribution,
      direction,
      explanation: meta.generateText(val, phi, ticker),
    };
  }).sort((a, b) => Math.abs(b.attribution) - Math.abs(a.attribution));
}
