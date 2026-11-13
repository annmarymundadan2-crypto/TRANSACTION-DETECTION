import React from 'react';
import {
  Activity,
  Clock,
  Fingerprint,
  MapPin,
  Minus,
  Play,
  Plus,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { PRESET_SCENARIOS } from '../ml/fraudModels';
import { ScenarioPreset, TransactionInput, TransactionType } from '../ml/types';

interface TransactionFormProps {
  value: TransactionInput;
  activePresetId: string | null;
  hasUnanalyzedChanges: boolean;
  isReady: boolean;
  onChange: (next: TransactionInput) => void;
  onSelectPreset: (preset: ScenarioPreset) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const TX_TYPES: TransactionType[] = ['UPI', 'P2P', 'P2M'];

function getHourPeriodLabel(hour: number): string {
  if (hour >= 0 && hour <= 5) return 'Late Night Risk Window';
  if (hour >= 6 && hour <= 11) return 'Morning Hours';
  if (hour >= 12 && hour <= 17) return 'Business Afternoon';
  if (hour >= 18 && hour <= 21) return 'Evening Peak';
  return 'Late Night Window';
}

export function TransactionForm({
  value,
  activePresetId,
  hasUnanalyzedChanges,
  isReady,
  onChange,
  onSelectPreset,
  onSubmit,
}: TransactionFormProps) {
  const updateField = <K extends keyof TransactionInput>(
    field: K,
    fieldVal: TransactionInput[K]
  ) => {
    onChange({ ...value, [field]: fieldVal });
  };

  return (
    <section
      aria-label="Transaction parameter controls"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      {/* Quick-Fill Scenario Presets */}
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900">Quick-Fill Scenarios</h2>
          <span className="text-xs text-slate-500">Click to populate &amp; evaluate</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {PRESET_SCENARIOS.map((preset) => {
            const isActive = activePresetId === preset.id;
            const toneDot =
              preset.tag === 'Fraud'
                ? 'text-red-600'
                : preset.tag === 'Elevated'
                ? 'text-amber-600'
                : 'text-emerald-600';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                disabled={!isReady}
                title={preset.description}
                className={`flex min-h-[44px] cursor-pointer flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50 ${
                  isActive
                    ? 'border-blue-700 bg-blue-50/70 text-slate-950'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                }`}
              >
                <span className="w-full truncate text-xs font-semibold text-slate-900">
                  {preset.label}
                </span>
                <span className={`mt-0.5 text-[11px] font-medium ${toneDot}`}>
                  {preset.tag} · ₹{preset.input.amount.toLocaleString('en-IN')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="my-6 border-slate-100" />

      {/* Interactive Parameter Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Amount */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="tx-amount" className="text-sm font-medium text-slate-800">
              Transaction Amount (INR)
            </label>
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
              ₹{value.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative w-36 shrink-0">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-slate-500">
                ₹
              </span>
              <input
                id="tx-amount"
                type="number"
                min={1}
                max={500000}
                step="0.01"
                value={value.amount}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  updateField('amount', Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
                }}
                className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white pr-3 pl-7 font-mono text-sm font-medium tabular-nums text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>
            <input
              aria-label="Transaction amount slider"
              type="range"
              min={50}
              max={50000}
              step={50}
              value={Math.min(50000, value.amount)}
              onChange={(e) => updateField('amount', Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-blue-700"
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>₹50</span>
            <span>₹10,000 threshold</span>
            <span>₹50,000+</span>
          </div>
        </div>

        {/* Transaction Type */}
        <div>
          <span className="block text-sm font-medium text-slate-800">Transaction Type</span>
          <div
            role="group"
            aria-label="Transaction type"
            className="mt-2 grid grid-cols-3 gap-1.5 rounded-lg bg-slate-100 p-1"
          >
            {TX_TYPES.map((type) => {
              const selected = value.transaction_type === type;
              const desc = type === 'UPI' ? 'UPI ID' : type === 'P2P' ? 'Peer-to-Peer' : 'Merchant';
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateField('transaction_type', type)}
                  className={`flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-blue-700 ${
                    selected
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{type}</span>
                  <span className="hidden font-normal text-slate-400 sm:inline">· {desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hour of Day */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="tx-hour" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <Clock className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Transaction Hour (24h)</span>
            </label>
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
              {String(value.hour).padStart(2, '0')}:00 · {getHourPeriodLabel(value.hour)}
            </span>
          </div>
          <input
            id="tx-hour"
            type="range"
            min={0}
            max={23}
            step={1}
            value={value.hour}
            onChange={(e) => updateField('hour', Number(e.target.value))}
            className="mt-2.5 h-2 w-full cursor-pointer accent-blue-700"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Daily Transactions & Failed Attempts Steppers */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <Activity className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Daily Transactions</span>
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                {value.daily_transactions}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Decrease daily transactions"
                onClick={() => updateField('daily_transactions', Math.max(1, value.daily_transactions - 1))}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <input
                aria-label="Daily transactions slider"
                type="range"
                min={1}
                max={20}
                value={Math.min(20, value.daily_transactions)}
                onChange={(e) => updateField('daily_transactions', Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-blue-700"
              />
              <button
                type="button"
                aria-label="Increase daily transactions"
                onClick={() => updateField('daily_transactions', Math.min(30, value.daily_transactions + 1))}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <ShieldAlert className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span>Failed PIN Attempts</span>
              </span>
              <span
                className={`font-mono text-sm font-semibold tabular-nums ${
                  value.failed_attempts >= 2 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {value.failed_attempts}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-6 gap-1">
              {[0, 1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => updateField('failed_attempts', num)}
                  className={`min-h-[40px] cursor-pointer rounded-md font-mono text-xs font-semibold tabular-nums transition-colors ${
                    value.failed_attempts === num
                      ? num >= 2
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Binary Security Flags */}
        <div>
          <span className="block text-sm font-medium text-slate-800">Security &amp; Trust Flags</span>
          <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {/* Location Match */}
            <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Location Match</div>
                  <div className="text-[11px] text-slate-500">
                    {value.location_match === 1 ? 'IP / GPS aligns with home region' : 'Unusual geographic origin'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 rounded-md bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => updateField('location_match', 1)}
                  className={`min-h-[34px] cursor-pointer rounded px-2.5 text-xs font-semibold transition-colors ${
                    value.location_match === 1
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Match (1)
                </button>
                <button
                  type="button"
                  onClick={() => updateField('location_match', 0)}
                  className={`min-h-[34px] cursor-pointer rounded px-2.5 text-xs font-semibold transition-colors ${
                    value.location_match === 0
                      ? 'bg-white text-red-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mismatch (0)
                </button>
              </div>
            </div>

            {/* Device Match */}
            <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <Fingerprint className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">Device Match</div>
                  <div className="text-[11px] text-slate-500">
                    {value.device_match === 1 ? 'Registered primary UPI handset' : 'New or unrecognized device ID'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 rounded-md bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => updateField('device_match', 1)}
                  className={`min-h-[34px] cursor-pointer rounded px-2.5 text-xs font-semibold transition-colors ${
                    value.device_match === 1
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Trusted (1)
                </button>
                <button
                  type="button"
                  onClick={() => updateField('device_match', 0)}
                  className={`min-h-[34px] cursor-pointer rounded px-2.5 text-xs font-semibold transition-colors ${
                    value.device_match === 0
                      ? 'bg-white text-red-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unknown (0)
                </button>
              </div>
            </div>

            {/* New Beneficiary */}
            <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <UserPlus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">New Beneficiary</div>
                  <div className="text-[11px] text-slate-500">
                    {value.new_beneficiary === 1 ? 'First-time payee address' : 'Previously verified recipient'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 rounded-md bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => updateField('new_beneficiary', 0)}
                  className={`min-h-[34px] cursor-pointer rounded px-2.5 text-xs font-semibold transition-colors ${
                    value.new_beneficiary === 0
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Saved (0)
                </button>
                <button
                  type="button"
                  onClick={() => updateField('new_beneficiary', 1)}
                  className={`min-h-[34px] cursor-pointer rounded px-2.5 text-xs font-semibold transition-colors ${
                    value.new_beneficiary === 1
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  New (1)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit CTA */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!isReady}
            className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>Analyze Transaction</span>
          </button>
          {hasUnanalyzedChanges && (
            <p className="mt-2 text-center text-xs font-medium text-amber-700">
              Parameters modified — click Analyze Transaction to update model predictions.
            </p>
          )}
        </div>
      </form>
    </section>
  );
}
