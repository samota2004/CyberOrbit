import {
  userRepository,
  deviceRepository,
  resourceRepository,
  activityRepository,
  incidentRepository,
  accessRequestRepository,
  auditLogRepository,
  policyRepository
} from "../repositories/index.js";

import { checkDatabaseConnection } from "./prisma.js";
import { sseManager } from "../services/sse.js";

class EnterpriseDatabase {
  users = [];
  devices = [];
  resources = [];
  activityEvents = [];
  incidents = [];
  accessRequests = [];
  auditLogs = [];
  trustHistories = {};
  isPostgresConnected = false;

  policyConfig = {
    lowRiskMax: 39,
    mediumRiskMax: 59,
    highRiskMax: 74,
    veryHighRiskMax: 89,
    criticalThreshold: 90,
    mfaThreshold: 60,
    approvalThreshold: 75,
    restrictionThreshold: 90,
    crossDeptRiskPenalty: 28,
    untrustedDevicePenalty: 25,
    offHoursPenalty: 20,
    largeDownloadThresholdMB: 150,
    autoFreezeOnCritical: true,
    adaptiveTrustRecoveryRate: 3
  };

  constructor() {
    this.seedEnterpriseData();

    this.initDatabaseLayer().catch((err) => {
      console.warn(
        "⚠️ PostgreSQL Prisma initialization note:",
        err?.message || String(err)
      );
    });
  }

  async initDatabaseLayer() {
    try {
      const connStatus = await checkDatabaseConnection();

      this.isPostgresConnected = connStatus.connected;

      if (connStatus.connected) {
        console.log(
          "📦 Connected to PostgreSQL database via Prisma ORM"
        );

        await this.syncFromPostgreSQL();
      } else {
        console.log(
          `ℹ️ Running in memory with Prisma schema ready. Status: ${connStatus.message}`
        );
      }

      return this.isPostgresConnected;
    } catch (error) {
      this.isPostgresConnected = false;

      console.warn(
        "⚠️ Could not connect to PostgreSQL:",
        error?.message || error
      );

      return false;
    }
  }

  async syncFromPostgreSQL() {
    try {
      const [
        pgUsers,
        pgDevices,
        pgResources,
        pgEvents,
        pgIncidents,
        pgRequests,
        pgAuditLogs
      ] = await Promise.all([
        userRepository.findAll().catch(() => []),
        deviceRepository.findAll().catch(() => []),
        resourceRepository.findAll().catch(() => []),
        activityRepository.findAll().catch(() => []),
        incidentRepository.findAll().catch(() => []),
        accessRequestRepository.findAll().catch(() => []),
        auditLogRepository.findAll().catch(() => [])
      ]);

      if (pgUsers && pgUsers.length > 0) {
        this.users = pgUsers;
      }

      if (pgDevices && pgDevices.length > 0) {
        this.devices = pgDevices;
      }

      if (pgResources && pgResources.length > 0) {
        this.resources = pgResources;
      }

      if (pgEvents && pgEvents.length > 0) {
        this.activityEvents = pgEvents;
      }

      if (pgIncidents && pgIncidents.length > 0) {
        this.incidents = pgIncidents;
      }

      if (pgRequests && pgRequests.length > 0) {
        this.accessRequests = pgRequests;
      }

      if (pgAuditLogs && pgAuditLogs.length > 0) {
        this.auditLogs = pgAuditLogs;
      }

      const activePolicy = await policyRepository
        .getActivePolicy()
        .catch(() => null);

      if (activePolicy) {
        this.policyConfig = {
          ...this.policyConfig,
          ...activePolicy
        };
      }

      console.log(
        `🔄 PostgreSQL sync complete: ${this.users.length} users, ${this.devices.length} devices`
      );
    } catch (error) {
      console.error(
        "Error synchronizing data from PostgreSQL:",
        error
      );
    }
  }

