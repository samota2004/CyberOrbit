import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { sseManager } from "../services/sse.js";
import { AccessRequestRepository } from "../repositories/access-request-repository.js";

const accessRequestRepository = new AccessRequestRepository();

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    requests: db.accessRequests
  });
});

router.post("/", (req, res) => {
  const {
    userId,
    resourceId,
    reason
  } = req.body;

  const user = db.getUserById(userId);
  const resource =
    db.getResourceById(resourceId);

  if (!user || !resource) {
    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "User or resource not found."
      }
    });
  }

  const newRequest = {
    id: `req-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    resourceId: resource.id,
    resourceName: resource.name,
    requestedAt:
      new Date().toISOString(),
    riskScoreAtRequest:
      user.currentRiskScore ??
      user.riskScore,
    aiRiskAssessment:
      `Request for ${resource.sensitivity} resource outside ${user.department}. Current user trust: ${user.currentTrustScore ?? user.trustScore}/100.`,
    status: "PENDING"
  };

  db.appendAccessRequest(newRequest);

  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ACCESS_REQUEST_SUBMITTED",
    category: "ACCESS",
    severity: "INFO",
    details: {
      requestId: newRequest.id,
      resourceName: resource.name,
      reason
    }
  });

  res.json({
    success: true,
    request: newRequest
  });
});

router.post(
  "/:id/approve",
  requireSecurityAdmin,
  (req, res) => {
    const request =
      db.accessRequests.find(
        r => r.id === req.params.id
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REQUEST_NOT_FOUND",
          message: "Request not found"
        }
      });
    }

    request.status = "APPROVED";
    request.reviewedBy =
      req.user?.name ||
      "Security Administrator";
    request.reviewedAt =
      new Date().toISOString();

    request.reviewNotes =
      req.body.notes ||
      "Approved after context verification.";

    accessRequestRepository
      .decide(
        request.id,
        "APPROVED",
        request.reviewedBy,
        request.reviewNotes
      )
      .catch(() => {});

    sseManager.broadcastAccessRequest(
      request,
      false
    );

    db.appendAuditLog({
      userId: request.userId,
      userName: request.userName,
      action: "ACCESS_REQUEST_APPROVED",
      category: "ACCESS",
      severity: "INFO",
      details: {
        requestId: request.id,
        resourceName:
          request.resourceName,
        notes: request.reviewNotes
      }
    });

    res.json({
      success: true,
      request
    });
  }
);

router.post(
  "/:id/reject",
  requireSecurityAdmin,
  (req, res) => {
    const request =
      db.accessRequests.find(
        r => r.id === req.params.id
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        error: {
          code: "REQUEST_NOT_FOUND",
          message: "Request not found"
        }
      });
    }

    request.status = "REJECTED";
    request.reviewedBy =
      req.user?.name ||
      "Security Administrator";
    request.reviewedAt =
      new Date().toISOString();

    request.reviewNotes =
      req.body.notes ||
      "Rejected due to principle of least privilege.";

    accessRequestRepository
      .decide(
        request.id,
        "REJECTED",
        request.reviewedBy,
        request.reviewNotes
      )
      .catch(() => {});

    sseManager.broadcastAccessRequest(
      request,
      false
    );

    db.appendAuditLog({
      userId: request.userId,
      userName: request.userName,
      action: "ACCESS_REQUEST_REJECTED",
      category: "ACCESS",
      severity: "WARNING",
      details: {
        requestId: request.id,
        resourceName:
          request.resourceName,
        notes: request.reviewNotes
      }
    });

    res.json({
      success: true,
      request
    });
  }
);

export default router;