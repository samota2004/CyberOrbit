import {
  userRepository,
  deviceRepository,
  resourceRepository,
  activityRepository,
  incidentRepository,
  accessRequestRepository,
  auditLogRepository,
  policyRepository
} from '../repositories/index.js';
import { checkDatabaseConnection } from './prisma.js';
import { sseManager } from '../services/sse.js';
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
      console.warn("\u26A0\uFE0F PostgreSQL Prisma initialization note:", err?.message || String(err));
    });
  }
  async initDatabaseLayer() {
    try {
      const connStatus = await checkDatabaseConnection();
      this.isPostgresConnected = connStatus.connected;
      if (connStatus.connected) {
        console.log("\u{1F4E6} Connected to PostgreSQL database via Prisma ORM");
        await this.syncFromPostgreSQL();
      } else {
        console.log(`\u2139\uFE0F Running in memory with Prisma schema ready. Status: ${connStatus.message}`);
      }
      return this.isPostgresConnected;
    } catch (e) {
      this.isPostgresConnected = false;
      console.warn("\u26A0\uFE0F Could not connect to PostgreSQL:", e?.message || e);
      return false;
    }
  }
  async syncFromPostgreSQL() {
    try {
      const [pgUsers, pgDevices, pgResources, pgEvents, pgIncidents, pgRequests, pgAuditLogs] = await Promise.all([
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
      const activePolicy = await policyRepository.getActivePolicy().catch(() => null);
      if (activePolicy) {
        this.policyConfig = {
          ...this.policyConfig,
          ...activePolicy
        };
      }
    } catch (err) {
      console.error("Error synchronizing data from PostgreSQL:", err);
    }
  }
  seedEnterpriseData() {
    this.resources = [
      {
        id: "res-hr-01",
        name: "Workday HR Employee Portal",
        department: "HR",
        sensitivity: "INTERNAL",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Standard employee directory, time-off requests, and performance self-reviews.",
        accessCount: 1420,
        restricted: false
      },
      {
        id: "res-hr-02",
        name: "HR Personnel Confidential Records & SSN Database",
        department: "HR",
        sensitivity: "CONFIDENTIAL",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Confidential employee records, background checks, medical leave data, and tax forms.",
        accessCount: 310,
        restricted: false
      },
      {
        id: "res-fin-01",
        name: "Executive Payroll & Compensation Master",
        department: "Finance",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Global corporate salary sheets, bonus allocations, equity grant records, and bank payouts.",
        accessCount: 88,
        restricted: false
      },
      {
        id: "res-fin-02",
        name: "Corporate General Ledger & SAP Financials",
        department: "Finance",
        sensitivity: "CONFIDENTIAL",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Quarterly financial statements, tax filings, vendor accounts payable, and auditing vaults.",
        accessCount: 450,
        restricted: false
      },
      {
        id: "res-eng-01",
        name: "GitHub Enterprise Core Monorepo",
        department: "Engineering",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Proprietary core intellectual property, algorithms, trading engines, and source codes.",
        accessCount: 2940,
        restricted: false
      },
      {
        id: "res-eng-02",
        name: "AWS Production Kubernetes Infrastructure",
        department: "Engineering",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Live production cloud infrastructure, secrets manager, and customer data clusters.",
        accessCount: 520,
        restricted: false
      },
      {
        id: "res-sec-01",
        name: "CrowdStrike Falcon & SOC SIEM Management",
        department: "Security",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: ["SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Security incident records, threat intelligence feeds, sensor configs, and telemetry.",
        accessCount: 780,
        restricted: false
      },
      {
        id: "res-it-01",
        name: "Active Directory / Okta Identity Management",
        department: "IT",
        sensitivity: "HIGHLY_SENSITIVE",
        requiredRole: ["SYSTEM_ADMIN", "SECURITY_ADMIN"],
        description: "Enterprise SSO, directory services, domain controllers, and IAM role assignment.",
        accessCount: 610,
        restricted: false
      },
      {
        id: "res-sales-01",
        name: "Salesforce Enterprise Customer CRM",
        department: "Sales",
        sensitivity: "INTERNAL",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Global enterprise accounts, customer contract pipelines, and contact rosters.",
        accessCount: 1850,
        restricted: false
      },
      {
        id: "res-mkt-01",
        name: "Figma Brand Assets & Public Marketing CMS",
        department: "Marketing",
        sensitivity: "PUBLIC",
        requiredRole: ["EMPLOYEE", "MANAGER", "SECURITY_ADMIN", "SYSTEM_ADMIN"],
        description: "Brand collateral, press releases, public vector logos, and social media media kits.",
        accessCount: 3100,
        restricted: false
      }
    ];
    this.users = [
      {
        id: "user-001",
        employeeId: "EMP100",
        name: "Alex Rivera",
        email: "alex.rivera@enterprise.corp",
        department: "Security",
        role: "SECURITY_ADMIN",
        status: "ACTIVE",
        currentRiskScore: 14,
        currentRiskLevel: "LOW",
        currentTrustScore: 96,
        createdAt: "2025-01-10T08:00:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 15).toISOString(),
        activeDeviceId: "dev-sec-01",
        baseline: {
          normalWorkHours: { start: 8, end: 19 },
          avgDownloadsPerDay: 25,
          maxDownloadVolumeMB: 200,
          primaryDepartment: "Security",
          allowedDepartments: ["Security", "IT", "Engineering"],
          typicalLocations: ["San Francisco, US (HQ)", "VPN-US-West"],
          knownDeviceIds: ["dev-sec-01"],
          normalResourceIds: ["res-sec-01", "res-it-01", "res-hr-01"]
        }
      },
      {
        id: "user-002",
        employeeId: "EMP101",
        name: "Marcus Vance",
        email: "marcus.vance@enterprise.corp",
        department: "IT",
        role: "SYSTEM_ADMIN",
        status: "ACTIVE",
        currentRiskScore: 18,
        currentRiskLevel: "LOW",
        currentTrustScore: 94,
        createdAt: "2024-11-05T09:00:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 45).toISOString(),
        activeDeviceId: "dev-it-01",
        baseline: {
          normalWorkHours: { start: 8, end: 18 },
          avgDownloadsPerDay: 40,
          maxDownloadVolumeMB: 500,
          primaryDepartment: "IT",
          allowedDepartments: ["IT", "Security", "Engineering", "HR"],
          typicalLocations: ["San Francisco, US (HQ)", "VPN-US-East"],
          knownDeviceIds: ["dev-it-01"],
          normalResourceIds: ["res-it-01", "res-sec-01", "res-hr-01"]
        }
      },
      {
        id: "user-003",
        employeeId: "EMP102",
        name: "Sarah Jenkins",
        email: "sarah.jenkins@enterprise.corp",
        department: "HR",
        role: "EMPLOYEE",
        status: "ACTIVE",
        currentRiskScore: 22,
        currentRiskLevel: "LOW",
        currentTrustScore: 91,
        createdAt: "2025-02-14T09:30:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 120).toISOString(),
        activeDeviceId: "dev-hr-01",
        baseline: {
          normalWorkHours: { start: 9, end: 17 },
          avgDownloadsPerDay: 15,
          maxDownloadVolumeMB: 50,
          primaryDepartment: "HR",
          allowedDepartments: ["HR"],
          typicalLocations: ["San Francisco, US (HQ)"],
          knownDeviceIds: ["dev-hr-01"],
          normalResourceIds: ["res-hr-01", "res-hr-02"]
        }
      },
      {
        id: "user-004",
        employeeId: "EMP104",
        name: "Bob Vance",
        email: "bob.vance@enterprise.corp",
        department: "Engineering",
        role: "MANAGER",
        status: "ACTIVE",
        currentRiskScore: 19,
        currentRiskLevel: "LOW",
        currentTrustScore: 95,
        createdAt: "2024-08-19T08:30:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 30).toISOString(),
        activeDeviceId: "dev-eng-02",
        baseline: {
          normalWorkHours: { start: 9, end: 19 },
          avgDownloadsPerDay: 50,
          maxDownloadVolumeMB: 800,
          primaryDepartment: "Engineering",
          allowedDepartments: ["Engineering", "IT"],
          typicalLocations: ["San Francisco, US (HQ)", "San Jose, US"],
          knownDeviceIds: ["dev-eng-02"],
          normalResourceIds: ["res-eng-01", "res-eng-02", "res-hr-01"]
        }
      },
      {
        id: "user-005",
        employeeId: "EMP105",
        name: "David Kim",
        email: "david.kim@enterprise.corp",
        department: "Engineering",
        role: "EMPLOYEE",
        status: "ACTIVE",
        currentRiskScore: 28,
        currentRiskLevel: "LOW",
        currentTrustScore: 89,
        createdAt: "2025-01-20T10:00:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 180).toISOString(),
        activeDeviceId: "dev-eng-01",
        baseline: {
          normalWorkHours: { start: 10, end: 20 },
          avgDownloadsPerDay: 60,
          maxDownloadVolumeMB: 1200,
          primaryDepartment: "Engineering",
          allowedDepartments: ["Engineering"],
          typicalLocations: ["San Francisco, US (HQ)", "Remote-Austin-TX"],
          knownDeviceIds: ["dev-eng-01"],
          normalResourceIds: ["res-eng-01", "res-eng-02"]
        }
      },
      {
        id: "user-006",
        employeeId: "EMP108",
        name: "Elena Rostova",
        email: "elena.rostova@enterprise.corp",
        department: "Finance",
        role: "EMPLOYEE",
        status: "ACTIVE",
        currentRiskScore: 16,
        currentRiskLevel: "LOW",
        currentTrustScore: 97,
        createdAt: "2024-09-01T09:00:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 90).toISOString(),
        activeDeviceId: "dev-fin-01",
        baseline: {
          normalWorkHours: { start: 8, end: 18 },
          avgDownloadsPerDay: 20,
          maxDownloadVolumeMB: 100,
          primaryDepartment: "Finance",
          allowedDepartments: ["Finance"],
          typicalLocations: ["New York, US (Finance Hub)"],
          knownDeviceIds: ["dev-fin-01"],
          normalResourceIds: ["res-fin-01", "res-fin-02", "res-hr-01"]
        }
      },
      {
        id: "user-007",
        employeeId: "EMP110",
        name: "Tom Bradley",
        email: "tom.bradley@enterprise.corp",
        department: "Sales",
        role: "EMPLOYEE",
        status: "ACTIVE",
        currentRiskScore: 34,
        currentRiskLevel: "LOW",
        currentTrustScore: 84,
        createdAt: "2025-03-01T08:00:00Z",
        lastLoginAt: new Date(Date.now() - 1e3 * 60 * 240).toISOString(),
        activeDeviceId: "dev-sales-01",
        baseline: {
          normalWorkHours: { start: 8, end: 18 },
          avgDownloadsPerDay: 15,
          maxDownloadVolumeMB: 80,
          primaryDepartment: "Sales",
          allowedDepartments: ["Sales", "Marketing"],
          typicalLocations: ["Chicago, US", "New York, US"],
          knownDeviceIds: ["dev-sales-01"],
          normalResourceIds: ["res-sales-01", "res-mkt-01"]
        }
      }
    ];
    this.devices = [
      {
        id: "dev-sec-01",
        userId: "user-001",
        userName: "Alex Rivera",
        deviceName: "SecOps-MacBook-Pro-M3",
        os: "macOS 15.2",
        browser: "Chrome Enterprise 133.0",
        ipAddress: "10.240.12.18",
        location: "San Francisco, US (HQ)",
        firstSeen: "2025-01-10T08:30:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 98
      },
      {
        id: "dev-it-01",
        userId: "user-002",
        userName: "Marcus Vance",
        deviceName: "Corp-ThinkPad-T14s-IT",
        os: "Windows 11 Enterprise (23H2)",
        browser: "Edge for Business 132.0",
        ipAddress: "10.240.12.44",
        location: "San Francisco, US (HQ)",
        firstSeen: "2024-11-05T09:15:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 96
      },
      {
        id: "dev-hr-01",
        userId: "user-003",
        userName: "Sarah Jenkins",
        deviceName: "Corp-Dell-Latitude-HR01",
        os: "Windows 11 Pro",
        browser: "Chrome Enterprise 133.0",
        ipAddress: "10.240.14.92",
        location: "San Francisco, US (HQ)",
        firstSeen: "2025-02-14T10:00:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 92
      },
      {
        id: "dev-eng-01",
        userId: "user-005",
        userName: "David Kim",
        deviceName: "Ubuntu-DevStation-DK05",
        os: "Ubuntu 24.04 LTS",
        browser: "Firefox Developer 135.0",
        ipAddress: "10.240.18.204",
        location: "San Francisco, US (HQ)",
        firstSeen: "2025-01-20T10:15:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 90
      },
      {
        id: "dev-eng-02",
        userId: "user-004",
        userName: "Bob Vance",
        deviceName: "Corp-MacBook-Air-M2",
        os: "macOS 15.1",
        browser: "Chrome Enterprise 133.0",
        ipAddress: "10.240.18.110",
        location: "San Francisco, US (HQ)",
        firstSeen: "2024-08-19T09:00:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 95
      },
      {
        id: "dev-fin-01",
        userId: "user-006",
        userName: "Elena Rostova",
        deviceName: "Corp-Surface-Laptop-Fin08",
        os: "Windows 11 Enterprise",
        browser: "Edge for Business 132.0",
        ipAddress: "10.240.22.15",
        location: "New York, US (Finance Hub)",
        firstSeen: "2024-09-01T09:30:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 97
      },
      {
        id: "dev-sales-01",
        userId: "user-007",
        userName: "Tom Bradley",
        deviceName: "Sales-iPad-Pro-TB",
        os: "iPadOS 18.2",
        browser: "Safari Mobile 18.2",
        ipAddress: "198.51.100.89",
        location: "Chicago, US",
        firstSeen: "2025-03-01T08:30:00Z",
        lastSeen: (/* @__PURE__ */ new Date()).toISOString(),
        isTrusted: true,
        status: "TRUSTED",
        trustScore: 88
      },
      {
        id: "dev-untrusted-01",
        userId: "user-003",
        userName: "Sarah Jenkins",
        deviceName: "Unknown-Kali-Linux-Node",
        os: "Kali Linux 2024.4",
        browser: "Tor Browser / Firefox ESR",
        ipAddress: "185.220.101.5",
        location: "Bucharest, Romania (VPN Tor Exit)",
        firstSeen: new Date(Date.now() - 1e3 * 60 * 300).toISOString(),
        lastSeen: new Date(Date.now() - 1e3 * 60 * 60).toISOString(),
        isTrusted: false,
        status: "SUSPICIOUS",
        trustScore: 15
      }
    ];
    this.users.forEach((u) => {
      const now2 = Date.now();
      this.trustHistories[u.id] = [
        {
          timestamp: new Date(now2 - 864e5 * 4).toISOString(),
          trustScore: 96,
          riskScore: 12,
          eventSummary: "Standard workstation login & HR portal access"
        },
        {
          timestamp: new Date(now2 - 864e5 * 3).toISOString(),
          trustScore: 95,
          riskScore: 14,
          eventSummary: "Regular document updates within permitted department"
        },
        {
          timestamp: new Date(now2 - 864e5 * 2).toISOString(),
          trustScore: 94,
          riskScore: 16,
          eventSummary: "Routine end-of-day sign-off"
        },
        {
          timestamp: new Date(now2 - 864e5 * 1).toISOString(),
          trustScore: u.currentTrustScore || 90,
          riskScore: u.currentRiskScore || 15,
          eventSummary: "Initial morning UEBA baseline synchronization"
        }
      ];
    });
    const now = Date.now();
    this.activityEvents = [
      {
        id: "evt-001",
        userId: "user-001",
        userEmail: "alex.rivera@enterprise.corp",
        userName: "Alex Rivera",
        userDepartment: "Security",
        timestamp: new Date(now - 1e3 * 60 * 20).toISOString(),
        eventType: "LOGIN",
        deviceId: "dev-sec-01",
        deviceName: "SecOps-MacBook-Pro-M3",
        deviceTrustScore: 98,
        isUnknownDevice: false,
        ipAddress: "10.240.12.18",
        location: "San Francisco, US (HQ)",
        severity: "LOW",
        riskContribution: 10,
        mlAnomalyScore: 0.05,
        isAnomalous: false,
        metadata: { authMethod: "FIDO2 WebAuthn", mfaPassed: true }
      },
      {
        id: "evt-002",
        userId: "user-001",
        userEmail: "alex.rivera@enterprise.corp",
        userName: "Alex Rivera",
        userDepartment: "Security",
        timestamp: new Date(now - 1e3 * 60 * 15).toISOString(),
        eventType: "RESOURCE_ACCESS",
        resourceId: "res-sec-01",
        resourceName: "CrowdStrike Falcon & SOC SIEM Management",
        resourceDepartment: "Security",
        resourceSensitivity: "HIGHLY_SENSITIVE",
        deviceId: "dev-sec-01",
        deviceName: "SecOps-MacBook-Pro-M3",
        deviceTrustScore: 98,
        isUnknownDevice: false,
        ipAddress: "10.240.12.18",
        location: "San Francisco, US (HQ)",
        severity: "LOW",
        riskContribution: 12,
        mlAnomalyScore: 0.08,
        isAnomalous: false,
        metadata: { action: "READ_TELEMETRY" }
      },
      {
        id: "evt-003",
        userId: "user-006",
        userEmail: "elena.rostova@enterprise.corp",
        userName: "Elena Rostova",
        userDepartment: "Finance",
        timestamp: new Date(now - 1e3 * 60 * 75).toISOString(),
        eventType: "FILE_ACCESS",
        resourceId: "res-fin-02",
        resourceName: "Corporate General Ledger & SAP Financials",
        resourceDepartment: "Finance",
        resourceSensitivity: "CONFIDENTIAL",
        deviceId: "dev-fin-01",
        deviceName: "Corp-Surface-Laptop-Fin08",
        deviceTrustScore: 97,
        isUnknownDevice: false,
        ipAddress: "10.240.22.15",
        location: "New York, US (Finance Hub)",
        severity: "LOW",
        riskContribution: 14,
        mlAnomalyScore: 0.07,
        isAnomalous: false,
        metadata: { fileName: "Q3_Balance_Sheet_Audit.xlsx", fileSizeMB: 12 }
      },
      {
        id: "evt-004",
        userId: "user-005",
        userEmail: "david.kim@enterprise.corp",
        userName: "David Kim",
        userDepartment: "Engineering",
        timestamp: new Date(now - 1e3 * 60 * 110).toISOString(),
        eventType: "RESOURCE_ACCESS",
        resourceId: "res-eng-01",
        resourceName: "GitHub Enterprise Core Monorepo",
        resourceDepartment: "Engineering",
        resourceSensitivity: "HIGHLY_SENSITIVE",
        deviceId: "dev-eng-01",
        deviceName: "Ubuntu-DevStation-DK05",
        deviceTrustScore: 90,
        isUnknownDevice: false,
        ipAddress: "10.240.18.204",
        location: "San Francisco, US (HQ)",
        severity: "LOW",
        riskContribution: 20,
        mlAnomalyScore: 0.12,
        isAnomalous: false,
        metadata: { branch: "feature/auth-service", commitCount: 4 }
      },
      {
        id: "evt-005",
        userId: "user-003",
        userEmail: "sarah.jenkins@enterprise.corp",
        userName: "Sarah Jenkins",
        userDepartment: "HR",
        timestamp: new Date(now - 1e3 * 60 * 180).toISOString(),
        eventType: "FILE_DOWNLOAD",
        resourceId: "res-hr-01",
        resourceName: "Workday HR Employee Portal",
        resourceDepartment: "HR",
        resourceSensitivity: "INTERNAL",
        deviceId: "dev-hr-01",
        deviceName: "Corp-Dell-Latitude-HR01",
        deviceTrustScore: 92,
        isUnknownDevice: false,
        ipAddress: "10.240.14.92",
        location: "San Francisco, US (HQ)",
        severity: "LOW",
        riskContribution: 15,
        mlAnomalyScore: 0.09,
        isAnomalous: false,
        metadata: { fileCount: 8, downloadSizeMB: 18 }
      }
    ];
    this.incidents = [
      {
        id: "inc-2026-089",
        userId: "user-007",
        userName: "Tom Bradley",
        userEmail: "tom.bradley@enterprise.corp",
        userDepartment: "Sales",
        eventId: "evt-seed-inc-01",
        eventType: "UNUSUAL_LOCATION",
        severity: "MEDIUM",
        riskScore: 62,
        status: "UNDER_REVIEW",
        detectedAt: new Date(now - 1e3 * 60 * 360).toISOString(),
        aiExplanation: "Sales representative logged in from unfamiliar IP range in Chicago outside established geofence baseline during off-work hours.",
        contributingFactors: [
          "Unrecognized IP Subnet (198.51.100.89)",
          "Login at 04:30 AM (outside 08:00-18:00 baseline)",
          "Session initiated via mobile iPad device"
        ],
        recommendedAction: "MFA",
        adminActionTaken: "Adaptive Step-Up MFA Challenge Enforced",
        analystNotes: "Verified with manager as legitimate travel demo. Monitored for subsequent file access anomalies."
      }
    ];
    this.accessRequests = [
      {
        id: "req-001",
        userId: "user-003",
        userName: "Sarah Jenkins",
        userDepartment: "HR",
        resourceId: "res-fin-01",
        resourceName: "Executive Payroll & Compensation Master",
        resourceDepartment: "Finance",
        resourceSensitivity: "HIGHLY_SENSITIVE",
        reason: "Q3 Annual Benefits reconciliation & compensation parity review across department leaders.",
        requestedAt: new Date(now - 1e3 * 60 * 420).toISOString(),
        riskScoreAtRequest: 58,
        aiRiskAssessment: "Cross-department access: HR requesting HIGHLY_SENSITIVE Finance asset. Risk is moderate due to sensitive data volume.",
        status: "PENDING"
      }
    ];
    this.auditLogs = [
      {
        id: "aud-001",
        timestamp: new Date(now - 1e3 * 60 * 500).toISOString(),
        userId: "user-002",
        userName: "Marcus Vance",
        action: "POLICY_THRESHOLD_UPDATE",
        category: "POLICY",
        severity: "INFO",
        details: { change: "High risk MFA threshold adjusted from 65 to 60" },
        ipAddress: "10.240.12.44"
      },
      {
        id: "aud-002",
        timestamp: new Date(now - 1e3 * 60 * 360).toISOString(),
        userId: "user-007",
        userName: "Tom Bradley",
        action: "STEP_UP_MFA_CHALLENGE_ISSUED",
        category: "MFA",
        severity: "WARNING",
        details: { reason: "Off-hours login anomaly", riskScore: 62 },
        ipAddress: "198.51.100.89"
      },
      {
        id: "aud-003",
        timestamp: new Date(now - 1e3 * 60 * 20).toISOString(),
        userId: "user-001",
        userName: "Alex Rivera",
        action: "USER_AUTHENTICATION_SUCCESS",
        category: "AUTH",
        severity: "INFO",
        details: { method: "FIDO2_HARDWARE_KEY", deviceId: "dev-sec-01" },
        ipAddress: "10.240.12.18"
      }
    ];
  }
  // Helper getters and query methods
  getUserById(id) {
    return this.users.find((u) => u.id === id || u.employeeId === id);
  }
  getUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
  getDeviceById(id) {
    return this.devices.find((d) => d.id === id);
  }
  getResourceById(id) {
    return this.resources.find((r) => r.id === id);
  }
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
      userRepository.recordTrustHistory(
        userId,
        point.trustScore,
        point.riskScore,
        point.eventSummary,
        0
      ).catch(() => {
      });
    }
  }
  appendAuditLog(log) {
    const newLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...log,
      details: typeof log.details === "object" && log.details !== null ? log.details : { message: String(log.details) }
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    sseManager.broadcastAuditLog(newLog);
    if (this.isPostgresConnected) {
      auditLogRepository.create({
        userId: log.userId,
        userEmail: log.userName,
        action: log.action,
        category: log.category,
        severity: log.severity,
        details: log.details,
        ip: log.ipAddress || "127.0.0.1",
        metadata: typeof log.details === "object" ? log.details : { info: log.details }
      }).catch(() => {
      });
    }
    return newLog;
  }
  appendIncident(incident) {
    this.incidents.unshift(incident);
    if (this.incidents.length > 200) {
      this.incidents.pop();
    }
    sseManager.broadcastIncident(incident, true);
    if (this.isPostgresConnected) {
      incidentRepository.create(incident).catch((err) => {
        console.warn("Postgres incident sync note:", err?.message || err);
      });
    }
    return incident;
  }
  appendActivityEvent(event) {
    this.activityEvents.unshift(event);
    if (this.activityEvents.length > 500) {
      this.activityEvents.pop();
    }
    sseManager.broadcastActivity(event);
    if (this.isPostgresConnected) {
      activityRepository.create(event).catch((err) => {
        console.warn("Postgres activity sync note:", err?.message || err);
      });
    }
    return event;
  }
  appendAccessRequest(req) {
    this.accessRequests.unshift(req);
    if (this.accessRequests.length > 100) {
      this.accessRequests.pop();
    }
    sseManager.broadcastAccessRequest(req, true);
    if (this.isPostgresConnected) {
      accessRequestRepository.create(req).catch((err) => {
        console.warn("Postgres access request sync note:", err?.message || err);
      });
    }
    return req;
  }
  updateUserRiskAndTrust(userId, riskScore, trustScore, riskLevel) {
    const user = this.getUserById(userId);
    if (user) {
      user.currentRiskScore = riskScore;
      user.currentTrustScore = trustScore;
      user.currentRiskLevel = riskLevel;
      sseManager.broadcastRiskChange(userId, riskScore, riskLevel, user);
      sseManager.broadcastTrustChange(userId, trustScore, user);
      sseManager.broadcastUserUpdate(user, "Risk & Trust score dynamic update");
    }
    if (this.isPostgresConnected) {
      userRepository.updateRiskAndTrust(userId, riskScore, trustScore, riskLevel).catch(() => {
      });
    }
  }
  updateUserStatus(userId, status) {
    const user = this.getUserById(userId);
    if (user) {
      user.status = status;
      sseManager.broadcastAccountStatus(userId, status, user);
      sseManager.broadcastUserUpdate(user, `Account status changed to ${status}`);
    }
    if (this.isPostgresConnected) {
      userRepository.updateStatus(userId, status).catch(() => {
      });
    }
  }
}
const db = new EnterpriseDatabase();
export {
  EnterpriseDatabase,
  db
};
