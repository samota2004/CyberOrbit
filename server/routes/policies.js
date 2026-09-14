import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { sseManager } from "../services/sse.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    config: db.policyConfig
  });
});

router.patch(
  "/",
  requireSecurityAdmin,
  (req, res) => {
    const updates = req.body;

    const newConfig = {
      ...db.policyConfig,
      ...updates
    };

    if (
      newConfig.lowRiskMax >=
        newConfig.mediumRiskMax ||
      newConfig.mediumRiskMax >=
        newConfig.highRiskMax ||
      newConfig.highRiskMax >=
        newConfig.veryHighRiskMax ||
      newConfig.veryHighRiskMax >=
        newConfig.criticalThreshold
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_THRESHOLDS",
          message:
            "Risk thresholds must strictly follow: Low < Medium < High < Very High < Critical"
        }
      });
    }

    db.policyConfig = newConfig;

    if (db.policyRepository?.updatePolicy) {
      db.policyRepository
        .updatePolicy(db.policyConfig)
        .catch(() => {});
    }

    sseManager.broadcastPolicyUpdate(
      db.policyConfig
    );

    db.appendAuditLog({
      action: "ZERO_TRUST_POLICY_UPDATED",
      category: "POLICY",
      severity: "INFO",
      details: {
        updatedFields: Object.keys(updates),
        newConfig: db.policyConfig
      }
    });

    res.json({
      success: true,
      config: db.policyConfig,
      message:
        "Zero Trust policy configuration saved."
    });
  }
);

export default router;