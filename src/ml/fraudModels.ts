import {
  FeatureContribution,
  FraudPredictionResult,
  ModelMetrics,
  RiskLevel,
  ScenarioPreset,
  TrainingEpochPoint,
  TransactionInput,
  TransactionType,
} from './types';

// Deterministic Mulberry32 PRNG matching random_state=42 spirit
function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sigmoid(x: number): number {
  if (x > 35) return 1 - 1e-15;
  if (x < -35) return 1e-15;
  return 1 / (1 + Math.exp(-x));
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

export const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'safe-p2m',
    label: 'Safe Merchant Pay',
    description: 'Verified daytime P2M purchase from trusted device & location',
    tag: 'Normal',
    input: {
      amount: 397.92,
      transaction_type: 'P2M',
      hour: 9,
      location_match: 1,
      device_match: 1,
      daily_transactions: 4,
      failed_attempts: 0,
      new_beneficiary: 1,
    },
  },
  {
    id: 'ann-notebook-fraud',
    label: 'ANN Notebook Case',
    description: '₹3,000 late-night UPI transfer with device/location mismatch & 3 failed PINs',
    tag: 'Fraud',
    input: {
      amount: 3000,
      transaction_type: 'UPI',
      hour: 2,
      location_match: 0,
      device_match: 0,
      daily_transactions: 12,
      failed_attempts: 3,
      new_beneficiary: 1,
    },
  },
  {
    id: 'rf-notebook-fraud',
    label: 'RF Notebook Case',
    description: '₹25,000 late-night UPI transfer with device/location mismatch & 3 failed PINs',
    tag: 'Fraud',
    input: {
      amount: 25000,
      transaction_type: 'UPI',
      hour: 2,
      location_match: 0,
      device_match: 0,
      daily_transactions: 12,
      failed_attempts: 3,
      new_beneficiary: 1,
    },
  },
  {
    id: 'pin-bruteforce',
    label: 'PIN Brute-Force',
    description: '1 AM UPI transfer after 4 consecutive failed authentication attempts',
    tag: 'Fraud',
    input: {
      amount: 1804.8,
      transaction_type: 'UPI',
      hour: 1,
      location_match: 1,
      device_match: 1,
      daily_transactions: 3,
      failed_attempts: 4,
      new_beneficiary: 1,
    },
  },
  {
    id: 'high-value-daytime',
    label: 'High-Value Daytime',
    description: '₹12,120.92 midday UPI transfer from verified device and location',
    tag: 'Elevated',
    input: {
      amount: 12120.92,
      transaction_type: 'UPI',
      hour: 14,
      location_match: 1,
      device_match: 1,
      daily_transactions: 4,
      failed_attempts: 0,
      new_beneficiary: 0,
    },
  },
  {
    id: 'normal-p2p',
    label: 'Routine P2P Transfer',
    description: 'Regular daytime peer transfer to an existing beneficiary',
    tag: 'Normal',
    input: {
      amount: 1250,
      transaction_type: 'P2P',
      hour: 16,
      location_match: 1,
      device_match: 1,
      daily_transactions: 2,
      failed_attempts: 0,
      new_beneficiary: 0,
    },
  },
];

interface DatasetRow extends TransactionInput {
  is_fraud: 0 | 1;
}

// Feature encoding matching get_dummies(X, drop_first=True) -> P2P dropped, P2M and UPI kept
// Plus we also include P2P for RF (9 features total) while keeping clean unified vector
const FEATURE_NAMES = [
  'amount',
  'hour',
  'location_match',
  'device_match',
  'daily_transactions',
  'failed_attempts',
  'new_beneficiary',
  'type_P2M',
  'type_UPI',
] as const;

function encodeFeatures(input: TransactionInput): number[] {
  return [
    input.amount,
    input.hour,
    input.location_match,
    input.device_match,
    input.daily_transactions,
    input.failed_attempts,
    input.new_beneficiary,
    input.transaction_type === 'P2M' ? 1 : 0,
    input.transaction_type === 'UPI' ? 1 : 0,
  ];
}

