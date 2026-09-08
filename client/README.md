# AI Zero Trust Insider Threat Detection & UEBA System

An enterprise-grade Zero Trust Architecture and User & Entity Behavior Analytics (UEBA) platform with AI/ML anomaly detection, adaptive risk scoring, dynamic trust score evolution, explainable AI, automated policy enforcement, and persistent PostgreSQL storage powered by Prisma ORM.

---

## 🏗️ Architecture & Storage Layer

```
┌────────────────────────────────────────────────────────┐
│               Enterprise React Frontend                │
│    (Chakra Petch / JetBrains Mono / Tailwind CSS)      │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON API / SSE
┌───────────────────────────▼────────────────────────────┐
│                  Express TypeScript API                │
│ (Policy Engine, Risk Engine, Trust Engine, ML Engine)  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Repository Layer                    │
│   (User, Device, Resource, Incident, Activity, etc.)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                   Prisma ORM Client                    │
│                 (@prisma/client 6.4.1)                 │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  PostgreSQL Database                   │
│       (Relational Schema with 14 Domain Models)        │
└────────────────────────────────────────────────────────┘
```

---

## 📊 Relational Database Domain Models (Prisma Schema)

The database schema defined in `prisma/schema.prisma` includes full relational modeling for:

1. **User** (`users`): Employee ID, name, email, department, role, account status (`ACTIVE`, `SUSPENDED`, `FROZEN`, `RESTRICTED`), risk score, trust score, risk level (`LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`, `CRITICAL`), baseline relations, devices, and incidents.
2. **Role** (`roles`): RBAC role definitions (`EMPLOYEE`, `MANAGER`, `SECURITY_ADMIN`, `SYSTEM_ADMIN`).
3. **Department** (`departments`): Departmental division models (`HR`, `FINANCE`, `ENGINEERING`, `SALES`, `LEGAL`, `EXECUTIVE`, `SECURITY`, `IT`).
4. **Device** (`devices`): Hardware identifiers, operating systems, browsers, IP addresses, trust score (0-100), verification flags, and certificate statuses (`TRUSTED`, `UNTRUSTED`, `SUSPICIOUS`, `REVOKED`, `QUARANTINED`).
5. **Resource** (`resources`): Enterprise resources with sensitivity classifications (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `HIGHLY_SENSITIVE`, `RESTRICTED`), required roles, and department ownership.
6. **ActivityEvent** (`activity_events`): Security telemetry events (`LOGIN`, `FILE_ACCESS`, `FILE_DOWNLOAD`, `RESOURCE_ACCESS`, `API_CALL`, `PRIVILEGE_CHANGE`, `CONFIG_CHANGE`, `OFF_HOURS_ACTIVITY`, `ANOMALOUS_TRANSFER`), anomaly scores, and feature vectors.
7. **BehaviorProfile** (`behavior_profiles`): UEBA baseline models (normal working hours, average daily downloads, allowable departments, typical IP subnets/locations).
8. **RiskScore** (`risk_scores`): Risk evolution audit history with factor attributions.
9. **TrustHistory** (`trust_histories`): Dynamic trust scoring progression points with decay/recovery triggers.
10. **Incident** (`incidents`): SOC security incident management (`NEW`, `INVESTIGATING`, `CONTAINED`, `RESOLVED`, `FALSE_POSITIVE`), MITRE ATT&CK mapping, and Gemini AI explainable summaries.
11. **AccessRequest** (`access_requests`): Policy decision point (PDP) step-up approval workflow (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`).
12. **AuditLog** (`audit_logs`): Immutable audit trail for compliance and forensic analysis.
13. **ZeroTrustPolicy** (`zero_trust_policies`): Continuous policy engine configuration (risk thresholds, MFA triggers, privilege escalation multipliers, and weights).
14. **ModelVersion** (`model_versions`): CERT r4.2 ML benchmark registration and performance metrics (ROC-AUC, Precision, Recall, F1).
15. **MlPrediction** (`ml_predictions`): Feature vector persistence and isolation forest anomaly inference logs.
16. **UserSession** & **MfaSession**: FIDO2/WebAuthn and TOTP challenge session tracking.

---

## 🚀 Setup & Execution Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Apply PostgreSQL Database Migrations
```bash
npx prisma migrate dev --name init
# Or in CI/Production environments:
npx prisma migrate deploy
```

### 4. Seed Database with Synthetic Personas & Baseline Data
```bash
npm run seed
# Or:
npx tsx prisma/seed.js
```

### 5. Start Development Server (Frontend + Backend)
```bash
npm run dev
```

### 6. Production Build & Server Start
```bash
npm run build
npm start
```

---

## 🧪 Database & API Endpoints

### System & Persistence
- `GET /api/system/status` - Returns Prisma ORM and PostgreSQL connection status and entity counts.
- `POST /api/system/db-sync` - Forces on-demand synchronization with PostgreSQL database.

### Users & UEBA
- `GET /api/users` - List all enterprise users with active risk & trust metrics.
- `GET /api/users/:id` - Detailed user profile including devices, recent activity, baseline, incidents, and trust timeline.
- `POST /api/users/:id/freeze` - Instantly lock down and freeze a user account.
- `POST /api/users/:id/unfreeze` - Restore account access and recalibrate risk baseline.
- `POST /api/users/:id/reset-risk` - Reset user anomaly score and recalibrate baseline.

### Devices & Zero Trust Posture
- `GET /api/devices` - List all registered corporate & unmanaged devices.
- `PATCH /api/devices/:id/trust` - Modify device trust level and trustworthiness score.
- `POST /api/devices/:id/revoke` - Revoke device certificate and deny all further network requests.

### Simulation & Machine Learning
- `POST /api/activity/simulate` - Run custom behavioral access simulation against the policy engine.
- `POST /api/simulation/scenario/:scenarioId` - Execute preset attack and baseline scenarios (Scenarios 1-4).
- `GET /api/ml/metrics` - Retrieve ML model performance metrics (ROC-AUC 0.978, CERT r4.2 validation).
- `POST /api/ml/predict` - Run 12-dimensional feature extraction and anomaly inference.

### Zero Trust PDP & Policy Engine
- `GET /api/policies` - Retrieve active Zero Trust policy thresholds.
- `PATCH /api/policies` - Update risk evaluation weights and enforcement thresholds.
- `POST /api/resources/test-access` - Evaluate real-time Policy Decision Point (PDP) access request.

### SOC Incidents & Investigations
- `GET /api/incidents` - View all detected insider threat incidents.
- `GET /api/incidents/:id` - Get incident forensic details and MITRE ATT&CK mapping.
- `POST /api/incidents/:id/resolve` - Close an incident with investigator notes.
- `POST /api/incidents/:id/ai-explain` - Request Gemini AI explainable incident narrative.

---

## 🔒 Security & Resilience

- **Dual-Mode Graceful Fallback**: The server boots instantly in all environments; if `DATABASE_URL` is set, all operations persist directly to PostgreSQL; if the external database is undergoing maintenance, in-memory caching ensures uninterrupted 24/7 SOC uptime.
- **Repository Pattern Isolation**: Controllers do not interact with raw SQL; all domain mutations pass through strongly-typed TypeScript repositories.
- **Explainable AI (XAI)**: All automated risk scores and containment decisions provide human-readable factor attributions.
