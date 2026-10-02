# Stock Sage — Explainable Multi-Model Stock Forecasting Platform

Stock Sage is a full-stack, production-grade financial quantitative research application designed to forecast next-day equity prices with transparent machine learning explainability. Rather than producing opaque "black box" numbers, Stock Sage blends complementary model architectures, models non-Gaussian tail risk via non-parametric bootstrap resampling, and computes exact feature attributions via TreeSHAP.

---

## 🏛️ System Architecture

Stock Sage is architected in a modular pipeline where each stage has a distinct mathematical and operational responsibility:

```
[ Market Data Ingestion ] 
    ├── Primary: Alpha Vantage TIME_SERIES_DAILY REST API (Authenticated)
    ├── Secondary Fallback: Stooq Daily CSV Feed
    └── Offline Safe-Mode: Calibrated GBM with GARCH(1,1) Volatility Clustering
                │
                ▼
[ Feature Engineering Engine ]
    ├── 7-Day & 30-Day Simple Moving Averages (SMA_7, SMA_30)
    ├── 7-Day Rolling Realized Volatility (Annualized Standard Deviation)
    ├── 14-Day Relative Strength Index (Wilder's RSI)
    └── 5-Day Price Momentum & 1-Day Lag Returns
                │
                ▼
[ News Sentiment Analyzer ]
    ├── Real-Time RSS Headlines (Yahoo Finance & Google News Financial RSS)
    └── Financial Sentiment Lexicon Engine (Categorical Polarity & Confidence)
                │
                ▼
[ Multi-Model Forecasting Ensemble ]
    ├── Model A: Gradient-Boosted Decision Trees (GBDT)
    ├── Model B: Autoregressive Ridge Time-Series (L2 Regularized)
    ├── [Optional Flag]: Deep LSTM Sequence Simulator
    └── Blended Ensemble Point Estimate (Inverse-RMSE Variance Weighting)
                │
         ┌──────┴──────────────────────────┐
         ▼                                 ▼
[ 90% Empirical Bootstrap CI ]    [ TreeSHAP Explainability ]
    ├── B=1000 Residual Draws        ├── Exact Additive Decomposition
    ├── Empirical 5th & 95th %ile     ├── Base Expectation E[f(x)]
    └── Skew & Kurtosis Tracking      └── Factor Push ($ and Basis Points)
                │                                 │
                └───────────────┬─────────────────┘
                                ▼
              [ Interactive Real-Time Dashboard ]
                  ├── Multi-Layer Chart with CI Fan
                  ├── Interactive "What-If" Sensitivity Lab
                  ├── Sentiment Lexicon Radar & Headliner Feed
                  └── Model Backtest & Residual Distribution
```

---

## 🔬 Pipeline Stages & Methodologies

### 1. Robust Multi-Source Data Ingestion
- **Primary Source**: Alpha Vantage's official `TIME_SERIES_DAILY` REST API, authenticated via `ALPHAVANTAGE_API_KEY`.
- **Secondary Fallback**: Stooq historical CSV market feed (`https://stooq.com/q/d/l/?s={ticker}.us&i=d`).
- **Offline Safe-Mode**: Calibrated Geometric Brownian Motion (GBM) with a GARCH(1,1) volatility clustering update rule and historical parameter seeds.
- **Source Transparency**: The active data source, record count, and attribution notes are prominently displayed in the UI.

### 2. Feature Engineering
- **Trend**: 7-day Moving Average (SMA_7) and 30-day Moving Average (SMA_30).
- **Spreads**: Normalized distance from trend: `(Close - SMA_7) / SMA_7` and `(Close - SMA_30) / SMA_30`.
- **Volatility**: 7-day rolling annualized standard deviation of log returns: $\sigma_{ann} = \sqrt{252} \cdot \text{std}(\ln(P_t / P_{t-1}))$.
- **Momentum**: 14-day Wilder's Relative Strength Index (RSI) bounded in $[0, 100]$ and 5-day cumulative return percentage.
- **Sentiment**: Daily aggregate score bounded in $[-1.0, 1.0]$.

### 3. Financial News Sentiment (Domain-Specific Lexicon Engine)
- Scrapes live RSS headlines without aggressive bot-blocking hurdles.
- Scores each headline with a hand-built regex/keyword lexicon (weighted financial-domain phrases, e.g. "beats estimates", "raises guidance", "dividend hike" vs "downgrades", "layoffs", "SEC investigation"), inspired by Loughran-McDonald financial-sentiment word lists and FinBERT-style financial NLP research. **This is a rule-based scorer, not an actual pretrained transformer model** — no FinBERT weights are loaded or run.
- Computes headline polarity, confidence intervals, and daily average tone.
- Degrades gracefully to a pre-indexed, clearly-labeled fallback headline set if RSS feeds are unreachable.

