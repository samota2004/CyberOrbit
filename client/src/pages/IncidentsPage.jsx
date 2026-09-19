import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  Search,
  Sparkles,
  ShieldAlert,
  FileSpreadsheet,
  FileCode,
  Lock,
  XCircle,
  UserX,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { useTheme } from '../context/ThemeContext';

const HIGH_RISK_THRESHOLD = 70;

const getIncidentId = incident =>
  incident?.id ||
  incident?.incidentId ||
  incident?._id ||
  '';

const getIncidentEventType = incident =>
  incident?.eventType ||
  incident?.title ||
  incident?.type ||
  'Incident';

const getIncidentUserId = incident =>
  incident?.userId ||
  incident?.employeeId ||
  '';

const getUserDepartment = user =>
  user?.department ||
  user?.departmentName ||
  user?.departmentCode ||
  '';

const isUserFrozen = user => {
  if (!user) {
    return false;
  }

  return (
    user.isFrozen === true ||
    user.accountFrozen === true ||
    user.accountStatus === 'FROZEN' ||
    user.status === 'FROZEN'
  );
};

const normalizeText = value =>
  value === null || value === undefined
    ? ''
    : String(value);

export const IncidentsPage = ({
  incidents = [],
  users = [],
  currentUser,
  onRefreshData,
  onOpenCopilot
}) => {
  const { isDark } = useTheme();

  const [selectedIncidentId, setSelectedIncidentId] =
    useState(null);

  const [filterSeverity, setFilterSeverity] =
    useState('ALL');

  const [filterStatus, setFilterStatus] =
    useState('ALL');

  const [search, setSearch] = useState('');

  const [resolutionNotes, setResolutionNotes] =
    useState('');

  const [resolving, setResolving] = useState(false);
  const [generatingAi, setGeneratingAi] =
    useState(false);

  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] =
    useState(null);

  const [freezingUserId, setFreezingUserId] =
    useState(null);

  const [freezeError, setFreezeError] =
    useState(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const isAuthorized =
    !currentUser ||
    currentUser.role === 'SECURITY_ADMIN' ||
    currentUser.role === 'SYSTEM_ADMIN';

  const userMap = useMemo(() => {
    const map = new Map();

    users.forEach(user => {
      if (!user) {
        return;
      }

      if (
        user.id !== undefined &&
        user.id !== null
      ) {
        map.set(String(user.id), user);
      }

      if (
        user._id !== undefined &&
        user._id !== null
      ) {
        map.set(String(user._id), user);
      }

      if (user.email) {
        map.set(
          `email:${String(
            user.email
          ).toLowerCase()}`,
          user
        );
      }

      if (user.employeeId) {
        map.set(
          `employee:${String(
            user.employeeId
          ).toLowerCase()}`,
          user
        );
      }
    });

    return map;
  }, [users]);

  const getIncidentUser = incident => {
    if (!incident) {
      return null;
    }

    const userId = getIncidentUserId(incident);

    if (userId) {
      const user =
        userMap.get(String(userId)) ||
        userMap.get(
          `employee:${String(
            userId
          ).toLowerCase()}`
        ) ||
        userMap.get(
          `email:${String(
            userId
          ).toLowerCase()}`
        );

      if (user) {
        return user;
      }
    }

    if (incident.userEmail) {
      return (
        userMap.get(
          `email:${String(
            incident.userEmail
          ).toLowerCase()}`
        ) || null
      );
    }

    return null;
  };

  const severityOptions = useMemo(() => {
    const values = new Set();

    incidents.forEach(incident => {
      if (incident?.severity) {
        values.add(
          String(incident.severity).toUpperCase()
        );
      }
    });

    [
      'CRITICAL',
      'HIGH',
      'MEDIUM',
      'LOW'
    ].forEach(value => values.add(value));

    return Array.from(values);
  }, [incidents]);

  const statusOptions = useMemo(() => {
    const values = new Set();

    incidents.forEach(incident => {
      if (incident?.status) {
        values.add(
          String(incident.status).toUpperCase()
        );
      }
    });

    [
      'OPEN',
      'UNDER_REVIEW',
      'RESOLVED'
    ].forEach(value => values.add(value));

    return Array.from(values);
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter(incident => {
      const user = getIncidentUser(incident);

      const incidentId = normalizeText(
        getIncidentId(incident)
      );

      const userName =
        user?.name ||
        incident?.userName ||
        '';

      const userEmail =
        user?.email ||
        incident?.userEmail ||
        '';

      const userDepartment =
        getUserDepartment(user) ||
        incident?.userDepartment ||
        '';

      const eventType =
        getIncidentEventType(incident);

      const title =
        incident?.title || '';

      const device =
        incident?.deviceName ||
        incident?.deviceId ||
        incident?.device ||
        '';

      const matchesSeverity =
        filterSeverity === 'ALL' ||
        String(
          incident?.severity || ''
        ).toUpperCase() === filterSeverity;

      const matchesStatus =
        filterStatus === 'ALL' ||
        String(
          incident?.status || ''
        ).toUpperCase() === filterStatus;

      const searchableValues = [
        incidentId,
        userName,
        userEmail,
        userDepartment,
        eventType,
        title,
        device,
        incident?.description,
        incident?.recommendedAction
      ];

      const matchesSearch =
        !query ||
        searchableValues.some(value =>
          normalizeText(value)
            .toLowerCase()
            .includes(query)
        );

      return (
        matchesSeverity &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    incidents,
    userMap,
    filterSeverity,
    filterStatus,
    search
  ]);

  const selectedIncident = useMemo(() => {
    if (!selectedIncidentId) {
      return null;
    }

    return (
      incidents.find(
        incident =>
          String(getIncidentId(incident)) ===
          String(selectedIncidentId)
      ) || null
    );
  }, [
    incidents,
    selectedIncidentId
  ]);

  const selectedUser = useMemo(() => {
    if (!selectedIncident) {
      return null;
    }

    return getIncidentUser(
      selectedIncident
    );
  }, [
    selectedIncident,
    userMap
  ]);

  const totalIncidents = incidents.length;

  const openCount = incidents.filter(
    incident =>
      String(
        incident?.status || ''
      ).toUpperCase() === 'OPEN'
  ).length;

  const criticalCount = incidents.filter(
    incident =>
      String(
        incident?.severity || ''
      ).toUpperCase() === 'CRITICAL' &&
      String(
        incident?.status || ''
      ).toUpperCase() !== 'RESOLVED'
  ).length;

  const highRiskUsers = useMemo(() => {
    const result = new Map();

    incidents.forEach(incident => {
      const userId = getIncidentUserId(
        incident
      );

      const incidentRisk =
        typeof incident?.riskScore === 'number'
          ? incident.riskScore
          : null;

      if (!userId || incidentRisk === null) {
        return;
      }

      if (
        incidentRisk <
        HIGH_RISK_THRESHOLD
      ) {
        return;
      }

      const key = String(userId);
      const existing = result.get(key);

      if (
        !existing ||
        incidentRisk > existing.riskScore
      ) {
        result.set(key, {
          userId,
          riskScore: incidentRisk,
          incidentId:
            getIncidentId(incident)
        });
      }
    });

    users.forEach(user => {
      const userRisk =
        user?.riskScore ??
        user?.currentRiskScore;

      const userId =
        user?.id ||
        user?._id ||
        user?.employeeId;

      if (
        !userId ||
        typeof userRisk !== 'number' ||
        userRisk < HIGH_RISK_THRESHOLD
      ) {
        return;
      }

      const key = String(userId);
      const existing = result.get(key);

      if (
        !existing ||
        userRisk > existing.riskScore
      ) {
        result.set(key, {
          userId,
          riskScore: userRisk,
          incidentId:
            existing?.incidentId || null
        });
      }
    });

    return Array.from(result.values());
  }, [incidents, users]);

  const handleRefresh = async () => {
    if (!onRefreshData) {
      return;
    }

    try {
      setRefreshing(true);
      await onRefreshData();
    } catch (error) {
      console.error(
        'Failed to refresh incidents:',
        error
      );

      setFreezeError(
        error.message ||
        'Failed to refresh incident data.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (
      selectedIncidentId &&
      !incidents.some(
        incident =>
          String(
            getIncidentId(incident)
          ) ===
          String(selectedIncidentId)
      )
    ) {
      setSelectedIncidentId(null);
      setResolutionNotes('');
    }
  }, [
    incidents,
    selectedIncidentId
  ]);

  const handleExport = async format => {
    if (!isAuthorized) {
      return;
    }

    try {
      setExportError(null);
      setExporting(format);

      const params = new URLSearchParams();

      params.set('format', format);

      if (filterSeverity !== 'ALL') {
        params.set(
          'severity',
          filterSeverity
        );
      }

      if (filterStatus !== 'ALL') {
        params.set(
          'status',
          filterStatus
        );
      }

      if (search.trim()) {
        params.set(
          'search',
          search.trim()
        );
      }

      if (currentUser?.id) {
        params.set(
          'userId',
          currentUser.id
        );
      }

      const response = await fetch(
        `/api/incidents/export?${params.toString()}`,
        {
          headers: {
            'x-user-id':
              currentUser?.id || ''
          }
        }
      );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          errorData?.error?.message ||
          errorData?.message ||
          `Export failed with status ${response.status}`
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const dateStr =
        new Date()
          .toISOString()
          .split('T')[0];

      const filename =
        `cyberorbit-incidents-${dateStr}.${format}`;

      const downloadAnchor =
        document.createElement('a');

      downloadAnchor.href = url;
      downloadAnchor.download =
        filename;

      document.body.appendChild(
        downloadAnchor
      );

      downloadAnchor.click();
      downloadAnchor.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      console.error(
        'Failed to export incidents:',
        error
      );

      setExportError(
        error.message ||
        'Failed to export incident reports.'
      );
    } finally {
      setExporting(null);
    }
  };

  const handleGenerateAiExplanation =
    async incidentId => {
      if (!incidentId) {
        return;
      }

      try {
        setGeneratingAi(true);

        const response =
          await fetch(
            `/api/incidents/${incidentId}/ai-explain`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                ...(currentUser?.id
                  ? {
                      'x-user-id':
                        currentUser.id
                    }
                  : {})
              }
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
            data?.message ||
            'Failed to generate AI explanation.'
          );
        }

        if (data?.success) {
          await handleRefresh();
        }
      } catch (error) {
        console.error(
          'Failed to generate AI explanation:',
          error
        );

        setExportError(
          error.message ||
          'Failed to generate AI explanation.'
        );
      } finally {
        setGeneratingAi(false);
      }
    };

  const handleResolveIncident =
    async (
      incidentId,
      status
    ) => {
      if (!incidentId) {
        return;
      }

      try {
        setResolving(true);

        const response =
          await fetch(
            `/api/incidents/${incidentId}/resolve`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                ...(currentUser?.id
                  ? {
                      'x-user-id':
                        currentUser.id
                    }
                  : {})
              },
              body: JSON.stringify({
                resolutionNotes,
                newStatus: status
              })
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
            data?.message ||
            'Failed to update incident.'
          );
        }

        if (data?.success) {
          setResolutionNotes('');
          await handleRefresh();
        }
      } catch (error) {
        console.error(
          'Failed to resolve incident:',
          error
        );

        setFreezeError(
          error.message ||
          'Failed to update incident.'
        );
      } finally {
        setResolving(false);
      }
    };

  const handleFreezeUser =
    async userId => {
      if (!userId || !isAuthorized) {
        return;
      }

      try {
        setFreezeError(null);
        setFreezingUserId(userId);

        const response =
          await fetch(
            `/api/users/${userId}/freeze`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                ...(currentUser?.id
                  ? {
                      'x-user-id':
                        currentUser.id
                    }
                  : {})
              },
              body: JSON.stringify({
                reason:
                  'Automatic high-risk Zero Trust containment',
                source:
                  'INCIDENT_RESPONSE',
                riskThreshold:
                  HIGH_RISK_THRESHOLD
              })
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
            data?.message ||
            'Failed to freeze user account.'
          );
        }

        await handleRefresh();
      } catch (error) {
        console.error(
          'Failed to freeze user account:',
          error
        );

        setFreezeError(
          error.message ||
          'Failed to freeze user account.'
        );
      } finally {
        setFreezingUserId(null);
      }
    };

  const handleUnfreezeUser =
    async userId => {
      if (!userId || !isAuthorized) {
        return;
      }

      try {
        setFreezeError(null);
        setFreezingUserId(userId);

        const response =
          await fetch(
            `/api/users/${userId}/unfreeze`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                ...(currentUser?.id
                  ? {
                      'x-user-id':
                        currentUser.id
                    }
                  : {})
              }
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error?.message ||
            data?.message ||
            'Failed to unfreeze user account.'
          );
        }

        await handleRefresh();
      } catch (error) {
        console.error(
          'Failed to unfreeze user account:',
          error
        );

        setFreezeError(
          error.message ||
          'Failed to unfreeze user account.'
        );
      } finally {
        setFreezingUserId(null);
      }
    };

  return (
    <div className="space-y-6">
      <div className="bg-[#07080A] border border-[#D4AF37]/35 p-8 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />

        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-0.5 border border-[#D4AF37]/40 text-[#D4AF37] bg-black text-xs font-mono tracking-widest uppercase">
              SECURITY OPERATIONS
            </span>

            <span className="text-xs text-gray-400 font-mono">
              Threat Containment &amp; Forensic Auditing
            </span>
          </div>

          <h1 className="font-serif-display text-3xl sm:text-4xl text-white font-normal tracking-wide">
            Insider Threat Incident Queue
          </h1>

          <p className="text-xs text-gray-400 max-w-2xl mt-2 leading-relaxed font-sans">
            Investigate automated behavioral alerts, review multi-signal XAI feature attributions, consult Gemini AI root cause analysis, and execute containment resolutions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isAuthorized && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/40 bg-black text-amber-300 text-xs font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span>SOC Admin Required</span>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 border border-[#D4AF37]/40 text-[#D4AF37] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs font-mono flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            {refreshing
              ? 'REFRESHING...'
              : 'REFRESH'}
          </button>

          <button
            onClick={() =>
              handleExport('json')
            }
            disabled={
              !isAuthorized ||
              exporting !== null
            }
            className={`px-4 py-2 text-xs font-mono tracking-wider border transition-all flex items-center gap-2 ${
              isAuthorized &&
              exporting === null
                ? 'bg-black text-[#D4AF37] border-[#D4AF37]/50 hover:border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black cursor-pointer'
                : 'bg-black text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
            }`}
          >
            <FileCode className="w-4 h-4" />

            <span>
              {exporting === 'json'
                ? 'EXPORTING JSON...'
                : 'EXPORT JSON'}
            </span>
          </button>

          <button
            onClick={() =>
              handleExport('csv')
            }
            disabled={
              !isAuthorized ||
              exporting !== null
            }
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider border transition-all flex items-center gap-2 ${
              isAuthorized &&
              exporting === null
                ? 'bg-[#D4AF37] text-black border-[#D4AF37] hover:bg-[#B8860B] hover:text-white hover:border-[#B8860B] cursor-pointer'
                : 'bg-black text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />

            <span>
              {exporting === 'csv'
                ? 'EXPORTING CSV...'
                : 'EXPORT CSV'}
            </span>
          </button>
        </div>
      </div>

      {exportError && (
        <div className="bg-black border border-red-500/40 p-4 flex items-center justify-between text-xs text-red-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{exportError}</span>
          </div>

          <button
            onClick={() =>
              setExportError(null)
            }
            className="text-red-400 hover:text-white cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {freezeError && (
        <div className="bg-black border border-red-500/40 p-4 flex items-center justify-between text-xs text-red-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{freezeError}</span>
          </div>

          <button
            onClick={() =>
              setFreezeError(null)
            }
            className="text-red-400 hover:text-white cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        className={`p-4 border transition-colors shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs ${
          isDark
            ? 'bg-[#0E1015] border-[#D4AF37]/25 text-white'
            : 'bg-white border-gray-200 text-[#111317]'
        }`}
      >
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={e =>
              setSearch(e.target.value)
            }
            placeholder="Search incident ID, user, event..."
            className={`w-full border pl-9 pr-3 py-2 text-xs outline-none font-mono transition-all ${
              isDark
                ? 'bg-black border-[#D4AF37]/30 text-white focus:border-[#D4AF37]'
                : 'bg-[#F9F9F7] border-gray-300 text-black focus:border-[#D4AF37]'
            }`}
          />

          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-[11px] uppercase">
              Severity:
            </span>

            <select
              value={filterSeverity}
              onChange={e =>
                setFilterSeverity(
                  e.target.value
                )
              }
              className={`border px-3 py-1.5 text-xs outline-none font-mono focus:border-[#D4AF37] ${
                isDark
                  ? 'bg-black border-[#D4AF37]/30 text-white'
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="ALL">
                All Severities
              </option>

              {severityOptions.map(
                severity => (
                  <option
                    key={severity}
                    value={severity}
                  >
                    {severity.replaceAll(
                      '_',
                      ' '
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-[11px] uppercase">
              Status:
            </span>

            <select
              value={filterStatus}
              onChange={e =>
                setFilterStatus(
                  e.target.value
                )
              }
              className={`border px-3 py-1.5 text-xs outline-none font-mono focus:border-[#D4AF37] ${
                isDark
                  ? 'bg-black border-[#D4AF37]/30 text-white'
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="ALL">
                All Statuses
              </option>

              {statusOptions.map(
                status => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status.replaceAll(
                      '_',
                      ' '
                    )}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-300 dark:border-gray-800">
            <span className="px-2 py-0.5 text-[10px] font-mono border border-[#D4AF37]/40 text-[#D4AF37] bg-[#D4AF37]/10">
              {totalIncidents} TOTAL
            </span>

            <span className="px-2 py-0.5 text-[10px] font-mono border border-red-500/40 text-red-500 bg-red-500/10">
              {criticalCount} CRITICAL
            </span>

            <span className="px-2 py-0.5 text-[10px] font-mono border border-amber-500/40 text-amber-500 bg-amber-500/10">
              {openCount} OPEN
            </span>
          </div>
        </div>
      </div>

      {highRiskUsers.length > 0 && (
        <div
          className={`border p-4 ${
            isDark
              ? 'bg-[#0E1015] border-red-500/30'
              : 'bg-white border-red-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <UserX className="w-4 h-4 text-red-400" />

            <span className="font-mono text-xs font-bold uppercase tracking-wider text-red-400">
              High-Risk Account Containment
            </span>
          </div>

          <div className="space-y-2">
            {highRiskUsers.map(
              item => {
                const user =
                  userMap.get(
                    String(item.userId)
                  ) ||
                  userMap.get(
                    `employee:${String(
                      item.userId
                    ).toLowerCase()}`
                  );

                if (!user) {
                  return null;
                }

                const frozen =
                  isUserFrozen(user);

                const processing =
                  freezingUserId ===
                  (user.id ||
                    user._id);

                const actualUserId =
                  user.id ||
                  user._id;

                return (
                  <div
                    key={String(
                      actualUserId
                    )}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border ${
                      isDark
                        ? 'border-[#D4AF37]/20 bg-black'
                        : 'border-gray-200 bg-[#F9F9F7]'
                    }`}
                  >
                    <div>
                      <div className="font-sans font-semibold text-sm">
                        {user.name ||
                          'Unknown User'}
                      </div>

                      <div className="font-mono text-[10px] text-gray-500">
                        {user.email ||
                          user.employeeId ||
                          actualUserId}
                      </div>

                      <div className="font-mono text-[10px] mt-1">
                        Risk Score:{' '}
                        <span className="text-red-400 font-bold">
                          {item.riskScore}/100
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 border text-[10px] font-mono ${
                          frozen
                            ? 'border-red-500/50 text-red-400 bg-red-500/10'
                            : 'border-orange-500/50 text-orange-400 bg-orange-500/10'
                        }`}
                      >
                        {frozen
                          ? 'ACCOUNT FROZEN'
                          : 'HIGH RISK'}
                      </span>

                      {frozen ? (
                        <button
                          onClick={() =>
                            handleUnfreezeUser(
                              actualUserId
                            )
                          }
                          disabled={
                            !isAuthorized ||
                            processing
                          }
                          className="px-3 py-1.5 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />

                          {processing
                            ? 'PROCESSING...'
                            : 'UNFREEZE'}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleFreezeUser(
                              actualUserId
                            )
                          }
                          disabled={
                            !isAuthorized ||
                            processing
                          }
                          className="px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 text-[10px] font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <UserX className="w-3.5 h-3.5" />

                          {processing
                            ? 'PROCESSING...'
                            : 'FREEZE ACCOUNT'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          {filteredIncidents.length === 0 ? (
            <div
              className={`border p-8 text-center text-xs font-mono ${
                isDark
                  ? 'bg-[#0E1015] border-[#D4AF37]/20 text-gray-400'
                  : 'bg-white border-gray-200 text-gray-500 shadow-sm'
              }`}
            >
              No incidents matching current criteria.
            </div>
          ) : (
            filteredIncidents.map(
              incident => {
                const user =
                  getIncidentUser(
                    incident
                  );

                const incidentId =
                  getIncidentId(
                    incident
                  );

                const isSelected =
                  String(
                    selectedIncidentId
                  ) ===
                  String(incidentId);

                const incidentRisk =
                  typeof incident?.riskScore ===
                  'number'
                    ? incident.riskScore
                    : null;

                const userDepartment =
                  getUserDepartment(
                    user
                  ) ||
                  incident?.userDepartment ||
                  '';

                return (
                  <div
                    key={
                      incidentId ||
                      `${getIncidentEventType(
                        incident
                      )}-${incident.detectedAt}`
                    }
                    onClick={() =>
                      setSelectedIncidentId(
                        incidentId
                      )
                    }
                    className={`p-4 border transition-all cursor-pointer relative shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'bg-[#07080A] border-2 border-[#D4AF37] shadow-xl text-white'
                        : isDark
                          ? 'bg-[#0A0C10] border-[#D4AF37]/20 hover:border-[#D4AF37]/60 hover:bg-[#07080A] text-gray-200'
                          : 'bg-white border-gray-200 hover:border-[#D4AF37] hover:bg-[#FBFBFA] text-[#111317]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#D4AF37]" />
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isSelected
                              ? 'text-[#D4AF37]'
                              : 'text-current'
                          }`}
                        >
                          {incidentId ||
                            'NO-ID'}
                        </span>

                        {incident.severity && (
                          <SeverityBadge
                            severity={
                              incident.severity
                            }
                          />
                        )}
                      </div>

                      {incident.status && (
                        <StatusBadge
                          status={
                            incident.status
                          }
                        />
                      )}
                    </div>

                    <div
                      className={`font-semibold text-xs mb-1 ${
                        isSelected
                          ? 'text-white'
                          : 'text-current'
                      }`}
                    >
                      {user?.name ||
                        incident.userName ||
                        'Unknown User'}

                      {userDepartment && (
                        <span className="text-gray-400 font-mono text-[11px]">
                          {' '}
                          ({userDepartment})
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-400 font-mono truncate mb-2">
                      {getIncidentEventType(
                        incident
                      )}

                      {incidentRisk !==
                        null && (
                        <>
                          {' '}
                          • Risk Index:{' '}
                          <strong className="text-[#D4AF37]">
                            {
                              incidentRisk
                            }
                            /100
                          </strong>
                        </>
                      )}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-2 border-t border-gray-200 dark:border-[#D4AF37]/15 gap-3">
                      <span>
                        {incident.detectedAt
                          ? new Date(
                              incident.detectedAt
                            ).toLocaleString()
                          : '—'}
                      </span>

                      {incident.recommendedAction && (
                        <span className="text-[#D4AF37] font-semibold truncate">
                          {
                            incident.recommendedAction
                          }
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )
          )}
        </div>

        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-[#07080A] border border-[#D4AF37]/35 p-6 shadow-2xl space-y-5 text-gray-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />

              <div className="flex items-center justify-between pb-4 border-b border-[#D4AF37]/25">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm text-[#D4AF37]">
                      {getIncidentId(
                        selectedIncident
                      ) || 'NO-ID'}
                    </span>

                    {selectedIncident.severity && (
                      <SeverityBadge
                        severity={
                          selectedIncident.severity
                        }
                      />
                    )}

                    {selectedIncident.status && (
                      <StatusBadge
                        status={
                          selectedIncident.status
                        }
                      />
                    )}
                  </div>

                  <h3 className="font-serif-display text-xl text-white">
                    {getIncidentEventType(
                      selectedIncident
                    )}

                    {selectedUser?.name
                      ? ` - ${selectedUser.name}`
                      : ''}
                  </h3>
                </div>

                {onOpenCopilot && (
                  <button
                    onClick={() =>
                      onOpenCopilot({
                        incidentId:
                          getIncidentId(
                            selectedIncident
                          ),
                        userId:
                          getIncidentUserId(
                            selectedIncident
                          )
                      })
                    }
                    className="px-3.5 py-1.5 bg-black border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      ASK COPILOT
                    </span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
                {typeof selectedIncident.riskScore ===
                  'number' && (
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                      Risk Index
                    </span>

                    <span className="text-xl font-bold font-mono text-[#D4AF37]">
                      {
                        selectedIncident.riskScore
                      }
                      /100
                    </span>
                  </div>
                )}

                {selectedIncident.recommendedAction && (
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                      Action Enforced
                    </span>

                    <span className="text-xs font-bold font-mono text-gray-100">
                      {
                        selectedIncident.recommendedAction
                      }
                    </span>
                  </div>
                )}

                {selectedIncident.adminActionTaken && (
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                      Containment
                    </span>

                    <span className="text-xs font-bold font-mono text-gray-100">
                      {
                        selectedIncident.adminActionTaken
                      }
                    </span>
                  </div>
                )}

                {typeof selectedIncident.supervisedProbability ===
                  'number' && (
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                      Supervised ML
                    </span>

                    <span className="text-xs font-bold font-mono text-[#D4AF37]">
                      {(
                        selectedIncident.supervisedProbability *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}

                {typeof selectedIncident.isolationForestScore ===
                  'number' && (
                  <div className="bg-[#0E1015] p-3 border border-[#D4AF37]/25">
                    <span className="text-[9px] font-mono uppercase text-gray-400 block mb-1">
                      Isolation Forest
                    </span>

                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {(
                        selectedIncident.isolationForestScore *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                )}
              </div>

              {selectedIncident.xaiExplanation && (
                <div className="p-4 bg-[#D4AF37]/10 border-l-4 border-[#D4AF37] border-y border-r border-[#D4AF37]/25 space-y-1 text-xs">
                  <span className="font-mono text-[10px] uppercase text-[#D4AF37] font-bold block">
                    XAI Feature Attribution Rationale
                  </span>

                  <p className="text-gray-200 font-sans text-xs leading-relaxed">
                    {
                      selectedIncident.xaiExplanation
                    }
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-bold text-xs font-mono uppercase text-[#D4AF37] tracking-wider">
                  Contributing Behavioral Telemetry Signals
                </h4>

                <div className="space-y-1.5">
                  {Array.isArray(
                    selectedIncident.contributingFactors
                  ) &&
                  selectedIncident.contributingFactors.length >
                    0 ? (
                    selectedIncident.contributingFactors.map(
                      (
                        factor,
                        index
                      ) => (
                        <div
                          key={`${getIncidentId(
                            selectedIncident
                          )}-${index}`}
                          className="flex items-center gap-2.5 p-2.5 bg-black/80 border border-[#D4AF37]/20 text-xs"
                        >
                          <span className="w-1.5 h-1.5 bg-[#D4AF37] shrink-0" />

                          <span className="text-gray-200 font-sans">
                            {factor}
                          </span>
                        </div>
                      )
                    )
                  ) : (
                    <div className="p-3 border border-[#D4AF37]/20 text-xs font-mono text-gray-500">
                      No contributing factors recorded.
                    </div>
                  )}
                </div>
              </div>

              {selectedUser && (
                <div className="p-4 bg-black border border-[#D4AF37]/35 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isUserFrozen(
                        selectedUser
                      ) ? (
                        <UserX className="w-4 h-4 text-red-400" />
                      ) : (
                        <UserCheck className="w-4 h-4 text-emerald-400" />
                      )}

                      <h4 className="font-mono text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                        Employee Account Control
                      </h4>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 border font-mono ${
                        isUserFrozen(
                          selectedUser
                        )
                          ? 'border-red-500/50 text-red-400 bg-red-500/10'
                          : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
                      }`}
                    >
                      {isUserFrozen(
                        selectedUser
                      )
                        ? 'FROZEN'
                        : 'ACTIVE'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] uppercase font-mono text-gray-500 block">
                        Employee
                      </span>

                      <span className="text-xs font-sans text-gray-200">
                        {selectedUser.name ||
                          '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase font-mono text-gray-500 block">
                        Account
                      </span>

                      <span className="text-xs font-mono text-gray-200">
                        {selectedUser.email ||
                          selectedUser.employeeId ||
                          selectedUser.id ||
                          selectedUser._id ||
                          '—'}
                      </span>
                    </div>
                  </div>

                  {typeof selectedIncident.riskScore ===
                    'number' &&
                    selectedIncident.riskScore >=
                      HIGH_RISK_THRESHOLD && (
                      <div className="border border-red-500/30 bg-red-500/5 p-3">
                        <div className="text-[10px] font-mono text-red-400 uppercase">
                          High-Risk Containment Threshold
                        </div>

                        <div className="text-xs text-gray-300 mt-1">
                          Current incident risk score:{' '}
                          <strong className="text-red-400">
                            {
                              selectedIncident.riskScore
                            }
                            /100
                          </strong>
                        </div>
                      </div>
                    )}

                  <div className="flex gap-3">
                    {isUserFrozen(
                      selectedUser
                    ) ? (
                      <button
                        onClick={() =>
                          handleUnfreezeUser(
                            selectedUser.id ||
                              selectedUser._id
                          )
                        }
                        disabled={
                          !isAuthorized ||
                          freezingUserId ===
                            (selectedUser.id ||
                              selectedUser._id)
                        }
                        className="flex-1 py-2.5 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 text-xs font-mono font-bold tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        {freezingUserId ===
                        (selectedUser.id ||
                          selectedUser._id)
                          ? 'UNFREEZING...'
                          : 'UNFREEZE ACCOUNT'}
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleFreezeUser(
                            selectedUser.id ||
                              selectedUser._id
                          )
                        }
                        disabled={
                          !isAuthorized ||
                          freezingUserId ===
                            (selectedUser.id ||
                              selectedUser._id)
                        }
                        className="flex-1 py-2.5 border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-mono font-bold tracking-wider cursor-pointer disabled:opacity-50"
                      >
                        {freezingUserId ===
                        (selectedUser.id ||
                          selectedUser._id)
                          ? 'FREEZING...'
                          : 'FREEZE ACCOUNT'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-black border border-[#D4AF37]/35 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />

                    <h4 className="font-mono text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">
                      Gemini Threat Forensics
                    </h4>
                  </div>

                  <button
                    onClick={() =>
                      handleGenerateAiExplanation(
                        getIncidentId(
                          selectedIncident
                        )
                      )
                    }
                    disabled={
                      generatingAi
                    }
                    className="text-xs font-mono text-[#D4AF37] hover:text-white underline disabled:opacity-50 cursor-pointer"
                  >
                    {generatingAi
                      ? 'ANALYZING...'
                      : 'REFRESH AI REPORT'}
                  </button>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line font-sans">
                  {selectedIncident.aiExplanation ||
                    'No AI forensic explanation has been generated for this incident.'}
                </p>
              </div>

              <div className="p-4 bg-white text-black border border-[#D4AF37]/40 space-y-3 shadow-md">
                <h4 className="font-bold text-xs font-mono uppercase text-[#111317] tracking-wider">
                  SOC Analyst Resolution &amp; Remediation
                </h4>

                <textarea
                  rows={2}
                  value={
                    resolutionNotes
                  }
                  onChange={e =>
                    setResolutionNotes(
                      e.target.value
                    )
                  }
                  placeholder="Enter containment justification, mitigation notes, or adjustment reason..."
                  className="w-full bg-[#F9F9F7] border border-gray-300 p-3 text-xs text-black outline-none focus:border-[#D4AF37] resize-none font-sans"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleResolveIncident(
                        getIncidentId(
                          selectedIncident
                        ),
                        'UNDER_REVIEW'
                      )
                    }
                    disabled={resolving}
                    className="flex-1 py-2.5 px-3 bg-black border border-black text-amber-300 hover:bg-gray-900 text-xs font-mono font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {resolving
                      ? 'PROCESSING...'
                      : 'MARK UNDER REVIEW'}
                  </button>

                  <button
                    onClick={() =>
                      handleResolveIncident(
                        getIncidentId(
                          selectedIncident
                        ),
                        'RESOLVED'
                      )
                    }
                    disabled={resolving}
                    className="flex-1 py-2.5 px-3 bg-[#D4AF37] hover:bg-[#B8860B] text-black font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer border border-[#D4AF37]"
                  >
                    {resolving
                      ? 'PROCESSING...'
                      : 'RESOLVE & CLOSE'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`border border-dashed p-12 text-center space-y-3 ${
                isDark
                  ? 'bg-[#0E1015] border-[#D4AF37]/25 text-gray-400'
                  : 'bg-white border-gray-300 text-gray-500 shadow-sm'
              }`}
            >
              <AlertOctagon className="w-10 h-10 mx-auto text-[#D4AF37]/60" />

              <p className="font-serif-display text-xl text-current">
                Select an Incident to Investigate
              </p>

              <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto">
                Select an incident from the queue to inspect its telemetry, ML scores, XAI explanation, AI forensic analysis, and account containment state.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};