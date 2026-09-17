import { GoogleGenAI } from "@google/genai";
import { db } from "../models/db.js";

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite"
];

const MAX_RETRIES_PER_MODEL = 1;
const RETRY_DELAY_MS = 800;

function getAiClient(reqHeaders = {}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing in .env");
    return null;
  }

  const referer =
    reqHeaders.referer ||
    reqHeaders.origin ||
    (reqHeaders.host
      ? `http://${reqHeaders.host}`
      : "http://localhost:5173");

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "CyberOrbit-Security-Copilot",
        Referer: referer
      }
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getErrorStatus(error) {
  return Number(
    error?.status ||
    error?.code ||
    error?.response?.status ||
    error?.error?.code ||
    0
  );
}

function isRetryableError(error) {
  const status = getErrorStatus(error);

  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }

  const message = String(
    error?.message ||
    error?.error?.message ||
    error ||
    ""
  ).toLowerCase();

  return (
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("service unavailable") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("overloaded")
  );
}

function isNonRetryableAuthenticationError(error) {
  const status = getErrorStatus(error);

  return (
    status === 400 ||
    status === 401 ||
    status === 403
  );
}

async function generateWithModel(ai, model, prompt, systemInstruction) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction
        }
      });

      const text = response?.text?.trim();

      if (text) {
        return text;
      }

      lastError = new Error(
        `Gemini returned an empty response using ${model}.`
      );
    } catch (error) {
      lastError = error;

      if (isNonRetryableAuthenticationError(error)) {
        throw error;
      }

      if (!isRetryableError(error)) {
        break;
      }

      if (attempt < MAX_RETRIES_PER_MODEL) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError || new Error(
    `Gemini generation failed using ${model}.`
  );
}

class GeminiSecurityService {
  async generateIncidentExplanation(
    incident,
    user,
    event,
    reqHeaders = {}
  ) {
    const ai = getAiClient(reqHeaders);

    if (!ai) {
      return this.generateDeterministicFallbackExplanation(
        incident,
        user
      );
    }

    const prompt = `
You are a Tier-3 Cybersecurity SOC Analyst assistant for an enterprise Zero Trust and UEBA platform.

Analyze the following security anomaly and provide a clear, professional technical explanation in 2-3 sentences.

USER PROFILE:
- Employee ID: ${user?.employeeId || "Unknown"}
- Department: ${user?.department || "Unknown"}
- Role: ${user?.role || "Unknown"}
- Current Trust Score: ${user?.currentTrustScore ?? "Unknown"}/100
- Baseline Hours: ${
      user?.baseline?.normalWorkHours?.start ?? 8
    }:00 - ${
      user?.baseline?.normalWorkHours?.end ?? 19
    }:00

INCIDENT CONTEXT:
- Event Type: ${incident?.eventType || "Unknown"}
- Evaluated Risk Score: ${incident?.riskScore ?? 0}/100
- Severity: ${incident?.severity || "Unknown"}
- Contributing Signals: ${
      Array.isArray(incident?.contributingFactors)
        ? incident.contributingFactors.join(", ")
        : "Not available"
    }
- Zero Trust Policy Action: ${
      incident?.recommendedAction || "Not available"
    }

Explain what occurred, why it may violate the user's normal behavioral baseline,
and what risk it creates for enterprise resources.
`;

    for (const model of GEMINI_MODELS) {
      try {
        const text = await generateWithModel(
          ai,
          model,
          prompt,
          "You are an expert enterprise cybersecurity investigator. Be direct, objective, and concise."
        );

        if (text) {
          return text;
        }
      } catch (error) {
        const status = getErrorStatus(error);

        if (isNonRetryableAuthenticationError(error)) {
          console.error(
            `Gemini authentication/configuration error using ${model}:`,
            error?.message || error
          );

          break;
        }

        console.warn(
          `Gemini incident explanation unavailable using ${model} (${status || "unknown"}). Trying next model.`
        );
      }
    }

    return this.generateDeterministicFallbackExplanation(
      incident,
      user
    );
  }

