import { Router } from "express";
import { db } from "../middleware/auth.js";
import { requireSecurityAdmin } from "../middleware/auth.js";

const router = Router();

router.get(
  "/export",
  requireSecurityAdmin,
  (req, res) => {
    try {
      const logs = db.auditLogs || [];

      const format = (
        req.query.format || "csv"
      ).toLowerCase();

      const category = req.query.category;
      const search = (
        req.query.search || ""
      ).toLowerCase().trim();

      const range = req.query.range || "ALL";

      const now = Date.now();

      let rangeStart = null;

      if (range === "24H") {
        rangeStart =
          now - 24 * 60 * 60 * 1000;
      }

      if (range === "7D") {
        rangeStart =
          now - 7 * 24 * 60 * 60 * 1000;
      }

      if (range === "30D") {
        rangeStart =
          now - 30 * 24 * 60 * 60 * 1000;
      }

      const filteredLogs = logs.filter((log) => {
        const matchesCategory =
          !category ||
          category === "ALL" ||
          log.category === category;

        const searchableText = [
          log.id,
          log.userId,
          log.userName,
          log.actorName,
          log.targetUserName,
          log.action,
          log.deviceName,
          log.policyDecision,
          log.category,
          log.severity
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !search ||
          searchableText.includes(search);

        let matchesDate = true;

        if (
          rangeStart &&
          log.timestamp
        ) {
          matchesDate =
            new Date(log.timestamp).getTime() >=
            rangeStart;
        }

        return (
          matchesCategory &&
          matchesSearch &&
          matchesDate
        );
      });

      if (format === "json") {
        res.setHeader(
          "Content-Type",
          "application/json; charset=utf-8"
        );

        res.setHeader(
          "Content-Disposition",
          'attachment; filename="audit-logs.json"'
        );

        return res.json(filteredLogs);
      }

      const headers = [
        "id",
        "userId",
        "userName",
        "action",
        "category",
        "severity",
        "timestamp",
        "deviceName",
        "policyDecision",
        "riskScore",
        "status"
      ];

      const rows = filteredLogs.map((log) =>
        headers
          .map((key) =>
            JSON.stringify(
              log[key] ?? ""
            )
          )
          .join(",")
      );

      const csv = [
        headers.join(","),
        ...rows
      ].join("\n");

      res.setHeader(
        "Content-Type",
        "text/csv; charset=utf-8"
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="audit-logs.csv"'
      );

      return res.send(csv);
    } catch (error) {
      console.error(
        "Audit log export error:",
        error?.message || error
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "AUDIT_EXPORT_ERROR",
          message:
            "Unable to export audit logs."
        }
      });
    }
  }
);

router.get(
  "/",
  requireSecurityAdmin,
  (req, res) => {
    res.json({
      success: true,
      auditLogs: db.auditLogs || []
    });
  }
);

export default router;