import React from 'react';
import { PriceAlert } from '../types/index.ts';
import { BellRing, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface AlertNotificationItem {
  id: string;
  alert: PriceAlert;
  priceMatched: number;
  targetKind: string;
  timestamp: number;
}

interface AlertToastProps {
  notifications: AlertNotificationItem[];
  onDismiss: (id: string) => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-auto">
      {notifications.map((item) => {
        const isAbove = item.alert.condition === 'above';
        return (
          <div
            key={item.id}
            className="p-4 bg-white/98 border-2 border-amber-500 rounded-2xl shadow-xl backdrop-blur-md text-stone-900 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300 ring-4 ring-amber-500/10"
          >
            <div className="p-2 bg-amber-500 text-stone-950 rounded-xl shrink-0">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>

            <div className="flex-1 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm tracking-tight text-stone-900 flex items-center gap-1.5">
                  <span>{item.alert.ticker}</span>
                  <span className="text-amber-700 font-mono text-xs font-bold">
                    Target Triggered!
                  </span>
                </span>
                <button
                  onClick={() => onDismiss(item.id)}
                  className="text-stone-400 hover:text-stone-700 transition-colors p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 font-mono font-bold text-stone-800">
                <span className="flex items-center text-emerald-700">
                  {isAbove ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                  ${item.priceMatched.toFixed(2)}
                </span>
                <span className="text-stone-500 font-sans font-normal">
                  {isAbove ? '≥' : '≤'} target ${item.alert.targetPrice.toFixed(2)} ({item.targetKind})
                </span>
              </div>

              {item.alert.note && (
                <p className="text-[11px] text-stone-500 italic">
                  "{item.alert.note}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
