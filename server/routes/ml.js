import { Router } from "express";
import { db } from "../middleware/auth.js";
import { prisma } from "../models/prisma.js";
import {
  predictWithMLService,
  checkMLServiceHealth
} from "../services/ml-service.js";
import {
  updateFeatureState,
  getUserDayFeatures
} from "../services/ml-feature-aggregator.js";

const router = Router();

function riskLevelFromScore(score) {
  if (score < 40) return "LOW";
  if (score < 60) return "MEDIUM";
  if (score < 90) return "HIGH";
  return "CRITICAL";
}

function normalizeActivityEvent(event) {
  const metadata =
    event.metadata &&
    typeof event.metadata === "object"
      ? event.metadata
      : {};

  return {
    eventId: event.eventId || event.id,
    userId: event.userId,
    eventType: event.type,
    timestamp: event.timestamp,
    deviceId: event.deviceId,
    deviceName: event.deviceName,
    resourceId: event.resourceId,
    resourceName: event.resourceName,
    destinationSite:
      metadata.destinationSite ||
      metadata.destination_site ||
      event.destinationSite ||
      null,
    applicationShellCmd:
      metadata.applicationShellCmd ||
      metadata.application_shell_cmd ||
      event.shellCommand ||
      null,
    recipient:
      metadata.recipient ||
      metadata.recipientEmail ||
      metadata.emailRecipient ||
      null,
    emailSize:
      metadata.emailSize ||
      metadata.email_size ||
      0,
    attachments:
      metadata.attachments ||
      metadata.attachmentCount ||
      0
  };
}

function buildBehaviorSummary(events) {
  const totalEvents = events.length;

  const loginEvents = events.filter(
    event =>
      event.type === "LOGIN_SUCCESS" ||
      event.type === "LOGIN_FAILED"
  );

  const failedLogins = events.reduce(
    (total, event) =>
      total + Number(event.failedAttempts || 0),
    0
  );

  const offHoursEvents = events.filter(
    event => event.isOffHours
  ).length;

  const crossDepartmentEvents = events.filter(
    event => event.isCrossDepartment
  ).length;

  const downloadVolume = events.reduce(
    (total, event) =>
      total + Number(event.downloadSizeMB || 0),
    0
  );

  const resources = new Set(
    events
      .map(event => event.resourceId)
      .filter(Boolean)
  );

  const devices = new Set(
    events
      .map(event => event.deviceId)
      .filter(Boolean)
  );

  const eventTypes = {};

  for (const event of events) {
    eventTypes[event.type] =
      (eventTypes[event.type] || 0) + 1;
  }

  return {
    totalEvents,
    loginEvents: loginEvents.length,
    failedLogins,
    offHoursEvents,
    offHoursRate:
      totalEvents > 0
        ? Number((offHoursEvents / totalEvents).toFixed(4))
        : 0,
    crossDepartmentEvents,
    crossDepartmentRate:
      totalEvents > 0
        ? Number(
            (
              crossDepartmentEvents /
              totalEvents
            ).toFixed(4)
          )
        : 0,
    downloadVolumeMB:
      Number(downloadVolume.toFixed(2)),
    uniqueResources: resources.size,
    uniqueDevices: devices.size,
    eventTypes
  };
}

router.get("/metrics", async (req, res) => {
  try {
    const health = await checkMLServiceHealth();

    res.json({
      success: true,
      metrics: {
        model: health.model,
        status: health.status,
        service: "Python ML Service"
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "ML_SERVICE_UNAVAILABLE",
        message: err.message
      }
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    const health = await checkMLServiceHealth();

    res.json({
      success: true,
      ...health
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "ML_SERVICE_UNAVAILABLE",
        message: err.message
      }
    });
  }
});

router.post("/predict", async (req, res) => {
  try {
    const {
      userId,
      features
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "USER_ID_REQUIRED",
          message: "User ID is required."
        }
      });
    }

    const user = db.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found."
        }
      });
    }

    if (!features || typeof features !== "object") {
      return res.status(400).json({
        success: false,
        error: {
          code: "FEATURES_REQUIRED",
          message: "ML feature data is required."
        }
      });
    }

    const result = await predictWithMLService(
      user.id,
      features
    );

    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(
      "ML prediction failed:",
      err
    );

    return res.status(500).json({
      success: false,
      error: {
        code: "ML_SERVICE_ERROR",
        message: err.message
      }
    });
  }
});

