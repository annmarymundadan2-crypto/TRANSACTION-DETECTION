import { ModelMetrics, TrainingEpochPoint } from '../ml/types';

interface ModelAccuracyOverviewProps {
  annMetrics: ModelMetrics | null;
  rfMetrics: ModelMetrics | null;
  epochHistory: TrainingEpochPoint[];
  datasetSummary: {
    totalRows: number;
    trainRows: number;
    testRows: number;
    fraudRate: number;
  } | null;
}

const FEATURE_IMPORTANCE_LABELS = [
  { label: 'Failed PIN Attempts', pct: 26 },
  { label: 'Transaction Amount', pct: 22 },
  { label: 'Device Match Flag', pct: 18 },
  { label: 'Location Match Flag', pct: 14 },
  { label: 'Daily Tx Velocity', pct: 9 },
  { label: 'Transaction Hour', pct: 6 },
  { label: 'New Beneficiary & Channel', pct: 5 },
];

export function ModelAccuracyOverview({
  annMetrics,
  rfMetrics,
  epochHistory,
  datasetSummary,
}: ModelAccuracyOverviewProps) {
  if (!annMetrics || !rfMetrics || !datasetSummary) {
    return (
      <section id="model-accuracy" className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-48 animate-pulse rounded bg-slate-100" />
      </section>
    );
  }

  // Build SVG polyline points for 30-epoch ANN accuracy & loss
  const width = 420;
  const height = 140;
  const padX = 12;
  const padY = 12;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const accPoints = epochHistory
    .map((pt, idx) => {
      const x = padX + (idx / Math.max(1, epochHistory.length - 1)) * innerW;
      const normY = Math.min(1, Math.max(0, (pt.accuracy - 50) / 45));
      const y = padY + (1 - normY) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lossPoints = epochHistory
    .map((pt, idx) => {
      const x = padX + (idx / Math.max(1, epochHistory.length - 1)) * innerW;
      const normY = Math.min(1, Math.max(0, pt.loss / 0.8));
      const y = padY + (1 - normY) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <section id="model-accuracy" className="space-y-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Overall Model Accuracy &amp; Benchmark Overview
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Holdout evaluation across {datasetSummary.testRows.toLocaleString()} test transactions ·{' '}
            {datasetSummary.trainRows.toLocaleString()} training samples · 80/20 split ·{' '}
            {datasetSummary.fraudRate}% fraud prevalence
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Comparative Metrics Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h3 className="text-sm font-semibold text-slate-900">
            Side-by-Side Classification Metrics
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Live TypeScript holdout evaluation paired with original Colab notebook test benchmarks
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Evaluation Metric</th>
                  <th className="px-3 py-2.5 text-right font-medium">ANN (16-8-1)</th>
                  <th className="pl-3 py-2.5 text-right font-medium">Random Forest (100)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="h-10">
                  <td className="pr-4 font-medium text-slate-800">Notebook Test Accuracy</td>
                  <td className="px-3 text-right font-mono font-semibold tabular-nums text-blue-700">
                    {annMetrics.notebookReportedAccuracy.toFixed(2)}%
                  </td>
                  <td className="pl-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {rfMetrics.notebookReportedAccuracy.toFixed(2)}%
                  </td>
                </tr>
                <tr className="h-10">
                  <td className="pr-4 font-medium text-slate-800">Live Holdout Accuracy (n=400)</td>
                  <td className="px-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {annMetrics.testAccuracy.toFixed(2)}%
                  </td>
                  <td className="pl-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {rfMetrics.testAccuracy.toFixed(2)}%
                  </td>
                </tr>
                <tr className="h-10">
                  <td className="pr-4 text-slate-600">Fraud Precision</td>
                  <td className="px-3 text-right font-mono tabular-nums text-slate-800">
                    {annMetrics.precision.toFixed(1)}%
                  </td>
                  <td className="pl-3 text-right font-mono tabular-nums text-slate-800">
                    {rfMetrics.precision.toFixed(1)}%
                  </td>
                </tr>
                <tr className="h-10">
                  <td className="pr-4 text-slate-600">Fraud Recall (Detection Rate)</td>
                  <td className="px-3 text-right font-mono tabular-nums text-slate-800">
                    {annMetrics.recall.toFixed(1)}%
                  </td>
                  <td className="pl-3 text-right font-mono tabular-nums text-slate-800">
                    {rfMetrics.recall.toFixed(1)}%
                  </td>
                </tr>
                <tr className="h-10">
                  <td className="pr-4 text-slate-600">F1-Score</td>
                  <td className="px-3 text-right font-mono tabular-nums text-slate-800">
                    {annMetrics.f1Score.toFixed(1)}%
                  </td>
                  <td className="pl-3 text-right font-mono tabular-nums text-slate-800">
                    {rfMetrics.f1Score.toFixed(1)}%
                  </td>
                </tr>
                <tr className="h-10">
                  <td className="pr-4 text-slate-600">Confusion Matrix (TP / FP / TN / FN)</td>
                  <td className="px-3 text-right font-mono text-[11px] tabular-nums text-slate-700">
                    {annMetrics.confusionMatrix.tp} / {annMetrics.confusionMatrix.fp} /{' '}
                    {annMetrics.confusionMatrix.tn} / {annMetrics.confusionMatrix.fn}
                  </td>
                  <td className="pl-3 text-right font-mono text-[11px] tabular-nums text-slate-700">
                    {rfMetrics.confusionMatrix.tp} / {rfMetrics.confusionMatrix.fp} /{' '}
                    {rfMetrics.confusionMatrix.tn} / {rfMetrics.confusionMatrix.fn}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ANN 30-Epoch Training Convergence & Global Feature Weights */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                ANN 30-Epoch Training Convergence
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-700" aria-hidden="true" />
                  Accuracy
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                  BCE Loss
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="h-32 w-full overflow-visible"
                role="img"
                aria-label="ANN training accuracy and binary cross-entropy loss across 30 epochs"
              >
                {/* Horizontal gridlines */}
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line
                    key={ratio}
                    x1={padX}
                    x2={width - padX}
                    y1={padY + ratio * innerH}
                    y2={padY + ratio * innerH}
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                  />
                ))}
                <polyline
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={lossPoints}
                />
                <polyline
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={accPoints}
                />
              </svg>
              <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-slate-500">
                <span>Epoch 1 (Acc {epochHistory[0]?.accuracy}%)</span>
                <span>Epoch 15</span>
                <span>Epoch 30 (Acc {epochHistory[epochHistory.length - 1]?.accuracy}%)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="text-xs font-semibold text-slate-900">
              Primary Fraud Risk Predictors (Random Forest Gini Weight)
            </div>
            <div className="mt-2.5 space-y-2">
              {FEATURE_IMPORTANCE_LABELS.slice(0, 4).map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-xs">
                  <span className="w-36 shrink-0 truncate text-slate-600">{item.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-800"
                      style={{ width: `${item.pct * 3}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-700">
                    {item.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
