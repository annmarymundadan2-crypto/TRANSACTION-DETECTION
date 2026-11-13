import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { FraudPredictionResult } from '../ml/types';

interface EvaluationHistoryTableProps {
  history: FraudPredictionResult[];
  activeResultId: string | null;
  onReloadEntry: (entry: FraudPredictionResult) => void;
}

type FilterMode = 'ALL' | 'FRAUD' | 'DIVERGENT' | 'NORMAL';

export function EvaluationHistoryTable({
  history,
  activeResultId,
  onReloadEntry,
}: EvaluationHistoryTableProps) {
  const [filter, setFilter] = useState<FilterMode>('ALL');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((row) => {
      if (filter !== 'ALL' && row.consensus !== filter) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.input.transaction_type.toLowerCase().includes(q) ||
        String(row.input.amount).includes(q)
      );
    });
  }, [history, filter, query]);

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Timestamp',
      'Amount_INR',
      'Type',
      'Hour',
      'Location_Match',
      'Device_Match',
      'Daily_Tx',
      'Failed_Attempts',
      'New_Beneficiary',
      'ANN_Fraud_Prob_Pct',
      'RF_Fraud_Prob_Pct',
      'Consensus',
    ];
    const lines = history.map((r) =>
      [
        r.id,
        r.timestamp,
        r.input.amount,
        r.input.transaction_type,
        r.input.hour,
        r.input.location_match,
        r.input.device_match,
        r.input.daily_transactions,
        r.input.failed_attempts,
        r.input.new_beneficiary,
        (r.ann.probability * 100).toFixed(2),
        (r.rf.probability * 100).toFixed(2),
        r.consensus,
      ].join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'upi_fraud_evaluation_log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="evaluation-log"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Session Evaluation Log
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {history.length} evaluated {history.length === 1 ? 'transaction' : 'transactions'} · Click
            any row to reload its parameters into the analyzer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'FRAUD', label: 'Fraud' },
                { id: 'DIVERGENT', label: 'Divergent' },
                { id: 'NORMAL', label: 'Normal' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[34px] cursor-pointer rounded-md px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === tab.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter ID or type..."
              aria-label="Filter evaluation log"
              className="min-h-[38px] w-44 rounded-lg border border-slate-200 bg-white pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={history.length === 0}
            className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-slate-700">No matching evaluations found</p>
          <p className="mt-1 text-xs text-slate-500">
            Adjust the filter or submit a new transaction in the analyzer above.
          </p>
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-3 font-medium">Run ID</th>
                <th className="px-3 py-2.5 font-medium">Channel</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="px-3 py-2.5 text-right font-medium">Hour</th>
                <th className="px-3 py-2.5 font-medium">Security Signals</th>
                <th className="px-3 py-2.5 text-right font-medium">ANN Score</th>
                <th className="px-3 py-2.5 text-right font-medium">RF Score</th>
                <th className="pl-3 py-2.5 text-right font-medium">Consensus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const isSelected = row.id === activeResultId;
                const verdictText =
                  row.consensus === 'FRAUD'
                    ? 'FRAUD ALERT'
                    : row.consensus === 'DIVERGENT'
                    ? 'REVIEW'
                    : 'NORMAL';
                const verdictTone =
                  row.consensus === 'FRAUD'
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : row.consensus === 'DIVERGENT'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200';

                return (
                  <tr
                    key={row.id}
                    onClick={() => onReloadEntry(row)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onReloadEntry(row);
                      }
                    }}
                    className={`h-11 cursor-pointer transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="pr-3 font-mono font-medium whitespace-nowrap text-slate-900">
                      {row.id}
                    </td>
                    <td className="px-3 font-medium whitespace-nowrap text-slate-700">
                      {row.input.transaction_type}
                    </td>
                    <td className="px-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums text-slate-900">
                      ₹{row.input.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 text-right font-mono whitespace-nowrap tabular-nums text-slate-600">
                      {String(row.input.hour).padStart(2, '0')}:00
                    </td>
                    <td className="px-3 whitespace-nowrap text-slate-600">
                      {row.input.location_match === 0 ? 'Loc Mismatch' : 'Loc OK'} ·{' '}
                      {row.input.device_match === 0 ? 'New Device' : 'Device OK'} ·{' '}
                      {row.input.failed_attempts} Failed
                    </td>
                    <td
                      className={`px-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums ${
                        row.ann.isFraud ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {(row.ann.probability * 100).toFixed(1)}%
                    </td>
                    <td
                      className={`px-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums ${
                        row.rf.isFraud ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {(row.rf.probability * 100).toFixed(1)}%
                    </td>
                    <td className="pl-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${verdictTone}`}
                      >
                        {verdictText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
