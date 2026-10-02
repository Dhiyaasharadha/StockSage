import { OHLCV, TechnicalFeaturePoint } from '../types/index.ts';

/**
 * Computes engineered technical features for daily OHLCV series.
 * Features:
 * - 7-day Simple Moving Average (SMA_7)
 * - 30-day Simple Moving Average (SMA_30)
 * - 7-day Rolling Volatility (annualized standard deviation of daily log returns)
 * - 14-day Relative Strength Index (Wilder's RSI)
 * - Spreads from SMA_7 and SMA_30
 * - 5-day price momentum and 1-day lag return
 */
export function computeFeatures(
  data: OHLCV[],
  dailySentimentScore: number = 0
): TechnicalFeaturePoint[] {
  if (!data || data.length === 0) return [];

  const points: TechnicalFeaturePoint[] = [];

  // Log returns for volatility calculation
  const logReturns: number[] = [0];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].close;
    const curr = data[i].close;
    logReturns.push(prev > 0 ? Math.log(curr / prev) : 0);
  }

  // Pre-calculate RSI Wilder gains and losses
  const gains: number[] = [0];
  const losses: number[] = [0];
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < data.length; i++) {
    const close = data[i].close;

    // 1-day return
    const return1d = i > 0 && data[i - 1].close > 0
      ? (close - data[i - 1].close) / data[i - 1].close
      : 0;

    // 5-day momentum
    const momentum5 = i >= 5 && data[i - 5].close > 0
      ? (close - data[i - 5].close) / data[i - 5].close
      : (i > 0 && data[0].close > 0 ? (close - data[0].close) / data[0].close : 0);

    // 7-day SMA
    let sma7: number | null = null;
    if (i >= 6) {
      let sum7 = 0;
      for (let j = i - 6; j <= i; j++) {
        sum7 += data[j].close;
      }
      sma7 = sum7 / 7;
    }

    // 30-day SMA
    let sma30: number | null = null;
    if (i >= 29) {
      let sum30 = 0;
      for (let j = i - 29; j <= i; j++) {
        sum30 += data[j].close;
      }
      sma30 = sum30 / 30;
    }

    // 7-day Rolling Volatility (annualized: std dev * sqrt(252))
    let volatility7: number | null = null;
    if (i >= 6) {
      const windowReturns = logReturns.slice(i - 6, i + 1);
      const mean = windowReturns.reduce((acc, val) => acc + val, 0) / windowReturns.length;
      const variance = windowReturns.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (windowReturns.length - 1 || 1);
      const dailyStdDev = Math.sqrt(variance);
      volatility7 = dailyStdDev * Math.sqrt(252); // Annualized volatility
    }

    // 14-day RSI (Wilder's formula)
    let rsi14: number | null = null;
    if (i === 14) {
      let sumG = 0;
      let sumL = 0;
      for (let k = 1; k <= 14; k++) {
        sumG += gains[k];
        sumL += losses[k];
      }
      avgGain = sumG / 14;
      avgLoss = sumL / 14;
      if (avgLoss === 0) {
        rsi14 = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi14 = 100 - 100 / (1 + rs);
      }
    } else if (i > 14) {
      avgGain = (avgGain * 13 + gains[i]) / 14;
      avgLoss = (avgLoss * 13 + losses[i]) / 14;
      if (avgLoss === 0) {
        rsi14 = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi14 = 100 - 100 / (1 + rs);
      }
    }

    const spreadSma7 = sma7 !== null ? (close - sma7) / sma7 : null;
    const spreadSma30 = sma30 !== null ? (close - sma30) / sma30 : null;

    // Daily sentiment score (recent days reflect current news sentiment, historical decays to 0)
    // For backtesting, sentiment has a slight momentum correlation with returns
    const recencyWeight = Math.max(0, 1 - (data.length - 1 - i) / 10);
    const daySentiment = recencyWeight * dailySentimentScore + (1 - recencyWeight) * (return1d * 4);
    const clampedSentiment = Math.max(-1, Math.min(1, daySentiment));

    points.push({
      date: data[i].date,
      close,
      sma7,
      sma30,
      volatility7,
      rsi14,
      momentum5,
      return1d,
      spreadSma7,
      spreadSma30,
      sentimentScore: clampedSentiment,
    });
  }

  return points;
}
