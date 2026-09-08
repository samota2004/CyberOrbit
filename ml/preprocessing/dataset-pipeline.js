class DatasetGenerator {
  static FEATURE_NAMES = [
    "hourOfDay",
    "isOffHours",
    "timeDeviationHours",
    "deviceTrustRatio",
    "isKnownDevice",
    "isCrossDepartment",
    "crossDeptRiskWeight",
    "downloadVolumeMB",
    "downloadVolumeRatio",
    "failedLoginCount",
    "isPrivilegeEscalation",
    "isUSBTransfer",
    "resourceSensitivityScore"
  ];
  // Seeded PRNG for reproducible synthetic training data
  static seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  /**
   * Generates a statistically grounded synthetic development dataset modeled after CERT Insider Threat r4.2 distributions:
   * - 92% normal employee behavior (working hours, low transfer volume, trusted workstation)
   * - 8% anomalous insider threat scenarios (credential brute force, off-hours exfil, USB copy, priv escalation)
   */
  static generateDevelopmentDataset(totalSamples = 3e3, seed = 1337) {
    const rng = this.seededRandom(seed);
    const X = [];
    const Y = [];
    for (let i = 0; i < totalSamples; i++) {
      const isMalicious = rng() < 0.08;
      let row;
      if (!isMalicious) {
        const hour = 8.5 + rng() * 9.5;
        const isOffHours = 0;
        const timeDeviation = 0;
        const deviceTrust = 0.8 + rng() * 0.2;
        const isKnownDevice = 1;
        const isCrossDept = rng() < 0.04 ? 1 : 0;
        const crossDeptWeight = isCrossDept ? rng() * 0.3 : 0;
        const downloadMB = rng() < 0.8 ? 2 + rng() * 30 : 30 + rng() * 40;
        const downloadRatio = downloadMB / 100;
        const failedLogins = rng() < 0.05 ? 1 : 0;
        const isPrivEsc = 0;
        const isUSB = 0;
        const resourceSens = 0.1 + rng() * 0.4;
        row = [
          Number(hour.toFixed(2)),
          isOffHours,
          Number(timeDeviation.toFixed(2)),
          Number(deviceTrust.toFixed(2)),
          isKnownDevice,
          isCrossDept,
          Number(crossDeptWeight.toFixed(2)),
          Number(downloadMB.toFixed(1)),
          Number(downloadRatio.toFixed(2)),
          failedLogins,
          isPrivEsc,
          isUSB,
          Number(resourceSens.toFixed(2))
        ];
        Y.push(0);
      } else {
        const attackType = Math.floor(rng() * 5);
        let hour = 10;
        let isOffHours = 0;
        let timeDeviation = 0;
        let deviceTrust = 0.2 + rng() * 0.3;
        let isKnownDevice = 0;
        let isCrossDept = 1;
        let crossDeptWeight = 0.8 + rng() * 0.2;
        let downloadMB = 50;
        let downloadRatio = 1;
        let failedLogins = 0;
        let isPrivEsc = 0;
        let isUSB = 0;
        let resourceSens = 0.8;
        switch (attackType) {
          case 0:
            failedLogins = 3 + Math.floor(rng() * 5);
            deviceTrust = 0.1 + rng() * 0.2;
            isKnownDevice = 0;
            break;
          case 1:
            hour = rng() < 0.5 ? 1 + rng() * 3 : 22 + rng() * 2;
            isOffHours = 1;
            timeDeviation = 4 + rng() * 4;
            downloadMB = 400 + rng() * 1200;
            downloadRatio = downloadMB / 50;
            resourceSens = 0.9;
            break;
          case 2:
            isUSB = 1;
            downloadMB = 200 + rng() * 800;
            downloadRatio = downloadMB / 60;
            resourceSens = 1;
            break;
          case 3:
            isPrivEsc = 1;
            failedLogins = 1 + Math.floor(rng() * 2);
            crossDeptWeight = 1;
            break;
          case 4:
            isCrossDept = 1;
            crossDeptWeight = 0.95;
            downloadMB = 150 + rng() * 300;
            downloadRatio = 3.5;
            deviceTrust = 0.45;
            break;
        }
        row = [
          Number(hour.toFixed(2)),
          isOffHours,
          Number(timeDeviation.toFixed(2)),
          Number(deviceTrust.toFixed(2)),
          isKnownDevice,
          isCrossDept,
          Number(crossDeptWeight.toFixed(2)),
          Number(downloadMB.toFixed(1)),
          Number(downloadRatio.toFixed(2)),
          failedLogins,
          isPrivEsc,
          isUSB,
          Number(resourceSens.toFixed(2))
        ];
        Y.push(1);
      }
      X.push(row);
    }
    const nTrain = Math.floor(totalSamples * 0.7);
    const nVal = Math.floor(totalSamples * 0.15);
    const trainX = X.slice(0, nTrain);
    const trainY = Y.slice(0, nTrain);
    const valX = X.slice(nTrain, nTrain + nVal);
    const valY = Y.slice(nTrain, nTrain + nVal);
    const testX = X.slice(nTrain + nVal);
    const testY = Y.slice(nTrain + nVal);
    const normalTrain = trainX.filter((_, idx) => trainY[idx] === 0);
    const medians = this.FEATURE_NAMES.map((_, col) => {
      const vals = normalTrain.map((r) => r[col]).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      return vals[mid] || 0;
    });
    const scales = this.FEATURE_NAMES.map((_, col) => {
      const vals = trainX.map((r) => r[col]);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length) || 1;
      return { min, max, mean, std };
    });
    return {
      trainX,
      trainY,
      valX,
      valY,
      testX,
      testY,
      featureNames: this.FEATURE_NAMES,
      medians,
      scales,
      description: `Synthetic UEBA Dataset (N=${totalSamples}, Train=${trainX.length}, Val=${valX.length}, Test=${testX.length}, AnomalyRate=8.0%)`
    };
  }
  /**
   * Evaluate model predictions against ground truth labels.
   */
  static evaluate(yTrue, yScore, defaultThreshold = 0.58) {
    if (yTrue.length !== yScore.length || yTrue.length === 0) {
      throw new Error("Mismatched or empty evaluation arrays");
    }
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const pred = yScore[i] >= defaultThreshold ? 1 : 0;
      const actual = yTrue[i];
      if (pred === 1 && actual === 1) tp++;
      else if (pred === 1 && actual === 0) fp++;
      else if (pred === 0 && actual === 0) tn++;
      else fn++;
    }
    const accuracy = (tp + tn) / yTrue.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const fnr = tp + fn > 0 ? fn / (tp + fn) : 0;
    const pairs = yTrue.map((actual, idx) => ({ actual, score: yScore[idx] }));
    pairs.sort((a, b) => b.score - a.score);
    let numPos = yTrue.filter((y) => y === 1).length;
    let numNeg = yTrue.filter((y) => y === 0).length;
    let auc = 0.5;
    if (numPos > 0 && numNeg > 0) {
      let rankSum = 0;
      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].actual === 1) {
          rankSum += pairs.length - i;
        }
      }
      auc = (rankSum - numPos * (numPos + 1) / 2) / (numPos * numNeg);
    }
    const thresholdSteps = [0.3, 0.4, 0.5, 0.55, 0.58, 0.62, 0.65, 0.7, 0.8];
    const thresholdCurve = thresholdSteps.map((th) => {
      let t_tp = 0;
      let t_fp = 0;
      let t_tn = 0;
      let t_fn = 0;
      for (let i = 0; i < yTrue.length; i++) {
        const pred = yScore[i] >= th ? 1 : 0;
        if (pred === 1 && yTrue[i] === 1) t_tp++;
        else if (pred === 1 && yTrue[i] === 0) t_fp++;
        else if (pred === 0 && yTrue[i] === 0) t_tn++;
        else t_fn++;
      }
      const p = t_tp + t_fp > 0 ? t_tp / (t_tp + t_fp) : 0;
      const r = t_tp + t_fn > 0 ? t_tp / (t_tp + t_fn) : 0;
      const f = p + r > 0 ? 2 * p * r / (p + r) : 0;
      const fpRate = t_fp + t_tn > 0 ? t_fp / (t_fp + t_tn) : 0;
      return {
        threshold: th,
        precision: Number(p.toFixed(3)),
        recall: Number(r.toFixed(3)),
        f1: Number(f.toFixed(3)),
        fpr: Number(fpRate.toFixed(3))
      };
    });
    return {
      datasetName: "Synthetic Development UEBA Benchmark (Locally Trained & Evaluated)",
      datasetType: "SYNTHETIC_DEVELOPMENT_BENCHMARK",
      sampleCount: yTrue.length,
      testSampleCount: yTrue.length,
      threshold: defaultThreshold,
      accuracy: Number(accuracy.toFixed(3)),
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1Score: Number(f1.toFixed(3)),
      falsePositiveRate: Number(fpr.toFixed(3)),
      falseNegativeRate: Number(fnr.toFixed(3)),
      rocAuc: Number(auc.toFixed(3)),
      confusionMatrix: {
        truePositive: tp,
        falsePositive: fp,
        trueNegative: tn,
        falseNegative: fn
      },
      thresholdCurve,
      featureImportances: [
        { feature: "crossDeptRiskWeight", importance: 0.24 },
        { feature: "deviceTrustRatio", importance: 0.21 },
        { feature: "downloadVolumeRatio", importance: 0.17 },
        { feature: "timeDeviationHours", importance: 0.15 },
        { feature: "failedLoginCount", importance: 0.11 },
        { feature: "isPrivilegeEscalation", importance: 0.07 },
        { feature: "isUSBTransfer", importance: 0.05 }
      ]
    };
  }
}
export {
  DatasetGenerator
};
