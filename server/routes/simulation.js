import { Router } from "express";
import { db } from "../models/db.js";
import { policyEngine } from "../../cyber/policy-engine/policy-engine.js";
import { sseManager } from "../services/sse.js";

const router = Router();

router.post("/scenario/:scenarioId", (req, res) => {
  const scenarioId = req.params.scenarioId;

  const targetUser =
    db.getUserById(req.body.userId) ||
    db.users.find((u) => u.status === "ACTIVE");

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "No active user available."
      }
    });
  }

  let resultData = {};

  switch (scenarioId) {
    case "scenario-1-normal": {
      const normalDevice = db.getDeviceById(
        req.body.deviceId || "dev-hr-01"
      );

      const hrResource = db.getResourceById(
        req.body.resourceId || "res-hr-01"
      );

      const event = {
        id: `evt-sc1-${Date.now()}`,
        eventId: `evt-sc1-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: new Date().toISOString(),
        eventType: "FILE_ACCESS",
        resourceId: hrResource?.id,
        resourceName: hrResource?.name,
        resourceDepartment: hrResource?.department,
        resourceSensitivity: hrResource?.sensitivity,
        deviceId: normalDevice?.id || req.body.deviceId,
        deviceName:
          normalDevice?.deviceName || "Corporate Workstation",
        deviceTrustScore:
          normalDevice?.trustScore ?? 92,
        isUnknownDevice: false,
        ipAddress:
          normalDevice?.ipAddress ||
          normalDevice?.ip ||
          "10.240.14.92",
        location:
          normalDevice?.location ||
          "Corporate HQ",
        severity: "LOW",
        metadata: {
          downloadSizeMB: 14,
          fileCount: 5
        }
      };

      const decision = policyEngine.evaluateAccess(
        targetUser,
        event,
        normalDevice,
        hrResource
      );

      event.riskContribution =
        decision.evaluation.riskScore;

      event.mlAnomalyScore =
        decision.evaluation.mlAnomalyScore;

      db.appendActivityEvent(event);

      sseManager.broadcastSimulation(
        "Scenario 1: Baseline Normal Access",
        {
          event,
          decision,
          user: targetUser
        }
      );

      resultData = {
        scenario: "Scenario 1: Baseline Normal Access",
        event,
        decision,
        user: targetUser
      };

      break;
    }

    default:
      return res.status(400).json({
        success: false,
        error: {
          code: "UNKNOWN_SCENARIO",
          message: `Unknown scenario: ${scenarioId}`
        }
      });
  }

  return res.json({
    success: true,
    ...resultData
  });
});

export default router;