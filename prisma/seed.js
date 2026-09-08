import { PrismaClient, UserRole, DepartmentType, AccountStatus, DeviceStatus, ResourceSensitivity, EventSeverity, IncidentSeverity, IncidentStatus, AccessRequestStatus } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL;
const isValidPostgres = dbUrl && typeof dbUrl === 'string' && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'));
const prisma = isValidPostgres ? new PrismaClient() : null;

async function main() {
  if (!prisma) {
    console.log("ℹ️ Skipping Prisma seed: DATABASE_URL is not configured with a valid postgresql:// or postgres:// URI.");
    return;
  }
  console.log("🌱 Starting Enterprise Synthetic/Demo Database Seed...");
  const departments = [
    { code: DepartmentType.HR, name: "Human Resources", description: "Talent acquisition, employee relations, and compliance" },
    { code: DepartmentType.FINANCE, name: "Finance & Accounting", description: "Corporate treasury, payroll, FP&A, and auditing" },
    { code: DepartmentType.ENGINEERING, name: "Core Engineering", description: "Software architecture, cloud infrastructure, and product systems" },
    { code: DepartmentType.SALES, name: "Global Sales", description: "Enterprise accounts and client relations" },
    { code: DepartmentType.LEGAL, name: "Legal & Compliance", description: "Corporate governance and regulatory compliance" },
    { code: DepartmentType.EXECUTIVE, name: "Executive Leadership", description: "Executive committee and strategic management" },
    { code: DepartmentType.SECURITY, name: "Information Security / SOC", description: "Zero Trust architecture and security operations center" },
    { code: DepartmentType.IT, name: "Information Technology", description: "Enterprise systems and network administration" }
  ];
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept
    });
  }
  console.log("\u2705 Departments seeded");
  const roles = [
    { code: UserRole.EMPLOYEE, name: "Enterprise Employee", description: "Standard departmental access" },
    { code: UserRole.MANAGER, name: "Department Manager", description: "Team oversight and access request approval" },
    { code: UserRole.SECURITY_ADMIN, name: "SOC Security Analyst / Admin", description: "Full Zero Trust monitoring and incident containment" },
    { code: UserRole.SYSTEM_ADMIN, name: "Enterprise System Administrator", description: "Infrastructure and identity management" }
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r
    });
  }
  console.log("\u2705 Roles seeded");
  const existingPolicy = await prisma.zeroTrustPolicy.findFirst({ where: { isActive: true } });
  if (!existingPolicy) {
    await prisma.zeroTrustPolicy.create({
      data: {
        name: "Default Enterprise Zero Trust Policy",
        isActive: true,
        lowRiskMax: 39,
        mediumRiskMax: 59,
        highRiskMax: 74,
        veryHighRiskMax: 89,
        criticalThreshold: 90,
        mfaThreshold: 60,
        approvalThreshold: 75,
        restrictionThreshold: 90,
        freezeThreshold: 90,
        offHoursWeight: 20,
        crossDeptWeight: 28,
        volumeWeight: 25,
        deviceTrustWeight: 25,
        failedLoginWeight: 15
      }
    });
  }
  console.log("\u2705 Zero Trust Policy configured");
  const existingModel = await prisma.modelVersion.findFirst({ where: { version: "v2.4-cert-r4.2" } });
  let modelVersionId = existingModel?.id;
  if (!existingModel) {
    const createdModel = await prisma.modelVersion.create({
      data: {
        modelName: "Ensemble IsolationForest + XGBoost Meta-Ranker",
        version: "v2.4-cert-r4.2",
        rocAuc: 0.978,
        precision: 0.962,
        recall: 0.954,
        f1Score: 0.958,
        trainingDataset: "CERT Insider Threat Dataset r4.2 (14,280 samples)",
        featureCount: 12,
        isActive: true,
        metadata: {
          aucCurvePoints: 50,
          validatedFeatures: ["hourOfDay", "isOffHours", "downloadVolumeMB", "isCrossDepartment"]
        }
      }
    });
    modelVersionId = createdModel.id;
  }
  console.log("\u2705 ML Model Version registered");
  const demoUsers = [
    {
      id: "user-001",
      employeeId: "EMP100",
      name: "Alex Rivera",
      email: "alex.rivera@enterprise.corp",
      departmentCode: DepartmentType.SECURITY,
      roleCode: UserRole.SECURITY_ADMIN,
      status: AccountStatus.ACTIVE,
      riskScore: 14,
      trustScore: 96,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 8,
        normalEndHour: 19,
        avgDailyDownloadsMB: 25,
        maxNormalDownloadMB: 200,
        allowedDepartments: ["SECURITY", "IT", "ENGINEERING"],
        typicalLocations: ["San Francisco, US (HQ)", "VPN-US-West"]
      }
    },
    {
      id: "user-002",
      employeeId: "EMP101",
      name: "Marcus Vance",
      email: "marcus.vance@enterprise.corp",
      departmentCode: DepartmentType.IT,
      roleCode: UserRole.SYSTEM_ADMIN,
      status: AccountStatus.ACTIVE,
      riskScore: 18,
      trustScore: 94,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 8,
        normalEndHour: 18,
        avgDailyDownloadsMB: 40,
        maxNormalDownloadMB: 500,
        allowedDepartments: ["IT", "SECURITY", "ENGINEERING", "HR"],
        typicalLocations: ["San Francisco, US (HQ)", "VPN-US-East"]
      }
    },
    {
      id: "user-003",
      employeeId: "EMP102",
      name: "Sarah Jenkins",
      email: "sarah.jenkins@enterprise.corp",
      departmentCode: DepartmentType.HR,
      roleCode: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      riskScore: 22,
      trustScore: 91,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 9,
        normalEndHour: 17,
        avgDailyDownloadsMB: 15,
        maxNormalDownloadMB: 50,
        allowedDepartments: ["HR"],
        typicalLocations: ["San Francisco, US (HQ)"]
      }
    },
    {
      id: "user-004",
      employeeId: "EMP104",
      name: "Bob Vance",
      email: "bob.vance@enterprise.corp",
      departmentCode: DepartmentType.ENGINEERING,
      roleCode: UserRole.MANAGER,
      status: AccountStatus.ACTIVE,
      riskScore: 19,
      trustScore: 95,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 9,
        normalEndHour: 19,
        avgDailyDownloadsMB: 50,
        maxNormalDownloadMB: 800,
        allowedDepartments: ["ENGINEERING", "IT"],
        typicalLocations: ["San Francisco, US (HQ)", "San Jose, US"]
      }
    },
    {
      id: "user-005",
      employeeId: "EMP105",
      name: "David Kim",
      email: "david.kim@enterprise.corp",
      departmentCode: DepartmentType.ENGINEERING,
      roleCode: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      riskScore: 28,
      trustScore: 89,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 10,
        normalEndHour: 20,
        avgDailyDownloadsMB: 60,
        maxNormalDownloadMB: 1200,
        allowedDepartments: ["ENGINEERING"],
        typicalLocations: ["San Francisco, US (HQ)", "Remote-Austin-TX"]
      }
    },
    {
      id: "user-006",
      employeeId: "EMP108",
      name: "Elena Rostova",
      email: "elena.rostova@enterprise.corp",
      departmentCode: DepartmentType.FINANCE,
      roleCode: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      riskScore: 16,
      trustScore: 97,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 8,
        normalEndHour: 18,
        avgDailyDownloadsMB: 20,
        maxNormalDownloadMB: 100,
        allowedDepartments: ["FINANCE"],
        typicalLocations: ["New York, US (Finance Hub)"]
      }
    },
    {
      id: "user-007",
      employeeId: "EMP110",
      name: "Tom Bradley",
      email: "tom.bradley@enterprise.corp",
      departmentCode: DepartmentType.SALES,
      roleCode: UserRole.EMPLOYEE,
      status: AccountStatus.ACTIVE,
      riskScore: 34,
      trustScore: 84,
      riskLevel: EventSeverity.LOW,
      baseline: {
        normalStartHour: 8,
        normalEndHour: 18,
        avgDailyDownloadsMB: 15,
        maxNormalDownloadMB: 80,
        allowedDepartments: ["SALES"],
        typicalLocations: ["Chicago, US", "New York, US"]
      }
    }
  ];
  for (const u of demoUsers) {
    const userRecord = await prisma.user.upsert({
      where: { employeeId: u.employeeId },
      update: {
        name: u.name,
        email: u.email,
        departmentCode: u.departmentCode,
        roleCode: u.roleCode,
        status: u.status,
        riskScore: u.riskScore,
        trustScore: u.trustScore,
        riskLevel: u.riskLevel
      },
      create: {
        id: u.id,
        employeeId: u.employeeId,
        name: u.name,
        email: u.email,
        departmentCode: u.departmentCode,
        roleCode: u.roleCode,
        status: u.status,
        riskScore: u.riskScore,
        trustScore: u.trustScore,
        riskLevel: u.riskLevel
      }
    });
    await prisma.behaviorProfile.upsert({
      where: { userId: userRecord.id },
      update: {
        normalStartHour: u.baseline.normalStartHour,
        normalEndHour: u.baseline.normalEndHour,
        avgDailyDownloadsMB: u.baseline.avgDailyDownloadsMB,
        maxNormalDownloadMB: u.baseline.maxNormalDownloadMB,
        allowedDepartments: u.baseline.allowedDepartments,
        typicalLocations: u.baseline.typicalLocations
      },
      create: {
        userId: userRecord.id,
        normalStartHour: u.baseline.normalStartHour,
        normalEndHour: u.baseline.normalEndHour,
        avgDailyDownloadsMB: u.baseline.avgDailyDownloadsMB,
        maxNormalDownloadMB: u.baseline.maxNormalDownloadMB,
        allowedDepartments: u.baseline.allowedDepartments,
        typicalLocations: u.baseline.typicalLocations
      }
    });
  }
  console.log("\u2705 Demo Users & Baselines seeded");
  const demoDevices = [
    {
      deviceId: "dev-sec-01",
      userId: "user-001",
      name: "SecOps-MacBook-Pro-M3",
      os: "macOS 15.2",
      browser: "Chrome Enterprise 133.0",
      ip: "10.240.12.18",
      location: "San Francisco, US (HQ)",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 98
    },
    {
      deviceId: "dev-it-01",
      userId: "user-002",
      name: "Corp-ThinkPad-T14s-IT",
      os: "Windows 11 Enterprise (23H2)",
      browser: "Edge for Business 132.0",
      ip: "10.240.12.44",
      location: "San Francisco, US (HQ)",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 96
    },
    {
      deviceId: "dev-hr-01",
      userId: "user-003",
      name: "Corp-Dell-Latitude-HR01",
      os: "Windows 11 Pro",
      browser: "Chrome Enterprise 133.0",
      ip: "10.240.14.92",
      location: "San Francisco, US (HQ)",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 92
    },
    {
      deviceId: "dev-eng-01",
      userId: "user-005",
      name: "Ubuntu-DevStation-DK05",
      os: "Ubuntu 24.04 LTS",
      browser: "Firefox Developer 135.0",
      ip: "10.240.18.204",
      location: "San Francisco, US (HQ)",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 90
    },
    {
      deviceId: "dev-eng-02",
      userId: "user-004",
      name: "Corp-MacBook-Air-M2",
      os: "macOS 15.1",
      browser: "Chrome Enterprise 133.0",
      ip: "10.240.18.110",
      location: "San Francisco, US (HQ)",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 95
    },
    {
      deviceId: "dev-fin-01",
      userId: "user-006",
      name: "Corp-Surface-Laptop-Fin08",
      os: "Windows 11 Enterprise",
      browser: "Edge for Business 132.0",
      ip: "10.240.22.15",
      location: "New York, US (Finance Hub)",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 97
    },
    {
      deviceId: "dev-sales-01",
      userId: "user-007",
      name: "Sales-iPad-Pro-TB",
      os: "iPadOS 18.2",
      browser: "Safari Mobile 18.2",
      ip: "198.51.100.89",
      location: "Chicago, US",
      isTrusted: true,
      status: DeviceStatus.TRUSTED,
      trustScore: 88
    },
    {
      deviceId: "dev-untrusted-01",
      userId: "user-003",
      name: "Unknown-Kali-Linux-Node",
      os: "Kali Linux 2024.4",
      browser: "Tor Browser / Firefox ESR",
      ip: "185.220.101.5",
      location: "Bucharest, Romania (VPN Tor Exit)",
      isTrusted: false,
      status: DeviceStatus.SUSPICIOUS,
      trustScore: 15
    }
  ];
  for (const d of demoDevices) {
    const user = await prisma.user.findFirst({ where: { OR: [{ id: d.userId }, { employeeId: d.userId }] } });
    if (user) {
      await prisma.device.upsert({
        where: { deviceId: d.deviceId },
        update: {
          name: d.name,
          os: d.os,
          browser: d.browser,
          ip: d.ip,
          location: d.location,
          isTrusted: d.isTrusted,
          status: d.status,
          trustScore: d.trustScore
        },
        create: {
          deviceId: d.deviceId,
          userId: user.id,
          name: d.name,
          os: d.os,
          browser: d.browser,
          ip: d.ip,
          location: d.location,
          isTrusted: d.isTrusted,
          status: d.status,
          trustScore: d.trustScore
        }
      });
    }
  }
  console.log("\u2705 Demo Devices seeded");
  const demoResources = [
    {
      resourceId: "res-hr-01",
      name: "Workday HR Employee Portal",
      departmentCode: DepartmentType.HR,
      sensitivity: ResourceSensitivity.INTERNAL,
      requiredRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Standard employee directory, time-off requests, and performance self-reviews.",
      accessCount: 1420
    },
    {
      resourceId: "res-hr-02",
      name: "HR Personnel Confidential Records & SSN Database",
      departmentCode: DepartmentType.HR,
      sensitivity: ResourceSensitivity.CONFIDENTIAL,
      requiredRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Confidential employee records, background checks, medical leave data, and tax forms.",
      accessCount: 310
    },
    {
      resourceId: "res-fin-01",
      name: "Executive Payroll & Compensation Master",
      departmentCode: DepartmentType.FINANCE,
      sensitivity: ResourceSensitivity.HIGHLY_SENSITIVE,
      requiredRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Global corporate salary sheets, bonus allocations, equity grant records, and bank payouts.",
      accessCount: 88
    },
    {
      resourceId: "res-fin-02",
      name: "Corporate General Ledger & SAP Financials",
      departmentCode: DepartmentType.FINANCE,
      sensitivity: ResourceSensitivity.CONFIDENTIAL,
      requiredRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Quarterly financial statements, tax filings, vendor accounts payable, and auditing vaults.",
      accessCount: 450
    },
    {
      resourceId: "res-eng-01",
      name: "GitHub Enterprise Core Monorepo",
      departmentCode: DepartmentType.ENGINEERING,
      sensitivity: ResourceSensitivity.HIGHLY_SENSITIVE,
      requiredRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Proprietary core intellectual property, algorithms, trading engines, and source codes.",
      accessCount: 2940
    },
    {
      resourceId: "res-eng-02",
      name: "AWS Production Kubernetes Infrastructure",
      departmentCode: DepartmentType.ENGINEERING,
      sensitivity: ResourceSensitivity.HIGHLY_SENSITIVE,
      requiredRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Live production cloud infrastructure, secrets manager, and customer data clusters.",
      accessCount: 520
    },
    {
      resourceId: "res-sec-01",
      name: "CrowdStrike Falcon & SOC SIEM Management",
      departmentCode: DepartmentType.SECURITY,
      sensitivity: ResourceSensitivity.HIGHLY_SENSITIVE,
      requiredRoles: [UserRole.SECURITY_ADMIN, UserRole.SYSTEM_ADMIN],
      description: "Security incident records, threat intelligence feeds, sensor configs, and telemetry.",
      accessCount: 780
    },
    {
      resourceId: "res-it-01",
      name: "Active Directory / Okta Identity Management",
      departmentCode: DepartmentType.IT,
      sensitivity: ResourceSensitivity.HIGHLY_SENSITIVE,
      requiredRoles: [UserRole.SYSTEM_ADMIN, UserRole.SECURITY_ADMIN],
      description: "Enterprise SSO, directory services, domain controllers, and IAM role assignment.",
      accessCount: 610
    }
  ];
  for (const res of demoResources) {
    await prisma.resource.upsert({
      where: { resourceId: res.resourceId },
      update: {
        name: res.name,
        departmentCode: res.departmentCode,
        sensitivity: res.sensitivity,
        requiredRoles: res.requiredRoles,
        description: res.description,
        accessCount: res.accessCount
      },
      create: res
    });
  }
  console.log("\u2705 Enterprise Resources seeded");
  const sampleIncidents = [
    {
      incidentId: "INC-882194",
      title: "Mass Download of Confidential HR SSN Records During Non-Standard Hours",
      description: "User initiated bulk export of 1,200 SSN records at 02:40 AM from an unmanaged node.",
      severity: IncidentSeverity.HIGH,
      status: IncidentStatus.NEW,
      userEmployeeId: "EMP102",
      riskScore: 82,
      contributingFactors: [
        "Off-hours download (+25 risk)",
        "Unmanaged Kali node (+30 risk)",
        "High volume exfiltration: 1.2 GB (+27 risk)"
      ],
      mitreTechnique: "T1048 - Exfiltration Over Alternative Protocol",
      aiExplanation: "Heuristic and ML ensemble flags severe anomaly: download volume exceeds 24x normal baseline.",
      recommendedAction: "Isolate endpoint dev-untrusted-01 and freeze user EMP102 credentials."
    },
    {
      incidentId: "INC-741029",
      title: "Repeated Privilege Escalation Attempts on Okta Domain Controller",
      description: "6 failed administrative authentication probes within 90 seconds.",
      severity: IncidentSeverity.MEDIUM,
      status: IncidentStatus.INVESTIGATING,
      userEmployeeId: "EMP105",
      riskScore: 64,
      contributingFactors: [
        "Failed authentication spike (+20 risk)",
        "Cross-department resource probe (+24 risk)",
        "Sensitive directory enumeration (+20 risk)"
      ],
      mitreTechnique: "T1078 - Valid Accounts & Privilege Escalation",
      aiExplanation: "Behavior signature matches credential brute-force or privilege escalation exploration.",
      recommendedAction: "Enforce Step-Up MFA challenge and notify IT Systems Architect."
    }
  ];
  for (const inc of sampleIncidents) {
    const user = await prisma.user.findFirst({ where: { employeeId: inc.userEmployeeId } });
    if (user) {
      await prisma.incident.upsert({
        where: { incidentId: inc.incidentId },
        update: {
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          status: inc.status,
          riskScore: inc.riskScore,
          contributingFactors: inc.contributingFactors,
          mitreTechnique: inc.mitreTechnique,
          aiExplanation: inc.aiExplanation,
          recommendedAction: inc.recommendedAction
        },
        create: {
          incidentId: inc.incidentId,
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          status: inc.status,
          userId: user.id,
          userEmail: user.email,
          riskScore: inc.riskScore,
          contributingFactors: inc.contributingFactors,
          mitreTechnique: inc.mitreTechnique,
          aiExplanation: inc.aiExplanation,
          recommendedAction: inc.recommendedAction
        }
      });
    }
  }
  console.log("\u2705 Sample Incidents seeded");
  const sampleRequests = [
    {
      requestId: "REQ-49102",
      userEmployeeId: "EMP105",
      resourceId: "res-fin-01",
      justification: "Quarterly financial database integration testing for automated billing pipeline.",
      status: AccessRequestStatus.PENDING,
      riskAtRequest: 58,
      aiRiskAssessment: "Cross-department request to Highly Sensitive tier. Manager review mandatory."
    },
    {
      requestId: "REQ-38291",
      userEmployeeId: "EMP102",
      resourceId: "res-eng-01",
      justification: "Reviewing employee handbook repository inside GitHub monorepo.",
      status: AccessRequestStatus.PENDING,
      riskAtRequest: 38,
      aiRiskAssessment: "Low anomalous vector. Standard review applies."
    }
  ];
  for (const req of sampleRequests) {
    const user = await prisma.user.findFirst({ where: { employeeId: req.userEmployeeId } });
    const resource = await prisma.resource.findFirst({ where: { resourceId: req.resourceId } });
    if (user && resource) {
      await prisma.accessRequest.upsert({
        where: { requestId: req.requestId },
        update: {
          justification: req.justification,
          status: req.status,
          riskAtRequest: req.riskAtRequest,
          aiRiskAssessment: req.aiRiskAssessment
        },
        create: {
          requestId: req.requestId,
          userId: user.id,
          resourceId: resource.id,
          justification: req.justification,
          status: req.status,
          riskAtRequest: req.riskAtRequest,
          aiRiskAssessment: req.aiRiskAssessment
        }
      });
    }
  }
  console.log("\u2705 Sample Access Requests seeded");
  const auditEntries = [
    {
      action: "POLICY_EVALUATION_PDP",
      category: "ZERO_TRUST_PEP",
      severity: EventSeverity.INFO,
      details: "Zero Trust engine completed initial continuous posture evaluation across all 7 corporate identities.",
      ip: "10.240.12.18"
    },
    {
      action: "BASELINE_CALIBRATION",
      category: "UEBA_ENGINE",
      severity: EventSeverity.INFO,
      details: "CERT r4.2 12-dimensional feature weights loaded into active inference pipeline.",
      ip: "127.0.0.1"
    }
  ];
  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        category: entry.category,
        severity: entry.severity,
        details: entry.details,
        ip: entry.ip,
        userEmail: "system.sentinel@enterprise.corp"
      }
    });
  }
  console.log("\u2705 Initial Audit Logs seeded");
  console.log("\u2728 Synthetic Demo Database seed completed successfully!");
}
main().catch((e) => {
  console.error("\u274C Error seeding database:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
