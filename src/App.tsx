import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopNav } from './components/TopNav.tsx';
import { ProductHero } from './components/ProductHero.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { ForecastChart } from './components/ForecastChart.tsx';
import { ShapAttributionCard } from './components/ShapAttributionCard.tsx';
import { WhatIfSimulator } from './components/WhatIfSimulator.tsx';
import { SentimentGaugeCard } from './components/SentimentGaugeCard.tsx';
import { ModelDiagnosticsCard } from './components/ModelDiagnosticsCard.tsx';
import { ResearchDisclaimer } from './components/ResearchDisclaimer.tsx';
import { PriceAlertModal } from './components/PriceAlertModal.tsx';
import { AlertToast } from './components/AlertToast.tsx';
import { generatePrebundledAAPL } from './pipeline/prebundled.ts';
import {
  ForecastResult,
  OHLCV,
  TechnicalFeaturePoint,
  ShapAttribution,
  BootstrapConfidenceInterval,
  PriceAlert,
} from './types/index.ts';
import {
  loadAlerts,
  saveAlerts,
  evaluatePriceAlerts,
  playAlertChime,
  sendDesktopNotification,
} from './utils/alerts.ts';

interface NotificationToastItem {
  id: string;
  alert: PriceAlert;
  priceMatched: number;
  targetKind: string;
  timestamp: number;
}

