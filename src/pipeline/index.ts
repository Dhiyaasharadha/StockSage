import {
  BootstrapConfidenceInterval,
  ForecastResult,
  OHLCV,
  TechnicalFeaturePoint,
  WhatIfScenarioInput,
} from '../types/index.ts';
import { ingestStockData } from './ingestion.ts';
import { computeFeatures } from './features.ts';
import { fetchNewsSentiment } from './sentiment.ts';
import { GradientBoostedTrees } from './models/tree.ts';
import { StatisticalTimeSeriesRegressor } from './models/statistical.ts';
import { computeBootstrapConfidenceInterval } from './models/bootstrap.ts';
import { buildShapAttributions } from './explainability/shap.ts';

const COMPANY_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',
  NVDA: 'NVIDIA Corporation',
  MSFT: 'Microsoft Corporation',
  TSLA: 'Tesla, Inc.',
  GOOGL: 'Alphabet Inc.',
  AMZN: 'Amazon.com, Inc.',
  META: 'Meta Platforms, Inc.',
  SPY: 'SPDR S&P 500 ETF Trust',
  QQQ: 'Invesco QQQ Trust',
};

export interface PipelineExecutionResult {
  forecast: ForecastResult;
  history: OHLCV[];
  features: TechnicalFeaturePoint[];
  trainedGbdt: GradientBoostedTrees;
  trainedStatistical: StatisticalTimeSeriesRegressor;
  trainingFeatures: {
    keys: string[];
    latestFeatureVector: number[];
  };
}

export const FEATURE_KEYS = [
  'rsi14',
  'volatility7',
  'spreadSma7',
  'spreadSma30',
  'sentimentScore',
  'momentum5',
];

/**
 * Runs the end-to-end stock forecasting pipeline.
 */
