import { FraudPredictionResult } from '../ml/types';

interface FeatureContributionPanelProps {
  result: FraudPredictionResult | null;
  isLoading: boolean;
}

export function FeatureContributionPanel({ result, isLoading }: FeatureContributionPanelProps) {
  if (isLoading || !result) {
    return (
      <div className="h-[260px] animate-pulse rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-52 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-6 w-full rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Feature risk attribution"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Feature Risk Attribution (Leave-One-Out Sensitivity)
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            How each parameter shifts predicted fraud probability relative to a safe nominal transfer
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-red-600" aria-hidden="true" />
            Increases Risk
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
            Neutral / Lower Risk
          </span>
        </div>
      </div>

      <div className="mt-5 divide-y divide-slate-100">
        {result.contributions.slice(0, 6).map((item) => {
          const avgImpactPts = ((item.annImpact + item.rfImpact) / 2) * 100;
          const absWidth = Math.min(100, Math.abs(avgImpactPts) * 1.4);
          const isPositive = avgImpactPts > 0.5;
          const isNegative = avgImpactPts < -0.5;

          return (
            <div
              key={item.feature}
              className="grid grid-cols-12 items-center gap-3 py-2.5 text-xs"
            >
              <div className="col-span-5 sm:col-span-4">
                <div className="font-medium text-slate-900">{item.label}</div>
                <div className="font-mono text-[11px] text-slate-500">{item.valueDisplay}</div>
              </div>

              <div className="col-span-4 sm:col-span-5">
                <div className="relative flex h-3 items-center rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      isPositive
                        ? 'bg-red-500'
                        : isNegative
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.max(4, absWidth)}%` }}
                  />
                </div>
              </div>

              <div className="col-span-3 text-right font-mono text-[11px] font-semibold tabular-nums">
                <span
                  className={
                    isPositive
                      ? 'text-red-700'
                      : isNegative
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }
                >
                  {avgImpactPts > 0 ? '+' : ''}
                  {avgImpactPts.toFixed(1)} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