function generateDataset(): DatasetRow[] {
  const rng = createRng(42);
  // Exact 5 head rows from PRJ_RF_UPI_50a30f40.ipynb
  const rows: DatasetRow[] = [
    {
      amount: 892.39,
      transaction_type: 'P2P',
      hour: 5,
      location_match: 0,
      device_match: 1,
      daily_transactions: 3,
      failed_attempts: 0,
      new_beneficiary: 0,
      is_fraud: 0,
    },
    {
      amount: 1804.8,
      transaction_type: 'UPI',
      hour: 1,
      location_match: 1,
      device_match: 1,
      daily_transactions: 3,
      failed_attempts: 4,
      new_beneficiary: 1,
      is_fraud: 1,
    },
    {
      amount: 12120.92,
      transaction_type: 'UPI',
      hour: 14,
      location_match: 1,
      device_match: 1,
      daily_transactions: 4,
      failed_attempts: 0,
      new_beneficiary: 0,
      is_fraud: 1,
    },
    {
      amount: 397.92,
      transaction_type: 'P2M',
      hour: 9,
      location_match: 1,
      device_match: 1,
      daily_transactions: 4,
      failed_attempts: 0,
      new_beneficiary: 1,
      is_fraud: 0,
    },
    {
      amount: 2188.2,
      transaction_type: 'P2M',
      hour: 20,
      location_match: 0,
      device_match: 1,
      daily_transactions: 1,
      failed_attempts: 1,
      new_beneficiary: 0,
      is_fraud: 1,
    },
  ];

  const txTypes: TransactionType[] = ['P2P', 'P2M', 'UPI'];

  for (let i = 5; i < 2000; i++) {
    const typeRoll = rng();
    const transaction_type: TransactionType =
      typeRoll < 0.36 ? 'UPI' : typeRoll < 0.7 ? 'P2P' : 'P2M';

    // Log-normal amount distribution typical of UPI transactions
    const u1 = Math.max(1e-6, rng());
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const amount = Math.min(50000, Math.max(25, Math.round(Math.exp(7.15 + 1.05 * z) * 100) / 100));

    const hour = Math.floor(rng() * 24);
    const location_match: 0 | 1 = rng() < 0.72 ? 1 : 0;
    const device_match: 0 | 1 = rng() < 0.78 ? 1 : 0;
    const daily_transactions = Math.min(18, 1 + Math.floor(Math.pow(rng(), 1.7) * 15));
    const failedRoll = rng();
    const failed_attempts =
      failedRoll < 0.56 ? 0 : failedRoll < 0.76 ? 1 : failedRoll < 0.88 ? 2 : failedRoll < 0.95 ? 3 : 4;
    const new_beneficiary: 0 | 1 = rng() < 0.4 ? 1 : 0;

    // Realistic underlying risk scoring matching notebook observations
    const isNight = hour <= 5 || hour >= 22 ? 1 : 0;
    const logit =
      -3.35 +
      (amount > 10000 ? 2.45 : amount > 4000 ? 1.05 : amount > 2000 ? 0.45 : -0.45) +
      (transaction_type === 'UPI' ? 0.75 : transaction_type === 'P2P' ? -0.25 : -0.3) +
      (isNight ? 1.35 : -0.2) +
      (location_match === 0 ? 1.75 : -0.2) +
      (device_match === 0 ? 1.85 : -0.2) +
      (daily_transactions >= 8 ? 1.5 : daily_transactions >= 5 ? 0.4 : -0.15) +
      failed_attempts * 1.15 +
      (new_beneficiary === 1 ? 0.75 : -0.15);

    // Calibrated label sharpness so real classifiers achieve ~81-84% test accuracy
    const trueProb = sigmoid(logit * 1.35);
    const is_fraud: 0 | 1 = rng() < trueProb ? 1 : 0;

    rows.push({
      amount,
      transaction_type,
      hour,
      location_match,
      device_match,
      daily_transactions,
      failed_attempts,
      new_beneficiary,
      is_fraud,
    });
  }

  return rows;
}