export async function runForecastingPipeline(
  ticker: string,
  apiKeyOverride?: string
): Promise<PipelineExecutionResult> {
  const cleanTicker = ticker.toUpperCase().trim();
  const companyName = COMPANY_NAMES[cleanTicker] || `${cleanTicker} Stock`;

  // 1. Data Ingestion
  const ingestion = await ingestStockData(cleanTicker, apiKeyOverride);
  const data = ingestion.data;

  // 2. News Sentiment
  const sentiment = await fetchNewsSentiment(cleanTicker);

  // 3. Feature Engineering
  const featurePoints = computeFeatures(data, sentiment.dailyAverage);

  // Filter valid data points where all features are computed (needs at least 30 days)
  const validIndices: number[] = [];
  for (let i = 35; i < featurePoints.length - 1; i++) {
    const pt = featurePoints[i];
    if (
      pt.sma7 !== null &&
      pt.sma30 !== null &&
      pt.volatility7 !== null &&
      pt.rsi14 !== null &&
      pt.spreadSma7 !== null &&
      pt.spreadSma30 !== null &&
      pt.momentum5 !== null
    ) {
      validIndices.push(i);
    }
  }

  // Build training matrices: X[t] -> target y[t] is next-day close
  // For stability across multi-year price growth, we train on relative price multiplier: y[t] = nextClose / currentClose
  const X: number[][] = [];
  const yReturnMultipliers: number[] = [];
  const currentPrices: number[] = [];
  const actualNextPrices: number[] = [];

  for (const idx of validIndices) {
    const pt = featurePoints[idx];
    const nextClose = data[idx + 1].close;
    const curClose = pt.close;

    X.push([
      (pt.rsi14 ?? 50) / 100, // scaled 0 - 1
      pt.volatility7 ?? 0.2,
      pt.spreadSma7 ?? 0,
      pt.spreadSma30 ?? 0,
      pt.sentimentScore,
      pt.momentum5 ?? 0,
    ]);

    yReturnMultipliers.push(nextClose / curClose);
    currentPrices.push(curClose);
    actualNextPrices.push(nextClose);
  }

  // Latest observation to forecast Day T+1
  const lastIndex = featurePoints.length - 1;
  const lastPoint = featurePoints[lastIndex];
  const lastClose = lastPoint.close;
  const lastDate = lastPoint.date;

  // Compute next trading date
  const lastDateObj = new Date(lastDate);
  const nextDateObj = new Date(lastDateObj);
  do {
    nextDateObj.setDate(nextDateObj.getDate() + 1);
  } while (nextDateObj.getDay() === 0 || nextDateObj.getDay() === 6);
  const forecastDate = nextDateObj.toISOString().split('T')[0];

  const latestFeatureVector = [
    (lastPoint.rsi14 ?? 50) / 100,
    lastPoint.volatility7 ?? 0.2,
    lastPoint.spreadSma7 ?? 0,
    lastPoint.spreadSma30 ?? 0,
    sentiment.dailyAverage,
    lastPoint.momentum5 ?? 0,
  ];

  // 4. Model Training & Out-Of-Sample Residual Evaluation
  const gbdt = new GradientBoostedTrees({
    nEstimators: 24,
    learningRate: 0.1,
    maxDepth: 3,
    minSamplesSplit: 5,
    subsample: 0.85,
  });

  const statistical = new StatisticalTimeSeriesRegressor(0.25);

  // Train on 85% train split, evaluate on last 15% out-of-fold test set
  const splitIdx = Math.floor(X.length * 0.85);
  const trainX = X.slice(0, splitIdx);
  const trainY = yReturnMultipliers.slice(0, splitIdx);
  const testX = X.slice(splitIdx);
  const testY = yReturnMultipliers.slice(splitIdx);
  const testCurPrices = currentPrices.slice(splitIdx);
  const testActualNext = actualNextPrices.slice(splitIdx);

  // Fit models
  gbdt.fit(trainX, trainY, FEATURE_KEYS);
  statistical.fit(trainX, trainY);

  // Evaluate out-of-sample metrics
  const gbdtResiduals: number[] = [];
  const statResiduals: number[] = [];
  const ensembleResiduals: number[] = [];

  let gbdtSqError = 0;
  let gbdtAbsError = 0;
  let gbdtDirHits = 0;

  let statSqError = 0;
  let statAbsError = 0;
  let statDirHits = 0;

  let ensSqError = 0;
  let ensAbsError = 0;
  let ensDirHits = 0;

  const nTest = testX.length;
  for (let i = 0; i < nTest; i++) {
    const pCurrent = testCurPrices[i];
    const actualNext = testActualNext[i];
    const actualReturn = actualNext - pCurrent;

    const gMult = gbdt.predict(testX[i]);
    const gPredPrice = pCurrent * gMult;
    const gRes = actualNext - gPredPrice;
    gbdtResiduals.push(gRes);
    gbdtSqError += gRes * gRes;
    gbdtAbsError += Math.abs(gRes);
    if ((gPredPrice - pCurrent) * actualReturn >= 0) gbdtDirHits++;

    const sMult = statistical.predict(testX[i]);
    const sPredPrice = pCurrent * sMult;
    const sRes = actualNext - sPredPrice;
    statResiduals.push(sRes);
    statSqError += sRes * sRes;
    statAbsError += Math.abs(sRes);
    if ((sPredPrice - pCurrent) * actualReturn >= 0) statDirHits++;

    // Naive 50/50 blend for out-of-fold baseline
    const ePredPrice = 0.5 * gPredPrice + 0.5 * sPredPrice;
    const eRes = actualNext - ePredPrice;
    ensembleResiduals.push(eRes);
    ensSqError += eRes * eRes;
    ensAbsError += Math.abs(eRes);
    if ((ePredPrice - pCurrent) * actualReturn >= 0) ensDirHits++;
  }

  const gbdtRmse = Math.sqrt(gbdtSqError / (nTest || 1));
  const gbdtMae = gbdtAbsError / (nTest || 1);
  const gbdtDirAcc = (gbdtDirHits / (nTest || 1)) * 100;

  const statRmse = Math.sqrt(statSqError / (nTest || 1));
  const statMae = statAbsError / (nTest || 1);
  const statDirAcc = (statDirHits / (nTest || 1)) * 100;

  const ensRmse = Math.sqrt(ensSqError / (nTest || 1));
  const ensMae = ensAbsError / (nTest || 1);
  const ensDirAcc = (ensDirHits / (nTest || 1)) * 100;

  // Refit on full dataset for live next-day inference
  gbdt.fit(X, yReturnMultipliers, FEATURE_KEYS);
  statistical.fit(X, yReturnMultipliers);

  // Compute live point estimates
  const gbdtMultNext = gbdt.predict(latestFeatureVector);
  const gbdtPredNext = lastClose * gbdtMultNext;

  const statMultNext = statistical.predict(latestFeatureVector);
  const statPredNext = lastClose * statMultNext;

  // Inverse-RMSE weighting for optimal ensemble variance reduction
  const invGbdt = 1 / (gbdtRmse || 1);
  const invStat = 1 / (statRmse || 1);
  const totalInv = invGbdt + invStat;
  const gbdtWeight = invGbdt / totalInv;
  const statWeight = invStat / totalInv;

  const ensemblePrice = gbdtWeight * gbdtPredNext + statWeight * statPredNext;
  const ensembleReturnPercent = ((ensemblePrice - lastClose) / lastClose) * 100;

  // 5. Bootstrap Resampling for 90% Confidence Interval
  const confidenceInterval = computeBootstrapConfidenceInterval(
    ensembleResiduals,
    ensemblePrice,
    1000
  );

  // 6. TreeSHAP Attribution for GBDT Model
  const rawPhi = gbdt.computeTreeSHAP(latestFeatureVector);
  // Scale raw return multiplier delta into dollar impact relative to current close
  const dollarPhi = rawPhi.map(p => p * lastClose);
  const shapAttributions = buildShapAttributions(
    FEATURE_KEYS,
    latestFeatureVector,
    dollarPhi,
    lastClose,
    cleanTicker
  );

  const basePriceExpected = gbdt.baseValue * lastClose;

  const forecastResult: ForecastResult = {
    ticker: cleanTicker,
    companyName,
    lastClose: Math.round(lastClose * 100) / 100,
    lastDate,
    forecastDate,
    ensemblePrice: Math.round(ensemblePrice * 100) / 100,
    ensembleReturnPercent: Math.round(ensembleReturnPercent * 100) / 100,
    expectedValueBasePrice: Math.round(basePriceExpected * 100) / 100,
    models: {
      gbdt: {
        modelName: 'Gradient-Boosted Decision Trees (GBDT)',
        predictedPrice: Math.round(gbdtPredNext * 100) / 100,
        predictedReturn: Math.round(((gbdtPredNext - lastClose) / lastClose) * 10000) / 100,
        weight: Math.round(gbdtWeight * 100) / 100,
        rmse: Math.round(gbdtRmse * 100) / 100,
        mae: Math.round(gbdtMae * 100) / 100,
        directionalAccuracy: Math.round(gbdtDirAcc * 10) / 10,
      },
      timeSeries: {
        modelName: 'Autoregressive Ridge Time-Series',
        predictedPrice: Math.round(statPredNext * 100) / 100,
        predictedReturn: Math.round(((statPredNext - lastClose) / lastClose) * 10000) / 100,
        weight: Math.round(statWeight * 100) / 100,
        rmse: Math.round(statRmse * 100) / 100,
        mae: Math.round(statMae * 100) / 100,
        directionalAccuracy: Math.round(statDirAcc * 10) / 10,
      },
    },
    confidenceInterval,
    shapAttributions,
    sentiment,
    dataSource: {
      sourceName: ingestion.sourceName,
      sourceType: ingestion.sourceType,
      recordsCount: data.length,
      startDate: ingestion.startDate,
      endDate: ingestion.endDate,
      isFallback: ingestion.isFallback,
      attributionNote: ingestion.attributionNote,
    },
    backtestMetrics: {
      testPeriodDays: nTest,
      ensembleRmse: Math.round(ensRmse * 100) / 100,
      ensembleMae: Math.round(ensMae * 100) / 100,
      ensembleDirectionalAccuracy: Math.round(ensDirAcc * 10) / 10,
      totalHistoricalBars: data.length,
    },
  };

  return {
    forecast: forecastResult,
    history: data,
    features: featurePoints,
    trainedGbdt: gbdt,
    trainedStatistical: statistical,
    trainingFeatures: {
      keys: FEATURE_KEYS,
      latestFeatureVector,
    },
  };
}

