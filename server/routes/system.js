import { Router } from "express";
import { db } from "../models/db.js";
import { sseManager } from "../services/sse.js";

const router = Router();

function handleHealthCheck(req, res) {
  res.json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    telemetryStore: {
      users: db.users.length,
      devices: db.devices.length,
      resources: db.resources.length,
      events: db.activityEvents.length,
      incidents: db.incidents.length
    },
    services: {
      mlEnsemble: {
        name:
          "UEBA Isolation Forest & Random Forest",
        status: "ACTIVE",
        latencyMs: 4
      },
      xaiExplainer: {
        name:
          "SHAP Feature Attribution & Factor Decomposition",
        status: "ACTIVE",
        latencyMs: 2
      },
      geminiCopilot: {
        name:
          "Gemini Security Intelligence Model",
        status: "ACTIVE",
        latencyMs: 15
      }
    }
  });
}

router.get("/health", handleHealthCheck);

router.get("/routes", (req, res) => {
  res.json({
    success: true,
    routes: [
      {
        method: "GET",
        path: "/api/system/health",
        category: "SYSTEM"
      },
      {
        method: "GET",
        path: "/api/stats",
        category: "SOC"
      },
      {
        method: "POST",
        path: "/api/risk/evaluate",
        category: "CYBERSECURITY"
      },
      {
        method: "POST",
        path: "/api/policy/evaluate",
        category: "ZERO_TRUST"
      },
      {
        method: "POST",
        path: "/api/ml/predict",
        category: "AI_ML"
      },
      {
        method: "GET",
        path: "/api/ml/metrics",
        category: "AI_ML"
      },
      {
        method: "POST",
        path: "/api/activity/simulate",
        category: "SIMULATOR"
      },
      {
        method: "POST",
        path: "/api/copilot/chat",
        category: "AI_COPILOT"
      },
      {
        method: "GET",
        path: "/api/users",
        category: "USERS"
      },
      {
        method: "GET",
        path: "/api/resources",
        category: "ASSETS"
      },
      {
        method: "GET",
        path: "/api/devices",
        category: "DEVICES"
      }
    ]
  });
});

router.get("/status", async (req, res) => {
  const isConnected =
    db.isPostgresConnected;

  res.json({
    success: true,
    system: {
      platform:
        "Enterprise Zero Trust & UEBA Architecture",
      version:
        "v2.4.0-prisma-postgresql-sse",
      storageEngine: isConnected
        ? "PostgreSQL via Prisma ORM"
        : "Prisma Client Ready (In-Memory Fallback Cache)",
      databaseConnected:
        isConnected,
      realTimeStream: {
        engine:
          "Server-Sent Events (SSE)",
        endpoint:
          "/api/events/stream",
        connectedClients:
          sseManager.getClientCount(),
        heartbeatIntervalMs: 15000
      },
      schemaModels: [
        "User",
        "Role",
        "Department",
        "Device",
        "Resource",
        "ActivityEvent",
        "BehaviorProfile",
        "RiskScore",
        "TrustHistory",
        "Incident",
        "AccessRequest",
        "AuditLog",
        "ZeroTrustPolicy",
        "ModelVersion"
      ],
      entitiesCount: {
        users: db.users.length,
        devices: db.devices.length,
        resources: db.resources.length,
        events:
          db.activityEvents.length,
        incidents:
          db.incidents.length,
        accessRequests:
          db.accessRequests.length,
        auditLogs:
          db.auditLogs.length
      }
    }
  });
});

router.post("/db-sync", async (req, res) => {
  const connected =
    await db.initDatabaseLayer();

  res.json({
    success: true,
    connected,
    message: connected
      ? "Synchronized state with PostgreSQL database."
      : "Database offline, operating in memory."
  });
});
router.get("/stats", (req, res) => {
  try {
    const events = db.activityEvents || [];
    const incidents = db.incidents || [];
    const users = db.users || [];
    const devices = db.devices || [];
    const resources = db.resources || [];
    const accessRequests = db.accessRequests || [];

    return res.json({
      success: true,
      stats: {
        users: users.length,
        devices: devices.length,
        resources: resources.length,
        events: events.length,
        incidents: incidents.length,
        accessRequests: accessRequests.length,
        databaseConnected: db.isPostgresConnected
      }
    });
  } catch (error) {
    console.error("Stats fetch error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "STATS_ERROR",
        message: error.message || "Unable to fetch system statistics."
      }
    });
  }
});
export default router;