export default function App() {
  // Pre-bundled state loaded immediately on first render for instant cold-start
  const initialData = generatePrebundledAAPL();

  const [currentTicker, setCurrentTicker] = useState<string>('AAPL');
  const [forecast, setForecast] = useState<ForecastResult>(initialData.forecast);
  const [history, setHistory] = useState<OHLCV[]>(initialData.history);
  const [features, setFeatures] = useState<TechnicalFeaturePoint[]>(initialData.features);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('overview');

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadAlerts());
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeNotifications, setActiveNotifications] = useState<NotificationToastItem[]>([]);

  // What-If scenario states
  const [sentimentOverride, setSentimentOverride] = useState<number>(initialData.forecast.sentiment.dailyAverage);
  const [volatilityMultiplier, setVolatilityMultiplier] = useState<number>(1.0);
  const [priceShockPercent, setPriceShockPercent] = useState<number>(0.0);

  // What-If computed outputs
  const [whatIfEnsemblePrice, setWhatIfEnsemblePrice] = useState<number | undefined>(undefined);
  const [whatIfReturnPercent, setWhatIfReturnPercent] = useState<number | undefined>(undefined);
  const [whatIfShapAttributions, setWhatIfShapAttributions] = useState<ShapAttribution[] | undefined>(undefined);
  const [whatIfConfidenceInterval, setWhatIfConfidenceInterval] = useState<BootstrapConfidenceInterval | undefined>(undefined);

  // Remove dark class from document element to guarantee Ivory & White theme
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Load ticker data from server API or fallback
  const fetchTickerData = useCallback(async (ticker: string) => {
    setIsLoading(true);
    const cleanTicker = ticker.toUpperCase().trim();

    try {
      const res = await fetch(`/api/stock/${encodeURIComponent(cleanTicker)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setForecast(json.data);
          setHistory(json.history);
          setFeatures(json.features);
          setCurrentTicker(cleanTicker);

          // Reset What-If scenario to new ticker's baseline
          setSentimentOverride(json.data.sentiment.dailyAverage);
          setVolatilityMultiplier(1.0);
          setPriceShockPercent(0.0);
          setWhatIfEnsemblePrice(undefined);
          setWhatIfReturnPercent(undefined);
          setWhatIfShapAttributions(undefined);
          setWhatIfConfidenceInterval(undefined);
          return;
        }
      }
    } catch (err) {
      console.warn('Network call to backend stock API failed, maintaining active view:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch live market data on initial mount
  useEffect(() => {
    fetchTickerData('AAPL');
  }, [fetchTickerData]);

  // Price alert evaluation effect
  const activeEnsemblePrice = whatIfEnsemblePrice ?? forecast.ensemblePrice;
  useEffect(() => {
    if (!forecast.lastClose || !activeEnsemblePrice) return;

    const { updatedAlerts, newlyTriggered } = evaluatePriceAlerts(
      alerts,
      currentTicker,
      forecast.lastClose,
      activeEnsemblePrice
    );

    if (newlyTriggered.length > 0) {
      setAlerts(updatedAlerts);
      saveAlerts(updatedAlerts);
      playAlertChime();

      const newToastItems: NotificationToastItem[] = newlyTriggered.map((item) => ({
        id: `toast-${item.alert.id}-${Date.now()}`,
        alert: item.alert,
        priceMatched: item.priceMatched,
        targetKind: item.targetKind,
        timestamp: Date.now(),
      }));

      setActiveNotifications((prev) => [...newToastItems, ...prev]);

      // Push browser desktop notification
      for (const item of newlyTriggered) {
        const cond = item.alert.condition === 'above' ? '≥' : '≤';
        sendDesktopNotification(
          `🔔 ${item.alert.ticker} Price Alert Triggered!`,
          `${item.targetKind} reached $${item.priceMatched.toFixed(2)} (${cond} $${item.alert.targetPrice.toFixed(2)})`
        );
      }
    }
  }, [alerts, currentTicker, forecast.lastClose, activeEnsemblePrice]);

  // Alert handlers
  const handleAddAlert = (alertData: Omit<PriceAlert, 'id' | 'createdAt' | 'isTriggered'>) => {
    const newAlert: PriceAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
      isTriggered: false,
    };
    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    saveAlerts(updated);
  };

  const handleToggleAlert = (id: string) => {
    const updated = alerts.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a));
    setAlerts(updated);
    saveAlerts(updated);
  };

  const handleDeleteAlert = (id: string) => {
    const updated = alerts.filter((a) => a.id !== id);
    setAlerts(updated);
    saveAlerts(updated);
  };

  const handleDismissNotification = (id: string) => {
    setActiveNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Active alerts for current ticker
  const activeAlertsForCurrentTicker = useMemo(() => {
    return alerts.filter(
      (a) => a.ticker.toUpperCase() === currentTicker.toUpperCase() && a.isActive
    );
  }, [alerts, currentTicker]);

  // Handler for What-If scenario changes
  const handleWhatIfChange = useCallback(
    async (sentimentVal: number, volMult: number, shockVal: number) => {
      setSentimentOverride(sentimentVal);
      setVolatilityMultiplier(volMult);
      setPriceShockPercent(shockVal);

      // Fast client-side / server what-if computation
      try {
        const res = await fetch('/api/what-if', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: currentTicker,
            sentimentOverride: sentimentVal,
            volatilityMultiplier: volMult,
            priceShockPercent: shockVal,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.whatIfResult) {
            setWhatIfEnsemblePrice(json.whatIfResult.ensemblePrice);
            setWhatIfReturnPercent(json.whatIfResult.ensembleReturnPercent);
            setWhatIfShapAttributions(json.whatIfResult.shapAttributions);
            setWhatIfConfidenceInterval(json.whatIfResult.confidenceInterval);
            return;
          }
        }
      } catch (err) {
        // Fallback: simple mathematical interpolation
      }

      // Local fast approximation if offline
      const baseClose = forecast.lastClose;
      const sentimentDelta = (sentimentVal - forecast.sentiment.dailyAverage) * 1.5;
      const shockDelta = (shockVal / 100) * baseClose;
      const newPrice = Math.round((forecast.ensemblePrice + sentimentDelta + shockDelta) * 100) / 100;
      const newReturn = Math.round(((newPrice - baseClose) / baseClose) * 10000) / 100;

      setWhatIfEnsemblePrice(newPrice);
      setWhatIfReturnPercent(newReturn);

      // Adjust SHAP attribution for sentiment
      const updatedShap = forecast.shapAttributions.map((attr) => {
        if (attr.featureName === 'sentimentScore') {
          const newPhi = Math.round(sentimentVal * 1.8 * 100) / 100;
          return {
            ...attr,
            featureValue: sentimentVal,
            formattedValue: `${sentimentVal > 0 ? '+' : ''}${sentimentVal.toFixed(2)}`,
            attribution: newPhi,
            direction: (newPhi > 0.05 ? 'bullish' : newPhi < -0.05 ? 'bearish' : 'neutral') as 'bullish' | 'bearish' | 'neutral',
          };
        }
        return attr;
      });
      setWhatIfShapAttributions(updatedShap);
    },
    [currentTicker, forecast]
  );

  const resetWhatIf = useCallback(() => {
    setSentimentOverride(forecast.sentiment.dailyAverage);
    setVolatilityMultiplier(1.0);
    setPriceShockPercent(0.0);
    setWhatIfEnsemblePrice(undefined);
    setWhatIfReturnPercent(undefined);
    setWhatIfShapAttributions(undefined);
    setWhatIfConfidenceInterval(undefined);
  }, [forecast]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 selection:bg-emerald-500/20 selection:text-emerald-950 font-sans">
      {/* Toast Alert Notifications */}
      <AlertToast
        notifications={activeNotifications}
        onDismiss={handleDismissNotification}
      />

      {/* Target Price Alert Modal */}
      <PriceAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        ticker={currentTicker}
        currentPrice={forecast.lastClose}
        forecastPrice={activeEnsemblePrice}
        alerts={alerts}
        onAddAlert={handleAddAlert}
        onToggleAlert={handleToggleAlert}
        onDeleteAlert={handleDeleteAlert}
      />

      {/* Top Navigation */}
      <TopNav
        currentTicker={currentTicker}
        onSelectTicker={(t) => fetchTickerData(t)}
        onRefresh={() => fetchTickerData(currentTicker)}
        isLoading={isLoading}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
        activeAlertsCount={activeAlertsForCurrentTicker.length}
      />

      {/* Main Workspace Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Section 0: Product Hero Banner with Pictures & Ivory Styling */}
        <section>
          <ProductHero
            ticker={currentTicker}
            lastClose={forecast.lastClose}
            ensemblePrice={activeEnsemblePrice}
            returnPercent={whatIfReturnPercent ?? forecast.ensembleReturnPercent}
            onOpenAlertModal={() => setIsAlertModalOpen(true)}
            onScrollToWhatIf={() => scrollToSection('whatif')}
          />
        </section>

        {/* Section 1: Overview & KPI Grid */}
        <section id="overview" className="scroll-mt-20">
          <MetricCards
            forecast={forecast}
            whatIfEnsemblePrice={whatIfEnsemblePrice}
            whatIfReturnPercent={whatIfReturnPercent}
          />
        </section>

        {/* Section 2: Interactive Forecast Chart with History vs Confidence Interval Toggle */}
        <section id="chart" className="scroll-mt-20 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-stone-900 uppercase tracking-wider text-[11px]">
              Multi-Year Price History & Day T+1 Forecast Cone
            </h2>
            <span className="text-xs text-stone-500 font-mono">
              Horizon: Next Session ({forecast.forecastDate})
            </span>
          </div>
          <ForecastChart
            history={history}
            features={features}
            forecast={forecast}
            whatIfEnsemblePrice={whatIfEnsemblePrice}
            activeAlerts={activeAlertsForCurrentTicker}
          />
        </section>

        {/* Section 3: Two-Column Section: What-If Sensitivity Simulator + Sentiment Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section id="whatif" className="lg:col-span-6 scroll-mt-20">
            <WhatIfSimulator
              forecast={forecast}
              sentimentOverride={sentimentOverride}
              onSentimentChange={(val) => handleWhatIfChange(val, volatilityMultiplier, priceShockPercent)}
              volatilityMultiplier={volatilityMultiplier}
              onVolatilityChange={(val) => handleWhatIfChange(sentimentOverride, val, priceShockPercent)}
              priceShockPercent={priceShockPercent}
              onPriceShockChange={(val) => handleWhatIfChange(sentimentOverride, volatilityMultiplier, val)}
              onReset={resetWhatIf}
              simulatedPrice={whatIfEnsemblePrice}
              simulatedReturn={whatIfReturnPercent}
            />
          </section>

          <section className="lg:col-span-6">
            <SentimentGaugeCard
              score={sentimentOverride}
              headlines={forecast.sentiment.headlines}
              sourceLabel={forecast.sentiment.sourceLabel}
              bullishCount={forecast.sentiment.bullishCount}
              bearishCount={forecast.sentiment.bearishCount}
              neutralCount={forecast.sentiment.neutralCount}
            />
          </section>
        </div>

        {/* Section 5: Two-Column Section: SHAP Waterfall + Model Diagnostics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section id="shap" className="lg:col-span-6 scroll-mt-20">
            <ShapAttributionCard
              forecast={forecast}
              whatIfShapAttributions={whatIfShapAttributions}
            />
          </section>

          <section id="diagnostics" className="lg:col-span-6 scroll-mt-20">
            <ModelDiagnosticsCard forecast={forecast} />
          </section>
        </div>

        {/* Section 6: Academic Research & Compliance Disclaimer */}
        <section className="pt-2">
          <ResearchDisclaimer />
        </section>
      </main>

      {/* Clean Editorial Footer in Warm Ivory */}
      <footer className="border-t border-[#E8E3DA] py-8 mt-12 bg-[#F5F2EB] text-stone-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-900">Stock Sage</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Ivory & White Quantitative Edition</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-stone-500 font-mono">
            <span>Alpha Vantage Daily REST</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>TreeSHAP Lundberg-Lee</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Non-Parametric Residual Bootstrap (B=1000)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
