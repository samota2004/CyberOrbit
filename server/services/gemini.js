import { GoogleGenAI } from "@google/genai";
import { db } from '../models/db.js';
function getAiClient(reqHeaders) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const referer = reqHeaders?.referer || reqHeaders?.origin || (reqHeaders?.host ? `https://${reqHeaders.host}` : "https://ai.studio");
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
        "Referer": referer
      }
    }
  });
}
class GeminiSecurityService {
  /**
   * Generates a concise, professional SOC analyst incident explanation using Gemini AI.
   * Only sanitized, non-confidential context is supplied.
   */
  async generateIncidentExplanation(incident, user, event, reqHeaders) {
    const ai = getAiClient(reqHeaders);
    if (!ai) {
      return this.generateDeterministicFallbackExplanation(incident, user);
    }
    const prompt = `You are a Tier-3 Cybersecurity SOC Analyst assistant for an enterprise Zero Trust & UEBA platform.
Analyze this security anomaly event and generate a clear, professional 2-3 sentence technical explanation for the security administrator.

USER PROFILE:
- Employee ID: ${user.employeeId}
- Department: ${user.department}
- Role: ${user.role}
- Current Trust Score: ${user.currentTrustScore}/100
- Baseline Hours: ${user.baseline.normalWorkHours.start}:00 - ${user.baseline.normalWorkHours.end}:00

INCIDENT CONTEXT:
- Event Type: ${incident.eventType}
- Evaluated Risk Score: ${incident.riskScore}/100 (${incident.severity})
- Contributing Signals: ${incident.contributingFactors.join(", ")}
- Zero Trust Policy Action: ${incident.recommendedAction}

Write a direct, objective explanation specifying what occurred, why it violates UEBA baselines, and what risk it poses to enterprise assets.`;
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: "You are an expert enterprise cybersecurity investigator. Be direct, authoritative, and concise.",
            temperature: 0.3
          }
        });
        if (response.text?.trim()) {
          return response.text.trim();
        }
      } catch (error) {
      }
    }
    return this.generateDeterministicFallbackExplanation(incident, user);
  }
  /**
   * Answers SOC administrator questions regarding security events, users, policies, or incidents.
   */
  async askSecurityCopilot(query, context, reqHeaders) {
    const ai = getAiClient(reqHeaders);
    if (!ai) {
      return this.generateDeterministicCopilotResponse(query, context);
    }
    let targetedUser;
    let targetedIncident;
    if (context?.userId) {
      targetedUser = db.getUserById(context.userId);
    }
    if (context?.incidentId) {
      targetedIncident = db.incidents.find((i) => i.id === context.incidentId);
    }
    const activeIncidents = db.incidents.map((i) => `[${i.id}] ${i.userName} (${i.userDepartment}) - ${i.eventType} (Risk ${i.riskScore}, Status: ${i.status})`).slice(0, 5);
    const topRiskyUsers = db.users.filter((u) => u.currentRiskScore > 40).map((u) => `${u.name} (${u.employeeId}, ${u.department}): Risk ${u.currentRiskScore}, Trust ${u.currentTrustScore}, Status ${u.status}`);
    const prompt = `You are the Zero Trust AI Security Copilot for an enterprise Security Operations Center (SOC).
Answer the administrator's question with precise cybersecurity analysis based strictly on the provided real-time telemetry.

SYSTEM TELEMETRY SUMMARY:
- Total Enterprise Users: ${db.users.length}
- Active High-Risk Accounts: ${topRiskyUsers.join("; ") || "None"}
- Open Incidents: ${activeIncidents.join("; ") || "None"}
- Zero Trust Enforcement Policy: Strict (MFA at ${db.policyConfig.mfaThreshold}, Approval at ${db.policyConfig.approvalThreshold}, Auto-Freeze at ${db.policyConfig.criticalThreshold})

${targetedUser ? `FOCUSED USER: ${targetedUser.name} (${targetedUser.employeeId}, Department: ${targetedUser.department}, Current Risk: ${targetedUser.currentRiskScore}, Trust: ${targetedUser.currentTrustScore}, Status: ${targetedUser.status})` : ""}
${targetedIncident ? `FOCUSED INCIDENT: ID ${targetedIncident.id}, Event: ${targetedIncident.eventType}, Severity: ${targetedIncident.severity}, Risk: ${targetedIncident.riskScore}, Factors: ${targetedIncident.contributingFactors.join(", ")}` : ""}

ADMIN QUESTION: "${query}"

Provide a structured, insightful answer with clear risk implications and actionable SOC recommendations (e.g. step-up MFA, IAM review, account freeze, or false-positive adjustment).`;
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction: "You are an advanced cybersecurity analyst copilot. Format your response cleanly using bullet points and bold highlights.",
            temperature: 0.4
          }
        });
        if (response.text?.trim()) {
          return response.text.trim();
        }
      } catch (error) {
      }
    }
    return this.generateDeterministicCopilotResponse(query, context);
  }
  generateDeterministicFallbackExplanation(incident, user) {
    return `Security anomaly detected for ${user.name} (${user.employeeId}, ${user.department}). Event "${incident.eventType}" produced an evaluated risk score of ${incident.riskScore}/100. Primary contributing signals include: ${incident.contributingFactors.join(", ")}. Zero Trust policy engine recommended action: ${incident.recommendedAction}.`;
  }
  generateDeterministicCopilotResponse(query, context) {
    if (context?.userId) {
      const user = db.getUserById(context.userId);
      if (user) {
        return `**Investigation Summary for ${user.name} (${user.employeeId})**:
- **Department**: ${user.department} | **Role**: ${user.role}
- **Current Risk Score**: **${user.currentRiskScore}/100** (${user.currentRiskLevel})
- **Dynamic Trust Score**: **${user.currentTrustScore}/100**
- **Status**: ${user.status}
- **UEBA Behavioral Context**: Normal hours ${user.baseline.normalWorkHours.start}:00-${user.baseline.normalWorkHours.end}:00, primary department ${user.baseline.primaryDepartment}.
- **SOC Recommendation**: ${user.currentRiskScore > 75 ? "Immediate account restriction and credential review recommended." : user.currentRiskScore > 50 ? "Enforce Step-Up MFA on next access and monitor telemetry." : "User activity within normal baseline parameters."}`;
      }
    }
    const openCount = db.incidents.filter((i) => i.status === "OPEN").length;
    const highRiskCount = db.users.filter((u) => u.currentRiskScore >= 60).length;
    return `**SOC Telemetry Analysis**:
- **Active Threats**: Found **${highRiskCount}** high-risk users and **${openCount}** open incidents requiring investigation.
- **Top Priority Alert**: ${db.incidents[0] ? `Incident ${db.incidents[0].id} (${db.incidents[0].userName} - ${db.incidents[0].eventType}) with risk ${db.incidents[0].riskScore}/100.` : "No critical incidents currently active."}
- **Zero Trust Status**: Continuous behavioral verification is active across all endpoints.`;
  }
}
const geminiService = new GeminiSecurityService();
export {
  GeminiSecurityService,
  geminiService
};