// ---------------- StandardScaler ----------------
class StandardScaler {
  means: number[] = [];
  stds: number[] = [];

  fit(X: number[][]) {
    const dims = X[0].length;
    const n = X.length;
    this.means = new Array(dims).fill(0);
    this.stds = new Array(dims).fill(0);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dims; j++) {
        this.means[j] += X[i][j];
      }
    }
    for (let j = 0; j < dims; j++) {
      this.means[j] /= n;
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < dims; j++) {
        const d = X[i][j] - this.means[j];
        this.stds[j] += d * d;
      }
    }
    for (let j = 0; j < dims; j++) {
      this.stds[j] = Math.sqrt(this.stds[j] / n) || 1;
    }
  }

  transformRow(row: number[]): number[] {
    return row.map((v, j) => (v - this.means[j]) / this.stds[j]);
  }

  transform(X: number[][]): number[][] {
    return X.map((r) => this.transformRow(r));
  }
}

// ---------------- Artificial Neural Network (Dense 16 -> 8 -> 1) ----------------
class NeuralNetworkClassifier {
  private w1: number[][];
  private b1: number[];
  private w2: number[][];
  private b2: number[];
  private w3: number[];
  private b3: number;
  public epochHistory: TrainingEpochPoint[] = [];

  constructor(inputDim: number, seed = 42) {
    const rng = createRng(seed);
    const randn = () => {
      const u1 = Math.max(1e-7, rng());
      const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    // He / Xavier initialization for Dense(16) -> Dense(8) -> Dense(1)
    const s1 = Math.sqrt(2 / inputDim);
    this.w1 = Array.from({ length: 16 }, () =>
      Array.from({ length: inputDim }, () => randn() * s1)
    );
    this.b1 = new Array(16).fill(0);

    const s2 = Math.sqrt(2 / 16);
    this.w2 = Array.from({ length: 8 }, () =>
      Array.from({ length: 16 }, () => randn() * s2)
    );
    this.b2 = new Array(8).fill(0);

    const s3 = Math.sqrt(1 / 8);
    this.w3 = Array.from({ length: 8 }, () => randn() * s3);
    this.b3 = 0;
  }

  fit(X: number[][], y: number[], epochs = 30, batchSize = 32, lr = 0.004) {
    const n = X.length;
    const inputDim = X[0].length;
    const rng = createRng(101);

    // Adam moments
    const mW1 = this.w1.map((r) => r.map(() => 0));
    const vW1 = this.w1.map((r) => r.map(() => 0));
    const mB1 = new Array(16).fill(0);
    const vB1 = new Array(16).fill(0);

    const mW2 = this.w2.map((r) => r.map(() => 0));
    const vW2 = this.w2.map((r) => r.map(() => 0));
    const mB2 = new Array(8).fill(0);
    const vB2 = new Array(8).fill(0);

    const mW3 = new Array(8).fill(0);
    const vW3 = new Array(8).fill(0);
    let mB3 = 0;
    let vB3 = 0;

    const beta1 = 0.9;
    const beta2 = 0.999;
    const eps = 1e-8;
    let step = 0;

    const indices = Array.from({ length: n }, (_, i) => i);
    this.epochHistory = [];

    for (let epoch = 1; epoch <= epochs; epoch++) {
      // Shuffle indices
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }

      let epochLoss = 0;
      let epochCorrect = 0;

      for (let start = 0; start < n; start += batchSize) {
        const end = Math.min(n, start + batchSize);
        const bs = end - start;

        const gW1 = this.w1.map((r) => r.map(() => 0));
        const gB1 = new Array(16).fill(0);
        const gW2 = this.w2.map((r) => r.map(() => 0));
        const gB2 = new Array(8).fill(0);
        const gW3 = new Array(8).fill(0);
        let gB3 = 0;

        for (let idx = start; idx < end; idx++) {
          const sampleIdx = indices[idx];
          const x = X[sampleIdx];
          const target = y[sampleIdx];

          // Forward layer 1
          const z1 = new Array(16);
          const a1 = new Array(16);
          for (let i = 0; i < 16; i++) {
            let sum = this.b1[i];
            const wi = this.w1[i];
            for (let j = 0; j < inputDim; j++) sum += wi[j] * x[j];
            z1[i] = sum;
            a1[i] = relu(sum);
          }

          // Forward layer 2
          const z2 = new Array(8);
          const a2 = new Array(8);
          for (let i = 0; i < 8; i++) {
            let sum = this.b2[i];
            const wi = this.w2[i];
            for (let j = 0; j < 16; j++) sum += wi[j] * a1[j];
            z2[i] = sum;
            a2[i] = relu(sum);
          }

          // Output layer
          let z3 = this.b3;
          for (let i = 0; i < 8; i++) z3 += this.w3[i] * a2[i];
          const pred = sigmoid(z3);

          const pClamp = Math.min(1 - 1e-7, Math.max(1e-7, pred));
          epochLoss += -(target * Math.log(pClamp) + (1 - target) * Math.log(1 - pClamp));
          if ((pred > 0.5 ? 1 : 0) === target) epochCorrect++;

          // Backprop binary cross-entropy with sigmoid
          const dZ3 = pred - target;
          gB3 += dZ3;
          const dA2 = new Array(8);
          for (let i = 0; i < 8; i++) {
            gW3[i] += dZ3 * a2[i];
            dA2[i] = dZ3 * this.w3[i];
          }

          const dA1 = new Array(16).fill(0);
          for (let i = 0; i < 8; i++) {
            if (z2[i] <= 0) continue;
            const dZ2 = dA2[i];
            gB2[i] += dZ2;
            const wi = this.w2[i];
            const gwi = gW2[i];
            for (let j = 0; j < 16; j++) {
              gwi[j] += dZ2 * a1[j];
              dA1[j] += dZ2 * wi[j];
            }
          }

          for (let i = 0; i < 16; i++) {
            if (z1[i] <= 0) continue;
            const dZ1 = dA1[i];
            gB1[i] += dZ1;
            const gwi = gW1[i];
            for (let j = 0; j < inputDim; j++) {
              gwi[j] += dZ1 * x[j];
            }
          }
        }

        // Adam update
        step++;
        const bc1 = 1 - Math.pow(beta1, step);
        const bc2 = 1 - Math.pow(beta2, step);
        const invBs = 1 / bs;

        for (let i = 0; i < 16; i++) {
          const gb = gB1[i] * invBs;
          mB1[i] = beta1 * mB1[i] + (1 - beta1) * gb;
          vB1[i] = beta2 * vB1[i] + (1 - beta2) * gb * gb;
          this.b1[i] -= (lr * (mB1[i] / bc1)) / (Math.sqrt(vB1[i] / bc2) + eps);

          for (let j = 0; j < inputDim; j++) {
            const gw = gW1[i][j] * invBs;
            mW1[i][j] = beta1 * mW1[i][j] + (1 - beta1) * gw;
            vW1[i][j] = beta2 * vW1[i][j] + (1 - beta2) * gw * gw;
            this.w1[i][j] -= (lr * (mW1[i][j] / bc1)) / (Math.sqrt(vW1[i][j] / bc2) + eps);
          }
        }

        for (let i = 0; i < 8; i++) {
          const gb = gB2[i] * invBs;
          mB2[i] = beta1 * mB2[i] + (1 - beta1) * gb;
          vB2[i] = beta2 * vB2[i] + (1 - beta2) * gb * gb;
          this.b2[i] -= (lr * (mB2[i] / bc1)) / (Math.sqrt(vB2[i] / bc2) + eps);

          for (let j = 0; j < 16; j++) {
            const gw = gW2[i][j] * invBs;
            mW2[i][j] = beta1 * mW2[i][j] + (1 - beta1) * gw;
            vW2[i][j] = beta2 * vW2[i][j] + (1 - beta2) * gw * gw;
            this.w2[i][j] -= (lr * (mW2[i][j] / bc1)) / (Math.sqrt(vW2[i][j] / bc2) + eps);
          }

          const gw3 = gW3[i] * invBs;
          mW3[i] = beta1 * mW3[i] + (1 - beta1) * gw3;
          vW3[i] = beta2 * vW3[i] + (1 - beta2) * gw3 * gw3;
          this.w3[i] -= (lr * (mW3[i] / bc1)) / (Math.sqrt(vW3[i] / bc2) + eps);
        }

        const gb3 = gB3 * invBs;
        mB3 = beta1 * mB3 + (1 - beta1) * gb3;
        vB3 = beta2 * vB3 + (1 - beta2) * gb3 * gb3;
        this.b3 -= (lr * (mB3 / bc1)) / (Math.sqrt(vB3 / bc2) + eps);
      }

      this.epochHistory.push({
        epoch,
        loss: Number((epochLoss / n).toFixed(4)),
        accuracy: Number(((epochCorrect / n) * 100).toFixed(2)),
      });
    }
  }

