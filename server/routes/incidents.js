import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";
import { sseManager } from "../services/sse.js";
import { geminiService } from "../services/gemini.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    incidents: db.incidents
  });
});

router.get("/:id", (req, res) => {
  const incident = db.incidents.find(
    i => i.id === req.params.id
  );

  if (!incident) {
    return res.status(404).json({
      success: false,
      error: {
        code: "INCIDENT_NOT_FOUND",
        message: "Incident not found"
      }
    });
  }

  res.json({
    success: true,
    incident
  });
});

router.post(
  "/:id/resolve",
  requireSecurityAdmin,
  (req, res) => {
    const incident = db.incidents.find(
      i => i.id === req.params.id
    );

    if (!incident) {
      return res.status(404).json({
        success: false,
        error: {
          code: "INCIDENT_NOT_FOUND",
          message: "Incident not found"
        }
      });
    }

    incident.status = "RESOLVED";
    incident.resolvedAt =
      new Date().toISOString();

    incident.resolvedBy =
      req.user?.name ||
      "Security Administrator";

    incident.resolutionNotes =
      req.body.notes ||
      "Incident resolved by security administrator.";

    db.appendAuditLog({
      userId: incident.userId,
      action: "INCIDENT_RESOLVED",
      category: "INCIDENT",
      severity: "INFO",
      details: {
        incidentId: incident.id,
        resolvedBy: incident.resolvedBy
      }
    });

    sseManager.broadcastIncident(incident);

    res.json({
      success: true,
      incident
    });
  }
);

router.post("/:id/ai-explain", async (req, res) => {
  const incident = db.incidents.find(
    i => i.id === req.params.id
  );

  if (!incident) {
    return res.status(404).json({
      success: false,
      error: {
        code: "INCIDENT_NOT_FOUND",
        message: "Incident not found"
      }
    });
  }

  const explanation =
    await geminiService.askSecurityCopilot(
      `Explain this security incident and provide containment recommendations: ${JSON.stringify(
        incident
      )}`,
      {
        incident
      }
    );

  res.json({
    success: true,
    incident,
    explanation
  });
});

router.get("/export/csv", (req, res) => {
  const headers = [
    "id",
    "userId",
    "severity",
    "status",
    "createdAt"
  ];

  const rows = db.incidents.map(
    incident =>
      headers
        .map(key =>
          JSON.stringify(
            incident[key] ?? ""
          )
        )
        .join(",")
  );

  res.setHeader(
    "Content-Type",
    "text/csv"
  );

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="incidents.csv"'
  );

  res.send(
    [headers.join(","), ...rows].join("\n")
  );
});

export default router;