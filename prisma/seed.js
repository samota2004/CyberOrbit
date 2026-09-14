import "dotenv/config";
import bcrypt from "bcrypt";

import {
  PrismaClient,
  UserRole,
  DepartmentType,
  AccountStatus,
  DeviceStatus,
  ResourceSensitivity,
  EventSeverity
} from "@prisma/client";

const dbUrl = process.env.DATABASE_URL;

const isValidPostgres =
  dbUrl &&
  typeof dbUrl === "string" &&
  (dbUrl.startsWith("postgresql://") ||
    dbUrl.startsWith("postgres://"));

const prisma = isValidPostgres ? new PrismaClient() : null;

const initialAdminPassword =
  process.env.ADMIN_INITIAL_PASSWORD;

if (!initialAdminPassword) {
  console.warn(
    "⚠️ ADMIN_INITIAL_PASSWORD is not set. Admin passwordHash will not be initialized."
  );
}

async function main() {
  if (!prisma) {
    console.log(
      "ℹ️ Skipping Prisma seed: DATABASE_URL is not configured with a valid PostgreSQL URI."
    );
    return;
  }

  console.log("🌱 Starting CyberOrbit database seed...");

  // ============================================================
  // DEPARTMENTS
  // ============================================================

  const departments = [
    {
      code: DepartmentType.HR,
      name: "Human Resources",
      description:
        "Talent acquisition, employee relations, and compliance"
    },
    {
      code: DepartmentType.FINANCE,
      name: "Finance & Accounting",
      description:
        "Corporate treasury, payroll, FP&A, and auditing"
    },
    {
      code: DepartmentType.ENGINEERING,
      name: "AI-ML & Core Engineering",
      description:
        "AI-ML development, software architecture, and product systems"
    },
    {
      code: DepartmentType.SALES,
      name: "Global Sales",
      description:
        "Enterprise accounts and client relations"
    },
    {
      code: DepartmentType.LEGAL,
      name: "Legal & Compliance",
      description:
        "Corporate governance and regulatory compliance"
    },
    {
      code: DepartmentType.EXECUTIVE,
      name: "Executive Leadership",
      description:
        "Executive committee and strategic management"
    },
    {
      code: DepartmentType.SECURITY,
      name: "Information Security / SOC",
      description:
        "Zero Trust architecture and security operations center"
    },
    {
      code: DepartmentType.IT,
      name: "Information Technology",
      description:
        "Enterprise systems and network administration"
    }
  ];

  for (const department of departments) {
    await prisma.department.upsert({
      where: {
        code: department.code
      },
      update: {
        name: department.name,
        description: department.description
      },
      create: department
    });
  }

  console.log("✅ Departments seeded");

  // ============================================================
  // ROLES
  // ============================================================

  const roles = [
    {
      code: UserRole.EMPLOYEE,
      name: "Enterprise Employee",
      description: "Standard departmental access"
    },
    {
      code: UserRole.MANAGER,
      name: "Department Manager",
      description:
        "Team oversight and access request approval"
    },
    {
      code: UserRole.SECURITY_ADMIN,
      name: "SOC Security Analyst / Admin",
      description:
        "Full Zero Trust monitoring and incident containment"
    },
    {
      code: UserRole.SYSTEM_ADMIN,
      name: "Enterprise System Administrator",
      description:
        "Infrastructure and identity management"
    }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        code: role.code
      },
      update: {
        name: role.name,
        description: role.description
      },
      create: role
    });
  }

  console.log("✅ Roles seeded");

  // ============================================================
  // ZERO TRUST POLICY
  // ============================================================

  const existingPolicy =
    await prisma.zeroTrustPolicy.findFirst({
      where: {
        isActive: true
      }
    });

  if (!existingPolicy) {
    await prisma.zeroTrustPolicy.create({
      data: {
        name: "Default CyberOrbit Zero Trust Policy",
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

  console.log("✅ Zero Trust policy configured");

  // ============================================================
  // ML MODEL VERSION
  // ============================================================

  const existingModel =
    await prisma.modelVersion.findFirst({
      where: {
        version: "v2.4-cert-r4.2"
      }
    });

  if (!existingModel) {
    await prisma.modelVersion.create({
      data: {
        modelName:
          "Ensemble IsolationForest + RandomForest Meta-Ranker",

        version: "v2.4-cert-r4.2",

        rocAuc: 0.978,
        precision: 0.962,
        recall: 0.954,
        f1Score: 0.958,

        trainingDataset:
          "CERT Insider Threat Dataset r4.2",

        featureCount: 12,

        isActive: true,

        metadata: {
          aucCurvePoints: 50,

          validatedFeatures: [
            "hourOfDay",
            "isOffHours",
            "downloadVolumeMB",
            "isCrossDepartment"
          ]
        }
      }
    });
  }

  console.log("✅ ML model version registered");

  // ============================================================
  // INITIAL ADMIN PASSWORD
  // ============================================================

  let adminPasswordHash = null;

  if (initialAdminPassword) {
    if (initialAdminPassword.length < 8) {
      throw new Error(
        "ADMIN_INITIAL_PASSWORD must be at least 8 characters long."
      );
    }

    adminPasswordHash = await bcrypt.hash(
      initialAdminPassword,
      12
    );

    console.log(
      "🔐 Admin password hashed successfully"
    );
  }

  // ============================================================
  // ONLY ADMIN USER
  // ============================================================

  const adminUser = {
    id: "user-001",

    employeeId: "ADMIN001",

    name: "Priyanka Samota",

    email: "priyankasamota946@gmail.com",

    status: AccountStatus.ACTIVE,

    departmentCode: DepartmentType.ENGINEERING,

    roleCode: UserRole.SECURITY_ADMIN,

    // Initial values only.
    // Employee risk should later be generated from
    // actual telemetry/activity through the ML pipeline.
    riskScore: 0,

    trustScore: 0,

    riskLevel: EventSeverity.LOW,

    baseline: {
      normalStartHour: 8,
      normalEndHour: 19,
      avgDailyDownloadsMB: 0,
      maxNormalDownloadMB: 0,
      allowedDepartments: [],
      typicalLocations: []
    }
  };

  // ============================================================
  // ADMIN USER
  // ============================================================

  const userRecord =
    await prisma.user.upsert({
      where: {
        id: adminUser.id
      },

      update: {
        employeeId: adminUser.employeeId,

        name: adminUser.name,

        email: adminUser.email,

        status: adminUser.status,

        riskScore: adminUser.riskScore,

        trustScore: adminUser.trustScore,

        riskLevel: adminUser.riskLevel,


        department: {
          connect: {
            code: adminUser.departmentCode
          }
        },

        role: {
          connect: {
            code: adminUser.roleCode
          }
        },

        ...(adminPasswordHash
          ? {
              passwordHash: adminPasswordHash,
              passwordChangedAt: new Date()
            }
          : {})
      },

      create: {
        id: adminUser.id,

        employeeId: adminUser.employeeId,

        name: adminUser.name,

        email: adminUser.email,

        status: adminUser.status,

        riskScore: adminUser.riskScore,

        trustScore: adminUser.trustScore,

        riskLevel: adminUser.riskLevel,


        ...(adminPasswordHash
          ? {
              passwordHash: adminPasswordHash,
              passwordChangedAt: new Date()
            }
          : {}),

        department: {
          connect: {
            code: adminUser.departmentCode
          }
        },

        role: {
          connect: {
            code: adminUser.roleCode
          }
        }
      }
    });

  console.log(
    `✅ Admin user configured: ${userRecord.email}`
  );

  // ============================================================
  // ADMIN BEHAVIOR PROFILE
  // ============================================================

  await prisma.behaviorProfile.upsert({
    where: {
      userId: userRecord.id
    },

    update: {
      normalStartHour:
        adminUser.baseline.normalStartHour,

      normalEndHour:
        adminUser.baseline.normalEndHour,

      avgDailyDownloadsMB:
        adminUser.baseline.avgDailyDownloadsMB,

      maxNormalDownloadMB:
        adminUser.baseline.maxNormalDownloadMB,

      allowedDepartments:
        adminUser.baseline.allowedDepartments,

      typicalLocations:
        adminUser.baseline.typicalLocations
    },

    create: {
      userId: userRecord.id,

      normalStartHour:
        adminUser.baseline.normalStartHour,

      normalEndHour:
        adminUser.baseline.normalEndHour,

      avgDailyDownloadsMB:
        adminUser.baseline.avgDailyDownloadsMB,

      maxNormalDownloadMB:
        adminUser.baseline.maxNormalDownloadMB,

      allowedDepartments:
        adminUser.baseline.allowedDepartments,

      typicalLocations:
        adminUser.baseline.typicalLocations
    }
  });

  console.log(
    "✅ Admin behavior profile configured"
  );

  // ============================================================
  // ONLY PRIYANKA'S DEVICE
  // ============================================================

  await prisma.device.upsert({
    where: {
      deviceId: "dev-admin-01"
    },

    update: {
      userId: userRecord.id,

      name: "Priyanka-Admin-Workstation",

      os: "Windows 11",

      browser: "Google Chrome",

      ip: "127.0.0.1",

      location:
        "Local Development Environment",

      isTrusted: true,

      status: DeviceStatus.TRUSTED,

      trustScore: 100
    },

    create: {
      deviceId: "dev-admin-01",

      userId: userRecord.id,

      name: "Priyanka-Admin-Workstation",

      os: "Windows 11",

      browser: "Google Chrome",

      ip: "127.0.0.1",

      location:
        "Local Development Environment",

      isTrusted: true,

      status: DeviceStatus.TRUSTED,

      trustScore: 100
    }
  });

  console.log(
    "✅ Priyanka's device configured"
  );

  // ============================================================
  // RESOURCES
  // ============================================================

  const resources = [
    {
      resourceId: "res-hr-01",

      name: "Workday HR Employee Portal",

      departmentCode:
        DepartmentType.HR,

      sensitivity:
        ResourceSensitivity.INTERNAL,

      requiredRoles: [
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Employee directory, time-off requests, and performance reviews.",

      accessCount: 0
    },

    {
      resourceId: "res-hr-02",

      name: "HR Confidential Records",

      departmentCode:
        DepartmentType.HR,

      sensitivity:
        ResourceSensitivity.CONFIDENTIAL,

      requiredRoles: [
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Confidential employee records and compliance information.",

      accessCount: 0
    },

    {
      resourceId: "res-fin-01",

      name: "Executive Payroll & Compensation",

      departmentCode:
        DepartmentType.FINANCE,

      sensitivity:
        ResourceSensitivity.HIGHLY_SENSITIVE,

      requiredRoles: [
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Corporate payroll, compensation, and financial records.",

      accessCount: 0
    },

    {
      resourceId: "res-fin-02",

      name: "Corporate General Ledger",

      departmentCode:
        DepartmentType.FINANCE,

      sensitivity:
        ResourceSensitivity.CONFIDENTIAL,

      requiredRoles: [
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Financial statements, tax filings, and vendor accounts.",

      accessCount: 0
    },

    {
      resourceId: "res-eng-01",

      name: "GitHub Enterprise Core Monorepo",

      departmentCode:
        DepartmentType.ENGINEERING,

      sensitivity:
        ResourceSensitivity.HIGHLY_SENSITIVE,

      requiredRoles: [
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Source code, algorithms, and proprietary engineering assets.",

      accessCount: 0
    },

    {
      resourceId: "res-eng-02",

      name: "AWS Production Infrastructure",

      departmentCode:
        DepartmentType.ENGINEERING,

      sensitivity:
        ResourceSensitivity.HIGHLY_SENSITIVE,

      requiredRoles: [
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Production infrastructure and cloud resources.",

      accessCount: 0
    },

    {
      resourceId: "res-sec-01",

      name: "SOC SIEM Management",

      departmentCode:
        DepartmentType.SECURITY,

      sensitivity:
        ResourceSensitivity.HIGHLY_SENSITIVE,

      requiredRoles: [
        UserRole.SECURITY_ADMIN,
        UserRole.SYSTEM_ADMIN
      ],

      description:
        "Security incidents, threat intelligence, and telemetry.",

      accessCount: 0
    },

    {
      resourceId: "res-it-01",

      name: "Identity Management System",

      departmentCode:
        DepartmentType.IT,

      sensitivity:
        ResourceSensitivity.HIGHLY_SENSITIVE,

      requiredRoles: [
        UserRole.SYSTEM_ADMIN,
        UserRole.SECURITY_ADMIN
      ],

      description:
        "Enterprise identity and access management resources.",

      accessCount: 0
    }
  ];

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: {
        resourceId: resource.resourceId
      },

      update: {
        name: resource.name,

        departmentCode:
          resource.departmentCode,

        sensitivity:
          resource.sensitivity,

        requiredRoles:
          resource.requiredRoles,

        description:
          resource.description,

        accessCount:
          resource.accessCount
      },

      create: resource
    });
  }

  console.log("✅ Resources seeded");

  // ============================================================
  // NO SAMPLE INCIDENTS
  // ============================================================

  console.log(
    "ℹ️ Sample incidents skipped. Incidents will be generated from actual telemetry."
  );

  // ============================================================
  // NO SAMPLE ACCESS REQUESTS
  // ============================================================

  console.log(
    "ℹ️ Sample access requests skipped. Requests will be created dynamically."
  );

  // ============================================================
  // INITIAL AUDIT LOG
  // ============================================================

  await prisma.auditLog.create({
    data: {
      action: "SYSTEM_INITIALIZED",

      category: "SYSTEM",

      severity: EventSeverity.INFO,

      details:
        "CyberOrbit Zero Trust platform initialized with Priyanka Samota as the Security Admin.",

      ip: "127.0.0.1",

      userEmail: adminUser.email
    }
  });

  console.log(
    "✅ Initial audit log created"
  );

  // ============================================================
  // FINAL OUTPUT
  // ============================================================

  console.log("");

  console.log(
    "✨ CyberOrbit database seed completed successfully!"
  );

  console.log("");

  console.log(
    "🔐 ADMIN LOGIN ACCOUNT"
  );

  console.log(
    "Name:     Priyanka Samota"
  );

  console.log(
    "Email:    priyankasamota946@gmail.com"
  );

  console.log(
    "Role:     SECURITY_ADMIN"
  );

  console.log(
    "Department: AI-ML & Core Engineering"
  );

  console.log(
    "Password: Value configured through ADMIN_INITIAL_PASSWORD"
  );

  console.log("");

  console.log(
    "📊 Initial Risk Score: 0"
  );

  console.log(
    "📊 Initial Trust Score: 0"
  );

  console.log(
    "ℹ️ Future employee risk/trust values should be generated from actual activity and ML analysis."
  );

  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "❌ Error seeding database:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });