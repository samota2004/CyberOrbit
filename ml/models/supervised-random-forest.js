class DecisionTree {
  root = null;
  maxDepth;
  minSamplesSplit;
  maxFeatures;
  rng;
  constructor(maxDepth = 8, minSamplesSplit = 5, maxFeatures = 5, rng) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.maxFeatures = maxFeatures;
    this.rng = rng;
  }
  fit(X, Y, featureNames) {
    const indices = X.map((_, i) => i);
    this.root = this.buildTree(X, Y, indices, 0, featureNames);
  }
  buildTree(X, Y, sampleIndices, depth, featureNames) {
    const numSamples = sampleIndices.length;
    if (numSamples === 0) {
      return { isLeaf: true, prediction: 0, probability: 0, sampleCount: 0 };
    }
    const posCount = sampleIndices.filter((idx) => Y[idx] === 1).length;
    const probability = posCount / numSamples;
    const prediction = probability >= 0.5 ? 1 : 0;
    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit || posCount === 0 || posCount === numSamples) {
      return {
        isLeaf: true,
        prediction,
        probability,
        sampleCount: numSamples
      };
    }
    const totalFeatures = X[0].length;
    const allFeatureIndices = Array.from({ length: totalFeatures }, (_, i) => i);
    for (let i = allFeatureIndices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [allFeatureIndices[i], allFeatureIndices[j]] = [allFeatureIndices[j], allFeatureIndices[i]];
    }
    const selectedFeatures = allFeatureIndices.slice(0, Math.min(this.maxFeatures, totalFeatures));
    let bestGiniGain = -1;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices = [];
    let bestRightIndices = [];
    const currentGini = this.calculateGini(sampleIndices, Y);
    for (const fIdx of selectedFeatures) {
      const values = sampleIndices.map((idx) => X[idx][fIdx]).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(values.length / 10));
      for (let k = 0; k < values.length - 1; k += step) {
        if (values[k] === values[k + 1]) continue;
        const threshold = (values[k] + values[k + 1]) / 2;
        const left = [];
        const right = [];
        for (const idx of sampleIndices) {
          if (X[idx][fIdx] <= threshold) {
            left.push(idx);
          } else {
            right.push(idx);
          }
        }
        if (left.length === 0 || right.length === 0) continue;
        const leftGini = this.calculateGini(left, Y);
        const rightGini = this.calculateGini(right, Y);
        const weightedGini = left.length / numSamples * leftGini + right.length / numSamples * rightGini;
        const gain = currentGini - weightedGini;
        if (gain > bestGiniGain) {
          bestGiniGain = gain;
          bestFeature = fIdx;
          bestThreshold = threshold;
          bestLeftIndices = left;
          bestRightIndices = right;
        }
      }
    }
    if (bestGiniGain <= 1e-4 || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return {
        isLeaf: true,
        prediction,
        probability,
        sampleCount: numSamples
      };
    }
    const leftNode = this.buildTree(X, Y, bestLeftIndices, depth + 1, featureNames);
    const rightNode = this.buildTree(X, Y, bestRightIndices, depth + 1, featureNames);
    return {
      isLeaf: false,
      featureIndex: bestFeature,
      featureName: featureNames[bestFeature],
      threshold: bestThreshold,
      left: leftNode,
      right: rightNode,
      probability,
      sampleCount: numSamples
    };
  }
  calculateGini(indices, Y) {
    if (indices.length === 0) return 0;
    let pos = 0;
    for (const idx of indices) {
      if (Y[idx] === 1) pos++;
    }
    const p1 = pos / indices.length;
    const p0 = 1 - p1;
    return 1 - (p0 * p0 + p1 * p1);
  }
  predictRow(x) {
    let curr = this.root;
    while (curr && !curr.isLeaf) {
      if (curr.featureIndex !== void 0 && curr.threshold !== void 0) {
        if (x[curr.featureIndex] <= curr.threshold) {
          curr = curr.left || null;
        } else {
          curr = curr.right || null;
        }
      } else {
        break;
      }
    }
    return {
      prediction: curr?.prediction ?? 0,
      probability: curr?.probability ?? 0
    };
  }
}
class SupervisedRandomForest {
  trees = [];
  featureNames = [];
  nTrees;
  maxDepth;
  minSamplesSplit;
  isTrained = false;
  seed;
  constructor(nTrees = 25, maxDepth = 8, minSamplesSplit = 6, seed = 42) {
    this.nTrees = nTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.seed = seed;
  }
  createRng(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  fit(X, Y, featureNames) {
    this.featureNames = featureNames;
    this.trees = [];
    const nSamples = X.length;
    const maxFeatures = Math.max(2, Math.floor(Math.sqrt(featureNames.length)));
    console.log(`[RandomForest] Training ${this.nTrees} trees on N=${nSamples} samples with D=${featureNames.length} features...`);
    for (let t = 0; t < this.nTrees; t++) {
      const treeRng = this.createRng(this.seed + t * 7919);
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit, maxFeatures, treeRng);
      const bootstrapX = [];
      const bootstrapY = [];
      for (let i = 0; i < nSamples; i++) {
        const randIdx = Math.floor(treeRng() * nSamples);
        bootstrapX.push(X[randIdx]);
        bootstrapY.push(Y[randIdx]);
      }
      tree.fit(bootstrapX, bootstrapY, featureNames);
      this.trees.push(tree);
    }
    this.isTrained = true;
    console.log(`[RandomForest] Ensemble fit complete with ${this.trees.length} trees.`);
  }
  /**
   * Predict continuous probability P(is_anomaly = 1)
   */
  predictProbability(x) {
    if (!this.isTrained || this.trees.length === 0) return 0;
    let sumProb = 0;
    for (const tree of this.trees) {
      const { probability } = tree.predictRow(x);
      sumProb += probability;
    }
    return sumProb / this.trees.length;
  }
  /**
   * Predict binary class at a given decision threshold
   */
  predictClass(x, threshold = 0.5) {
    return this.predictProbability(x) >= threshold ? 1 : 0;
  }
  /**
   * Predict batch of samples
   */
  predictBatch(X) {
    return X.map((x) => this.predictProbability(x));
  }
  /**
   * Compute feature importances across all trees based on split frequency & depth
   */
  computeFeatureImportances() {
    const counts = {};
    this.featureNames.forEach((f) => counts[f] = 0);
    const traverse = (node, weight) => {
      if (!node || node.isLeaf) return;
      if (node.featureName && counts[node.featureName] !== void 0) {
        counts[node.featureName] += weight;
      }
      if (node.left) traverse(node.left, weight * 0.85);
      if (node.right) traverse(node.right, weight * 0.85);
    };
    for (const tree of this.trees) {
      if (tree.root) traverse(tree.root, 1);
    }
    const totalWeight = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const result = Object.entries(counts).map(([feature, weight]) => ({
      feature,
      importance: Number((weight / totalWeight).toFixed(4))
    }));
    result.sort((a, b) => b.importance - a.importance);
    return result;
  }
  /**
   * Serialize model to JSON artifact
   */
  serialize(trainingSampleCount, anomalyRate) {
    return {
      modelType: "SUPERVISED_RANDOM_FOREST",
      version: "v3.0.0-randomforest-15k",
      trainedAt: (/* @__PURE__ */ new Date()).toISOString(),
      nTrees: this.nTrees,
      maxDepth: this.maxDepth,
      minSamplesSplit: this.minSamplesSplit,
      featureNames: this.featureNames,
      trees: this.trees.map((t) => t.root),
      trainingSampleCount,
      anomalyRate
    };
  }
  /**
   * Deserialize model from JSON artifact
   */
  deserialize(artifact) {
    this.nTrees = artifact.nTrees;
    this.maxDepth = artifact.maxDepth;
    this.minSamplesSplit = artifact.minSamplesSplit;
    this.featureNames = artifact.featureNames;
    this.trees = artifact.trees.map((rootNode) => {
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit, 5, () => 0.5);
      tree.root = rootNode;
      return tree;
    });
    this.isTrained = true;
  }
}
export {
  DecisionTree,
  SupervisedRandomForest
};
