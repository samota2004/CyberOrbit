import express from "express";

import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import deviceRoutes from "./devices.js";
import resourceRoutes from "./resources.js";
import activityRoutes from "./activity.js";
import simulationRoutes from "./simulation.js";
import incidentRoutes from "./incidents.js";
import accessRequestRoutes from "./access-requests.js";
import policyRoutes from "./policies.js";
import auditLogRoutes from "./audit-logs.js";
import mlRoutes from "./ml.js";
import telemetryRoutes from "./telemetry.js";
import copilotRoutes from "./copilot.js";
import systemRoutes from "./system.js";

const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/", userRoutes);
apiRouter.use("/", deviceRoutes);
apiRouter.use("/", resourceRoutes);
apiRouter.use("/", activityRoutes);
apiRouter.use("/", simulationRoutes);
apiRouter.use("/", incidentRoutes);
apiRouter.use("/", accessRequestRoutes);
apiRouter.use("/", policyRoutes);
apiRouter.use("/", auditLogRoutes);
apiRouter.use("/", mlRoutes);
apiRouter.use("/", telemetryRoutes);
apiRouter.use("/", copilotRoutes);
apiRouter.use("/", systemRoutes);

export default apiRouter;