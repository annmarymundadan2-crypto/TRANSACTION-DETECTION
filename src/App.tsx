import React, { useEffect, useState } from 'react';
import { ConsensusAlertBanner } from './components/ConsensusAlertBanner';
import { EvaluationHistoryTable } from './components/EvaluationHistoryTable';
import { FeatureContributionPanel } from './components/FeatureContributionPanel';
import { ModelAccuracyOverview } from './components/ModelAccuracyOverview';
import { ModelComparisonCards } from './components/ModelComparisonCards';
import { TopBar } from './components/TopBar';
import { TransactionForm } from './components/TransactionForm';
import { getFraudEngine, PRESET_SCENARIOS } from './ml/fraudModels';
import {
  FraudPredictionResult,
  ModelMetrics,
  ScenarioPreset,
  TrainingEpochPoint,
  TransactionInput,
} from './ml/types';

const DEFAULT_PRESET = PRESET_SCENARIOS[1]; // ANN Notebook Fraud Case (₹3,000, UPI, 02:00)

export default function App() {
  const [formValue, setFormValue] = useState<TransactionInput>(DEFAULT_PRESET.input);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET.id);
  const [hasUnanalyzedChanges, setHasUnanalyzedChanges] = useState(false);

  const [isEngineReady, setIsEngineReady] = useState(false);
  const [annMetrics, setAnnMetrics] = useState<ModelMetrics | null>(null);
  const [rfMetrics, setRfMetrics] = useState<ModelMetrics | null>(null);
  const [epochHistory, setEpochHistory] = useState<TrainingEpochPoint[]>([]);
  const [datasetSummary, setDatasetSummary] = useState<{
    totalRows: number;
    trainRows: number;
    testRows: number;
    fraudRate: number;
  } | null>(null);

  const [currentResult, setCurrentResult] = useState<FraudPredictionResult | null>(null);
  const [history, setHistory] = useState<FraudPredictionResult[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const engine = getFraudEngine();
      setAnnMetrics(engine.annMetrics);
      setRfMetrics(engine.rfMetrics);
      setEpochHistory(engine.epochHistory);
      setDatasetSummary(engine.datasetSummary);

      const initialResult = engine.predict(DEFAULT_PRESET.input);
      const safeSample = engine.predict(PRESET_SCENARIOS[0].input);
      setCurrentResult(initialResult);
      setHistory([initialResult, safeSample]);
      setIsEngineReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const runEvaluation = (input: TransactionInput) => {
    if (!isEngineReady) return;
    const engine = getFraudEngine();
    const res = engine.predict(input);
    setCurrentResult(res);
    setHistory((prev) => [res, ...prev].slice(0, 50));
    setHasUnanalyzedChanges(false);
  };

  const handleFormChange = (next: TransactionInput) => {
    setFormValue(next);
    setActivePresetId(null);
    setHasUnanalyzedChanges(true);
  };

  const handleSelectPreset = (preset: ScenarioPreset) => {
    setFormValue(preset.input);
    setActivePresetId(preset.id);
    runEvaluation(preset.input);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runEvaluation(formValue);
  };

  const handleResetDefaults = () => {
    setFormValue(DEFAULT_PRESET.input);
    setActivePresetId(DEFAULT_PRESET.id);
    runEvaluation(DEFAULT_PRESET.input);
  };

  const handleReloadEntry = (entry: FraudPredictionResult) => {
    setFormValue(entry.input);
    setActivePresetId(null);
    setCurrentResult(entry);
    setHasUnanalyzedChanges(false);
    const el = document.getElementById('analyzer');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar onResetDefaults={handleResetDefaults} />

      <main className="mx-auto max-w-[1400px] space-y-10 px-6 py-8">
        {/* Workspace Title & Unboxed Dataset Context */}
        <section id="analyzer" className="space-y-6">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 [text-wrap:balance] sm:text-3xl">
                UPI Transaction Fraud Detection &amp; Model Comparison
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Simulate real-time UPI payment parameters and compare side-by-side fraud probability
                predictions from the Artificial Neural Network and Random Forest models.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
              <span>2,000 Transactions</span>
              <span aria-hidden="true">·</span>
              <span>80/20 Train-Test Split</span>
              <span aria-hidden="true">·</span>
              <span>ANN 16-8-1 &amp; 100-Tree Random Forest</span>
            </div>
          </div>

          {/* Primary 12-Column Split: Controls (5) + Live ML Output (7) */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <TransactionForm
                value={formValue}
                activePresetId={activePresetId}
                hasUnanalyzedChanges={hasUnanalyzedChanges}
                isReady={isEngineReady}
                onChange={handleFormChange}
                onSelectPreset={handleSelectPreset}
                onSubmit={handleSubmit}
              />
            </div>

            <div className="space-y-5 lg:col-span-7">
              <ConsensusAlertBanner result={currentResult} isLoading={!isEngineReady} />
              <ModelComparisonCards
                result={currentResult}
                annMetrics={annMetrics}
                rfMetrics={rfMetrics}
                isLoading={!isEngineReady}
              />
              <FeatureContributionPanel result={currentResult} isLoading={!isEngineReady} />
            </div>
          </div>
        </section>

        {/* Overall Model Accuracy & Training Convergence */}
        <ModelAccuracyOverview
          annMetrics={annMetrics}
          rfMetrics={rfMetrics}
          epochHistory={epochHistory}
          datasetSummary={datasetSummary}
        />

        {/* Evaluated Transactions Ledger */}
        <EvaluationHistoryTable
          history={history}
          activeResultId={currentResult?.id ?? null}
          onReloadEntry={handleReloadEntry}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-2 px-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>UPI Sentinel · Real-Time Dual-Model Fraud Evaluation</span>
          <span>Artificial Neural Network &amp; Random Forest Classifier</span>
        </div>
      </footer>
    </div>
  );
}
