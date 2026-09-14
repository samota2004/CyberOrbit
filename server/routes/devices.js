import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { trustEngine } from "../../cyber/zero-trust/trust-engine.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    users: db.users
  });
});

router.get("/:id", (req, res) => {
  const user = db.getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found"
      }
    });
  }

  const userDevices = db.devices.filter(
    d => d.userId === user.id
  );

  const userEvents = db.activityEvents.filter(
    e => e.userId === user.id
  );

  const userIncidents = db.incidents.filter(
    i => i.userId === user.id
  );

  const trustHistory = db.getTrustHistory(user.id);

  res.json({
    success: true,
    user,
    devices: userDevices,
    recentEvents: userEvents.slice(0, 15),
    incidents: userIncidents,
    trustHistory
  });
});

router.post("/:id/freeze", requireSecurityAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found"
      }
    });
  }

  db.updateUserStatus(user.id, "FROZEN");

  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ADMIN_FREEZE_ACCOUNT",
    category: "ADMIN",
    severity: "CRITICAL",
    details: {
      admin: req.user?.name || "Security Administrator",
      reason:
        req.body.reason ||
        "Manual SOC containment lock"
    }
  });

  res.json({
    success: true,
    user,
    message: `Account ${user.employeeId} (${user.name}) frozen.`
  });
});

router.post("/:id/unfreeze", requireSecurityAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found"
      }
    });
  }

  db.updateUserStatus(user.id, "ACTIVE");
  db.updateUserRiskAndTrust(
    user.id,
    20,
    88,
    "LOW"
  );

  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ADMIN_RESTORE_ACCOUNT",
    category: "ADMIN",
    severity: "INFO",
    details: {
      admin: req.user?.name || "Security Administrator",
      note: "Account restored and baseline recalibrated."
    }
  });

  trustEngine.updateTrustScore(
    user,
    {
      userId: user.id,
      riskScore: 20,
      riskLevel: "LOW",
      trustScore: 88,
      contributingFactors: [],
      recommendedAction: "ALLOW",
      policyEnforced: "ALLOW",
      mlAnomalyScore: 0.05,
      isCrossDepartment: false,
      isOffHours: false,
      isUnknownDevice: false,
      explanationText:
        "Account access restored by administrator.",
      timestamp: new Date().toISOString()
    },
    "Administrative Account Unfreeze & Baseline Reset"
  );

  res.json({
    success: true,
    user,
    message:
      `Account ${user.employeeId} restored to active status.`
  });
});

router.post("/:id/reset-risk", requireSecurityAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "User not found"
      }
    });
  }

  db.updateUserRiskAndTrust(
    user.id,
    0,
    100,
    "LOW"
  );

  res.json({
    success: true,
    user: db.getUserById(user.id),
    message: "Risk profile reset successfully."
  });
});

export default router;