router.get(
  "/employee/:userId/analysis",
  async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          roleCode: true,
          departmentCode: true,
          status: true,
          riskScore: true,
          trustScore: true,
          riskLevel: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Employee not found."
          }
        });
      }

      const events = await prisma.activityEvent.findMany({
        where: {
          userId
        },
        orderBy: {
          timestamp: "asc"
        }
      });

      if (events.length === 0) {
        return res.json({
          success: true,
          employee: user,
          analysis: {
            hasActivity: false,
            latestDate: null,
            availableDays: 0,
            features: null,
            behavior: {
              totalEvents: 0,
              loginEvents: 0,
              failedLogins: 0,
              offHoursEvents: 0,
              offHoursRate: 0,
              crossDepartmentEvents: 0,
              crossDepartmentRate: 0,
              downloadVolumeMB: 0,
              uniqueResources: 0,
              uniqueDevices: 0,
              eventTypes: {}
            },
            dailyActivity: []
          }
        });
      }

      const state = new Map();

      const dailyEvents = new Map();

      for (const databaseEvent of events) {
        const normalizedEvent =
          normalizeActivityEvent(
            databaseEvent
          );

        const result = updateFeatureState(
          state,
          normalizedEvent
        );

        if (!dailyEvents.has(result.date)) {
          dailyEvents.set(
            result.date,
            []
          );
        }

        dailyEvents
          .get(result.date)
          .push(databaseEvent);
      }

      const dates = Array.from(
        dailyEvents.keys()
      ).sort();

      const latestDate =
        dates[dates.length - 1];

      const latestFeatures =
        getUserDayFeatures(
          state,
          userId,
          latestDate
        );

      const latestBehavior =
        buildBehaviorSummary(
          dailyEvents.get(latestDate)
        );

      const dailyActivity = dates.map(
        date => {
          const dayEvents =
            dailyEvents.get(date);

          const dayFeatures =
            getUserDayFeatures(
              state,
              userId,
              date
            );

          const dayBehavior =
            buildBehaviorSummary(
              dayEvents
            );

          const riskValues =
            dayEvents
              .map(event =>
                Number(event.riskContribution)
              )
              .filter(Number.isFinite);

          const anomalyValues =
            dayEvents
              .map(event =>
                Number(event.mlAnomalyScore)
              )
              .filter(Number.isFinite);

          return {
            date,
            totalActivity:
              dayBehavior.totalEvents,
            logins:
              dayBehavior.loginEvents,
            failedLogins:
              dayBehavior.failedLogins,
            offHoursEvents:
              dayBehavior.offHoursEvents,
            crossDepartmentEvents:
              dayBehavior.crossDepartmentEvents,
            downloadVolumeMB:
              dayBehavior.downloadVolumeMB,
            uniqueResources:
              dayBehavior.uniqueResources,
            uniqueDevices:
              dayBehavior.uniqueDevices,
            averageRisk:
              riskValues.length > 0
                ? Number(
                    (
                      riskValues.reduce(
                        (a, b) => a + b,
                        0
                      ) /
                      riskValues.length
                    ).toFixed(2)
                  )
                : 0,
            maximumRisk:
              riskValues.length > 0
                ? Number(
                    Math.max(
                      ...riskValues
                    ).toFixed(2)
                  )
                : 0,
            maximumAnomalyScore:
              anomalyValues.length > 0
                ? Number(
                    Math.max(
                      ...anomalyValues
                    ).toFixed(4)
                  )
                : 0,
            modelFeatures:
              dayFeatures?.features || null
          };
        }
      );

      return res.json({
        success: true,
        employee: user,
        analysis: {
          hasActivity: true,
          latestDate,
          availableDays: dates.length,
          features:
            latestFeatures?.features || null,
          behavior: latestBehavior,
          dailyActivity
        }
      });
    } catch (err) {
      console.error(
        "Employee ML analysis failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "EMPLOYEE_ANALYSIS_ERROR",
          message: err.message
        }
      });
    }
  }
);