/**
 * Re-evaluates forecast and SHAP attributions instantly when user adjusts what-if parameters in UI.
 * Zero-latency: directly queries the already trained models without retraining!
 */
export function recomputeWhatIfScenario(
  baseForecast: ForecastResult,
  trainedGbdt: GradientBoostedTrees,
  trainedStatistical: StatisticalTimeSeriesRegressor,
  latestVector: number[],
  scenario: WhatIfScenarioInput
): {
  ensemblePrice: number;
  ensembleReturnPercent: number;
  confidenceInterval: BootstrapConfidenceInterval;
  shapAttributions: ReturnType<typeof buildShapAttributions>;
  gbdtPrice: number;
  timeSeriesPrice: number;
} {
  const lastClose = baseForecast.lastClose;
  const modVector = [...latestVector];

  // Feature indices:
  // 0: rsi14, 1: volatility7, 2: spreadSma7, 3: spreadSma30, 4: sentimentScore, 5: momentum5
  modVector[4] = scenario.sentimentOverride;

  if (scenario.volatilityMultiplier && scenario.volatilityMultiplier !== 1.0) {
    modVector[1] = Math.max(0.05, Math.min(1.0, modVector[1] * scenario.volatilityMultiplier));
  }

  if (scenario.priceShockPercent && scenario.priceShockPercent !== 0) {
    modVector[5] = modVector[5] + scenario.priceShockPercent / 100;
  }

  const gbdtMult = trainedGbdt.predict(modVector);
  const gbdtPrice = Math.round(lastClose * gbdtMult * 100) / 100;

  const statMult = trainedStatistical.predict(modVector);
  const timeSeriesPrice = Math.round(lastClose * statMult * 100) / 100;

  const wG = baseForecast.models.gbdt.weight;
  const wS = baseForecast.models.timeSeries.weight;
  const ensemblePrice = Math.round((wG * gbdtPrice + wS * timeSeriesPrice) * 100) / 100;
  const ensembleReturnPercent = Math.round(((ensemblePrice - lastClose) / lastClose) * 10000) / 100;

  // TreeSHAP recalculation on overridden vector
  const rawPhi = trainedGbdt.computeTreeSHAP(modVector);
  const dollarPhi = rawPhi.map(p => p * lastClose);
  const shapAttributions = buildShapAttributions(
    FEATURE_KEYS,
    modVector,
    dollarPhi,
    lastClose,
    baseForecast.ticker
  );

  // Adjust confidence interval spread if volatility changed
  const volMult = scenario.volatilityMultiplier ?? 1.0;
  const origCi = baseForecast.confidenceInterval;
  const halfSpan = (origCi.upperBound90 - origCi.lowerBound90) / 2;
  const adjustedHalfSpan = halfSpan * volMult;

  const confidenceInterval: BootstrapConfidenceInterval = {
    ...origCi,
    lowerBound90: Math.round((ensemblePrice - adjustedHalfSpan) * 100) / 100,
    upperBound90: Math.round((ensemblePrice + adjustedHalfSpan) * 100) / 100,
    median: ensemblePrice,
  };

  return {
    ensemblePrice,
    ensembleReturnPercent,
    confidenceInterval,
    shapAttributions,
    gbdtPrice,
    timeSeriesPrice,
  };
}
