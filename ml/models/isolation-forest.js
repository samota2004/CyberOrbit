class IsolationForest {
  nTrees;
  maxSamples;
  trees = [];
  featureNames = [];
  cFactor = 1;
  rngSeed = 42;
  constructor(nTrees = 100, maxSamples = 256, seed = 42) {
    this.nTrees = nTrees;
    this.maxSamples = maxSamples;
    this.rngSeed = seed;
  }
  // Seeded Linear Congruential Generator for reproducible model training
  random() {
    this.rngSeed = (this.rngSeed * 1664525 + 1013904223) % 4294967296;
    return this.rngSeed / 4294967296;
  }
  /**
   * Average path length of unsuccessful search in a Binary Search Tree (c(n)).
   */
  static averagePathLength(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    const eulerMascheroni = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerMascheroni) - 2 * (n - 1) / n;
  }
  /**
   * Fit the Isolation Forest on a 2D feature matrix X (rows = samples, cols = features).
   */
  fit(X, featureNames = []) {
    const numSamples = X.length;
    if (numSamples === 0) {
      throw new Error("Cannot fit IsolationForest on empty dataset");
    }
    this.featureNames = featureNames.length === X[0].length ? featureNames : X[0].map((_, i) => `feature_${i}`);
    const subSize = Math.min(this.maxSamples, numSamples);
    this.cFactor = IsolationForest.averagePathLength(subSize);
    const maxDepth = Math.ceil(Math.log2(Math.max(subSize, 2)));
    this.trees = [];
    for (let t = 0; t < this.nTrees; t++) {
      const sampleIndices = this.sampleWithoutReplacement(numSamples, subSize);
      const subX = sampleIndices.map((i) => X[i]);
      const tree = this.buildTree(subX, 0, maxDepth);
      this.trees.push(tree);
    }
  }
  sampleWithoutReplacement(total, count) {
    const indices = Array.from({ length: total }, (_, i) => i);
    const chosen = [];
    for (let i = 0; i < count; i++) {
      const pick = Math.floor(this.random() * (indices.length - i)) + i;
      const temp = indices[i];
      indices[i] = indices[pick];
      indices[pick] = temp;
      chosen.push(indices[i]);
    }
    return chosen;
  }
  buildTree(X, currentDepth, maxDepth) {
    const n = X.length;
    if (currentDepth >= maxDepth || n <= 1) {
      return { size: n, isLeaf: true };
    }
    const nFeatures = X[0].length;
    let allSame = true;
    for (let i = 1; i < n; i++) {
      for (let j = 0; j < nFeatures; j++) {
        if (X[i][j] !== X[0][j]) {
          allSame = false;
          break;
        }
      }
      if (!allSame) break;
    }
    if (allSame) {
      return { size: n, isLeaf: true };
    }
    const candidateFeatures = [];
    const minMax = [];
    for (let f = 0; f < nFeatures; f++) {
      let min2 = X[0][f];
      let max2 = X[0][f];
      for (let i = 1; i < n; i++) {
        const v = X[i][f];
        if (v < min2) min2 = v;
        if (v > max2) max2 = v;
      }
      if (min2 < max2) {
        candidateFeatures.push(f);
        minMax[f] = { min: min2, max: max2 };
      }
    }
    if (candidateFeatures.length === 0) {
      return { size: n, isLeaf: true };
    }
    const splitFeature = candidateFeatures[Math.floor(this.random() * candidateFeatures.length)];
    const { min, max } = minMax[splitFeature];
    const splitValue = min + this.random() * (max - min);
    const leftX = [];
    const rightX = [];
    for (let i = 0; i < n; i++) {
      if (X[i][splitFeature] < splitValue) {
        leftX.push(X[i]);
      } else {
        rightX.push(X[i]);
      }
    }
    if (leftX.length === 0 || rightX.length === 0) {
      return { size: n, isLeaf: true };
    }
    return {
      splitFeature,
      splitValue,
      size: n,
      isLeaf: false,
      left: this.buildTree(leftX, currentDepth + 1, maxDepth),
      right: this.buildTree(rightX, currentDepth + 1, maxDepth)
    };
  }
  pathLength(x, node, currentDepth) {
    if (node.isLeaf) {
      return currentDepth + IsolationForest.averagePathLength(node.size);
    }
    const f = node.splitFeature;
    const v = node.splitValue;
    if (x[f] < v) {
      return node.left ? this.pathLength(x, node.left, currentDepth + 1) : currentDepth;
    } else {
      return node.right ? this.pathLength(x, node.right, currentDepth + 1) : currentDepth;
    }
  }
  /**
   * Predicts continuous anomaly score between 0.00 and 1.00 for sample vector x.
   */
  predictScore(x) {
    if (this.trees.length === 0) {
      throw new Error("Model has not been trained yet. Call fit() first.");
    }
    let totalPath = 0;
    for (const tree of this.trees) {
      totalPath += this.pathLength(x, tree, 0);
    }
    const meanPath = totalPath / this.trees.length;
    const exponent = -meanPath / (this.cFactor || 1);
    const score = Math.pow(2, exponent);
    return Math.max(0.01, Math.min(0.99, Number(score.toFixed(4))));
  }
  /**
   * Predict for a batch of samples.
   */
  predict(X) {
    return X.map((x) => this.predictScore(x));
  }
  /**
   * Model-agnostic path-based local attribution (SHAP-compatible marginal impact proxy).
   * Computes how much each feature perturbed from the dataset median reduces the path length (increases anomaly).
   */
  explainAttribution(x, baselineMedians) {
    const baseScore = this.predictScore(x);
    const attributions = [];
    for (let f = 0; f < x.length; f++) {
      const counterfactual = [...x];
      counterfactual[f] = baselineMedians[f] ?? 0;
      const counterfactualScore = this.predictScore(counterfactual);
      const impact = Number((baseScore - counterfactualScore).toFixed(4));
      const diff = Number((x[f] - (baselineMedians[f] ?? 0)).toFixed(2));
      attributions.push({
        feature: this.featureNames[f] || `feature_${f}`,
        impact,
        diff
      });
    }
    return attributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }
  /**
   * Model Serialization
   */
  serialize() {
    return {
      modelName: "Production Isolation Forest UEBA Anomaly Detector",
      version: "v2.4.0-isoforest",
      nTrees: this.nTrees,
      subsampleSize: this.maxSamples,
      featureDimension: this.featureNames.length,
      featureNames: this.featureNames,
      cFactor: this.cFactor,
      trainedAt: (/* @__PURE__ */ new Date()).toISOString(),
      trees: this.trees
    };
  }
  /**
   * Model Deserialization / Loading
   */
  loadArtifact(artifact) {
    this.nTrees = artifact.nTrees;
    this.maxSamples = artifact.subsampleSize;
    this.featureNames = artifact.featureNames;
    this.cFactor = artifact.cFactor;
    this.trees = artifact.trees;
  }
}
export {
  IsolationForest
};
