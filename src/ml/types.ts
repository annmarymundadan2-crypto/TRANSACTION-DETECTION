export type TransactionType = 'UPI' | 'P2P' | 'P2M';

export interface TransactionInput {
  amount: number;
  transaction_type: TransactionType;
  hour: number;
  location_match: 0 | 1;
  device_match: 0 | 1;
  daily_transactions: number;
  failed_attempts: number;
  new_beneficiary: 0 | 1;
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ModelMetrics {
  name: string;
  shortName: string;
  architecture: string;
  testAccuracy: number;
  notebookReportedAccuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
}

export interface FeatureContribution {
  feature: string;
  label: string;
  valueDisplay: string;
  annImpact: number; // probability delta (-1 to +1)
  rfImpact: number;  // probability delta (-1 to +1)
  rfImportance: number; // global feature importance (0 to 1)
}

export interface SingleModelPrediction {
  probability: number; // 0 to 1
  isFraud: boolean;
  riskLevel: RiskLevel;
  confidenceLabel: string;
  extraDetail: string;
}

export interface FraudPredictionResult {
  id: string;
  timestamp: string;
  input: TransactionInput;
  ann: SingleModelPrediction;
  rf: SingleModelPrediction & {
    fraudTreeVotes: number;
    totalTrees: number;
  };
  consensus: 'FRAUD' | 'DIVERGENT' | 'NORMAL';
  contributions: FeatureContribution[];
  inferenceTimeMs: number;
}

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  tag: string;
  input: TransactionInput;
}

export interface TrainingEpochPoint {
  epoch: number;
  loss: number;
  accuracy: number;
}