  predictProba(x: number[]): number {
    const a1 = new Array(16);
    for (let i = 0; i < 16; i++) {
      let sum = this.b1[i];
      const wi = this.w1[i];
      for (let j = 0; j < x.length; j++) sum += wi[j] * x[j];
      a1[i] = relu(sum);
    }

    const a2 = new Array(8);
    for (let i = 0; i < 8; i++) {
      let sum = this.b2[i];
      const wi = this.w2[i];
      for (let j = 0; j < 16; j++) sum += wi[j] * a1[j];
      a2[i] = relu(sum);
    }

    let z3 = this.b3;
    for (let i = 0; i < 8; i++) z3 += this.w3[i] * a2[i];
    return sigmoid(z3);
  }
}

// ---------------- Decision Tree & Random Forest (100 Estimators) ----------------
interface TreeNode {
  leaf: boolean;
  prob?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

class RandomForestClassifier {
  private trees: TreeNode[] = [];
  public featureImportances: number[] = [];
  private numFeatures = 9;

  constructor(private nEstimators = 100, private maxDepth = 10, private minSamplesLeaf = 3) {}

  fit(X: number[][], y: number[], seed = 42) {
    const rng = createRng(seed);
    const n = X.length;
    this.numFeatures = X[0].length;
    const importanceAcc = new Array(this.numFeatures).fill(0);
    const maxFeatures = Math.max(3, Math.floor(Math.sqrt(this.numFeatures)) + 1);

    this.trees = [];

    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sample
      const bootIndices = new Array<number>(n);
      for (let i = 0; i < n; i++) {
        bootIndices[i] = Math.floor(rng() * n);
      }
      const tree = this.buildTree(X, y, bootIndices, 0, maxFeatures, rng, importanceAcc);
      this.trees.push(tree);
    }

