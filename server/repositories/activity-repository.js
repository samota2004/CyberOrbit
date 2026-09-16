import { prisma } from "../models/prisma.js";

const EVENT_TYPE_MAP = {
  LOGIN: "LOGIN_SUCCESS",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  FILE_ACCESS: "FILE_ACCESS",
  FILE_DOWNLOAD: "FILE_DOWNLOAD",
  DATA_ACCESS: "FILE_ACCESS",
  PRIVILEGE_ELEVATION: "PRIVILEGE_ELEVATION",
  USB_TRANSFER: "USB_TRANSFER",
  POLICY_VIOLATION: "POLICY_VIOLATION",
  UNUSUAL_HOURS_ACCESS: "UNUSUAL_HOURS_ACCESS",
  CROSS_DEPT_ACCESS: "CROSS_DEPT_ACCESS",
  MASS_DOWNLOAD: "MASS_DOWNLOAD"
};

function normalizeEventType(eventType) {
  const normalized =
    String(eventType || "")
      .trim()
      .toUpperCase();

  return (
    EVENT_TYPE_MAP[normalized] ||
    "POLICY_VIOLATION"
  );
}

class ActivityRepository {
  async findAll(limit = 200) {
    const records =
      await prisma.activityEvent.findMany({
        orderBy: {
          timestamp: "desc"
        },
        take: limit
      });

    return records.map((r) =>
      this.mapToDomain(r)
    );
  }

  async findRecent(limit = 25) {
    return this.findAll(limit);
  }

  async findByUserId(
    userId,
    limit = 50
  ) {
    const records =
      await prisma.activityEvent.findMany({
        where: {
          userId
        },
        orderBy: {
          timestamp: "desc"
        },
        take: limit
      });

    return records.map((r) =>
      this.mapToDomain(r)
    );
  }

  async create(event) {
    const eventId =
      event.id ||
      `evt-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)}`;

    let resolvedUserId =
      event.userId || "user-001";

    const user =
      await prisma.user.findFirst({
        where: {
          OR: [
            {
              id: event.userId
            },
            {
              employeeId:
                event.userId
            }
          ]
        }
      });

    if (user) {
      resolvedUserId = user.id;
    }

    const record =
      await prisma.activityEvent.create({
        data: {
          eventId,
          userId: resolvedUserId,

          userEmail:
            event.userEmail ||
            user?.email ||
            "unknown@enterprise.local",

          userRole:
            user?.roleCode ||
            "EMPLOYEE",

          deviceId:
            event.deviceId,

          deviceName:
            event.deviceName,

          resourceId:
            event.resourceId,

          resourceName:
            event.resourceName,

          type:
            normalizeEventType(
              event.eventType
            ),

          timestamp:
            new Date(
              event.timestamp ||
                Date.now()
            ),

          ip:
            event.ipAddress ||
            "127.0.0.1",

          location:
            event.location ||
            "San Francisco, US (HQ)",

          severity:
            event.severity || "LOW",

          riskContribution:
            Number(
              event.riskContribution
            ) || 0,

          mlAnomalyScore:
            Number(
              event.mlAnomalyScore
            ) || 0,

          isOffHours:
            Boolean(
              event.isOffHours ||
              event.metadata?.offHours ||
              event.metadata?.isOffHours
            ),

          isCrossDepartment:
            Boolean(
              event.isCrossDepartment ||
              event.metadata?.crossDepartment ||
              event.metadata?.isCrossDepartment
            ),

          downloadSizeMB:
            Number(
              event.downloadVolumeMB ??
              event.metadata?.downloadSizeMB ??
              event.metadata?.fileSizeMB ??
              0
            ),

          failedAttempts:
            Number(
              event.failedAuthCount ??
              event.metadata?.failedLoginAttempts ??
              0
            ),

          metadata:
            event.metadata ?? {}
        }
      });

    return this.mapToDomain(record);
  }

  mapToDomain(r) {
    return {
      id:
        r.eventId ||
        r.id,

      userId:
        r.userId,

      userEmail:
        r.userEmail,

      userName:
        r.userEmail
          ?.split("@")[0]
          ?.replace(".", " ") ||
        "Enterprise User",

      userDepartment:
        r.metadata?.userDepartment ||
        "IT",

      timestamp:
        r.timestamp
          ?.toISOString?.() ||
        new Date().toISOString(),

      eventType:
        r.type ||
        "POLICY_VIOLATION",

      resourceId:
        r.resourceId ?? undefined,

      resourceName:
        r.resourceName ?? undefined,

      resourceDepartment:
        r.metadata
          ?.resourceDepartment ??
        undefined,

      resourceSensitivity:
        r.metadata
          ?.resourceSensitivity ??
        undefined,

      deviceId:
        r.deviceId ||
        "dev-unknown",

      deviceName:
        r.deviceName ||
        "Unregistered Workstation",

      deviceTrustScore:
        r.metadata
          ?.deviceTrustScore ??
        80,

      isUnknownDevice:
        Boolean(
          r.metadata?.isUnknownDevice
        ),

      ipAddress:
        r.ip ||
        "10.240.12.18",

      location:
        r.location ||
        "San Francisco, US (HQ)",

      severity:
        r.severity === "INFO"
          ? "LOW"
          : r.severity || "LOW",

      metadata:
        r.metadata ?? {},

      riskContribution:
        r.riskContribution ?? 0,

      mlAnomalyScore:
        r.mlAnomalyScore ?? 0,

      isAnomalous:
        Boolean(
          r.mlAnomalyScore &&
          r.mlAnomalyScore >= 0.4
        )
    };
  }
}

export {
  ActivityRepository
};