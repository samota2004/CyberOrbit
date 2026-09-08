import { db } from '../../server/models/db.js';

class RiskEngine {
  evaluateRisk(user, event, device, resource, mlResult) {
    const config = db.policyConfig || {
      crossDeptRiskPenalty: 28,
      untrustedDevicePenalty: 25,
      offHoursPenalty: 20,
      largeDownloadThresholdMB: 150
    };

    const contributingFactors = [];
    let baseScore = 10;

    // 1. Time Context & Off-Hours Detection
    const hour = event.timestamp ? new Date(event.timestamp).getHours() : new Date().getHours();
    const isOffHours = user.baseline?.normalWorkHours 
      ? (hour < user.baseline.normalWorkHours.start || hour > user.baseline.normalWorkHours.end)
      : (hour < 7 || hour > 20);

    if (isOffHours) {
      const penalty = config.offHoursPenalty || 20;
      baseScore += penalty;
      contributingFactors.push({
        factor: 'Off-Hours Activity',
        scoreImpact: penalty,
        description: `Activity initiated at ${hour}:00, outside baseline working window (${user.baseline?.normalWorkHours?.start || 7}:00 - ${user.baseline?.normalWorkHours?.end || 20}:00)`,
        category: 'TEMPORAL'
      });
    }

    // 2. Department & Resource Context (Cross-Department Access)
    let isCrossDepartment = false;
    if (resource && user.department) {
      const resourceDept = resource.department || resource.classification;
      const allowedDepts = user.baseline?.allowedDepartments || [user.department];
      if (resourceDept && !allowedDepts.includes(resourceDept) && resourceDept !== 'ALL') {
        isCrossDepartment = true;
        const penalty = config.crossDeptRiskPenalty || 28;
        baseScore += penalty;
        contributingFactors.push({
          factor: 'Cross-Department Access Anomaly',
          scoreImpact: penalty,
          description: `User in ${user.department} requested access to ${resource.name} categorized under ${resourceDept}`,
          category: 'RBAC_ABAC'
        });
      }
    }

    // 3. Device Posture & Trust
    let isUnknownDevice = false;
    if (device) {
      if (device.trustScore < 60 || device.postureStatus === 'NON_COMPLIANT' || device.status === 'UNTRUSTED') {
        isUnknownDevice = true;
        const penalty = config.untrustedDevicePenalty || 25;
        baseScore += penalty;
        contributingFactors.push({
          factor: 'Untrusted/Compromised Device',
          scoreImpact: penalty,
          description: `Device ${device.deviceName || device.id} posture status is ${device.postureStatus || 'POOR'} (Trust: ${device.trustScore || 40})`,
          category: 'DEVICE'
        });
      }
    }

    // 4. Data Transfer Volume
    const downloadMB = event.downloadVolumeMB || event.dataVolumeMB || (event.details?.downloadMB) || 0;
    const thresholdMB = config.largeDownloadThresholdMB || 150;
    if (downloadMB > thresholdMB) {
      const volumePenalty = Math.min(40, Math.floor((downloadMB - thresholdMB) / 20) + 15);
      baseScore += volumePenalty;
      contributingFactors.push({
        factor: 'High-Volume Data Exfiltration Risk',
        scoreImpact: volumePenalty,
        description: `Transfer volume of ${downloadMB} MB exceeds threshold of ${thresholdMB} MB`,
        category: 'DATA_VOLUME'
      });
    }

    // 5. ML Model Anomaly Score Blending
    let mlAnomalyScore = 0.05;
    if (mlResult) {
      const rfProb = mlResult.supervisedProbability ?? mlResult.probability ?? 0;
      const ifAnomaly = mlResult.isolationForestAnomaly ?? mlResult.isAnomaly ? 0.85 : 0.1;
      mlAnomalyScore = Math.max(rfProb, ifAnomaly);
      
      const mlPenalty = Math.round(mlAnomalyScore * 35);
      if (mlPenalty > 10) {
        baseScore += mlPenalty;
        contributingFactors.push({
          factor: 'Ensemble ML Anomaly (Random Forest + Isolation Forest)',
          scoreImpact: mlPenalty,
          description: `UEBA Machine Learning anomaly confidence rated at ${(mlAnomalyScore * 100).toFixed(1)}%`,
          category: 'ML_ENGINE'
        });
      }
    }

    // Final Risk Score calculation capped between 0 and 100
    const riskScore = Math.min(100, Math.max(0, Math.round(baseScore)));

    let riskLevel = 'LOW';
    if (riskScore >= 90) riskLevel = 'CRITICAL';
    else if (riskScore >= 75) riskLevel = 'HIGH';
    else if (riskScore >= 40) riskLevel = 'MEDIUM';

    let recommendedAction = 'ALLOW';
    if (riskScore >= 90) recommendedAction = 'FREEZE';
    else if (riskScore >= 75) recommendedAction = 'REQUIRE_APPROVAL';
    else if (riskScore >= 50) recommendedAction = 'REQUIRE_MFA';

    return {
      userId: user.id,
      riskScore,
      riskLevel,
      trustScore: user.currentTrustScore || 90,
      contributingFactors,
      recommendedAction,
      policyEnforced: recommendedAction,
      mlAnomalyScore,
      isCrossDepartment,
      isOffHours,
      isUnknownDevice,
      explanationText: contributingFactors.length > 0
        ? contributingFactors.map(f => f.description).join('; ')
        : 'Telemetry baseline normal. Low risk access pattern.',
      timestamp: new Date().toISOString()
    };
  }
}

export const riskEngine = new RiskEngine();