    const totalImp = importanceAcc.reduce((a, b) => a + b, 0) || 1;
    this.featureImportances = importanceAcc.map((v) => v / totalImp);
  }

  private buildTree(
    X: number[][],
    y: number[],
    indices: number[],
    depth: number,
    maxFeatures: number,
    rng: () => number,
    importanceAcc: number[]
  ): TreeNode {
    const n = indices.length;
    let pos = 0;
    for (let i = 0; i < n; i++) pos += y[indices[i]];
    const prob = pos / n;

    if (depth >= this.maxDepth || n < this.minSamplesLeaf * 2 || pos === 0 || pos === n) {
      return { leaf: true, prob };
    }

    const parentGini = 1 - prob * prob - (1 - prob) * (1 - prob);

    // Random feature subset
    const featPool = Array.from({ length: this.numFeatures }, (_, i) => i);
    for (let i = featPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = featPool[i];
      featPool[i] = featPool[j];
      featPool[j] = tmp;
    }
    const candidateFeatures = featPool.slice(0, maxFeatures);

    let bestGain = 0;
    let bestFeat = -1;
    let bestThresh = 0;

    for (const f of candidateFeatures) {
      // Sort (featureValue, label) pairs once per feature for O(n log n) exact split search
      const pairs = indices.map((idx) => ({ v: X[idx][f], y: y[idx] }));
      pairs.sort((a, b) => a.v - b.v);
      if (pairs[0].v === pairs[n - 1].v) continue;

      let leftCount = 0;
      let leftPos = 0;
      const isContinuous = f === 0 && n > 30;
      const step = isContinuous ? Math.max(1, Math.floor(n / 20)) : 1;

      for (let k = 0; k < n - 1; k++) {
        leftCount++;
        leftPos += pairs[k].y;

        if (pairs[k].v === pairs[k + 1].v) continue;
        if (isContinuous && k % step !== 0 && k < n - 2) continue;
        const rightCount = n - leftCount;
        if (leftCount < this.minSamplesLeaf || rightCount < this.minSamplesLeaf) continue;

        const rightPos = pos - leftPos;
        const lp = leftPos / leftCount;
        const rp = rightPos / rightCount;
        const leftGini = 1 - lp * lp - (1 - lp) * (1 - lp);
        const rightGini = 1 - rp * rp - (1 - rp) * (1 - rp);
        const weightedGini = (leftCount / n) * leftGini + (rightCount / n) * rightGini;
        const gain = parentGini - weightedGini;

        if (gain > bestGain) {
          bestGain = gain;
          bestFeat = f;
          bestThresh = (pairs[k].v + pairs[k + 1].v) * 0.5;
        }
      }
    }

    if (bestFeat === -1 || bestGain <= 1e-5) {
      return { leaf: true, prob };
    }

    importanceAcc[bestFeat] += n * bestGain;

    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    for (let i = 0; i < n; i++) {
      const idx = indices[i];
      if (X[idx][bestFeat] <= bestThresh) leftIdx.push(idx);
      else rightIdx.push(idx);
    }

    return {
      leaf: false,
      featureIndex: bestFeat,
      threshold: bestThresh,
      left: this.buildTree(X, y, leftIdx, depth + 1, maxFeatures, rng, importanceAcc),
      right: this.buildTree(X, y, rightIdx, depth + 1, maxFeatures, rng, importanceAcc),
    };
  }

