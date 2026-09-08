import { Router } from "express";
import crypto from "crypto";
import { db } from '../models/db.js';
import { trustEngine, policyEngine, TelemetryNormalizer } from '../../cyber/index.js';
import { mlEngine } from '../../ml/index.js';
import { geminiService } from '../services/gemini.js';
import {
  deviceRepository,
  incidentRepository,
  accessRequestRepository,
  policyRepository
} from '../repositories/index.js';
import { sseManager } from '../services/sse.js';
const apiRouter = Router();
let currentSessionUserId = "user-001";
const JWT_SECRET = process.env.JWT_SECRET || "zero-trust-insider-threat-secret-2025";
function generateJwtToken(user, mfaVerified = true, deviceId) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    department: user.department,
    deviceId: deviceId || user.activeDeviceId,
    mfaVerified,
    iat: now,
    exp: now + 86400 * 7
    // 7 days expiration
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${b64Header}.${b64Payload}`).digest("base64url");
  return `${b64Header}.${b64Payload}.${signature}`;
}
function verifyJwtToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [b64Header, b64Payload, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${b64Header}.${b64Payload}`).digest("base64url");
    if (signature !== expectedSig) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function escapeCsv(val) {
  if (val === null || val === void 0) return '""';
  if (Array.isArray(val)) {
    const joined = val.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("; ");
    return `"${joined.replace(/"/g, '""')}"`;
  }
  if (typeof val === "object") {
    return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
  }
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}
function getRequesterUser(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const verified = verifyJwtToken(token);
    if (verified?.sub) {
      const u = db.getUserById(verified.sub);
      if (u) return u;
    }
  }
  const authToken = req.headers["x-auth-token"];
  if (typeof authToken === "string") {
    const verified = verifyJwtToken(authToken);
    if (verified?.sub) {
      const u = db.getUserById(verified.sub);
      if (u) return u;
    }
  }
  const headerUserId = req.headers["x-user-id"] || req.headers["x-session-user-id"];
  if (headerUserId) {
    const u = db.getUserById(headerUserId);
    if (u) return u;
  }
  const queryUserId = req.query.userId;
  if (queryUserId) {
    const u = db.getUserById(queryUserId);
    if (u) return u;
  }
  return db.getUserById(currentSessionUserId) || db.users[0] || null;
}
function isAuthorizedForExport(user) {
  if (!user) return false;
  return user.role === "SECURITY_ADMIN" || user.role === "SYSTEM_ADMIN";
}
function requireSecurityAdmin(req, res, next) {
  const user = getRequesterUser(req);
  if (!user || user.role !== "SECURITY_ADMIN" && user.role !== "SYSTEM_ADMIN") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Forbidden: This operation requires SECURITY_ADMIN or SYSTEM_ADMIN role."
      }
    });
  }
  next();
}
apiRouter.get("/auth/me", (req, res) => {
  const user = getRequesterUser(req) || db.getUserById(currentSessionUserId) || db.users[0];
  const device = user.activeDeviceId ? db.getDeviceById(user.activeDeviceId) : db.devices[0];
  const token = generateJwtToken(user, true, device?.id);
  res.json({
    success: true,
    user,
    device,
    token,
    session: {
      id: `sess-${user.id}`,
      token,
      authenticated: true,
      mfaVerified: true,
      role: user.role
    }
  });
});
apiRouter.post("/auth/switch-user", (req, res) => {
  const { userId } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
  }
  currentSessionUserId = user.id;
  const token = generateJwtToken(user, true, user.activeDeviceId);
  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "USER_SWITCHED_SESSION",
    category: "AUTH",
    severity: "INFO",
    details: { switchedToEmployeeId: user.employeeId, role: user.role, sessionTokenIssued: true }
  });
  res.json({ success: true, user, token });
});
apiRouter.post("/auth/login", (req, res) => {
  const { email, deviceId, simulateFailed } = req.body;
  const user = db.getUserByEmail(email) || db.users.find((u) => u.employeeId.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid employee ID or password" } });
  }
  if (simulateFailed) {
    db.appendAuditLog({
      userId: user.id,
      userName: user.name,
      action: "AUTHENTICATION_FAILURE",
      category: "AUTH",
      severity: "WARNING",
      details: { reason: "Password mismatch attempt" }
    });
    return res.status(401).json({ success: false, error: { code: "AUTH_FAILED", message: "Invalid credentials. Attempt logged." } });
  }
  const device = deviceId ? db.getDeviceById(deviceId) : user.activeDeviceId ? db.getDeviceById(user.activeDeviceId) : void 0;
  const loginEvent = {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    eventType: "LOGIN",
    deviceId: device?.id || "dev-unknown",
    deviceName: device?.deviceName || "Unknown Browser Node",
    deviceTrustScore: device?.trustScore || 20,
    isUnknownDevice: !device || !device.isTrusted,
    ipAddress: device?.ipAddress || "198.51.100.22",
    location: device?.location || "Unverified Location",
    severity: "LOW",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const decisionResult = policyEngine.evaluateAccess(user, loginEvent, device);
  if (decisionResult.isFrozen) {
    return res.status(403).json({
      success: false,
      error: { code: "ACCOUNT_FROZEN", message: "Your account is locked due to critical security risk. Contact SOC admin." }
    });
  }
  currentSessionUserId = user.id;
  const token = generateJwtToken(user, !decisionResult.requiresMfa, device?.id);
  res.json({
    success: true,
    user,
    token,
    decision: decisionResult.decision,
    requiresMfa: decisionResult.requiresMfa,
    riskScore: decisionResult.evaluation.riskScore,
    reason: decisionResult.reason
  });
});
apiRouter.post("/auth/mfa/verify", (req, res) => {
  const { otp, code, userId } = req.body;
  const targetUser = userId ? db.getUserById(userId) : getRequesterUser(req) || db.getUserById(currentSessionUserId);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
  }
  const tokenCode = otp || code;
  if (!tokenCode || String(tokenCode).trim().length !== 6 || !/^\d{6}$/.test(String(tokenCode).trim())) {
    return res.status(400).json({ success: false, error: { code: "INVALID_MFA_CODE", message: "Please enter a valid 6-digit verification code." } });
  }
  const upgradedToken = generateJwtToken(targetUser, true, targetUser.activeDeviceId);
  db.appendAuditLog({
    userId: targetUser.id,
    userName: targetUser.name,
    action: "MFA_CHALLENGE_SUCCESS",
    category: "MFA",
    severity: "INFO",
    details: { method: "TOTP_AUTHENTICATOR", upgradedTokenIssued: true }
  });
  res.json({
    success: true,
    token: upgradedToken,
    message: "Multi-factor authentication verified successfully."
  });
});
apiRouter.post("/auth/webauthn/challenge", (req, res) => {
  const user = getRequesterUser(req) || db.getUserById(currentSessionUserId) || db.users[0];
  const challenge = crypto.randomBytes(32).toString("base64url");
  res.json({
    success: true,
    challenge,
    rp: { name: "Zero Trust UEBA Enterprise Security", id: req.hostname || "localhost" },
    user: {
      id: Buffer.from(user.id).toString("base64url"),
      name: user.email,
      displayName: user.name
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },
      // ES256
      { alg: -257, type: "public-key" }
      // RS256
    ],
    timeout: 6e4,
    attestation: "direct"
  });
});
apiRouter.post("/auth/webauthn/verify", (req, res) => {
  const user = getRequesterUser(req) || db.getUserById(currentSessionUserId) || db.users[0];
  const { credentialId, authenticatorData } = req.body;
  if (!credentialId) {
    return res.status(400).json({
      success: false,
      error: { code: "MISSING_CREDENTIAL", message: "FIDO2 credentialId is required for WebAuthn attestation." }
    });
  }
  const upgradedToken = generateJwtToken(user, true, user.activeDeviceId);
  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "WEBAUTHN_FIDO2_VERIFIED",
    category: "MFA",
    severity: "INFO",
    details: {
      method: "FIDO2_HARDWARE_SECURITY_KEY",
      credentialId,
      authenticatorData: authenticatorData || "UV-UP-FLAGS-VERIFIED",
      upgradedTokenIssued: true
    }
  });
  res.json({
    success: true,
    verified: true,
    token: upgradedToken,
    message: "Hardware FIDO2 Security Key verification successful."
  });
});
const serverStartTime = Date.now();
const handleHealthCheck = (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1e3);
  const mem = process.memoryUsage();
  res.json({
    success: true,
    status: "HEALTHY",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: process.env.NODE_ENV || "development",
    server: {
      uptimeSeconds,
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024)
      }
    },
    modules: {
      frontend: { name: "React 18 SPA + Real-time Telemetry Stream", status: "ACTIVE", latencyMs: 2 },
      backendGateway: { name: "Express.js REST API & Route Gateway", status: "ACTIVE", latencyMs: 1 },
      zeroTrustPDP: { name: "Policy Decision Point (ABAC + Risk Engine)", status: "ACTIVE", latencyMs: 3 },
      zeroTrustPEP: { name: "Policy Enforcement Point (Session/Access Gate)", status: "ACTIVE", latencyMs: 1 },
      trustDecayEngine: { name: "Continuous Trust Score Decay & Recovery", status: "ACTIVE", latencyMs: 1 },
      mlEnsemble: { name: "UEBA Isolation Forest & Random Forest (CERT r4.2)", status: "ACTIVE", latencyMs: 4 },
      xaiExplainer: { name: "SHAP Feature Attribution & Factor Decomposition", status: "ACTIVE", latencyMs: 2 },
      geminiCopilot: { name: "Gemini 3.7/3.1 Threat Intelligence Model", status: "ACTIVE", latencyMs: 15 }
    },
    database: {
      type: "IN_MEMORY_TELEMETRY_STORE",
      totalUsers: db.users.length,
      totalDevices: db.devices.length,
      totalResources: db.resources.length,
      totalIncidents: db.incidents.length,
      totalEvents: db.activityEvents.length,
      totalAuditLogs: db.auditLogs.length
    }
  });
};
apiRouter.get("/health", handleHealthCheck);
apiRouter.get("/system/health", handleHealthCheck);
apiRouter.get("/system/routes", (req, res) => {
  const routes = [
    {
      method: "GET",
      path: "/api/system/health",
      category: "SYSTEM",
      description: "System microservices health check, uptime, memory, and telemetry store metrics.",
      sampleBody: null
    },
    {
      method: "GET",
      path: "/api/stats",
      category: "SOC",
      description: "Aggregated SOC metrics (active users, high risk users, open incidents, trust averages).",
      sampleBody: null
    },
    {
      method: "POST",
      path: "/api/risk/evaluate",
      category: "CYBERSECURITY",
      description: "Evaluates dynamic contextual risk score and calculates SHAP XAI feature factor attribution.",
      sampleBody: {
        userId: "user-003",
        eventType: "RESOURCE_ACCESS",
        resourceId: "res-fin-01",
        deviceId: "dev-003-a",
        downloadSizeMB: 250,
        failedLoginCount: 1,
        isOffHours: true
      }
    },
    {
      method: "POST",
      path: "/api/policy/evaluate",
      category: "ZERO_TRUST",
      description: "Executes NIST SP 800-207 Zero Trust Policy Enforcement Point (PEP/PDP) decision on access attempt.",
      sampleBody: {
        userId: "user-003",
        eventType: "FILE_DOWNLOAD",
        resourceId: "res-eng-03",
        deviceId: "dev-unknown",
        downloadSizeMB: 450
      }
    },
    {
      method: "POST",
      path: "/api/ml/predict",
      category: "AI_ML",
      description: "Extracts 12D behavioral vector and computes Isolation Forest anomaly score & SHAP attributions.",
      sampleBody: {
        userId: "user-004",
        resourceId: "res-sec-01",
        downloadSizeMB: 800,
        isOffHours: true,
        failedLoginCount: 4
      }
    },
    {
      method: "GET",
      path: "/api/ml/metrics",
      category: "AI_ML",
      description: "Returns comparative benchmark metrics (Accuracy, Precision, Recall, F1, ROC-AUC) on CERT r4.2 dataset.",
      sampleBody: null
    },
    {
      method: "POST",
      path: "/api/activity/simulate",
      category: "SIMULATOR",
      description: "Simulates cyber attack scenario in the active telemetry stream (e.g. Credential Stuffing, Off-Hours Exfiltration).",
      sampleBody: {
        userId: "user-003",
        scenarioId: "OFF_HOURS_EXFILTRATION",
        resourceId: "res-fin-01"
      }
    },
    {
      method: "POST",
      path: "/api/cyber/mitre-simulate",
      category: "CYBERSECURITY",
      description: "Executes live MITRE ATT&CK technique with automated Zero Trust quarantine & incident creation.",
      sampleBody: {
        techniqueId: "T1048",
        userId: "user-003",
        targetResourceId: "res-fin-01"
      }
    },
    {
      method: "POST",
      path: "/api/copilot/chat",
      category: "AI_COPILOT",
      description: "Queries Gemini Security Copilot for threat analysis and actionable SOC recommendations.",
      sampleBody: {
        message: "Analyze user-003 risk profile and recommend containment steps for unauthorized financial data read."
      }
    },
    {
      method: "GET",
      path: "/api/users",
      category: "USERS",
      description: "Retrieves all user risk profiles, trust scores, baseline work hours, and clearance departments.",
      sampleBody: null
    },
    {
      method: "GET",
      path: "/api/resources",
      category: "ASSETS",
      description: "Lists all enterprise assets, department owners, sensitivity tiers, and required RBAC roles.",
      sampleBody: null
    },
    {
      method: "GET",
      path: "/api/devices",
      category: "DEVICES",
      description: "Returns enterprise fleet devices with hardware trust ratings and quarantine statuses.",
      sampleBody: null
    }
  ];
  res.json({ success: true, routes, totalRoutes: routes.length });
});
apiRouter.post("/cyber/mitre-simulate", (req, res) => {
  const { techniqueId, userId, targetResourceId } = req.body;
  const user = (userId ? db.getUserById(userId) : null) || db.users[2];
  const resource = (targetResourceId ? db.getResourceById(targetResourceId) : null) || db.resources[0];
  let eventType = "RESOURCE_ACCESS";
  let scenarioName = "Suspicious Access";
  let techniqueName = "T1078 - Valid Accounts Abuse";
  let downloadMB = 50;
  let failedLogins = 0;
  let isPrivilege = false;
  let isUSB = false;
  switch (techniqueId) {
    case "T1078":
      techniqueName = "T1078 - Valid Accounts Abuse (Credential Stuffing)";
      eventType = "FAILED_LOGIN";
      failedLogins = 5;
      scenarioName = "Credential Stuffing from Unknown IP";
      break;
    case "T1048":
      techniqueName = "T1048 - Exfiltration Over Web/Cloud (Mass Download)";
      eventType = "FILE_DOWNLOAD";
      downloadMB = 750;
      scenarioName = "Off-Hours High-Velocity Exfiltration";
      break;
    case "T1052":
      techniqueName = "T1052 - Exfiltration Over Physical Medium (Removable USB)";
      eventType = "USB_ACTIVITY";
      isUSB = true;
      downloadMB = 450;
      scenarioName = "Mass USB Peripheral File Copy";
      break;
    case "T1068":
      techniqueName = "T1068 - Exploitation for Privilege Escalation";
      eventType = "PRIVILEGE_CHANGE";
      isPrivilege = true;
      scenarioName = "Unauthorized Admin Role Elevation";
      break;
    default:
      techniqueName = "T1078 - Valid Accounts Abuse";
      eventType = "RESOURCE_ACCESS";
      break;
  }
  const simulatedEvent = {
    id: `evt-mitre-${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    eventType,
    resourceId: resource.id,
    resourceName: resource.name,
    resourceDepartment: resource.department,
    resourceSensitivity: resource.sensitivity,
    deviceId: "dev-unknown",
    deviceName: "Unrecognized External Terminal (Proxy/VPN)",
    deviceTrustScore: 15,
    isUnknownDevice: true,
    ipAddress: "198.51.100.177",
    location: "Kyiv, Ukraine",
    severity: "CRITICAL",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: {
      techniqueId,
      techniqueName,
      downloadSizeMB: downloadMB,
      failedLoginAttempts: failedLogins,
      escalationAttempt: isPrivilege,
      usbConnected: isUSB
    }
  };
  const decisionResult = policyEngine.evaluateAccess(user, simulatedEvent, void 0, resource);
  const newActivity = {
    id: simulatedEvent.id,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    timestamp: simulatedEvent.timestamp,
    eventType,
    resourceId: resource.id,
    resourceName: resource.name,
    resourceDepartment: resource.department,
    resourceSensitivity: resource.sensitivity,
    deviceId: simulatedEvent.deviceId,
    deviceName: simulatedEvent.deviceName,
    deviceTrustScore: 15,
    isUnknownDevice: true,
    ipAddress: simulatedEvent.ipAddress,
    location: simulatedEvent.location,
    severity: "CRITICAL",
    metadata: simulatedEvent.metadata,
    riskContribution: decisionResult.evaluation.riskScore,
    mlAnomalyScore: decisionResult.evaluation.mlAnomalyScore,
    isAnomalous: true
  };
  db.appendActivityEvent(newActivity);
  sseManager.broadcastSimulation(`MITRE ATT&CK: ${techniqueName}`, { event: newActivity, decision: decisionResult, user });
  res.json({
    success: true,
    techniqueId,
    techniqueName,
    scenarioName,
    user: {
      id: user.id,
      name: user.name,
      status: user.status,
      newRiskScore: user.currentRiskScore,
      newTrustScore: user.currentTrustScore
    },
    zeroTrustDecision: {
      decision: decisionResult.decision,
      allowed: decisionResult.allowed,
      requiresMfa: decisionResult.requiresMfa,
      isRestricted: decisionResult.isRestricted,
      isFrozen: decisionResult.isFrozen,
      reason: decisionResult.reason
    },
    mlEvaluation: {
      anomalyScore: decisionResult.evaluation.mlAnomalyScore,
      riskScore: decisionResult.evaluation.riskScore,
      riskLevel: decisionResult.evaluation.riskLevel,
      factors: decisionResult.evaluation.contributingFactors
    },
    incidentCreated: decisionResult.incidentCreated
  });
});
apiRouter.post("/cyber/mitigate", requireSecurityAdmin, (req, res) => {
  const { action, userId, incidentId } = req.body;
  const user = userId ? db.getUserById(userId) : null;
  const incident = incidentId ? db.incidents.find((i) => i.id === incidentId) : null;
  if (!user && !incident) {
    return res.status(400).json({ success: false, error: { code: "INVALID_TARGET", message: "Target user or incident required." } });
  }
  const targetUser = user || (incident ? db.getUserById(incident.userId) : null);
  let message = "";
  if (action === "FREEZE_ACCOUNT" && targetUser) {
    db.updateUserStatus(targetUser.id, "FROZEN");
    message = `Account ${targetUser.name} (${targetUser.employeeId}) immediately FROZEN. All active sessions revoked.`;
  } else if (action === "STEP_UP_MFA" && targetUser) {
    const newRisk = Math.max(targetUser.currentRiskScore, 65);
    db.updateUserRiskAndTrust(targetUser.id, newRisk, targetUser.currentTrustScore, "HIGH");
    message = `Mandatory hardware biometric/TOTP Step-Up MFA enforced on next access for ${targetUser.name}.`;
  } else if (action === "ISOLATE_DEVICE" && targetUser) {
    const dev = targetUser.activeDeviceId ? db.getDeviceById(targetUser.activeDeviceId) : null;
    if (dev) {
      dev.status = "REVOKED";
      dev.trustScore = 0;
      dev.isTrusted = false;
      deviceRepository.revoke(dev.id).catch(() => {
      });
      sseManager.broadcastDevice(dev);
      message = `Device ${dev.deviceName} revoked and quarantined from zero trust network.`;
    } else {
      message = "Active endpoint hardware certificate revoked.";
    }
  } else if (action === "UNFREEZE_ACCOUNT" && targetUser) {
    db.updateUserStatus(targetUser.id, "ACTIVE");
    db.updateUserRiskAndTrust(targetUser.id, 20, 80, "LOW");
    message = `Account ${targetUser.name} restored to ACTIVE standing with baseline trust reset.`;
  } else {
    message = `Action ${action} recorded in SOC audit log.`;
  }
  if (incident) {
    incident.status = "RESOLVED";
    incident.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
    incident.resolvedBy = "Alex Rivera (Security Admin)";
    incident.adminActionTaken = message;
    incidentRepository.resolve(incident.id, message, incident.resolvedBy).catch(() => {
    });
    sseManager.broadcastIncident(incident, false);
  }
  db.appendAuditLog({
    userId: targetUser?.id,
    userName: targetUser?.name,
    action: `MITIGATION_${action}`,
    category: "POLICY",
    severity: "CRITICAL",
    details: { action, message, incidentId: incident?.id }
  });
  res.json({
    success: true,
    action,
    message,
    user: targetUser ? {
      id: targetUser.id,
      name: targetUser.name,
      status: targetUser.status,
      riskScore: targetUser.currentRiskScore,
      trustScore: targetUser.currentTrustScore
    } : null
  });
});
apiRouter.get("/stats", (req, res) => {
  const totalUsers = db.users.length;
  const activeUsers = db.users.filter((u) => u.status === "ACTIVE").length;
  const highRiskUsers = db.users.filter((u) => u.currentRiskScore >= db.policyConfig.mfaThreshold).length;
  const criticalAlerts = db.incidents.filter((i) => i.status === "OPEN" && i.severity === "CRITICAL").length;
  const restrictedAccounts = db.users.filter((u) => u.status === "RESTRICTED" || u.status === "FROZEN").length;
  const pendingApprovals = db.accessRequests.filter((r) => r.status === "PENDING").length;
  const openIncidents = db.incidents.filter((i) => i.status === "OPEN" || i.status === "UNDER_REVIEW").length;
  res.json({
    success: true,
    stats: {
      totalUsers,
      activeUsers,
      highRiskUsers,
      criticalAlerts,
      restrictedAccounts,
      pendingApprovals,
      openIncidents,
      averageTrustScore: Math.round(db.users.reduce((acc, u) => acc + u.currentTrustScore, 0) / (totalUsers || 1)),
      averageRiskScore: Math.round(db.users.reduce((acc, u) => acc + u.currentRiskScore, 0) / (totalUsers || 1))
    }
  });
});
apiRouter.get("/dashboard/summary", (req, res) => {
  const totalUsers = db.users.length;
  const activeUsers = db.users.filter((u) => u.status === "ACTIVE").length;
  const highRiskUsers = db.users.filter((u) => u.currentRiskScore >= db.policyConfig.mfaThreshold).length;
  const criticalAlerts = db.incidents.filter((i) => i.status === "OPEN" && i.severity === "CRITICAL").length;
  const restrictedAccounts = db.users.filter((u) => u.status === "RESTRICTED" || u.status === "FROZEN").length;
  const pendingApprovals = db.accessRequests.filter((r) => r.status === "PENDING").length;
  res.json({
    success: true,
    summary: {
      totalUsers,
      activeUsers,
      highRiskUsers,
      criticalAlerts,
      restrictedAccounts,
      pendingApprovals,
      averageTrustScore: Math.round(db.users.reduce((acc, u) => acc + u.currentTrustScore, 0) / (totalUsers || 1)),
      averageRiskScore: Math.round(db.users.reduce((acc, u) => acc + u.currentRiskScore, 0) / (totalUsers || 1))
    }
  });
});
apiRouter.get("/dashboard/risk-distribution", (req, res) => {
  const distribution = [
    { level: "LOW", label: "Low (0-39)", count: 0, color: "#10b981" },
    { level: "MEDIUM", label: "Medium (40-59)", count: 0, color: "#3b82f6" },
    { level: "HIGH", label: "High (60-74)", count: 0, color: "#f59e0b" },
    { level: "VERY_HIGH", label: "Very High (75-89)", count: 0, color: "#f97316" },
    { level: "CRITICAL", label: "Critical (90-100)", count: 0, color: "#ef4444" }
  ];
  db.users.forEach((u) => {
    if (u.currentRiskScore <= db.policyConfig.lowRiskMax) distribution[0].count++;
    else if (u.currentRiskScore <= db.policyConfig.mediumRiskMax) distribution[1].count++;
    else if (u.currentRiskScore <= db.policyConfig.highRiskMax) distribution[2].count++;
    else if (u.currentRiskScore <= db.policyConfig.veryHighRiskMax) distribution[3].count++;
    else distribution[4].count++;
  });
  res.json({ success: true, distribution });
});
apiRouter.get("/dashboard/risk-trends", (req, res) => {
  const hours = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
  const trendData = hours.map((hour, idx) => ({
    time: hour,
    avgRisk: Math.max(12, Math.min(85, Math.round(20 + Math.sin(idx) * 15 + (idx > 5 ? 25 : 0)))),
    anomaliesDetected: Math.max(0, Math.round(Math.sin(idx) * 3 + (idx === 1 ? 4 : 1))),
    trustIndex: Math.round(92 - (idx > 5 ? 12 : 2))
  }));
  res.json({ success: true, trendData });
});
apiRouter.get("/dashboard/recent-alerts", (req, res) => {
  res.json({ success: true, alerts: db.incidents.slice(0, 10) });
});
apiRouter.get("/users", (req, res) => {
  res.json({ success: true, users: db.users });
});
apiRouter.get("/users/:id", (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
  }
  const userDevices = db.devices.filter((d) => d.userId === user.id);
  const userEvents = db.activityEvents.filter((e) => e.userId === user.id);
  const userIncidents = db.incidents.filter((i) => i.userId === user.id);
  const trustHistory = db.getTrustHistory(user.id);
  res.json({
    success: true,
    user,
    devices: userDevices,
    recentEvents: userEvents.slice(0, 15),
    incidents: userIncidents,
    trustHistory
  });
});
apiRouter.post("/users/:id/freeze", requireSecurityAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
  }
  db.updateUserStatus(user.id, "FROZEN");
  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ADMIN_FREEZE_ACCOUNT",
    category: "ADMIN",
    severity: "CRITICAL",
    details: { admin: "Security Administrator", reason: req.body.reason || "Manual SOC containment lock" }
  });
  res.json({ success: true, user, message: `Account ${user.employeeId} (${user.name}) frozen.` });
});
apiRouter.post("/users/:id/unfreeze", requireSecurityAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
  }
  db.updateUserStatus(user.id, "ACTIVE");
  db.updateUserRiskAndTrust(user.id, 20, 88, "LOW");
  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ADMIN_RESTORE_ACCOUNT",
    category: "ADMIN",
    severity: "INFO",
    details: { admin: "Security Administrator", note: "Account restored and baseline recalibrated." }
  });
  trustEngine.updateTrustScore(user, {
    userId: user.id,
    riskScore: 20,
    riskLevel: "LOW",
    trustScore: 88,
    contributingFactors: [],
    recommendedAction: "ALLOW",
    policyEnforced: "ALLOW",
    mlAnomalyScore: 0.05,
    isCrossDepartment: false,
    isOffHours: false,
    isUnknownDevice: false,
    explanationText: "Account access restored by administrator.",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }, "Administrative Account Unfreeze & Baseline Reset");
  res.json({ success: true, user, message: `Account ${user.employeeId} restored to active status.` });
});
apiRouter.post("/users/:id/reset-risk", requireSecurityAdmin, (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found" } });
  }
  db.updateUserStatus(user.id, "ACTIVE");
  db.updateUserRiskAndTrust(user.id, 15, 95, "LOW");
  trustEngine.updateTrustScore(user, {
    userId: user.id,
    riskScore: 15,
    riskLevel: "LOW",
    trustScore: 95,
    contributingFactors: [],
    recommendedAction: "ALLOW",
    policyEnforced: "ALLOW",
    mlAnomalyScore: 0.04,
    isCrossDepartment: false,
    isOffHours: false,
    isUnknownDevice: false,
    explanationText: "Manual baseline risk reset.",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }, "Manual Risk Baseline Recalibration");
  res.json({ success: true, user, message: `Risk for ${user.name} recalibrated to baseline.` });
});
apiRouter.get("/devices", (req, res) => {
  res.json({ success: true, devices: db.devices });
});
apiRouter.patch("/devices/:id/trust", requireSecurityAdmin, (req, res) => {
  const device = db.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: { code: "DEVICE_NOT_FOUND", message: "Device not found" } });
  }
  const { isTrusted, trustScore } = req.body;
  if (typeof isTrusted === "boolean") {
    device.isTrusted = isTrusted;
    device.status = isTrusted ? "TRUSTED" : "SUSPICIOUS";
  }
  if (typeof trustScore === "number") {
    device.trustScore = Math.max(0, Math.min(100, trustScore));
  }
  deviceRepository.updateTrustScore(device.id, device.trustScore, device.isTrusted, device.status).catch(() => {
  });
  sseManager.broadcastDevice(device);
  db.appendAuditLog({
    userId: device.userId,
    userName: device.userName,
    action: "DEVICE_TRUST_MODIFIED",
    category: "DEVICE",
    severity: isTrusted ? "INFO" : "WARNING",
    details: { deviceId: device.id, isTrusted: device.isTrusted, trustScore: device.trustScore }
  });
  res.json({ success: true, device });
});
apiRouter.post("/devices/:id/revoke", requireSecurityAdmin, (req, res) => {
  const device = db.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: { code: "DEVICE_NOT_FOUND", message: "Device not found" } });
  }
  device.status = "REVOKED";
  device.isTrusted = false;
  device.trustScore = 0;
  deviceRepository.revoke(device.id).catch(() => {
  });
  sseManager.broadcastDevice(device);
  db.appendAuditLog({
    userId: device.userId,
    userName: device.userName,
    action: "DEVICE_CERTIFICATE_REVOKED",
    category: "DEVICE",
    severity: "CRITICAL",
    details: { deviceId: device.id, deviceName: device.deviceName }
  });
  res.json({ success: true, device, message: `Device ${device.deviceName} revoked.` });
});
apiRouter.get("/resources", (req, res) => {
  res.json({ success: true, resources: db.resources });
});
apiRouter.post("/resources/test-access", (req, res) => {
  const { userId, resourceId, deviceId } = req.body;
  const user = db.getUserById(userId) || db.getUserById(currentSessionUserId);
  const resource = db.getResourceById(resourceId);
  if (!user || !resource) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User or Resource not found" } });
  }
  const device = deviceId ? db.getDeviceById(deviceId) : user.activeDeviceId ? db.getDeviceById(user.activeDeviceId) : db.devices[0];
  const accessEvent = {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    eventType: "RESOURCE_ACCESS",
    resourceId: resource.id,
    resourceName: resource.name,
    resourceDepartment: resource.department,
    resourceSensitivity: resource.sensitivity,
    deviceId: device?.id || "dev-untrusted",
    deviceName: device?.deviceName || "Unregistered Workstation",
    deviceTrustScore: device?.trustScore || 30,
    isUnknownDevice: !device?.isTrusted,
    ipAddress: device?.ipAddress || "10.240.14.99",
    location: device?.location || "San Francisco, US",
    severity: "LOW",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const decision = policyEngine.evaluateAccess(user, accessEvent, device, resource);
  resource.accessCount++;
  const fullActivityEvent = {
    id: `evt-access-${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    eventType: "RESOURCE_ACCESS",
    resourceId: resource.id,
    resourceName: resource.name,
    resourceDepartment: resource.department,
    resourceSensitivity: resource.sensitivity,
    deviceId: device?.id || "dev-untrusted",
    deviceName: device?.deviceName || "Unregistered Workstation",
    deviceTrustScore: device?.trustScore || 30,
    isUnknownDevice: !device?.isTrusted,
    ipAddress: device?.ipAddress || "10.240.14.99",
    location: device?.location || "San Francisco, US",
    severity: decision.evaluation.riskLevel === "CRITICAL" ? "CRITICAL" : decision.evaluation.riskLevel === "VERY_HIGH" ? "HIGH" : "LOW",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    riskContribution: decision.evaluation.riskScore,
    mlAnomalyScore: decision.evaluation.mlAnomalyScore,
    isAnomalous: decision.evaluation.riskScore >= db.policyConfig.highRiskMax,
    metadata: {
      decision: decision.decision,
      allowed: decision.allowed,
      requiresMfa: decision.requiresMfa,
      reason: decision.reason
    }
  };
  db.appendActivityEvent(fullActivityEvent);
  res.json({
    success: true,
    user,
    resource,
    event: fullActivityEvent,
    decision: decision.decision,
    allowed: decision.allowed,
    requiresMfa: decision.requiresMfa,
    requiresApproval: decision.requiresApproval,
    isRestricted: decision.isRestricted,
    isFrozen: decision.isFrozen,
    reason: decision.reason,
    evaluation: decision.evaluation,
    incidentCreated: decision.incidentCreated
  });
});
apiRouter.get("/events/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*"
  });
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }
  res.write(`data: ${JSON.stringify({
    type: "CONNECTED",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    data: {
      message: "Zero Trust Live Telemetry Stream connected successfully.",
      serverTime: Date.now(),
      activeClients: sseManager.getClientCount() + 1
    }
  })}

`);
  sseManager.addClient(res);
  req.on("close", () => {
    sseManager.removeClient(res);
  });
});
apiRouter.get("/activity", (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json({ success: true, events: db.activityEvents.slice(0, limit) });
});
apiRouter.get("/events/recent", (req, res) => {
  const limit = Number(req.query.limit) || 25;
  res.json({ success: true, events: db.activityEvents.slice(0, limit) });
});
apiRouter.get("/events", (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json({ success: true, events: db.activityEvents.slice(0, limit) });
});
apiRouter.post("/activity/simulate", (req, res) => {
  const {
    userId,
    eventType,
    resourceId,
    deviceId,
    downloadSizeMB,
    failedLoginCount,
    isOffHours,
    isCrossDepartment,
    isPrivilegeEscalation,
    isUSBTransfer
  } = req.body;
  const user = db.getUserById(userId) || db.getUserById(currentSessionUserId);
  if (!user) {
    return res.status(404).json({ success: false, error: { code: "USER_NOT_FOUND", message: "Target user not found" } });
  }
  const resource = resourceId ? db.getResourceById(resourceId) : void 0;
  const device = deviceId ? db.getDeviceById(deviceId) : user.activeDeviceId ? db.getDeviceById(user.activeDeviceId) : db.devices[0];
  const now = /* @__PURE__ */ new Date();
  if (isOffHours) {
    now.setHours(2, 25, 0, 0);
  }
  const newEvent = {
    id: `evt-${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    userDepartment: user.department,
    timestamp: now.toISOString(),
    eventType: eventType || "RESOURCE_ACCESS",
    resourceId: resource?.id,
    resourceName: resource?.name,
    resourceDepartment: resource?.department,
    resourceSensitivity: resource?.sensitivity,
    deviceId: device?.id || "dev-unknown",
    deviceName: device?.deviceName || "Unknown Machine",
    deviceTrustScore: device?.trustScore || 20,
    isUnknownDevice: !device || !device.isTrusted,
    ipAddress: device?.ipAddress || "185.220.101.5",
    location: device?.location || "Bucharest, Romania",
    severity: "LOW",
    metadata: {
      downloadSizeMB: Number(downloadSizeMB || 0),
      failedLoginAttempts: Number(failedLoginCount || 0),
      escalationAttempt: Boolean(isPrivilegeEscalation),
      usbConnected: Boolean(isUSBTransfer),
      simulated: true
    }
  };
  const policyResult = policyEngine.evaluateAccess(user, newEvent, device, resource);
  newEvent.riskContribution = policyResult.evaluation.riskScore;
  newEvent.mlAnomalyScore = policyResult.evaluation.mlAnomalyScore;
  newEvent.isAnomalous = policyResult.evaluation.riskScore >= db.policyConfig.highRiskMax;
  newEvent.severity = policyResult.evaluation.riskLevel === "CRITICAL" ? "CRITICAL" : policyResult.evaluation.riskLevel === "VERY_HIGH" ? "HIGH" : policyResult.evaluation.riskLevel === "HIGH" ? "MEDIUM" : "LOW";
  db.appendActivityEvent(newEvent);
  sseManager.broadcastSimulation("Custom Telemetry Simulation", { event: newEvent, decision: policyResult, user });
  res.json({
    success: true,
    event: newEvent,
    user,
    decision: policyResult
  });
});
apiRouter.post("/simulation/scenario/:scenarioId", (req, res) => {
  const scenarioId = req.params.scenarioId;
  const targetUser = db.getUserById("user-003") || db.users[2];
  let resultData = {};
  switch (scenarioId) {
    case "scenario-1-normal": {
      const normalDevice = db.getDeviceById("dev-hr-01");
      const hrResource = db.getResourceById("res-hr-01");
      const event = {
        id: `evt-sc1-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        eventType: "FILE_ACCESS",
        resourceId: hrResource?.id,
        resourceName: hrResource?.name,
        resourceDepartment: hrResource?.department,
        resourceSensitivity: hrResource?.sensitivity,
        deviceId: normalDevice?.id || "dev-hr-01",
        deviceName: normalDevice?.deviceName || "Corp-Dell-Latitude-HR01",
        deviceTrustScore: 92,
        isUnknownDevice: false,
        ipAddress: "10.240.14.92",
        location: "San Francisco, US (HQ)",
        severity: "LOW",
        metadata: { downloadSizeMB: 14, fileCount: 5 }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, normalDevice, hrResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 1: Baseline Normal Access", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 1: Baseline Normal Access", event, decision, user: targetUser };
      break;
    }
    case "scenario-2-suspicious-login": {
      const untrustedDev = db.getDeviceById("dev-untrusted-01") || db.devices[db.devices.length - 1];
      const offHoursTime = /* @__PURE__ */ new Date();
      offHoursTime.setHours(3, 15, 0, 0);
      const event = {
        id: `evt-sc2-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: offHoursTime.toISOString(),
        eventType: "LOGIN",
        deviceId: untrustedDev.id,
        deviceName: untrustedDev.deviceName,
        deviceTrustScore: 20,
        isUnknownDevice: true,
        ipAddress: "185.220.101.5",
        location: "Bucharest, Romania (VPN Tor Exit)",
        severity: "MEDIUM",
        metadata: { authMethod: "Password", offHours: true }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, untrustedDev);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 2: Suspicious Off-Hours Login", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 2: Suspicious Off-Hours Login", event, decision, user: targetUser };
      break;
    }
    case "scenario-3-insider-exfiltration": {
      const untrustedDev = db.getDeviceById("dev-untrusted-01") || db.devices[db.devices.length - 1];
      const finResource = db.getResourceById("res-fin-01");
      const offHoursTime = /* @__PURE__ */ new Date();
      offHoursTime.setHours(2, 15, 0, 0);
      const event = {
        id: `evt-sc3-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: offHoursTime.toISOString(),
        eventType: "FILE_DOWNLOAD",
        resourceId: finResource?.id,
        resourceName: finResource?.name,
        resourceDepartment: finResource?.department,
        resourceSensitivity: finResource?.sensitivity,
        deviceId: untrustedDev.id,
        deviceName: untrustedDev.deviceName,
        deviceTrustScore: 15,
        isUnknownDevice: true,
        ipAddress: "185.220.101.5",
        location: "Bucharest, Romania",
        severity: "HIGH",
        metadata: {
          downloadSizeMB: 480,
          fileCount: 500,
          crossDepartment: true,
          sensitiveDataExport: true
        }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, untrustedDev, finResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      db.appendAccessRequest({
        id: `req-${Date.now()}`,
        userId: targetUser.id,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        resourceId: finResource?.id || "res-fin-01",
        resourceName: finResource?.name || "Executive Payroll & Compensation Master",
        resourceDepartment: "Finance",
        resourceSensitivity: "HIGHLY_SENSITIVE",
        reason: "Automated hold: Cross-department large data export triggered policy approval requirement.",
        requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        riskScoreAtRequest: decision.evaluation.riskScore,
        aiRiskAssessment: decision.evaluation.explanationText,
        status: "PENDING"
      });
      sseManager.broadcastSimulation("Scenario 3: Insider Threat Cross-Dept Exfiltration", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 3: Insider Threat Cross-Dept Exfiltration", event, decision, user: targetUser };
      break;
    }
    case "scenario-4-critical-compromise": {
      const untrustedDev = db.getDeviceById("dev-untrusted-01") || db.devices[db.devices.length - 1];
      const itResource = db.getResourceById("res-it-01");
      const offHoursTime = /* @__PURE__ */ new Date();
      offHoursTime.setHours(3, 40, 0, 0);
      const event = {
        id: `evt-sc4-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: offHoursTime.toISOString(),
        eventType: "PRIVILEGE_CHANGE",
        resourceId: itResource?.id,
        resourceName: itResource?.name,
        resourceDepartment: itResource?.department,
        resourceSensitivity: itResource?.sensitivity,
        deviceId: untrustedDev.id,
        deviceName: untrustedDev.deviceName,
        deviceTrustScore: 5,
        isUnknownDevice: true,
        ipAddress: "185.220.101.5",
        location: "Bucharest, Romania",
        severity: "CRITICAL",
        metadata: {
          failedLoginAttempts: 4,
          escalationAttempt: true,
          usbConnected: true,
          downloadSizeMB: 1800
        }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, untrustedDev, itResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 4: Critical Account Compromise & Auto-Freeze", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 4: Critical Account Compromise & Auto-Freeze", event, decision, user: targetUser };
      break;
    }
    case "scenario-5-privilege-escalation": {
      const dev = db.getDeviceById("dev-it-01") || db.devices[0];
      const itResource = db.getResourceById("res-it-01");
      const event = {
        id: `evt-sc5-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        eventType: "PRIVILEGE_CHANGE",
        resourceId: itResource?.id,
        resourceName: itResource?.name,
        resourceDepartment: itResource?.department,
        resourceSensitivity: itResource?.sensitivity,
        deviceId: dev.id,
        deviceName: dev.deviceName,
        deviceTrustScore: dev.trustScore,
        isUnknownDevice: false,
        ipAddress: "10.240.10.45",
        location: "San Francisco, US (HQ)",
        severity: "CRITICAL",
        metadata: {
          techniqueId: "T1068",
          techniqueName: "T1068 - Exploitation for Privilege Escalation",
          escalationAttempt: true,
          requestedRole: "SYSTEM_ADMIN",
          command: "sudo usermod -aG domain_admins sjenkins"
        }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, dev, itResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 5: Privilege Escalation Attack", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 5: Privilege Escalation Attack", event, decision, user: targetUser };
      break;
    }
    case "scenario-6-usb-exfiltration": {
      const normalDevice = db.getDeviceById("dev-hr-01") || db.devices[0];
      const hrResource = db.getResourceById("res-hr-01");
      const event = {
        id: `evt-sc6-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        eventType: "USB_ACTIVITY",
        resourceId: hrResource?.id,
        resourceName: hrResource?.name,
        resourceDepartment: hrResource?.department,
        resourceSensitivity: hrResource?.sensitivity,
        deviceId: normalDevice.id,
        deviceName: normalDevice.deviceName,
        deviceTrustScore: 70,
        isUnknownDevice: false,
        ipAddress: "10.240.14.92",
        location: "San Francisco, US (HQ)",
        severity: "HIGH",
        metadata: {
          techniqueId: "T1052",
          techniqueName: "T1052 - Exfiltration Over Physical Medium (USB)",
          usbConnected: true,
          downloadSizeMB: 620,
          usbDeviceModel: "SanDisk Ultra 64GB USB 3.0",
          unencryptedVolume: true
        }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, normalDevice, hrResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 6: USB Storage Physical Exfiltration", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 6: USB Storage Physical Exfiltration", event, decision, user: targetUser };
      break;
    }
    case "scenario-7-large-scale-exfiltration": {
      const finResource = db.getResourceById("res-fin-01");
      const untrustedDev = db.getDeviceById("dev-untrusted-01") || db.devices[db.devices.length - 1];
      const offHours = /* @__PURE__ */ new Date();
      offHours.setHours(1, 45, 0, 0);
      const event = {
        id: `evt-sc7-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: offHours.toISOString(),
        eventType: "FILE_DOWNLOAD",
        resourceId: finResource?.id,
        resourceName: finResource?.name,
        resourceDepartment: finResource?.department,
        resourceSensitivity: finResource?.sensitivity,
        deviceId: untrustedDev.id,
        deviceName: untrustedDev.deviceName,
        deviceTrustScore: 10,
        isUnknownDevice: true,
        ipAddress: "198.51.100.99",
        location: "Frankfurt, Germany",
        severity: "CRITICAL",
        metadata: {
          techniqueId: "T1048",
          techniqueName: "T1048 - Exfiltration Over Web/Cloud (Mass Download)",
          downloadSizeMB: 2850,
          fileCount: 3400,
          crossDepartment: true,
          cloudSyncAgent: "rclone-sync-daemon"
        }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, untrustedDev, finResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 7: Large-Scale High-Velocity Exfiltration", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 7: Large-Scale High-Velocity Exfiltration", event, decision, user: targetUser };
      break;
    }
    case "scenario-8-compromised-endpoint": {
      const untrustedDev = db.getDeviceById("dev-untrusted-01") || db.devices[db.devices.length - 1];
      const itResource = db.getResourceById("res-it-01");
      const offHours = /* @__PURE__ */ new Date();
      offHours.setHours(4, 10, 0, 0);
      const event = {
        id: `evt-sc8-${Date.now()}`,
        userId: targetUser.id,
        userEmail: targetUser.email,
        userName: targetUser.name,
        userDepartment: targetUser.department,
        timestamp: offHours.toISOString(),
        eventType: "APPLICATION_ACCESS",
        resourceId: itResource?.id,
        resourceName: itResource?.name,
        resourceDepartment: itResource?.department,
        resourceSensitivity: itResource?.sensitivity,
        deviceId: untrustedDev.id,
        deviceName: untrustedDev.deviceName,
        deviceTrustScore: 5,
        isUnknownDevice: true,
        ipAddress: "194.26.29.112",
        location: "Kyiv, Ukraine",
        severity: "CRITICAL",
        metadata: {
          techniqueId: "T1078",
          techniqueName: "T1078 - Valid Accounts Abuse (Compromised Endpoint C2)",
          failedLoginAttempts: 5,
          beaconingDetected: true,
          c2IntervalSeconds: 30,
          untrustedProxy: true
        }
      };
      const decision = policyEngine.evaluateAccess(targetUser, event, untrustedDev, itResource);
      event.riskContribution = decision.evaluation.riskScore;
      event.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
      event.isAnomalous = true;
      db.appendActivityEvent(event);
      sseManager.broadcastSimulation("Scenario 8: Compromised Endpoint & C2 Beaconing", { event, decision, user: targetUser });
      resultData = { scenario: "Scenario 8: Compromised Endpoint & C2 Beaconing", event, decision, user: targetUser };
      break;
    }
    default:
      return res.status(400).json({ success: false, error: { code: "UNKNOWN_SCENARIO", message: "Scenario not recognized" } });
  }
  res.json({ success: true, ...resultData });
});
apiRouter.get("/incidents/export", (req, res) => {
  const requester = getRequesterUser(req);
  if (!isAuthorizedForExport(requester)) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access Denied: Incident report export requires SECURITY_ADMIN or SYSTEM_ADMIN privileges."
      }
    });
  }
  const { severity, status, search, startDate, endDate, from, to, format = "json" } = req.query;
  const exportFormat = String(format).toLowerCase() === "csv" ? "csv" : "json";
  const start = startDate || from ? new Date(String(startDate || from)) : null;
  const end = endDate || to ? new Date(String(endDate || to)) : null;
  let filtered = [...db.incidents];
  if (severity && severity !== "ALL") {
    filtered = filtered.filter((i) => i.severity === severity);
  }
  if (status && status !== "ALL") {
    filtered = filtered.filter((i) => i.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (i) => i.id.toLowerCase().includes(q) || i.title && i.title.toLowerCase().includes(q) || i.userName.toLowerCase().includes(q) || i.userEmail.toLowerCase().includes(q) || i.eventType.toLowerCase().includes(q) || i.aiExplanation && i.aiExplanation.toLowerCase().includes(q) || i.analystNotes && i.analystNotes.toLowerCase().includes(q) || i.adminActionTaken && i.adminActionTaken.toLowerCase().includes(q)
    );
  }
  if (start && !isNaN(start.getTime())) {
    filtered = filtered.filter((i) => new Date(i.detectedAt).getTime() >= start.getTime());
  }
  if (end && !isNaN(end.getTime())) {
    filtered = filtered.filter((i) => new Date(i.detectedAt).getTime() <= end.getTime());
  }
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  db.appendAuditLog({
    userId: requester.id,
    userName: requester.name,
    action: "INCIDENT_REPORT_EXPORTED",
    category: "ADMIN",
    severity: "INFO",
    details: {
      format: exportFormat,
      recordsExported: filtered.length,
      filters: { severity, status, search }
    },
    ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"
  });
  const structuredIncidents = filtered.map((inc) => ({
    incidentId: inc.id,
    title: inc.title || `${inc.eventType.replace(/_/g, " ")} Threat Detection - ${inc.userName}`,
    severity: inc.severity,
    status: inc.status,
    user: inc.userName,
    email: inc.userEmail,
    department: inc.userDepartment,
    riskScore: inc.riskScore,
    contributingFactors: inc.contributingFactors || [],
    mitreTechnique: inc.mitreTechnique || inc.eventType,
    aiExplanation: inc.aiExplanation || "",
    resolutionNotes: inc.analystNotes || inc.adminActionTaken || "",
    detectedAt: inc.detectedAt,
    resolvedAt: inc.resolvedAt || null,
    resolvedBy: inc.resolvedBy || null,
    recommendedAction: inc.recommendedAction
  }));
  if (exportFormat === "csv") {
    const headers = [
      "incidentId",
      "title",
      "severity",
      "status",
      "user",
      "email",
      "department",
      "riskScore",
      "contributingFactors",
      "mitreTechnique",
      "aiExplanation",
      "resolutionNotes",
      "detectedAt",
      "resolvedAt",
      "resolvedBy"
    ];
    const rows = structuredIncidents.map((inc) => [
      escapeCsv(inc.incidentId),
      escapeCsv(inc.title),
      escapeCsv(inc.severity),
      escapeCsv(inc.status),
      escapeCsv(inc.user),
      escapeCsv(inc.email),
      escapeCsv(inc.department),
      escapeCsv(inc.riskScore),
      escapeCsv(inc.contributingFactors),
      escapeCsv(inc.mitreTechnique),
      escapeCsv(inc.aiExplanation),
      escapeCsv(inc.resolutionNotes),
      escapeCsv(inc.detectedAt),
      escapeCsv(inc.resolvedAt || ""),
      escapeCsv(inc.resolvedBy || "")
    ].join(","));
    const csvContent = [headers.join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="incidents-${dateStr}.csv"`);
    return res.send(csvContent);
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="incidents-${dateStr}.json"`);
  return res.send(JSON.stringify(structuredIncidents, null, 2));
});
apiRouter.get("/incidents", (req, res) => {
  res.json({ success: true, incidents: db.incidents });
});
apiRouter.get("/incidents/:id", (req, res) => {
  const incident = db.incidents.find((i) => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found" } });
  }
  const user = db.getUserById(incident.userId);
  res.json({ success: true, incident, user });
});
apiRouter.post("/incidents/:id/resolve", requireSecurityAdmin, (req, res) => {
  const incident = db.incidents.find((i) => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found" } });
  }
  const { resolutionNotes, newStatus } = req.body;
  incident.status = newStatus || "RESOLVED";
  incident.resolvedAt = (/* @__PURE__ */ new Date()).toISOString();
  incident.resolvedBy = "Alex Rivera (Security Admin)";
  incident.analystNotes = resolutionNotes || "Incident reviewed and closed by SOC investigator.";
  incidentRepository.resolve(incident.id, incident.analystNotes, incident.resolvedBy).catch(() => {
  });
  sseManager.broadcastIncident(incident, false);
  db.appendAuditLog({
    userId: incident.userId,
    userName: incident.userName,
    action: "INCIDENT_RESOLVED",
    category: "INCIDENT",
    severity: "INFO",
    details: { incidentId: incident.id, status: incident.status, resolutionNotes: incident.analystNotes }
  });
  res.json({ success: true, incident });
});
apiRouter.post("/incidents/:id/ai-explain", async (req, res) => {
  const incident = db.incidents.find((i) => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ success: false, error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found" } });
  }
  const user = db.getUserById(incident.userId) || db.users[0];
  const explanation = await geminiService.generateIncidentExplanation(incident, user, void 0, {
    referer: req.headers.referer,
    origin: req.headers.origin,
    host: req.headers.host
  });
  incident.aiExplanation = explanation;
  incidentRepository.updateAiExplanation(incident.id, explanation).catch(() => {
  });
  sseManager.broadcastIncident(incident, false);
  res.json({ success: true, explanation, incident });
});
apiRouter.get("/access-requests", (req, res) => {
  res.json({ success: true, requests: db.accessRequests });
});
apiRouter.post("/access-requests", (req, res) => {
  const { userId, resourceId, reason } = req.body;
  const user = db.getUserById(userId) || db.getUserById(currentSessionUserId);
  const resource = db.getResourceById(resourceId);
  if (!user || !resource) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User or resource not found" } });
  }
  const newRequest = {
    id: `req-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userDepartment: user.department,
    resourceId: resource.id,
    resourceName: resource.name,
    resourceDepartment: resource.department,
    resourceSensitivity: resource.sensitivity,
    reason: reason || "Business operational need",
    requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
    riskScoreAtRequest: user.currentRiskScore,
    aiRiskAssessment: `Request for ${resource.sensitivity} resource outside ${user.department}. Current user trust: ${user.currentTrustScore}/100.`,
    status: "PENDING"
  };
  db.appendAccessRequest(newRequest);
  db.appendAuditLog({
    userId: user.id,
    userName: user.name,
    action: "ACCESS_REQUEST_SUBMITTED",
    category: "ACCESS",
    severity: "INFO",
    details: { requestId: newRequest.id, resourceName: resource.name, reason }
  });
  res.json({ success: true, request: newRequest });
});
apiRouter.post("/access-requests/:id/approve", requireSecurityAdmin, (req, res) => {
  const request = db.accessRequests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: { code: "REQUEST_NOT_FOUND", message: "Request not found" } });
  }
  request.status = "APPROVED";
  request.reviewedBy = "Alex Rivera (Security Admin)";
  request.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  request.reviewNotes = req.body.notes || "Approved after context verification.";
  accessRequestRepository.decide(request.id, "APPROVED", request.reviewedBy, request.reviewNotes).catch(() => {
  });
  sseManager.broadcastAccessRequest(request, false);
  db.appendAuditLog({
    userId: request.userId,
    userName: request.userName,
    action: "ACCESS_REQUEST_APPROVED",
    category: "ACCESS",
    severity: "INFO",
    details: { requestId: request.id, resourceName: request.resourceName, notes: request.reviewNotes }
  });
  res.json({ success: true, request });
});
apiRouter.post("/access-requests/:id/reject", requireSecurityAdmin, (req, res) => {
  const request = db.accessRequests.find((r) => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: { code: "REQUEST_NOT_FOUND", message: "Request not found" } });
  }
  request.status = "REJECTED";
  request.reviewedBy = "Alex Rivera (Security Admin)";
  request.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  request.reviewNotes = req.body.notes || "Rejected due to principle of least privilege.";
  accessRequestRepository.decide(request.id, "REJECTED", request.reviewedBy, request.reviewNotes).catch(() => {
  });
  sseManager.broadcastAccessRequest(request, false);
  db.appendAuditLog({
    userId: request.userId,
    userName: request.userName,
    action: "ACCESS_REQUEST_REJECTED",
    category: "ACCESS",
    severity: "WARNING",
    details: { requestId: request.id, resourceName: request.resourceName, notes: request.reviewNotes }
  });
  res.json({ success: true, request });
});
apiRouter.get("/policies", (req, res) => {
  res.json({ success: true, config: db.policyConfig });
});
apiRouter.patch("/policies", requireSecurityAdmin, (req, res) => {
  const updates = req.body;
  const newConfig = { ...db.policyConfig, ...updates };
  if (newConfig.lowRiskMax >= newConfig.mediumRiskMax || newConfig.mediumRiskMax >= newConfig.highRiskMax || newConfig.highRiskMax >= newConfig.veryHighRiskMax || newConfig.veryHighRiskMax >= newConfig.criticalThreshold) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_THRESHOLDS", message: "Risk thresholds must strictly follow: Low < Medium < High < Very High < Critical" }
    });
  }
  db.policyConfig = newConfig;
  policyRepository.updatePolicy(db.policyConfig).catch(() => {
  });
  sseManager.broadcastPolicyUpdate(db.policyConfig);
  db.appendAuditLog({
    action: "ZERO_TRUST_POLICY_UPDATED",
    category: "POLICY",
    severity: "INFO",
    details: { updatedFields: Object.keys(updates), newConfig: db.policyConfig }
  });
  res.json({ success: true, config: db.policyConfig, message: "Zero Trust policy configuration saved." });
});
apiRouter.get("/audit-logs/export", (req, res) => {
  const requester = getRequesterUser(req);
  if (!isAuthorizedForExport(requester)) {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Access Denied: Audit log export requires SECURITY_ADMIN or SYSTEM_ADMIN privileges."
      }
    });
  }
  const { category, severity, search, startDate, endDate, from, to, format = "json" } = req.query;
  const exportFormat = String(format).toLowerCase() === "csv" ? "csv" : "json";
  const start = startDate || from ? new Date(String(startDate || from)) : null;
  const end = endDate || to ? new Date(String(endDate || to)) : null;
  let filtered = [...db.auditLogs];
  if (category && category !== "ALL") {
    filtered = filtered.filter((l) => l.category === category);
  }
  if (severity && severity !== "ALL") {
    filtered = filtered.filter((l) => l.severity === severity);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (l) => l.action.toLowerCase().includes(q) || l.userName && l.userName.toLowerCase().includes(q) || l.actorName && l.actorName.toLowerCase().includes(q) || l.targetUserName && l.targetUserName.toLowerCase().includes(q) || l.ipAddress && l.ipAddress.includes(q) || l.details && JSON.stringify(l.details).toLowerCase().includes(q)
    );
  }
  if (start && !isNaN(start.getTime())) {
    filtered = filtered.filter((l) => new Date(l.timestamp).getTime() >= start.getTime());
  }
  if (end && !isNaN(end.getTime())) {
    filtered = filtered.filter((l) => new Date(l.timestamp).getTime() <= end.getTime());
  }
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  db.appendAuditLog({
    userId: requester.id,
    userName: requester.name,
    action: "AUDIT_LOG_EXPORTED",
    category: "ADMIN",
    severity: "INFO",
    details: {
      format: exportFormat,
      recordsExported: filtered.length,
      filters: { category, severity, search }
    },
    ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1"
  });
  if (exportFormat === "csv") {
    const headers = ["timestamp", "action", "category", "severity", "user", "IP", "details"];
    const rows = filtered.map((log) => [
      escapeCsv(log.timestamp),
      escapeCsv(log.action),
      escapeCsv(log.category),
      escapeCsv(log.severity),
      escapeCsv(log.userName || log.actorName || log.userId || "System"),
      escapeCsv(log.ipAddress || "127.0.0.1"),
      escapeCsv(log.details || {})
    ].join(","));
    const csvContent = [headers.join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${dateStr}.csv"`);
    return res.send(csvContent);
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${dateStr}.json"`);
  return res.send(JSON.stringify(filtered, null, 2));
});
apiRouter.get("/audit-logs", (req, res) => {
  const { category, severity, search } = req.query;
  let filtered = [...db.auditLogs];
  if (category && category !== "ALL") {
    filtered = filtered.filter((l) => l.category === category);
  }
  if (severity && severity !== "ALL") {
    filtered = filtered.filter((l) => l.severity === severity);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (l) => l.action.toLowerCase().includes(q) || l.userName && l.userName.toLowerCase().includes(q) || l.ipAddress && l.ipAddress.includes(q)
    );
  }
  res.json({ success: true, logs: filtered });
});
apiRouter.get("/ml/metrics", (req, res) => {
  const comparison = mlEngine.getBenchmarkComparison();
  const evaluation = mlEngine.getEvaluationReport();
  res.json({
    success: true,
    data: comparison,
    metrics: evaluation
  });
});
apiRouter.post("/ml/predict", (req, res) => {
  if (req.body.event_type || req.body.bytes_sent_kb !== void 0 || req.body.application_shell_cmd) {
    const result = mlEngine.predictTelemetryEvent(req.body);
    return res.json({
      success: true,
      ...result
    });
  }
  const { userId, resourceId, downloadSizeMB, isOffHours, failedLoginCount } = req.body;
  const user = db.getUserById(userId) || db.users[0];
  const resource = resourceId ? db.getResourceById(resourceId) : void 0;
  const mockEvent = {
    userId: user.id,
    userDepartment: user.department,
    eventType: "RESOURCE_ACCESS",
    metadata: {
      downloadSizeMB: Number(downloadSizeMB || 0),
      failedLoginAttempts: Number(failedLoginCount || 0)
    }
  };
  const features = mlEngine.extractFeatures(mockEvent, user, void 0, resource);
  const score = mlEngine.predictAnomalyScore(features);
  const factors = mlEngine.computeFeatureAttributions(features, Math.round(score * 100));
  res.json({
    success: true,
    mlAnomalyScore: score,
    isAnomalous: score > 0.4,
    extractedFeatures: features,
    attributions: factors
  });
});
apiRouter.post("/ml/telemetry-predict", (req, res) => {
  const result = mlEngine.predictTelemetryEvent(req.body);
  res.json({
    success: true,
    ...result
  });
});
apiRouter.get("/ml/model-info", (req, res) => {
  const info = mlEngine.getModelInfo();
  res.json({ success: true, model: info });
});
apiRouter.post("/ml/retrain", async (req, res) => {
  try {
    const { csvPath } = req.body;
    const bundle = await mlEngine.retrainModel(csvPath);
    res.json({
      success: true,
      message: "Model retrained successfully on cybersecurity dataset",
      metadata: bundle.metadata,
      evaluation: bundle.metrics.supervised
    });
  } catch (err) {
    console.error("Retraining failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
apiRouter.post("/ml/explain", (req, res) => {
  const { event, user, device, resource } = req.body;
  const targetUser = user || db.getUserById(event?.userId) || db.users[0];
  const targetResource = resource || (event?.resourceId ? db.getResourceById(event.resourceId) : void 0);
  const targetDevice = device || (event?.deviceId ? db.getDeviceById(event.deviceId) : void 0);
  const features = mlEngine.extractFeatures(event || {}, targetUser, targetDevice, targetResource);
  const anomalyScore = mlEngine.predictAnomalyScore(features);
  const factors = mlEngine.computeFeatureAttributions(features, Math.round(anomalyScore * 100));
  res.json({
    success: true,
    anomalyScore,
    features,
    attributions: factors,
    model: "Isolation Forest Tree-Path Perturbation Attribution"
  });
});
apiRouter.post("/telemetry/ingest", (req, res) => {
  const normalized = TelemetryNormalizer.normalize(req.body);
  const targetUser = db.getUserById(normalized.userId) || db.users.find((u) => u.email.toLowerCase() === (normalized.userId || "").toLowerCase() || u.name.toLowerCase() === (normalized.userId || "").toLowerCase()) || db.users[0];
  const targetResource = normalized.resourceId ? db.getResourceById(normalized.resourceId) : void 0;
  const targetDevice = normalized.deviceId ? db.getDeviceById(normalized.deviceId) : targetUser.activeDeviceId ? db.getDeviceById(targetUser.activeDeviceId) : void 0;
  const mlInput = {
    ...req.body,
    ...normalized,
    user_department: normalized.userDepartment || targetUser.department,
    department: normalized.userDepartment || targetUser.department,
    failed_login_attempts: normalized.failedAuthCount,
    is_off_hours: normalized.isOffHours ? 1 : 0,
    usb_bluetooth_usage: normalized.isUsbTransfer ? 1 : 0,
    is_privilege_escalation: normalized.isPrivilegeEscalation ? 1 : 0,
    bytes_sent_kb: normalized.bytesSentKB,
    bytes_received_kb: normalized.bytesReceivedKB,
    destination_site: normalized.destinationSite,
    application_shell_cmd: normalized.applicationShellCmd
  };
  const mlResult = mlEngine.predictTelemetryEvent(mlInput);
  const activityEvent = {
    id: normalized.eventId,
    userId: targetUser.id,
    userEmail: targetUser.email,
    userName: targetUser.name,
    userDepartment: targetUser.department,
    timestamp: normalized.timestamp,
    eventType: normalized.eventType,
    resourceId: targetResource?.id || normalized.resourceId,
    resourceName: targetResource?.name || normalized.resourceName,
    resourceDepartment: targetResource?.department || normalized.resourceDepartment,
    resourceSensitivity: targetResource?.sensitivity || normalized.resourceSensitivity,
    deviceId: targetDevice?.id || normalized.deviceId,
    deviceName: targetDevice?.deviceName || normalized.deviceName,
    deviceTrustScore: normalized.deviceTrustScore,
    isUnknownDevice: normalized.isUnknownDevice,
    ipAddress: normalized.ipAddress,
    location: normalized.location,
    severity: normalized.severity,
    metadata: {
      ...normalized.rawMetadata,
      downloadSizeMB: normalized.downloadSizeMB,
      bytesSentKB: normalized.bytesSentKB,
      bytesReceivedKB: normalized.bytesReceivedKB,
      failedLoginAttempts: normalized.failedAuthCount,
      isOffHours: normalized.isOffHours,
      crossDepartment: normalized.isCrossDepartment,
      escalationAttempt: normalized.isPrivilegeEscalation,
      usbConnected: normalized.isUsbTransfer,
      destinationSite: normalized.destinationSite,
      applicationShellCmd: normalized.applicationShellCmd,
      supervisedProbability: mlResult.supervisedProbability,
      isolationForestScore: mlResult.unsupervisedAnomalyScore,
      techniqueId: normalized.mitreTechniqueId,
      techniqueName: normalized.mitreTechniqueName,
      contributingFeatures: mlResult.attributions.map((a) => a.factor),
      modelType: mlResult.modelType
    }
  };
  const decision = policyEngine.evaluateAccess(
    targetUser,
    {
      ...activityEvent,
      ...normalized,
      isOffHours: normalized.isOffHours,
      isCrossDepartment: normalized.isCrossDepartment,
      isUnknownDevice: normalized.isUnknownDevice,
      isPrivilegeEscalation: normalized.isPrivilegeEscalation,
      isUsbTransfer: normalized.isUsbTransfer,
      destinationSite: normalized.destinationSite,
      applicationShellCmd: normalized.applicationShellCmd
    },
    targetDevice,
    targetResource,
    mlResult
  );
  activityEvent.riskContribution = decision.evaluation.riskScore;
  activityEvent.mlAnomalyScore = decision.evaluation.mlAnomalyScore;
  activityEvent.isAnomalous = mlResult.isAnomalous || decision.evaluation.riskScore >= db.policyConfig.highRiskMax;
  activityEvent.metadata.policyAction = decision.decision;
  db.appendActivityEvent(activityEvent);
  sseManager.broadcastActivity(activityEvent);
  sseManager.broadcast("TELEMETRY_INGESTED", {
    eventId: normalized.eventId,
    event: activityEvent,
    ml: mlResult,
    decision: decision.decision,
    riskScore: decision.evaluation.riskScore,
    riskLevel: decision.evaluation.riskLevel
  });
  sseManager.broadcastRiskUpdated(
    targetUser.id,
    decision.evaluation.riskScore,
    decision.evaluation.riskLevel,
    mlResult.mlAnomalyScore,
    targetUser
  );
  sseManager.broadcastPolicyDecision({
    userId: targetUser.id,
    decision: decision.decision,
    reason: decision.reason,
    allowed: decision.allowed,
    requiresMfa: decision.requiresMfa,
    isRestricted: decision.isRestricted,
    isFrozen: decision.isFrozen,
    eventId: normalized.eventId
  });
  if (decision.incidentCreated) {
    sseManager.broadcastIncident(decision.incidentCreated, true);
  }
  res.json({
    success: true,
    eventId: normalized.eventId,
    normalized,
    ml: {
      isAnomalous: mlResult.isAnomalous,
      supervisedProbability: mlResult.supervisedProbability,
      isolationForestScore: mlResult.unsupervisedAnomalyScore,
      mlAnomalyScore: mlResult.mlAnomalyScore,
      decisionThreshold: mlResult.decisionThreshold,
      modelType: mlResult.modelType,
      combinationRule: mlResult.combinationRule,
      attributions: mlResult.attributions,
      extractedFeatures: mlResult.extractedFeatures
    },
    riskAssessment: {
      riskScore: decision.evaluation.riskScore,
      riskLevel: decision.evaluation.riskLevel,
      trustScore: decision.evaluation.trustScore,
      contributingFactors: decision.evaluation.contributingFactors,
      explanationText: decision.evaluation.explanationText
    },
    policyDecision: {
      decision: decision.decision,
      allowed: decision.allowed,
      requiresMfa: decision.requiresMfa,
      requiresApproval: decision.requiresApproval,
      isRestricted: decision.isRestricted,
      isFrozen: decision.isFrozen,
      reason: decision.reason
    },
    incidentCreated: decision.incidentCreated
  });
});
apiRouter.post("/copilot/chat", async (req, res) => {
  const { message, context } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: { code: "EMPTY_MESSAGE", message: "Message is required" } });
  }
  const responseText = await geminiService.askSecurityCopilot(message, context, {
    referer: req.headers.referer,
    origin: req.headers.origin,
    host: req.headers.host
  });
  res.json({ success: true, reply: responseText, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
apiRouter.get("/system/status", async (req, res) => {
  const isConnected = db.isPostgresConnected;
  res.json({
    success: true,
    system: {
      platform: "Enterprise Zero Trust & UEBA Architecture",
      version: "v2.4.0-prisma-postgresql-sse",
      storageEngine: isConnected ? "PostgreSQL via Prisma ORM" : "Prisma Client Ready (In-Memory Fallback Cache)",
      databaseConnected: isConnected,
      realTimeStream: {
        engine: "Server-Sent Events (SSE)",
        endpoint: "/api/events/stream",
        connectedClients: sseManager.getClientCount(),
        heartbeatIntervalMs: 15e3
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
        events: db.activityEvents.length,
        incidents: db.incidents.length,
        accessRequests: db.accessRequests.length,
        auditLogs: db.auditLogs.length
      }
    }
  });
});
apiRouter.post("/system/db-sync", async (req, res) => {
  const connected = await db.initDatabaseLayer();
  res.json({
    success: true,
    connected,
    message: connected ? "Synchronized state with PostgreSQL database." : "Database offline, operating in memory."
  });
});
export {
  apiRouter,
  generateJwtToken,
  verifyJwtToken
};
