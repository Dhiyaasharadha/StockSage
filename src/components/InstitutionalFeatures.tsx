import React from 'react';
import { Database, ShieldAlert, Cpu } from 'lucide-react';

export const InstitutionalFeatures: React.FC = () => {
  const cards = [
    {
      title: 'Real-Time Ingestion & Continuous Calibration',
      subtitle: 'Official Alpha Vantage Daily API',
      description:
        'Continuous high-integrity market feed syncing daily OHLCV bars from 2015 to the current session, pre-cleaned against corporate actions and split revisions.',
      imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
      tag: 'Data Pipeline',
      icon: Database,
      tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      title: 'Non-Parametric Tail-Risk Estimation',
      subtitle: 'Bootstrap Residual Resampling (B=1,000)',
      description:
        'Avoids Gaussian assumptions by drawing 1,000 bootstrap replicates from empirical historical prediction errors, accurately pricing real-world kurtosis and skewness.',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
      tag: 'Risk Architecture',
      icon: ShieldAlert,
      tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      title: 'Auditable Feature Attribution Engine',
      subtitle: 'Exact TreeSHAP Shapley Values',
      description:
        'Meets the Shapley efficiency axiom to calculate the exact dollar contribution of RSI, momentum, moving average spreads, and FinBERT headline sentiment.',
      imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
      tag: 'Explainable AI',
      icon: Cpu,
      tagColor: 'bg-blue-50 text-blue-800 border-blue-200',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-stone-900 uppercase tracking-wider text-[11px]">
            Quantitative Infrastructure & Explainability Architecture
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Production algorithms engineered for auditable price discovery and statistical robustness.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white border border-[#E8E3DA] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Picture thumbnail */}
              <div className="relative h-44 overflow-hidden bg-stone-100">
                <img
                  src={c.imageUrl}
                  alt={c.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.tagColor} flex items-center gap-1 backdrop-blur-xs`}
                >
                  <Icon className="w-3 h-3" />
                  {c.tag}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm leading-snug group-hover:text-emerald-700 transition-colors">
                    {c.title}
                  </h3>
                  <div className="text-[11px] font-medium text-stone-500 mt-0.5 font-mono">
                    {c.subtitle}
                  </div>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