  private predictTree(node: TreeNode, x: number[]): number {
    let curr = node;
    while (!curr.leaf) {
      if (x[curr.featureIndex!] <= curr.threshold!) {
        curr = curr.left!;
      } else {
        curr = curr.right!;
      }
    }
    return curr.prob!;
  }

  predictDetails(x: number[]): { probability: number; fraudTreeVotes: number; totalTrees: number } {
    let probSum = 0;
    let fraudVotes = 0;
    for (let i = 0; i < this.trees.length; i++) {
      const p = this.predictTree(this.trees[i], x);
      probSum += p;
      if (p > 0.5) fraudVotes++;
    }
    return {
      probability: probSum / this.trees.length,
      fraudTreeVotes: fraudVotes,
      totalTrees: this.trees.length,
    };
  }
}

// ---------------- Metrics & Risk Helpers ----------------
function computeMetrics(
  yTrue: number[],
  yPred: number[],
  name: string,
  shortName: string,
  architecture: string,
  notebookReportedAccuracy: number
): ModelMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === 1 && yPred[i] === 1) tp++;
    else if (yTrue[i] === 0 && yPred[i] === 1) fp++;
    else if (yTrue[i] === 0 && yPred[i] === 0) tn++;
    else fn++;
  }
  const accuracy = ((tp + tn) / yTrue.length) * 100;
  const precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
  const recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    name,
    shortName,
    architecture,
    testAccuracy: Number(accuracy.toFixed(2)),
    notebookReportedAccuracy,
    precision: Number(precision.toFixed(2)),
    recall: Number(recall.toFixed(2)),
    f1Score: Number(f1Score.toFixed(2)),
    confusionMatrix: { tp, fp, tn, fn },
  };
}

function getRiskLevel(probability: number): RiskLevel {
  if (probability >= 0.8) return 'CRITICAL';
  if (probability > 0.5) return 'HIGH';
  if (probability >= 0.3) return 'MODERATE';
  return 'LOW';
}

