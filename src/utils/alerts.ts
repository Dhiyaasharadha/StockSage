import { PriceAlert } from '../types/index.ts';

const ALERTS_STORAGE_KEY = 'stock_sage_price_alerts_v1';

/**
 * Synthesizes a crisp, elegant two-tone financial notification chime
 * using the browser's native Web Audio API (zero external assets required).
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    // Tone 1: High E6 (1318 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.5, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tone 2: A6 (1760 Hz) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760.0, now + 0.08);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.65);
  } catch {
    // Audio context may be restricted by autoplay policy; silent fail
  }
}

/**
 * Requests browser permission for desktop Notifications API if supported.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
  }
  return false;
}

/**
 * Triggers a desktop notification if browser permission is granted.
 */
export function sendDesktopNotification(title: string, body: string): void {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    }
  } catch {
    // Ignore notification failures in sandboxed iframes
  }
}

/**
 * Loads price alerts from browser LocalStorage.
 */
export function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Local storage unavailable
  }
  return [];
}

/**
 * Persists price alerts into browser LocalStorage.
 */
export function saveAlerts(alerts: PriceAlert[]): void {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Local storage unavailable
  }
}

/**
 * Evaluates active alerts against current prices and returns updated alerts along with triggered ones.
 */
export function evaluatePriceAlerts(
  alerts: PriceAlert[],
  ticker: string,
  realPrice: number,
  forecastPrice: number
): { updatedAlerts: PriceAlert[]; newlyTriggered: Array<{ alert: PriceAlert; priceMatched: number; targetKind: string }> } {
  const newlyTriggered: Array<{ alert: PriceAlert; priceMatched: number; targetKind: string }> = [];

  const updatedAlerts = alerts.map((alert) => {
    if (!alert.isActive || alert.isTriggered || alert.ticker.toUpperCase() !== ticker.toUpperCase()) {
      return alert;
    }

    let isHit = false;
    let priceMatched = 0;
    let targetKind = '';

    // Check Real Settled Price
    if (alert.alertType === 'real' || alert.alertType === 'both') {
      if (alert.condition === 'above' && realPrice >= alert.targetPrice) {
        isHit = true;
        priceMatched = realPrice;
        targetKind = 'Market Price';
      } else if (alert.condition === 'below' && realPrice <= alert.targetPrice) {
        isHit = true;
        priceMatched = realPrice;
        targetKind = 'Market Price';
      }
    }

    // Check Forecast Price (including What-If adjustments)
    if (!isHit && (alert.alertType === 'forecast' || alert.alertType === 'both')) {
      if (alert.condition === 'above' && forecastPrice >= alert.targetPrice) {
        isHit = true;
        priceMatched = forecastPrice;
        targetKind = 'Forecast Target';
      } else if (alert.condition === 'below' && forecastPrice <= alert.targetPrice) {
        isHit = true;
        priceMatched = forecastPrice;
        targetKind = 'Forecast Target';
      }
    }

    if (isHit) {
      const triggeredAlert: PriceAlert = {
        ...alert,
        isTriggered: true,
        triggeredAt: Date.now(),
        triggeredPrice: priceMatched,
      };
      newlyTriggered.push({ alert: triggeredAlert, priceMatched, targetKind });
      return triggeredAlert;
    }

    return alert;
  });

  return { updatedAlerts, newlyTriggered };
}
