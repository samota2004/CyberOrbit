import { db } from "../models/db.js";
import { Router } from "express";
import eventsRoutes from "./events.js";
import authRoutes from "./auth.js";
import usersRoutes from "./users.js";
import devicesRoutes from "./devices.js";
import resourcesRoutes from "./resources.js";
import activityRoutes from "./activity.js";
import simulationRoutes from "./simulation.js";
import incidentsRoutes from "./incidents.js";
import accessRequestRoutes from "./access-requests.js";
import policiesRoutes from "./policies.js";
import auditLogsRoutes from "./audit-logs.js";
import mlRoutes from "./ml.js";
import telemetryRoutes from "./telemetry.js";
import copilotRoutes from "./copilot.js";
import systemRoutes from "./system.js";
import adminsRoutes from "./admins.js";
const router = Router();
router.use("/admins", adminsRoutes);
router.use("/events", eventsRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/devices", devicesRoutes);
router.use("/resources", resourcesRoutes);
router.use("/activity", activityRoutes);
router.use("/simulation", simulationRoutes);
router.use("/incidents", incidentsRoutes);
router.use("/access-requests", accessRequestRoutes);
router.use("/policies", policiesRoutes);
router.use("/audit-logs", auditLogsRoutes);
router.use("/ml", mlRoutes);
router.use("/telemetry", telemetryRoutes);
router.use("/copilot", copilotRoutes);
router.use("/system", systemRoutes);
router.get("/stats", (req, res) => {
  try {
    return res.json({
      success: true,
      stats: {
        users: db.users.length,
        devices: db.devices.length,
        resources: db.resources.length,
        events: db.activityEvents.length,
        incidents: db.incidents.length,
        accessRequests: db.accessRequests.length,
        auditLogs: db.auditLogs.length,
        databaseConnected: db.isPostgresConnected
      }
    });
  } catch (error) {
    console.error("Stats fetch error:", error);

    return res.status(500).json({
      success: false,
      error: {
        code: "STATS_ERROR",
        message: error.message || "Unable to fetch statistics."
      }
    });
  }
});
export default router;