function getConfidenceLabel(probability: number): string {
  const distance = Math.abs(probability - 0.5) * 2;
  if (distance >= 0.75) return 'High Confidence';
  if (distance >= 0.4) return 'Moderate Confidence';
  return 'Borderline Threshold';
}

// ---------------- Singleton Trained Engine ----------------
class FraudDetectionEngine {
  private scaler = new StandardScaler();
  private ann = new NeuralNetworkClassifier(9, 42);
  private rf = new RandomForestClassifier(100, 10, 3);
  public annMetrics: ModelMetrics;
  public rfMetrics: ModelMetrics;
  public epochHistory: TrainingEpochPoint[];
  public datasetSummary: {
    totalRows: number;
    trainRows: number;
    testRows: number;
    fraudRate: number;
  };

  constructor() {
    const dataset = generateDataset();
    const X = dataset.map(encodeFeatures);
    const y = dataset.map((d) => d.is_fraud);

    // Deterministic 80/20 split matching test_size=0.2, random_state=42
    const rng = createRng(42);
    const indices = Array.from({ length: dataset.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }

    const splitIdx = Math.floor(dataset.length * 0.8);
    const trainIdx = indices.slice(0, splitIdx);
    const testIdx = indices.slice(splitIdx);

    const XTrain = trainIdx.map((i) => X[i]);
    const yTrain = trainIdx.map((i) => y[i]);
    const XTest = testIdx.map((i) => X[i]);
    const yTest = testIdx.map((i) => y[i]);

    this.scaler.fit(XTrain);
    const XTrainScaled = this.scaler.transform(XTrain);
    const XTestScaled = this.scaler.transform(XTest);

    this.ann.fit(XTrainScaled, yTrain, 30, 32, 0.005);
    this.rf.fit(XTrain, yTrain, 42);

    const annPreds = XTestScaled.map((r) => (this.ann.predictProba(r) > 0.5 ? 1 : 0));
    const rfPreds = XTest.map((r) => (this.rf.predictDetails(r).probability > 0.5 ? 1 : 0));

    this.annMetrics = computeMetrics(
      yTest,
      annPreds,
      'Artificial Neural Network',
      'ANN (Keras-Style MLP)',
      'Dense(16, ReLU) → Dense(8, ReLU) → Dense(1, Sigmoid)',
      83.25
    );

    this.rfMetrics = computeMetrics(
      yTest,
      rfPreds,
      'Random Forest Classifier',
      'Random Forest (100 Trees)',
      '100 Decision Trees · Gini Impurity · Bootstrap Aggregation',
      81.0
    );

    this.epochHistory = this.ann.epochHistory;
    const totalFraud = y.reduce<number>((a, b) => a + b, 0);
    this.datasetSummary = {
      totalRows: dataset.length,
      trainRows: trainIdx.length,
      testRows: testIdx.length,
      fraudRate: Number(((totalFraud / dataset.length) * 100).toFixed(1)),
    };
  }

  predict(input: TransactionInput): FraudPredictionResult {
    const start = performance.now();
    const rawVec = encodeFeatures(input);
    const scaledVec = this.scaler.transformRow(rawVec);

    const annProb = this.ann.predictProba(scaledVec);
    const rfDetails = this.rf.predictDetails(rawVec);

    const annIsFraud = annProb > 0.5;
    const rfIsFraud = rfDetails.probability > 0.5;

    const consensus: FraudPredictionResult['consensus'] =
      annIsFraud && rfIsFraud ? 'FRAUD' : !annIsFraud && !rfIsFraud ? 'NORMAL' : 'DIVERGENT';

    // Compute marginal feature contributions relative to a safe nominal transaction baseline
    const safeBaseline: TransactionInput = {
      amount: 500,
      transaction_type: 'P2P',
      hour: 14,
      location_match: 1,
      device_match: 1,
      daily_transactions: 2,
      failed_attempts: 0,
      new_beneficiary: 0,
    };

    const contributions = this.computeContributions(input, safeBaseline, annProb, rfDetails.probability);

    const elapsed = Math.max(0.2, performance.now() - start);

    return {
      id: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      input: { ...input },
      ann: {
        probability: annProb,
        isFraud: annIsFraud,
        riskLevel: getRiskLevel(annProb),
        confidenceLabel: getConfidenceLabel(annProb),
        extraDetail: `Sigmoid activation output ${(annProb * 100).toFixed(2)}% (threshold > 50.0%)`,
      },
      rf: {
        probability: rfDetails.probability,
        isFraud: rfIsFraud,
        riskLevel: getRiskLevel(rfDetails.probability),
        confidenceLabel: getConfidenceLabel(rfDetails.probability),
        extraDetail: `${rfDetails.fraudTreeVotes} of ${rfDetails.totalTrees} decision trees voted Fraud`,
        fraudTreeVotes: rfDetails.fraudTreeVotes,
        totalTrees: rfDetails.totalTrees,
      },
      consensus,
      contributions,
      inferenceTimeMs: Number(elapsed.toFixed(2)),
    };
  }

  private computeContributions(
    input: TransactionInput,
    baseline: TransactionInput,
    currentAnn: number,
    currentRf: number
  ): FeatureContribution[] {
    const imps = this.rf.featureImportances;
    const typeImp = imps[7] + imps[8];

    const specs: Array<{
      key: keyof TransactionInput;
      label: string;
      valueDisplay: string;
      rfImportance: number;
    }> = [
      {
        key: 'amount',
        label: 'Transaction Amount',
        valueDisplay: `₹${input.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
        rfImportance: imps[0],
      },
      {
        key: 'failed_attempts',
        label: 'Failed PIN Attempts',
        valueDisplay: `${input.failed_attempts} failed`,
        rfImportance: imps[5],
      },
      {
        key: 'device_match',
        label: 'Device Recognition',
        valueDisplay: input.device_match === 1 ? 'Trusted Device' : 'Unrecognized Device',
        rfImportance: imps[3],
      },
      {
        key: 'location_match',
        label: 'Location Match',
        valueDisplay: input.location_match === 1 ? 'Verified Geo' : 'Location Mismatch',
        rfImportance: imps[2],
      },
      {
        key: 'hour',
        label: 'Transaction Hour',
        valueDisplay: `${String(input.hour).padStart(2, '0')}:00`,
        rfImportance: imps[1],
      },
      {
        key: 'daily_transactions',
        label: 'Daily Tx Velocity',
        valueDisplay: `${input.daily_transactions} tx / day`,
        rfImportance: imps[4],
      },
      {
        key: 'new_beneficiary',
        label: 'Beneficiary Status',
        valueDisplay: input.new_beneficiary === 1 ? 'New Payee' : 'Saved Payee',
        rfImportance: imps[6],
      },
      {
        key: 'transaction_type',
        label: 'Channel Type',
        valueDisplay: input.transaction_type,
        rfImportance: typeImp,
      },
    ];

    const list: FeatureContribution[] = specs.map((spec) => {
      // Leave-one-out counter-factual: replace this feature with safe baseline value
      const counterInput: TransactionInput = {
        ...input,
        [spec.key]: baseline[spec.key],
      };
      const counterRaw = encodeFeatures(counterInput);
      const counterScaled = this.scaler.transformRow(counterRaw);

      const counterAnn = this.ann.predictProba(counterScaled);
      const counterRf = this.rf.predictDetails(counterRaw).probability;

      return {
        feature: spec.key,
        label: spec.label,
        valueDisplay: spec.valueDisplay,
        annImpact: currentAnn - counterAnn,
        rfImpact: currentRf - counterRf,
        rfImportance: spec.rfImportance,
      };
    });

    return list.sort(
      (a, b) =>
        Math.abs(b.annImpact) + Math.abs(b.rfImpact) - (Math.abs(a.annImpact) + Math.abs(a.rfImpact))
    );
  }
}

let cachedEngine: FraudDetectionEngine | null = null;

export function getFraudEngine(): FraudDetectionEngine {
  if (!cachedEngine) {
    cachedEngine = new FraudDetectionEngine();
  }
  return cachedEngine;
}
