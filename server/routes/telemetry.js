import { Router } from "express";
import { db } from "../models/db.js";
import { policyEngine } from "../../cyber/policy-engine/policy-engine.js";
import { TelemetryNormalizer } from "../../cyber/telemetry/telemetry.js";;
import { mlEngine } from "../../ml/inference/ml-engine.js";
import { sseManager } from "../services/sse.js";

const router = Router();

router.post("/ingest", (req, res) => {
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
        u =>
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

    const features =
      mlEngine.extractFeatures(
        normalized,
        targetUser,
        targetDevice,
        targetResource
      );

    const mlAnomalyScore =
      mlEngine.predictAnomalyScore(
        features
      );

    const event = {
      id: `evt-tel-${Date.now()}`,
      eventId: `evt-tel-${Date.now()}`,
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
        targetDevice?.name,
      resourceId:
        targetResource?.id ||
        normalized.resourceId,
      resourceName:
        targetResource?.name,
      mlAnomalyScore,
      timestamp:
        normalized.timestamp ||
        new Date().toISOString()
    };

    const decision =
      policyEngine.evaluateAccess(
        targetUser,
        event,
        targetDevice,
        targetResource
      );

    event.riskContribution =
      decision.evaluation.riskScore;

    event.isAnomalous =
      mlAnomalyScore > 0.4;

    db.appendActivityEvent(event);

    sseManager.broadcastTelemetry({
      event,
      decision
    });

    res.json({
      success: true,
      event,
      decision,
      mlAnomalyScore
    });
  } catch (error) {
    console.error(
      "Telemetry ingest error:",
      error
    );

    res.status(500).json({
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