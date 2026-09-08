import { db } from '../../server/models/db.js';
import { riskEngine } from '../risk-engine/risk-engine.js';
import { trustEngine } from '../zero-trust/trust-engine.js';
import { sseManager } from '../../server/services/sse.js';
class PolicyEngine {
  /**
   * Continuous Zero Trust Policy Enforcement:
   * Combines RBAC (Role-Based Access Control) + ABAC (Attribute-Based Access Control) + Risk/Trust context.
   */
  evaluateAccess(user, event, device, resource, mlResult) {
    const config = db.policyConfig;
    if (user.status === "FROZEN") {
      return {
        decision: "FREEZE",
        allowed: false,
        requiresMfa: false,
        requiresApproval: false,
        isRestricted: true,
        isFrozen: true,
        reason: "Account is currently FROZEN due to critical security anomalies. Contact Security Operations to unfreeze.",
        evaluation: {
          userId: user.id,
          riskScore: 99,
          riskLevel: "CRITICAL",
          trustScore: user.currentTrustScore,
          contributingFactors: [{ factor: "Account Status FROZEN", scoreImpact: 50, description: "Administrative or automated security hold active.", category: "BEHAVIOR" }],
          recommendedAction: "FREEZE",
          policyEnforced: "FREEZE",
          mlAnomalyScore: 0.99,
          isCrossDepartment: false,
          isOffHours: false,
          isUnknownDevice: false,
          explanationText: "Account access locked by Zero Trust policy.",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      };
    }
    const evaluation = riskEngine.evaluateRisk(user, event, device, resource, mlResult);
    const eventSummary = event.eventType ? `${event.eventType} ${resource ? `on ${resource.name}` : ""}` : "Security Context Check";
    trustEngine.updateTrustScore(user, evaluation, eventSummary);
    let decision = evaluation.recommendedAction;
    let allowed = false;
    let requiresMfa = false;
    let requiresApproval = false;
    let isRestricted = false;
    let isFrozen = false;
    let reason = "";
    let incidentCreated = void 0;
    switch (decision) {
      case "ALLOW":
        allowed = true;
        reason = "Access granted. User activity and device context conform to Zero Trust baseline.";
        break;
      case "MONITOR":
        allowed = true;
        reason = "Access granted under heightened behavioral telemetry monitoring.";
        break;
      case "MFA":
        allowed = false;
        requiresMfa = true;
        reason = "Step-Up Multi-Factor Authentication required due to elevated risk context (e.g. unverified endpoint or off-hours access).";
        break;
      case "REQUIRE_APPROVAL":
        allowed = false;
        requiresApproval = true;
        isRestricted = true;
        reason = "Access blocked. High/Very high risk detected. Manager or Security Administrator approval required.";
        break;
      case "RESTRICT":
      case "FREEZE":
        allowed = false;
        isRestricted = true;
        if (config.autoFreezeOnCritical && evaluation.riskScore >= config.criticalThreshold) {
          isFrozen = true;
          user.status = "FROZEN";
          decision = "FREEZE";
          reason = "Critical security anomaly detected. Account automatically frozen and active sessions revoked pending SOC incident investigation.";
          sseManager.broadcastAccountStatus(user.id, "FROZEN", user);
          sseManager.broadcastContainmentAction({
            action: "ACCOUNT_FROZEN",
            userId: user.id,
            userName: user.name,
            reason,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            eventId: event.id
          });
        } else {
          user.status = "RESTRICTED";
          decision = "RESTRICT";
          reason = "High-risk security policy violation. Sensitive resource access temporarily restricted.";
          sseManager.broadcastAccountStatus(user.id, "RESTRICTED", user);
          sseManager.broadcastContainmentAction({
            action: "ACCOUNT_RESTRICTED",
            userId: user.id,
            userName: user.name,
            reason,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            eventId: event.id
          });
        }
        break;
    }
    const incidentThreshold = config.highRiskMax || 75;
    if (evaluation.riskScore >= incidentThreshold || decision === "FREEZE" || decision === "RESTRICT") {
      const existingIncident = db.incidents.find((i) => i.eventId === event.id);
      if (existingIncident) {
        incidentCreated = existingIncident;
      } else {
        let mitreTechnique = event.metadata?.techniqueId || event.mitreTechniqueId;
        if (!mitreTechnique) {
          const rawCmd = String(event.applicationShellCmd || event.metadata?.applicationShellCmd || event.metadata?.application_shell_cmd || "").toLowerCase();
          const rawDest = String(event.destinationSite || event.metadata?.destinationSite || event.metadata?.destination_site || "").toLowerCase();
          if (rawDest.includes("c2-") || rawDest.includes("darknet") || rawCmd.includes("nc -") || rawCmd.includes("dev/tcp") || rawCmd.includes("powershell")) {
            mitreTechnique = "T1071 - Application Layer Protocol: Command and Control";
          } else if (event.metadata?.usbConnected || event.eventType === "USB_ACTIVITY" || event.isUsbTransfer) {
            mitreTechnique = "T1052 - Exfiltration Over Physical Medium (USB)";
          } else if (event.metadata?.escalationAttempt || event.eventType === "PRIVILEGE_CHANGE" || event.isPrivilegeEscalation || /sudo|whoami \/priv|chmod 777/i.test(rawCmd)) {
            mitreTechnique = "T1068 - Exploitation for Privilege Escalation";
          } else if (Number(event.metadata?.downloadSizeMB || event.downloadSizeMB || 0) > 100 || event.bytesSentKB && event.bytesSentKB > 5e4 || event.eventType === "FILE_DOWNLOAD") {
            mitreTechnique = "T1048 - Exfiltration Over Web/Cloud (Mass Transfer)";
          } else if (Number(event.metadata?.failedLoginAttempts || event.failedAuthCount || 0) > 0 || event.eventType === "FAILED_LOGIN") {
            mitreTechnique = "T1110 - Brute Force / Credential Stuffing";
          } else if (evaluation.isCrossDepartment) {
            mitreTechnique = "T1078 - Valid Accounts Abuse (Unauthorized Cross-Dept Access)";
          } else {
            mitreTechnique = "T1078 - Valid Accounts Abuse";
          }
        }
        incidentCreated = {
          id: `inc-${Date.now().toString().slice(-6)}`,
          title: `${mitreTechnique.split(" - ")[0]}: Suspicious ${event.eventType || "Activity"} by ${user.name}`,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userDepartment: user.department,
          eventId: event.id || `evt-${Date.now()}`,
          eventType: event.eventType || "RESOURCE_ACCESS",
          mitreTechnique,
          severity: evaluation.riskLevel === "CRITICAL" ? "CRITICAL" : evaluation.riskLevel === "VERY_HIGH" ? "HIGH" : "MEDIUM",
          riskScore: evaluation.riskScore,
          supervisedProbability: mlResult?.supervisedProbability,
          isolationForestScore: mlResult?.unsupervisedAnomalyScore,
          contributingFeatures: evaluation.contributingFactors.map((f) => f.factor),
          contributingFactors: evaluation.contributingFactors.map((f) => f.factor),
          xaiExplanation: evaluation.explanationText,
          policyAction: decision,
          status: "OPEN",
          detectedAt: (/* @__PURE__ */ new Date()).toISOString(),
          aiExplanation: evaluation.explanationText,
          recommendedAction: decision,
          adminActionTaken: decision === "FREEZE" ? "Account Auto-Frozen & Active Sessions Revoked" : decision === "MFA" ? "Step-up MFA Enforced" : decision === "REQUIRE_APPROVAL" ? "Security Administrator Approval Required" : "Access Restricted"
        };
        db.appendIncident(incidentCreated);
      }
    }
    db.appendAuditLog({
      userId: user.id,
      userName: user.name,
      action: `ZERO_TRUST_POLICY_${decision}`,
      category: "POLICY",
      severity: evaluation.riskLevel === "CRITICAL" ? "CRITICAL" : evaluation.riskLevel === "VERY_HIGH" ? "WARNING" : "INFO",
      details: {
        eventType: event.eventType,
        resourceId: resource?.id,
        riskScore: evaluation.riskScore,
        riskLevel: evaluation.riskLevel,
        decision,
        reason,
        mlProbability: mlResult?.supervisedProbability,
        isolationForestScore: mlResult?.unsupervisedAnomalyScore,
        mitreTechnique: incidentCreated?.mitreTechnique
      },
      ipAddress: event.ipAddress || device?.ipAddress
    });
    return {
      decision,
      allowed,
      requiresMfa,
      requiresApproval,
      isRestricted,
      isFrozen,
      reason,
      evaluation,
      incidentCreated
    };
  }
}
const policyEngine = new PolicyEngine();
export {
  PolicyEngine,
  policyEngine
};