router.post(
  "/employee/:userId/predict",
  async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: {
          id: userId
        },
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          roleCode: true,
          departmentCode: true,
          status: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "Employee not found."
          }
        });
      }

      const events =
        await prisma.activityEvent.findMany({
          where: {
            userId
          },
          orderBy: {
            timestamp: "asc"
          }
        });

      if (events.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_ACTIVITY_DATA",
            message:
              "No activity data is available for this employee."
          }
        });
      }

      const state = new Map();

      const dailyEvents = new Map();

      for (const databaseEvent of events) {
        const normalizedEvent =
          normalizeActivityEvent(
            databaseEvent
          );

        const result = updateFeatureState(
          state,
          normalizedEvent
        );

        if (!dailyEvents.has(result.date)) {
          dailyEvents.set(
            result.date,
            []
          );
        }

        dailyEvents
          .get(result.date)
          .push(databaseEvent);
      }

      const dates = Array.from(
        dailyEvents.keys()
      ).sort();

      const latestDate =
        dates[dates.length - 1];

      const latest =
        getUserDayFeatures(
          state,
          userId,
          latestDate
        );

      if (!latest?.features) {
        return res.status(400).json({
          success: false,
          error: {
            code: "FEATURE_GENERATION_FAILED",
            message:
              "Unable to generate behavioral features for this employee."
          }
        });
      }

      const mlResult =
        await predictWithMLService(
          user.id,
          latest.features
        );

      const latestEvents =
        dailyEvents.get(latestDate);

      const behavior =
        buildBehaviorSummary(
          latestEvents
        );

      const riskScore =
        Number(
          mlResult.risk_score ?? 0
        );

      const threatProbability =
        Number(
          mlResult.threat_probability ?? 0
        );

      const anomalyDetected =
        Boolean(
          mlResult.predicted_class ??
          threatProbability >= 0.5
        );

      const historicalRiskValues =
        events
          .map(event =>
            Number(event.riskContribution)
          )
          .filter(Number.isFinite);

      const historicalMaximumRisk =
        historicalRiskValues.length > 0
          ? Math.max(
              ...historicalRiskValues
            )
          : 0;

      const historicalAverageRisk =
        historicalRiskValues.length > 0
          ? Number(
              (
                historicalRiskValues.reduce(
                  (a, b) => a + b,
                  0
                ) /
                historicalRiskValues.length
              ).toFixed(2)
            )
          : 0;

      return res.json({
        success: true,
        employee: user,
        prediction: {
          timestamp:
            new Date().toISOString(),
          analyzedDate: latestDate,
          anomalyDetected,
          riskScore,
          riskLevel:
            riskLevelFromScore(
              riskScore
            ),
          threatProbability,
          randomForest: {
            threatProbability,
            predictedClass:
              mlResult.predicted_class ??
              null
          },
          isolationForest: null,
          ensemble: {
            riskScore,
            contextualRiskScore:
              mlResult.contextual_risk_score,
            trustScore:
              mlResult.trust_score,
            policyAction:
              mlResult.policy_action,
            policyReason:
              mlResult.policy_reason
          },
          xaiReasons:
            mlResult.xai_reasons || [],
          behavioralFactors: {
            ...behavior,
            historicalAverageRisk,
            historicalMaximumRisk
          },
          features:
            latest.features
        }
      });
    } catch (err) {
      console.error(
        "Employee ML prediction failed:",
        err
      );

      return res.status(500).json({
        success: false,
        error: {
          code: "EMPLOYEE_PREDICTION_ERROR",
          message: err.message
        }
      });
    }
  }
);

router.get("/model-info", async (req, res) => {
  try {
    const health =
      await checkMLServiceHealth();

    res.json({
      success: true,
      model: {
        name: health.model,
        service:
          "Python FastAPI ML Service",
        status: health.status
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "ML_SERVICE_UNAVAILABLE",
        message: err.message
      }
    });
  }
});

export default router;