import { Router } from "express";
import { db } from "../models/db.js";
import { policyEngine } from "../../cyber/policy-engine/policy-engine.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    resources: db.resources
  });
});

router.get("/:id", (req, res) => {
  const resource = db.getResourceById(req.params.id);

  if (!resource) {
    return res.status(404).json({
      success: false,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: "Resource not found"
      }
    });
  }

  return res.json({
    success: true,
    resource
  });
});

router.post("/test-access", (req, res) => {
  const {
    userId,
    resourceId,
    deviceId
  } = req.body;

  const user = db.getUserById(userId);
  const resource = db.getResourceById(resourceId);

  if (!user || !resource) {
    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "User or Resource not found"
      }
    });
  }

  const device = deviceId
    ? db.getDeviceById(deviceId)
    : user.activeDeviceId
      ? db.getDeviceById(user.activeDeviceId)
      : undefined;

  const accessEvent = {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    eventType: "RESOURCE_ACCESS",
    resourceId: resource.id,
    resourceName: resource.name,
    resourceDepartment: resource.department,
    resourceSensitivity: resource.sensitivity,
    deviceId: device?.id || "dev-untrusted",
    deviceName:
      device?.deviceName ||
      "Unregistered Workstation",
    deviceTrustScore:
      device?.trustScore ?? 30,
    isUnknownDevice:
      !device?.isTrusted,
    ipAddress:
      device?.ipAddress ||
      device?.ip ||
      "10.240.14.99",
    location:
      device?.location ||
      "San Francisco, US",
    severity: "LOW",
    timestamp: new Date().toISOString()
  };

  const decision =
    policyEngine.evaluateAccess(
      user,
      accessEvent,
      device,
      resource
    );

  resource.accessCount =
    (resource.accessCount || 0) + 1;

  const eventId = `evt-access-${Date.now()}`;

  const fullActivityEvent = {
    id: eventId,
    eventId,
    ...accessEvent,
    riskContribution:
      decision.evaluation.riskScore,
    mlAnomalyScore:
      decision.evaluation.mlAnomalyScore,
    isAnomalous:
      decision.evaluation.riskScore >=
      db.policyConfig.highRiskMax
  };

  db.appendActivityEvent(fullActivityEvent);

  return res.json({
    success: true,
    event: fullActivityEvent,
    decision
  });
});

export default router;