  async askSecurityCopilot(
    query,
    context = {},
    reqHeaders = {}
  ) {
    const ai = getAiClient(reqHeaders);

    let targetedUser = null;
    let targetedIncident = null;

    if (context?.userId) {
      targetedUser = db.getUserById(context.userId);
    }

    if (!targetedUser && context?.employeeId) {
      targetedUser = db.users.find(
        (user) =>
          String(user.employeeId).toLowerCase() ===
          String(context.employeeId).toLowerCase()
      );
    }

    if (!targetedUser && query) {
      const employeeIdMatch = String(query).match(
        /\bEMP\d+\b/i
      );

      if (employeeIdMatch) {
        targetedUser = db.users.find(
          (user) =>
            String(user.employeeId).toLowerCase() ===
            employeeIdMatch[0].toLowerCase()
        );
      }
    }

    if (context?.incidentId) {
      targetedIncident = db.incidents.find(
        (incident) =>
          incident.id === context.incidentId ||
          incident.incidentId === context.incidentId
      );
    }

    const activeIncidents = db.incidents
      .filter(
        (incident) =>
          incident.status === "OPEN" ||
          incident.status === "NEW" ||
          incident.status === "INVESTIGATING"
      )
      .map(
        (incident) =>
          `[${incident.id}] ${
            incident.userName ||
            incident.userEmail ||
            "Unknown User"
          } - ${
            incident.eventType ||
            incident.title ||
            "Security Event"
          } - Risk ${
            incident.riskScore ?? 0
          } - Status ${incident.status}`
      )
      .slice(0, 10);

    const topRiskyUsers = db.users
      .filter(
        (user) =>
          Number(user.currentRiskScore || 0) > 40
      )
      .map(
        (user) =>
          `${user.name} (${user.employeeId}, ${user.department}): Risk ${
            user.currentRiskScore
          }, Trust ${user.currentTrustScore}, Status ${user.status}`
      )
      .slice(0, 10);

    const focusedUserText = targetedUser
      ? `
FOCUSED USER:
- Name: ${targetedUser.name}
- Employee ID: ${targetedUser.employeeId}
- Department: ${targetedUser.department}
- Role: ${targetedUser.role}
- Risk Score: ${targetedUser.currentRiskScore ?? 0}/100
- Risk Level: ${targetedUser.currentRiskLevel || "UNKNOWN"}
- Trust Score: ${targetedUser.currentTrustScore ?? 0}/100
- Status: ${targetedUser.status}
- Baseline Hours: ${
          targetedUser.baseline?.normalWorkHours?.start ?? 8
        }:00 - ${
          targetedUser.baseline?.normalWorkHours?.end ?? 19
        }:00
`
      : `
FOCUSED USER:
No matching employee was found in the currently loaded database.
`;

    const focusedIncidentText = targetedIncident
      ? `
FOCUSED INCIDENT:
- ID: ${targetedIncident.id}
- Event: ${targetedIncident.eventType || "Unknown"}
- Severity: ${targetedIncident.severity || "Unknown"}
- Risk: ${targetedIncident.riskScore ?? 0}
- Factors: ${
          Array.isArray(targetedIncident.contributingFactors)
            ? targetedIncident.contributingFactors.join(", ")
            : "Not available"
        }
`
      : "";

    const prompt = `
You are the Zero Trust AI Security Copilot for an enterprise Security Operations Center.

Answer the administrator's question using only the telemetry context below.
Do not invent users, incidents, risk scores, or security events.

SYSTEM TELEMETRY:
- Total Users: ${db.users.length}
- High-Risk Users: ${
      topRiskyUsers.join("; ") || "None"
    }
- Open Incidents: ${
      activeIncidents.join("; ") || "None"
    }
- MFA Threshold: ${db.policyConfig.mfaThreshold}
- Approval Threshold: ${db.policyConfig.approvalThreshold}
- Auto-Freeze Threshold: ${db.policyConfig.criticalThreshold}

${focusedUserText}

${focusedIncidentText}

ADMIN QUESTION:
${query}

Provide:
1. A direct answer.
2. Relevant risk signals.
3. Risk implications.
4. Actionable SOC recommendations.

If the requested employee does not exist in the telemetry, clearly state that
the employee was not found and recommend verifying database/seed data.
`;

    if (!ai) {
      return this.generateDeterministicCopilotResponse(
        query,
        {
          ...context,
          targetedUser
        }
      );
    }

    for (const model of GEMINI_MODELS) {
      try {
        const text = await generateWithModel(
          ai,
          model,
          prompt,
          "You are an advanced cybersecurity analyst copilot. Use clean bullet points and bold highlights."
        );

        if (text) {
          return text;
        }
      } catch (error) {
        const status = getErrorStatus(error);

        if (isNonRetryableAuthenticationError(error)) {
          console.error(
            `Gemini authentication/configuration error using ${model}:`,
            error?.message || error
          );

          break;
        }

        console.warn(
          `Gemini Copilot unavailable using ${model} (${status || "unknown"}). Trying next model.`
        );
      }
    }

    return this.generateDeterministicCopilotResponse(
      query,
      {
        ...context,
        targetedUser
      }
    );
  }

