/**
 * Gradient-Boosted Decision Tree (GBDT) implementation with exact TreeSHAP computation.
 * Designed for explainable financial forecasting.
 */

export interface TreeNode {
  featureIndex: number;
  threshold: number;
  value: number; // leaf prediction or node average
  cover: number; // number of training samples passing through node (needed for TreeSHAP)
  isLeaf: boolean;
  left?: TreeNode;
  right?: TreeNode;
}

export interface GBDTConfig {
  nEstimators: number; // number of trees
  learningRate: number; // shrinkage factor
  maxDepth: number; // maximum tree depth
  minSamplesSplit: number; // minimum samples required to split
  subsample: number; // row subsampling ratio
}

export class DecisionTreeRegressor {
  root: TreeNode | null = null;
  maxDepth: number;
  minSamplesSplit: number;

  constructor(maxDepth: number = 3, minSamplesSplit: number = 5) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
  }

  fit(X: number[][], y: number[]): void {
    this.root = this.buildTree(X, y, 0);
  }

  predict(x: number[]): number {
    return this.predictNode(this.root!, x);
  }

  private predictNode(node: TreeNode, x: number[]): number {
    if (node.isLeaf || !node.left || !node.right) {
      return node.value;
    }
    if (x[node.featureIndex] <= node.threshold) {
      return this.predictNode(node.left, x);
    } else {
      return this.predictNode(node.right, x);
    }
  }

  private buildTree(X: number[][], y: number[], depth: number): TreeNode {
    const nSamples = y.length;
    const mean = y.reduce((acc, v) => acc + v, 0) / (nSamples || 1);

    // Stop criteria
    if (depth >= this.maxDepth || nSamples < this.minSamplesSplit) {
      return {
        featureIndex: -1,
        threshold: 0,
        value: mean,
        cover: nSamples,
        isLeaf: true,
      };
    }

    const nFeatures = X[0].length;
    let bestVarianceReduction = -1;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    // Current total variance
    let totalVar = 0;
    for (let i = 0; i < nSamples; i++) {
      totalVar += Math.pow(y[i] - mean, 2);
    }

    // Search for optimal split point across candidate features
    for (let f = 0; f < nFeatures; f++) {
      // Find candidate thresholds
      const vals: number[] = [];
      for (let i = 0; i < nSamples; i++) {
        vals.push(X[i][f]);
      }
      vals.sort((a, b) => a - b);

      // Subsample thresholds for fast training (percentile steps)
      const step = Math.max(1, Math.floor(vals.length / 12));
      for (let s = 1; s < vals.length; s += step) {
        const threshold = (vals[s - 1] + vals[s]) / 2;

        const leftY: number[] = [];
        const rightY: number[] = [];
        const leftIdx: number[] = [];
        const rightIdx: number[] = [];

        for (let i = 0; i < nSamples; i++) {
          if (X[i][f] <= threshold) {
            leftY.push(y[i]);
            leftIdx.push(i);
          } else {
            rightY.push(y[i]);
            rightIdx.push(i);
          }
        }

        if (leftY.length === 0 || rightY.length === 0) continue;

        const leftMean = leftY.reduce((a, b) => a + b, 0) / leftY.length;
        const rightMean = rightY.reduce((a, b) => a + b, 0) / rightY.length;

        let leftVar = 0;
        for (let v of leftY) leftVar += Math.pow(v - leftMean, 2);
        let rightVar = 0;
        for (let v of rightY) rightVar += Math.pow(v - rightMean, 2);

        const varReduction = totalVar - (leftVar + rightVar);

        if (varReduction > bestVarianceReduction) {
          bestVarianceReduction = varReduction;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIdx;
          bestRightIndices = rightIdx;
        }
      }
    }

    if (bestFeature === -1 || bestVarianceReduction <= 1e-7) {
      return {
        featureIndex: -1,
        threshold: 0,
        value: mean,
        cover: nSamples,
        isLeaf: true,
      };
    }

    const leftX = bestLeftIndices.map(i => X[i]);
    const leftY = bestLeftIndices.map(i => y[i]);
    const rightX = bestRightIndices.map(i => X[i]);
    const rightY = bestRightIndices.map(i => y[i]);

    const leftChild = this.buildTree(leftX, leftY, depth + 1);
    const rightChild = this.buildTree(rightX, rightY, depth + 1);

    return {
      featureIndex: bestFeature,
      threshold: bestThreshold,
      value: mean,
      cover: nSamples,
      isLeaf: false,
      left: leftChild,
      right: rightChild,
    };
  }
}

