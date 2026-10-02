import { BootstrapConfidenceInterval } from '../../types/index.ts';

/**
 * Computes non-parametric 90% confidence intervals via bootstrap resampling of historical prediction residuals.
 * B = 1000 iterations with replacement to capture empirical skewness and fat tails (leptokurtosis).
 */
export function computeBootstrapConfidenceInterval(
  residuals: number[],
  ensemblePointEstimate: number,
  nIterations: number = 1000
): BootstrapConfidenceInterval {
  if (!residuals || residuals.length === 0) {
    const defaultSpread = ensemblePointEstimate * 0.025;
    return {
      lowerBound90: ensemblePointEstimate - defaultSpread,
      upperBound90: ensemblePointEstimate + defaultSpread,
      median: ensemblePointEstimate,
      standardError: defaultSpread / 1.645,
      residualsSample: [],
      skewness: 0,
      kurtosis: 3,
    };
  }

  const n = residuals.length;
  const bootstrapForecasts: number[] = new Array(nIterations);
  const sampleResiduals: number[] = [];

  for (let b = 0; b < nIterations; b++) {
    // Draw a random residual with replacement
    const randomIndex = Math.floor(Math.random() * n);
    const sampledResidual = residuals[randomIndex];
    bootstrapForecasts[b] = ensemblePointEstimate + sampledResidual;

    if (b < 150) {
      sampleResiduals.push(sampledResidual);
    }
  }

  // Sort bootstrap forecasts
  bootstrapForecasts.sort((a, b) => a - b);

  // 90% Confidence Interval: 5th and 95th percentiles
  const p05Index = Math.floor(nIterations * 0.05);
  const p95Index = Math.floor(nIterations * 0.95);
  const medianIndex = Math.floor(nIterations * 0.50);

  const lowerBound90 = bootstrapForecasts[p05Index];
  const upperBound90 = bootstrapForecasts[p95Index];
  const median = bootstrapForecasts[medianIndex];

  // Calculate moments of historical residuals
  const meanRes = residuals.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;

  for (let i = 0; i < n; i++) {
    const diff = residuals[i] - meanRes;
    const diff2 = diff * diff;
    m2 += diff2;
    m3 += diff2 * diff;
    m4 += diff2 * diff2;
  }

  const variance = m2 / n;
  const stdDev = Math.sqrt(variance) || 1e-4;
  const skewness = (m3 / n) / Math.pow(stdDev, 3);
  const kurtosis = (m4 / n) / Math.pow(stdDev, 4);

  return {
    lowerBound90: Math.round(lowerBound90 * 100) / 100,
    upperBound90: Math.round(upperBound90 * 100) / 100,
    median: Math.round(median * 100) / 100,
    standardError: Math.round(stdDev * 100) / 100,
    residualsSample: sampleResiduals.map(r => Math.round(r * 100) / 100),
    skewness: Math.round(skewness * 100) / 100,
    kurtosis: Math.round(kurtosis * 100) / 100,
  };
}