  generateDeterministicFallbackExplanation(
    incident,
    user
  ) {
    return `
Security anomaly detected for ${
      user?.name || "Unknown User"
    } (${user?.employeeId || "Unknown Employee"}).

Event: ${incident?.eventType || "Unknown"}
Risk Score: ${incident?.riskScore ?? 0}/100
Contributing Signals: ${
      Array.isArray(incident?.contributingFactors)
        ? incident.contributingFactors.join(", ")
        : "Not available"
    }
Recommended Policy Action: ${
      incident?.recommendedAction || "Review required"
    }
`.trim();
  }

  generateDeterministicCopilotResponse(
    query,
    context = {}
  ) {
    const user =
      context?.targetedUser ||
      (context?.userId
        ? db.getUserById(context.userId)
        : null);

    if (user) {
      return `
**Investigation Summary for ${user.name} (${user.employeeId})**

- **Department:** ${user.department}
- **Role:** ${user.role}
- **Current Risk Score:** ${user.currentRiskScore ?? 0}/100
- **Risk Level:** ${user.currentRiskLevel || "UNKNOWN"}
- **Trust Score:** ${user.currentTrustScore ?? 0}/100
- **Account Status:** ${user.status}
- **Behavioral Baseline:** ${
        user.baseline?.normalWorkHours?.start ?? 8
      }:00-${
        user.baseline?.normalWorkHours?.end ?? 19
      }

**SOC Recommendation:** ${
        Number(user.currentRiskScore || 0) >= 75
          ? "Review the account immediately and consider access restriction."
          : Number(user.currentRiskScore || 0) >= 60
          ? "Enforce step-up MFA and monitor recent telemetry."
          : "No elevated risk is currently recorded for this user."
      }
`.trim();
    }

    const openCount = db.incidents.filter(
      (incident) =>
        incident.status === "OPEN" ||
        incident.status === "NEW" ||
        incident.status === "INVESTIGATING"
    ).length;

    const highRiskCount = db.users.filter(
      (user) =>
        Number(user.currentRiskScore || 0) >= 60
    ).length;

    return `
**SOC Telemetry Analysis**

- **Active Threats:** Found **${highRiskCount}** high-risk users and **${openCount}** open incidents requiring investigation.
- **Top Priority Alert:** ${
      db.incidents[0]
        ? `Incident ${db.incidents[0].id} with risk ${
            db.incidents[0].riskScore ?? 0
          }/100.`
        : "No critical incidents currently active."
    }
- **Zero Trust Status:** Continuous behavioral verification is active across all endpoints.
`.trim();
  }
}

const geminiService = new GeminiSecurityService();

export {
  GeminiSecurityService,
  geminiService
};