import { AlertTriangle, BrainCircuit, CheckCircle2, ShieldAlert, Trees } from 'lucide-react';
import { FraudPredictionResult, ModelMetrics, RiskLevel } from '../ml/types';

interface ModelComparisonCardsProps {
  result: FraudPredictionResult | null;
  annMetrics: ModelMetrics | null;
  rfMetrics: ModelMetrics | null;
  isLoading: boolean;
}

function RiskBadge({ level, isFraud }: { level: RiskLevel; isFraud: boolean }) {
  if (level === 'CRITICAL' || level === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
        <ShieldAlert className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
        <span>{level} RISK · {isFraud ? 'FRAUD' : 'NORMAL'}</span>
      </span>
    );
  }
  if (level === 'MODERATE') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
        <span>MODERATE RISK · {isFraud ? 'FRAUD' : 'NORMAL'}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      <span>LOW RISK · NORMAL</span>
    </span>
  );
}

function ProbabilityMeter({ probability, isFraud }: { probability: number; isFraud: boolean }) {
  const pct = Math.min(100, Math.max(0, probability * 100));
  const fillClass = isFraud ? 'bg-red-600' : pct >= 30 ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <div className="mt-4">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-200 ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
        {/* 50% Decision Threshold Marker */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-slate-900/50"
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
        <span>0% Safe</span>
        <span className="font-medium text-slate-700">50% Cutoff</span>
        <span>100% Fraud</span>
      </div>
    </div>
  );
}

export function ModelComparisonCards({
  result,
  annMetrics,
  rfMetrics,
  isLoading,
}: ModelComparisonCardsProps) {
  if (isLoading || !result || !annMetrics || !rfMetrics) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="h-[310px] animate-pulse rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="h-5 w-44 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-64 rounded bg-slate-100" />
            <div className="mt-8 h-10 w-28 rounded bg-slate-200" />
            <div className="mt-6 h-3 w-full rounded bg-slate-100" />
            <div className="mt-8 h-20 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  const annPct = (result.ann.probability * 100).toFixed(2);
  const rfPct = (result.rf.probability * 100).toFixed(2);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Artificial Neural Network Card */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <BrainCircuit className="h-4 w-4 text-blue-700" aria-hidden="true" />
                <span>Artificial Neural Network</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Dense 16 → 8 → 1 · StandardScaler · Sigmoid
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Model Accuracy</div>
              <div className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                {annMetrics.testAccuracy.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500">Fraud Probability</div>
              <div
                className={`mt-0.5 font-mono text-4xl font-bold tracking-tight tabular-nums ${
                  result.ann.isFraud ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {annPct}%
              </div>
            </div>
            <RiskBadge level={result.ann.riskLevel} isFraud={result.ann.isFraud} />
          </div>

          <ProbabilityMeter probability={result.ann.probability} isFraud={result.ann.isFraud} />
        </div>

        {/* Network Topology & Output Summary */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Architecture</span>
            <span className="font-mono text-[11px] font-medium text-slate-800">
              9 → 16 (ReLU) → 8 (ReLU) → 1
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
            <span>Signal Margin</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-slate-800">
              {result.ann.confidenceLabel} ({(Math.abs(result.ann.probability - 0.5) * 100).toFixed(1)} pts)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
            <span>Notebook Baseline</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-slate-800">
              {annMetrics.notebookReportedAccuracy.toFixed(2)}% Test Acc
            </span>
          </div>
        </div>
      </article>

      {/* Random Forest Card */}
      <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Trees className="h-4 w-4 text-blue-700" aria-hidden="true" />
                <span>Random Forest Classifier</span>
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                100 Decision Trees · Gini Impurity · Bootstrap
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Model Accuracy</div>
              <div className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                {rfMetrics.testAccuracy.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500">Fraud Probability</div>
              <div
                className={`mt-0.5 font-mono text-4xl font-bold tracking-tight tabular-nums ${
                  result.rf.isFraud ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {rfPct}%
              </div>
            </div>
            <RiskBadge level={result.rf.riskLevel} isFraud={result.rf.isFraud} />
          </div>

          <ProbabilityMeter probability={result.rf.probability} isFraud={result.rf.isFraud} />
        </div>

        {/* 100-Tree Consensus Matrix */}
        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Ensemble Tree Votes</span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-900">
              {result.rf.fraudTreeVotes} Fraud / {result.rf.totalTrees - result.rf.fraudTreeVotes} Normal
            </span>
          </div>
          <div
            className="mt-2.5 grid grid-cols-20 gap-1"
            aria-label={`${result.rf.fraudTreeVotes} of 100 decision trees voted Fraud`}
          >
            {Array.from({ length: result.rf.totalTrees }, (_, idx) => {
              const votedFraud = idx < result.rf.fraudTreeVotes;
              return (
                <span
                  key={idx}
                  className={`h-2 w-full rounded-[2px] ${
                    votedFraud ? 'bg-red-500' : 'bg-emerald-500/80'
                  }`}
                />
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
            <span>Notebook Baseline</span>
            <span className="font-mono text-[11px] font-medium tabular-nums text-slate-800">
              {rfMetrics.notebookReportedAccuracy.toFixed(2)}% Test Acc
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
