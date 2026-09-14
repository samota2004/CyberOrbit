import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";

const router = Router();

router.get(
  "/export",
  requireSecurityAdmin,
  (req, res) => {
    const logs = db.auditLogs || [];

    const headers = [
      "id",
      "userId",
      "userName",
      "action",
      "category",
      "severity",
      "timestamp"
    ];

    const rows = logs.map(log =>
      headers
        .map(key =>
          JSON.stringify(log[key] ?? "")
        )
        .join(",")
    );

    res.setHeader(
      "Content-Type",
      "text/csv"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="audit-logs.csv"'
    );

    res.send(
      [headers.join(","), ...rows].join("\n")
    );
  }
);

router.get("/", requireSecurityAdmin, (req, res) => {
  res.json({
    success: true,
    auditLogs: db.auditLogs
  });
});

export default router;