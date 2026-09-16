import React, { useEffect, useState } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  Activity,
  KeyRound
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const SimulatorPage = ({
  users,
  resources,
  devices,
  onRefreshData,
  onOpenCopilot
}) => {
  const { isDark } = useTheme();

  const propUsers = Array.isArray(users) ? users : [];
  const propResources = Array.isArray(resources) ? resources : [];
  const propDevices = Array.isArray(devices) ? devices : [];

  const [loadedUsers, setLoadedUsers] = useState([]);
  const [loadedResources, setLoadedResources] = useState([]);
  const [loadedDevices, setLoadedDevices] = useState([]);

  const safeUsers = propUsers.length ? propUsers : loadedUsers;
  const safeResources = propResources.length ? propResources : loadedResources;
  const safeDevices = propDevices.length ? propDevices : loadedDevices;

  const simulatorDevices = safeDevices.length
    ? safeDevices
    : [{
        id: '',
        deviceId: '',
        deviceName: 'Simulation Managed Endpoint',
        isTrusted: true,
        trustScore: 92,
        status: 'TRUSTED',
        ipAddress: '10.240.14.92',
        location: 'Corporate HQ'
      }];

  const fallbackResources = [
    { id: 'res-hr-01', name: 'Workday HR Employee Portal', department: 'HR', sensitivity: 'INTERNAL' },
    { id: 'res-fin-01', name: 'Executive Payroll & Compensation Master', department: 'Finance', sensitivity: 'HIGHLY_SENSITIVE' },
    { id: 'res-eng-01', name: 'GitHub Enterprise Core Monorepo', department: 'Engineering', sensitivity: 'HIGHLY_SENSITIVE' },
    { id: 'res-eng-02', name: 'AWS Production Kubernetes Infrastructure', department: 'Engineering', sensitivity: 'HIGHLY_SENSITIVE' },
    { id: 'res-sec-01', name: 'CrowdStrike Falcon & SOC SIEM Management', department: 'Security', sensitivity: 'HIGHLY_SENSITIVE' },
    { id: 'res-it-01', name: 'Active Directory / Okta Identity Management', department: 'IT', sensitivity: 'HIGHLY_SENSITIVE' },
    { id: 'res-sales-01', name: 'Salesforce Enterprise Customer CRM', department: 'Sales', sensitivity: 'INTERNAL' },
    { id: 'res-mkt-01', name: 'Figma Brand Assets & Public Marketing CMS', department: 'Marketing', sensitivity: 'PUBLIC' }
  ];

  const displayResources = safeResources.length ? safeResources : fallbackResources;

  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [runningPreset, setRunningPreset] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [executionError, setExecutionError] = useState('');

  const [selectedUserId, setSelectedUserId] = useState(
    safeUsers[2]?.id || safeUsers[0]?.id || ''
  );

  const [selectedResourceId, setSelectedResourceId] = useState('');

  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const [downloadMB, setDownloadMB] = useState(25);
  const [isOffHours, setIsOffHours] = useState(false);
  const [failedLogins, setFailedLogins] = useState(0);
  const [isPrivEscalation, setIsPrivEscalation] = useState(false);
  const [isUsbTransfer, setIsUsbTransfer] = useState(false);
  const [evaluatingCustom, setEvaluatingCustom] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSimulatorData = async () => {
      const parseResponse = async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();

        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.data)) return payload.data;
        if (Array.isArray(payload.users)) return payload.users;
        if (Array.isArray(payload.resources)) return payload.resources;
        if (Array.isArray(payload.devices)) return payload.devices;
        return [];
      };

      const requests = [
        propUsers.length ? null : fetch('/api/users'),
        propResources.length ? null : fetch('/api/resources'),
        propDevices.length ? null : fetch('/api/devices')
      ];

      const results = await Promise.allSettled(requests.map(async (request) => {
        if (!request) return [];
        return parseResponse(await request);
      }));

      if (cancelled) return;

      if (!propUsers.length && results[0]?.status === 'fulfilled') {
        setLoadedUsers(results[0].value);
      }

      if (!propResources.length && results[1]?.status === 'fulfilled') {
        setLoadedResources(results[1].value);
      }

      if (!propDevices.length && results[2]?.status === 'fulfilled') {
        setLoadedDevices(results[2].value);
      }
    };

    loadSimulatorData().catch((error) => {
      if (!cancelled) {
        console.error('Failed to load simulator data:', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [propUsers.length, propResources.length, propDevices.length]);

  const selectedUser =
    safeUsers.find((u) => u.id === selectedUserId) ||
    safeUsers[0];

  const selectedResource =
    displayResources.find((r) => r.id === selectedResourceId) ||
    displayResources[0];

  const selectedDevice =
    simulatorDevices.find((d) => d.id === selectedDeviceId) ||
    simulatorDevices[0];

  useEffect(() => {
    if (!safeUsers.length) return;

    const exists = safeUsers.some((user) => user.id === selectedUserId);

    if (!exists) {
      setSelectedUserId(
        safeUsers[2]?.id || safeUsers[0]?.id || ''
      );
    }
  }, [safeUsers, selectedUserId]);

  useEffect(() => {
    if (!displayResources.length) return;

    const exists = displayResources.some(
      (resource) => resource.id === selectedResourceId
    );

    if (!exists) {
      setSelectedResourceId(
        displayResources[2]?.id || displayResources[0]?.id || ''
      );
    }
  }, [safeResources, selectedResourceId]);

  useEffect(() => {
    if (!simulatorDevices.length) return;

    const exists = simulatorDevices.some(
      (device) => device.id === selectedDeviceId
    );

    if (!exists) {
      setSelectedDeviceId(simulatorDevices[0]?.id || '');
    }
  }, [safeDevices, selectedDeviceId]);

  const getRiskLevel = (riskScore) => {
    const risk = Number(riskScore) || 0;

    if (risk >= 90) {
      return 'CRITICAL';
    }

    if (risk >= 60) {
      return 'HIGH';
    }

    if (risk >= 40) {
      return 'MEDIUM';
    }

    return 'LOW';
  };

  const buildEvaluation = (data, user) => {
    const ml = data?.ml || {};

    const riskScore =
      Number(ml.risk_score) || 0;

    return {
      userId: user?.id,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      trustScore:
        Number(ml.trust_score) || 100,
      contextualRiskScore:
        Number(ml.contextual_risk_score) || 0,
      contributingFactors:
        Array.isArray(ml.xai_reasons)
          ? ml.xai_reasons
          : [],
      recommendedAction:
        ml.policy_action || 'ALLOW',
      policyEnforced:
        ml.policy_action || 'ALLOW',
      mlAnomalyScore:
        Number(ml.threat_probability) || 0,
      explanationText:
        ml.policy_reason ||
        'Adaptive Zero Trust evaluation completed.',
      timestamp:
        new Date().toISOString()
    };
  };

  const handleSuccessfulResult = (
    data,
    scenarioName,
    mappedUser
  ) => {
    setExecutionError('');

    const user =
      mappedUser ||
      safeUsers.find(
        (u) => u.id === data?.event?.userId
      ) ||
      selectedUser ||
      safeUsers[0];

    const evaluation =
      buildEvaluation(data, user);

    const event = {
      ...(data?.event || {}),
      userId: user?.id,
      userName: user?.name,
      userEmail: user?.email,
      userDepartment: user?.department,
      riskContribution:
        Number(data?.ml?.risk_score) || 0,
      mlAnomalyScore:
        Number(data?.ml?.threat_probability) || 0,
      isAnomalous:
        (Number(data?.ml?.risk_score) || 0) >= 40
    };

    setLastResult({
      scenarioName,
      event,
      evaluation,
      decision: data?.decision,
      user
    });

    if (
      data?.ml?.policy_action === 'MFA' ||
      data?.decision?.requiresMfa
    ) {
      setMfaModalOpen(true);
    }
  };

  const runPresetScenario = async (
    scenarioId,
    name
  ) => {
    try {
      setRunningPreset(true);
      setActiveScenarioId(scenarioId);

      const res = await fetch(
        `/api/simulation/scenario/${scenarioId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: selectedUser?.id,
            resourceId: selectedResource?.id,
            deviceId: selectedDeviceId || undefined
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error?.message ||
          data?.error ||
          `Scenario execution failed with status ${res.status}`
        );
      }

      if (!data.success) {
        throw new Error(
          data?.error?.message ||
          'Scenario execution failed.'
        );
      }

      handleSuccessfulResult(
        data,
        name,
        data.user
          ? safeUsers.find(
              (u) => u.id === data.user.id
            ) || data.user
          : selectedUser
      );
    } catch (err) {
      const message =
        err?.message ||
        'Unable to execute the selected scenario.';

      setExecutionError(message);

      console.error(
        'Failed to execute preset scenario:',
        err
      );
    } finally {
      setRunningPreset(false);
      setActiveScenarioId(null);
    }
  };

  const runTelemetryIngest = async (
    payload,
    name
  ) => {
    try {
      setRunningPreset(true);
      setActiveScenarioId(payload.eventId);

      const res = await fetch(
        '/api/telemetry/ingest',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error?.message ||
          'Telemetry ingestion failed.'
        );
      }

      if (!data.success) {
        throw new Error(
          data?.error?.message ||
          'Telemetry ingestion failed.'
        );
      }

      const mappedUser =
        safeUsers.find(
          (u) => u.id === data?.event?.userId
        ) ||
        selectedUser ||
        safeUsers[0];

      handleSuccessfulResult(
        data,
        name,
        mappedUser
      );
    } catch (err) {
      const message =
        err?.message ||
        'Unable to ingest telemetry.';

      setExecutionError(message);

      console.error(
        'Failed to ingest telemetry:',
        err
      );
    } finally {
      setRunningPreset(false);
      setActiveScenarioId(null);
    }
  };

  const runCustomSimulation = async () => {
    try {
      setEvaluatingCustom(true);

      const eventType =
        isPrivEscalation
          ? 'PRIVILEGE_ELEVATION'
          : isUsbTransfer
            ? 'USB_ACTIVITY'
            : downloadMB > 100
              ? 'FILE_DOWNLOAD'
              : 'FILE_ACCESS';

      const telemetryPayload = {
        eventId: `custom-${Date.now()}`,
        userId: selectedUserId,
        resourceId: selectedResourceId || undefined,
        resourceName: selectedResource?.name,
        resourceDepartment: selectedResource?.department,
        resourceSensitivity: selectedResource?.sensitivity,
        deviceId: selectedDeviceId || undefined,
        deviceName: selectedDevice?.deviceName || 'Simulation Managed Endpoint',
        deviceTrustScore: selectedDevice?.trustScore ?? 92,
        isUnknownDevice: selectedDevice ? !selectedDevice.isTrusted : false,
        ipAddress: selectedDevice?.ipAddress || '10.240.14.92',
        location: selectedDevice?.location || 'Corporate HQ',
        eventType,
        severity: isPrivEscalation || isUsbTransfer || downloadMB > 100 ? 'HIGH' : 'LOW',
        isOffHours,
        isUsbTransfer,
        isPrivilegeEscalation: isPrivEscalation,
        failed_login_attempts: failedLogins,
        bytes_sent_kb: downloadMB * 1024,
        bytes_received_kb: 0,
        destination_site: isUsbTransfer ? '/media/usb_drive' : downloadMB > 100 ? 'external-storage.example' : 'internal.local',
        application_shell_cmd: isPrivEscalation ? 'sudo privilege escalation' : isUsbTransfer ? 'copy files to removable media' : 'standard-agent',
        metadata: {
          downloadSizeMB: downloadMB,
          fileSizeMB: downloadMB,
          fileCount: Math.max(1, Math.round(downloadMB / 2)),
          failedLoginAttempts: failedLogins,
          crossDepartment: Boolean(
            selectedResource &&
            selectedUser &&
            !(selectedUser.baseline?.allowedDepartments || []).includes(selectedResource.department)
          ),
          privilegeEscalation: isPrivEscalation,
          usbTransfer: isUsbTransfer,
          offHours: isOffHours
        }
      };

      const res = await fetch(
        '/api/telemetry/ingest',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(telemetryPayload)
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error?.message ||
          'Custom simulation failed.'
        );
      }

      if (!data.success) {
        throw new Error(
          data?.error?.message ||
          'Custom simulation failed.'
        );
      }

      handleSuccessfulResult(
        data,
        'Custom Behavioral Synthesis',
        safeUsers.find(
          (u) => u.id === data?.event?.userId
        ) || selectedUser
      );
    } catch (err) {
      const message =
        err?.message ||
        'Unable to run custom simulation.';

      setExecutionError(message);

      console.error(
        'Failed to run custom simulation:',
        err
      );
    } finally {
      setEvaluatingCustom(false);
    }
  };

  const benchmarkUserId =
    selectedUser?.id ||
    safeUsers[0]?.id ||
    'user-001';

  return (
    <div className="space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <section
        id="simulator-hero"
        className={`border rounded-xl p-6 sm:p-8 relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#141414] border-[#2A2A2A] text-[#F4F4F6]'
            : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#111317] shadow-sm'
        }`}
      >
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

          <div
            className={`shrink-0 p-4 rounded-lg border text-right font-mono text-xs space-y-1 ${
              isDark
                ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                : 'bg-[#F7F4EC] border-[#E5E5E5]'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              ENGINE STATUS
            </div>

            <div className="text-sm font-semibold text-[#C6A14A] flex items-center justify-end gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>ONLINE</span>
            </div>

            <div className="text-[11px] text-gray-400">
              Multi-Source UEBA RF
            </div>
          </div>
        </div>
      </section>

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
              Test direct telemetry ingestion through normalization, multi-source UEBA inference, adaptive risk scoring, XAI, dynamic trust, Zero Trust policy evaluation, and SSE broadcasting.
            </p>
          </div>

          <span className="text-xs font-mono text-[#C6A14A] border border-[#C6A14A]/30 px-3 py-1.5 rounded-sm bg-[#C6A14A]/5 whitespace-nowrap self-start sm:self-center font-medium">
            6 Production Tests
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <button
            onClick={() =>
              runTelemetryIngest(
                {
                  eventId: `tel-norm-${Date.now()}`,
                  userId: benchmarkUserId,
                  timestamp: new Date().toISOString(),
                  user_department:
                    selectedUser?.department ||
                    'Engineering',
                  eventType: 'LOGIN',
                  destination_site:
                    'github.com',
                  bytes_sent_kb: 45,
                  bytes_received_kb: 120,
                  is_off_hours: 0,
                  usb_bluetooth_usage: 0,
                  failed_login_attempts: 0,
                  application_shell_cmd:
                    'git pull'
                },
                '1. Normal Office Login'
              )
            }
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
                Office hours development activity
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
              Normal baseline
            </div>
          </button>

          <button
            onClick={() =>
              runTelemetryIngest(
                {
                  eventId: `tel-offhours-${Date.now()}`,
                  userId: benchmarkUserId,
                  timestamp: new Date().toISOString(),
                  user_department:
                    selectedUser?.department ||
                    'Finance',
                  eventType: 'LOGIN',
                  destination_site:
                    'sso.enterprise.corp',
                  failed_login_attempts: 4,
                  is_off_hours: 1,
                  bytes_sent_kb: 2,
                  bytes_received_kb: 10
                },
                '2. Off-Hours Failed Logins'
              )
            }
            disabled={runningPreset}
            className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
              isDark
                ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-amber-500/60 hover:bg-[#1A1A1A]'
                : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-amber-500/60 hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-amber-500/30 text-amber-500 font-bold block w-fit mb-2.5 bg-amber-500/10">
                STEP-UP
              </span>

              <div className="font-semibold text-xs text-current group-hover:text-amber-500 transition-colors">
                2. Off-Hours Login
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                Four failed authentication attempts
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
              Off-hours + failed auth
            </div>
          </button>

          <button
            onClick={() =>
              runTelemetryIngest(
                {
                  eventId: `tel-exfil-${Date.now()}`,
                  userId: benchmarkUserId,
                  timestamp: new Date().toISOString(),
                  user_department:
                    selectedUser?.department ||
                    'Engineering',
                  eventType: 'FILE_DOWNLOAD',
                  destination_site:
                    'mega.nz',
                  bytes_sent_kb: 850000,
                  bytes_received_kb: 1200,
                  is_off_hours: 1,
                  usb_bluetooth_usage: 0,
                  failed_login_attempts: 0,
                  application_shell_cmd:
                    'curl file upload'
                },
                '3. Large File Exfiltration'
              )
            }
            disabled={runningPreset}
            className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
              isDark
                ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-[#C6A14A] hover:bg-[#1A1A1A]'
                : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-[#C6A14A] hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-[#C6A14A]/40 text-[#C6A14A] font-bold block w-fit mb-2.5 bg-[#C6A14A]/10">
                HIGH RISK
              </span>

              <div className="font-semibold text-xs text-current group-hover:text-[#C6A14A] transition-colors">
                3. Mass Exfil
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                850 MB external data transfer
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
              Large egress volume
            </div>
          </button>

          <button
            onClick={() =>
              runTelemetryIngest(
                {
                  eventId: `tel-usb-${Date.now()}`,
                  userId: benchmarkUserId,
                  timestamp: new Date().toISOString(),
                  user_department:
                    selectedUser?.department ||
                    'Engineering',
                  eventType: 'USB_ACTIVITY',
                  destination_site:
                    '/media/usb_drive',
                  bytes_sent_kb: 350000,
                  bytes_received_kb: 50,
                  is_off_hours: 0,
                  usb_bluetooth_usage: 1,
                  failed_login_attempts: 0,
                  application_shell_cmd:
                    'copy files to removable media'
                },
                '4. USB Removable Media Transfer'
              )
            }
            disabled={runningPreset}
            className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
              isDark
                ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-red-500/60 hover:bg-[#1A1A1A]'
                : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-red-500/60 hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-red-500/30 text-red-500 font-bold block w-fit mb-2.5 bg-red-500/10">
                HIGH RISK
              </span>

              <div className="font-semibold text-xs text-current group-hover:text-red-500 transition-colors">
                4. USB Transfer
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                Physical removable-media transfer
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
              USB + high transfer
            </div>
          </button>

          <button
            onClick={() =>
              runTelemetryIngest(
                {
                  eventId: `tel-privesc-${Date.now()}`,
                  userId: benchmarkUserId,
                  timestamp: new Date().toISOString(),
                  user_department:
                    selectedUser?.department ||
                    'IT',
                  eventType:
                    'PRIVILEGE_ELEVATION',
                  destination_site:
                    'localhost',
                  bytes_sent_kb: 5,
                  bytes_received_kb: 15,
                  is_off_hours: 0,
                  usb_bluetooth_usage: 0,
                  failed_login_attempts: 0,
                  application_shell_cmd:
                    'sudo privilege escalation'
                },
                '5. Privilege Escalation Attempt'
              )
            }
            disabled={runningPreset}
            className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
              isDark
                ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-[#C6A14A] hover:bg-[#1A1A1A]'
                : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-[#C6A14A] hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-amber-500/30 text-amber-500 font-bold block w-fit mb-2.5 bg-amber-500/10">
                ELEVATED
              </span>

              <div className="font-semibold text-xs text-current group-hover:text-amber-500 transition-colors">
                5. Privilege Esc
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                Unauthorized privilege escalation
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
              Privilege elevation
            </div>
          </button>

          <button
            onClick={() =>
              runTelemetryIngest(
                {
                  eventId: `tel-c2-${Date.now()}`,
                  userId: benchmarkUserId,
                  timestamp: new Date().toISOString(),
                  user_department:
                    selectedUser?.department ||
                    'Engineering',
                  eventType:
                    'SHELL_EXECUTION',
                  destination_site:
                    'external-c2-endpoint',
                  bytes_sent_kb: 4500,
                  bytes_received_kb: 800,
                  is_off_hours: 1,
                  usb_bluetooth_usage: 0,
                  failed_login_attempts: 2,
                  application_shell_cmd:
                    'automated C2 beacon process'
                },
                '6. Shell / C2 Beaconing'
              )
            }
            disabled={runningPreset}
            className={`p-4 rounded-lg border text-left transition-all duration-200 group disabled:opacity-50 flex flex-col justify-between cursor-pointer ${
              isDark
                ? 'bg-[#0E0E0E] border-[#2A2A2A] hover:border-red-500/60 hover:bg-[#1A1A1A]'
                : 'bg-[#F9F9F7] border-[#E5E5E5] hover:border-red-500/60 hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs'
            }`}
          >
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs border border-red-500/30 text-red-500 font-bold block w-fit mb-2.5 bg-red-500/10">
                CRITICAL
              </span>

              <div className="font-semibold text-xs text-current group-hover:text-red-500 transition-colors">
                6. Shell / C2
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                Off-hours shell and external beaconing
              </div>
            </div>

            <div className="mt-4 text-[10px] font-mono text-[#C6A14A] pt-2.5 border-t border-gray-200 dark:border-[#2A2A2A]">
              C2 + off-hours + auth anomaly
            </div>
          </button>
        </div>
      </section>

      <section
        id="mitre-benchmark-scenarios"
        className="space-y-4"
      >
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
            Target User: {selectedUser?.name || 'Active User'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40'
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Approved corporate endpoint during regular working hours accessing a standard enterprise resource.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Device:{' '}
                  <span className="font-semibold text-current">
                    Trusted Corporate Endpoint
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-emerald-500 font-bold">
                    Low
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-1-normal',
                  'Scenario 1: Baseline Normal Access'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-1-normal'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 1'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-amber-500/40'
                : 'bg-white border-[#E5E5E5] hover:border-amber-500/40 shadow-xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold text-amber-500 px-2 py-0.5 rounded-xs border border-amber-500/30 bg-amber-500/10">
                  SCENARIO 2
                </span>

                <span className="text-[11px] font-mono text-amber-500 font-semibold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  MFA
                </span>
              </div>

              <h3 className="font-serif-display text-lg font-medium text-current mb-1.5">
                Suspicious Off-Hours Login
              </h3>

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Unregistered endpoint login during unusual hours with repeated failed authentication attempts.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Device:{' '}
                  <span className="font-semibold text-amber-500">
                    Unknown VPN Endpoint
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-amber-500 font-bold">
                    Elevated
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-2-suspicious-login',
                  'Scenario 2: Suspicious Off-Hours Login'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-2-suspicious-login'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 2'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-red-500/40'
                : 'bg-white border-[#E5E5E5] hover:border-red-500/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Large-scale access to sensitive data outside the user's normal departmental access pattern.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Resource:{' '}
                  <span className="font-semibold text-red-500">
                    Sensitive Enterprise Data
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-red-500 font-bold">
                    High
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-3-insider-exfiltration',
                  'Scenario 3: Insider Threat Cross-Dept Exfiltration'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-3-insider-exfiltration'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 3'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-red-500/40'
                : 'bg-white border-[#E5E5E5] hover:border-red-500/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Repeated failed authentication, privilege escalation, removable-media activity, and large data transfer.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Threats:{' '}
                  <span className="font-semibold text-red-500">
                    Priv-Esc + USB + Failed Auth
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-red-500 font-bold">
                    Critical
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-4-critical-compromise',
                  'Scenario 4: Critical Account Compromise & Auto-Freeze'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white border border-red-600 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-4-critical-compromise'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 4'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40'
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Unauthorized privilege elevation attempt through a command-line escalation pattern.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Technique:{' '}
                  <span className="font-semibold text-[#C6A14A]">
                    Privilege Elevation
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-red-500 font-bold">
                    High
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-5-privilege-escalation',
                  'Scenario 5: Privilege Escalation Attack'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-5-privilege-escalation'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 5'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40'
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Large-scale transfer of sensitive enterprise data to an unapproved removable storage device.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Media:{' '}
                  <span className="font-semibold text-[#C6A14A]">
                    Removable Storage
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-amber-500 font-bold">
                    High
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-6-usb-exfiltration',
                  'Scenario 6: USB Storage Physical Exfiltration'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-6-usb-exfiltration'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 6'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-red-500/40'
                : 'bg-white border-[#E5E5E5] hover:border-red-500/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Off-hours high-volume transfer of thousands of files toward an unauthorized external destination.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Volume:{' '}
                  <span className="font-semibold text-red-500">
                    2,850 MB
                  </span>
                </div>

                <div>
                  Pattern:{' '}
                  <span className="text-red-500 font-bold">
                    Mass Exfiltration
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-7-large-scale-exfiltration',
                  'Scenario 7: Large-Scale High-Velocity Exfiltration'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-red-600 hover:bg-red-700 text-white border border-red-600 text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-7-large-scale-exfiltration'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 7'}
              </span>
            </button>
          </div>

          <div
            className={`border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A] hover:border-[#C6A14A]/40'
                : 'bg-white border-[#E5E5E5] hover:border-[#C6A14A]/40 shadow-xs'
            }`}
          >
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

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Failed authentication followed by recurring automated communication with an external endpoint.
              </p>

              <div
                className={`text-[11px] font-mono space-y-1 mb-4 p-2.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] text-gray-600'
                }`}
              >
                <div>
                  Pattern:{' '}
                  <span className="font-semibold text-[#C6A14A]">
                    C2 + Brute Force
                  </span>
                </div>

                <div>
                  Risk Expected:{' '}
                  <span className="text-red-500 font-bold">
                    Critical
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                runPresetScenario(
                  'scenario-8-compromised-endpoint',
                  'Scenario 8: Compromised Endpoint & C2 Beaconing'
                )
              }
              disabled={runningPreset}
              className="w-full py-2.5 px-3 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black border border-[#C6A14A] text-xs font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {activeScenarioId === 'scenario-8-compromised-endpoint'
                  ? 'RUNNING...'
                  : 'SIMULATE SCENARIO 8'}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section
        id="custom-behavioral-synthesizer-section"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        <div
          className={`lg:col-span-5 border rounded-xl p-6 relative transition-colors ${
            isDark
              ? 'bg-[#141414] border-[#2A2A2A] text-[#F4F4F6]'
              : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#111317] shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-[#2A2A2A]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-md bg-[#C6A14A]/10 text-[#C6A14A] border border-[#C6A14A]/20">
                <Sliders className="w-4 h-4" />
              </div>

              <div>
                <h3 className="font-serif-display text-xl font-normal text-current">
                  Custom Behavioral Synthesizer
                </h3>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Configure parameters for ad-hoc risk evaluation
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono text-[#C6A14A] border border-[#C6A14A]/40 px-2 py-0.5 rounded-xs bg-[#C6A14A]/10 font-bold">
              UEBA LAB
            </span>
          </div>

          <div className="space-y-4 pt-5 text-xs">
            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-mono mb-1.5 text-[11px] uppercase tracking-wider font-medium">
                Target Subject
              </label>

              <select
                value={selectedUserId}
                onChange={(e) =>
                  setSelectedUserId(e.target.value)
                }
                disabled={!safeUsers.length}
                className={`w-full border rounded-md p-3 text-xs text-current outline-none transition-colors font-mono cursor-pointer ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] focus:border-[#C6A14A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] focus:border-[#C6A14A]'
                }`}
              >
                {safeUsers.map((u) => (
                  <option
                    key={u.id}
                    value={u.id}
                  >
                    {u.name} ({u.employeeId} - {u.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-mono mb-1.5 text-[11px] uppercase tracking-wider font-medium">
                Target Enterprise Resource
              </label>

              <select
                value={selectedResourceId}
                onChange={(e) =>
                  setSelectedResourceId(e.target.value)
                }
                disabled={!displayResources.length}
                className={`w-full border rounded-md p-3 text-xs text-current outline-none transition-colors font-mono cursor-pointer ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] focus:border-[#C6A14A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] focus:border-[#C6A14A]'
                }`}
              >
                {displayResources.map((r) => (
                  <option
                    key={r.id}
                    value={r.id}
                  >
                    [{r.department}] {r.name} ({r.sensitivity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-600 dark:text-gray-400 font-mono mb-1.5 text-[11px] uppercase tracking-wider font-medium">
                Access Endpoint Device
              </label>

              <select
                value={selectedDeviceId}
                onChange={(e) =>
                  setSelectedDeviceId(e.target.value)
                }
                disabled={!simulatorDevices.length}
                className={`w-full border rounded-md p-3 text-xs text-current outline-none transition-colors font-mono cursor-pointer ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A] focus:border-[#C6A14A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5] focus:border-[#C6A14A]'
                }`}
              >
                {simulatorDevices.map((d) => (
                  <option
                    key={d.id}
                    value={d.id}
                  >
                    {d.deviceName} (
                    {d.isTrusted
                      ? 'Trusted'
                      : 'Untrusted'}{' '}
                    - Trust {d.trustScore}%)
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`border rounded-lg p-3.5 space-y-2 ${
                isDark
                  ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                  : 'bg-[#F9F9F7] border-[#E5E5E5]'
              }`}
            >
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-gray-500 dark:text-gray-400 tracking-wider">
                  DATA DOWNLOAD VOLUME:
                </span>

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
                onChange={(e) =>
                  setDownloadMB(
                    Number(e.target.value)
                  )
                }
                className="w-full accent-[#C6A14A] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>0 MB</span>
                <span>750 MB</span>
                <span>1,500 MB</span>
              </div>
            </div>

            <div
              className={`border rounded-lg p-3.5 space-y-2 ${
                isDark
                  ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                  : 'bg-[#F9F9F7] border-[#E5E5E5]'
              }`}
            >
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span className="text-gray-500 dark:text-gray-400 tracking-wider">
                  FAILED AUTHENTICATIONS:
                </span>

                <span
                  className={`font-bold text-xs px-2 py-0.5 rounded border ${
                    failedLogins > 0
                      ? 'text-[#C6A14A] bg-[#C6A14A]/10 border-[#C6A14A]/30'
                      : 'text-gray-400 bg-gray-500/5 border-gray-400/20'
                  }`}
                >
                  {failedLogins} attempts
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={5}
                value={failedLogins}
                onChange={(e) =>
                  setFailedLogins(
                    Number(e.target.value)
                  )
                }
                className="w-full accent-[#C6A14A] cursor-pointer"
              />

              <div className="flex justify-between text-[10px] font-mono text-gray-400">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-gray-200 dark:border-[#2A2A2A]">
              <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isOffHours}
                  onChange={(e) =>
                    setIsOffHours(
                      e.target.checked
                    )
                  }
                  className="accent-[#C6A14A] w-4 h-4 rounded cursor-pointer"
                />

                <span>
                  Simulate Off-Hours Access
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isPrivEscalation}
                  onChange={(e) =>
                    setIsPrivEscalation(
                      e.target.checked
                    )
                  }
                  className="accent-[#C6A14A] w-4 h-4 rounded cursor-pointer"
                />

                <span>
                  Simulate Privilege Escalation Attempt
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isUsbTransfer}
                  onChange={(e) =>
                    setIsUsbTransfer(
                      e.target.checked
                    )
                  }
                  className="accent-[#C6A14A] w-4 h-4 rounded cursor-pointer"
                />

                <span>
                  Simulate Removable USB Transfer
                </span>
              </label>
            </div>

            <button
              id="btn-execute-behavioral-eval"
              onClick={runCustomSimulation}
              disabled={
                evaluatingCustom ||
                !selectedUserId
              }
              className="w-full py-3.5 px-4 rounded-md bg-[#C6A14A] hover:bg-[#B59139] text-black font-mono font-bold text-xs tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 mt-5 cursor-pointer border border-[#C6A14A]"
            >
              {evaluatingCustom ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>
                    PROCESSING ZERO TRUST PIPELINE...
                  </span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>
                    EXECUTE BEHAVIORAL EVALUATION
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-5">
          <div
            className={`border rounded-xl p-5 transition-colors ${
              isDark
                ? 'bg-[#141414] border-[#2A2A2A]'
                : 'bg-[#FFFFFF] border-[#E5E5E5] shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-display text-lg text-current flex items-center gap-2 font-normal">
                <Layers className="w-4 h-4 text-[#C6A14A]" />
                Zero Trust Real-Time Evaluation Pipeline
              </h3>

              <span className="text-[11px] font-mono text-[#C6A14A] font-semibold bg-[#C6A14A]/10 px-2 py-0.5 rounded border border-[#C6A14A]/20">
                End-to-End Decision
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div
                className={`p-3.5 rounded-lg border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-500 block mb-1">
                  STAGE 1
                </span>

                <span className="font-semibold text-current block text-xs">
                  Telemetry Ingest
                </span>

                <span className="text-[10px] text-[#C6A14A] font-mono block mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                  Normalize &amp; Aggregate
                </span>
              </div>

              <div
                className={`p-3.5 rounded-lg border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-500 block mb-1">
                  STAGE 2
                </span>

                <span className="font-semibold text-current block text-xs">
                  UEBA Random Forest
                </span>

                <span className="text-[10px] text-[#C6A14A] font-mono block mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                  Threat Probability
                </span>
              </div>

              <div
                className={`p-3.5 rounded-lg border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-500 block mb-1">
                  STAGE 3
                </span>

                <span className="font-semibold text-current block text-xs">
                  Adaptive Risk &amp; XAI
                </span>

                <span className="text-[10px] text-[#C6A14A] font-mono block mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                  Risk + Explanations
                </span>
              </div>

              <div
                className={`p-3.5 rounded-lg border ${
                  isDark
                    ? 'bg-[#0E0E0E] border-[#2A2A2A]'
                    : 'bg-[#F9F9F7] border-[#E5E5E5]'
                }`}
              >
                <span className="text-[10px] font-mono text-gray-500 block mb-1">
                  STAGE 4
                </span>

                <span className="font-semibold text-current block text-xs">
                  Zero Trust Policy
                </span>

                <span className="text-[10px] text-red-500 font-mono block mt-2 pt-2 border-t border-gray-200 dark:border-[#2A2A2A]">
                  Dynamic Action
                </span>
              </div>
            </div>
          </div>

          {executionError ? (
            <div
              className={`border rounded-xl p-4 ${
                isDark
                  ? 'bg-red-950/20 border-red-900/50 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider">
                    Simulation Error
                  </div>
                  <div className="text-xs mt-1 break-words">
                    {executionError}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {lastResult ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#C6A14A]/30 bg-[#0E0E0E] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2A2A2A] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#C6A14A]">
                      Latest Evaluation
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#F4F4F6] truncate">
                      {lastResult.scenarioName}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] font-mono text-gray-400">
                    User: <span className="text-[#F4F4F6]">{lastResult.user?.name || 'Enterprise User'}</span>
                    <span className="text-gray-600 mx-1.5">•</span>
                    {lastResult.user?.employeeId || 'N/A'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 bg-[#2A2A2A] gap-px">
                  <div className="bg-[#111111] min-w-0 px-5 py-5 sm:px-6 sm:py-6 text-center">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-[#7E96B5]">
                      Risk Index
                    </div>
                    <div className="mt-2 text-2xl sm:text-3xl font-semibold font-mono text-[#C6A14A] whitespace-nowrap">
                      {Number(lastResult.evaluation?.riskScore || 0).toFixed(2)}
                      <span className="text-xs sm:text-sm text-gray-500 ml-0.5">/100</span>
                    </div>
                  </div>

                  <div className="bg-[#111111] min-w-0 px-5 py-5 sm:px-6 sm:py-6 text-center">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-[#7E96B5]">
                      Anomaly
                    </div>
                    <div className="mt-2 text-2xl sm:text-3xl font-semibold font-mono text-[#F4F4F6] whitespace-nowrap">
                      {(Number(lastResult.evaluation?.mlAnomalyScore || 0) * 100).toFixed(0)}
                      <span className="text-sm sm:text-base text-[#F4F4F6]">%</span>
                    </div>
                  </div>

                  <div className="bg-[#111111] min-w-0 px-5 py-5 sm:px-6 sm:py-6 text-center">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.2em] text-[#7E96B5]">
                      Trust
                    </div>
                    <div className="mt-2 text-2xl sm:text-3xl font-semibold font-mono text-[#C6A14A] whitespace-nowrap">
                      {Number(lastResult.evaluation?.trustScore || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-4 border-t border-[#2A2A2A]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#C6A14A] mb-1.5">
                        Policy Decision
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded border border-[#C6A14A]/30 bg-[#C6A14A]/10 text-[#C6A14A] text-[10px] font-mono font-bold">
                          {lastResult.evaluation?.recommendedAction || 'ALLOW'}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate">
                          {lastResult.decision?.reason || lastResult.evaluation?.explanationText || 'Adaptive Zero Trust decision completed.'}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-[#C6A14A] mb-1.5">
                        Contextual Risk
                      </div>
                      <div className="text-sm font-mono text-[#F4F4F6]">
                        {Number(lastResult.evaluation?.contextualRiskScore || 0).toFixed(2)}
                        <span className="text-xs text-gray-500">/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full min-w-0 overflow-hidden">
                <XaiExplanationCard
                  evaluation={lastResult.evaluation}
                  onAskCopilot={() =>
                    onOpenCopilot({
                      userId: lastResult.user?.id
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div
              className={`p-12 sm:p-14 text-center rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center space-y-4 ${
                isDark
                  ? 'bg-[#141414] border-[#2A2A2A] text-gray-400'
                  : 'bg-[#FFFFFF] border-gray-300 text-gray-600 shadow-xs'
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-[#C6A14A]/10 border border-[#C6A14A]/30 flex items-center justify-center text-[#C6A14A]">
                <FlaskConical className="w-7 h-7" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <p className="font-serif-display text-2xl font-light text-current">
                  Simulator Standing By
                </p>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Select a preset scenario or configure custom behavioral signals to execute the live Zero Trust pipeline.
                </p>
              </div>

              <div className="text-[11px] font-mono text-[#C6A14A] border border-[#C6A14A]/25 px-3 py-1 rounded-full bg-[#C6A14A]/5">
                READY FOR INGESTION
              </div>
            </div>
          )}
        </div>
      </section>

      <MfaChallengeModal
        isOpen={mfaModalOpen}
        onClose={() =>
          setMfaModalOpen(false)
        }
        onSuccess={() => {
          if (typeof onRefreshData === 'function') {
      onRefreshData();
    }
        }}
        userName={
          lastResult?.user?.name ||
          'Enterprise User'
        }
        employeeId={
          lastResult?.user?.employeeId ||
          'N/A'
        }
        reason="Elevated risk context triggered step-up MFA challenge."
      />
    </div>
  );
};

export default SimulatorPage;