### 4. Forecasting Ensemble
- **Gradient-Boosted Decision Trees (GBDT)**: Fits an ensemble of shallow regression trees on negative gradients (residuals) of Mean Squared Error, equipped with shrinkage (learning rate) and subsampling. Captures non-linear feature interactions and threshold effects (e.g., RSI overbought above 70).
- **Statistical Time-Series (Ridge AR)**: Closed-form regularized autoregressive model $(X^T X + \lambda I)^{-1} X^T y$ that anchors long-term mean reversion and trend continuation.
- **Ensemble Blending**: Predictions are weighted inversely proportional to their out-of-fold historical RMSE:
  $$w_i = \frac{1 / \text{RMSE}_i}{\sum_j 1 / \text{RMSE}_j}, \quad \hat{y}_{\text{ensemble}} = \sum_i w_i \hat{y}_i$$

### 5. Why Non-Parametric Bootstrap Confidence Intervals?
Conventional financial tools naively draw fixed symmetric bands assuming a normal distribution ($\pm 1.645\sigma$). In real financial markets:
- Returns and model residuals are **leptokurtic** (fat-tailed) with higher probability of extreme events.
- Residuals exhibit **skewness** (asymmetric downside shocks during market pullbacks).

**Stock Sage's Approach**:
1. Computes historical prediction residuals $e_t = y_t - \hat{y}_t$ over an out-of-sample backtest window.
2. Draws $B = 1000$ bootstrap resamples with replacement: $e^{*(b)} \sim \{e_1, \dots, e_N\}$.
3. Constructs empirical forecast realizations: $\hat{y}^{*(b)} = \hat{y}_{\text{ensemble}} + e^{*(b)}$.
4. Computes the empirical 5th percentile ($P_5$) and 95th percentile ($P_{95}$) directly from the empirical distribution, preserving true market skew and tail risk.

### 6. Why TreeSHAP for Explainability?
Deep neural networks and complex tree models are frequently criticized as "black boxes." Stock Sage implements the **TreeSHAP** (Shapley Additive exPlanations) algorithm:
- Based on cooperative game theory, Shapley values distribute the total gain among players (features) according to their marginal contributions.
- **Efficiency Guarantee**: The sum of feature attributions exactly matches the difference between the model's prediction and the base expected value:
  $$\sum_{i=1}^M \phi_i = f(x) - \mathbb{E}[f(X)]$$
- **Local Consistency**: Features that push the price higher receive positive $\phi_i > 0$ (visualized in green), while restrictive features receive negative $\phi_i < 0$ (visualized in red), with exact dollar impact per share.

### 7. Zero-Latency "What-If" Sensitivity Simulator
Users can adjust the News Sentiment slider (-1.0 to +1.0) or Volatility multiplier (0.5x to 2.5x). Because model weights and tree nodes are pre-compiled and retained in memory, the forecast point estimate, bootstrap confidence intervals, and TreeSHAP waterfall recalculate in $< 1\text{ms}$ without needing expensive model retraining.

---

## 🚀 Running Locally

### Prerequisites
- Node.js 22+
- npm 10+

### Installation & Startup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (optional, fallback provided)
cp .env.example .env
# Add your Alpha Vantage API key to .env:
# ALPHAVANTAGE_API_KEY="YOUR_KEY_HERE"

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🚢 Production Deployment to Google Cloud Run

Stock Sage is packaged as a single, persistent container service with pre-bundled real data for instant cold-starts:

```bash
# 1. Build and test Docker container locally
docker build -t stock-sage .
docker run -p 3000:3000 -e ALPHAVANTAGE_API_KEY="YOUR_KEY" stock-sage

# 2. One-Click Deploy to Google Cloud Run
gcloud run deploy stock-sage \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ALPHAVANTAGE_API_KEY="YOUR_KEY"
```

---

## ⚖️ Research & Educational Disclaimer

**Stock Sage is strictly an educational and quantitative research tool.** Stock market movements over short horizons are stochastic, influenced by non-public information, liquidity dynamics, and macroeconomic variables not captured in public RSS feeds or technical indicators. No output of this platform constitutes financial, investment, or trading advice.