  seedEnterpriseData() {
    /*
     * ============================================================
     * RESOURCES
     * ============================================================
     */

    this.resources = [
      {
        id: "res-hr-01",
        name: "Workday HR Employee Portal",
        department: "HR",
        sensitivity: "INTERNAL",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Standard employee directory, time-off requests, and performance self-reviews.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-hr-02",
        name: "HR Personnel Confidential Records & SSN Database",
        department: "HR",
        sensitivity: "CONFIDENTIAL",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Confidential employee records, background checks, medical leave data, and tax forms.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-fin-01",
        name: "Executive Payroll & Compensation Master",
        department: "Finance",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Global corporate salary sheets, bonus allocations, equity grant records, and bank payouts.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-fin-02",
        name: "Corporate General Ledger & SAP Financials",
        department: "Finance",
        sensitivity: "CONFIDENTIAL",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Quarterly financial statements, tax filings, vendor accounts payable, and auditing vaults.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-eng-01",
        name: "GitHub Enterprise Core Monorepo",
        department: "Engineering",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Proprietary core intellectual property, algorithms, trading engines, and source codes.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-eng-02",
        name: "AWS Production Kubernetes Infrastructure",
        department: "Engineering",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Live production cloud infrastructure, secrets manager, and customer data clusters.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-sec-01",
        name: "CrowdStrike Falcon & SOC SIEM Management",
        department: "Security",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: [
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Security incident records, threat intelligence feeds, sensor configs, and telemetry.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-it-01",
        name: "Active Directory / Okta Identity Management",
        department: "IT",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: [
          "SYSTEM_ADMIN",
          "SECURITY_ADMIN"
        ],
        description:
          "Enterprise SSO, directory services, domain controllers, and IAM role assignment.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-sales-01",
        name: "Salesforce Enterprise Customer CRM",
        department: "Sales",
        sensitivity: "INTERNAL",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Global enterprise accounts, customer contract pipelines, and contact rosters.",
        accessCount: 0,
        restricted: false
      },

      {
        id: "res-mkt-01",
        name: "Figma Brand Assets & Public Marketing CMS",
        department: "Marketing",
        sensitivity: "PUBLIC",
        requiredRole: [
          "EMPLOYEE",
          "MANAGER",
          "SECURITY_ADMIN",
          "SYSTEM_ADMIN"
        ],
        description:
          "Brand collateral, press releases, public vector logos, and social media media kits.",
        accessCount: 0,
        restricted: false
      }
    ];

    /*
     * ============================================================
     * INITIAL ADMIN
     * ============================================================
     *
     * Only the administrator exists initially.
     *
     * Employee accounts will be added later through the proper
     * employee-management flow.
     *
     * No employee risk/activity is generated here.
     */

    this.users = [
      {
        id: "user-001",
        employeeId: "EMP100",

        name: "Priyanka Samota",
        email: "priyankasamota946@gmail.com",

        department: "Engineering",
        role: "SECURITY_ADMIN",
        status: "ACTIVE",

        createdAt: new Date().toISOString(),
        lastLoginAt: null,

        activeDeviceId: null,

        /*
         * These values are not used to create employee risk.
         * They are kept only for compatibility with the existing
         * risk/trust engine structure.
         */
        currentRiskScore: null,
        currentRiskLevel: null,
        currentTrustScore: null,

        baseline: {
          normalWorkHours: {
            start: 8,
            end: 19
          },

          avgDownloadsPerDay: null,
          maxDownloadVolumeMB: null,

          primaryDepartment: "Engineering",

          allowedDepartments: [
            "Engineering",
            "IT",
            "Security"
          ],

          typicalLocations: [],

          knownDeviceIds: [],

          normalResourceIds: []
        }
      }
    ];

    /*
     * ============================================================
     * DEVICES
     * ============================================================
     *
     * No demo employee devices are created.
     * An admin device can be registered later.
     */

    this.devices = [];

    /*
     * ============================================================
     * TRUST HISTORY
     * ============================================================
     *
     * No synthetic risk/trust history is generated.
     */

    this.trustHistories = {
      "user-001": []
    };

    /*
     * ============================================================
     * ACTIVITY EVENTS
     * ============================================================
     *
     * Empty initially.
     *
     * Activity will be generated from actual telemetry/events.
     */

    this.activityEvents = [];

    /*
     * ============================================================
     * INCIDENTS
     * ============================================================
     *
     * Empty initially.
     */

    this.incidents = [];

    /*
     * ============================================================
     * ACCESS REQUESTS
     * ============================================================
     *
     * Empty initially.
     */

    this.accessRequests = [];

    /*
     * ============================================================
     * AUDIT LOGS
     * ============================================================
     *
     * Empty initially.
     *
     * Real authentication and administrative actions will
     * generate audit logs.
     */

    this.auditLogs = [];
  }

  /*
   * ============================================================
   * USER HELPERS
   * ============================================================
   */

  getUserById(id) {
    return this.users.find(
      (user) =>
        user.id === id ||
        user.employeeId === id
    );
  }

  getUserByEmail(email) {
    if (!email) {
      return undefined;
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    return this.users.find(
      (user) =>
        String(user.email).toLowerCase() === normalizedEmail
    );
  }

  /*
   * ============================================================
   * DEVICE HELPERS
   * ============================================================
   */

  getDeviceById(id) {
    return this.devices.find(
      (device) => device.id === id
    );
  }

  /*
   * ============================================================
   * RESOURCE HELPERS
   * ============================================================
   */

  getResourceById(id) {
    return this.resources.find(
      (resource) => resource.id === id
    );
  }

  /*
   * ============================================================
   * TRUST HISTORY
   * ============================================================
   */

  getTrustHistory(userId) {
    return this.trustHistories[userId] || [];
  }

  appendTrustHistory(userId, point) {
    if (!this.trustHistories[userId]) {
      this.trustHistories[userId] = [];
    }

    this.trustHistories[userId].push(point);

    if (this.trustHistories[userId].length > 30) {
      this.trustHistories[userId].shift();
    }

    if (this.isPostgresConnected) {
      userRepository
        .recordTrustHistory(
          userId,
          point.trustScore,
          point.riskScore,
          point.eventSummary,
          0
        )
        .catch(() => {});
    }
  }
  /*
 * ============================================================
 * AUDIT LOG
 * ============================================================
 */

appendAuditLog(log) {
  const newLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

    timestamp: new Date().toISOString(),

    ...log,

    details:
      typeof log.details === "object" &&
      log.details !== null
        ? log.details
        : {
            message: String(log.details || "")
          }
  };

  this.auditLogs.unshift(newLog);

  if (this.auditLogs.length > 500) {
    this.auditLogs.pop();
  }

  try {
    sseManager.broadcastAuditLog(newLog);
  } catch (error) {
    console.warn(
      "SSE audit broadcast warning:",
      error?.message || error
    );
  }

  if (this.isPostgresConnected) {
  auditLogRepository
    .create({
      userId: log.userId,

      userEmail:
        log.userEmail ||
        log.userEmailAddress ||
        log.userName ||
        "Unknown User",

      action: log.action,

      category: log.category,

      severity: log.severity,

      details: log.details,

      ip: log.ipAddress || log.ip || "127.0.0.1",

      metadata:
        typeof log.details === "object" &&
        log.details !== null
          ? log.details
          : {
              info: log.details || ""
            }
    })
    .catch((error) => {
      console.warn(
        "Postgres audit log sync note:",
        error?.message || error
      );
    });
}

  return newLog;
}

  /*
   * ============================================================
   * INCIDENT
   * ============================================================
   */

  appendIncident(incident) {
    this.incidents.unshift(incident);

    if (this.incidents.length > 200) {
      this.incidents.pop();
    }

    try {
      sseManager.broadcastIncident(
        incident,
        true
      );
    } catch (error) {
      console.warn(
        "SSE incident broadcast warning:",
        error?.message || error
      );
    }

    if (this.isPostgresConnected) {
      incidentRepository
        .create(incident)
        .catch((error) => {
          console.warn(
            "Postgres incident sync note:",
            error?.message || error
          );
        });
    }

    return incident;
  }

  /*
   * ============================================================
   * ACTIVITY EVENT
   * ============================================================
   */

  appendActivityEvent(event) {
    this.activityEvents.unshift(event);

    if (this.activityEvents.length > 500) {
      this.activityEvents.pop();
    }

    try {
      sseManager.broadcastActivity(event);
    } catch (error) {
      console.warn(
        "SSE activity broadcast warning:",
        error?.message || error
      );
    }

    if (this.isPostgresConnected) {
      activityRepository
        .create(event)
        .catch((error) => {
          console.warn(
            "Postgres activity sync note:",
            error?.message || error
          );
        });
    }

    return event;
  }

  /*
   * ============================================================
   * ACCESS REQUEST
   * ============================================================
   */

  appendAccessRequest(request) {
    this.accessRequests.unshift(request);

    if (this.accessRequests.length > 100) {
      this.accessRequests.pop();
    }

    try {
      sseManager.broadcastAccessRequest(
        request,
        true
      );
    } catch (error) {
      console.warn(
        "SSE access request broadcast warning:",
        error?.message || error
      );
    }

    if (this.isPostgresConnected) {
      accessRequestRepository
        .create(request)
        .catch((error) => {
          console.warn(
            "Postgres access request sync note:",
            error?.message || error
          );
        });
    }

    return request;
  }

  /*
   * ============================================================
   * USER RISK / TRUST
   * ============================================================
   */

  updateUserRiskAndTrust(
    userId,
    riskScore,
    trustScore,
    riskLevel
  ) {
    const user = this.getUserById(userId);

    if (user) {
      user.currentRiskScore = riskScore;
      user.currentTrustScore = trustScore;
      user.currentRiskLevel = riskLevel;

      try {
        sseManager.broadcastRiskChange(
          userId,
          riskScore,
          riskLevel,
          user
        );

        sseManager.broadcastTrustChange(
          userId,
          trustScore,
          user
        );

        sseManager.broadcastUserUpdate(
          user,
          "Risk & Trust score dynamic update"
        );
      } catch (error) {
        console.warn(
          "SSE risk/trust broadcast warning:",
          error?.message || error
        );
      }
    }

    if (this.isPostgresConnected) {
      userRepository
        .updateRiskAndTrust(
          userId,
          riskScore,
          trustScore,
          riskLevel
        )
        .catch(() => {});
    }
  }

  /*
   * ============================================================
   * USER STATUS
   * ============================================================
   */

  updateUserStatus(userId, status) {
    const user = this.getUserById(userId);

    if (user) {
      user.status = status;

      try {
        sseManager.broadcastAccountStatus(
          userId,
          status,
          user
        );

        sseManager.broadcastUserUpdate(
          user,
          `Account status changed to ${status}`
        );
      } catch (error) {
        console.warn(
          "SSE account status broadcast warning:",
          error?.message || error
        );
      }
    }

    if (this.isPostgresConnected) {
      userRepository
        .updateStatus(userId, status)
        .catch(() => {});
    }
  }
}

const db = new EnterpriseDatabase();

export {
  EnterpriseDatabase,
  db
};