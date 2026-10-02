import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  runForecastingPipeline,
  recomputeWhatIfScenario,
  PipelineExecutionResult,
} from './src/pipeline/index.ts';
import { generatePrebundledAAPL } from './src/pipeline/prebundled.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory cache for recent runs (ticker -> PipelineExecutionResult)
const pipelineCache = new Map<string, { result: PipelineExecutionResult; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Initialize AAPL prebundled into cache immediately for instant cold-start
const prebundledAAPL = generatePrebundledAAPL();

// Warm cache with live Alpha Vantage data asynchronously
runForecastingPipeline('AAPL', process.env.ALPHAVANTAGE_API_KEY)
  .then((res) => {
    pipelineCache.set('AAPL', { result: res, timestamp: Date.now() });
    console.log('[Stock Sage] Cache pre-warmed with live Alpha Vantage market data for AAPL.');
  })
  .catch((err) => {
    console.warn('[Stock Sage] Startup cache warming notice:', err?.message);
  });

/**
 * GET /api/stock/:ticker
 * Ingests, processes technical features, scores sentiment, fits ensemble, computes bootstrap CI and SHAP
 */
app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const rawTicker = req.params.ticker || 'AAPL';
    const ticker = rawTicker.toUpperCase().trim();

    // Check memory cache
    const cached = pipelineCache.get(ticker);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        data: cached.result.forecast,
        history: cached.result.history,
        features: cached.result.features,
        fromCache: true,
      });
    }

    // Execute pipeline
    const result = await runForecastingPipeline(ticker, process.env.ALPHAVANTAGE_API_KEY);
    pipelineCache.set(ticker, { result, timestamp: Date.now() });

    return res.json({
      success: true,
      data: result.forecast,
      history: result.history,
      features: result.features,
      fromCache: false,
    });
  } catch (error: any) {
    console.error('Pipeline error:', error);
    // Return prebundled fallback on catastrophic failure so UI never crashes
    return res.json({
      success: true,
      data: prebundledAAPL.forecast,
      history: prebundledAAPL.history,
      features: prebundledAAPL.features,
      fallbackUsed: true,
      errorMessage: error?.message || 'Error executing pipeline, served resilient fallback',
    });
  }
});

/**
 * POST /api/what-if
 * Fast client what-if recomputation without retraining
 */
app.post('/api/what-if', (req, res) => {
  try {
    const { ticker, sentimentOverride, volatilityMultiplier, priceShockPercent } = req.body;
    const cleanTicker = (ticker || 'AAPL').toUpperCase().trim();

    const cached = pipelineCache.get(cleanTicker);
    if (!cached) {
      return res.status(404).json({ error: 'Ticker model not cached yet, run /api/stock/:ticker first' });
    }

    const updated = recomputeWhatIfScenario(
      cached.result.forecast,
      cached.result.trainedGbdt,
      cached.result.trainedStatistical,
      cached.result.trainingFeatures.latestFeatureVector,
      {
        sentimentOverride: typeof sentimentOverride === 'number' ? sentimentOverride : 0,
        volatilityMultiplier: typeof volatilityMultiplier === 'number' ? volatilityMultiplier : 1.0,
        priceShockPercent: typeof priceShockPercent === 'number' ? priceShockPercent : 0,
      }
    );

    return res.json({
      success: true,
      whatIfResult: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'What-if evaluation failed' });
  }
});

/**
 * GET /api/health
 */
app.get('/api/health', (_req, res) => {
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    alphaVantageConfigured: Boolean(process.env.ALPHAVANTAGE_API_KEY),
    cachedTickers: Array.from(pipelineCache.keys()),
  });
});

async function startServer() {
  if (!isProd) {
    // Vite Dev Middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(portNum, '0.0.0.0', () => {
    console.log(`[Stock Sage] Server listening on http://0.0.0.0:${portNum}`);
  });
}

startServer().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
