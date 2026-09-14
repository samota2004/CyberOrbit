-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'SECURITY_ADMIN', 'SYSTEM_ADMIN');

-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('HR', 'FINANCE', 'ENGINEERING', 'SALES', 'LEGAL', 'EXECUTIVE', 'SECURITY', 'IT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'INVESTIGATION', 'DISABLED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('TRUSTED', 'MONITORED', 'SUSPICIOUS', 'REVOKED');

-- CreateEnum
CREATE TYPE "ResourceSensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_SENSITIVE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'FILE_ACCESS', 'FILE_DOWNLOAD', 'PRIVILEGE_ELEVATION', 'USB_TRANSFER', 'POLICY_VIOLATION', 'UNUSUAL_HOURS_ACCESS', 'CROSS_DEPT_ACCESS', 'MASS_DOWNLOAD');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PolicyAction" AS ENUM ('ALLOW', 'MONITOR', 'MFA', 'REQUIRE_APPROVAL', 'RESTRICT', 'FREEZE');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('NEW', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MfaSessionStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" "DepartmentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "roleCode" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "departmentCode" "DepartmentType" NOT NULL DEFAULT 'ENGINEERING',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "riskLevel" "EventSeverity" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normalStartHour" INTEGER NOT NULL DEFAULT 9,
    "normalEndHour" INTEGER NOT NULL DEFAULT 18,
    "avgDailyDownloadsMB" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "maxNormalDownloadMB" DOUBLE PRECISION NOT NULL DEFAULT 200.0,
    "typicalLocations" TEXT[] DEFAULT ARRAY['San Francisco, USA', 'HQ Network']::TEXT[],
    "allowedDepartments" TEXT[] DEFAULT ARRAY['ENGINEERING']::TEXT[],
    "knownIpSubnets" TEXT[] DEFAULT ARRAY['10.0.0.0/16', '192.168.1.0/24']::TEXT[],
    "offHoursAccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "crossDeptAccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavior_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "isTrusted" BOOLEAN NOT NULL DEFAULT true,
    "status" "DeviceStatus" NOT NULL DEFAULT 'TRUSTED',
    "fingerprint" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmentCode" "DepartmentType" NOT NULL,
    "sensitivity" "ResourceSensitivity" NOT NULL DEFAULT 'INTERNAL',
    "requiredRoles" "UserRole"[] DEFAULT ARRAY['EMPLOYEE']::"UserRole"[],
    "description" TEXT,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" "UserRole" NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "type" "EventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "riskContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mlAnomalyScore" DOUBLE PRECISION,
    "isOffHours" BOOLEAN NOT NULL DEFAULT false,
    "isCrossDepartment" BOOLEAN NOT NULL DEFAULT false,
    "downloadSizeMB" DOUBLE PRECISION,
    "failedAttempts" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "incidentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" "EventSeverity" NOT NULL,
    "factors" JSONB NOT NULL,
    "anomalyScore" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_histories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trustScore" DOUBLE PRECISION NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IncidentStatus" NOT NULL DEFAULT 'NEW',
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "contributingFactors" TEXT[],
    "mitreTechnique" TEXT,
    "aiExplanation" TEXT,
    "recommendedAction" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "riskAtRequest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiRiskAssessment" TEXT,
    "reviewedBy" TEXT,
    "decisionReason" TEXT,
    "decisionTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "details" TEXT NOT NULL,
    "ip" TEXT DEFAULT '127.0.0.1',
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zero_trust_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Enterprise Zero Trust Policy',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lowRiskMax" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "mediumRiskMax" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "highRiskMax" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "veryHighRiskMax" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "criticalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "mfaThreshold" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "approvalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "restrictionThreshold" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "freezeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "offHoursWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "crossDeptWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "volumeWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "deviceTrustWeight" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "failedLoginWeight" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zero_trust_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeHash" TEXT NOT NULL,
    "status" "MfaSessionStatus" NOT NULL DEFAULT 'PENDING',
    "action" TEXT,
    "targetResource" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "rocAuc" DOUBLE PRECISION NOT NULL DEFAULT 0.978,
    "precision" DOUBLE PRECISION NOT NULL DEFAULT 0.962,
    "recall" DOUBLE PRECISION NOT NULL DEFAULT 0.954,
    "f1Score" DOUBLE PRECISION NOT NULL DEFAULT 0.958,
    "trainingDataset" TEXT NOT NULL DEFAULT 'CERT Insider Threat Dataset r4.2',
    "featureCount" INTEGER NOT NULL DEFAULT 12,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ml_predictions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelVersionId" TEXT,
    "featureVector" JSONB NOT NULL,
    "anomalyScore" DOUBLE PRECISION NOT NULL,
    "isAnomalous" BOOLEAN NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "attributions" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ml_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleCode_idx" ON "users"("roleCode");

-- CreateIndex
CREATE INDEX "users_departmentCode_idx" ON "users"("departmentCode");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_riskScore_idx" ON "users"("riskScore");

-- CreateIndex
CREATE INDEX "users_trustScore_idx" ON "users"("trustScore");

-- CreateIndex
CREATE UNIQUE INDEX "behavior_profiles_userId_key" ON "behavior_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "devices_userId_idx" ON "devices"("userId");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_trustScore_idx" ON "devices"("trustScore");

-- CreateIndex
CREATE INDEX "devices_ip_idx" ON "devices"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "resources_resourceId_key" ON "resources"("resourceId");

-- CreateIndex
CREATE INDEX "resources_departmentCode_idx" ON "resources"("departmentCode");

-- CreateIndex
CREATE INDEX "resources_sensitivity_idx" ON "resources"("sensitivity");

-- CreateIndex
CREATE UNIQUE INDEX "activity_events_eventId_key" ON "activity_events"("eventId");

-- CreateIndex
CREATE INDEX "activity_events_userId_idx" ON "activity_events"("userId");

-- CreateIndex
CREATE INDEX "activity_events_deviceId_idx" ON "activity_events"("deviceId");

-- CreateIndex
CREATE INDEX "activity_events_resourceId_idx" ON "activity_events"("resourceId");

-- CreateIndex
CREATE INDEX "activity_events_type_idx" ON "activity_events"("type");

-- CreateIndex
CREATE INDEX "activity_events_severity_idx" ON "activity_events"("severity");

-- CreateIndex
CREATE INDEX "activity_events_timestamp_idx" ON "activity_events"("timestamp");

-- CreateIndex
CREATE INDEX "risk_scores_userId_idx" ON "risk_scores"("userId");

-- CreateIndex
CREATE INDEX "risk_scores_timestamp_idx" ON "risk_scores"("timestamp");

-- CreateIndex
CREATE INDEX "trust_histories_userId_idx" ON "trust_histories"("userId");

-- CreateIndex
CREATE INDEX "trust_histories_timestamp_idx" ON "trust_histories"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_incidentId_key" ON "incidents"("incidentId");

-- CreateIndex
CREATE INDEX "incidents_userId_idx" ON "incidents"("userId");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "incidents_createdAt_idx" ON "incidents"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "access_requests_requestId_key" ON "access_requests"("requestId");

-- CreateIndex
CREATE INDEX "access_requests_userId_idx" ON "access_requests"("userId");

-- CreateIndex
CREATE INDEX "access_requests_resourceId_idx" ON "access_requests"("resourceId");

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_createdAt_idx" ON "access_requests"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_category_idx" ON "audit_logs"("category");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_sessionToken_idx" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "mfa_sessions_userId_idx" ON "mfa_sessions"("userId");

-- CreateIndex
CREATE INDEX "mfa_sessions_status_idx" ON "mfa_sessions"("status");

-- CreateIndex
CREATE INDEX "mfa_sessions_expiresAt_idx" ON "mfa_sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "ml_predictions_userId_idx" ON "ml_predictions"("userId");

-- CreateIndex
CREATE INDEX "ml_predictions_isAnomalous_idx" ON "ml_predictions"("isAnomalous");

-- CreateIndex
CREATE INDEX "ml_predictions_timestamp_idx" ON "ml_predictions"("timestamp");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentCode_fkey" FOREIGN KEY ("departmentCode") REFERENCES "departments"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_profiles" ADD CONSTRAINT "behavior_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_departmentCode_fkey" FOREIGN KEY ("departmentCode") REFERENCES "departments"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_histories" ADD CONSTRAINT "trust_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_sessions" ADD CONSTRAINT "mfa_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ml_predictions" ADD CONSTRAINT "ml_predictions_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
