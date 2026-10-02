import React, { useState } from 'react';
import { PriceAlert } from '../types/index.ts';
import {
  Bell,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Volume2,
  Info,
} from 'lucide-react';
import { playAlertChime, requestNotificationPermission } from '../utils/alerts.ts';

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  currentPrice: number;
  forecastPrice: number;
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isTriggered'>) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
}

export const PriceAlertModal: React.FC<PriceAlertModalProps> = ({
  isOpen,
  onClose,
  ticker,
  currentPrice,
  forecastPrice,
  alerts,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
}) => {
  const [targetPrice, setTargetPrice] = useState<string>(
    (Math.round(currentPrice * 1.015 * 100) / 100).toFixed(2)
  );
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [alertType, setAlertType] = useState<'real' | 'forecast' | 'both'>('both');
  const [note, setNote] = useState('');
  const [desktopPermitted, setDesktopPermitted] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(targetPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) return;

    onAddAlert({
      ticker: ticker.toUpperCase(),
      targetPrice: parsedPrice,
      condition,
      alertType,
      note: note.trim() || undefined,
      isActive: true,
    });

    playAlertChime();
    setNote('');
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setDesktopPermitted(granted);
    if (granted) playAlertChime();
  };

  const applyPreset = (pctDelta: number) => {
    const newPrice = Math.round(currentPrice * (1 + pctDelta / 100) * 100) / 100;
    setTargetPrice(newPrice.toFixed(2));
    setCondition(pctDelta >= 0 ? 'above' : 'below');
  };

  const applyForecastPreset = () => {
    setTargetPrice(forecastPrice.toFixed(2));
    setCondition(forecastPrice >= currentPrice ? 'above' : 'below');
    setAlertType('forecast');
  };

  const currentTickerAlerts = alerts.filter(a => a.ticker.toUpperCase() === ticker.toUpperCase());
  const otherTickerAlerts = alerts.filter(a => a.ticker.toUpperCase() !== ticker.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#E8E3DA] rounded-2xl shadow-2xl overflow-hidden text-stone-900 max-h-[90vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-[#E8E3DA] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 tracking-tight">
                Price Target Alerts — {ticker}
              </h3>
              <p className="text-xs text-stone-500">
                Trigger real-time notifications on market prices and What-If forecast models.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Market Price Context Strip */}
          <div className="p-3 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-500 block">Current Settled Close</span>
              <span className="text-sm font-bold font-mono tabular-nums text-stone-900">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-stone-500 block">Day T+1 Forecast</span>
              <span className="text-sm font-bold font-mono tabular-nums text-emerald-700">
                ${forecastPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* New Alert Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-stone-800">
                  Target Price ($ USD)
                </label>
                {/* Presets */}
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => applyPreset(1.5)}
                    className="px-2 py-0.5 bg-[#F5F2EB] hover:bg-[#E8E3DA] rounded text-stone-700 font-mono cursor-pointer"
                  >
                    +1.5%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(3.0)}
                    className="px-2 py-0.5 bg-[#F5F2EB] hover:bg-[#E8E3DA] rounded text-stone-700 font-mono cursor-pointer"
                  >
                    +3.0%
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(-2.0)}
                    className="px-2 py-0.5 bg-[#F5F2EB] hover:bg-[#E8E3DA] rounded text-stone-700 font-mono cursor-pointer"
                  >
                    -2.0%
                  </button>
                  <button
                    type="button"
                    onClick={applyForecastPreset}
                    className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-medium cursor-pointer"
                  >
                    Forecast
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full pl-7 pr-4 py-2 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl text-stone-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Condition Selection */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-800">
                Trigger Condition
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('above')}
                  className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    condition === 'above'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold'
                      : 'bg-[#FAF8F5] border-[#E8E3DA] text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Crosses Above (≥ Target)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('below')}
                  className={`p-2 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    condition === 'below'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 font-bold'
                      : 'bg-[#FAF8F5] border-[#E8E3DA] text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>Crosses Below (≤ Target)</span>
                </button>
              </div>
            </div>

            {/* Evaluation Scope */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-800">
                Evaluate Against
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAlertType('both')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors cursor-pointer ${
                    alertType === 'both'
                      ? 'bg-amber-50 border-amber-400 text-amber-800 font-bold'
                      : 'bg-[#FAF8F5] border-[#E8E3DA] text-stone-600'
                  }`}
                >
                  Market or Forecast
                </button>
                <button
                  type="button"
                  onClick={() => setAlertType('real')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors cursor-pointer ${
                    alertType === 'real'
                      ? 'bg-amber-50 border-amber-400 text-amber-800 font-bold'
                      : 'bg-[#FAF8F5] border-[#E8E3DA] text-stone-600'
                  }`}
                >
                  Live Market Price
                </button>
                <button
                  type="button"
                  onClick={() => setAlertType('forecast')}
                  className={`py-1.5 px-2 rounded-lg border text-center transition-colors cursor-pointer ${
                    alertType === 'forecast'
                      ? 'bg-amber-50 border-amber-400 text-amber-800 font-bold'
                      : 'bg-[#FAF8F5] border-[#E8E3DA] text-stone-600'
                  }`}
                >
                  What-If Forecast
                </button>
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <label className="font-semibold text-stone-800">
                Alert Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Resistance breakout, take profit, buy dip"
                className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Set Price Alert for {ticker}
            </button>
          </form>

          {/* Desktop Notification Banner */}
          {!desktopPermitted && typeof window !== 'undefined' && 'Notification' in window && (
            <div className="p-3 bg-[#FAF8F5] border border-[#E8E3DA] rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-stone-600">
                <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Enable audio and desktop push alerts</span>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-2.5 py-1 bg-stone-900 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                Allow
              </button>
            </div>
          )}

          {/* Active Alerts List */}
          <div className="space-y-2 pt-2 border-t border-[#E8E3DA]">
            <div className="flex items-center justify-between font-semibold text-stone-800">
              <span>Active Target Alerts ({currentTickerAlerts.length})</span>
              <span className="text-[11px] text-stone-500 font-normal">Browser Persistent</span>
            </div>

            {currentTickerAlerts.length === 0 ? (
              <div className="text-center py-4 text-stone-500 border border-dashed border-[#E8E3DA] rounded-xl">
                No active price alerts set for {ticker}. Set your first threshold above!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {currentTickerAlerts.map((alt) => {
                  const isAbove = alt.condition === 'above';
                  return (
                    <div
                      key={alt.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        alt.isTriggered
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : alt.isActive
                          ? 'bg-[#FAF8F5] border-[#E8E3DA]'
                          : 'bg-stone-50 border-stone-200 opacity-60'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-mono font-bold">
                          <span className={isAbove ? 'text-emerald-700' : 'text-rose-700'}>
                            {isAbove ? '≥' : '≤'} ${alt.targetPrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-sans font-normal text-stone-500">
                            ({alt.alertType})
                          </span>
                          {alt.isTriggered && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Triggered @ ${alt.triggeredPrice?.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {alt.note && (
                          <div className="text-[11px] text-stone-600 italic">
                            "{alt.note}"
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleAlert(alt.id)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer ${
                            alt.isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {alt.isActive ? 'Active' : 'Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAlert(alt.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other tickers notice */}
            {otherTickerAlerts.length > 0 && (
              <div className="text-[11px] text-stone-500 pt-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                <span>
                  {otherTickerAlerts.length} other alert(s) saved for {otherTickerAlerts.map(a => a.ticker).join(', ')}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
