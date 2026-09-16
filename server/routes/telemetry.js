import { Router } from "express";
import { db } from "../models/db.js";
import { policyEngine } from "../../cyber/policy-engine/policy-engine.js";
import { TelemetryNormalizer } from "../../cyber/telemetry/telemetry.js";
import { predictWithMLService } from "../services/ml-service.js";
import {
  updateFeatureState,
  getUserDayFeatures,
  featureState
} from "../services/ml-feature-aggregator.js";
import { sseManager } from "../services/sse.js";

const router = Router();

function getRiskLevel(riskScore) {
  const risk = Number(riskScore) || 0;

  if (risk < 40) {
    return "LOW";
  }

  if (risk < 60) {
    return "MEDIUM";
  }

  if (risk < 90) {
    return "HIGH";
  }

  return "CRITICAL";
}

router.post("/ingest", async (req, res) => {
  try {
    const normalized =
      TelemetryNormalizer.normalize(
        req.body
      );

    const targetUser =
      db.getUserById(
        normalized.userId
      ) ||
      db.users.find(
        (u) =>
          u.email?.toLowerCase() ===
            String(
              normalized.userId || ""
            ).toLowerCase() ||
          u.name?.toLowerCase() ===
            String(
              normalized.userId || ""
            ).toLowerCase()
      );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message:
            "Telemetry user not found."
        }
      });
    }

    const targetResource =
      normalized.resourceId
        ? db.getResourceById(
            normalized.resourceId
          )
        : undefined;

    const targetDevice =
      normalized.deviceId
        ? db.getDeviceById(
            normalized.deviceId
          )
        : targetUser.activeDeviceId
          ? db.getDeviceById(
              targetUser.activeDeviceId
            )
          : undefined;

    const event = {
      id: `evt-tel-${Date.now()}`,
      eventId: normalized.eventId,
      ...normalized,
      userId: targetUser.id,
      userEmail: targetUser.email,
      userName: targetUser.name,
      userDepartment:
        targetUser.department,
      deviceId:
        targetDevice?.id ||
        normalized.deviceId,
      deviceName:
        targetDevice?.deviceName ||
        targetDevice?.name ||
        normalized.deviceName,
      resourceId:
        targetResource?.id ||
        normalized.resourceId,
      resourceName:
        targetResource?.name ||
        normalized.resourceName,
      timestamp:
        normalized.timestamp ||
        new Date().toISOString()
    };

    const aggregation =
      updateFeatureState(
        featureState,
        event
      );

    const userDayFeatures =
      getUserDayFeatures(
        featureState,
        targetUser.id,
        aggregation.date
      );

    const mlResult =
      await predictWithMLService(
        targetUser.id,
        userDayFeatures.features
      );

    event.mlThreatProbability =
      mlResult.threat_probability;

    event.mlAnomalyScore =
      mlResult.threat_probability;

    event.contextualRiskScore =
      mlResult.contextual_risk_score;

    event.riskScore =
      mlResult.risk_score;

    event.trustScore =
      mlResult.trust_score;

    event.policyAction =
      mlResult.policy_action;

    event.policyReason =
      mlResult.policy_reason;

    event.xaiReasons =
      mlResult.xai_reasons;

    event.isAnomalous =
      mlResult.risk_score >= 40;

    const decision =
      policyEngine.evaluateAccess(
        targetUser,
        event,
        targetDevice,
        targetResource
      );

    event.riskContribution =
      mlResult.risk_score;

    const riskLevel =
      getRiskLevel(
        mlResult.risk_score
      );

    db.updateUserRiskAndTrust(
      targetUser.id,
      mlResult.risk_score,
      mlResult.trust_score,
      riskLevel
    );

    db.appendActivityEvent(event);

    sseManager.broadcast(
      "TELEMETRY_EVENT",
      {
        event,
        decision,
        ml: mlResult,
        features:
          userDayFeatures.features
      }
    );

    return res.json({
      success: true,
      event,
      decision,
      ml: mlResult,
      features:
        userDayFeatures.features
    });
  } catch (error) {
    console.error(
      "Telemetry ingest error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "TELEMETRY_ERROR",
        message:
          error.message ||
          "Unable to ingest telemetry."
      }
    });
  }
});

export default router;