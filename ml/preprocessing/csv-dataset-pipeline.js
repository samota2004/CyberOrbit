import fs from "fs";
import readline from "readline";
import path from "path";
class CsvDatasetPipeline {
  static FEATURE_NAMES = [
    "hourOfDay",
    "isOffHours",
    "failedLoginAttempts",
    "filesAffected",
    "usbBluetoothUsage",
    "bytesSentKB",
    "bytesReceivedKB",
    "totalBytesKB",
    "bytesSentRatio",
    "isHighEgressVolume",
    "isSuspiciousDestination",
    "isShellCommandExecution",
    "isMaliciousShellPattern",
    "isAuthFailure",
    "statusIsBlocked",
    "statusIsFailure",
    "eventType_LOGIN",
    "eventType_FILE_DOWNLOAD",
    "eventType_FILE_ACCESS",
    "eventType_USB_ACTIVITY",
    "eventType_SHELL_EXECUTION",
    "eventType_NETWORK_CONNECTION",
    "dept_SECURITY",
    "dept_FINANCE",
    "dept_ENGINEERING"
  ];
  static EXCLUDED_IDENTIFIERS = [
    "user_id",
    "username",
    "ip_address",
    "details",
    "action"
  ];
  static EXCLUSION_JUSTIFICATION = 'Direct identifiers (user_id, username, ip_address) are strictly excluded to prevent overfitting, identity memorization, and subnet bias, ensuring the model learns invariant behavioral anomaly patterns applicable to new unobserved users and IPs. The "action" field is excluded to prevent target leakage as it represents downstream post-incident enforcement decisions.';
  /**
   * Parse CSV line with quoted commas
   */
  static parseCsvLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields.map((f) => f.trim());
  }
  /**
   * Load, inspect and parse the 15,000-row CSV file
   */
  static async loadCsvDataset(customFilePath) {
    const candidatePaths = [
      customFilePath,
      path.join(process.cwd(), "..", "ml", "datasets", "cybersecurity_15k_dataset.csv"),
      path.join(process.cwd(), "data", "cybersecurity_15k_dataset.csv"),
      path.join(process.cwd(), "data", "cybersecurity_dataset.csv"),
      path.join(process.cwd(), "cybersecurity_dataset.csv"),
      path.join(process.cwd(), "server", "data", "cybersecurity_15k_dataset.csv")
    ].filter(Boolean);
    let resolvedPath = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        resolvedPath = p;
        break;
      }
    }
    if (!resolvedPath) {
      throw new Error(`Cybersecurity CSV dataset file not found. Checked locations: ${candidatePaths.join(", ")}`);
    }
    console.log(`[CsvPipeline] Ingesting CSV dataset from: ${resolvedPath}`);
    const fileStream = fs.createReadStream(resolvedPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    const records = [];
    let headers = [];
    let lineNumber = 0;
    for await (const line of rl) {
      if (!line.trim()) continue;
      lineNumber++;
      const fields = this.parseCsvLine(line);
      if (lineNumber === 1) {
        headers = fields.map((h) => h.toLowerCase());
        continue;
      }
      const getVal = (colName) => {
        const idx = headers.indexOf(colName.toLowerCase());
        return idx >= 0 && idx < fields.length ? fields[idx] : "";
      };
      const record = {
        timestamp: getVal("timestamp"),
        user_id: getVal("user_id"),
        username: getVal("username"),
        department: getVal("department") || "ENGINEERING",
        ip_address: getVal("ip_address"),
        event_type: getVal("event_type") || "API_REQUEST",
        failed_login_attempts: parseInt(getVal("failed_login_attempts") || "0", 10) || 0,
        files_affected: parseInt(getVal("files_affected") || "0", 10) || 0,
        usb_bluetooth_usage: parseInt(getVal("usb_bluetooth_usage") || "0", 10) || 0,
        bytes_sent_kb: parseFloat(getVal("bytes_sent_kb") || "0") || 0,
        bytes_received_kb: parseFloat(getVal("bytes_received_kb") || "0") || 0,
        destination_site: getVal("destination_site"),
        application_shell_cmd: getVal("application_shell_cmd") || "none",
        status: (getVal("status") || "SUCCESS").toUpperCase(),
        is_anomaly: parseInt(getVal("is_anomaly") || "0", 10) || 0,
        action: (getVal("action") || "ALLOW").toUpperCase(),
        details: getVal("details")
      };
      records.push(record);
    }
    console.log(`[CsvPipeline] Ingestion completed. Parsed ${records.length} records.`);
    return records;
  }
  /**
   * Inspect dataset statistics, missing values, categorical counts, and class distribution
   */
  static inspectDataset(records, filePath) {
    let normalCount = 0;
    let anomalyCount = 0;
    const missing = {};
    const depts = {};
    const eventTypes = {};
    const statuses = {};
    records.forEach((r) => {
      if (r.is_anomaly === 1) anomalyCount++;
      else normalCount++;
      depts[r.department] = (depts[r.department] || 0) + 1;
      eventTypes[r.event_type] = (eventTypes[r.event_type] || 0) + 1;
      statuses[r.status] = (statuses[r.status] || 0) + 1;
      if (!r.timestamp) missing["timestamp"] = (missing["timestamp"] || 0) + 1;
      if (!r.user_id) missing["user_id"] = (missing["user_id"] || 0) + 1;
      if (!r.department) missing["department"] = (missing["department"] || 0) + 1;
      if (isNaN(r.bytes_sent_kb)) missing["bytes_sent_kb"] = (missing["bytes_sent_kb"] || 0) + 1;
      if (isNaN(r.bytes_received_kb)) missing["bytes_received_kb"] = (missing["bytes_received_kb"] || 0) + 1;
    });
    return {
      filePath,
      totalRecords: records.length,
      normalCount,
      anomalyCount,
      anomalyRatePercent: Number((anomalyCount / records.length * 100).toFixed(2)),
      columns: Object.keys(records[0] || {}),
      missingValues: missing,
      categoricalValues: {
        departments: depts,
        eventTypes,
        statuses
      },
      excludedDirectIdentifiers: this.EXCLUDED_IDENTIFIERS,
      exclusionJustification: this.EXCLUSION_JUSTIFICATION
    };
  }
  /**
   * Transform raw telemetry record into mathematical feature vector
   */
  static extractFeatureVector(record) {
    const time = record.timestamp ? new Date(record.timestamp) : /* @__PURE__ */ new Date();
    const hourOfDay = isNaN(time.getTime()) ? 12 : time.getUTCHours() + time.getUTCMinutes() / 60;
    const isOffHours = record.isOffHours !== void 0 ? record.isOffHours ? 1 : 0 : hourOfDay < 7.5 || hourOfDay > 18.5 ? 1 : 0;
    const failedLogins = Number(
      record.failed_login_attempts ?? record.failedLoginAttempts ?? record.failedAuthCount ?? 0
    );
    const filesAffected = Number(
      record.files_affected ?? record.filesAffected ?? 0
    );
    const usbUsage = Number(record.usb_bluetooth_usage ?? record.usbBluetoothUsage ?? 0) > 0 || Boolean(record.isUsbTransfer) || String(record.event_type || record.eventType || "").toUpperCase() === "USB_ACTIVITY" ? 1 : 0;
    const bytesSent = Number(
      record.bytes_sent_kb ?? record.bytesSentKB ?? (record.downloadSizeMB ? record.downloadSizeMB * 1024 : 0) ?? (record.bytesTransferred ? record.bytesTransferred / 1024 : 0) ?? 0
    );
    const bytesReceived = Number(
      record.bytes_received_kb ?? record.bytesReceivedKB ?? 0
    );
    const totalBytes = bytesSent + bytesReceived;
    const bytesSentRatio = bytesSent / (totalBytes + 1);
    const isHighEgress = bytesSent > 1e4 ? 1 : 0;
    const dest = String(
      record.destination_site || record.destinationSite || record.resourceName || record.rawMetadata?.destination_site || ""
    ).toLowerCase();
    const suspiciousDestPatterns = [
      "c2-",
      ".xyz",
      ".ru",
      ".cc",
      ".to",
      "pastebin",
      "dropzone",
      "darknet",
      "ngrok",
      "evil",
      "attacker"
    ];
    const isSuspiciousDest = suspiciousDestPatterns.some((p) => dest.includes(p)) ? 1 : 0;
    const cmd = String(
      record.application_shell_cmd || record.applicationShellCmd || record.shellCommand || record.command || record.rawMetadata?.application_shell_cmd || "none"
    ).toLowerCase();
    const isShellCmd = cmd !== "none" && cmd.trim() !== "" ? 1 : 0;
    const maliciousCmdPatterns = [
      "powershell",
      "bypass",
      "enc ",
      "cat /etc/shadow",
      "mimikatz",
      "sekurlsa",
      "chmod 777",
      "curl -s",
      "certutil",
      "nc -",
      "dev/tcp",
      "whoami /priv",
      "sudo",
      "root",
      "reverse shell",
      "bash -i",
      "/bin/sh",
      "jabc"
    ];
    const isMaliciousCmd = maliciousCmdPatterns.some((p) => cmd.includes(p)) ? 1 : 0;
    const rawStatus = String(
      record.status || (failedLogins > 0 ? "FAILURE" : "SUCCESS")
    ).toUpperCase();
    const isAuthFailure = failedLogins > 0 || rawStatus === "FAILURE" ? 1 : 0;
    const statusBlocked = rawStatus === "BLOCKED" ? 1 : 0;
    const statusFailure = rawStatus === "FAILURE" ? 1 : 0;
    const evType = String(record.event_type || record.eventType || "").toUpperCase();
    const evLogin = evType === "LOGIN" || evType === "AUTH" || evType === "FAILED_LOGIN" ? 1 : 0;
    const evFileDl = evType === "FILE_DOWNLOAD" || evType === "DOWNLOAD" ? 1 : 0;
    const evFileAccess = evType === "FILE_ACCESS" || evType === "RESOURCE_ACCESS" ? 1 : 0;
    const evUsb = evType === "USB_ACTIVITY" || usbUsage === 1 ? 1 : 0;
    const evShell = evType === "SHELL_EXECUTION" || evType === "PRIVILEGE_CHANGE" || isShellCmd === 1 ? 1 : 0;
    const evNet = evType === "NETWORK_CONNECTION" || isSuspiciousDest === 1 ? 1 : 0;
    const dept = String(record.department || record.userDepartment || "").toUpperCase();
    const deptSec = dept === "SECURITY" ? 1 : 0;
    const deptFin = dept === "FINANCE" ? 1 : 0;
    const deptEng = dept === "ENGINEERING" ? 1 : 0;
    return [
      Number(hourOfDay.toFixed(2)),
      isOffHours,
      failedLogins,
      filesAffected,
      usbUsage,
      Number(bytesSent.toFixed(1)),
      Number(bytesReceived.toFixed(1)),
      Number(totalBytes.toFixed(1)),
      Number(bytesSentRatio.toFixed(3)),
      isHighEgress,
      isSuspiciousDest,
      isShellCmd,
      isMaliciousCmd,
      isAuthFailure,
      statusBlocked,
      statusFailure,
      evLogin,
      evFileDl,
      evFileAccess,
      evUsb,
      evShell,
      evNet,
      deptSec,
      deptFin,
      deptEng
    ];
  }
  /**
   * Split dataset into 80% train and 20% test with stratified class sampling
   */
  static prepareDatasetSplit(records, testRatio = 0.2) {
    const inspection = this.inspectDataset(records, "CSV Source File (15,000 rows)");
    const normalRecords = records.filter((r) => r.is_anomaly === 0);
    const anomalyRecords = records.filter((r) => r.is_anomaly === 1);
    const normalTestCount = Math.floor(normalRecords.length * testRatio);
    const anomalyTestCount = Math.floor(anomalyRecords.length * testRatio);
    const trainRecords = [
      ...normalRecords.slice(normalTestCount),
      ...anomalyRecords.slice(anomalyTestCount)
    ];
    const testRecords = [
      ...normalRecords.slice(0, normalTestCount),
      ...anomalyRecords.slice(0, anomalyTestCount)
    ];
    console.log(`[CsvPipeline] Split: ${trainRecords.length} Train rows (${((1 - testRatio) * 100).toFixed(0)}%), ${testRecords.length} Test rows (${(testRatio * 100).toFixed(0)}%).`);
    const trainX = trainRecords.map((r) => this.extractFeatureVector(r));
    const trainY = trainRecords.map((r) => r.is_anomaly);
    const testX = testRecords.map((r) => this.extractFeatureVector(r));
    const testY = testRecords.map((r) => r.is_anomaly);
    const normalTrainRows = trainX.filter((_, idx) => trainY[idx] === 0);
    const trainNormalMedians = this.FEATURE_NAMES.map((_, col) => {
      const vals = normalTrainRows.map((r) => r[col]).sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      return vals[mid] ?? 0;
    });
    const trainMeans = this.FEATURE_NAMES.map((_, col) => {
      const vals = trainX.map((r) => r[col]);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    const trainStds = this.FEATURE_NAMES.map((_, col) => {
      const vals = trainX.map((r) => r[col]);
      const mean = trainMeans[col];
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      return Math.sqrt(variance) || 1;
    });
    return {
      trainX,
      trainY,
      testX,
      testY,
      featureNames: this.FEATURE_NAMES,
      trainNormalMedians,
      trainMeans,
      trainStds,
      inspection
    };
  }
  /**
   * Empirical test set evaluation with exact metrics
   */
  static evaluatePredictions(yTrue, yScore, threshold = 0.5, featureImportances = []) {
    if (yTrue.length !== yScore.length || yTrue.length === 0) {
      throw new Error("Mismatched or empty test labels and predictions");
    }
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    for (let i = 0; i < yTrue.length; i++) {
      const pred = yScore[i] >= threshold ? 1 : 0;
      const actual = yTrue[i];
      if (pred === 1 && actual === 1) tp++;
      else if (pred === 1 && actual === 0) fp++;
      else if (pred === 0 && actual === 0) tn++;
      else fn++;
    }
    const accuracy = (tp + tn) / yTrue.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
    const falsePositiveRate = fp + tn > 0 ? fp / (fp + tn) : 0;
    const falseNegativeRate = tp + fn > 0 ? fn / (tp + fn) : 0;
    const pairs = yTrue.map((actual, idx) => ({ actual, score: yScore[idx] }));
    pairs.sort((a, b) => b.score - a.score);
    const numPos = yTrue.filter((y) => y === 1).length;
    const numNeg = yTrue.filter((y) => y === 0).length;
    let rocAuc = 0.5;
    if (numPos > 0 && numNeg > 0) {
      let rankSum = 0;
      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].actual === 1) {
          rankSum += pairs.length - i;
        }
      }
      rocAuc = (rankSum - numPos * (numPos + 1) / 2) / (numPos * numNeg);
    }
    const thresholdSteps = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
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
      const fpr = t_fp + t_tn > 0 ? t_fp / (t_fp + t_tn) : 0;
      return {
        threshold: th,
        precision: Number(p.toFixed(3)),
        recall: Number(r.toFixed(3)),
        f1: Number(f.toFixed(3)),
        fpr: Number(fpr.toFixed(3))
      };
    });
    return {
      datasetSource: "15,000-Row Real Telemetry CSV Dataset (Held-Out Test Split)",
      totalRecords: 15e3,
      trainRecords: 12e3,
      testRecords: yTrue.length,
      anomalyCountTotal: numPos,
      anomalyRatePercent: Number((numPos / yTrue.length * 100).toFixed(2)),
      threshold,
      accuracy: Number(accuracy.toFixed(4)),
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      f1Score: Number(f1Score.toFixed(4)),
      rocAuc: Number(rocAuc.toFixed(4)),
      falsePositiveRate: Number(falsePositiveRate.toFixed(4)),
      falseNegativeRate: Number(falseNegativeRate.toFixed(4)),
      confusionMatrix: {
        truePositive: tp,
        falsePositive: fp,
        trueNegative: tn,
        falseNegative: fn
      },
      thresholdCurve,
      featureImportances
    };
  }
}
export {
  CsvDatasetPipeline
};
