export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalFeaturePoint {
  date: string;
  close: number;
  sma7: number | null;
  sma30: number | null;
  volatility7: number | null; // 7-day rolling annualized or daily volatility
  rsi14: number | null; // 14-day Relative Strength Index
  momentum5: number | null; // 5-day return (%)
  return1d: number | null; // 1-day return (%)
  spreadSma7: number | null; // (close - sma7) / sma7
  spreadSma30: number | null; // (close - sma30) / sma30
  sentimentScore: number; // aggregated daily sentiment [-1, 1]
}

export interface HeadlineSentiment {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  score: number; // [-1.0, 1.0]
  confidence: number; // [0.0, 1.0]
  sentimentClass: 'positive' | 'negative' | 'neutral';
  keyPhrases: string[];
}

export interface ModelPrediction {
  modelName: string;
  predictedPrice: number;
  predictedReturn: number;
  weight: number;
  rmse: number;
  mae: number;
  directionalAccuracy: number; // 0 - 100%
}

export interface BootstrapConfidenceInterval {
  lowerBound90: number; // 5th percentile
  upperBound90: number; // 95th percentile
  median: number;
  standardError: number;
  residualsSample: number[]; // sample of residuals for visualization
  skewness: number;
  kurtosis: number;
}

export interface ShapAttribution {
  featureName: string;
  displayName: string;
  featureValue: number;
  formattedValue: string;
  attribution: number; // contribution to price in $ (delta from expected value)
  percentContribution: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  explanation: string;
}

export interface ForecastResult {
  ticker: string;
  companyName: string;
  lastClose: number;
  lastDate: string;
  forecastDate: string;
  ensemblePrice: number;
  ensembleReturnPercent: number;
  expectedValueBasePrice: number; // E[f(x)]
  models: {
    gbdt: ModelPrediction;
    timeSeries: ModelPrediction;
    deepLearning?: ModelPrediction;
  };
  confidenceInterval: BootstrapConfidenceInterval;
  shapAttributions: ShapAttribution[];
  sentiment: {
    dailyAverage: number;
    headlineCount: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    headlines: HeadlineSentiment[];
    sourceLabel: string;
  };
  dataSource: {
    sourceName: string;
    sourceType: 'alphavantage' | 'stooq' | 'synthetic';
    recordsCount: number;
    startDate: string;
    endDate: string;
    isFallback: boolean;
    attributionNote: string;
  };
  backtestMetrics: {
    testPeriodDays: number;
    ensembleRmse: number;
    ensembleMae: number;
    ensembleDirectionalAccuracy: number;
    totalHistoricalBars: number;
  };
}

export interface WhatIfScenarioInput {
  sentimentOverride: number; // [-1.0, 1.0]
  volatilityMultiplier?: number; // e.g. 1.0 = normal, 1.5 = elevated
  priceShockPercent?: number; // e.g. -2% to +2%
}

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  condition: 'above' | 'below';
  alertType: 'real' | 'forecast' | 'both';
  note?: string;
  createdAt: number;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: number;
  triggeredPrice?: number;
}
