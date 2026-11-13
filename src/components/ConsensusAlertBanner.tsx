import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { FraudPredictionResult } from '../ml/types';

interface ConsensusAlertBannerProps {
  result: FraudPredictionResult | null;
  isLoading: boolean;
}

export function ConsensusAlertBanner({ result, isLoading }: ConsensusAlertBannerProps) {
  if (isLoading || !result) {
    return (
      <div className="h-[92px] animate-pulse rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-4 w-56 rounded bg-slate-200" />
        <div className="mt-3 h-3 w-80 rounded bg-slate-100" />
      </div>
    );
  }

  const avgProb = ((result.ann.probability + result.rf.probability) / 2) * 100;

  if (result.consensus === 'FRAUD') {
    return (
      <div
        role="alert"
        className="flex flex-col justify-between gap-4 rounded-xl border border-red-200 bg-red-50/90 px-5 py-4 sm:flex-row sm:items-center"
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-red-950">
                FRAUD ALERT — Transaction Flagged by Both Models
              </h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-red-900">
              Both the Artificial Neural Network and Random Forest classifier crossed the 50% fraud
              threshold. Hold settlement and require step-up biometric or OTP verification.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-[11px] font-medium text-red-800">Ensemble Mean Risk</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-red-700">
            {avgProb.toFixed(1)}%
          </div>
          <div className="font-mono text-[11px] tabular-nums text-red-800">
            {result.id} · {result.inferenceTimeMs} ms
          </div>
        </div>
      </div>
    );
  }

  if (result.consensus === 'DIVERGENT') {
    return (
      <div
        role="alert"
        className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/90 px-5 py-4 sm:flex-row sm:items-center"
      >
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-amber-950">
              ELEVATED RISK — Model Divergence Detected
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              The ANN and Random Forest models produced opposing classifications. Route this
              ₹{result.input.amount.toLocaleString('en-IN')} {result.input.transaction_type} transfer
              to secondary compliance review before clearing.
            </p>
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <div className="text-[11px] font-medium text-amber-800">Ensemble Mean Risk</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-amber-700">
            {avgProb.toFixed(1)}%
          </div>
          <div className="font-mono text-[11px] tabular-nums text-amber-800">
            {result.id} · {result.inferenceTimeMs} ms
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-5 py-4 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-emerald-950">
            NORMAL TRANSACTION — Cleared by Both Models
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-emerald-900">
            Risk signals remain well below the 50% fraud boundary across both models. Transaction is
            cleared for standard instant UPI settlement.
          </p>
        </div>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <div className="text-[11px] font-medium text-emerald-800">Ensemble Mean Risk</div>
        <div className="font-mono text-2xl font-bold tabular-nums text-emerald-700">
          {avgProb.toFixed(1)}%
        </div>
        <div className="font-mono text-[11px] tabular-nums text-emerald-800">
          {result.id} · {result.inferenceTimeMs} ms
        </div>
      </div>
    </div>
  );
}