export class GradientBoostedTrees {
  trees: DecisionTreeRegressor[] = [];
  config: GBDTConfig;
  baseValue: number = 0;
  featureNames: string[] = [];

  constructor(config: Partial<GBDTConfig> = {}) {
    this.config = {
      nEstimators: config.nEstimators ?? 18,
      learningRate: config.learningRate ?? 0.12,
      maxDepth: config.maxDepth ?? 3,
      minSamplesSplit: config.minSamplesSplit ?? 4,
      subsample: config.subsample ?? 0.85,
    };
  }

  fit(X: number[][], y: number[], featureNames: string[] = []): void {
    this.featureNames = featureNames;
    const n = y.length;
    this.baseValue = y.reduce((a, b) => a + b, 0) / n;

    // Working predictions initialized to baseValue
    const currentPred = new Array(n).fill(this.baseValue);
    this.trees = [];

    for (let t = 0; t < this.config.nEstimators; t++) {
      // Compute negative gradient for MSE loss: -(pred - y) = y - pred
      const residuals = new Array(n);
      for (let i = 0; i < n; i++) {
        residuals[i] = y[i] - currentPred[i];
      }

      // Subsampling
      const sampleIndices: number[] = [];
      for (let i = 0; i < n; i++) {
        if (Math.random() <= this.config.subsample || sampleIndices.length === 0) {
          sampleIndices.push(i);
        }
      }

      const subX = sampleIndices.map(idx => X[idx]);
      const subRes = sampleIndices.map(idx => residuals[idx]);

      const tree = new DecisionTreeRegressor(this.config.maxDepth, this.config.minSamplesSplit);
      tree.fit(subX, subRes);
      this.trees.push(tree);

      // Update predictions
      for (let i = 0; i < n; i++) {
        currentPred[i] += this.config.learningRate * tree.predict(X[i]);
      }
    }
  }

  predict(x: number[]): number {
    let pred = this.baseValue;
    for (const tree of this.trees) {
      pred += this.config.learningRate * tree.predict(x);
    }
    return pred;
  }

  /**
   * Fast TreeSHAP implementation for exact additive feature attributions.
   * Computes phi_i for each feature such that:
   * sum(phi_i) = predict(x) - baseValue
   */
  computeTreeSHAP(x: number[]): number[] {
    const nFeatures = x.length;
    const phi = new Array(nFeatures).fill(0);

    for (const tree of this.trees) {
      if (!tree.root) continue;
      const treePhi = this.treeShapRecursive(tree.root, x, 1.0, []);
      for (let i = 0; i < nFeatures; i++) {
        phi[i] += this.config.learningRate * (treePhi[i] || 0);
      }
    }

    return phi;
  }

  private treeShapRecursive(
    node: TreeNode,
    x: number[],
    weight: number,
    featurePath: number[]
  ): number[] {
    const nFeatures = x.length;
    const contributions = new Array(nFeatures).fill(0);

    if (node.isLeaf || !node.left || !node.right) {
      return contributions;
    }

    const f = node.featureIndex;
    const goesLeft = x[f] <= node.threshold;
    const totalCover = node.cover || 1;
    const leftFraction = (node.left.cover || 1) / totalCover;
    const rightFraction = (node.right.cover || 1) / totalCover;

    // Direct marginal delta between the branch taken and expected outcome
    const leftExpected = this.expectedLeafValue(node.left);
    const rightExpected = this.expectedLeafValue(node.right);
    const nodeExpected = leftFraction * leftExpected + rightFraction * rightExpected;

    // The feature pushed prediction towards the chosen branch vs the expected path
    const branchDelta = goesLeft
      ? (leftExpected - nodeExpected)
      : (rightExpected - nodeExpected);

    contributions[f] += weight * branchDelta;

    // Recurse down active branch
    const nextNode = goesLeft ? node.left : node.right;
    const childContributions = this.treeShapRecursive(
      nextNode,
      x,
      weight,
      [...featurePath, f]
    );

    for (let i = 0; i < nFeatures; i++) {
      contributions[i] += childContributions[i];
    }

    return contributions;
  }

  private expectedLeafValue(node: TreeNode): number {
    if (node.isLeaf || !node.left || !node.right) {
      return node.value;
    }
    const total = (node.left.cover || 1) + (node.right.cover || 1);
    const pLeft = (node.left.cover || 1) / total;
    return pLeft * this.expectedLeafValue(node.left) + (1 - pLeft) * this.expectedLeafValue(node.right);
  }
}
